#!/usr/bin/env node
/**
 * Guards the invariant that every API route goes through the `route()` wrapper,
 * which is what supplies authentication, rate limiting, input validation and
 * error handling.
 *
 * This exists because the original audit found a route (/api/audio/[filename])
 * that simply forgot its auth check while 19 siblings had it. A convention that
 * relies on remembering will eventually be forgotten; this makes CI remember.
 *
 *   node src/scripts/verify-route-safety.mjs          # static check
 *   node src/scripts/verify-route-safety.mjs --live   # also probe a running server for 401s
 *
 * Exits non-zero on any violation.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const API_DIR = 'src/app/api';
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

// Routes legitimately exempt from the wrapper, with the reason they are exempt.
const EXEMPT = {
  'src/app/api/auth/[...nextauth]/route.ts':
    "NextAuth's own handler — it implements the sign-in endpoints themselves",
};

function findRouteFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...findRouteFiles(full));
    else if (entry === 'route.ts' || entry === 'route.tsx') out.push(full);
  }
  return out;
}

const violations = [];
const publicRoutes = [];
let checked = 0;

for (const file of findRouteFiles(API_DIR)) {
  const rel = relative(process.cwd(), file);
  if (EXEMPT[rel]) continue;

  const src = readFileSync(file, 'utf8');
  checked++;

  for (const method of HTTP_METHODS) {
    // `export async function GET(...)` — a hand-rolled handler, not wrapped.
    if (new RegExp(`export\\s+(async\\s+)?function\\s+${method}\\b`).test(src)) {
      violations.push(`${rel}: ${method} is a bare function — must use route()`);
      continue;
    }

    const constMatch = src.match(new RegExp(`export\\s+const\\s+${method}\\s*=\\s*([\\s\\S]{0,40})`));
    if (!constMatch) continue;

    // `route(` or `route<...generics...>(` — generics may nest, so just require
    // the identifier followed by a type-argument list or a call.
    if (!/^\s*route\s*[<(]/.test(constMatch[1])) {
      violations.push(`${rel}: ${method} is not wrapped in route()`);
    }
  }

  // Opting out of auth is allowed but must be deliberate and visible.
  if (/auth\s*:\s*false/.test(src)) {
    publicRoutes.push(rel);
  }
}

console.log(`Checked ${checked} route file(s); ${Object.keys(EXEMPT).length} exempt.`);

if (publicRoutes.length) {
  console.log('\nRoutes explicitly declaring auth: false (intentionally public):');
  for (const r of publicRoutes) console.log(`  - ${r}`);
}

if (violations.length) {
  console.error('\n✖ Route safety violations:\n');
  for (const v of violations) console.error(`  ${v}`);
  console.error(
    '\nEvery API route must be defined with route() from @/lib/api/route so that auth,\n' +
      'rate limiting, validation and error handling are applied. If a route is genuinely\n' +
      'public, declare { auth: false } rather than bypassing the wrapper.\n'
  );
  process.exit(1);
}

console.log('\n✔ All API routes use the route() wrapper.');

// Optional live check: confirm each route actually rejects anonymous callers.
if (process.argv.includes('--live')) {
  const base = process.env.VERIFY_BASE_URL || 'http://localhost:3000';
  console.log(`\nProbing ${base} for anonymous rejection...`);

  const failures = [];
  for (const file of findRouteFiles(API_DIR)) {
    const rel = relative(process.cwd(), file);
    if (EXEMPT[rel]) continue;

    const src = readFileSync(file, 'utf8');
    if (/auth\s*:\s*false/.test(src)) continue; // intentionally public

    // Map the file path to a URL, substituting a placeholder for dynamic segments.
    const urlPath = rel
      .replace(/^src\/app/, '')
      .replace(/\/route\.tsx?$/, '')
      .replace(/\[\.\.\.[^\]]+\]/g, 'probe')
      .replace(/\[([^\]]+)\]/g, 'probe');

    const method = /export\s+const\s+GET\s*=/.test(src) ? 'GET' : 'POST';

    try {
      const res = await fetch(base + urlPath, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'POST' ? '{}' : undefined,
      });
      if (res.status !== 401) {
        failures.push(`${method} ${urlPath} → ${res.status} (expected 401)`);
      }
    } catch (err) {
      failures.push(`${method} ${urlPath} → request failed: ${err.message}`);
    }
  }

  if (failures.length) {
    console.error('\n✖ Routes that did not reject an anonymous request:\n');
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log('✔ All non-public routes returned 401 to an anonymous request.');
}
