/**
 * vectorStore.ts
 *
 * A simple on-device vector store using AsyncStorage for persistence.
 * Stores document chunks and their embeddings for similarity search.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VectorChunk {
  id: string;
  documentId: string;
  text: string;
  embedding: number[];
  metadata: {
    pageNumber: number;
    [key: string]: any;
  };
}

interface DocumentVectors {
  chunks: VectorChunk[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VECTORS_PREFIX = '@edusaku_vectors_';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Calculate cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    mA += a[i] * a[i];
    mB += b[i] * b[i];
  }
  const denominator = Math.sqrt(mA) * Math.sqrt(mB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Save chunks and their embeddings for a document.
 */
export async function saveDocumentVectors(
  documentId: string,
  chunks: VectorChunk[],
): Promise<void> {
  try {
    const key = `${VECTORS_PREFIX}${documentId}`;
    const data: DocumentVectors = { chunks };
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('[VectorStore] Failed to save vectors:', error);
    throw error;
  }
}

/**
 * Retrieve the top K most similar chunks for a given query embedding.
 */
export async function searchVectors(
  documentId: string,
  queryEmbedding: number[],
  topK: number = 5,
): Promise<VectorChunk[]> {
  try {
    const key = `${VECTORS_PREFIX}${documentId}`;
    const rawData = await AsyncStorage.getItem(key);
    if (!rawData) return [];

    const data: DocumentVectors = JSON.parse(rawData);
    
    // Calculate similarities and sort
    const scoredChunks = data.chunks.map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    scoredChunks.sort((a, b) => b.score - a.score);

    return scoredChunks.slice(0, topK).map((sc) => sc.chunk);
  } catch (error) {
    console.error('[VectorStore] Search failed:', error);
    return [];
  }
}

/**
 * Delete all vectors associated with a document.
 */
export async function deleteDocumentVectors(documentId: string): Promise<void> {
  try {
    const key = `${VECTORS_PREFIX}${documentId}`;
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('[VectorStore] Failed to delete vectors:', error);
  }
}
