/**
 * Pure TypeScript Scoring Algorithms for Evaluation Harness.
 * Implements Word Error Rate (WER) and BLEU precision scoring with zero dependencies.
 */

/**
 * Normalizes input text by converting to lowercase, stripping punctuation,
 * and normalizing spacing (retaining regional script characters).
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    // Strip standard punctuation while leaving characters, numbers, and spaces intact
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'।||।]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates Levenshtein Distance between two token arrays.
 */
function levenshteinDistance(refTokens: string[], hypTokens: string[]): {
  distance: number;
  substitutions: number;
  deletions: number;
  insertions: number;
} {
  const rLen = refTokens.length;
  const hLen = hypTokens.length;

  const dp: number[][] = Array.from({ length: rLen + 1 }, () => 
    Array(hLen + 1).fill(0)
  );

  // Initialize bounds
  for (let i = 0; i <= rLen; i++) dp[i][0] = i;
  for (let j = 0; j <= hLen; j++) dp[0][j] = j;

  // Populate DP grid
  for (let i = 1; i <= rLen; i++) {
    for (let j = 1; j <= hLen; j++) {
      if (refTokens[i - 1] === hypTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // Deletion
          dp[i][j - 1] + 1,    // Insertion
          dp[i - 1][j - 1] + 1 // Substitution
        );
      }
    }
  }

  // Backtrack to count operations
  let i = rLen;
  let j = hLen;
  let substitutions = 0;
  let deletions = 0;
  let insertions = 0;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && refTokens[i - 1] === hypTokens[j - 1]) {
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      substitutions++;
      i--;
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j] === dp[i - 1][j] + 1)) {
      deletions++;
      i--;
    } else if (j > 0 && (i === 0 || dp[i][j] === dp[i][j - 1] + 1)) {
      insertions++;
      j--;
    } else {
      // Fallback
      i--;
      j--;
    }
  }

  return {
    distance: dp[rLen][hLen],
    substitutions,
    deletions,
    insertions
  };
}

/**
 * Computes Word Error Rate (WER) using Levenshtein distance on words.
 */
export function calculateWER(reference: string, hypothesis: string): {
  wer: number;
  substitutions: number;
  deletions: number;
  insertions: number;
  refWordsCount: number;
} {
  const refNorm = normalizeText(reference);
  const hypNorm = normalizeText(hypothesis);

  const refTokens = refNorm ? refNorm.split(' ') : [];
  const hypTokens = hypNorm ? hypNorm.split(' ') : [];

  if (refTokens.length === 0) {
    return {
      wer: hypTokens.length > 0 ? 1.0 : 0.0,
      substitutions: 0,
      deletions: 0,
      insertions: hypTokens.length,
      refWordsCount: 0
    };
  }

  const { distance, substitutions, deletions, insertions } = levenshteinDistance(refTokens, hypTokens);

  return {
    wer: parseFloat((distance / refTokens.length).toFixed(4)),
    substitutions,
    deletions,
    insertions,
    refWordsCount: refTokens.length
  };
}

/**
 * Computes BLEU-1 and BLEU-2 precision scores (simplifed BLEU with Brevity Penalty).
 */
export function calculateBLEU(reference: string, hypothesis: string): number {
  const refNorm = normalizeText(reference);
  const hypNorm = normalizeText(hypothesis);

  const refTokens = refNorm ? refNorm.split(' ') : [];
  const hypTokens = hypNorm ? hypNorm.split(' ') : [];

  if (refTokens.length === 0 || hypTokens.length === 0) return 0;

  // Unigram precision
  let matches1 = 0;
  const refCounts: Record<string, number> = {};
  refTokens.forEach(t => refCounts[t] = (refCounts[t] || 0) + 1);

  hypTokens.forEach(t => {
    if (refCounts[t] && refCounts[t] > 0) {
      matches1++;
      refCounts[t]--;
    }
  });

  const p1 = matches1 / hypTokens.length;

  // Bigram precision
  let matches2 = 0;
  const totalBigrams = hypTokens.length - 1;
  
  if (totalBigrams > 0) {
    const refBigrams: Record<string, number> = {};
    for (let i = 0; i < refTokens.length - 1; i++) {
      const key = `${refTokens[i]}_${refTokens[i+1]}`;
      refBigrams[key] = (refBigrams[key] || 0) + 1;
    }

    for (let i = 0; i < hypTokens.length - 1; i++) {
      const key = `${hypTokens[i]}_${hypTokens[i+1]}`;
      if (refBigrams[key] && refBigrams[key] > 0) {
        matches2++;
        refBigrams[key]--;
      }
    }
  }

  const p2 = totalBigrams > 0 ? (matches2 / totalBigrams) : p1;

  // Brevity Penalty (BP)
  const c = hypTokens.length;
  const r = refTokens.length;
  const bp = c > r ? 1.0 : Math.exp(1 - (r / c));

  // Geometric mean of p1 and p2
  const score = bp * Math.sqrt(p1 * (p2 || p1));
  return parseFloat(score.toFixed(4));
}

/**
 * Checks for Exact Match (excluding formatting/spacing differences)
 */
export function calculateExactMatch(reference: string, hypothesis: string): boolean {
  return normalizeText(reference) === normalizeText(hypothesis);
}
