/**
 * Names of the shipped library project.
 *
 * Kept in their own module so client components can reference them without
 * pulling in the (large) pipeline template data from libraryTemplates.ts.
 *
 * These were previously duplicated as string literals in both the seeder and
 * the dashboard, which is how they drifted apart: the seeder created "Sample
 * Project" while the dashboard only surfaced Quick Access for "Library", so the
 * section never appeared for seeded accounts.
 */
export const LIBRARY_PROJECT_NAME = 'Library';

export const LIBRARY_PROJECT_DESCRIPTION =
  'A consolidated library of ready-to-run Indic speech, translation and document pipelines.';

/** Pre-rename name, still present on accounts that have not been migrated. */
export const LEGACY_LIBRARY_PROJECT_NAME = 'Sample Project';

/**
 * Identity of a library pipeline independent of how it happens to be labelled.
 *
 * The same workflows were seeded under different numbering over time — the old
 * starter set called it "1. Voice-to-Voice Translation" where the current
 * library calls it "4. Voice-to-Voice Translation", and one carried a
 * "(Complex)" suffix. Comparing raw names would treat those as different
 * pipelines and give the account two copies of each.
 */
export function normalizeLibraryPipelineName(name: string): string {
  return name
    .trim()
    .replace(/^\d+\.\s*/, '')        // leading "4. "
    .replace(/\s*\([^)]*\)\s*$/, '') // trailing "(Complex)"
    .toLowerCase()
    .replace(/\s+/g, ' ');
}
