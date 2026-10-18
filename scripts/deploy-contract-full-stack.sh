#!/usr/bin/env bash
# deploy-contract-full-stack.sh — Runs inside the `contract-deployer` container
# of the `full` compose profile (docs/docker-profiles.md). Builds the escrow
# WASM, deploys and initializes it on the local stellar/quickstart network, then
# writes the resulting ids to $ENV_FILE for the backend and frontend containers
# to source. Quickstart keeps no state across restarts, so this always redeploys.
set -euo pipefail

NETWORK="local"
RPC_URL="${STELLAR_RPC_URL:-http://stellar-quickstart:8000/soroban/rpc}"
PASSPHRASE="Standalone Network ; February 2017"
ADMIN_KEY="amana-admin"
CONTRACT_DIR="/workspace/contracts/amana_escrow"
ENV_FILE="${ENV_FILE:-/shared/stellar.env}"

export PATH="/opt/stellar/bin:$PATH"
export CARGO_TARGET_DIR="/tmp/amana-target"

rm -f "$ENV_FILE"

if ! command -v stellar >/dev/null 2>&1; then
  echo "→ Installing stellar-cli (cached in the stellar_cli volume after first run)..."
  cargo install --locked stellar-cli --root /opt/stellar
fi

echo "→ Configuring network '$NETWORK' ($RPC_URL)..."
stellar network add "$NETWORK" --rpc-url "$RPC_URL" --network-passphrase "$PASSPHRASE" 2>/dev/null || true

echo "→ Funding admin account via friendbot..."
stellar keys generate "$ADMIN_KEY" --network "$NETWORK" --fund --overwrite
ADMIN_PUBKEY="$(stellar keys address "$ADMIN_KEY")"

echo "→ Deploying native XLM asset contract (cNGN stand-in for local)..."
TOKEN_ID="$(stellar contract asset deploy --asset native --source-account "$ADMIN_KEY" --network "$NETWORK" 2>/dev/null \
  || stellar contract id asset --asset native --network "$NETWORK")"

echo "→ Building escrow WASM..."
rustup target add wasm32-unknown-unknown
cd "$CONTRACT_DIR"
cargo build --locked --target wasm32-unknown-unknown --features wasm --release
WASM_FILE="$CARGO_TARGET_DIR/wasm32-unknown-unknown/release/amana_escrow.wasm"

echo "→ Deploying escrow contract..."
CONTRACT_ID="$(stellar contract deploy --wasm "$WASM_FILE" --source-account "$ADMIN_KEY" --network "$NETWORK")"

echo "→ Initializing escrow contract..."
stellar contract invoke --id "$CONTRACT_ID" --source-account "$ADMIN_KEY" --network "$NETWORK" -- initialize \
  --admin "$ADMIN_PUBKEY" \
  --cngn_contract "$TOKEN_ID" \
  --treasury "$ADMIN_PUBKEY" \
  --fee_bps 100 \
  --source_token "$TOKEN_ID"

mkdir -p "$(dirname "$ENV_FILE")"
cat > "$ENV_FILE" <<EOF
AMANA_ESCROW_CONTRACT_ID=$CONTRACT_ID
USDC_CONTRACT_ID=$TOKEN_ID
NEXT_PUBLIC_CONTRACT_ID=$CONTRACT_ID
EOF

echo "✓ Escrow contract $CONTRACT_ID deployed; ids written to $ENV_FILE"
