# API Usage Guide: Trade Lifecycle with curl Examples

This guide walks through the complete trade lifecycle using the EziAgric
API, with concrete curl examples tested against a local backend. Each step
includes authentication, request/response samples, and error handling.

## Prerequisites

- Backend running locally: `npm run dev` (default: `http://localhost:3000`)
- Stellar testnet account with funded XLM balance
- `jq` installed for JSON parsing in examples (optional but recommended)

## Authentication

All authenticated endpoints require a Bearer token in the `Authorization`
header. Tokens are obtained by signing a challenge with your Stellar
wallet.

### 1. Request authentication challenge

```bash
curl -X POST http://localhost:3000/auth/challenge \
  -H "Content-Type: application/json" \
  -d '{
    "publicKey": "GDJXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  }'
```

**Response:**
```json
{
  "challenge": "eziagric-auth-1729234567890-9a8b7c6d",
  "expiresAt": "2024-10-18T12:30:00.000Z"
}
```

### 2. Sign challenge with Freighter/Albedo (off-band), then verify

Assume your wallet signed the challenge and produced signature
`<base64_signature>`.

```bash
curl -X POST http://localhost:3000/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "publicKey": "GDJXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "challenge": "eziagric-auth-1729234567890-9a8b7c6d",
    "signature": "<base64_signature>"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-10-25T12:00:00.000Z",
  "user": {
    "id": "usr_abc123",
    "publicKey": "GDJXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "role": "buyer"
  }
}
```

**Save the token:**
```bash
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

All subsequent requests use:
```bash
-H "Authorization: Bearer $TOKEN"
```

---

## Trade Lifecycle

### Step 1: Create a commodity listing (seller)

Sellers create listings describing the goods for sale.

```bash
curl -X POST http://localhost:3000/listings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "commodity": "Maize",
    "grade": "Grade A",
    "quantity": "1000.00",
    "unit": "kg",
    "pricePerUnit": "250",
    "currency": "USDC",
    "deliveryLocation": "Nairobi Central Depot",
    "qualityStandards": "Moisture content max 14%, no aflatoxin",
    "expiryDate": "2024-12-31T23:59:59.000Z"
  }'
```

**Response:**
```json
{
  "id": "lst_xyz789",
  "sellerId": "usr_abc123",
  "commodity": "Maize",
  "grade": "Grade A",
  "quantity": "1000.00",
  "unit": "kg",
  "pricePerUnit": "250",
  "currency": "USDC",
  "deliveryLocation": "Nairobi Central Depot",
  "termsHash": "a3f5b8c2d9e1f4a7b3c6d2e8f1a4b7c3d9e2f5a8b1c4d7e3f6a9b2c5d8e1f4a7",
  "status": "active",
  "createdAt": "2024-10-18T10:00:00.000Z"
}
```

**Save the listing ID:**
```bash
export LISTING_ID="lst_xyz789"
```

---

### Step 2: Create a trade (buyer)

The buyer initiates a trade referencing the listing.

```bash
curl -X POST http://localhost:3000/trades \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "listingId": "'$LISTING_ID'",
    "quantity": "500.00",
    "buyerAddress": "GCYXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "sellerAddress": "GDJXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  }'
```

**Response:**
```json
{
  "id": "trd_def456",
  "listingId": "lst_xyz789",
  "buyerId": "usr_buyer789",
  "sellerId": "usr_abc123",
  "status": "created",
  "amount": "125000",
  "currency": "USDC",
  "termsHash": "a3f5b8c2d9e1f4a7b3c6d2e8f1a4b7c3d9e2f5a8b1c4d7e3f6a9b2c5d8e1f4a7",
  "contractTradeId": "42",
  "createdAt": "2024-10-18T10:15:00.000Z"
}
```

**Save the trade ID:**
```bash
export TRADE_ID="trd_def456"
```

---

### Step 3: Fund the escrow (buyer)

The buyer deposits USDC into the Soroban escrow contract. This happens
on-chain via Freighter/wallet, not through the API directly. The backend
polls for `TradeFundedEvent` and updates the trade status automatically.

**Pseudo-curl for reference (actual: wallet UI):**
```bash
# Buyer signs Stellar transaction calling:
# amana_escrow::fund_trade(trade_id: 42, amount: 125000 USDC)
# Backend event listener detects TradeFundedEvent and updates trade status to "funded"
```

**Check trade status:**
```bash
curl -X GET http://localhost:3000/trades/$TRADE_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Response (after funding):**
```json
{
  "id": "trd_def456",
  "status": "funded",
  "amount": "125000",
  "fundedAt": "2024-10-18T10:20:00.000Z",
  ...
}
```

