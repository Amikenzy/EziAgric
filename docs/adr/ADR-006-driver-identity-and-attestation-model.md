# ADR-006: Driver Identity and Attestation Model

## Status

Accepted (implemented in delivery manifest submission flow, referenced in
mediator handbook for evidence evaluation).

## Context

When a seller delivers goods to the buyer, a third party - the driver - is
often involved. The delivery manifest must record the driver's identity to
establish who actually transported the goods, which is critical for:

1. **Dispute resolution:** If goods arrive damaged or short, the mediator
   needs to know whether the driver is a trusted third-party carrier or an
   ad-hoc individual hired by the seller.
2. **Fraud prevention:** A seller could falsely claim delivery by
   fabricating driver details. The system needs a way to distinguish
   verifiable drivers from unattributed claims.
3. **Privacy:** Driver identity often includes sensitive PII (driver's
   license number, phone number, vehicle registration) that shouldn't be
   exposed to all trade participants unnecessarily.

We had three options for modeling driver identity:

1. **Wallet-based attestation:** Require drivers to have Stellar accounts
   and sign delivery manifests with their private keys, making driver
   identity cryptographically verifiable on-chain.
2. **Signed link (off-chain signature):** Sellers provide a driver
   identity string (license number, name, etc.) that drivers confirm by
   clicking a unique link and signing a challenge off-chain (similar to
   email verification).
3. **Unverified self-report:** Sellers provide driver identity as free
   text with no verification - the manifest simply records what the seller
   claims, and mediators evaluate credibility case-by-case.

The core tension: wallet-based attestation provides the strongest
cryptographic proof but requires drivers to onboard to Stellar (high
friction for one-time deliveries). Signed link is lower friction but still
requires driver participation (they must click the link and sign).
Unverified self-report has zero driver friction but provides no assurance
that the named driver actually made the delivery.

## Decision

**Driver identity is recorded as an unverified string in the delivery
manifest, with optional off-chain attestation via signed link. Wallet-based
on-chain attestation is not required.**

### Delivery Manifest Driver Fields

The `DeliveryManifest` record includes:

- `driverIdentity: string` - Free text provided by the seller (e.g.,
  "John Kamau, DL-123456789").
- `driverIdentityHash: string` - SHA-256 hash of `driverIdentity`,
  exposed to buyers/mediators to confirm the seller isn't retroactively
  editing the identity after a dispute.
- `driverAttestationStatus: enum` - One of:
  - `unverified` - Seller-provided identity with no driver confirmation
    (default).
  - `link_sent` - Backend sent an attestation link to the driver's
    contact (phone/email provided by seller).
  - `link_clicked` - Driver clicked the link but hasn't signed yet.
  - `attested` - Driver signed the attestation challenge, proving they
    received notice of the delivery claim.
- `driverAttestationSignedAt: DateTime?` - Timestamp when the driver
  completed attestation (null if `unverified` or `link_sent`).

### Attestation Flow (Optional)

1. **Seller submits manifest** with `driverIdentity` and optionally
   `driverContact: { phone?, email? }`.
2. **Backend generates attestation link** and sends it via SMS/email if
   `driverContact` is provided. The link contains a unique token tied to
   the manifest.
3. **Driver clicks link** (no wallet required). The link presents:
   - Trade summary (commodity, quantity, delivery location).
   - Statement: "I confirm that I delivered [quantity] [commodity] to
     [location] on [date] as part of trade [tradeId]."
   - Button: "Confirm Delivery."
4. **Driver signs challenge** (off-chain, using a lightweight signature
   scheme or magic link). Backend verifies signature and updates
   `driverAttestationStatus = attested`.
5. **Mediators see attestation status** in the manifest view. An
   `attested` manifest carries more weight than `unverified` during
   dispute evaluation.

### Why Not Wallet-Based Attestation?

**Rejected because of onboarding friction.** Most drivers in agricultural
supply chains don't have Stellar wallets, and requiring them to create
accounts, fund XLM, and sign transactions on-chain adds unacceptable
friction for a one-time delivery. The attestation link flow (phone/email +
lightweight signature) provides meaningful verification with near-zero
driver setup.

### Why Allow Unverified?

