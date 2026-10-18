# Architecture Decision Records

This directory records the architecture decisions for the project. Each ADR
follows the template in `template.md` and uses the status lifecycle
`proposed` -> `accepted` -> `superseded`.

## Index

| ADR                                                      | Title                                    | Status   |
| -------------------------------------------------------- | ---------------------------------------- | -------- |
| [001](ADR-001-stellar-path-payment-architecture.md)      | Stellar path payment architecture        | Accepted |
| [002](ADR-002-escrow-loss-sharing-model.md)              | Escrow loss sharing model                | Accepted |
| [003](ADR-003-offchain-vs-onchain-data-partitioning.md)  | Off-chain vs. on-chain data partitioning | Accepted |
| [004](ADR-004-idempotency-and-retry-strategy.md)         | Idempotency and retry strategy           | Accepted |
| [005](ADR-005-frontend-state-management.md)              | Frontend state management                | Accepted |
| [006](ADR-006-driver-identity-and-attestation-model.md)  | Driver identity and attestation model    | Accepted |
| [007](ADR-007-product-listings-on-chain-vs-off-chain.md) | Product listings on-chain vs. off-chain  | Accepted |

## Supersede procedure

To supersede a decision, add a new ADR and set the superseded document's status
to `Superseded by ADR-XXX`. The decision text of a superseded ADR is never edited
in place; the new ADR records the replacement decision and links back to the one
it supersedes.