---

### Step 4: Submit delivery manifest (seller)

The seller confirms delivery by uploading a manifest with driver details
and delivery timestamp.

```bash
curl -X POST http://localhost:3000/trades/$TRADE_ID/manifest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "driverIdentity": "DL-123456789",
    "vehiclePlate": "KBZ-456X",
    "deliveryTimestamp": "2024-10-20T14:30:00.000Z",
    "deliveryLocation": "Nairobi Central Depot, Gate 3",
    "notes": "Delivered 10 bags of 50kg each, signed by warehouse supervisor John Kamau"
  }'
```

**Response:**
```json
{
  "id": "mnf_ghi789",
  "tradeId": "trd_def456",
  "driverIdentityHash": "b4c7d9e1f3a5b8c2d4e6f1a3b5c7d9e2f4a6b8c1d3e5f7a9b2c4d6e8f1a3b5c7",
  "vehiclePlate": "KBZ-456X",
  "deliveryTimestamp": "2024-10-20T14:30:00.000Z",
  "submittedAt": "2024-10-20T14:35:00.000Z",
  "status": "submitted"
}
```

On-chain call: `amana_escrow::mark_delivered(trade_id: 42)` (wallet-signed).

---

### Step 5a: Accept delivery (buyer, happy path)

The buyer accepts the goods, releasing funds to the seller.

```bash
curl -X POST http://localhost:3000/trades/$TRADE_ID/accept \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response:**
```json
{
  "id": "trd_def456",
  "status": "completed",
  "completedAt": "2024-10-22T09:00:00.000Z",
  "releasedAmount": "125000",
  "buyerShare": "0",
  "sellerShare": "125000"
}
```

On-chain call: `amana_escrow::release(trade_id: 42)` (buyer signs).

---

### Step 5b: Raise dispute (buyer, unhappy path)

The buyer disputes delivery quality/quantity.

```bash
curl -X POST http://localhost:3000/trades/$TRADE_ID/dispute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "quality_mismatch",
    "reason": "Moisture content exceeded 14%, bags showed signs of mold",
    "requestedResolution": "50% refund"
  }'
```

**Response:**
```json
{
  "id": "dsp_jkl012",
  "tradeId": "trd_def456",
  "category": "quality_mismatch",
  "status": "open",
  "raisedBy": "usr_buyer789",
  "raisedAt": "2024-10-22T09:00:00.000Z"
}
```

On-chain call: `amana_escrow::raise_dispute(trade_id: 42)`.

---

### Step 6: Upload evidence (both parties)

Both buyer and seller can upload photos/videos to support their case.

**Buyer uploads evidence:**
```bash
curl -X POST http://localhost:3000/disputes/dsp_jkl012/evidence \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/mold_photo.jpg" \
  -F "description=Photo showing mold on bags 3, 5, and 7" \
  -F "capturedAt=2024-10-20T14:35:00.000Z"
```

**Response:**
```json
{
  "id": "evd_mno345",
  "disputeId": "dsp_jkl012",
  "uploadedBy": "usr_buyer789",
  "fileUrl": "https://storage.eziagric.example/evidence/evd_mno345.jpg",
  "description": "Photo showing mold on bags 3, 5, and 7",
  "uploadedAt": "2024-10-22T09:15:00.000Z"
}
```

---

### Step 7: Mediator resolves dispute

A verified mediator reviews evidence and issues a ruling.

```bash
curl -X POST http://localhost:3000/disputes/dsp_jkl012/resolve \
  -H "Authorization: Bearer $MEDIATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sellerGetsBps": 5000,
    "rationale": "Evidence confirms quality degradation affecting ~30% of shipment. Split: buyer 50%, seller 50%."
  }'
