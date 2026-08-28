import { calculateWER, calculateBLEU, normalizeText } from './scoring';

export interface DiffToken {
  type: 'hit' | 'added' | 'removed';
  value: string;
}

/**
 * Computes word-level diff between two text segments using Levenshtein alignment.
 */
export function generateTextDiff(v1Text: string, v2Text: string): DiffToken[] {
  const v1Norm = normalizeText(v1Text);
  const v2Norm = normalizeText(v2Text);

  const v1Words = v1Norm ? v1Norm.split(' ') : [];
  const v2Words = v2Norm ? v2Norm.split(' ') : [];

  const rLen = v1Words.length;
  const cLen = v2Words.length;

  const dp: number[][] = Array.from({ length: rLen + 1 }, () => 
    Array(cLen + 1).fill(0)
  );

  for (let i = 0; i <= rLen; i++) dp[i][0] = i;
  for (let j = 0; j <= cLen; j++) dp[0][j] = j;

  for (let i = 1; i <= rLen; i++) {
    for (let j = 1; j <= cLen; j++) {
      if (v1Words[i - 1] === v2Words[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // removal from v1
          dp[i][j - 1] + 1,    // addition to v2
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  // Backtrack to build diff stream
  let i = rLen;
  let j = cLen;
  const diff: DiffToken[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && v1Words[i - 1] === v2Words[j - 1]) {
      diff.unshift({ type: 'hit', value: v1Words[i - 1] });
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      // Substitution is treated as removal of v1 word and addition of v2 word
      diff.unshift({ type: 'added', value: v2Words[j - 1] });
      diff.unshift({ type: 'removed', value: v1Words[i - 1] });
      i--;
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j] === dp[i - 1][j] + 1)) {
      diff.unshift({ type: 'removed', value: v1Words[i - 1] });
      i--;
    } else if (j > 0 && (i === 0 || dp[i][j] === dp[i][j - 1] + 1)) {
      diff.unshift({ type: 'added', value: v2Words[j - 1] });
      j--;
    } else {
      i--;
      j--;
    }
  }

  return diff;
}

export interface ComparisonSummary {
  improvedCount: number;
  regressedCount: number;
  unchangedCount: number;
  deltaPassRate: number;
  deltaWer: number;
  deltaBleu: number;
  deltaLatency: number;
  deltaCost: number;
}

export interface ComparisonItemResult {
  itemId: string;
  itemName?: string | null;
  input: any;
  expectedOutput: any;
  v1: {
    status: string;
    actualOutput: any;
    durationMs: number;
    cost: number;
    scores: any;
    error?: string | null;
  };
  v2: {
    status: string;
    actualOutput: any;
    durationMs: number;
    cost: number;
    scores: any;
    error?: string | null;
  };
  diff: DiffToken[];
  deltaLatency: number;
  deltaCost: number;
  comparisonStatus: 'improved' | 'regressed' | 'unchanged';
}

/**
 * Computes regression comparison dashboard values between two eval runs.
 */
export function compareEvalRuns(v1Run: any, v2Run: any): {
  summary: ComparisonSummary;
  results: ComparisonItemResult[];
} {
  const v1Map = new Map<string, any>(v1Run.results.map((r: any) => [r.datasetItemId, r]));
  const v2Map = new Map<string, any>(v2Run.results.map((r: any) => [r.datasetItemId, r]));

  const results: ComparisonItemResult[] = [];
  let improvedCount = 0;
  let regressedCount = 0;
  let unchangedCount = 0;

  let v1Passed = 0;
  let v2Passed = 0;
  
  let v1TotalWer = 0;
  let v2TotalWer = 0;
  let werCounts = 0;

  let v1TotalBleu = 0;
  let v2TotalBleu = 0;
  let bleuCounts = 0;

  let v1TotalLatency = 0;
  let v2TotalLatency = 0;

  let v1TotalCost = 0;
  let v2TotalCost = 0;

  // Process item-by-item comparison
  v1Run.results.forEach((v1Result: any) => {
    const itemId = v1Result.datasetItemId;
    const v2Result = v2Map.get(itemId);
    if (!v2Result) return;

    const item = v1Result.datasetItem;

    const v1Text = typeof v1Result.actualOutput === 'string' ? v1Result.actualOutput : (v1Result.actualOutput?.text || v1Result.actualOutput?.translated_text || v1Result.actualOutput?.transcript || v1Result.actualOutput?.response || '');
    const v2Text = typeof v2Result.actualOutput === 'string' ? v2Result.actualOutput : (v2Result.actualOutput?.text || v2Result.actualOutput?.translated_text || v2Result.actualOutput?.transcript || v2Result.actualOutput?.response || '');

    const textDiff = generateTextDiff(v1Text, v2Text);

    // Calculate score metrics
    const v1Scores = v1Result.scores || {};
    const v2Scores = v2Result.scores || {};

    if (v1Scores.wer !== undefined && v2Scores.wer !== undefined) {
      v1TotalWer += v1Scores.wer;
      v2TotalWer += v2Scores.wer;
      werCounts++;
    }
    if (v1Scores.bleu !== undefined && v2Scores.bleu !== undefined) {
      v1TotalBleu += v1Scores.bleu;
      v2TotalBleu += v2Scores.bleu;
      bleuCounts++;
    }

    const v1ResultPassed = v1Result.status === 'passed';
    const v2ResultPassed = v2Result.status === 'passed';

    if (v1ResultPassed) v1Passed++;
    if (v2ResultPassed) v2Passed++;

    v1TotalLatency += v1Result.durationMs || 0;
    v2TotalLatency += v2Result.durationMs || 0;

    v1TotalCost += v1Result.cost || 0;
    v2TotalCost += v2Result.cost || 0;

    // Categorize item delta status
    let itemStatus: 'improved' | 'regressed' | 'unchanged' = 'unchanged';
    
    if (!v1ResultPassed && v2ResultPassed) {
      itemStatus = 'improved';
      improvedCount++;
    } else if (v1ResultPassed && !v2ResultPassed) {
      itemStatus = 'regressed';
      regressedCount++;
    } else {
      // Score delta checks
      const v1MainScore = v1Scores.bleu !== undefined ? v1Scores.bleu : (v1Scores.wer !== undefined ? 1 - v1Scores.wer : 0);
      const v2MainScore = v2Scores.bleu !== undefined ? v2Scores.bleu : (v2Scores.wer !== undefined ? 1 - v2Scores.wer : 0);
      
      const deltaScore = v2MainScore - v1MainScore;
      if (deltaScore > 0.05) {
        itemStatus = 'improved';
        improvedCount++;
      } else if (deltaScore < -0.05) {
        itemStatus = 'regressed';
        regressedCount++;
      } else {
        unchangedCount++;
      }
    }

    results.push({
      itemId,
      itemName: item?.name || null,
      input: item?.input || {},
      expectedOutput: item?.expectedOutput || {},
      v1: {
        status: v1Result.status,
        actualOutput: v1Result.actualOutput,
        durationMs: v1Result.durationMs || 0,
        cost: v1Result.cost || 0,
        scores: v1Scores,
        error: v1Result.error,
      },
      v2: {
        status: v2Result.status,
        actualOutput: v2Result.actualOutput,
        durationMs: v2Result.durationMs || 0,
        cost: v2Result.cost || 0,
        scores: v2Scores,
        error: v2Result.error,
      },
      diff: textDiff,
      deltaLatency: (v2Result.durationMs || 0) - (v1Result.durationMs || 0),
      deltaCost: (v2Result.cost || 0) - (v1Result.cost || 0),
      comparisonStatus: itemStatus,
    });
  });

  const runSize = results.length || 1;
  const deltaPassRate = parseFloat(((v2Passed / runSize) * 100 - (v1Passed / runSize) * 100).toFixed(2));
  
  const v1AvgWer = werCounts > 0 ? v1TotalWer / werCounts : 0;
  const v2AvgWer = werCounts > 0 ? v2TotalWer / werCounts : 0;
  const deltaWer = parseFloat((v2AvgWer - v1AvgWer).toFixed(4));

  const v1AvgBleu = bleuCounts > 0 ? v1TotalBleu / bleuCounts : 0;
  const v2AvgBleu = bleuCounts > 0 ? v2TotalBleu / bleuCounts : 0;
  const deltaBleu = parseFloat((v2AvgBleu - v1AvgBleu).toFixed(4));

  const deltaLatency = parseFloat((v2TotalLatency / runSize - v1TotalLatency / runSize).toFixed(2));
  const deltaCost = parseFloat((v2TotalCost - v1TotalCost).toFixed(4));

  return {
    summary: {
      improvedCount,
      regressedCount,
      unchangedCount,
      deltaPassRate,
      deltaWer,
      deltaBleu,
      deltaLatency,
      deltaCost,
    },
    results,
  };
}
