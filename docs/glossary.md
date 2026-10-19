# Glossary

Short definitions of the terms used across EziAgric (also called **Amana** in
older documents and in code). Each entry links to the page that explains it in
depth. Terms are grouped by topic and sorted alphabetically within each group.

- [Trades and money](#trades-and-money)
- [Delivery and evidence](#delivery-and-evidence)
- [Disputes](#disputes)
- [Accounts, wallets and the network](#accounts-wallets-and-the-network)
- [Contract administration and safety](#contract-administration-and-safety)
- [Engineering and operations](#engineering-and-operations)

---

## Trades and money
- **Basis points (bps)** — One hundredth of a percent: `10_000` bps = 100 %, `5_000` bps = 50 %, `100` bps = 1 %. The contract stores every ratio and fee in bps so that all payout maths is exact integer arithmetic. See [ADR-002](adr/ADR-002-escrow-loss-sharing-model.md).
- **Buyer / seller** — The two parties to a trade. The **seller** (usually a farmer or cooperative) lists produce and is paid on delivery. The **buyer** funds the trade up front and confirms delivery.
- **cNGN** — A Stellar stablecoin that tracks the Nigerian naira one-to-one. Trade funds are held in escrow as cNGN, so their value does not move with crypto prices while goods are in transit.
- **Escrow** — Money held by a neutral third party until agreed conditions are met. In EziAgric the escrow is the Soroban smart contract: it holds the buyer's deposit and only releases it on confirmed delivery or a dispute ruling. See the [contract overview](eziagric_contract_overview.md).
- **Loss ratio (`Loss_Ratio`)** — How the buyer and seller agree, when the trade is created, to share any loss if goods are damaged, lost or short-delivered — for example 50/50 or 70/30. Stored as `buyer_loss_bps` and `seller_loss_bps`, which must add up to `10_000`. It cannot be changed after the trade is created, and a mediator cannot change it either. See [ADR-002](adr/ADR-002-escrow-loss-sharing-model.md).
- **NGN** — The Nigerian naira, the local currency buyers pay in.
- **Partial delivery** — A delivery where only part of the goods arrive (for example 80 of 100 bags). The contract splits the escrow pro rata — the seller is paid for what arrived minus their loss share, the buyer is refunded the rest — once the seller accepts the split, or the trade goes to a dispute. See [settling a partial delivery](eziagric_contract_overview.md#settling-a-partial-delivery).
- **Path payment** — A Stellar payment that converts one asset into another on the way, in one step. It lets a buyer pay in naira while the contract receives cNGN. See [ADR-001](adr/ADR-001-stellar-path-payment-architecture.md).
- **Platform fee** — A fee taken when a trade settles — 1 % by default (`fee_bps = 100`), capped by the contract at 5 %. It is charged only on the amount paid to the seller, never on a refund to the buyer.
- **Settlement** — The final payout of a trade: the seller is paid, the buyer is refunded, or the escrow is split between them, and the platform fee goes to the treasury.
- **Stablecoin** — A token designed to keep a steady value against a normal currency (cNGN against the naira, USDC against the US dollar).
- **Stream (vested token stream)** — A payment released gradually over time instead of all at once. The **Streams** page in the web app is reserved for this feature, which is not live yet.
- **Trade** — One purchase agreement on EziAgric: buyer, seller, amount, loss ratio and delivery terms, recorded in the escrow contract.
- **Trade status** — Where a trade is in its life cycle. On-chain statuses are `Created` (agreed, not yet paid), `Funded` (buyer's money is in escrow), `Delivered` (delivery confirmed), `Completed` (settled), `Disputed` (a dispute is open) and `Cancelled`. See [event flow](event-flow.md).
- **Treasury** — The platform account that receives platform fees.
- **Vault** — The escrow vault — the contract-held balance where trade funds are locked while a trade is active. The **Vault** page in the web app shows that balance.

## Delivery and evidence
- **Attestation (driver attestation)** — The driver confirming a delivery by opening a signed link sent to their phone. A manifest the driver has attested carries much more weight in a dispute than one only the seller has filled in. See the [mediator handbook](mediator-handbook.md#delivery-manifests).
- **CID (content identifier)** — The fingerprint-style address of a file stored on IPFS. The contract stores the CID of each evidence video, so the file cannot be swapped later without the change being visible.
- **Driver** — The person who transports the goods. The seller enters the driver's details in the manifest; the driver can confirm the delivery through a link sent by SMS.
- **Evidence** — Videos, photos, manifests and documents uploaded to support a delivery or a dispute. Files are stored on IPFS; their CIDs are recorded on-chain.
- **IPFS** — A decentralised file-storage network. EziAgric stores delivery and dispute videos on IPFS through **Pinata**, a hosted IPFS service.
- **Manifest (vehicle / delivery manifest)** — The seller's dispatch record for a shipment: the driver's name and phone number, the vehicle, and what is being carried. It is the main evidence of what was sent.
- **Proof of Delivery (PoD, Proof-of-Delivery)** — A short video, recorded when goods arrive, that shows their condition. In a normal trade the buyer records it to confirm delivery; in a dispute it is the key evidence of loss or damage.
- **Terms hash** — A fingerprint of the listing terms (commodity, grade, quantity, price) saved when the trade is created. If the listing is edited later, the hash no longer matches, which proves the terms were changed.

## Disputes
- **Dispute** — A disagreement about a delivery — goods missing, damaged, late, short or wrong — raised from the trade page instead of confirming delivery. Funds stay locked until it is resolved.
- **Mediator** — A trained, neutral reviewer who looks at the evidence in a dispute and decides how much of the trade value the seller earned. See the [mediator handbook](mediator-handbook.md).
- **Mediator quorum** — For disputes above a set value, several mediators vote (each with a weight) instead of one mediator deciding alone, so the biggest trades get the strongest protection. See [mediator quorum](mediator-quorum.md).
- **`seller_gets_bps`** — The mediator's ruling: the share of the trade the seller earned, from `0` (full refund to the buyer) to `10_000` (seller paid in full). The contract applies the parties' loss ratio to the rest.

## Accounts, wallets and the network
- **Albedo / Freighter** — Stellar wallets that run in the browser. They hold your keys and ask you to approve every transaction.
- **Cooperative** — A group of farmers that trades together. In the pilot, cooperatives are onboarded as described in the [pilot onboarding checklist](pilot-onboarding.md).
- **Expo / React Native** — The framework used to build the EziAgric mobile app for Android and iOS from one codebase.
- **Next.js** — The web framework used for the EziAgric web app.
- **Soroban** — Stellar's smart-contract platform. The EziAgric escrow contract is written in Rust for Soroban.
- **Stellar** — The public blockchain network EziAgric runs on, chosen for low fees, fast settlement and built-in currency conversion.
- **Supabase** — The off-chain database used for profiles, listings, driver logs and other data that does not need to live on the blockchain. See [ADR-003](adr/ADR-003-offchain-vs-onchain-data-partitioning.md).
- **Trust score** — A reputation score for each wallet, built from its trading history (completed trades, disputes and how they ended). Shown on public profile pages.
- **Trustline** — A Stellar setting that lets a wallet hold a particular asset. A wallet needs a cNGN trustline before it can receive cNGN.
- **Wallet** — An app that holds a person's Stellar account keys. You sign every payment and confirmation with your wallet, so only you can move your funds.

## Contract administration and safety
- **Admin** — The account allowed to run privileged contract operations such as upgrades and clawback. Its powers are limited by the timelock.
- **Clawback** — An emergency admin operation that recovers funds held by the contract, for example after a security incident. It always goes through the timelock. See the [clawback specification](admin_clawback_function.md) and [CLI](cli-clawback.md).
- **Guardian** — A trusted account registered on the contract. Guardians can pause the contract in an emergency and review queued admin operations during the timelock window.
- **Pause** — An emergency switch that halts all state-changing contract operations while an incident is investigated. Only a guardian can pause the contract.
- **Timelock** — A mandatory waiting period before a privileged operation (clawback, contract upgrade) can run, so a stolen admin key cannot drain funds instantly. See the [timelock policy](TIMELOCK_POLICY.md).
- **WASM** — The compiled form of the smart contract that is deployed to Stellar. CI checks its size and that a clean rebuild produces the same **sha256** hash (a fingerprint of the file), so the deployed code can be verified.

## Engineering and operations
- **ADR (Architecture Decision Record)** — A short document recording an important design decision and why it was made. See [`docs/adr/`](adr/).
- **Alert routing (page vs ticket)** — The rules deciding whether an alert wakes someone up immediately (**page**) or becomes a ticket to handle in working hours. See the [alert routing policy](alert-routing-policy.md).
- **Branch protection** — GitHub settings on `main` that block merging until the required CI gates pass.
- **CI gate (required gate)** — An automated check that must pass before a pull request can merge. See *Required PR CI Gates* in the [README](../README.md#-required-pr-ci-gates).
- **Conventional Commits** — The commit and PR-title format (`type(scope): description`) used to generate release notes. See [CONTRIBUTING](../CONTRIBUTING.md#commits-and-pr-titles).
- **Correlation ID** — An identifier attached to a request and carried through every service it touches, so one user action can be traced end to end.
- **Golden signals** — The four core health measures of a service — latency, traffic, errors and saturation. See [dashboards](dashboards.md).
- **Grafana** — The dashboard tool that displays the golden signals; its dashboards are stored as code in `infra/grafana/`.
- **Jaeger / Zipkin / Prometheus** — Observability tools: Jaeger and Zipkin show request traces; Prometheus collects metrics.
- **OpenTelemetry** — The standard used to collect traces and metrics from the backend.
- **Path-aware CI** — CI only runs the checks for the parts of the repository a pull request changed; a stack with no changes reports a skip and passes.
- **PII (personally identifiable information)** — Data that identifies a person, such as names and phone numbers. PII is encrypted at rest with **envelope encryption** (each value is encrypted with a data key, which is itself encrypted with a master key), and searched through a **blind index** (a keyed hash that allows exact-match lookups without decrypting). See [PII encryption](pii-encryption.md).
- **Postmortem** — A blameless write-up after an incident: what happened, why, and what will change. See the [postmortem archive](postmortems/README.md).
- **Preview environment** — A temporary copy of the backend started for a single pull request so it can be tested, then removed. See [preview environments](preview-environments.md).
- **RTO (recovery time objective)** — The target time to restore service after a failure, measured in the backup restore drills.
- **Runbook** — Step-by-step instructions for handling an operational task or incident. See [`docs/runbooks/`](runbooks/).
- **SBOM (software bill of materials)** — A list of every dependency in a release, used to check for known vulnerabilities. EziAgric generates it in the **CycloneDX** format for every release. See [SBOM](sbom.md).
- **Secrets rotation** — Replacing passwords and API keys on a schedule so a leaked secret stops working. See the [secrets policy](secrets-policy.md).
- **SLO (service level objective)** — A reliability target, such as the share of requests that must succeed. See [SLO](slo.md).
- **Synthetic probe** — An automated test that runs the core escrow journey against staging every hour and alerts on failure. See the [synthetic probes policy](synthetic-probes-policy.md).
- **Tabletop exercise** — A practice run of an incident, talked through by the team without touching real systems. See the [escrow-drain tabletop exercise](runbooks/tabletop-exercise-escrow-drain.md).
- **Threat model** — The document listing what could attack or break the system and how each risk is handled. See the [threat model](threat-model.md).
