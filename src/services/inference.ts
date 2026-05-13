/**
 * inference.ts
 *
 * On-device LLM inference powered by llama.rn + Gemma 4 E2B (GGUF, Q4).
 * The model file is bundled inside android/app/src/main/assets/models/.
 */

import { initLlama, LlamaContext } from 'llama.rn';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Asset path understood by llama.rn on Android (resolved via AssetManager). */
const MODEL_ASSET = 'models/gemma4-e2b-q4.gguf';

/**
 * Number of CPU threads to use for inference.
 * Keep this conservative so we don't starve the UI thread on low-end devices.
 */
const N_THREADS = 4;

/** Max new tokens to generate per response. */
const MAX_TOKENS = 512;

// ─── Module-level context (singleton) ────────────────────────────────────────

let _ctx: LlamaContext | null = null;
let _loading = false;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Load the Gemma model into memory.
 * Safe to call multiple times — only initialises once.
 */
export async function loadModel(): Promise<void> {
  if (_ctx || _loading) return;
  _loading = true;

  try {
    _ctx = await initLlama({
      model: MODEL_ASSET,
      use_mlock: false,   // don't lock pages — important on low-RAM devices
      n_ctx: 8192,        // context window size (tokens); Gemma 4 supports 128 K
      n_threads: N_THREADS,
      n_batch: 512,
      n_gpu_layers: 0,    // CPU-only for broadest device compatibility
    });
  } finally {
    _loading = false;
  }
}

/**
 * Release the model from memory.
 * Call this when the app is backgrounded or the Chat screen unmounts
 * if memory pressure is critical.
 */
export async function releaseModel(): Promise<void> {
  if (_ctx) {
    await _ctx.release();
    _ctx = null;
  }
}

/**
 * Run a single completion against the loaded model.
 *
 * @param prompt  The full formatted prompt (system + context + user question).
 * @param onToken Optional streaming callback — called for each generated token
 *                so the UI can update incrementally.
 * @returns       The complete generated text.
 */
export async function runInference(
  prompt: string,
  onToken?: (token: string) => void,
): Promise<string> {
  if (!_ctx) {
    await loadModel();
  }

  const result = await _ctx!.completion(
    {
      prompt,
      n_predict: MAX_TOKENS,
      stop: ['<end_of_turn>', '<eos>', '</s>'],
      temperature: 0.7,
      top_p: 0.9,
      repeat_penalty: 1.1,
    },
    (data) => {
      if (onToken && data.token) {
        onToken(data.token);
      }
    },
  );

  return result.text.trim();
}
