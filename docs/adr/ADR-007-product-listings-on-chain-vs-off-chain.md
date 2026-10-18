# ADR-007: Product Listings On-Chain vs. Off-Chain

## Status

Accepted (references ADR-003 for the broader data partitioning strategy
and extends that decision to specifically address *why* commodity listing
content lives off-chain with only a hash commitment on-chain).

## Context

When a trade is created in the Amana escrow system, it must reference a
commodity listing that describes what is being bought and sold (commodity
name, grade, quantity, unit, delivery location, quality standards, etc.).
This listing is the foundation for buyer/seller expectations and mediator
evaluation if a dispute arises.

We had three options for where to store this listing data:

1. **Fully on-chain:** Store the entire listing as Soroban contract
   storage (multiple fields: `commodity`, `grade`, `quantity`, `unit`, etc.).
2. **Hybrid with hash commitment:** Store the listing off-chain (Postgres)
   but commit to it on-chain using a cryptographic hash (`terms_hash`)
   at trade creation.
3. **Fully off-chain:** Store the listing in Postgres with no on-chain
   reference at all, trusting the backend to never alter it after trade
   creation.

The core tension: on-chain storage provides verifiability and
immutability, but Soroban storage is expensive and makes the listing text
unqueryable for UX features like "search all listings for wheat" or
"filter by delivery region." Off-chain storage enables fast queries and
human-readable presentation, but opens the risk that a listing could be
edited after a trade starts, changing the terms retroactively.

## Decision

**Product listings live entirely off-chain (Postgres `CommodityListing`
table), with a `terms_hash` commitment anchored on-chain at trade
creation time.**

The `terms_hash` field in the Soroban contract's `create_trade` function
accepts an optional `BytesN<32>` SHA-256 hash of the canonical JSON
representation of the listing (see ADR-003 for the canonical format). Once
stored on-chain, the hash is immutable - the contract never updates it,
and `TradeCreatedEvent` emits it for indexing/auditing.

### What lives on-chain

- `terms_hash: Option<BytesN<32>>` in the contract's `Trade` struct
- The hash is computed from a canonical JSON object with exactly these
  keys in this order:
  ```json
  {"commodity":"<string>","grade":"<string>","quantity":"<string>","unit":"<string>"}
  ```
- The hash is **not** the listing content itself - the contract never sees
  the actual commodity name or grade text, only the 32-byte commitment.

### What lives off-chain

- All listing fields: `commodity`, `grade`, `quantity`, `unit`, delivery
  location, quality standards, expiry date, merchant ID, creation
  timestamp, listing status, etc.
- The backend computes `terms_hash` from its listing record immediately
  before calling `create_trade`, ensuring the hash always reflects the
  *current* listing state at trade creation.
- Listing records remain queryable via `GET /listings`, filterable,
  paginate-able, and join-able to merchant/trade data for UX features.

### Verification workflow

When a dispute arises:

1. The mediator retrieves the trade's `terms_hash` from the contract (via
   `GET /contract/:contractId/state?tradeId=<id>`).
2. The mediator retrieves the off-chain listing from
   `GET /listings/:listingId`.
3. The mediator (or an automated verification tool) re-computes the hash
   using the canonical JSON rules and compares it to the on-chain value.
4. If the hashes match, the listing is proven unaltered since trade
   creation. If they don't match, the listing was tampered with and the
   dispute escalates to an integrity violation.

### Optional hash

`terms_hash` is **optional** (`Option<BytesN<32>>`) because:

- Legacy trades created before this field existed have no commitment - the
  contract stores `None` and `TradeCreatedEvent` omits the field.
- Trades created without a formal listing (e.g., a custom/one-off trade
  negotiated outside the platform) can still use the escrow contract
  without requiring a listing record.

When `terms_hash` is `None`, the backend treats the trade as having no
verifiable listing commitment, and dispute resolution must rely on
external evidence (manifest, delivery photos, etc.) rather than the
listing itself.

## Consequences

### Positive

