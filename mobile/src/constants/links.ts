import type { RootStackParamList } from '../types/navigation';

/**
 * Shared deep-link constants (issue #261).
 *
 * One place that maps a canonical path (`/trades/:id`) to a navigator screen
 * and back to a public web URL. The web app mirrors this in
 * `frontend/src/lib/links.ts` — keep the two in sync (the path table below is
 * the contract).
 */

export const APP_SCHEME = 'amanavault';
export const WEB_ORIGIN = 'https://amanavault.app';

/** Hosts we accept universal / app links from. */
export const LINK_PREFIXES = [`${APP_SCHEME}://`, `${WEB_ORIGIN}`, 'https://www.amanavault.app'];

export interface DeepLinkTarget {
  screen: keyof RootStackParamList;
  params?: Record<string, string>;
}

/** Screens reachable without authentication. Everything else defers to login. */
export const PUBLIC_SCREENS: ReadonlySet<keyof RootStackParamList> = new Set(['WalletConnect']);

interface Route {
  /** react-navigation linking `path` (relative, no leading slash). */
  path: string;
  /**
   * Extra URL shape for a screen that already has a canonical route. Aliases
   * are matched by `parseDeepLink` but kept out of `LINKING_SCREEN_CONFIG`,
   * which holds exactly one path per screen.
   */
  alias?: boolean;
  screen: keyof RootStackParamList;
  match: RegExp;
  toParams: (m: RegExpMatchArray) => Record<string, string>;
  toWebPath: (params: Record<string, string>) => string;
}

