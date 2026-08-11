/**
 * Error carrying an HTTP status. Anything thrown from a route handler that is
 * not an ApiError is treated as an unexpected failure: logged in full, and
 * reported to the client as a generic 500 so internal details do not leak.
 */
export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export const unauthorized = (msg = 'Unauthorized') => new ApiError(401, msg);
export const forbidden = (msg = 'Forbidden') => new ApiError(403, msg);
export const notFound = (msg = 'Not found') => new ApiError(404, msg);
export const badRequest = (msg = 'Bad request', details?: unknown) =>
  new ApiError(400, msg, details);
export const paymentRequired = (msg = 'Payment required') => new ApiError(402, msg);
export const tooManyRequests = (msg = 'Too many requests') => new ApiError(429, msg);
