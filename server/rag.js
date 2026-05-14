/**
 * rag.js — Offline RAG pipeline for Edusaku
 *
 * Flow:
 *   upload file → extract text (PDF or OCR) → chunk → embed → store in Vectra
 *   on chat     → embed query → retrieve top-k chunks → inject into Gemma prompt
 *
 * All processing is local — no network calls.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Lazy-loaded heavy deps ────────────────────────────────────────────────────
// @xenova/transformers downloads the embedding model on first use (~23 MB).
// We load it lazily so the server starts instantly.

let _pipeline = null;
async function getEmbedder() {
    if (_pipeline) return _pipeline;
    console.log('[RAG] Loading embedding model (first run may take a moment)…');
    const { pipeline } = await import('@xenova/transformers');
    _pipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('[RAG] Embedding model ready.');
    return _pipeline;
}

// ── Vector store (Vectra — file-based JSON) ───────────────────────────────────

const { LocalIndex } = require('vectra');
const INDEX_DIR = path.join(__dirname, 'vector_index');
let _index = null;

async function getIndex() {
    if (_index) return _index;
    _index = new LocalIndex(INDEX_DIR);
    if (!(await _index.isIndexCreated())) {
        await _index.createIndex();
        console.log('[RAG] Vector index created at', INDEX_DIR);
    }
    return _index;
}

// ── Text extraction ───────────────────────────────────────────────────────────

async function extractTextFromPDF(filePath) {
    const pdfParse = require('pdf-parse');
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
}

async function extractTextFromImage(filePath) {
    const Tesseract = require('tesseract.js');
    console.log('[RAG] Running OCR on', path.basename(filePath), '…');
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng+ind', {
        logger: () => {}, // suppress progress logs
    });
    return text;
}

async function extractText(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf') return extractTextFromPDF(filePath);
    if (['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'].includes(ext)) {
        return extractTextFromImage(filePath);
    }
    // Plain text fallback
    return fs.readFileSync(filePath, 'utf8');
}

// ── Chunking ──────────────────────────────────────────────────────────────────

const CHUNK_SIZE   = 400; // characters
const CHUNK_OVERLAP = 80;

function chunkText(text) {
    const chunks = [];
    let start = 0;
    const clean = text.replace(/\s+/g, ' ').trim();
    while (start < clean.length) {
        const end = Math.min(start + CHUNK_SIZE, clean.length);
        chunks.push(clean.slice(start, end).trim());
        start += CHUNK_SIZE - CHUNK_OVERLAP;
    }
    return chunks.filter(c => c.length > 20); // drop tiny fragments
}

// ── Embedding ─────────────────────────────────────────────────────────────────

async function embed(text) {
    const embedder = await getEmbedder();
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    // output.data is a Float32Array — convert to plain Array for Vectra
    return Array.from(output.data);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Process a newly uploaded file:
 *   1. Extract text
 *   2. Chunk
 *   3. Embed each chunk
 *   4. Store in vector index with metadata
 *
 * Returns { chunks: number, preview: string }
 */
async function indexFile(filePath, filename) {
    console.log(`[RAG] Indexing: ${filename}`);

    const text = await extractText(filePath);
    if (!text || text.trim().length < 10) {
        console.warn('[RAG] No usable text extracted from', filename);
        return { chunks: 0, preview: '' };
    }

    const chunks = chunkText(text);
    console.log(`[RAG] ${chunks.length} chunks from ${filename}`);

    const index = await getIndex();

    for (let i = 0; i < chunks.length; i++) {
        const vector = await embed(chunks[i]);
        await index.insertItem({
            vector,
            metadata: {
                filename,
                chunkIndex: i,
                text: chunks[i],
            },
        });
    }

    console.log(`[RAG] Indexed ${chunks.length} chunks for ${filename}`);
    return {
        chunks: chunks.length,
        preview: text.slice(0, 200),
    };
}

/**
 * Delete all index entries for a given filename.
 */
async function deleteFileFromIndex(filename) {
    const index = await getIndex();
    const all = await index.listItems();
    const toDelete = all.filter(item => item.metadata?.filename === filename);
    for (const item of toDelete) {
        await index.deleteItem(item.id);
    }
    console.log(`[RAG] Removed ${toDelete.length} chunks for ${filename}`);
}

/**
 * Retrieve the top-k most relevant chunks for a query.
 * Returns an array of { text, filename, score } objects.
 */
async function retrieve(query, topK = 5) {
    const index = await getIndex();
    const count = (await index.listItems()).length;
    if (count === 0) return [];

    const queryVector = await embed(query);
    const results = await index.queryItems(queryVector, topK);

    return results.map(r => ({
        text:     r.item.metadata.text,
        filename: r.item.metadata.filename,
        score:    r.score,
    }));
}

/**
 * Build an augmented prompt by prepending retrieved context.
 * Returns the full prompt string to send to Ollama.
 */
async function buildRAGPrompt(userQuery) {
    const chunks = await retrieve(userQuery, 5);

    if (chunks.length === 0) {
        return userQuery; // no documents indexed — plain prompt
    }

    const context = chunks
        .map((c, i) => `[Document: ${c.filename}, chunk ${i + 1}]\n${c.text}`)
        .join('\n\n---\n\n');

    return `You are an AI education assistant. Use the following document excerpts to answer the question accurately. If the answer is not in the documents, say so clearly.\n\n=== DOCUMENT CONTEXT ===\n${context}\n\n=== QUESTION ===\n${userQuery}`;
}

module.exports = { indexFile, deleteFileFromIndex, retrieve, buildRAGPrompt };