const ROUTES: Route[] = [
  {
    // The web "create trade" page; must precede trades/:tradeId so "create"
    // is not read as a trade id.
    path: 'trades/create',
    alias: true,
    screen: 'CreateTrade',
    match: /^\/?trades\/create\/?$/,
    toParams: () => ({}),
    toWebPath: () => `/trades/create`,
  },
  {
    path: 'trades/:tradeId',
    screen: 'TradeDetail',
    match: /^\/?trades\/([^/?#]+)\/?$/,
    toParams: (m) => ({ tradeId: decodeURIComponent(m[1]) }),
    toWebPath: (p) => `/trades/${encodeURIComponent(p.tradeId)}`,
  },
  {
    path: 'disputes/:id',
    screen: 'DisputeDetail',
    match: /^\/?disputes\/([^/?#]+)\/?$/,
    toParams: (m) => ({ id: decodeURIComponent(m[1]) }),
    toWebPath: (p) => `/disputes/${encodeURIComponent(p.id)}`,
  },
  {
    path: 'trades/:tradeId/evidence',
    screen: 'EvidenceCapture',
    match: /^\/?(?:trades\/([^/?#]+)\/evidence|evidence\/([^/?#]+))\/?$/,
    toParams: (m) => ({ tradeId: decodeURIComponent(m[1] ?? m[2]) }),
    toWebPath: (p) => `/trades/${encodeURIComponent(p.tradeId)}/evidence`,
  },
  {
    // SMS and web pages link to trade sub-pages such as /trades/:id/dispute.
    // The app has no separate screen for them, so open the trade itself
    // rather than dropping a link the OS already handed to the app.
    path: 'trades/:tradeId/:section',
    alias: true,
    screen: 'TradeDetail',
    match: /^\/?trades\/([^/?#]+)\/[^?#]+$/,
    toParams: (m) => ({ tradeId: decodeURIComponent(m[1]) }),
    toWebPath: (p) => `/trades/${encodeURIComponent(p.tradeId)}`,
  },
  {
    path: 'trades',
    screen: 'TradeList',
    match: /^\/?trades\/?$/,
    toParams: () => ({}),
    toWebPath: () => `/trades`,
  },
  {
    path: 'create-trade',
    screen: 'CreateTrade',
    match: /^\/?create-trade\/?$/,
    toParams: () => ({}),
    toWebPath: () => `/trades/create`,
  },
  {
    // A driver's own stops (signed-in drivers using the app).
    path: 'driver',
    screen: 'DriverHome',
    match: /^\/?driver\/?$/,
    toParams: () => ({}),
    toWebPath: () => `/`,
  },
];

/**
 * Links the app recognises but deliberately leaves to the web app.
 *
 * Driver SMS links (`/driver/:token`) carry a one-time token that the web
 * attestation page redeems without a wallet or login; the app's driver
 * screens work from signed-in manifests instead. These paths must never be
 * added to apple-app-site-association / assetlinks.json: the OS then opens SMS
 * taps straight in the browser, and the app can hand them to the browser
 * without the link bouncing back into the app.
 */
const WEB_ONLY_ROUTES: RegExp[] = [/^\/?driver\/[^/?#]+\/?$/];

/** What to do with an incoming link: navigate in the app, or open the web. */
export type DeepLinkAction =
  | { kind: 'app'; target: DeepLinkTarget }
  | { kind: 'web'; url: string };

/** react-navigation `linking.config.screens` map. */
export const LINKING_SCREEN_CONFIG: Partial<Record<keyof RootStackParamList, string>> = ROUTES.filter(
  (r) => !r.alias,
).reduce(
  (acc, r) => ({ ...acc, [r.screen]: r.path }),
  { WalletConnect: 'connect', VaultDashboard: 'vault' },
);

/**
 * Parse an incoming URL or bare path into a navigation target.
 * Returns `null` for anything unrecognised or malformed — callers must handle
 * that gracefully (see AppNavigator / useDeepLink).
 */
interface ParsedInput {
  pathname: string;
  /** False for https links on hosts we do not own. */
  ownHost: boolean;
}

function parseInput(input: string | null | undefined): ParsedInput | null {
  if (!input || typeof input !== 'string') return null;

  let pathname: string;
  let ownHost = true;
  try {
    if (input.includes('://')) {
      const url = new URL(input);
      // custom scheme: amanavault://trades/123  -> host="trades", pathname="/123"
      if (url.protocol === `${APP_SCHEME}:`) {
        pathname = `/${url.host}${url.pathname}`;
      } else {
        pathname = url.pathname;
        ownHost = LINK_PREFIXES.some((p) => p.startsWith('https://') && url.origin === p);
      }
    } else {
      pathname = input.startsWith('/') ? input : `/${input}`;
    }
  } catch {
    return null;
  }

  return { pathname: pathname.replace(/\/{2,}/g, '/'), ownHost };
}

export function parseDeepLink(input: string | null | undefined): DeepLinkTarget | null {
  const parsed = parseInput(input);
  if (!parsed) return null;
  const { pathname } = parsed;

  for (const route of ROUTES) {
    const m = pathname.match(route.match);
    if (m) {
      const params = route.toParams(m);
      // reject empty / obviously bad ids
      if (Object.values(params).some((v) => v === '' || v === 'undefined' || v === 'null')) {
        return null;
      }
      return { screen: route.screen, params: Object.keys(params).length ? params : undefined };
    }
  }
  return null;
}

/**
 * Decide how to handle an incoming link: an in-app screen, the web app for
 * web-only links (driver SMS links), or `null` to ignore it. Only links on
 * our own hosts or the app scheme are ever sent to the web.
 */
export function resolveDeepLink(input: string | null | undefined): DeepLinkAction | null {
  const target = parseDeepLink(input);
  if (target) return { kind: 'app', target };

  const parsed = parseInput(input);
  if (!parsed || !parsed.ownHost) return null;
  if (WEB_ONLY_ROUTES.some((re) => re.test(parsed.pathname))) {
    return { kind: 'web', url: `${WEB_ORIGIN}${parsed.pathname.replace(/\/$/, '')}` };
  }
  return null;
}

/** Map a navigation target to the public web URL (for "share" / fallback). */
export function webUrlFor(target: DeepLinkTarget): string {
  const route = ROUTES.find((r) => r.screen === target.screen);
  if (!route) return WEB_ORIGIN;
  return `${WEB_ORIGIN}${route.toWebPath(target.params ?? {})}`;
}

export function requiresAuth(target: DeepLinkTarget): boolean {
  return !PUBLIC_SCREENS.has(target.screen);
}
