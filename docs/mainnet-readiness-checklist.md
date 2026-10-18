# Mainnet Readiness Checklist (Phase 4)

**Issue:** #475
**Scope:** `contracts/amana_escrow`, `backend/`, `frontend/`, `mobile/`, `infra/`, legal/compliance
**Status legend:** `Done` = evidenced in repo · `Partial` = some evidence, gaps remain · `Open` = no evidence in repo · `Verify` = needs a maintainer to confirm outside the repo

This checklist must be fully green (or each gap explicitly accepted by a maintainer in the Phase 4 go/no-go issue) before any mainnet deployment. Owners are roles; a maintainer assigns a named person per row when the go/no-go issue is opened.

Review cadence: re-check every item before the go/no-go decision and after any change to the escrow contract, admin key set, or network configuration.

---

## 1. Contract (`contracts/amana_escrow`)

| # | Requirement | Evidence / link | Owner (role) | Status |
|---|---|---|---|---|
| C1 | Threat model reviewed against current code | [threat-model.md](threat-model.md), [threat-model-review-checklist.md](threat-model-review-checklist.md) | Contracts lead | Partial — last updated 2026-04-24; re-review before mainnet |
| C2 | Independent third-party security audit of the escrow contract, with findings resolved or accepted | None in repo | Contracts lead + maintainers | Open |
| C3 | Timelock and multisig-gated upgrade path | [TIMELOCK_POLICY.md](TIMELOCK_POLICY.md) — multisig guardian veto is listed as external to the contract | Contracts lead | Partial — confirm mainnet admin is a multisig, not a single key (`Verify`) |
| C4 | Storage layout compatibility gate on every change | [storage-layout-gate.md](storage-layout-gate.md) | Contracts lead | Done |
| C5 | Money-math invariants documented and tested | [money-math-invariant-catalog.md](money-math-invariant-catalog.md) | Contracts lead | Done |
| C6 | Access-control tests for every privileged entrypoint | [access_control_tests.md](access_control_tests.md) | Contracts lead | Done |
| C7 | Test coverage and mutation testing baseline recorded | [contract-coverage.md](contract-coverage.md), [mutation-testing-baseline.md](mutation-testing-baseline.md) | Contracts lead | Done |
| C8 | Error codes documented for integrators | [contract-error-codes.md](contract-error-codes.md) | Contracts lead | Done |
| C9 | Clawback policy and tooling reviewed for mainnet | [vesting-clawback-policy.md](vesting-clawback-policy.md), [cli-clawback.md](cli-clawback.md) | Contracts lead + Legal | Partial — policy written; legal sign-off in section 5 |
| C10 | Mainnet deployment is scripted and reproducible | [deployments/](../deployments/) has `testnet.json` only; mainnet deploy "not yet scripted" per [runbooks/deployment.md](runbooks/deployment.md) | Contracts lead + DevOps | Open |
| C11 | Optimized WASM size budget and reproducible build hash enforced | README → Required PR CI Gates (Contracts Required Gate) | Contracts lead | Done |
| C12 | Testnet soak: contract deployed and exercised end-to-end on testnet | [staging-smoke-testing.md](staging-smoke-testing.md) | Contracts lead | Verify |

## 2. Key management

| # | Requirement | Evidence / link | Owner (role) | Status |
|---|---|---|---|---|
| K1 | Admin / upgrade keys held in multisig, with signers external to the contract | [TIMELOCK_POLICY.md](TIMELOCK_POLICY.md) | Security + DevOps | Verify |
| K2 | Mainnet signer keys stored in a secret manager or HSM, never in repo or `.env` files | [secrets-policy.md](secrets-policy.md) | Security | Partial |
| K3 | Documented rotation procedure for the admin signing secret | [admin-secret-rotation.md](admin-secret-rotation.md), [admin-secret-management.md](admin-secret-management.md) | Security | Done |
| K4 | Admin routes isolated from public network | [admin-network-isolation.md](admin-network-isolation.md), `infra/k8s/admin-network-policy.yaml` | DevOps | Done |
| K5 | Admin session / device binding | [admin-session-device-binding.md](admin-session-device-binding.md) | Backend | Done |
| K6 | Secret scanning in CI and pre-commit | `.gitleaks.toml`, `.githooks/` | DevOps | Done |
| K7 | Named key custodians and a documented key-loss recovery path | None in repo | Security + Legal | Open |

## 3. Backend (`backend/`)

