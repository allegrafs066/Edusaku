/**
 * rag.ts
 *
 * Retrieval-Augmented Generation orchestrator for Edusaku.
 *
 * Because Gemma 4 E2B has a 128 K token context window and native document
 * understanding, we use a "full-context" strategy instead of traditional
 * chunk-and-retrieve RAG:
 *
 *   1. Extract the full PDF text once (cached per document).
 *   2. On each user query, build a structured prompt that includes:
 *        - A system instruction telling the model to act as a tutor.
 *        - The full document text as context.
 *        - The conversation history (last N turns).
 *        - The user's latest question.
 *   3. Run inference and return the assistant reply.
 *
 * This is viable for typical educational PDFs (< ~300 pages / ~150 K tokens).
 * If a document is too long we truncate context to the last MAX_CTX_CHARS
 * characters to stay within the model's context window.
 */

import { extractPdfText } from './pdfParser';
import { runInference } from './inference';
import type { ChatMessage } from '../store/appStore';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Soft limit on document text passed to the model (~120 K tokens ≈ 480 K chars). */
const MAX_CTX_CHARS = 480_000;

/** Number of past conversation turns to include for multi-turn context. */
const MAX_HISTORY_TURNS = 6;

// ─── In-memory document text cache ───────────────────────────────────────────

const _docTextCache: Record<string, string> = {};

// ─── Prompt builder ───────────────────────────────────────────────────────────

/**
 * Build the Gemma 4 instruct-format prompt.
 *
 * Gemma 4 uses the standard <start_of_turn> / <end_of_turn> chat template.
 */
function buildPrompt(
  docText: string,
  history: ChatMessage[],
  userQuestion: string,
): string {
  const systemInstruction = `You are Edusaku, a helpful and patient educational AI tutor. \
You have been given the full text of a document that the student uploaded. \
Answer the student's questions based solely on the provided document. \
If the answer is not in the document, say so honestly. \
Always cite the page number when referencing specific content (e.g. "According to Page 3, ..."). \
Be concise, clear, and encouraging.`;

  // Truncate document if needed to stay within context budget
  const truncatedDoc =
    docText.length > MAX_CTX_CHARS
      ? docText.slice(0, MAX_CTX_CHARS) + '\n\n[Document truncated due to length]'
      : docText;

  // Build history turns (last N user+assistant pairs)
  const recentHistory = history.slice(-MAX_HISTORY_TURNS * 2);
  const historyText = recentHistory
    .map((msg) =>
      msg.role === 'user'
        ? `<start_of_turn>user\n${msg.content}<end_of_turn>`
        : `<start_of_turn>model\n${msg.content}<end_of_turn>`,
    )
    .join('\n');

  return (
    `<start_of_turn>user\n` +
    `${systemInstruction}\n\n` +
    `=== DOCUMENT CONTENT ===\n${truncatedDoc}\n=== END OF DOCUMENT ===\n` +
    `<end_of_turn>\n` +
    `<start_of_turn>model\nUnderstood. I have read the document and I am ready to answer questions about it.<end_of_turn>\n` +
    (historyText ? historyText + '\n' : '') +
    `<start_of_turn>user\n${userQuestion}<end_of_turn>\n` +
    `<start_of_turn>model\n`
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Pre-load and cache the PDF text for a given document.
 * Call this when the user opens a Chat session so the first query is fast.
 *
 * @param documentId  The document's UUID (used as cache key).
 * @param filePath    Absolute path to the PDF file.
 */
export async function prepareDocument(
  documentId: string,
  filePath: string,
): Promise<void> {
  if (_docTextCache[documentId]) return; // already cached
  const text = await extractPdfText(filePath);
  _docTextCache[documentId] = text;
}

/**
 * Answer a user question about a document using on-device Gemma inference.
 *
 * @param documentId   The document's UUID.
 * @param filePath     Absolute path to the PDF (used if not yet cached).
 * @param history      Full conversation history for multi-turn context.
 * @param question     The user's latest message.
 * @param onToken      Optional streaming callback for progressive UI updates.
 * @returns            The assistant's response text.
 */
export async function askDocument(
  documentId: string,
  filePath: string,
  history: ChatMessage[],
  question: string,
  onToken?: (token: string) => void,
): Promise<string> {
  // Ensure doc text is available
  if (!_docTextCache[documentId]) {
    await prepareDocument(documentId, filePath);
  }

  const docText = _docTextCache[documentId];
  const prompt = buildPrompt(docText, history, question);
  const answer = await runInference(prompt, onToken);
  return answer;
}

/**
 * Evict a document from the in-memory text cache.
 * Call this when a document is deleted.
 */
export function evictDocument(documentId: string): void {
  delete _docTextCache[documentId];
}
