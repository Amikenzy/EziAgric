# Amana Escrow Gas Estimation

This document records the assumptions used by the contract gas and footprint regression tests.

## Scope

The gas suite measures the Amana escrow hot paths that are most likely to affect user-facing transaction cost:

- `create_trade`
- `deposit`
- `initiate_dispute`
- `resolve_dispute`
- `admin_clawback` (unilateral admin `cancel_trade` on funded escrow)
- repeated partial `admin_clawback` calls on the same trade (Issue #110)
- the combined dispute lifecycle
- `get_trades` (batch read of up to 50 trades, Issue #351)

## Baseline Gas & Footprint Thresholds

| Path | CPU Instructions Baseline | Memory Bytes Baseline | Primary Cost Drivers |
| --- | --- | --- | --- |
| `create_trade` | 3,000,000 | 2,000,000 | Trade struct initialization, persistent storage write, counter bump |
| `deposit` | 5,000,000 | 3,000,000 | Auth verification, Stellar asset token transfer into escrow, status update |
| `initiate_dispute` | 3,000,000 | 2,000,000 | Dispute record initialization, reason hash validation, status update |
| `resolve_dispute` | 8,000,000 | 4,000,000 | Mediator authorization, payout BPS calculation, token transfer(s), dispute record update |
| `admin_clawback` | 6,000,000 | 3,500,000 | Admin auth check, Stellar asset token refund transfer to buyer, status update to `Cancelled`, release sequence update, event emission |
| `repeated_partial_clawback` (5x) | 25,000,000 | 15,000,000 | 5 sequential partial `admin_clawback` calls: admin auth + feature-flag check, token transfer, `ClawbackTotal` read/write, and trade-record write per call |
| `get_trades` (50 ids) | 20,000,000 | 10,000,000 | 50 persistent trade reads inside a single contract invocation, no auth and no storage writes |

### Repeated clawback benchmarking (Issue #110)

`test_gas_repeated_partial_clawback` calls `admin_clawback` 5 times in a row against the same trade to confirm cost scales linearly (no unbounded storage growth per call — `ClawbackTotal` is a single scalar overwrite, not an appended list). The baseline above is set with headroom over `5 * BASELINE_ADMIN_CLAWBACK` rather than a full 1:1 multiple, since repeated calls skip the one-time trade-creation/deposit setup cost. No further gas optimization was identified as necessary at this call volume; if future changes make per-trade clawback history append-only, re-baseline using the policy below and re-evaluate whether the per-call cost still stays flat.

### Batch trade reads (Issue #351)

`test_gas_batch_get_trades_replaces_n_round_trips` builds a full-cap batch of
`MAX_BATCH_TRADES` (50) funded trades and measures two things:

1. one `get_trades` call carrying all 50 ids, against
   `BASELINE_BATCH_GET_TRADES_CPU` / `..._MEM` above, and
2. the same page hydrated one id at a time with 50 `get_trade` calls.

The comparison is the point: the batch must cost strictly less CPU and memory
than the 50-call loop. Each single read pays a whole contract invocation — host
dispatch, ledger entry loading and result encoding — while the batch pays that
once for all 50 trades, so the batch is the cheaper way to render a page for
any page size above one. The absolute ceiling is deliberately loose and only
exists to catch a per-id cost that stops being linear (for example an accidental
re-read of the whole trade map); it is not tightened per release.

Reads only touch persistent trade entries and never write, so the batch adds no
rent obligation of its own. Requests above the cap are rejected with
`BATCH_TOO_LARGE` (see `docs/contract-error-codes.md`) rather than executed in
chunks, which keeps the worst case bounded at 50 reads.

## Methodology

The tests use Soroban test utilities and reset the budget immediately before the measured closure. Setup calls such as contract registration, token minting, initialization, and mediator registration are intentionally excluded from hot-path measurements.

Every measured path asserts both CPU instruction cost and memory byte cost against versioned baseline thresholds committed in `src/tests/gas_footprint_tests.rs`.

## Re-baselining policy

Only re-baseline when a deliberate contract change increases cost for a documented reason. When re-baselining:

1. Run `cargo test` from `contracts/amana_escrow/`.
2. Capture measured CPU and memory values locally.
3. Round up to a stable threshold with conservative headroom.
4. Commit threshold changes together with the contract change that caused them.

Do not add network-dependent or timing-dependent checks to the gas suite. CI should remain deterministic and non-flaky.

## Current invariants

Gas estimation must not weaken these contract invariants:

- escrowed funds are conserved across release and dispute-resolution transfers;
- only valid trade lifecycle transitions are accepted;
- only approved mediators may resolve disputes;
- evidence and release sequence storage remain append-only or monotonic where applicable.
