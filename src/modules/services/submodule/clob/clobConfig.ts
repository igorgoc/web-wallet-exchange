/**
 * Centralized, network-aware CLOB & Swap API endpoint resolver.
 *
 * Security invariant:
 * - Sirius Mainnet (networkType 184) FAILS CLOSED (returns '') unless an explicit HTTPS
 *   VITE_CLOB_MAINNET_API_URL is configured at build time. A Mainnet (X...) wallet can
 *   NEVER accidentally route requests or WebSockets to the Testnet 2 Render server.
 * - Sirius Testnet 2 (networkType 168) uses local dev (:8088) on localhost/127.0.0.1,
 *   or VITE_CLOB_TESTNET2_API_URL / default Testnet 2 Render endpoint in production.
 */

export const SIRIUS_MAINNET_NETWORK_TYPE = 184;
export const SIRIUS_TESTNET2_NETWORK_TYPE = 168;

const DEFAULT_TESTNET2_API_URL = 'https://sirius-clob-backend.onrender.com';
const LOCAL_DEV_PORT = 8088;

function isLocalHostname(hostname: string): boolean {
  const h = String(hostname || '').toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
}

export function normalizeEndpointUrl(
  raw: string | undefined | null,
  { requireHttps = false }: { requireHttps?: boolean } = {}
): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    const isHttp = parsed.protocol === 'http:';
    const isHttps = parsed.protocol === 'https:';
    if (!isHttp && !isHttps) return '';
    if (requireHttps && !isHttps) return '';
    return parsed.href.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

export function resolveSiriusNetworkType(
  explicitNetworkType?: number | null,
  fallbackAddress?: string | null
): number {
  // Address prefix 'X' is cryptographically Mainnet (184): never allow stale AppState (168) to route an X... wallet to Testnet 2!
  const cleanAddr = String(fallbackAddress || '').replace(/[- ]/g, '').toUpperCase();
  if (cleanAddr.startsWith('X')) return SIRIUS_MAINNET_NETWORK_TYPE;
  if (explicitNetworkType === SIRIUS_MAINNET_NETWORK_TYPE || explicitNetworkType === SIRIUS_TESTNET2_NETWORK_TYPE) {
    return explicitNetworkType;
  }
  if (cleanAddr.startsWith('V')) return SIRIUS_TESTNET2_NETWORK_TYPE;
  return SIRIUS_TESTNET2_NETWORK_TYPE;
}

export function getClobApiBase(networkType?: number | null, fallbackAddress?: string | null): string {
  const activeNet = resolveSiriusNetworkType(networkType, fallbackAddress);
  const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
  const isBrowser = typeof window !== 'undefined';
  const hostname = isBrowser ? window.location.hostname : '';
  const isLocal = isLocalHostname(hostname);

  if (activeNet === SIRIUS_MAINNET_NETWORK_TYPE) {
    // Fail-closed on Mainnet: NEVER fall back to Testnet 2 Render URL!
    // Require HTTPS in production; allow http only if explicitly set to localhost in dev.
    const configuredMainnet = normalizeEndpointUrl(env.VITE_CLOB_MAINNET_API_URL, {
      requireHttps: !isLocal,
    });
    return configuredMainnet;
  }

  // Sirius Testnet 2 (168)
  if (isLocal) {
    const host = hostname === '[::1]' ? 'localhost' : hostname;
    return `http://${host}:${LOCAL_DEV_PORT}`;
  }
  return (
    normalizeEndpointUrl(env.VITE_CLOB_TESTNET2_API_URL, { requireHttps: true }) ||
    DEFAULT_TESTNET2_API_URL
  );
}

export function isClobEndpointConfigured(networkType?: number | null, fallbackAddress?: string | null): boolean {
  return Boolean(getClobApiBase(networkType, fallbackAddress));
}

export function getClobWsBase(networkType?: number | null, fallbackAddress?: string | null): string {
  const apiBase = getClobApiBase(networkType, fallbackAddress);
  if (!apiBase) return '';
  return apiBase.replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:').replace(/\/+$/, '');
}

/**
 * Format a remaining cosign expiry countdown (e.g. "23h 48m", "14m 20s", "< 1m").
 */
export function formatSettlementCountdown(expiresAtMs?: number | null, nowMs: number = Date.now()): string {
  const exp = Number(expiresAtMs || 0);
  if (!Number.isFinite(exp) || exp <= 0) return '';
  const diffMs = exp - nowMs;
  if (diffMs <= 0) return 'Expiring soon';
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours >= 1) return `${hours}h ${minutes}m`;
  if (minutes >= 1) return `${minutes}m ${seconds}s`;
  return `${Math.max(1, seconds)}s`;
}
