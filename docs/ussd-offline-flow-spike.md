# USSD Offline Flow Spike

**Issue:** EziAgric/EziAgric#474 — [Pilot] Offline USSD flow research spike
**Status:** Research spike. No code shipped. Recommendation below.

## Goal

Let feature-phone users check trade status and confirm delivery without a smartphone or data connection, using USSD.

## Verdict

1. **Status check over USSD: yes.** Read-only, low risk, and it maps cleanly onto existing trade reads.
2. **Delivery confirmation over USSD: not as a direct on-chain action.** Every lifecycle transition in Amana is an unsigned Stellar transaction (XDR) that the caller must sign client-side. A USSD session has no wallet and no signing key, so it cannot sign `POST /trades/:id/confirm`. Any design that makes USSD sign on the user's behalf either breaks the "backend never holds a user's signing key" rule or needs a custodial key we do not have.
3. **Recommended path:** USSD confirms *intent* out-of-band with a one-time code. The on-chain confirmation still happens from a wallet-capable client (the mobile app or web), and USSD only shortens the path for the buyer. See §5.

## 1. Current system facts (from the repo)

| Area | Fact | Source |
|---|---|---|
| Trade lifecycle | `CREATED → FUNDED → DELIVERED → COMPLETED`, with `DISPUTED` and `CANCELLED` branches | `docs/api/trades.md` |
| Transitions | Built server-side as unsigned XDR; caller signs and submits. Backend never holds user keys | `docs/api/trades.md` |
| Confirm delivery | `POST /trades/:id/confirm`, buyer only, trade must be `FUNDED` | `backend/src/routes/trade.routes.ts`, `docs/api/trades.md` |
| Release funds | `POST /trades/:id/release`, buyer or admin, trade must be `DELIVERED` | `docs/api/trades.md` |
| Auth | Stellar challenge/response, then JWT bearer | `docs/api/overview.md` |
| Phone numbers | Phone verification via OTP already exists. Phone is encrypted at rest (AES-256-GCM). OTP is HMAC-stored, 5-minute TTL, 5 attempts, rate limited per address | `backend/src/services/user.service.ts` |
| SMS | Generic provider via `SMS_PROVIDER_URL` / `SMS_PROVIDER_API_KEY`. No-op with a log when unset | `backend/src/services/user.service.ts` |
| PII | No plaintext phone column in the schema. Any new phone-bearing column must be added to the PII inventory | `docs/pii-encryption.md` |

Implication: the phone-to-wallet binding that USSD needs already exists (the OTP-verified user record), and the SMS path already exists too. We do not need to build phone identity from scratch.

## 2. Africa's Talking USSD (evaluation)

**Not verified in this spike.** The attempt to pull current AT documentation was denied. Items marked *to verify* must be checked against AT's live docs and a sandbox before the build phase.

What we need from a USSD provider:

- A shortcode (or USSD code) per target country, provisioned by the provider and the mobile network operator (MNO). This is the long pole, not the code.
- A callback model: the provider POSTs session data to our HTTPS endpoint for each user input, and we reply with the next menu text.
- Session semantics: the response prefix decides whether the session continues (`CON`) or ends (`END`). *To verify* the exact field names (`sessionId`, `phoneNumber`, `text`, `serviceCode`, `networkCode`) and the cumulative `text` format (inputs joined with `*`).
- Screen-size limit per response. *To verify* the number. Menus must be short.
- Session timeout set by the MNO. Assume short, so every screen must be fast and stateless-friendly.
- Sandbox for end-to-end tests without a live shortcode.
- Pricing per session and per SMS. *To verify*. Feed this into the pilot budget.

Options to compare before committing (not evaluated here):

| Option | Notes |
|---|---|
| Africa's Talking | Candidate. Covers multiple African markets. Verify country coverage for the pilot region, shortcode lead time, and per-session cost |
| Direct MNO shortcode | Lower per-session cost at scale, much longer procurement. Not a pilot option |
| Other aggregators | Not researched in this spike |

Pilot recommendation: pick one pilot country, get a sandbox and a test shortcode from the aggregator, and treat the callback as an ordinary HTTP endpoint behind the existing backend. Do not build a separate service.

## 3. Menu tree

Status and confirm only. Keep the tree shallow: target 3 levels, at most 4 inputs for any task.

```
Root: "Amana Trades"
├── 1. My trades
│     ├── Pick trade (paginate 3 per screen, 0 = next)
│     │     └── Trade detail: ID, status, amount in local currency, last update
│     │           0. Back
├── 2. Confirm delivery
│     ├── Pick a FUNDED trade where I am the buyer (paginate 3 per screen)
│     │     └── "Confirm delivery of trade <ID>? 1. Yes 2. No"
│     │           └── Yes → send one-time code by SMS → "Enter code"
│     │                 └── Code valid → record confirmation intent (see §5)
│     │                       → "Confirmed. Complete it in the Amana app to release funds."
│     └── 0. Back
├── 3. Help   (static text, fallback number)
└── 0. Exit   (END)
```

Rules:

