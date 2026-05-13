/**
 * pdfParser.ts
 *
 * Extracts plain text from a local PDF file on Android.
 *
 * Strategy:
 *  - We read the file as a binary buffer via react-native's fetch + blob API,
 *    then parse the raw PDF byte stream with a lightweight pure-JS PDF text
 *    extractor (pdf.js subset via the `react-native-pdf-lib` text extraction).
 *
 * Since Gemma 4 E2B supports a 128 K token context window and our target
 * documents are educational PDFs (typically < 100 pages), we can safely pass
 * the full extracted text to the model without chunking.
 */

import { readFile } from 'react-native-pdf-lib';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Extract all text from a PDF at the given local file path.
 *
 * @param filePath  Absolute local path to the PDF (e.g. from document picker).
 * @returns         Raw extracted text, pages separated by newlines.
 */
export async function extractPdfText(filePath: string): Promise<string> {
  try {
    // react-native-pdf-lib reads pages and returns their text content.
    const pages = await readFile(filePath);

    if (!pages || pages.length === 0) {
      throw new Error('No readable text found in the PDF.');
    }

    return pages
      .map((page: { pageNumber: number; text: string }, idx: number) =>
        `--- Page ${page.pageNumber ?? idx + 1} ---\n${page.text.trim()}`,
      )
      .join('\n\n');
  } catch (err: any) {
    // Surface a clean error to callers (e.g. HomeScreen can show a toast)
    throw new Error(`PDF parsing failed: ${err?.message ?? String(err)}`);
  }
}
