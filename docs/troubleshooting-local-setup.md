# Troubleshooting Local Setup

Common failures when setting up Amana locally, with the fix for each. Start with `scripts/dev-doctor.sh` from the repo root: it checks every toolchain and prints the install command for anything missing.

## 1. `dev-doctor` says node is below 22 or npm is below 10

**Symptom:** `node X < 22` or `npm X < 10` in the doctor output.

**Fix:** Install Node 22 and switch to it, then upgrade npm.

```bash
nvm install 22 && nvm use 22
npm install -g npm@10
```

## 2. `docker` installed but the daemon is not running

**Symptom:** `docker installed but daemon not running`. `scripts/dev-up.sh` and the Postgres/Redis containers fail to start.

**Fix:** Start Docker Desktop (macOS/Windows) or `sudo systemctl start docker` (Linux), then re-run `docker info` to confirm it responds.

## 3. Port 5432 or 6379 is already in use

**Symptom:** Compose fails to bind the Postgres or Redis port, or the backend connects to the wrong database.

**Fix:** A local Postgres or Redis is probably already running. Either stop it, or remap the port in your shell before bringing the stack up. The compose file reads these variables:

```bash
export POSTGRES_PORT=5438
export REDIS_PORT=6390
```

Then update `DATABASE_URL` and `REDIS_URL` in `backend/.env` to match. The per-profile ports are listed in [docker-profiles.md](./docker-profiles.md).

## 4. Redis connection errors, but the backend still starts

**Symptom:** Logs show a Redis connection failure, and the `redis_connection_failure` alert fires. Sessions, caching and rate limiting are degraded.

**Cause:** `REDIS_URL` points at a Redis that is not running. The backend does not refuse to start, it degrades.

**Fix:** Start the Redis container (`docker compose --profile dev up -d`) and confirm `REDIS_URL` matches the host and port it is listening on. The default in `backend/.env.example` is `redis://localhost:6379/0`. If your Redis has a password, put it in the URL: `redis://:<password>@localhost:6379/0`.

## 5. Backend exits at startup with a missing `ADMIN_SECRET_KEY`

**Symptom:** The server exits immediately with a fatal log about `ADMIN_SECRET_KEY`.

**Cause:** Admin routes are always enabled, so `ADMIN_SECRET_KEY` is required at startup. See [admin-secret-management.md](./admin-secret-management.md).

**Fix:** Set `ADMIN_SECRET_KEY` in `backend/.env` to a generated value for local use. Do not reuse a staging or production key.

## 6. Prisma client errors such as `@prisma/client did not initialize yet`

**Symptom:** Backend code fails with a message that the Prisma client has not been generated, or types are missing after `npm install`.

**Cause:** The Prisma client is generated during `postinstall`. It is missing if the install was interrupted or the schema changed since the last install.

**Fix:** From `backend/`, regenerate the client and rebuild:

```bash
npx prisma generate
npm run build
```

## 7. Running `prisma migrate deploy` directly against staging or production

**Symptom:** A migration applied outside the standard path, or the migration step skipped the backup and the destructive-DDL confirmation.

**Fix:** Do not run `prisma migrate deploy` by hand. Use `scripts/migrate-safe.sh`, which runs a connectivity check, lists pending migrations, and adds a backup step and confirmation for destructive DDL in production. Preview first with `--dry-run`:

```bash
./scripts/migrate-safe.sh --env=staging --dry-run
./scripts/migrate-safe.sh --env=staging
```

See [runbooks/database-migration.md](./runbooks/database-migration.md) for the full procedure and rollback.

## 8. Supabase calls fail because the keys are missing

**Symptom:** Requests to Supabase-backed features fail with an authentication error, or the feature is silently unavailable.

**Cause:** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are optional in the backend validator, so the app starts without them, but any Supabase-backed feature will not work.

**Fix:** Copy both values from your Supabase project's API settings into `backend/.env`. Confirm the URL has the form `https://<project-ref>.supabase.co` and that you pasted the **service role** key, not the anon key.

**Security:** The service role key bypasses row-level security. Keep it in `backend/.env` only. Never prefix it with `NEXT_PUBLIC_` or add it to `frontend/` or `mobile/` env files, since those values ship to the browser or device.

## 9. Soroban or Stellar CLI is missing, or deploy fails with `command not found`

**Symptom:** `stellar CLI missing (deploy only)` from the doctor, or `stellar: command not found` / `soroban: command not found` when deploying.

**Fix:** Install the CLI from source. The binary is now `stellar`; the doctor accepts either `stellar` or the legacy `soroban` name.

```bash
cargo install --locked stellar-cli
```

Some older docs still show `soroban network add`. The equivalent is `stellar network add`.

## 10. `cargo build` or `cargo test` fails for the contract, or the WASM target is missing

**Symptom:** Compile errors about the `wasm32-unknown-unknown` target, or `cargo` not found.

**Fix:** Install the Rust toolchain and the WASM target, then build from the contract crate:

```bash
rustup target add wasm32-unknown-unknown
cd contracts/amana_escrow
cargo test
```

CI also enforces a WASM size budget (`WASM_SIZE_BUDGET_BYTES`) on the optimized build, so a contract that passes locally can still fail the Contracts Required Gate if it grows past that budget.

## 11. Frontend or mobile dev server fails after copying env files

**Symptom:** The app starts but reads empty values, or fails on first API call.

**Fix:** Confirm you copied the example file to the name the stack expects (`frontend/.env.local`, `mobile/.env.local`, `backend/.env`), then restart the dev server. Env files are read at startup, so edits do not take effect until the process restarts.

## Still stuck?

Run `scripts/dev-doctor.sh` again and include its output. If the problem is not covered above, open an **Onboarding friction** issue so this page can be extended.