- Every screen has `0. Back` where it makes sense. `0` is never a trade choice.
- Trade list shows only trades where the caller's phone maps to the buyer (for confirm) or buyer/seller (for status). Look up by the OTP-verified phone, not by anything the user types.
- Amounts are shown in local currency with the exchange rate timestamp, since USDC is not something a farmer thinks in. *Rate source to be decided.*
- Unknown input re-shows the current menu with a short error. It never ends the session silently.
- Session timeout mid-confirm: the code expires. Do not resume a half-finished confirm.

## 4. Security considerations for confirmations

Confirming delivery releases escrowed funds to the seller on the next step. A USSD confirm is the highest-risk path in this spike. Threats and controls:

| # | Threat | Control |
|---|---|---|
| S1 | SIM swap or stolen phone confirms a delivery it did not receive | Confirm must be bound to a second factor beyond the phone number. OTP-by-SMS alone is not enough for a fund-moving action. Require the OTP plus a recent-SIM-change check where the MNO exposes one. *Feasibility to verify with the aggregator.* |
| S2 | Caller spoofs phone number, or a shared device is used by someone else | Look up the buyer by the OTP-verified phone binding only. Reject confirm for numbers not bound to a buyer address. |
| S3 | Confirmation replay or double confirm | One active confirm intent per trade. Idempotency key derived from `tradeId + sessionId`. Intent expires with the OTP (5 min). |
| S4 | Brute force of the confirm code | Reuse existing OTP limits (5 attempts, rate limited). Lock the confirm intent after the attempt cap, not just the code. |
| S5 | USSD session data leaks to logs | Do not log `phoneNumber` or `text` in plaintext. Use the existing log redaction (`backend/src/lib/logRedaction.ts`). Phone must stay encrypted at rest. |
| S6 | Shoulder-surfing the OTP on a shared phone | Accept as residual. Show the OTP only via SMS, never in the USSD screen. |
| S7 | Buyer confirms, then disputes later, or seller claims buyer confirmed by phone | Confirm intent is an off-chain record that does not move funds. Funds move only after an on-chain confirm signed by the buyer's wallet. Gives a clean audit trail and keeps the dispute path open. |
| S8 | Fraudulent confirm to force release on a bad trade | Release still requires the trade to be `DELIVERED`. Disputes stay available. USSD does not bypass the mediator path. |
| S9 | USSD endpoint abused for enumeration of trades | Respond with the same generic "not found" for unknown and not-yours trade IDs. Rate limit per phone and per source IP. |

Threat-model update required before build: add USSD as a new entry point in `docs/threat-model.md`, and review it against `docs/threat-model-review-checklist.md`.

## 5. Recommendation for confirmation

Three options were considered:

| Option | Description | Verdict |
|---|---|---|
| A. Server signs on behalf of buyer | Backend holds a key or custodial signer, signs the confirm XDR when USSD + OTP succeed | **Reject.** Violates the no-user-keys rule. Creates a custody and key-management problem we have not designed for |
| B. USSD records intent, wallet completes on-chain | USSD + OTP records a confirm intent (off-chain). Buyer completes the on-chain confirm from the app/web wallet, which then unlocks release | **Recommend.** No new key custody. Fund movement still requires a wallet signature. Works with the existing unsigned-XDR model |
| C. Pre-signed confirm from SMS link | Buyer signs ahead of time, USSD triggers submission | **Reject for now.** Pre-signed transactions are high-risk to hold and easy to misuse. Revisit only with a formal design |

Option B details:

- New table or record: `DeliveryConfirmIntent` (tradeId, buyer address, phone-binding id, status, expiresAt, attempts). Store no plaintext phone.
- The release gate stays on-chain. An intent alone never changes trade status.
- The in-app confirm (existing `POST /trades/:id/confirm`) can auto-fill from a valid intent so the buyer taps once.
- If the buyer never completes the wallet step, the intent expires. The trade stays `FUNDED`.

This means the pilot delivers status checks fully over USSD, and "confirm" as a fast intent with a wallet step. A true zero-smartphone confirm needs a custody or pre-signed design and is out of scope for this spike.

## 6. Open questions for maintainers

1. Pilot country and aggregator. Which markets does the pilot target, and is Africa's Talking the chosen provider there?
2. Acceptability of option B. Does the product accept a two-step confirm (USSD intent, then wallet) for feature-phone users?
3. Where the feature-phone buyer completes the wallet step. Does the pilot have any non-smartphone wallet path, or does it depend on a helper (e.g. an agent) with a device?
4. Exchange rate source for showing local-currency amounts.
5. Budget for per-session and per-SMS cost.

## 7. Next steps (not in this spike)

1. Verify all *to verify* items against AT's live docs and sandbox.
2. Update `docs/threat-model.md` with USSD as an entry point.
3. Write the menu and callback contract as an ADR once §5 is accepted.
4. Build the status flow first (read-only), then the confirm intent.

## Acceptance

- [x] Africa's Talking USSD evaluated from repo context. Provider-specific details marked *to verify* because external lookup was not permitted in this run
- [x] Menu tree designed for status and confirm
- [x] Security considerations for confirmations documented, with a recommended option
- [ ] Threat model updated (follow-up)
- [ ] CI gates: this change is docs-only. No stack files changed, so path-aware gates skip per the README
