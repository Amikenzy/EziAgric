# Contract Error Codes

This document lists all structured error codes emitted by the Amana Escrow
smart contract. The contract uses deterministic panic message strings so the
backend can parse and classify failures without relying on opaque numeric codes.

---

## Admin Clawback Error Codes (Issue #97)

These codes are emitted when `admin_clawback(trade_id, amount, admin)` is called
with invalid arguments or in an invalid contract state. The code is embedded
verbatim in the Soroban panic message, e.g.:

```
WasmVm error: CLAWBACK_UNAUTHORIZED
```

### Code Reference

| Error Code                     | HTTP Status | Description                                                           |
|--------------------------------|-------------|-----------------------------------------------------------------------|
| `CLAWBACK_UNAUTHORIZED`         | 403         | Caller is not the registered contract admin.                          |
| `CLAWBACK_STREAM_NOT_FOUND`     | 404         | No escrow trade record found for the given `trade_id`.                |
| `CLAWBACK_INVALID_AMOUNT`       | 400         | Requested clawback amount is zero or negative.                        |
| `CLAWBACK_INSUFFICIENT_VESTED`  | 422         | Requested amount exceeds the currently escrowed (vested) balance.     |
| `CLAWBACK_INVALID_STATUS`       | 409         | Trade is not in `Funded` status (already Completed, Cancelled, etc.). |

### Backend Mapping

The service `backend/src/services/contractClawbackError.service.ts` maps these
strings to structured `AppError` instances:

```typescript
import { mapContractClawbackError } from "../services/contractClawbackError.service";

try {
  await sorobanRpc.invoke("admin_clawback", [tradeId, amount, adminAddress]);
} catch (err) {
  throw mapContractClawbackError(err, { tradeId, adminAddress });
}
```

The corresponding `ErrorCode` enum values (in `backend/src/errors/errorCodes.ts`):

| Contract string                | `ErrorCode` enum value                     |
|--------------------------------|--------------------------------------------|
| `CLAWBACK_UNAUTHORIZED`         | `ErrorCode.CLAWBACK_UNAUTHORIZED`           |
| `CLAWBACK_STREAM_NOT_FOUND`     | `ErrorCode.CLAWBACK_STREAM_NOT_FOUND`       |
| `CLAWBACK_INVALID_AMOUNT`       | `ErrorCode.CLAWBACK_INVALID_AMOUNT`         |
| `CLAWBACK_INSUFFICIENT_VESTED`  | `ErrorCode.CLAWBACK_INSUFFICIENT_VESTED`    |
| `CLAWBACK_INVALID_STATUS`       | `ErrorCode.CLAWBACK_INVALID_STATUS`         |

---

## Trade Lifecycle Error Codes

Emitted by `create_trade`, `cancel_by_seller` and the trade-amendment entry
points (`propose_amendment`, `accept_amendment`, `withdraw_amendment`). Constants
live in `pub mod trade_errors` in `lib.rs`.

| Error Code                      | HTTP Status | Description                                                                                          |
|---------------------------------|-------------|------------------------------------------------------------------------------------------------------|
| `INVALID_LOSS_RATIO`            | 400         | `buyer_loss_bps` or `seller_loss_bps` is outside `0..=10000`, or the pair does not sum to exactly `10000`. |
| `SELLER_CANCEL_INVALID_STATUS`  | 409         | `cancel_by_seller` called on a trade that is not in `Created` status (already funded, cancelled, etc.). |
| `AMENDMENT_INVALID_STATUS`      | 409         | Amendment proposed or accepted on a trade that is no longer in `Created` status.                     |
| `AMENDMENT_UNAUTHORIZED`        | 403         | Caller is neither the buyer nor the seller of the trade.                                             |
| `AMENDMENT_ALREADY_PENDING`     | 409         | A proposal is already pending; it must be withdrawn before new terms are proposed.                   |
| `AMENDMENT_NOT_FOUND`           | 404         | No pending amendment exists for the trade.                                                           |
| `AMENDMENT_SELF_ACCEPT`         | 403         | The proposer tried to accept their own amendment; only the counter-party may accept.                 |
| `AMENDMENT_INVALID_AMOUNT`      | 400         | Proposed amount is zero, negative, or above `MAX_TRADE_VALUE`.                                       |
| `AMENDMENT_INVALID_DEADLINE`    | 400         | Proposed `expires_at` is not in the future (checked on proposal and again on acceptance).            |
| `BATCH_TOO_LARGE`               | 400         | `get_trades` was called with more than `MAX_BATCH_TRADES` (50) ids. Split the request; the batch is never truncated. |

`INVALID_LOSS_RATIO` is also raised by `propose_amendment`, which applies the
same loss-ratio validation as `create_trade`.

`BATCH_TOO_LARGE` is the only caller-error raised by a read-only entry point:
`get_trades` (#351) refuses an oversized batch instead of returning a silently
incomplete page, so a client can tell "ask me in chunks" apart from "that trade
does not exist" (which is reported as `None` in the returned vector).

---

## Source of Truth

| Artifact                                                   | Purpose                                 |
|------------------------------------------------------------|-----------------------------------------|
| `contracts/amana_escrow/src/lib.rs` → `pub mod clawback_errors` | Canonical string constants on-chain |
| `contracts/amana_escrow/src/lib.rs` → `pub mod trade_errors` | Trade lifecycle string constants on-chain |
| `backend/src/errors/errorCodes.ts` → `enum ErrorCode`     | Backend enum values                     |
| `backend/src/services/contractClawbackError.service.ts`   | Mapping logic + user-facing messages    |
| `contracts/amana_escrow/tests/clawback_error_tests.rs`    | On-chain test assertions                |

These sources **must remain in sync**. If a new error code is added on-chain,
add the `ErrorCode` entry and a mapping case in the service.

---

## Adding New Error Codes

1. Add the constant to `pub mod clawback_errors` in `lib.rs`.
2. Use `panic!("{}", clawback_errors::YOUR_CODE)` in the contract.
3. Add `ErrorCode.YOUR_CODE` to `backend/src/errors/errorCodes.ts`.
4. Add a `case` branch in `mapClawbackErrorCode()` in `contractClawbackError.service.ts`.
5. Add a `#[should_panic(expected = "YOUR_CODE")]` test in `clawback_error_tests.rs`.
6. Update this document.
