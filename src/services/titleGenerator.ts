/**
 * titleGenerator.ts
 *
 * Generates concise AI-powered titles for chat sessions using the local
 * Gemma model. Title generation is intentionally lightweight:
 *   - Only 20 tokens predicted
 *   - Low temperature for focused output
 *   - Graceful fallback to first-words-of-message if inference fails
 */

import { runInference } from './inference';
import type { ChatSession } from '../store/appStore';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a short 3–5 word title for a chat session based on the user's
 * first message and the document it relates to.
 *
 * Runs inference with a tightly constrained prompt so it completes quickly
 * without blocking the main chat flow. Always resolves — falls back to a
 * word-slice title if the model returns nothing useful.
 *
 * @param userMessage   The first user message in the session.
 * @param documentTitle The title of the PDF document being discussed.
 * @returns             A short display title string.
 */
export async function generateSessionTitle(
  userMessage: string,
  documentTitle: string,
): Promise<string> {
  try {
    // Truncate long messages — the model only needs the gist
    const truncated = userMessage.slice(0, 200);

    // Plain-text prompt — no chat template needed for this simple task.
    // Keeping it minimal reduces the chance of the small model going off-rails.
    const prompt =
      'Generate a short 3-5 word title for this question about "' +
      documentTitle +
      '".\n\nQuestion: "' +
      truncated +
      '"\n\nTitle:';

    const raw = await runInference(prompt, undefined, {
      n_predict: 20,
      stop: ['\n', '<end_of_turn>', '<eos>', '</s>', '.'],
      temperature: 0.3,
      top_p: 0.9,
      penalty_repeat: 1.0,
    });

    let title = raw.trim();

    // Strip surrounding quotes the model sometimes adds
    title = title.replace(/^["']|["']$/g, '').trim();

    // Hard length cap
    if (title.length > 50) {
      title = title.slice(0, 47) + '...';
    }

    // Reject empty or suspiciously short results
    if (title.length < 3) {
      return fallbackTitle(userMessage);
    }

    return title;
  } catch (err) {
    console.warn('[TitleGenerator] Inference failed, using fallback:', err);
    return fallbackTitle(userMessage);
  }
}

/**
 * Return the display title for a session.
 * Prefers the stored AI-generated title, then falls back to the first user
 * message words, then a generic label using the document title.
 *
 * @param session       The chat session object from the store.
 * @param documentTitle The title of the associated PDF document.
 * @returns             A non-empty display string.
 */
export function getSessionDisplayTitle(
  session: Pick<ChatSession, 'title' | 'messages'>,
  documentTitle: string,
): string {
  if (session.title) {
    return session.title;
  }

  const firstUserMsg = session.messages.find((m) => m.role === 'user');
  if (firstUserMsg) {
    return fallbackTitle(firstUserMsg.content);
  }

  return 'Chat about ' + documentTitle;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Slice the first 5 words of a message to use as a title.
 */
function fallbackTitle(message: string): string {
  const words = message.trim().split(/\s+/).slice(0, 5);
  let title = words.join(' ');

  if (title.length > 40) {
    title = title.slice(0, 37) + '...';
  } else if (message.trim().length > title.length) {
    title += '…';
  }

  return title || 'New Chat';
}
