import dns from 'dns';
import net from 'net';

/**
 * Guarded outbound fetch for user-controlled URLs.
 *
 * Every place the server fetches a URL that a user can influence (webhook nodes,
 * Sarvam STT/Vision file URLs) must go through here rather than calling fetch()
 * directly, otherwise the server can be used to reach internal services —
 * cloud metadata endpoints, admin panels, databases on the private network.
 *
 * Residual risk: a hostname can resolve to a public IP at validation time and a
 * private one when the socket is actually opened (DNS rebinding). Closing that
 * fully requires pinning the connection to the validated IP, which Node's fetch
 * does not expose. For production the durable answer is an egress proxy with a
 * static IP and an allowlist; this module is the in-process mitigation.
 */

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const DEFAULT_MAX_REDIRECTS = 3;

export class BlockedRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlockedRequestError';
  }
}

/** Convert an IPv4 string to a 32-bit integer. */
function ipv4ToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function inCidrV4(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split('/');
  const bits = Number(bitsStr);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(range) & mask);
}

// Ranges that must never be reachable from a user-supplied URL.
const BLOCKED_V4 = [
  '0.0.0.0/8', // "this network"
  '10.0.0.0/8', // RFC1918 private
  '100.64.0.0/10', // CGNAT
  '127.0.0.0/8', // loopback
  '169.254.0.0/16', // link-local — AWS/GCP/Azure instance metadata lives here
  '172.16.0.0/12', // RFC1918 private
  '192.0.0.0/24', // IETF protocol assignments
  '192.0.2.0/24', // TEST-NET-1
  '192.168.0.0/16', // RFC1918 private
  '198.18.0.0/15', // benchmarking
  '198.51.100.0/24', // TEST-NET-2
  '203.0.113.0/24', // TEST-NET-3
  '224.0.0.0/4', // multicast
  '240.0.0.0/4', // reserved / broadcast
];

function isBlockedIp(ip: string): boolean {
  const version = net.isIP(ip);

  if (version === 4) {
    return BLOCKED_V4.some((cidr) => inCidrV4(ip, cidr));
  }

  if (version === 6) {
    const lower = ip.toLowerCase();

    // IPv4-mapped (::ffff:10.0.0.1) and IPv4-compatible — unwrap and re-check as v4.
    const mapped = lower.match(/^::(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedIp(mapped[1]);

    if (lower === '::1' || lower === '::') return true; // loopback / unspecified

    const head = lower.split(':')[0];
    const headVal = parseInt(head || '0', 16);
    if ((headVal & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
    if ((headVal & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
    if ((headVal & 0xff00) === 0xff00) return true; // ff00::/8 multicast

    return false;
  }

  // Not a literal IP — caller resolves DNS before reaching here.
  return true;
}

/**
 * Validate a single URL: scheme, then every IP its host resolves to.
 * Rejects if *any* resolved address is in a blocked range.
 */
async function assertUrlAllowed(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BlockedRequestError('Invalid URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BlockedRequestError(`Blocked URL scheme: ${url.protocol}`);
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, ''); // strip IPv6 brackets

  // Literal IP — check directly, no DNS needed.
  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new BlockedRequestError(`Blocked address: ${hostname} is not publicly routable`);
    }
    return url;
  }

  let addresses: dns.LookupAddress[];
  try {
    addresses = await dns.promises.lookup(hostname, { all: true });
  } catch {
    throw new BlockedRequestError(`Could not resolve host: ${hostname}`);
  }

  if (addresses.length === 0) {
    throw new BlockedRequestError(`Could not resolve host: ${hostname}`);
  }

  for (const { address } of addresses) {
    if (isBlockedIp(address)) {
      throw new BlockedRequestError(
        `Blocked address: ${hostname} resolves to a non-public address (${address})`
      );
    }
  }

  return url;
}

export interface SafeFetchOptions extends Omit<RequestInit, 'redirect' | 'signal'> {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
}

/**
 * fetch() for user-supplied URLs. Validates the target, follows redirects
 * manually so each hop is re-validated, and caps body size and duration.
 */
export async function safeFetch(
  rawUrl: string,
  options: SafeFetchOptions = {}
): Promise<{ body: Buffer; contentType: string; status: number; finalUrl: string }> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxBytes = DEFAULT_MAX_BYTES,
    maxRedirects = DEFAULT_MAX_REDIRECTS,
    ...init
  } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let currentUrl = rawUrl;
    let response: Response | null = null;

    for (let hop = 0; hop <= maxRedirects; hop++) {
      // Re-validate on every hop: an allowed host can redirect to 169.254.169.254.
      const validated = await assertUrlAllowed(currentUrl);

      response = await fetch(validated.toString(), {
        ...init,
        redirect: 'manual',
        signal: controller.signal,
      });

      const isRedirect = response.status >= 300 && response.status < 400;
      if (!isRedirect) break;

      const location = response.headers.get('location');
      if (!location) break;

      if (hop === maxRedirects) {
        throw new BlockedRequestError('Too many redirects');
      }
      currentUrl = new URL(location, validated).toString();
    }

    if (!response) {
      throw new BlockedRequestError('Request failed');
    }

    // Reject oversized bodies up front when the server declares the length.
    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (declaredLength > maxBytes) {
      throw new BlockedRequestError(
        `Response too large: ${declaredLength} bytes exceeds limit of ${maxBytes}`
      );
    }

    // Stream with a running cap so a server lying about content-length can't
    // exhaust memory either.
    const chunks: Uint8Array[] = [];
    let total = 0;
    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > maxBytes) {
          await reader.cancel();
          throw new BlockedRequestError(`Response exceeded size limit of ${maxBytes} bytes`);
        }
        chunks.push(value);
      }
    }

    return {
      body: Buffer.concat(chunks),
      contentType: response.headers.get('content-type') || 'application/octet-stream',
      status: response.status,
      finalUrl: currentUrl,
    };
  } finally {
    clearTimeout(timer);
  }
}
