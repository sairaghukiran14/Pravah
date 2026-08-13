/**
 * Counting pages in an uploaded document.
 *
 * Sarvam bills document digitisation per page, so the page count decides what a
 * run costs. It has to be known *before* the OCR node executes: the run holds a
 * fixed number of credits up front and settles against it afterwards, so a
 * 40-page bill discovered after the fact is charged against a hold that never
 * covered it.
 *
 * Deliberately dependency-free and deliberately conservative. A wrong count
 * here is a billing error, so anything ambiguous resolves upward rather than
 * guessing low.
 */

/** Anything that is not a multi-page document counts as a single page. */
const SINGLE_PAGE = 1;

function isPdf(buffer: Buffer): boolean {
  // The header may sit a few bytes in on files with a leading BOM or junk.
  return buffer.subarray(0, 1024).includes('%PDF-');
}

/**
 * Read the page count out of a PDF.
 *
 * Tries the page tree's own `/Count` first, which is authoritative and cheap.
 * Falls back to counting page objects, which is what remains when the document
 * uses compressed object streams and the tree is not visible as plain text.
 */
function pdfPageCount(buffer: Buffer): number {
  const text = buffer.toString('latin1');

  // The root of the page tree carries the total. Nested tree nodes each carry
  // their own subtotal, so the largest value is the root's.
  let treeCount = 0;
  const countPattern = /\/Type\s*\/Pages\b[^]{0,512}?\/Count\s+(\d+)/g;
  for (const match of text.matchAll(countPattern)) {
    treeCount = Math.max(treeCount, Number(match[1]));
  }
  // Some writers put /Count before /Type within the same object.
  const reversePattern = /\/Count\s+(\d+)[^]{0,512}?\/Type\s*\/Pages\b/g;
  for (const match of text.matchAll(reversePattern)) {
    treeCount = Math.max(treeCount, Number(match[1]));
  }
  if (treeCount > 0) return treeCount;

  // `/Type /Page` must not also match `/Type /Pages`, hence the boundary.
  const objects = text.match(/\/Type\s*\/Page(?![s\w])/g);
  if (objects && objects.length > 0) return objects.length;

  return SINGLE_PAGE;
}

/**
 * Pages a document will be billed for. Never returns less than one — a document
 * we cannot read still costs a page to attempt.
 */
export function documentPageCount(buffer: Buffer | null | undefined): number {
  if (!buffer || buffer.length === 0) return SINGLE_PAGE;
  try {
    if (isPdf(buffer)) return Math.max(SINGLE_PAGE, pdfPageCount(buffer));
    return SINGLE_PAGE;
  } catch {
    // A malformed file is the OCR node's problem to report, not a reason to
    // fail the run here — bill it as one page and let the node surface the error.
    return SINGLE_PAGE;
  }
}

/** Page count for a document carried as a data URL, an R2 key, or raw base64. */
export function pageCountFromPayload(payload: unknown): number {
  if (typeof payload !== 'string' || !payload) return SINGLE_PAGE;

  // Only inline data can be measured here; anything stored remotely is counted
  // when the bytes are fetched.
  if (!payload.startsWith('data:') && !/^[A-Za-z0-9+/=\s]+$/.test(payload)) {
    return SINGLE_PAGE;
  }

  try {
    const base64 = payload.includes(',') ? payload.split(',')[1] : payload;
    if (!base64) return SINGLE_PAGE;
    return documentPageCount(Buffer.from(base64, 'base64'));
  } catch {
    return SINGLE_PAGE;
  }
}
