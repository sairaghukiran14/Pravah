import prisma from '@/lib/prisma';
import { route } from '@/lib/api/route';

/**
 * GET /api/analytics/api
 * Returns comprehensive developer & API analytics for the dashboard:
 * - Summary metrics (Total requests, 24h requests, success rate, avg latency, credits spent)
 * - Timeseries chart data (Daily request volume and latency over last 14 days)
 * - Per-key usage breakdown
 * - Recent 50 API request logs
 */
export const GET = route(
  { auth: true },
  async ({ userId }) => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // 1. Fetch total logs count & 24h count
    const [totalLogs, last24hLogs, successfulLogs, apiRunsCreditSum] = await Promise.all([
      prisma.apiRequestLog.count({ where: { userId } }),
      prisma.apiRequestLog.count({
        where: { userId, createdAt: { gte: twentyFourHoursAgo } },
      }),
      prisma.apiRequestLog.count({
        where: { userId, statusCode: { gte: 200, lt: 400 } },
      }),
      prisma.apiRequestLog.aggregate({
        where: { userId },
        _sum: { cost: true },
        _avg: { durationMs: true },
      }),
    ]);

    const successRate = totalLogs > 0 ? ((successfulLogs / totalLogs) * 100).toFixed(1) : '100.0';
    const avgLatencyMs = Math.round(apiRunsCreditSum._avg.durationMs || 0);
    const totalCreditsSpent = Number((apiRunsCreditSum._sum.cost || 0).toFixed(2));

    // 2. Fetch recent 50 logs with API key info
    const recentLogs = await prisma.apiRequestLog.findMany({
      where: { userId },
      select: {
        id: true,
        endpoint: true,
        method: true,
        statusCode: true,
        durationMs: true,
        cost: true,
        ip: true,
        error: true,
        createdAt: true,
        apiKey: {
          select: {
            id: true,
            name: true,
            keyPrefix: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // 3. Fetch daily timeseries data for the past 14 days
    const pastLogs = await prisma.apiRequestLog.findMany({
      where: {
        userId,
        createdAt: { gte: fourteenDaysAgo },
      },
      select: {
        statusCode: true,
        durationMs: true,
        cost: true,
        createdAt: true,
      },
    });

    // Aggregate by date (YYYY-MM-DD)
    const dailyMap = new Map<string, { date: string; requests: number; errors: number; avgLatency: number; totalLatency: number; cost: number }>();

    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      dailyMap.set(dateStr, {
        date: dateStr,
        requests: 0,
        errors: 0,
        avgLatency: 0,
        totalLatency: 0,
        cost: 0,
      });
    }

    for (const log of pastLogs) {
      const dateStr = log.createdAt.toISOString().split('T')[0];
      const entry = dailyMap.get(dateStr);
      if (entry) {
        entry.requests++;
        if (log.statusCode >= 400) entry.errors++;
        if (log.durationMs) entry.totalLatency += log.durationMs;
        entry.cost += log.cost;
      }
    }

    const timeseries = Array.from(dailyMap.values()).map((e) => ({
      date: e.date,
      requests: e.requests,
      errors: e.errors,
      avgLatency: e.requests > 0 ? Math.round(e.totalLatency / e.requests) : 0,
      cost: Number(e.cost.toFixed(2)),
    }));

    // 4. Per-key breakdown
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
        _count: {
          select: { apiLogs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const keyUsage = apiKeys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      totalRequests: k._count.apiLogs,
      lastUsedAt: k.lastUsedAt,
      expiresAt: k.expiresAt,
      isExpired: k.expiresAt ? k.expiresAt < now : false,
    }));

    return {
      metrics: {
        totalRequests: totalLogs,
        last24hRequests: last24hLogs,
        successRate: `${successRate}%`,
        avgLatencyMs,
        totalCreditsSpent,
      },
      timeseries,
      keyUsage,
      recentLogs: recentLogs.map((l) => ({
        id: l.id,
        endpoint: l.endpoint,
        method: l.method,
        statusCode: l.statusCode,
        durationMs: l.durationMs,
        cost: l.cost,
        ip: l.ip,
        error: l.error,
        createdAt: l.createdAt,
        keyName: l.apiKey?.name || 'Deleted Key',
        keyPrefix: l.apiKey?.keyPrefix || '••••••••',
      })),
    };
  }
);
