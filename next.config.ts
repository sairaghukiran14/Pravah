import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Content Security Policy.
 *
 * 'unsafe-eval' is required only by the dev server's hot-module reloading, so it
 * is omitted from production builds entirely.
 *
 * 'unsafe-inline' remains in script-src because Next.js injects inline bootstrap
 * and hydration scripts. Removing it requires switching to a nonce-based policy
 * generated per request in middleware and threaded through to Next's own script
 * tags — a worthwhile next step, but one that breaks the whole app if the nonce
 * is not propagated correctly, so it is deliberately not bundled in here.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://checkout.razorpay.com`,
  "connect-src 'self' https://checkout.razorpay.com https://api.sarvam.ai https://lumberjack.razorpay.com",
  "img-src 'self' data: blob: https://*.googleusercontent.com https://*.r2.cloudflarestorage.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
  "media-src 'self' data: blob:",
  "worker-src 'self' blob:",
  // Hardening directives — no legitimate use in this app, and they close off
  // plugin embedding, <base> hijacking, clickjacking and cross-origin form posts.
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');

const nextConfig: NextConfig = {
  // Don't advertise the framework — it only helps someone match the stack
  // against known advisories.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          // Deny access to device APIs this app never uses. Microphone is
          // allowed on same-origin because audio recording is a core feature.
          {
            key: 'Permissions-Policy',
            value: 'camera=(), geolocation=(), payment=(), usb=(), microphone=(self)',
          },
          { key: 'Content-Security-Policy', value: csp },
          // HSTS only matters over HTTPS; emitting it in local dev would pin
          // localhost to https and break the dev server.
          ...(isDev
            ? []
            : [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]),
        ],
      },
    ];
  },
};

export default nextConfig;
