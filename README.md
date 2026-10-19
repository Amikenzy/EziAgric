# 🌾 EziAgric: Trust as a Service for Agricultural Products

![Stellar](https://img.shields.io/badge/Network-Stellar-black?style=for-the-badge&logo=stellar)
![Soroban](<https://img.shields.io/badge/Contracts-Soroban%20(Rust)-orange?style=for-the-badge>)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**EziAgric** is a decentralized escrow protocol designed to secure agricultural trade across different regions. By leveraging **Soroban Smart Contracts**, Amana eliminates the "Trust Gap" between buyers and sellers, ensuring fair trade even when parties are hundreds of miles apart.

This is the main repository containing the smart contracts and orchestration logic. Backend, frontend, and mobile applications are maintained in this monorepo for simpler development and unified deployment.

> 📖 New to terms like loss ratio, bps, PoD, manifest, vault or clawback? See the [glossary](./docs/glossary.md).

---

## 📁 Repository Layout

The root of this repository is intentionally small. Each top-level entry has a single, clear purpose:

- `frontend/` → Next.js app (UI + wallet + Supabase/Pinata client integration)
- `backend/` → Node.js/TypeScript API (Supabase + Pinata + integration endpoints)
- `mobile/` → React Native Expo app (mobile wallet, notification, and trade UX)
- `contracts/` → Rust/Soroban smart contracts
- `docs/` → Current project documentation (ADRs, threat model, policies, guides)
- `docs/archive/` → **Historical** completion summaries and hardening PR notes, kept for reference only. See [`docs/archive/README.md`](./docs/archive/README.md).
- `.github/` → CI workflows and repository automation

> The former top-level `archive/` directory has been folded into `docs/` and `docs/archive/`. Nothing at the repository root is historical — if you are looking for old completion summaries or hardening notes, they now live under `docs/archive/`.

---

## 🚀 The Mission

To provide a programmable safety net for regional commodity trading. Amana ensures that the risk of "sending first" is eliminated, replaced by a secure, neutral vault that only releases funds when delivery is verified.

## 🛠 Features

- **Smart Escrow:** Secure funds holding using cNGN/stablecoins on the Stellar network.
- **Dynamic Loss Sharing:** Negotiable risk-sharing ratios (e.g., 50/50, 70/30) hardcoded into every trade to handle transit accidents or theft.
- **Proof-of-Delivery (PoD):** An optional video-based verification protocol involving the buyer and the driver to confirm the state of goods. Video evidence can be submitted and stored on IPFS for dispute resolution.
- **Volatility Protection:** Utilizes Stellar Path Payments to allow users to pay in local currency (NGN) while locking value in cNGN.
- **Automated Settlement:** A flat 1% platform fee is automatically deducted upon successful trade completion.

## 🏗 Technical Stack

- **Frontend:** [Next.js](https://nextjs.org/) (App Router)
- **Smart Contracts:** [Soroban](https://soroban.stellar.org/) (Rust)
- **Blockchain:** [Stellar Network](https://www.stellar.org/)
- **Wallet Connection:** [Freighter](https://www.freighter.app/) / [Albedo](https://albedo.link/)
- **Storage:** IPFS (via Pinata) for decentralized storage of video evidence.
- **Database:** Supabase (Off-chain metadata, driver logs, and user profiles).
- **Observability:** OpenTelemetry distributed tracing with correlation IDs for end-to-end request tracking.

## 🧪 Local Environments (Folder-Based)

- `frontend/` → Next.js app environment (UI + wallet + Supabase/Pinata client integration)
- `backend/` → Node.js/TypeScript API environment (Supabase + Pinata + integration endpoints)
- `mobile/` → React Native Expo environment (mobile wallet, notification, and trade UX)
- `contracts/` → Rust/Soroban smart contract environment

### Step 0: environment doctor

Run `scripts/dev-doctor.sh` from the repo root. It checks every toolchain (node, npm, docker,
cargo, wasm32 target, stellar CLI), prints the exact install command for anything missing, and
finishes with one smoke test per stack. Hit something it didn't catch? Open an
**Onboarding friction** issue.

Setup failing? See [Troubleshooting local setup](docs/troubleshooting-local-setup.md) for fixes to common problems.

### Frontend setup

1. `cd frontend`
2. `cp .env.example .env.local`
3. `npm install`
4. `npm run dev`

### Backend setup

1. `cd backend`
2. `cp .env.example .env`
3. `cp .env.tracing.example .env.tracing` (for distributed tracing configuration)
4. `npm install`
5. `npm run dev`

### Mobile setup

1. `cd mobile`
2. `cp .env.example .env.local`
3. `npm install`
4. `npm start`

### Backend API docs

- Source of truth: `backend/src/docs/openapi.yaml`
- Dev Swagger UI: `http://localhost:4000/api/docs`
- JSON export: `http://localhost:4000/api/docs/openapi.json`

The backend writes `backend/src/docs/openapi.json` from the YAML spec in non-production runs so reviewers can inspect either format.

### Contracts setup

1. `cd contracts/amana_escrow`
2. `cargo build`

## 🧭 Architecture

The system context and the trade lifecycle are diagrams-as-code under
[`docs/architecture`](docs/architecture/README.md): Mermaid sources committed
next to their rendered previews, and checked in CI for any `docs/**` change.

[![System context](docs/architecture/rendered/system-context.svg)](docs/architecture/system-context.md)

[![Trade lifecycle](docs/architecture/rendered/trade-lifecycle.svg)](docs/architecture/sequences/trade-lifecycle.md)

If a change adds or removes a component, changes who may call an entry point, or
changes the order of messages that settle a trade, update the relevant diagram in
the same pull request — see
[what counts as arch-affecting](docs/architecture/README.md#what-counts-as-arch-affecting).

## 🔒 Required PR CI Gates

Amana enforces stack-level CI gates on pull requests through `.github/workflows/ci.yml`.

- **Frontend Required Gate**: `npm ci`, `npm run lint`, `npm run build`, `npm test` in `frontend/`
- **Backend Required Gate**: `npm ci`, `npm run build`, `npm test` in `backend/`
- **Mobile Required Gate**: `npm ci`, `npm run type-check`, `npm run lint` in `mobile/`
- **Contracts Required Gate**: `cargo test` in `contracts/amana_escrow/`
  - Also builds the optimized WASM, posts its size and sha256 to the job summary, fails if it exceeds the size budget (`WASM_SIZE_BUDGET_BYTES`), and verifies a clean rebuild produces the same sha256
- **Conventional PR Title**: PR titles must follow Conventional Commits (`.github/workflows/pr-title.yml`); see [CONTRIBUTING.md](CONTRIBUTING.md#commits-and-pr-titles)

Path-aware execution is enabled to avoid unnecessary runtime. If a stack has no changed files, the gate reports a skip-note and passes.

### Branch protection setup (GitHub)

For the protected branch (`main`), set these required status checks:

- `Frontend Required Gate`
- `Backend Required Gate`
- `Mobile Required Gate`
- `Contracts Required Gate`

---

## 🔄 How It Works (The Amana Flow)

1. **Initiate:** The Seller lists products. The Buyer initiates a trade, depositing funds that are converted to cNGN via a Stellar Path Payment.
2. **Lock:** The Smart Contract locks the funds and stores the agreed-upon `Loss_Ratio`.
3. **Dispatch:** The Seller provides the driver's name, phone number, and vehicle manifest.
4. **Verification:** - **Success:** Buyer receives goods and uploads a confirmation video. Funds release to Seller.
   - **Dispute:** Buyer uploads a video of loss/damage with driver affirmation. A mediator reviews the evidence.
5. **Settlement:** Based on the outcome, funds are distributed (either 100% to one party or split via the `Loss_Ratio`).

### Happy Path Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Buyer
    actor Seller
    actor Driver
    participant Backend
    participant Contract as Soroban Contract
    participant IPFS

    Buyer->>Backend: POST /trades (create trade intent)
    Backend->>Contract: invoke create_trade(buyer, seller, amount, ratio)
    Contract-->>Backend: TradeCreated event (trade_id)
    Backend-->>Buyer: 201 { tradeId }

    Buyer->>Contract: invoke fund_trade(trade_id, cNGN amount)
    Contract-->>Backend: TradeFunded event
    Backend-->>Seller: push notification — trade funded, prepare shipment

    Seller->>Driver: hand over goods
    Driver->>Backend: POST /trades/:id/delivery (driver confirms delivery)
    Driver->>IPFS: upload delivery video evidence
    IPFS-->>Driver: CID
    Driver->>Backend: POST /trades/:id/evidence { cid }
    Backend->>Contract: invoke submit_evidence(trade_id, cid)
    Contract-->>Backend: EvidenceSubmitted event

    Buyer->>Backend: POST /trades/:id/confirm (buyer confirms receipt)
    Backend->>Contract: invoke confirm_delivery(trade_id)
    Contract-->>Backend: TradeCompleted event
    Contract->>Seller: release funds (minus 1% platform fee)
```

### Dispute Path Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Buyer
    actor Seller
    actor Driver
    participant Backend
    participant Contract as Soroban Contract
    participant IPFS

    Note over Buyer,Contract: Trade is in Funded state

    Buyer->>Backend: POST /trades/:id/dispute (buyer raises dispute)
    Backend->>Contract: invoke raise_dispute(trade_id, reason)
    Contract-->>Backend: DisputeRaised event

    Seller->>IPFS: upload counter-evidence
    IPFS-->>Seller: CID
    Seller->>Backend: POST /trades/:id/evidence { cid, party: "seller" }

    Driver->>IPFS: upload delivery confirmation
    IPFS-->>Driver: CID
    Driver->>Backend: POST /trades/:id/evidence { cid, party: "driver" }

    Note over Backend,Contract: Mediator quorum reviews evidence

    Backend->>Contract: invoke resolve_dispute(trade_id, verdict, loss_ratio)
    Contract-->>Backend: DisputeResolved event

    alt Verdict: buyer wins
        Contract->>Buyer: refund per loss-sharing ratio
        Contract->>Seller: partial payment
    else Verdict: seller wins
        Contract->>Seller: full payment (minus 1% fee)
    end
```

> Full diagrams with all events and edge cases are in [`docs/event-flow.md`](docs/event-flow.md).

---

## 🗺 Roadmap

### Phase 1: The Vault (MVP)

- [x] Develop core Soroban contract logic (`deposit`, `release`, `refund`).
- [x] Implement basic Next.js UI for trade creation.

### Phase 2: The Agreement Engine

- [x] Integrate `Loss_Ratio` variables into the smart contract.
- [x] Build the "Mediator" dashboard for dispute resolution.

### Phase 3: Evidence & Logistics

- [x] IPFS integration for video evidence uploads.
- [x] Driver manifest logging and tracking interface.

### Phase 4: Mainnet & Scale

- [ ] Public pilot program with regional agricultural cooperatives. See the [pilot onboarding checklist and tracker](docs/pilot-onboarding.md).
- [x] Implementation of a "Trust Score" reputation system.

---

## 🔍 Distributed Tracing

Amana includes comprehensive distributed tracing with OpenTelemetry for end-to-end request visibility and faster incident triage.

### Features

- **Correlation IDs**: Unique identifiers spanning frontend-backend requests
- **Request Tracing**: Complete request lifecycle tracking
- **Service Integration**: Automatic tracing for external services (IPFS, Stellar)
- **Observability**: Jaeger, Zipkin, and Prometheus integration

### Quick Start

1. Configure tracing environment variables (see `backend/.env.tracing.example`)
2. Start Jaeger for trace visualization: `docker run -p 16686:16686 jaegertracing/all-in-one`
3. View traces at `http://localhost:16686`
4. Check metrics at `http://localhost:9464/metrics`

### Documentation

See [DISTRIBUTED_TRACING_GUIDE.md](./DISTRIBUTED_TRACING_GUIDE.md) for detailed setup and usage instructions.

---

## 📐 Architecture Decision Records

Key architectural decisions are documented as ADRs in [`docs/adr/`](./docs/adr). Each ADR follows the standard template and status lifecycle (proposed → accepted → superseded).

- [ADR-001: Stellar Path Payment Architecture](./docs/adr/ADR-001-stellar-path-payment-architecture.md)
- [ADR-002: Escrow Loss-Sharing Model](./docs/adr/ADR-002-escrow-loss-sharing-model.md)
- [ADR-003: Off-chain vs. On-chain Data Partitioning](./docs/adr/ADR-003-offchain-vs-onchain-data-partitioning.md)
- [ADR-004: Idempotency and Retry Strategy](./docs/adr/ADR-004-idempotency-and-retry-strategy.md)
- [ADR-005: Frontend State Management](./docs/adr/ADR-005-frontend-state-management.md)
- [ADR-006: Mobile Navigation and State Architecture](./docs/adr/ADR-006-mobile-navigation-and-state-architecture.md)
- [ADR-007: Offline Caching and Conflict Resolution](./docs/adr/ADR-007-offline-caching-and-conflict-resolution.md)
- [ADR-008: Notification and Deep-Link Architecture](./docs/adr/ADR-008-notification-and-deep-link-architecture.md)

## 🔐 Security & Operations

- [Threat Model](./docs/threat-model.md) — reviewed quarterly and on trigger events; see §8 for cadence/ownership and `docs/threat-model-review-checklist.md` for the reviewer checklist.
- [Secrets Policy & Rotation](./docs/secrets-policy.md) — secrets inventory (owner, location, max-age), rotation automation, and verification. Rotation reminders are opened automatically by [`.github/workflows/secrets-rotation-reminder.yml`](./.github/workflows/secrets-rotation-reminder.yml).
- [PII Encryption at Rest](./docs/pii-encryption.md) — classified PII column inventory, app-layer envelope encryption design, blind-index search, key rotation procedure, and decrypt access logging.
- [Software Bill of Materials (SBOM)](./docs/sbom.md) — CycloneDX SBOM generated for every release artifact via [`.github/workflows/sbom.yml`](./.github/workflows/sbom.yml), attached to GitHub Releases, with a weekly vulnerability diff scan.
- [Golden Signals Dashboard](./docs/dashboards.md) — Grafana dashboard stored as code ([`infra/grafana/`](./infra/grafana)) covering API latency/traffic/errors and DB/queue saturation, with deploy annotations wired into staging deploys.
- [Alert Routing Policy](./docs/alert-routing-policy.md) — page-vs-ticket severity rubric, runbook linkage enforced in CI, per-alert dedup windows, and the [monthly alert review log](./docs/alert-review-log.md).
- [Synthetic Probes Policy](./docs/synthetic-probes-policy.md) — hourly staging probe of the core escrow journey (auth → create → deposit → release), with failure alerting and a results dashboard log.
- [Preview Environments](./docs/preview-environments.md) — per-PR ephemeral backend stack (compose `preview` profile) spun up by the `preview` label workflow, smoke-tested and torn down under TTL/concurrency budget caps.
- [Backup Freshness & Restore Drills](./docs/runbooks/backup-restore-drill.md) — weekly freshness gate that pages `backup_stale` on a missing/stale daily backup, plus a quarterly automated restore drill (integrity assertions, app smoke on the restored copy, RTO history under `backup-drills/`).
- [Incident Response](./docs/runbooks/incident-response.md) — severity levels, incident roles, and channel/ticket conventions; see the [postmortem template](./docs/runbooks/postmortem-template.md), the [postmortem archive](./docs/postmortems/README.md), and a worked [tabletop exercise](./docs/runbooks/tabletop-exercise-escrow-drain.md).

## 🤝 Contributing

EziAgric is an open-source project aimed at improving food security and trade efficiency. We welcome developers, designers, and agricultural experts!

1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/NewFeature`).
3. Commit your Changes (`git commit -m 'Add NewFeature'`).
4. Push to the Branch (`git push origin feature/NewFeature`).
5. Open a Pull Request.

### Admin route development

If you are adding or modifying admin routes, see the
[Admin Route Contribution Guide](./docs/admin-route-contribution-guide.md)
for architecture details, middleware requirements, testing expectations, and a
step-by-step example.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## Handsoff notes

<!-- handsoff-issue-373 -->
- #373: [Backend] SMS notification provider abstraction (Termii / Africa's Talking)

<!-- handsoff-issue-409 -->
- #409: [Frontend] NGN payment quote display in trade funding step

<!-- handsoff-issue-410 -->
- #410: [Frontend] Trade timeline component on trade detail page
<!-- handsoff-issue-408 -->
- #408: [Frontend] Loss-ratio negotiation UI with visual risk explainer
<!-- handsoff-issue-404 -->
- #404: [Frontend] Marketplace page: browse and search listings
<!-- handsoff-issue-398 -->
- #398: [Backend] OpenAPI coverage check for non-admin routes
<!-- handsoff-issue-416 -->
- #416: [Frontend] Landing page copy: explain EziAgric flow for farmers and buyers

<!-- handsoff-issue-418 -->
- #418: [Frontend] Low-bandwidth mode: disable autoplay media and compress images
<!-- handsoff-issue-412 -->
- #412: [Frontend] Mediator dispute review: side-by-side evidence viewer
<!-- handsoff-issue-389 -->
- #389: [Backend] Indicative commodity price feed (off-chain) for listings
<!-- handsoff-issue-354 -->
- #354: [Contract] Milestone-based release for multi-drop deliveries

<!-- handsoff-issue-356 -->
- #356: [Contract] Per-token minimum trade amount to prevent dust trades

<!-- handsoff-issue-357 -->
- #357: [Contract] Mediator fee share on resolved disputes

<!-- handsoff-issue-358 -->
- #358: [Contract] Dispute evidence submission deadline
<!-- handsoff-issue-367 -->
- #367: [Backend] Product listing model and CRUD API for sellers
<!-- handsoff-issue-359 -->
- #359: [Contract] Default-resolution fallback when no mediator acts

<!-- handsoff-issue-360 -->
- #360: [Contract] Rustdoc for every public contract entrypoint
<!-- handsoff-issue-363 -->
- #363: [Contract] Add `get_trades_by_party` index with pagination

<!-- handsoff-issue-364 -->
- #364: [Contract] Reject self-trades where buyer == seller
<!-- handsoff-issue-426 -->
- #426: [Frontend] Price reference widget on listing form
