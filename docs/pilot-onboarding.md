# Pilot Onboarding Checklist and Tracker

This document defines what "onboarded" means for a regional agricultural cooperative in the Phase 4 public pilot, and provides a tracker template for following each cooperative through onboarding.

A cooperative is **onboarded** only when all four stages below are complete and the first trade has settled on-chain.

## Onboarding Checklist

### 1. Accounts

- [ ] Cooperative legal entity and primary contact recorded
- [ ] Named cooperative administrator account created in Amana
- [ ] Member accounts created for every farmer or buyer who will transact
- [ ] Each account's role (farmer, buyer, mediator, admin) confirmed by the pilot lead
- [ ] Personal data collected with consent and stored per [`pii-encryption.md`](pii-encryption.md)

### 2. Wallets

- [ ] Stellar wallet created or connected for every account that will sign transactions
- [ ] Wallet funded on the pilot network and trustline to the pilot asset established
- [ ] Wallet address verified by the account holder (test transaction or signed message)
- [ ] Recovery process explained to the account holder and recorded

### 3. Training

- [ ] Cooperative administrator completed the platform walkthrough (trade creation, deposits, releases, refunds)
- [ ] Members completed the basic training session (wallet use, deposit, confirming delivery)
- [ ] Mediator contact trained on the dispute-resolution dashboard
- [ ] Support contact and escalation path shared with the cooperative
- [ ] Training attendance recorded with date and attendees

### 4. First Trade

- [ ] Test trade created on the pilot network with a cooperative-approved counterparty
- [ ] Deposit, delivery evidence upload, and release completed end to end
- [ ] Trade settlement confirmed on-chain and reflected in the cooperative's dashboard
- [ ] Any issues logged in the tracker and resolved or accepted by the pilot lead
- [ ] Cooperative sign-off recorded

## Tracker Template

Copy one row per cooperative into the pilot tracker. Use `✅` when a stage is complete, `🟡` when in progress, and `⬜` when not started.

| Cooperative | Admin contact | Accounts | Wallets | Training | First trade | Onboarded (date) | Owner | Notes |
|---|---|---|---|---|---|---|---|---|
| _Example Co-op_ | _name / role_ | ⬜ | ⬜ | ⬜ | ⬜ | — | _pilot lead_ | _blockers, open issues_ |

### Issue Log

| Date | Cooperative | Stage | Issue | Owner | Status |
|---|---|---|---|---|---|
| YYYY-MM-DD | _name_ | _stage_ | _short description_ | _name_ | Open / Resolved |

## Ownership

The pilot lead maintains the tracker and signs off each stage. Engineering supports account, wallet, and first-trade issues. Record decisions that change this checklist in a pull request against this file.