```

**Response:**
```json
{
  "id": "dsp_jkl012",
  "status": "resolved",
  "sellerGetsBps": 5000,
  "buyerShare": "62500",
  "sellerShare": "62500",
  "resolvedBy": "usr_mediator456",
  "resolvedAt": "2024-10-23T16:00:00.000Z"
}
```

On-chain call: `amana_escrow::resolve(trade_id: 42, seller_gets_bps: 5000)`.

---

### Step 8: Release disputed funds (automated)

After mediator resolution, the contract automatically splits funds. No
additional API call needed - the backend's event listener picks up
`TradeResolvedEvent` and updates trade status to `completed`.

**Check final trade state:**
```bash
curl -X GET http://localhost:3000/trades/$TRADE_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "id": "trd_def456",
  "status": "completed",
  "completedAt": "2024-10-23T16:05:00.000Z",
  "releasedAmount": "125000",
  "buyerShare": "62500",
  "sellerShare": "62500",
  "dispute": {
    "id": "dsp_jkl012",
    "status": "resolved",
    "sellerGetsBps": 5000
  }
}
```

---

## Error Handling

### Authentication errors

```bash
# Missing token
curl -X GET http://localhost:3000/trades/$TRADE_ID

# Response (401):
{
  "error": "Unauthorized",
  "message": "Missing or invalid authentication token"
}
```

### Validation errors

```bash
# Invalid listing quantity
curl -X POST http://localhost:3000/listings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"commodity": "Maize", "quantity": "-100"}'

# Response (400):
{
  "error": "ValidationError",
  "message": "quantity must be a positive number",
  "field": "quantity"
}
```

### State transition errors

```bash
# Try to accept an already-completed trade
curl -X POST http://localhost:3000/trades/$TRADE_ID/accept \
  -H "Authorization: Bearer $TOKEN"

# Response (409):
{
  "error": "InvalidStateTransition",
  "message": "Trade is already completed",
  "currentStatus": "completed"
}
```

---

## Testing Against Local Backend

### Start backend

```bash
cd backend
npm install
npm run db:migrate
npm run dev
# Backend runs at http://localhost:3000
```

### Create test accounts

```bash
# Use Stellar Laboratory or CLI to create testnet accounts:
# https://laboratory.stellar.org/#account-creator?network=test

# Fund with Friendbot:
curl "https://friendbot.stellar.org?addr=GYOUR_PUBLIC_KEY_HERE"
```

### Run example flow

```bash
# 1. Authenticate as seller
export SELLER_PK="GDJXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
CHALLENGE=$(curl -s -X POST http://localhost:3000/auth/challenge \
  -H "Content-Type: application/json" \
  -d "{\"publicKey\": \"$SELLER_PK\"}" | jq -r '.challenge')

# 2. Sign challenge (manual step via Freighter), then verify
export TOKEN=$(curl -s -X POST http://localhost:3000/auth/verify \
  -H "Content-Type: application/json" \
  -d "{\"publicKey\": \"$SELLER_PK\", \"challenge\": \"$CHALLENGE\", \"signature\": \"$SIGNATURE\"}" \
  | jq -r '.token')

# 3. Create listing
export LISTING_ID=$(curl -s -X POST http://localhost:3000/listings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"commodity":"Maize","grade":"Grade A","quantity":"1000.00","unit":"kg","pricePerUnit":"250","currency":"USDC","deliveryLocation":"Nairobi"}' \
  | jq -r '.id')

# 4. Create trade (switch to buyer token)
# ... (repeat auth flow for buyer)

# 5. Fund escrow (Freighter UI)

# 6. Continue with manifest → accept/dispute → resolution
```

---

## OpenAPI Reference

Full API specification: [backend/src/docs/openapi.yaml](../../backend/src/docs/openapi.yaml)

Interactive docs (when backend is running): http://localhost:3000/api-docs

---

## See Also

- [docs/api/overview.md](./overview.md) - API architecture and conventions
- [docs/api/trades.md](./trades.md) - Detailed trade endpoint documentation
- [docs/event-flow.md](../event-flow.md) - How on-chain events sync to off-chain state
- [docs/adr/ADR-003-offchain-vs-onchain-data-partitioning.md](../adr/ADR-003-offchain-vs-onchain-data-partitioning.md) - Why listings and trades are split on-chain/off-chain
