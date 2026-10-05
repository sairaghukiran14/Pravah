import { z } from 'zod';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { route } from '@/lib/api/route';
import { badRequest, notFound } from '@/lib/api/errors';

const createKeySchema = z.object({
  name: z.string().trim().min(1, 'Key name is required').max(64, 'Key name must be 64 characters or less'),
  expiry: z.enum(['7d', '30d', '90d', '1y', 'never']).default('30d'),
});

function calculateExpiryDate(expiry: '7d' | '30d' | '90d' | '1y' | 'never'): Date | null {
  const now = new Date();
  switch (expiry) {
    case '7d':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    case '1y':
      return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    case 'never':
    default:
      return null;
  }
}

/**
  * GET /api/user/api-keys
  * Lists all API keys for the authenticated user, including usage metrics & expiry status.
  */
export const GET = route(
  { auth: true },
  async ({ userId }) => {
    const keys = await prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
        _count: {
          select: {
            apiLogs: true,
            pipelineRuns: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const formatted = keys.map((k) => {
      const isExpired = k.expiresAt ? k.expiresAt < now : false;
      const daysUntilExpiry = k.expiresAt
        ? Math.ceil((k.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        expiresAt: k.expiresAt,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
        totalRequests: k._count.apiLogs,
        pipelineRunsCount: k._count.pipelineRuns,
        isExpired,
        isExpiringSoon: !isExpired && daysUntilExpiry !== null && daysUntilExpiry <= 7,
        daysUntilExpiry,
      };
    });

    return { keys: formatted };
  }
);

/**
 * POST /api/user/api-keys
 * Generates a new API key (`pf_live_<32_hex>`), securely stores its SHA-256 hash, and returns
 * the plaintext key once for the user to copy.
 */
export const POST = route<z.infer<typeof createKeySchema>>(
  { auth: true, body: createKeySchema },
  async ({ userId, body }) => {
    // Check if user has exceeded max keys limit (e.g. 20)
    const existingCount = await prisma.apiKey.count({ where: { userId } });
    if (existingCount >= 20) {
      throw badRequest('Maximum limit of 20 API keys reached. Please revoke old keys first.');
    }

    // Generate 32 bytes random hex
    const randomSecret = crypto.randomBytes(24).toString('hex');
    const plaintextKey = `pf_live_${randomSecret}`;
    const keyPrefix = `pf_live_${randomSecret.substring(0, 6)}...${randomSecret.slice(-4)}`;
    const keyHash = crypto.createHash('sha256').update(plaintextKey).digest('hex');

    const expiresAt = calculateExpiryDate(body.expiry);

    const apiKey = await prisma.apiKey.create({
      data: {
        userId,
        name: body.name,
        keyHash,
        keyPrefix,
        expiresAt,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      key: plaintextKey, // Only returned once on creation!
      apiKey,
      message: 'API Key generated successfully. Please copy and store it safely — you will not be able to view it again.',
    };
  }
);
