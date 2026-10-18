# Docker Compose Profiles

Amana uses [Docker Compose profiles](https://docs.docker.com/compose/profiles/) to give each environment a consistent, isolated set of services.

## Profiles at a Glance

| Profile   | Services                        | Port (PG) | Port (Redis) | Data          |
|-----------|---------------------------------|-----------|--------------|---------------|
| `dev`     | postgres, redis                 | 5432      | 6379         | persistent    |
| `staging` | postgres-staging, redis-staging | 5434      | 6380         | persistent    |
| `test`    | postgres-test, redis-test       | 5433      | 6381         | tmpfs (ephemeral) |
| `preview` | backend-preview, postgres-preview, redis-preview | 5435 | 6382 | tmpfs (ephemeral, per-PR) |
| `full`    | postgres, redis, stellar-quickstart, contract-deployer, backend-full, frontend-full | 5432 | 6379 | persistent Postgres, ephemeral Soroban network |

The `full` profile runs the whole app against a local Soroban network; see [Full Stack](#full-stack-local-soroban-network) below.

The `preview` profile is the per-PR ephemeral stack (backend + DB + redis)
driven by the `preview` label — see [preview-environments.md](./preview-environments.md)
for lifecycle, budget caps, and the concurrency ceiling.

## Quick Start

Helper scripts handle startup, migration, and (for staging/preview) seed:

```bash
# Local development
./scripts/dev-up.sh

# Staging (mirrors production topology)
cp .env.staging.example .env.staging   # fill in values first
./scripts/staging-up.sh

# Test / CI (ephemeral, no persistent state)
./scripts/test-up.sh

# Per-PR preview (requires PREVIEW_PR_NUMBER)
PREVIEW_PR_NUMBER=123 ./scripts/preview-up.sh

# Whole app on a local Soroban network (foreground; Ctrl-C to stop)
docker compose --profile full up
```

## Manual Usage

```bash
# Bring up a specific profile
docker compose --profile dev     up -d
docker compose --profile staging up -d
docker compose --profile test    up -d
docker compose --profile preview up -d
docker compose --profile full    up

# Tear down (keep volumes)
docker compose --profile dev down

# Tear down and wipe data
docker compose --profile dev down -v
```

## Environment Variables

Each profile honours environment variables with profile-specific prefixes:

| Variable                  | Default                    | Profile  |
|---------------------------|----------------------------|----------|
| `POSTGRES_USER`           | `postgres`                 | dev      |
| `POSTGRES_PASSWORD`       | `password`                 | dev      |
| `POSTGRES_DB`             | `amana`                    | dev      |
| `POSTGRES_PORT`           | `5432`                     | dev      |
| `REDIS_PORT`              | `6379`                     | dev      |
| `STAGING_POSTGRES_USER`   | `postgres`                 | staging  |
| `STAGING_POSTGRES_PASSWORD`| `staging-password`        | staging  |
| `STAGING_POSTGRES_DB`     | `amana_staging`            | staging  |
| `STAGING_POSTGRES_PORT`   | `5434`                     | staging  |
| `STAGING_REDIS_PASSWORD`  | `staging-redis-pass`       | staging  |
| `STAGING_REDIS_PORT`      | `6380`                     | staging  |
| `TEST_POSTGRES_PORT`      | `5433`                     | test     |
| `TEST_REDIS_PORT`         | `6381`                     | test     |
| `PREVIEW_PORT`            | `4001`                     | preview  |
| `PREVIEW_POSTGRES_PORT`   | `5435`                     | preview  |
| `PREVIEW_REDIS_PORT`      | `6382`                     | preview  |
| `PREVIEW_JWT_SECRET`      | dev-only placeholder       | preview  |
| `PREVIEW_CONTRACT_ID`     | testnet placeholder        | preview  |
| `FULL_STELLAR_PORT`       | `8000`                     | full     |
| `FULL_BACKEND_PORT`       | `4100`                     | full     |
| `FULL_FRONTEND_PORT`      | `3000`                     | full     |
| `FULL_JWT_SECRET`         | dev-only placeholder       | full     |

Copy `.env.staging.example` to `.env.staging` to override staging defaults. Never commit `.env.staging`.

## Full Stack (local Soroban network)

`docker compose --profile full up` starts the app end to end with no manual steps:

| Service | Role | Ready when |
|---------|------|------------|
| `postgres`, `redis` | Shared with `dev` | Healthchecks pass |
| `stellar-quickstart` | Standalone Soroban RPC, Horizon and friendbot (`stellar/quickstart`) | `getHealth` returns `healthy` |
| `contract-deployer` | One-shot: funds an admin account, deploys a native-XLM token contract as the cNGN stand-in, builds `contracts/amana_escrow` to WASM, deploys and initializes it | Exits 0 |
| `backend-full` | Runs `prisma migrate deploy`, then the API on `localhost:4100` | `/health/ready` passes |
| `frontend-full` | Next.js dev server on `localhost:3000` | — |

Ordering is enforced with `depends_on`: the backend waits for Postgres, Redis and a successful deploy; the frontend waits for the backend. The deployer writes `AMANA_ESCROW_CONTRACT_ID`, `USDC_CONTRACT_ID` and `NEXT_PUBLIC_CONTRACT_ID` to the `stellar_shared` volume (`/shared/stellar.env`), and both app containers source that file at start. The logic lives in `scripts/deploy-contract-full-stack.sh`.

Notes:

- The first run compiles `stellar-cli` from source (`cargo install --locked stellar-cli`) and is slow; the binary is cached in the `stellar_cli` volume afterwards.
- Quickstart keeps no state, so every fresh `up` redeploys the contract. To reset everything, run `docker compose --profile full down -v`.
- The frontend runs in dev mode on purpose: `NEXT_PUBLIC_*` values are read at process start instead of being baked into an image.
- This profile is for local development only. It uses a throwaway admin account and a development JWT secret.

## Validating Profile Config

```bash
# Validates compose file structure without starting containers
./scripts/test-compose-profiles.sh
```

## Production Notes

- Production infrastructure is managed externally (cloud-managed postgres, redis cluster).
- The `staging` profile is the closest local approximation: same image tags, password-protected redis, named volume for data persistence.
- The `test` profile uses `tmpfs` so data is never written to disk — suitable for parallel CI runners on the same host.

## Adding a New Service

1. Add the service block to `docker-compose.yml` with the appropriate `profiles:` list.
2. Add connection details to `.env.staging.example` (staging) or the dev defaults.
3. Update `scripts/dev-up.sh` / `scripts/staging-up.sh` if the service needs an ordering dependency.
4. Add an assertion to `scripts/test-compose-profiles.sh`.
