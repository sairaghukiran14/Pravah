import { describe, it, expect } from 'vitest';
import { documentPageCount, pageCountFromPayload } from './pageCount';

/** A PDF whose page tree states its own total, the common case. */
function pdfWithPageTree(count: number): Buffer {
  return Buffer.from(
    `%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n` +
      `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count ${count} >>\nendobj\n` +
      `trailer\n<< /Root 1 0 R >>\n%%EOF`,
    'latin1'
  );
}

/** A PDF with no readable page tree, only individual page objects. */
function pdfWithPageObjects(count: number): Buffer {
  const objects = Array.from(
    { length: count },
    (_, i) => `${i + 3} 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\n`
  ).join('');
  return Buffer.from(`%PDF-1.4\n${objects}trailer\n<< >>\n%%EOF`, 'latin1');
}

describe('documentPageCount', () => {
  it('reads the count off the page tree', () => {
    expect(documentPageCount(pdfWithPageTree(10))).toBe(10);
    expect(documentPageCount(pdfWithPageTree(1))).toBe(1);
    expect(documentPageCount(pdfWithPageTree(437))).toBe(437);
  });

  it('takes the root total, not a nested subtotal', () => {
    const nested = Buffer.from(
      `%PDF-1.7\n` +
        `2 0 obj\n<< /Type /Pages /Kids [4 0 R 5 0 R] /Count 12 >>\nendobj\n` +
        `4 0 obj\n<< /Type /Pages /Kids [6 0 R] /Count 5 >>\nendobj\n` +
        `5 0 obj\n<< /Type /Pages /Kids [7 0 R] /Count 7 >>\nendobj\n`,
      'latin1'
    );
    expect(documentPageCount(nested)).toBe(12);
  });

  it('reads a count written before its type key', () => {
    const reversed = Buffer.from(
      `%PDF-1.5\n2 0 obj\n<< /Count 8 /Kids [3 0 R] /Type /Pages >>\nendobj\n`,
      'latin1'
    );
    expect(documentPageCount(reversed)).toBe(8);
  });

  it('falls back to counting page objects when no tree is readable', () => {
    expect(documentPageCount(pdfWithPageObjects(6))).toBe(6);
  });

  // /Type /Page is a prefix of /Type /Pages; matching loosely would count the
  // tree node as a page and overbill every document by one.
  it('does not count the page tree node as a page', () => {
    expect(documentPageCount(pdfWithPageObjects(3))).toBe(3);
  });

  it('treats a non-PDF as a single page', () => {
    expect(documentPageCount(Buffer.from('\x89PNG\r\n\x1a\n' + 'x'.repeat(200)))).toBe(1);
    expect(documentPageCount(Buffer.from('just some plain text'))).toBe(1);
  });

  it.each([[null], [undefined], [Buffer.alloc(0)]])(
    'returns one page for %s rather than zero',
    (input) => {
      expect(documentPageCount(input)).toBe(1);
    }
  );

  it('never returns less than one page for a malformed PDF', () => {
    expect(documentPageCount(Buffer.from('%PDF-1.4\ngarbage'))).toBe(1);
    expect(documentPageCount(pdfWithPageTree(0))).toBe(1);
  });

  it('finds the header when the file has leading junk', () => {
    const withBom = Buffer.concat([
      Buffer.from('﻿\n\n'),
      pdfWithPageTree(4),
    ]);
    expect(documentPageCount(withBom)).toBe(4);
  });
});

describe('pageCountFromPayload', () => {
  it('measures a PDF carried as a data URL', () => {
    const dataUrl = `data:application/pdf;base64,${pdfWithPageTree(9).toString('base64')}`;
    expect(pageCountFromPayload(dataUrl)).toBe(9);
  });

  it('measures raw base64 with no data URL prefix', () => {
    expect(pageCountFromPayload(pdfWithPageTree(3).toString('base64'))).toBe(3);
  });

  it('bills a remotely stored document as one page until its bytes are read', () => {
    expect(pageCountFromPayload('https://example.com/report.pdf')).toBe(1);
    expect(pageCountFromPayload('/api/audio/file?key=abc')).toBe(1);
  });

  it.each([[null], [undefined], [''], [42], [{}]])(
    'returns one page for %s rather than throwing',
    (input) => {
      expect(pageCountFromPayload(input)).toBe(1);
    }
  );
});
