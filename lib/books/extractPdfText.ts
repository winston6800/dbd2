import * as pdfjs from 'pdfjs-dist';
// Vite's `?url` import gives the worker script a fingerprinted, deployable
// URL instead of relying on a CDN or a path that only exists in dev — the
// standard pdf.js + Vite wiring.
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/**
 * Extracts a PDF's text entirely in the browser — the file never leaves the
 * user's machine for this step, which matters for anyone uploading a book
 * they do not have the right to redistribute to a third-party server.
 *
 * Page breaks become blank lines. That is deliberate: segment.ts's heading
 * detector looks for a heading on its own line, and pdf.js otherwise runs a
 * page's last line straight into the next page's first with no separator.
 */
export async function extractPdfText(file: File, onProgress?: (page: number, total: number) => void): Promise<string> {
  const buffer = await file.arrayBuffer();
  const task = pdfjs.getDocument({ data: buffer });
  const doc = await task.promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(item => ('str' in item ? item.str : '')).join(' ');
    pages.push(text);
    onProgress?.(i, doc.numPages);
    page.cleanup();
  }

  // destroy() lives on the loading task, not the resolved document proxy —
  // it tears down this document's worker rather than any shared one.
  await task.destroy();
  return pages.join('\n\n');
}
