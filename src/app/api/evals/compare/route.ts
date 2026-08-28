import { z } from 'zod';
import prisma from '@/lib/prisma';
import { route } from '@/lib/api/route';
import { forbidden, notFound } from '@/lib/api/errors';
import { compareEvalRuns } from '@/lib/evals/regression';

const compareSchema = z.object({
  baselineRunId: z.string(),
  candidateRunId: z.string(),
});

export const POST = route<z.infer<typeof compareSchema>, undefined, Record<string, never>>(
  { body: compareSchema },
  async ({ userId, body }) => {
    const { baselineRunId, candidateRunId } = body;

    // Fetch baseline eval run with results and verify ownership
    const baselineRun = await prisma.evalRun.findFirst({
      where: { id: baselineRunId, userId },
      include: {
        results: {
          include: {
            datasetItem: true,
          },
        },
      },
    });

    if (!baselineRun) throw notFound('Baseline evaluation run not found or unauthorized');

    // Fetch candidate eval run with results
    const candidateRun = await prisma.evalRun.findFirst({
      where: { id: candidateRunId, userId },
      include: {
        results: {
          include: {
            datasetItem: true,
          },
        },
      },
    });

    if (!candidateRun) throw notFound('Candidate evaluation run not found or unauthorized');

    // Run comparison calculations
    const comparisonResult = compareEvalRuns(baselineRun, candidateRun);

    // Persist regression comparison
    const comparison = await prisma.regressionComparison.create({
      data: {
        userId,
        baselineRunId,
        candidateRunId,
        datasetId: baselineRun.datasetId,
        summary: comparisonResult.summary as any,
      },
    });

    return {
      id: comparison.id,
      summary: comparisonResult.summary,
      results: comparisonResult.results,
      baselineRun: {
        id: baselineRun.id,
        summary: baselineRun.summary,
        startedAt: baselineRun.startedAt,
      },
      candidateRun: {
        id: candidateRun.id,
        summary: candidateRun.summary,
        startedAt: candidateRun.startedAt,
      },
    };
  }
);
