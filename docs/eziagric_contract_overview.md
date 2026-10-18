# EziAgric Contract Architecture Overview

Technical design document outlining agriculture supply chain escrow state rules.

The escrow contract is the only component that holds value: buyers deposit cNGN,
the contract releases or refunds it according to what happened to the shipment,
and every privileged action is either admin-gated or bounded by a deadline. This
page is the map of that contract: what lives where, which storage keys exist,
which entry points exist, and the arithmetic behind each settlement path.

For the wider system — what the contract talks to, and the order in which the
pieces exchange messages — see [`architecture/`](architecture/README.md).

## Where the code lives

The contract is one crate, `contracts/amana_escrow`, whose library is organised
as labelled sections inside `src/lib.rs`. The table below is the map that the
module split tracked in [#347](https://github.com/EziAgric/EziAgric/issues/347)
follows; section names match the module names it will use.

| Section | Responsibility | Key symbols |
| --- | --- | --- |
| Crate constants & math | TTLs, bounds, basis-point arithmetic | `BPS_DIVISOR`, `MAX_TRADE_VALUE`, `MAX_FEE_BPS`, `MAX_BATCH_TRADES`, `checked_fee_amount`, `checked_loss_amount` |
| Events | `#[contractevent]` payloads | `TradeCreatedEvent`, `DeliveryConfirmedEvent`, `FundsReleasedEvent`, `DisputeInitiatedEvent`, `DisputeResolvedEvent`, `PartialDeliveryConfirmedEvent` |
| Error tokens | Panic strings clients parse | `clawback_errors`, `timelock_errors`, `trade_errors` (see [error codes](contract-error-codes.md)) |
| Types | `#[contracttype]` payloads | `Trade`, `TradeData`, `TradeStatus`, `DisputeRecord`, `ReleaseSequence`, `PartialDeliverySettlement` |
| Storage | Key layout and accessors | `DataKey`, `load_trade`, `save_trade`, `update_release_sequence` |
| Lifecycle | Create, fund, deliver, release, cancel | `create_trade`, `deposit`, `confirm_delivery`, `release_funds`, `refund`, `claim_expiry_refund` |
| Partial delivery | Pro-rata settlement of a short delivery | `confirm_partial_delivery`, `accept_partial_delivery`, `escalate_partial_delivery` |
| Disputes | Mediator and quorum resolution | `initiate_dispute`, `resolve_dispute`, `settle_dispute`, `cast_dispute_vote` |
| Fees | Accrual and withdrawal | `withdraw_fees`, `AccruedFees`, `set_fee_bps` |
| Admin & timelock | Guardians, pause, upgrades, clawback | `pause`, `unpause`, `admin_clawback`, `queue_timelock_operation` |
| Migrations | Schema version and upgrades | `CURRENT_SCHEMA_VERSION`, `get_schema_version`, `migrate` |
| Views | Read-only accessors | `get_trade`, `get_trades`, `get_trade_history`, `get_contract_metrics` |
| Tests | Unit, integration and fuzz suites | `src/tests/*`, `contracts/amana_escrow/tests/*` |

<!-- docref: contracts/amana_escrow/src/lib.rs#DataKey -->
<!-- docref: contracts/amana_escrow/src/lib.rs#PartialDeliverySettlement -->

## Storage keys

Every key is a `DataKey` variant. Nothing is keyed by index: variants are
identified by name in XDR, so a new variant appended at the end cannot change
the encoding of an existing one.

| Key | Scope | Holds |
| --- | --- | --- |
| `Trade(u64)` | persistent | The trade record (`TradeData::V0`); `None` means the id was never issued |
| `TradeHistory(u64)` | persistent | Append-only `TradeEvent` log |
| `ReleaseSequence(u64)` | persistent | Timestamps of each lifecycle transition |
| `DisputeData(u64)` | persistent | `DisputeRecord` written by a dispute, including escalations |
| `EvidenceList(u64)`, `Evidence(u64, Address)`, `VideoProof(u64)`, `Manifest(u64)` | persistent | Delivery evidence and proof records |
| `PendingAmendment(u64)` | persistent | Undecided trade-terms amendment |
| `PartialDeliverySettlement(u64)` | persistent | Pro-rata split awaiting the seller's acceptance (#349) |
| `Initialized`, `Admin`, `CngnContract`, `Treasury`, `FeeBps` | instance | Singleton configuration written by `initialize` |
| `Mediator`, `MediatorRegistry(Address)`, `MediatorWeight(Address)`, `QuorumConfig`, `DisputeVotes(u64)` | instance / persistent | Dispute authority configuration |
| `AccruedFees`, `TotalTrades`, `TotalDisputes`, `TotalResolved` | instance | Aggregate counters and platform fee balance |
| `SchemaVersion` | instance | Storage-layout version read by `get_schema_version` |
| `Paused`, `GuardianRegistry(Address)`, `TimelockConfig`, `TimelockOperation(u64)`, `NextTimelockId`, `ClawbackEnabled`, `ClawbackTotal(u64)` | instance / persistent | Admin safety rails |
| `AllowedAsset(Address)`, `AssetDecimals(Address)`, `SourceToken`, `PathPaymentIntent(u64)` | instance / persistent | Multi-asset and path-payment support |
| `ExtensionPolicy`, `ExtensionCount(u64)`, `OriginalDeadline(u64)` | instance / persistent | Deadline-extension policy (#194) |

## Settling a partial delivery

A shipment that arrives short used to have only three exits — full release, full
refund, or a dispute — so an 80-of-100-bags delivery became a dispute by
default. `confirm_partial_delivery(trade_id, delivered_bps)` states the delivered
share in basis points, and the contract computes one split, freezes it under
`DataKey::PartialDeliverySettlement(trade_id)`, and emits `PARTDL`:

```text
delivered     = escrow * delivered_bps / 10_000
fee           = delivered * fee_bps / 10_000           (delivered portion only)
seller_loss   = undelivered * seller_loss_bps / 10_000, capped by delivered - fee
seller_amount = delivered - fee - seller_loss
buyer_refund  = undelivered + seller_loss
```

`undelivered = escrow - delivered` absorbs the integer-division remainder, so
`seller_amount + buyer_refund + fee_amount == escrow` for every input — no dust
is stranded, whichever fraction arrives.

**Worked example.** 100 bags at 1 000 cNGN each, 100 000 cNGN escrowed, buyer and
seller sharing losses 50/50, 1 % platform fee. 80 bags arrive:

| Line | Value |
| --- | --- |
| `delivered_bps` | 8 000 (80 of 100 bags) |
| `delivered_amount` | 80 000 |
| `undelivered_amount` | 20 000 |
| `fee_amount` | 800 — 1 % of the delivered 80 000, not of the whole escrow |
| `seller_loss_amount` | 10 000 — the seller's half of the 20 000 that never arrived |
| `seller_amount` | 69 200 — 80 000 − 800 − 10 000 |
| `buyer_refund` | 30 000 — the missing 20 000 plus the seller's 10 000 loss share |
| total | 100 000 ✔ |

No funds move until the seller calls `accept_partial_delivery` inside the
[`PARTIAL_DELIVERY_ACCEPT_WINDOW_SECS`](../contracts/amana_escrow/src/lib.rs)
window (three days); accepting releases the three amounts above and completes the
trade. If the seller never accepts, either party calls
`escalate_partial_delivery` after the window and the trade enters the normal
dispute flow with the whole escrow still in the contract — a proposal the seller
rejects can never strand value. The edge cases are deliberate: `0` bps refunds
the buyer everything (the seller has delivered nothing to deduct a loss share
from) and `10 000` bps is an ordinary full release.

<!-- docref: contracts/amana_escrow/src/lib.rs#confirm_partial_delivery -->
<!-- docref: contracts/amana_escrow/src/lib.rs#accept_partial_delivery -->
<!-- docref: contracts/amana_escrow/src/lib.rs#escalate_partial_delivery -->

## Reading trades in batches

`get_trades(ids)` returns one `Option<Trade>` per requested id, in input order,
so a dashboard page or the event listener hydrates N trades from a single
simulation instead of N. Unknown ids come back as `None` — a page built from a
slightly stale index still renders — and a request above `MAX_BATCH_TRADES`
(50 ids) fails with the `BATCH_TOO_LARGE` error token rather than being
truncated, so a caller can never mistake a partial answer for a complete one.
Measured CPU and memory footprints, including the comparison against 50
individual `get_trade` calls, are recorded in
[`docs/gas-estimation.md`](../contracts/amana_escrow/docs/gas-estimation.md).

<!-- docref: contracts/amana_escrow/src/lib.rs#get_trades -->
<!-- docref: contracts/amana_escrow/docs/gas-estimation.md -->

## Related documents

- [`architecture/README.md`](architecture/README.md) — context, container and sequence diagrams as code
- [`adr/ADR-002-escrow-loss-sharing-model.md`](adr/ADR-002-escrow-loss-sharing-model.md) — why losses are shared in basis points
- [`contract-error-codes.md`](contract-error-codes.md) — the panic tokens clients map to responses
- [`event-schema.md`](event-schema.md) — generated event schema and migration plan
