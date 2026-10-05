import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { ZodType, ZodError } from 'zod';
import type { Session } from 'next-auth';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { ApiError } from './errors';
import { consumeRateLimit, clientIpFrom } from './rateLimit';

/**
 * Wrapper for API route handlers.
 *
 * Authentication, rate limiting, input validation and error handling live here
 * rather than being re-typed in every route.
 * Supports both NextAuth session cookies and Bearer API keys (`pf_live_...`).
 */

export interface RouteConfig<TBody, TQuery> {
  /** Require a signed-in user or valid API key. Default true. Set false only for public routes. */
  auth?: boolean;
  /** Token cost for this route; higher for endpoints that call paid APIs. */
  cost?: number;
  /** Skip throttling entirely (streaming/internal routes). Default false. */
  skipRateLimit?: boolean;
  /** Zod schema for the JSON body. Omit for routes reading formData/no body. */
  body?: ZodType<TBody>;
  /** Zod schema for query string parameters. */
  query?: ZodType<TQuery>;
}

export interface HandlerContext<TBody, TQuery, TParams> {
  req: NextRequest;
  /** Non-null whenever authenticated via browser session. */
  session: Session | null;
  userId: string;
  apiKeyId?: string | null;
  authMethod: 'session' | 'api_key' | 'anonymous';
  body: TBody;
  query: TQuery;
  params: TParams;
}

type Handler<TBody, TQuery, TParams> = (
  ctx: HandlerContext<TBody, TQuery, TParams>
) => Promise<Response | unknown>;

function errorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, ...(error.details ? { details: error.details } : {}) },
      { status: error.status }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Invalid request',
        details: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
      { status: 400 }
    );
  }

  console.error('[api] Unhandled error:', error);
  const message = error instanceof Error ? error.message : 'Internal server error';
  const stack = process.env.NODE_ENV !== 'production' && error instanceof Error ? error.stack : undefined;
  return NextResponse.json({ error: message, stack }, { status: 500 });
}

export function route<TBody = undefined, TQuery = undefined, TParams = Record<string, string>>(
  config: RouteConfig<TBody, TQuery>,
  handler: Handler<TBody, TQuery, TParams>
) {
  return async (
    req: NextRequest,
    routeCtx?: { params: Promise<TParams> }
  ): Promise<Response> => {
    const startTime = Date.now();
    let effectiveUserId: string | null = null;
    let effectiveApiKeyId: string | null = null;
    let authMethod: 'session' | 'api_key' | 'anonymous' = 'anonymous';

    try {
      const requireAuth = config.auth !== false;
      let session: Session | null = null;

      // 1. Check Bearer API Key first
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const rawKey = authHeader.substring(7).trim();
        if (rawKey) {
          const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
          const apiKey = await prisma.apiKey.findUnique({
            where: { keyHash },
            select: { id: true, userId: true, expiresAt: true },
          });

          if (!apiKey) {
            throw new ApiError(401, 'Invalid API Key');
          }

          if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
            throw new ApiError(401, 'API Key has expired. Please create a new key in your dashboard.');
          }

          effectiveUserId = apiKey.userId;
          effectiveApiKeyId = apiKey.id;
          authMethod = 'api_key';

          // Asynchronously update lastUsedAt
          prisma.apiKey
            ?.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
            ?.catch?.(() => {});
        }
      }

      // 2. Fallback to NextAuth session
      if (!effectiveUserId && requireAuth) {
        session = await auth();
        if (session?.user?.id) {
          effectiveUserId = session.user.id;
          authMethod = 'session';
        }
      }

      if (requireAuth && !effectiveUserId) {
        throw new ApiError(401, 'Unauthorized');
      }

      if (!config.skipRateLimit) {
        const identifier = effectiveUserId
          ? (effectiveApiKeyId ? `apikey:${effectiveApiKeyId}` : `user:${effectiveUserId}`)
          : `ip:${clientIpFrom(req.headers)}`;

        const result = await consumeRateLimit(identifier, config.cost ?? 1);
        if (!result.success) {
          const resetSeconds = result.reset
            ? Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))
            : 60;
          return NextResponse.json(
            { error: 'Too many requests. Please slow down and try again shortly.' },
            {
              status: 429,
              headers: { 'Retry-After': String(resetSeconds) },
            }
          );
        }
      }

      const params = (routeCtx?.params ? await routeCtx.params : {}) as TParams;

      let body = undefined as TBody;
      if (config.body) {
        let raw: unknown;
        try {
          raw = await req.json();
        } catch {
          throw new ApiError(400, 'Request body must be valid JSON');
        }
        body = config.body.parse(raw);
      }

      let query = undefined as TQuery;
      if (config.query) {
        const searchParams = Object.fromEntries(new URL(req.url).searchParams.entries());
        query = config.query.parse(searchParams);
      }

      const result = await handler({
        req,
        session,
        userId: effectiveUserId ?? '',
        apiKeyId: effectiveApiKeyId,
        authMethod,
        body,
        query,
        params,
      });

      // Record API request log if invoked via API key
      if (effectiveApiKeyId && effectiveUserId) {
        const durationMs = Date.now() - startTime;
        const statusCode = result instanceof Response ? result.status : 200;
        prisma.apiRequestLog
          ?.create({
            data: {
              userId: effectiveUserId,
              apiKeyId: effectiveApiKeyId,
              endpoint: new URL(req.url).pathname,
              method: req.method,
              statusCode,
              durationMs,
              cost: config.cost ?? 0,
              ip: clientIpFrom(req.headers),
              userAgent: req.headers.get('user-agent'),
            },
          })
          ?.catch?.(() => {});
      }

      if (result instanceof Response) return result;
      return NextResponse.json(result);
    } catch (error) {
      if (effectiveApiKeyId && effectiveUserId) {
        const durationMs = Date.now() - startTime;
        const statusCode = error instanceof ApiError ? error.status : (error instanceof ZodError ? 400 : 500);
        const errMsg = error instanceof Error ? error.message : 'Error';
        prisma.apiRequestLog
          ?.create({
            data: {
              userId: effectiveUserId,
              apiKeyId: effectiveApiKeyId,
              endpoint: new URL(req.url).pathname,
              method: req.method,
              statusCode,
              durationMs,
              cost: 0,
              ip: clientIpFrom(req.headers),
              userAgent: req.headers.get('user-agent'),
              error: errMsg,
            },
          })
          ?.catch?.(() => {});
      }
      return errorResponse(error);
    }
  };
}

