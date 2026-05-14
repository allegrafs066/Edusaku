import { v4 as uuidv4 } from "uuid";
import { extractPdfText } from "./pdfParser";
import { runInference } from "./inference";
import { getEmbedding } from "./embedding";
import { saveDocumentVectors, searchVectors, type VectorChunk } from "./vectorStore";
import type { ChatMessage } from "../store/appStore";

const TOP_K_CHUNKS = 4;
const MAX_HISTORY_TURNS = 4;
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

function chunkify(text) {
  const chunks = [];
  const segments = text.split(/--- Page \d+ ---\n/);
  for (let i = 0; i < segments.length; i++) {
    const pageText = segments[i].trim();
    if (pageText.length === 0) continue;
    let start = 0;
    while (start < pageText.length) {
      let end = start + CHUNK_SIZE;
      if (end < pageText.length) {
        const lastSpace = pageText.lastIndexOf(" ", end);
        if (lastSpace > start) end = lastSpace;
      }
      chunks.push({ text: pageText.slice(start, end).trim(), pageNumber: i + 1 });
      const nextStart = end - CHUNK_OVERLAP;
      start = nextStart <= start ? end : nextStart;
      if (start >= pageText.length - 50) break;
    }
  }
  return chunks;
}

function buildPrompt(chunks, overview, history, question) {
  const system = "You are Edusaku, a helpful and patient educational AI tutor. Answer the student\"s questions based on the provided document segments. If the answer is not in the segments, say so honestly. Always cite the page number when referencing specific content (e.g. \"According to Page 3, ...\"). Be concise, clear, and encouraging.";
  const overviewText = overview ? "=== DOCUMENT OVERVIEW (Page " + overview.metadata.pageNumber + ") ===\n" + overview.text + "\n\n" : "";
  const context = chunks.map((c) => "[Page " + c.metadata.pageNumber + "]: " + c.text).join("\n\n");
  const historyText = history.slice(-MAX_HISTORY_TURNS * 2).map((msg) => {
    const role = msg.role === "user" ? "user" : "model";
    return "<start_of_turn>" + role + "\n" + msg.content + "<end_of_turn>";
  }).join("\n");
  return "<start_of_turn>user\n" + system + "\n\n" + overviewText + "=== RELEVANT DOCUMENT SEGMENTS ===\n" + context + "\n=== END OF CONTEXT ===\n<end_of_turn>\n<start_of_turn>model\nUnderstood. I will answer based on those segments and cite page numbers.<end_of_turn>\n" + (historyText ? historyText + "\n" : "") + "<start_of_turn>user\n" + question + "<end_of_turn>\n<start_of_turn>model\n";
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Chunk and embed a document, persisting vectors to the local store.
 * Call this once per document before querying. Safe to call again — it
 * overwrites any previously stored vectors for the same ID.
 *
 * @param id         Document UUID (used as the vector store key).
 * @param path       Local file path to the PDF.
 * @param onProgress Optional 0–1 progress callback fired after each chunk.
 */
export async function prepareDocument(
  id: string,
  path: string,
  onProgress?: (progress: number) => void,
): Promise<void> {
  const text = await extractPdfText(path);
  const chunks = chunkify(text);
  const vectorChunks: VectorChunk[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await getEmbedding(chunk.text);
    vectorChunks.push({
      id: uuidv4(),
      documentId: id,
      text: chunk.text,
      embedding,
      metadata: { pageNumber: chunk.pageNumber },
    });
    if (onProgress) {
      onProgress((i + 1) / chunks.length);
    }
  }

  await saveDocumentVectors(id, vectorChunks);
}

/**
 * Answer a question about a document using RAG.
 * Automatically embeds the document on first call if vectors are missing.
 *
 * @param id         Document UUID.
 * @param path       Local file path to the PDF (needed for auto-embed fallback).
 * @param history    Prior conversation messages for context.
 * @param question   The user's question.
 * @param onToken    Optional streaming callback for incremental UI updates.
 * @returns          The model's complete response text.
 */
export async function askDocument(
  id: string,
  path: string,
  history: ChatMessage[],
  question: string,
  onToken?: (token: string) => void,
): Promise<string> {
  const queryEmbedding = await getEmbedding(question);
  let chunks = await searchVectors(id, queryEmbedding, TOP_K_CHUNKS);

  // Auto-embed on first query if vectors haven't been built yet
  if (chunks.length === 0) {
    await prepareDocument(id, path);
    chunks = await searchVectors(id, queryEmbedding, TOP_K_CHUNKS);
  }

  // Fetch all stored chunks to find the page-1 overview segment
  const allChunks = await searchVectors(id, queryEmbedding, 1000);
  const overview = allChunks.find((c) => c.metadata.pageNumber === 1) ?? null;

  const prompt = buildPrompt(chunks, overview, history, question);
  return runInference(prompt, onToken);
}

/**
 * Remove all stored vectors for a document (e.g. when the document is deleted).
 *
 * @param id Document UUID.
 */
export async function evictDocument(id: string): Promise<void> {
  await saveDocumentVectors(id, []);
}
