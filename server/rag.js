/**
 * rag.js — Offline RAG pipeline for Edusaku
 *
 * Flow:
 *   upload file → extract text (PDF or OCR) → chunk → embed → store in Vectra
 *   on chat     → embed query → retrieve top-k chunks → inject into Gemma prompt
 *
 * All processing is local — no network calls after first model download.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── PDF extraction ────────────────────────────────────────────────────────────

async function extractTextFromPDF(filePath) {
    const pdfParse = require('pdf-parse');
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text || '';
}

// ── OCR for images ────────────────────────────────────────────────────────────

async function extractTextFromImage(filePath) {
    const Tesseract = require('tesseract.js');
    console.log('[RAG] Running OCR on', path.basename(filePath), '…');
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng+ind', {
        logger: () => {},
    });
    return text || '';
}

// ── Text extraction dispatcher ────────────────────────────────────────────────

async function extractText(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf') return extractTextFromPDF(filePath);
    if (['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'].includes(ext)) {
        return extractTextFromImage(filePath);
    }
    // Plain text fallback
    try { return fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
}

// ── Chunking ──────────────────────────────────────────────────────────────────

const CHUNK_SIZE    = 500;
const CHUNK_OVERLAP = 100;

function chunkText(text) {
    const clean = text.replace(/\s+/g, ' ').trim();
    const chunks = [];
    let start = 0;
    while (start < clean.length) {
        const end = Math.min(start + CHUNK_SIZE, clean.length);
        const chunk = clean.slice(start, end).trim();
        if (chunk.length > 30) chunks.push(chunk);
        start += CHUNK_SIZE - CHUNK_OVERLAP;
    }
    return chunks;
}

// ── Embedding (lazy-loaded) ───────────────────────────────────────────────────
// @xenova/transformers is ESM-only in newer versions.
// We use a dynamic import wrapper cached after first load.

let _embedder = null;

async function getEmbedder() {
    if (_embedder) return _embedder;
    console.log('[RAG] Loading embedding model (first run downloads ~23 MB)…');
    // Dynamic import for ESM module in CJS context
    const { pipeline } = await import('@xenova/transformers');
    _embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        quantized: true,
    });
    console.log('[RAG] Embedding model ready.');
    return _embedder;
}

async function embed(text) {
    const embedder = await getEmbedder();
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
}

// ── Vector store (Vectra — file-based, no server needed) ─────────────────────

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

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Index a file: extract text → chunk → embed → store.
 * Called after upload. Runs in background.
 */
async function indexFile(filePath, filename) {
    console.log(`[RAG] Indexing: ${filename}`);

    let text = '';
    try {
        text = await extractText(filePath);
    } catch (err) {
        console.error(`[RAG] Text extraction failed for ${filename}:`, err.message);
        return { chunks: 0, preview: '' };
    }

    if (!text || text.trim().length < 20) {
        console.warn(`[RAG] No usable text from ${filename}`);
        return { chunks: 0, preview: '' };
    }

    const chunks = chunkText(text);
    console.log(`[RAG] ${chunks.length} chunks from ${filename}`);

    const index = await getIndex();

    for (let i = 0; i < chunks.length; i++) {
        try {
            const vector = await embed(chunks[i]);
            await index.insertItem({
                vector,
                metadata: {
                    filename,
                    chunkIndex: i,
                    text: chunks[i],
                },
            });
        } catch (err) {
            console.error(`[RAG] Failed to embed chunk ${i} of ${filename}:`, err.message);
        }
    }

    console.log(`[RAG] Done indexing ${filename} (${chunks.length} chunks)`);
    return {
        chunks: chunks.length,
        preview: text.slice(0, 300),
    };
}

/**
 * Remove all index entries for a given filename.
 */
async function deleteFileFromIndex(filename) {
    try {
        const index = await getIndex();
        const all = await index.listItems();
        const toDelete = all.filter(item => item.metadata?.filename === filename);
        for (const item of toDelete) {
            await index.deleteItem(item.id);
        }
        console.log(`[RAG] Removed ${toDelete.length} chunks for ${filename}`);
    } catch (err) {
        console.error('[RAG] deleteFileFromIndex error:', err.message);
    }
}

/**
 * Retrieve top-k most relevant chunks for a query.
 */
async function retrieve(query, topK = 6) {
    try {
        const index = await getIndex();
        const items = await index.listItems();
        if (items.length === 0) return [];

        const queryVector = await embed(query);
        const results = await index.queryItems(queryVector, topK);

        return results
            .filter(r => r.score > 0.2) // filter low-relevance chunks
            .map(r => ({
                text:     r.item.metadata.text,
                filename: r.item.metadata.filename,
                score:    r.score,
            }));
    } catch (err) {
        console.error('[RAG] retrieve error:', err.message);
        return [];
    }
}

/**
 * Build a RAG-augmented prompt.
 * If no documents are indexed, returns the plain query.
 */
async function buildRAGPrompt(userQuery) {
    const chunks = await retrieve(userQuery, 6);

    if (chunks.length === 0) {
        return userQuery;
    }

    // Group by filename for cleaner context
    const byFile = {};
    for (const c of chunks) {
        if (!byFile[c.filename]) byFile[c.filename] = [];
        byFile[c.filename].push(c.text);
    }

    const contextBlocks = Object.entries(byFile).map(([filename, texts]) => {
        const displayName = filename.split('-').slice(2).join('-') || filename;
        return `=== Document: ${displayName} ===\n${texts.join('\n\n')}`;
    });

    const context = contextBlocks.join('\n\n');

    return `You are an AI education assistant. The following are excerpts from documents the user has uploaded. Use them to answer the question accurately and specifically. Quote or reference the document content when relevant. If the answer is not in the documents, say so clearly.

--- DOCUMENT CONTEXT ---
${context}

--- USER QUESTION ---
${userQuery}`;
}

/**
 * Get indexing status: how many chunks are stored per file.
 */
async function getIndexStatus() {
    try {
        const index = await getIndex();
        const items = await index.listItems();
        const counts = {};
        for (const item of items) {
            const f = item.metadata?.filename || 'unknown';
            counts[f] = (counts[f] || 0) + 1;
        }
        return { totalChunks: items.length, files: counts };
    } catch {
        return { totalChunks: 0, files: {} };
    }
}

/**
 * Remove vector chunks whose source file no longer exists in uploads/.
 * @param {string[]} existingFilenames  List of currently uploaded filenames.
 * @returns {number} Number of chunks removed.
 */
async function cleanOrphanChunks(existingFilenames) {
    try {
        const index = await getIndex();
        const all = await index.listItems();
        const orphans = all.filter(item => !existingFilenames.includes(item.metadata?.filename));
        for (const item of orphans) {
            await index.deleteItem(item.id);
        }
        if (orphans.length > 0) {
            console.log(`[RAG] cleanOrphanChunks: removed ${orphans.length} orphan chunks.`);
        }
        return orphans.length;
    } catch (err) {
        console.error('[RAG] cleanOrphanChunks error:', err.message);
        return 0;
    }
}

module.exports = { indexFile, deleteFileFromIndex, retrieve, buildRAGPrompt, getIndexStatus, cleanOrphanChunks };

