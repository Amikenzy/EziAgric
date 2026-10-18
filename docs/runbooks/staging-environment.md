# Staging Environment (Pilot Demos)

Always-on staging for pilot demos, running the Stellar **testnet** escrow
contract. It is auto-deployed from `main` by
[`.github/workflows/staging-main-deploy.yml`](../../.github/workflows/staging-main-deploy.yml).

This is distinct from the ephemeral Docker Compose staging stack
(`./scripts/staging-up.sh`, `.github/workflows/staging.yml`), which is
torn down after every run and is not a demo environment.

## URLs

| Piece | URL |
|---|---|
| Backend API | `STAGING_URL` (GitHub `staging` environment secret) |
| Backend readiness | `$STAGING_URL/health/ready` |
| Frontend | Staging frontend host, set in the host project and linked from the `staging` environment in GitHub |

Fill in the concrete hostnames in the GitHub `staging` environment, not in
this file, so the URLs can change without a docs PR.

## Secrets (GitHub `staging` environment)

| Secret | Purpose |
|---|---|
| `STAGING_URL` | Public base URL of the staging backend |
| `STAGING_BACKEND_DEPLOY_HOOK` | Host deploy hook that rebuilds the backend |
| `STAGING_FRONTEND_DEPLOY_HOOK` | Host deploy hook that rebuilds the frontend |

Secrets are never committed. See [secrets-policy.md](../secrets-policy.md).

## Deploy flow

1. A commit lands on `main`.
2. `Staging Deploy (main)` checks that `deployments/testnet.json` pins a
   `contractId` and `wasmHash`. The deploy stops here if it does not.
3. Backend and frontend deploy hooks are triggered.
4. The job waits up to 5 minutes for `GET /health/ready` to return `200`.
5. Smoke tests run: `GET /health`, `GET /health/startup`, and
   `scripts/staging-admin-smoke-test.sh` (see
   [staging-smoke-testing.md](../staging-smoke-testing.md)).
6. The job summary records the URL and the deployed commit SHA.

Runs can also be started manually with `workflow_dispatch`.

## Testnet contract pinning

The contract used by staging is recorded in
[`deployments/testnet.json`](../../deployments/testnet.json). Pin it per
release:

1. Deploy or upgrade the contract with
   `TESTNET_ADMIN_SECRET=... ./scripts/deploy-contract-testnet.sh`
   (see [contract-deployment-local-network.md](../contract-deployment-local-network.md)).
2. Update `contractId`, `wasmHash`, `deployedAt` and `deployer` in
   `deployments/testnet.json` in the same PR as the release.
3. Merge to `main`. The staging deploy then runs against that contract.

A contract that is not pinned blocks the staging deploy by design.

## Rollback

Rollback is by redeploying the previous known-good commit. Do not re-run
migrations as part of a rollback unless the migration is the problem; see
[rollback.md](./rollback.md) and
[migration-rollback-playbook.md](../migration-rollback-playbook.md).

### Application (backend and frontend)

1. Find the last good commit on `main` (the previous `Staging Deploy (main)`
   run that succeeded, shown in its job summary).
2. Revert the bad commit on `main` with `git revert <sha>` and merge it, or
   re-trigger the deploy hooks on the host after checking out the good commit.
3. Confirm `GET $STAGING_URL/health/ready` returns `200`.

### Contract

Testnet contracts keep their state through upgrades. To roll back, redeploy
the previous WASM with `./scripts/deploy-contract-testnet.sh --upgrade`,
then restore the previous `contractId`/`wasmHash` values in
`deployments/testnet.json` and merge.

### Feature kill switch

If the bad change is one feature and a redeploy is too slow, disable the
flag through the admin feature-flag API (see [rollback.md](./rollback.md)).

## Failure handling

A failed deploy or smoke test fails the `Staging Deploy (main)` run and
writes a failure notice to the job summary. Follow the rollback steps above,
then [incident-response.md](./incident-response.md) if users were affected.
