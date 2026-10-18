# Mediator Handbook

This handbook provides standardized guidelines for EziAgric mediators
evaluating video evidence, applying loss ratios, and resolving disputes
fairly and consistently.

## Table of Contents

1. [Mediator Role and Responsibilities](#mediator-role-and-responsibilities)
2. [Dispute Categories](#dispute-categories)
3. [Evidence Evaluation Criteria](#evidence-evaluation-criteria)
4. [Loss Ratio Determination](#loss-ratio-determination)
5. [Conflict of Interest Policy](#conflict-of-interest-policy)
6. [Worked Examples](#worked-examples)
7. [Escalation and Appeals](#escalation-and-appeals)

---

## Mediator Role and Responsibilities

### What Mediators Do

- **Review evidence** submitted by buyers and sellers (photos, videos,
  manifests, quality reports).
- **Evaluate claims** against listing terms and delivery manifests.
- **Determine loss ratios** (`seller_gets_bps` from 0 to 10,000 basis
  points) that reflect the degree of seller fulfillment.
- **Write rationales** documenting the reasoning behind each ruling for
  transparency and auditability.
- **Resolve disputes** within 72 hours of assignment (SLA target).

### What Mediators Don't Do

- Mediators **do not adjudicate legal claims** (e.g., breach of contract
  under local law). They apply the platform's escrow rules only.
- Mediators **do not enforce off-platform agreements** (e.g., "The buyer
  promised to pay a bonus" - only the on-chain trade amount matters).
- Mediators **do not investigate** beyond submitted evidence (e.g., no
  site visits, no subpoenas). If evidence is insufficient, the ruling
  defaults to the party with better documentation.

---

## Dispute Categories

Each dispute is tagged with a **category** that guides evaluation:

### 1. Non-Delivery

**Claim:** "The seller never delivered the goods."

**Evidence to review:**
- Delivery manifest: Does one exist? Is it attested by the driver?
- Buyer statement: When/how did the buyer expect delivery?
- Seller response: GPS logs, signed receipts, witness statements.

**Default ruling if evidence is ambiguous:** Favor the buyer (0 bps to
seller) because the seller bears the burden of proving delivery.

---

### 2. Quality Mismatch

**Claim:** "The goods delivered do not match the listing's quality
standards."

**Evidence to review:**
- Listing terms: What grade/quality was promised?
  (Check `terms_hash` against the listing - see ADR-007.)
- Buyer evidence: Photos/videos showing defects (mold, discoloration,
  moisture test results).
- Seller evidence: Pre-shipment quality certificates, lab reports, photos
  at time of packing.

**Ruling scale:**
- **Minor defects (10-20% affected):** 8000-9000 bps (80-90% to seller).
- **Moderate degradation (20-50% affected):** 5000-7000 bps (50-70% to
  seller).
- **Severe/unusable (>50% affected):** 0-3000 bps (0-30% to seller).

---

### 3. Quantity Shortage

**Claim:** "The delivered quantity is less than the listing promised."

**Evidence to review:**
- Listing quantity vs. manifest quantity.
- Buyer weighbridge receipt or unloading tally.
- Seller shipping manifest or loading photos.

**Ruling scale:**
- **Shortage <10%:** 9000 bps (90% to seller) - within acceptable
  variance.
- **Shortage 10-25%:** Pro-rate: `seller_gets_bps = (actual_qty /
  promised_qty) * 10000`.
- **Shortage >25%:** 0-5000 bps depending on whether partial delivery has
  any value to the buyer.

---

### 4. Delivery Deadline Breach

**Claim:** "The seller delivered late, causing losses (e.g., missed
market window)."

**Evidence to review:**
- Listing delivery deadline vs. manifest timestamp.
- Buyer evidence: Market pricing data showing price drop, perishability
  losses.
- Seller evidence: Force majeure claims (weather, vehicle breakdown).

**Ruling scale:**
- **1-2 days late, no perishability:** 9000-9500 bps (minor penalty).
- **3-7 days late, minor market impact:** 7000-8000 bps.
- **>7 days late, severe market impact or spoilage:** 3000-6000 bps.

---

### 5. Wrong Commodity

**Claim:** "The delivered goods are not what the listing described."

**Evidence to review:**
- Listing commodity vs. manifest and buyer photos.
- This is rare but severe - usually fraud.

**Ruling:** 0 bps (full refund to buyer) unless the buyer accepted the
substitution and dispute is only about price adjustment.

---

## Evidence Evaluation Criteria

### Photo/Video Evidence

**What to look for:**
- **Timestamps:** Are the photos dated? Do they match the claimed
  delivery date?
- **Metadata:** EXIF data can be checked for authenticity (location, time).
  Note: Easily spoofed, so cross-reference with other evidence.
- **Context clues:** Does the photo show the trade-specific packaging,
  labels, or location? Generic photos ("a pile of grain") are weak
  evidence.
- **Chain of custody:** For quality issues, buyer photos taken *at
  unloading* are stronger than photos taken days later (could be different
  goods or degraded in buyer's storage).

**Red flags:**
- Stock photos (reverse image search can detect).
- Inconsistent lighting/weather across supposedly sequential photos.
- Photos showing goods in a different location than the manifest claims.

---

### Delivery Manifests

**Attestation status matters:**
- **Attested:** Driver confirmed the delivery via signed link. High
  credibility.
- **Link sent / Link clicked:** Driver was notified but didn't complete
  attestation. Moderate credibility (driver may not have noticed the link).
- **Unverified:** Seller-provided identity with no driver confirmation.
  Low credibility - weigh against buyer claims.

**Driver identity checks:**
- Cross-reference driver name/license with seller's prior trades. Repeated
  use of the same driver across multiple trades increases credibility.
- If the driver identity is generic ("John," no license) or the contact is
  missing, the manifest is weak evidence.

**Terms hash verification:**
- Re-compute the hash from the listing (see ADR-007 canonical JSON rules).
- If the hash doesn't match, the listing was tampered with after trade
  creation - **escalate immediately** (fraud investigation).

---

### Quality Certificates / Lab Reports

**Accepted types:**
- Government-issued inspection certificates.
- Third-party lab reports (moisture, aflatoxin, grade).
- Buyer's own weighbridge receipts or quality tests (if from a reputable
  warehouse with no conflict of interest).

**Not accepted:**
- Seller's self-signed "quality guarantee" letters.
- Reports dated >7 days before delivery (commodities can degrade).

---

## Loss Ratio Determination

The mediator issues a ruling as `seller_gets_bps` (basis points, 0-10,000).

### Calculation Formula

For **partial fulfillment** (e.g., quantity shortage or partial quality
degradation):

```
seller_gets_bps = (acceptable_value / promised_value) * 10000
```

**Example 1:**
- Listing: 1000 kg maize, Grade A, total $250.
- Delivered: 800 kg, Grade A.
- Acceptable value: 80% of promised.
- Ruling: `seller_gets_bps = 8000` (seller gets $200, buyer gets $50).

**Example 2:**
- Listing: 500 kg wheat, Grade A.
- Delivered: 500 kg, but 30% shows mold (Grade B or unusable).
- Acceptable value: ~70% (only 350 kg is Grade A).
- Ruling: `seller_gets_bps = 7000` (seller gets $175, buyer gets $75).

### Adjustments for Buyer Mitigation

If the buyer accepted partial delivery and resold the goods (even at a
loss), they **mitigated damages**. The loss ratio should reflect the
*net* loss, not the gross shortage.

**Example 3:**
- Listing: 1000 kg maize, $250 total.
- Delivered: 1000 kg, but 40% is Grade B (worth $0.60/kg vs. $1.00/kg
  promised).
- Buyer resold the Grade B portion for $240 total revenue (vs. $250
  expected).
- Net buyer loss: $10.
- Ruling: `seller_gets_bps = 9600` (seller gets $240, buyer gets $10).

---

## Conflict of Interest Policy

### Mediators Must Recuse if:

1. **Direct relationship:** The mediator knows the buyer or seller
   personally, or has a business relationship with them outside the
   platform.
2. **Financial interest:** The mediator holds tokens/equity in the seller's
   business, or stands to gain from the dispute outcome.
3. **Prior involvement:** The mediator previously mediated a dispute
   between the same buyer and seller and ruled in favor of one party -
   mediators may not repeatedly rule on disputes involving the same pair to
   avoid bias.
4. **Geographic conflict:** The mediator lives in the same town as one
   party and the dispute involves local reputation (rare, but possible in
   small communities).

### Recusal Process

1. The mediator flags the conflict in the dispute dashboard immediately
   upon assignment.
2. The system reassigns the dispute to another mediator from the available
   pool.
3. If no other mediator is available without a conflict, escalate to the
   **senior mediator pool** (platform-appointed arbiters with broader
   jurisdiction).

### Disclosure Requirement

Before issuing a ruling, the mediator must confirm (checkbox in the UI):
"I have no conflict of interest in this dispute and have evaluated it
impartially."

False declarations are grounds for mediator suspension and case review.

---

## Worked Examples

### Example 1: Quantity Shortage with Partial Mitigation

**Facts:**
- Listing: 1000 kg maize, Grade A, $1.00/kg = $1000 total.
- Manifest: 850 kg delivered, Grade A.
- Buyer evidence: Weighbridge receipt showing 850 kg.
- Seller evidence: Pre-shipment photo showing 1000 kg packed, claims 150
  kg was lost in transit (truck accident).

**Evaluation:**
- Shortage: 15%.
- Seller provided evidence of intent to deliver 1000 kg (pre-shipment
  photo).
- Loss in transit is seller's risk (delivery obligation).
- Buyer received 85% of value.

**Ruling:**
- `seller_gets_bps = 8500` (85% of $1000 = $850 to seller, $150 to buyer).
- Rationale: "Seller fulfilled 85% of the promised quantity. Transit loss
  is seller's responsibility, but seller demonstrated good faith with
  pre-shipment evidence."

---

### Example 2: Quality Mismatch with Attestation

**Facts:**
- Listing: 500 kg wheat, Grade A, moisture <12%, $2.00/kg = $1000 total.
- Manifest: 500 kg delivered, driver attestation: attested.
- Buyer evidence: Lab report showing moisture 15%, photos of damp grain.
- Seller evidence: Pre-shipment moisture test showing 11%, claims moisture
  rose during buyer's storage.

**Evaluation:**
- Listing promised <12% moisture (Grade A). Delivered grain at 15%
  moisture is Grade B (lower value).
- Seller's pre-shipment test is credible, but delivery was the seller's
  obligation.
- Driver attestation confirms delivery occurred, but doesn't verify grain
  condition.
- Buyer's lab report is dated same day as delivery (strong chain of
  custody).

**Ruling:**
- `seller_gets_bps = 6000` (60% of $1000 = $600 to seller, $400 to buyer).
- Rationale: "Delivered grain failed to meet Grade A moisture standard.
  Seller's pre-shipment test suggests degradation occurred in transit, but
  seller bears delivery risk. Buyer receives 40% refund reflecting Grade B
  resale value."

---

### Example 3: Non-Delivery with Unverified Manifest

**Facts:**
- Listing: 200 kg beans, Grade A, $500 total.
- Manifest: Submitted by seller, driver identity "John, no license
  provided," attestation: unverified.
- Buyer evidence: Statement that no delivery occurred, security footage
  showing no truck at gate on claimed delivery date.
- Seller evidence: None beyond the manifest.

**Evaluation:**
- Unverified manifest with no driver contact is weak evidence.
- Buyer's security footage contradicts seller's claim.
- Seller provided no GPS logs, receipts, or witness statements.

**Ruling:**
- `seller_gets_bps = 0` (0% of $500 = $0 to seller, $500 to buyer).
- Rationale: "Seller failed to prove delivery. Unverified manifest without
  supporting evidence is insufficient against buyer's denial and security
  footage."

---

### Example 4: Late Delivery with Market Impact

**Facts:**
- Listing: 1000 kg tomatoes, $1.50/kg = $1500 total, delivery by Oct 15.
- Manifest: Delivered Oct 20 (5 days late), driver attestation: attested.
- Buyer evidence: Market pricing data showing tomato prices dropped from
  $1.50/kg to $1.10/kg between Oct 15 and Oct 20 due to seasonal glut.
- Seller evidence: Truck breakdown on Oct 14, repair invoice provided.

**Evaluation:**
- Delivery was late by 5 days.
- Seller provided evidence of force majeure (breakdown), but delivery risk
  is seller's.
- Buyer's loss: $0.40/kg * 1000 kg = $400 (26% loss).

**Ruling:**
- `seller_gets_bps = 7400` (74% of $1500 = $1110 to seller, $390 to buyer).
- Rationale: "Seller delivered correct quantity/quality but 5 days late,
  causing market price drop. Buyer receives compensation reflecting market
  loss. Force majeure claim reduces penalty slightly."

---

## Escalation and Appeals

### When to Escalate

Mediators should escalate disputes to the senior mediator pool if:

1. **Fraud suspected:** Evidence suggests systematic fraud (e.g., seller
   submitting stock photos across multiple trades, `terms_hash` mismatch).
2. **Insufficient evidence:** Both parties provided minimal evidence, and
   the mediator cannot make a fair ruling (rare - default to buyer in most
   cases).
3. **High value:** Disputes over $10,000+ may require senior review for
   legal risk mitigation.
4. **Policy ambiguity:** The dispute doesn't fit existing categories, or
   platform policy is unclear.

### Appeal Process (for Buyers/Sellers)

Either party may appeal a ruling within **7 days** of resolution by:

1. Submitting an appeal form with **new evidence** not available during the
   original dispute.
2. Demonstrating **clear error** in the mediator's reasoning (e.g.,
   mediator ignored submitted evidence, miscalculated loss ratio).

Appeals with no new evidence or that simply disagree with the loss ratio
are **denied** (mediator discretion is final unless clear error).

---

## Mediator Performance Metrics

Mediators are evaluated on:

- **Resolution time:** <72 hours from assignment (SLA target).
- **Appeal rate:** <5% of rulings appealed (quality indicator).
- **Consistency:** Rulings on similar cases should have similar loss ratios
  (monitored via peer review).
- **Rationale quality:** Clear, documented reasoning (spot-checked by
  senior mediators).

---

## References

- [ADR-002: Escrow Loss Sharing Model](./adr/ADR-002-escrow-loss-sharing-model.md) - Contract-level rules for fund splits.
- [ADR-006: Driver Identity and Attestation Model](./adr/ADR-006-driver-identity-and-attestation-model.md) - How driver attestation works.
- [ADR-007: Product Listings On-Chain vs. Off-Chain](./adr/ADR-007-product-listings-on-chain-vs-off-chain.md) - `terms_hash` verification.
- [docs/api/trades.md](./api/trades.md) - Dispute submission and evidence upload API.

---

**Last updated:** October 2024  
**Approved by:** EziAgric Platform Team