Many trades won't use attestation at all - the seller and buyer know each
other, or the seller self-delivers (no third-party driver). Forcing
attestation for every manifest would block legitimate trades. Instead, the
system makes attestation **optional but incentivized**: mediators are
trained (see mediator handbook) to weigh unverified manifests more
skeptically during disputes.

## Consequences

### Positive

- **Low friction:** Sellers can submit manifests immediately without
  waiting for driver cooperation. Drivers who don't have phones, wallets,
  or technical literacy can still be named (even if unverified).
- **Privacy-preserving:** The buyer sees only `driverIdentityHash` unless
  a dispute is raised, at which point the mediator (not the buyer) sees
  the full `driverIdentity` string. This prevents buyers from harvesting
  driver PII from every trade.
- **Flexible trust model:** High-value trades or repeat sellers can opt
  into attestation for stronger credibility. Low-value or informal trades
  can skip it without being blocked.
- **Fraud-resistant hashing:** The hash prevents the seller from editing
  driver identity after a dispute is raised ("I said it was John Kamau,
  but now the manifest says Jane Wanjiku"). The original claim is
  tamper-evident.

### Negative

- **Attestation is not proof of delivery quality:** Even if a driver
  confirms they made a delivery, that doesn't prove the goods were in
  acceptable condition. Mediators still need to evaluate evidence (photos,
  buyer statement) to resolve quality disputes. Attestation only confirms
  "the driver acknowledges involvement," not "the delivery was correct."
- **Unverified manifests are weak evidence:** In a dispute where the buyer
  claims "no delivery" and the seller provides an unverified manifest with
  a name the buyer doesn't recognize, the mediator has little to work
  with. The system can't force attestation retroactively, so the dispute
  may default to buyer-favored without additional evidence.
- **Driver contact abuse risk:** If a seller provides a fake phone number
  or email for `driverContact`, the attestation link goes nowhere, and the
  manifest remains `link_sent` forever. The system doesn't penalize this
  (it's indistinguishable from a driver ignoring the link), but repeated
  `link_sent` manifests from the same seller could be a red flag for fraud
  monitoring.
- **Off-chain signature is not blockchain-verifiable:** The attestation
  signature is stored in the backend database, not on-chain. An auditor
  can't verify attestations against the Stellar ledger - they must trust
  the backend's record. This is acceptable because attestation is a
  credibility signal, not a fund-movement condition (the contract never
  checks attestation status).

## Alternatives Considered

### Wallet-based on-chain attestation

**Rejected.** Drivers would need Stellar accounts, XLM for fees, and
Freighter/Albedo to sign transactions. For a rural agricultural driver
making a single delivery, this is unrealistic. The operational burden
(support requests, failed signatures, abandoned deliveries because the
driver couldn't sign) outweighs the cryptographic benefit.

### No driver identity at all

**Rejected.** Mediators need to know *who* delivered the goods to evaluate
disputes. If a seller claims "I hired a driver" but provides no name,
license, or contact, the mediator has no way to distinguish legitimate
deliveries from fabricated ones. Even an unverified identity string is
better than nothing.

### Trusted third-party logistics (3PL) integration

**Considered but deferred.** In the future, integration with established
logistics providers (e.g., Sendy, Uber Freight) could automatically
attest deliveries via API. The driver identity would be the 3PL's driver
ID, and attestation would be automatic. This is not implemented in the
current version but aligns with the optional attestation model - 3PL
deliveries would be marked `attested` via API callback.

## Related Decisions

- **ADR-002 (Escrow Loss Sharing Model):** Mediators use driver
  attestation status as one factor when determining `seller_gets_bps` in
  disputes. Attested manifests favor the seller; unverified manifests
  favor the buyer, all else equal.
- **Mediator handbook (docs/mediator-handbook.md):** Standardized
  evaluation criteria for driver attestation evidence, including how to
  weigh `attested` vs. `unverified` and what to do when attestation links
  are ignored.
- **PII encryption (docs/pii-encryption.md):** `driverIdentity` strings
  are encrypted at rest in Postgres. Hashes are not encrypted (they're
  meant to be publicly verifiable). Mediators decrypt `driverIdentity` only
  when reviewing a dispute.

## References

- Delivery manifest API: [docs/api/trades.md](../api/trades.md#manifest)
- Mediator evaluation workflow: [docs/mediator-handbook.md](../mediator-handbook.md)
- Backend manifest schema: `backend/prisma/schema.prisma` (`DeliveryManifest` model)
