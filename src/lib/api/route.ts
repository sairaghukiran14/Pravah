import { NextRequest, NextResponse } from 'next/server';
import { ZodType, ZodError } from 'zod';
import type { Session } from 'next-auth';
import { auth } from '@/auth';
import { ApiError } from './errors';
import { consumeRateLimit, clientIpFrom } from './rateLimit';

/**
 * Wrapper for API route handlers.
 *
 * Authentication, rate limiting, input validation and error handling live here
 * rather than being re-typed in every route. The important property is that
 * they are opt-OUT: a new route is authenticated and throttled unless it
 * explicitly says otherwise, so the failure mode of forgetting a line is a
 * route that is too strict rather than one that is wide open.
 */

export interface RouteConfig<TBody, TQuery> {
  /** Require a signed-in user. Default true. Set false only for public routes. */
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
  /** Non-null whenever `auth` is not explicitly false. */
  session: Session;
  userId: string;
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

  // Unexpected: log the real cause, return a generic message. Never fall back
  // to fabricated "demo" data here — a failed request must read as failed.
  console.error('[api] Unhandled error:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

export function route<TBody = undefined, TQuery = undefined, TParams = Record<string, string>>(
  config: RouteConfig<TBody, TQuery>,
  handler: Handler<TBody, TQuery, TParams>
) {
  return async (
    req: NextRequest,
    routeCtx?: { params: Promise<TParams> }
  ): Promise<Response> => {
    try {
      const requireAuth = config.auth !== false;

      let session: Session | null = null;
      if (requireAuth) {
        session = await auth();
        if (!session?.user?.id) {
          throw new ApiError(401, 'Unauthorized');
        }
      }

      if (!config.skipRateLimit) {
        // Authenticated callers are keyed by user id, which cannot be spoofed;
        // anonymous callers fall back to IP.
        const identifier = session?.user?.id
          ? `user:${session.user.id}`
          : `ip:${clientIpFrom(req.headers)}`;

        const result = await consumeRateLimit(identifier, config.cost ?? 1);
        if (!result.success) {
          return NextResponse.json(
            { error: 'Too many requests. Please slow down and try again shortly.' },
            {
              status: 429,
              headers: result.reset
                ? { 'Retry-After': String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))) }
                : undefined,
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
        session: session as Session,
        userId: session?.user?.id ?? '',
        body,
        query,
        params,
      });

      // Handlers may return a Response directly (streaming, binary payloads)
      // or a plain object to be serialized.
      if (result instanceof Response) return result;
      return NextResponse.json(result);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
