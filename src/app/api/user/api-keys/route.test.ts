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
  };
  return {
    default: {
      apiKey: mockApiKey,
      apiRequestLog: {
        findMany: vi.fn(),
        count: vi.fn(),
        aggregate: vi.fn(),
      },
    },
  };
});

vi.mock('@/lib/api/rateLimit', () => ({
  consumeRateLimit: vi.fn().mockResolvedValue({ success: true }),
  clientIpFrom: vi.fn().mockReturnValue('127.0.0.1'),
}));

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { GET, POST } from './route';

describe('API Keys Management (GET / POST /api/user/api-keys)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const req = new NextRequest('http://localhost:3000/api/user/api-keys');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('generates an API key successfully for authenticated user', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user_123', email: 'test@example.com' },
      expires: '2099-01-01',
    } as any);

    vi.mocked(prisma.apiKey.count).mockResolvedValue(2);
    vi.mocked(prisma.apiKey.create).mockResolvedValue({
      id: 'key_1',
      name: 'Test Key',
      keyPrefix: 'pf_live_abc123...4567',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    } as any);

    const req = new NextRequest('http://localhost:3000/api/user/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Key', expiry: '30d' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.key).toMatch(/^pf_live_[a-f0-9]{48}$/);
    expect(data.apiKey.name).toBe('Test Key');
  });

  it('rejects invalid key creation payloads with 400', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user_123', email: 'test@example.com' },
      expires: '2099-01-01',
    } as any);

    const req = new NextRequest('http://localhost:3000/api/user/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name: '' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
