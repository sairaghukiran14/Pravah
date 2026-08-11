import prisma from '@/lib/prisma';
import { forbidden } from './errors';

/**
 * Authorization for stored objects.
 *
 * Being signed in is not sufficient to read a file: object keys are guessable
 * (they embed a user id or node id plus a millisecond timestamp) and are handed
 * to the browser in run output, so any authenticated caller could otherwise
 * fetch another tenant's audio by key.
 *
 * Ownership is derived from where the key came from rather than from a separate
 * table, so it applies to objects already in the bucket with no backfill:
 *
 *   audio_input_<userId>_<ts>_<name>  — the userId segment is written by the
 *     server from the session at upload time, so it cannot be forged.
 *   tts_run_<nodeId>_<ts>.wav         — matched against the exact key recorded
 *     in NodeRun.output.audio_r2_key, scoped to runs the caller owns. Matching
 *     the whole key (not just the node id) matters because node ids come from
 *     the client when a run is submitted.
 *
 * Anything else is denied: an unrecognised key has no provenance to check.
 */
export async function assertObjectAccess(key: string, userId: string): Promise<void> {
  if (key.startsWith('audio_input_')) {
    // audio / input / <userId> / <timestamp> / <name...>
    const ownerId = key.split('_')[2];
    if (ownerId && ownerId === userId) return;
    throw forbidden('You do not have access to this file');
  }

  if (key.startsWith('tts_run_')) {
    const owned = await prisma.nodeRun.findFirst({
      where: {
        output: { path: ['audio_r2_key'], equals: key },
        run: { pipeline: { project: { userId } } },
      },
      select: { id: true },
    });
    if (owned) return;
    throw forbidden('You do not have access to this file');
  }

  throw forbidden('You do not have access to this file');
}
