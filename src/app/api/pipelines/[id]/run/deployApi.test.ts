import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => {
  const mockApiKey = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  };

  const mockPipeline = {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  };

  const mockPipelineRun = {
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  };

  const mockNodeRun = {
    create: vi.fn(),
    updateMany: vi.fn(),
  };

  const mockApiRequestLog = {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  };

  const mockCreditTransaction = {
    findMany: vi.fn(),
  };

  return {
    default: {
      apiKey: mockApiKey,
      pipeline: mockPipeline,
      pipelineRun: mockPipelineRun,
      nodeRun: mockNodeRun,
      apiRequestLog: mockApiRequestLog,
      creditTransaction: mockCreditTransaction,
    },
  };
});

vi.mock('@/lib/api/rateLimit', () => ({
  consumeRateLimit: vi.fn().mockResolvedValue({ success: true }),
  clientIpFrom: vi.fn().mockReturnValue('127.0.0.1'),
}));

vi.mock('@/lib/api/credits', () => ({
  reserveCredits: vi.fn().mockResolvedValue(true),
  settleCredits: vi.fn().mockResolvedValue({ refunded: 0, billed: 0.35 }),
  releaseReservation: vi.fn().mockResolvedValue(true),
  countActiveRuns: vi.fn().mockResolvedValue(0),
  reapStaleRuns: vi.fn().mockResolvedValue(0),
  creditsSpentToday: vi.fn().mockResolvedValue(0),
  RUN_RESERVATION: 25,
  MAX_CONCURRENT_RUNS: 5,
  DAILY_CREDIT_CEILING: 500,
}));

vi.mock('@/lib/api/audit', () => ({
  recordAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/execution', () => ({
  sortNodesTopologically: vi.fn().mockImplementation((nodes) => nodes),
  resolveNodeInput: vi.fn().mockReturnValue({ upstreamInputText: 'Hello', dynamicInputPayload: null }),
  executeSingleNode: vi.fn().mockResolvedValue({
    status: 'completed',
    output: { text: 'Translated Output in Hindi' },
    durationMs: 350,
    usage: { characters: 25 },
  }),
}));

vi.mock('@/lib/api/pricing', () => ({
  nodeCost: vi.fn().mockReturnValue(0.35),
}));

import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { POST as runPipelineHandler } from './route';

describe('Deploy as API: Pipeline Execution Engine (POST /api/pipelines/[id]/run)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects external calls with missing or invalid Bearer token', async () => {
    const req = new NextRequest('http://localhost:3000/api/pipelines/p1/run?stream=false', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid_random_token_123',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: { text: 'Test' } }),
    });

    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(null);

    const res = await runPipelineHandler(req, { params: Promise.resolve({ id: 'p1' }) });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Invalid API Key');
  });

  it('rejects calls with an expired API key', async () => {
    const rawKey = 'pf_live_expired_key_123456';
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: 'key_expired',
      userId: 'user_123',
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
    } as any);

    const req = new NextRequest('http://localhost:3000/api/pipelines/p1/run?stream=false', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${rawKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: { text: 'Test' } }),
    });

    const res = await runPipelineHandler(req, { params: Promise.resolve({ id: 'p1' }) });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('API Key has expired');
  });

  it('rejects calls to pipelines not owned by the API key user (403 Forbidden)', async () => {
    const rawKey = 'pf_live_valid_key_123456';

    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: 'key_valid',
      userId: 'user_123',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    } as any);

    vi.mocked(prisma.apiKey.update).mockResolvedValue({} as any);
    vi.mocked(prisma.pipeline.findFirst).mockResolvedValue(null); // Not owned

    const req = new NextRequest('http://localhost:3000/api/pipelines/p_other_user/run?stream=false', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${rawKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: { text: 'Test' } }),
    });

    const res = await runPipelineHandler(req, { params: Promise.resolve({ id: 'p_other_user' }) });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('unauthorized');
  });

  it('executes synchronously and returns structured JSON when stream=false is specified', async () => {
    const rawKey = 'pf_live_valid_key_123456';

    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: 'key_valid',
      userId: 'user_123',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    } as any);

    vi.mocked(prisma.apiKey.update).mockResolvedValue({} as any);

    // Mock owned pipeline with 2 nodes
    vi.mocked(prisma.pipeline.findFirst).mockResolvedValue({
      id: 'p1',
      nodes: [
        { id: 'node_1', type: 'text_input', label: 'Input Text', positionX: 0, positionY: 0, config: {} },
        { id: 'node_2', type: 'translate', label: 'Translate Node', positionX: 300, positionY: 0, config: {} },
      ],
      edges: [
        { id: 'e1', source: 'node_1', target: 'node_2', sourceHandle: null, targetHandle: null },
      ],
    } as any);

    vi.mocked(prisma.pipelineRun.create).mockResolvedValue({
      id: 'run_123',
      pipelineId: 'p1',
      status: 'running',
    } as any);

    vi.mocked(prisma.pipelineRun.update).mockResolvedValue({} as any);
    vi.mocked(prisma.nodeRun.updateMany).mockResolvedValue({} as any);

    const req = new NextRequest('http://localhost:3000/api/pipelines/p1/run?stream=false', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${rawKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          text: 'नमस्ते! भारत की कृत्रिम बुद्धिमत्ता सर्वम एआई।',
        },
      }),
    });

    const res = await runPipelineHandler(req, { params: Promise.resolve({ id: 'p1' }) });
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.runId).toBe('run_123');
    expect(data.status).toBe('completed');
    expect(data.outputs).toBeDefined();
    expect(data.outputs['node_2']).toEqual({ text: 'Translated Output in Hindi' });
    expect(data.totalCost).toBeGreaterThanOrEqual(0);
    expect(data.durationMs).toBeGreaterThanOrEqual(0);

    // Verify attribution to API key on PipelineRun create
    expect(prisma.pipelineRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          apiKeyId: 'key_valid',
          source: 'api',
        }),
      })
    );
  });
});