| # | Requirement | Evidence / link | Owner (role) | Status |
|---|---|---|---|---|
| B1 | PII encrypted at rest, with audit tooling | [pii-encryption.md](pii-encryption.md) | Backend | Done |
| B2 | Environment validation fails fast on missing or unsafe config | [env-validation.md](env-validation.md) | Backend | Done |
| B3 | Graceful shutdown drains in-flight requests and jobs | [graceful-shutdown.md](graceful-shutdown.md) | Backend | Done |
| B4 | Idempotent, retry-safe transaction submission | [adr/ADR-004-idempotency-and-retry-strategy.md](adr/ADR-004-idempotency-and-retry-strategy.md) | Backend | Done |
| B5 | Transaction failure alerting | [admin-tx-failure-alerting.md](admin-tx-failure-alerting.md) | Backend | Done |
| B6 | Mediator quorum and dispute flow reviewed | [mediator-quorum.md](mediator-quorum.md) | Backend + Product | Partial |
| B7 | Deadline extension caps enforced | [deadline-extension-caps.md](deadline-extension-caps.md) | Backend | Done |
| B8 | Query performance reviewed for hot paths | [query-performance-review.md](query-performance-review.md) | Backend | Partial |
| B9 | Load testing against mainnet-sized traffic model (k6) | `k6/`, [performance-budgets.md](performance-budgets.md) | Backend | Verify |
| B10 | Migration rollback path tested | [migration-rollback-playbook.md](migration-rollback-playbook.md) | Backend | Done |
| B11 | Dependency vulnerability scanning and SBOM | [security-scanning.md](security-scanning.md), [sbom.md](sbom.md) | DevOps | Done |
| B12 | Dependency-audit waivers reviewed; none expired | `.github/audit-waivers.json` (currently empty) | Backend | Done |
| B13 | Frontend and mobile clients point only at mainnet config, verified before release | `frontend/`, `mobile/`, [env-validation.md](env-validation.md) | Frontend + Mobile | Verify |

## 4. Infrastructure and monitoring

| # | Requirement | Evidence / link | Owner (role) | Status |
|---|---|---|---|---|
| I1 | Production infra defined as code, with remote state | [terraform-remote-state.md](terraform-remote-state.md), `infra/terraform/` | DevOps | Partial — confirm a mainnet environment exists |
| I2 | Terraform CI uses scoped, short-lived credentials | [terraform-ci-credentials.md](terraform-ci-credentials.md) | DevOps | Done |
| I3 | Backups scheduled and restore tested | `infra/k8s/cronjob-backup.yaml` | DevOps | Partial — restore drill not evidenced |
| I4 | SLOs defined with error budgets and alerting | [slo.md](slo.md), `infra/prometheus/slo-*.yml`, [slo-review-log.md](slo-review-log.md) | DevOps | Done |
| I5 | Dashboards for escrow, backend and chain health | [dashboards.md](dashboards.md), `infra/grafana/` | DevOps | Done |
| I6 | Alert routing, deduplication and runbook links | [alert-routing-policy.md](alert-routing-policy.md), [alert-review-log.md](alert-review-log.md) | DevOps | Done |
| I7 | Synthetic probes on public endpoints | [synthetic-probes-policy.md](synthetic-probes-policy.md) | DevOps | Done |
| I8 | Pod disruption budgets, HPA and capacity plan | `infra/k8s/pdb.yaml`, `infra/k8s/hpa.yaml`, [k8s-capacity.md](k8s-capacity.md) | DevOps | Done |
| I9 | Admin ingress and network policy reviewed | `infra/k8s/admin-ingress.yaml`, `infra/k8s/admin-network-policy.yaml` | DevOps | Done |
| I10 | Incident runbooks for escrow emergencies (incl. clawback) | [runbooks/](runbooks/), [runbooks/emergency-clawback.md](runbooks/emergency-clawback.md) | DevOps + Contracts lead | Partial |
| I11 | Stellar mainnet RPC and Horizon endpoints chosen, with fallback | [api/stellar.md](api/stellar.md) | Backend | Verify |
| I12 | Release notes and rollback plan for the mainnet release | [releases/release-note-template.md](releases/release-note-template.md) | Maintainers | Open |

## 5. Legal and compliance

| # | Requirement | Evidence / link | Owner (role) | Status |
|---|---|---|---|---|
| L1 | Legal review of the escrow and dispute model in each target jurisdiction | None in repo | Legal | Open |
| L2 | Money-transmission, e-money and stablecoin licensing position documented | None in repo | Legal | Open |
| L3 | Terms of service and privacy policy published and matched to PII handling | [pii-encryption.md](pii-encryption.md) (technical side only) | Legal + Product | Open |
| L4 | KYC/AML approach defined for users, agents and mediators | None in repo | Legal + Compliance | Open |
| L5 | Data-retention and deletion schedule aligned with PII encryption | [pii-encryption.md](pii-encryption.md) | Legal + Backend | Open |
| L6 | Clawback and admin-override powers disclosed to users and reviewed by counsel | [vesting-clawback-policy.md](vesting-clawback-policy.md) | Legal | Partial |
| L7 | Incident-disclosure obligations mapped per jurisdiction | None in repo | Legal + Security | Open |
| L8 | Insurance or loss-sharing position agreed | [adr/ADR-002-escrow-loss-sharing-model.md](adr/ADR-002-escrow-loss-sharing-model.md) | Legal + Product | Partial |

## 6. Summary

- **Blocking (Open, must close before go/no-go):** C2 external audit, C10 scripted mainnet deploy, K7 key custodians, I12 release plan, L1–L4 legal and compliance, L7 disclosure mapping.
- **Verify (needs maintainer confirmation outside the repo):** C3/K1 multisig admin, C12 testnet soak, B9 load test, B13 client config, I1 mainnet infra environment, I11 Stellar endpoints.
- **Done:** the remaining rows are evidenced by files in this repo.

## 7. Sign-off

| Role | Name | Date | Decision |
|---|---|---|---|
| Contracts lead | | | |
| Backend lead | | | |
| DevOps lead | | | |
| Security | | | |
| Legal / compliance | | | |
| Maintainer (go/no-go) | | | |
