# Deep Linking

Issue: #261 · Related: #83 (push), #85 (screens)

A notification tap or a shared web URL lands the user on the **exact trade**,
cold- or warm-started, on both platforms.

## URL scheme + hosts

| | value |
| --- | --- |
| Custom scheme | `amanavault://` |
| Universal / App Links | `https://amanavault.app`, `https://www.amanavault.app` |

Config source of truth: `src/constants/links.ts` (path table), consumed by
`app.config.ts` (iOS `associatedDomains`, Android `intentFilters` w/ `autoVerify`)
and `navigation/AppNavigator.tsx`.

## Path map (web ⇄ app)

| Web path | Screen | Params |
| --- | --- | --- |
| `/trades/:tradeId` | `TradeDetail` | `{ tradeId }` |
| `/disputes/:id` | `DisputeDetail` | `{ id }` |
| `/trades/:tradeId/evidence` | `EvidenceCapture` | `{ tradeId }` |
| `/trades` | `TradeList` | — |
| `/create-trade` | `CreateTrade` | — |
| `/trades/create` (alias) | `CreateTrade` | — |
| `/trades/:tradeId/<section>` (alias, e.g. `/dispute`) | `TradeDetail` | `{ tradeId }` |
| `/driver` | `DriverHome` | — |
| `/driver/:token` | *web only* — opened in the browser | — |

Aliases are matched by `parseDeepLink` but left out of
`LINKING_SCREEN_CONFIG` (one canonical path per screen).

## SMS links (issue #451)

SMS notifications link to the public `https://amanavault.app` URLs, so the same
link works whether or not the app is installed:

- **Trade links** (`/trades/:tradeId`, `/trades/:tradeId/dispute`, …) are
  claimed by the app through universal / app links (`/trades/*` in the AASA
  file and the Android `pathPrefix`). With the app installed they open the
  trade; any trade sub-page the app has no screen for opens the trade itself
  instead of being dropped. Without the app they open in the browser.
- **Driver links** (`/driver/:token`) are deliberately **web only**. The token
  is redeemed by the web attestation page without a wallet or login, while the
  app's driver screens need a signed-in driver. These paths are not in the
  association files, so an SMS tap always opens the browser. If the app does
  receive one (for example as `amanavault://driver/<token>`),
  `resolveDeepLink` returns a web action and `useDeepLink` opens it with
  `Linking.openURL`. Never add `/driver/*` to the association files: the link
  would bounce back into the app.
- Links on any other host are never opened as a fallback.

`frontend/src/lib/links.ts` mirrors this table for the web side.

## Auth-aware guards (login-then-continue)

1. `parseDeepLink(url)` → target, or `null` for unknown/malformed (dropped
   silently — never crashes).
2. `AppNavigator.getStateFromPath` sends an unauthenticated user hitting a
   protected link to `WalletConnect`.
3. `useDeepLink` parks the real target in a module-level slot (survives the
   WalletConnect → TradeList remount) and `resumePendingDeepLink` replays it the
   moment a token appears.

## Cold vs warm start

- **Cold**: `Linking.getInitialURL()` in `AppNavigator` on mount.
- **Warm**: `Linking.addEventListener('url', …)`.
Both funnel through `useDeepLink().handleUrl`. Covered by
`hooks/useDeepLink.test.ts` and `constants/__tests__/links.test.ts`.

## Fallback for recipients without the app

The web app is the fallback view: `/trades/[id]` renders the trade for anyone,
and the hosted association files let a future visit open the app instead once
installed. Verify the association files are live:

```
curl -s https://amanavault.app/.well-known/apple-app-site-association | jq .
curl -s https://amanavault.app/.well-known/assetlinks.json | jq .
```

Both are served as `application/json` via `frontend/next.config.ts` `headers()`.
Before release, replace `TEAMID` in the AASA file with the Apple Team ID and the
Android `sha256_cert_fingerprints` placeholder with the release signing cert.