- **Fast queries:** Listing searches, filters, and pagination remain
  Postgres queries, not expensive RPC calls scanning contract storage.
  `GET /listings?commodity=wheat&region=midwest` is instant.
- **Human-readable UX:** The frontend displays full listing details
  (commodity name, grade, delivery location, quality standards) from the
  backend's API without parsing on-chain data or dealing with byte limits.
- **Tamper-evident without on-chain bloat:** The on-chain hash proves the
  listing hasn't changed since trade creation, but the contract never pays
  storage costs for the full text. A dispute can verify listing integrity
  by re-computing the hash, and a tampered listing is immediately
  detectable.
- **Queryable history:** Off-chain listings can be versioned, archived, or
  soft-deleted for compliance/audit without requiring contract upgrades or
  migration.

### Negative

- **Hash verification is manual (or scripted):** The contract itself
  doesn't enforce that `terms_hash` matches any particular listing - it
  only stores the hash clients provide. If the backend computes the hash
  incorrectly or a client submits a bogus hash, the contract won't reject
  it. Verification is a post-hoc audit step, not automatic contract
  enforcement.
- **Listing data is not trust-minimized:** Unlike the trade amount and
  status, the listing content is in a database the backend operator
  controls. A malicious operator could alter the listing record *before*
  computing the hash and calling `create_trade`, and the hash would
  reflect the altered version. The hash only protects against *after-trade*
  tampering, not pre-trade manipulation.
- **Canonical JSON is part of the public API:** Any external verifier
  (mediator, auditor, buyer/seller) must use the exact canonical JSON
  format (key order, no whitespace, decimal string for `quantity`) or
  their hash won't match. The format is effectively a contract invariant,
  documented in ADR-003 and reproduced in verification tools.
- **Optional hash creates two tiers of verifiability:** Trades with
  `terms_hash = None` have no listing commitment at all, so disputes
  involving those trades can't prove listing integrity. This is acceptable
  for legacy trades or custom agreements, but it means the platform has a
  mix of "verifiable" and "trust-the-backend" listings.

## Alternatives Considered

### Fully on-chain listings

**Rejected.** Storing commodity, grade, quantity, unit, delivery location,
quality standards, etc. as separate contract storage fields would cost
100-200 bytes per listing minimum, paid by the merchant at listing
creation. For 10,000 listings, that's 1-2 MB of contract storage,
prohibitively expensive on Soroban. Querying listings would require
scanning all storage keys or maintaining an off-chain index anyway,
negating the benefit.

### Fully off-chain with no commitment

**Rejected.** Without `terms_hash`, the backend could silently alter
listing text after trade creation (e.g., lowering the promised grade to
make a dispute favor the seller). Disputes involving "what was promised"
would have no verifiable anchor - just the buyer's word against the
backend's database, which is unacceptable for a trust-minimized escrow
product.

## Related Decisions

- **ADR-003 (Off-chain vs. On-chain Data Partitioning):** Establishes the
  general principle that descriptive/queryable data lives off-chain with
  on-chain commitments where verifiability matters. ADR-007 applies that
  principle specifically to commodity listings.
- **Event-sourced mirroring ([docs/event-flow.md](../event-flow.md)):**
  The `TradeCreatedEvent` emitted by `create_trade` includes `terms_hash`,
  so the backend's mirror of trade data includes the commitment for
  cross-reference and verification.
- **Mediator handbook (docs/mediator-handbook.md):** Mediators follow a
  standardized procedure for verifying listing integrity during disputes,
  including hash re-computation and mismatch escalation.

## References

- [ADR-003: Off-chain vs. On-chain Data Partitioning](./ADR-003-offchain-vs-onchain-data-partitioning.md)
- [docs/event-flow.md](../event-flow.md) (event emission and mirroring)
- [docs/mediator-handbook.md](../mediator-handbook.md) (listing verification procedure)
- Soroban contract: `contracts/amana_escrow/src/trade.rs` (`create_trade` function, `terms_hash` field)
