/**
 * embedding.ts
 *
 * Service for generating text embeddings using the local LLM.
 */

import { getEmbedding as getLlamaEmbedding } from './inference';

/**
 * Convert a string into a numerical vector (embedding).
 *
 * @param text The text to embed.
 * @returns    The embedding vector.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    return await getLlamaEmbedding(text);
  } catch (error) {
    console.error('[EmbeddingService] Failed to generate embedding:', error);
    throw error;
  }
}
