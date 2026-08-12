import { describe, it, expect } from 'vitest';
import { isPersistedChange } from './pipelineStore';

/**
 * Guards both directions of the unsaved indicator: it must not light up for
 * React Flow's own bookkeeping, and it must still light up for a real edit.
 * Getting the first wrong trains users to ignore it; getting the second wrong
 * loses their work.
 */
describe('isPersistedChange', () => {
  it.each(['dimensions', 'select'])(
    'does not treat a %s change as an edit',
    (type) => {
      expect(isPersistedChange({ type })).toBe(false);
    }
  );

  it.each(['position', 'add', 'remove', 'replace'])(
    'treats a %s change as an edit',
    (type) => {
      expect(isPersistedChange({ type })).toBe(true);
    }
  );

  it('errs towards marking unknown change types as edits', () => {
    expect(isPersistedChange({ type: 'something-new' })).toBe(true);
    expect(isPersistedChange({})).toBe(true);
  });

  // What actually happens on mount: React Flow measures every node, then the
  // user clicks one. Neither should make the pipeline look modified.
  it('stays clean across a mount-and-click sequence', () => {
    const mountChanges = [
      { type: 'dimensions' },
      { type: 'dimensions' },
      { type: 'dimensions' },
      { type: 'select' },
    ];
    expect(mountChanges.some(isPersistedChange)).toBe(false);
  });

  it('becomes dirty as soon as a node is dragged', () => {
    expect([{ type: 'select' }, { type: 'position' }].some(isPersistedChange)).toBe(true);
  });
});
