<!--
  Translation notes
  - This is the English source. To translate, copy this file to
    docs/user-guides/<language-code>/seller-guide.md (for example `ha` for
    Hausa, `yo` for Yoruba, `ig` for Igbo) and translate the text.
  - Keep every <a id="..."></a> anchor, file name and screenshot name in
    English, so links keep working in every language.
  - Words in bold quotes such as **"Funds Locked"** are labels on the screen.
    Keep them in English until the app itself is translated.
  - Screenshots go in docs/user-guides/images/ and are shared by all
    languages. Each slot is marked with a `screenshot:` comment.
-->

# Selling on EziAgric: a guide for farmers and cooperatives

This guide is for farmers and cooperatives who sell produce on EziAgric. It
uses plain words. You do not need to know anything about computers or money
technology to follow it.

**In short:** the buyer pays first. The money is locked in a safe place that
nobody can touch. You send the goods. When the buyer confirms that the goods
arrived, the money is paid to you.

## Contents

1. [How EziAgric protects you](#how-it-protects-you)
2. [What you need before you start](#before-you-start)
3. [Step 1: Set up your wallet](#step-1-wallet)
4. [Step 2: List your produce](#step-2-list)
5. [Step 3: Agree a trade with a buyer](#step-3-trade)
6. [Step 4: Wait until the money is locked](#step-4-funded)
7. [Step 5: Send the goods](#step-5-dispatch)
8. [Step 6: Get paid](#step-6-get-paid)
9. [If only part of the goods arrive](#partial-delivery)
10. [If the buyer opens a dispute](#disputes)
11. [Cancelling and deadlines](#cancel-and-deadlines)
12. [Tips to protect yourself](#tips)
13. [Words you will see](#glossary)
14. [Getting help](#help)

---

<a id="how-it-protects-you"></a>

## How EziAgric protects you

Selling to a buyer far away is risky. If you send first, the buyer may not
pay. If the buyer pays first, they may be afraid you will not send.

EziAgric solves this with **escrow**. Escrow means the buyer's money is held
by a neutral keeper until the delivery is done. On EziAgric the keeper is a
computer program on the Stellar network. Nobody — not the buyer, not you, and
not EziAgric staff — can take the money out early.

The money is held as **cNGN**. cNGN is a digital naira, designed to stay
worth 1 naira. So the value of your sale does not go up and down while the
goods are on the road.

<a id="before-you-start"></a>

## What you need before you start

- A smartphone or computer with internet.
- An EziAgric account. If you trade through a cooperative, your cooperative
  administrator creates it for you.
- A **wallet** (see Step 1). Your cooperative administrator or EziAgric
  support can help you set it up.
- Your produce details: what it is, its quality, how much you have, and your
  price per unit.

<a id="step-1-wallet"></a>

## Step 1: Set up your wallet

A **wallet** is an app that holds your EziAgric money and lets you approve
payments. Only you can use it.

1. Install a Stellar wallet, for example **Freighter** (a browser extension
   for computers).
2. Create a new wallet in the app.
3. The app shows you a **recovery phrase** (a list of words). Write it on
   paper and keep it somewhere safe and private.
   - Anyone with these words can take your money.
   - EziAgric staff will **never** ask for them.
   - If you lose your device, these words are the only way to get your
     wallet back.
4. Your wallet must be allowed to hold cNGN. This one-time setting is called
   a **trustline**. Your cooperative administrator or EziAgric support will
   help you add it.
5. Open EziAgric and choose **"Connect Wallet"** (on some pages
   **"Connect Freighter"**). Approve the request in your wallet app.
6. Check that the wallet address shown in EziAgric is the same as the
   address in your wallet app. It is a long code that starts with the letter
   **G**.

<!-- screenshot: seller-01-connect-wallet.png — the "Connect Wallet" button and the Freighter approval pop-up -->

<a id="step-2-list"></a>

## Step 2: List your produce

Your listing tells buyers what you are selling. Fill it in carefully: if
there is ever a dispute, the listing is the promise you will be held to.

For now, listings are added with the help of your cooperative administrator
or the EziAgric team. Give them:

1. The **commodity** (for example maize, rice or cassava).
2. The **quantity** and the **unit** (for example 100 bags of 50 kg).
3. Your **price per unit** in naira (NGN).
4. An honest description of the **quality or grade**, with clear photos of
   the actual produce.

Buyers can then see your listing on the **Marketplace**.

<!-- screenshot: seller-02-marketplace-listing.png — a published listing on the Marketplace -->

> When a trade is created, EziAgric saves a fingerprint of the listing
> terms. If the listing is changed later, the fingerprint no longer matches.
> This protects both you and the buyer from changed promises.

<a id="step-3-trade"></a>

## Step 3: Agree a trade with a buyer

A buyer who wants your produce creates a **trade**. To do this, the buyer
needs your **wallet address** (the code that starts with **G**). Share it
with the buyer — it is safe to share. Never share your recovery phrase.

The trade records the commodity, quantity, price and the **loss ratio**.

<a id="loss-ratio"></a>

### What is the loss ratio?

Sometimes goods are damaged, stolen or lost on the road. The **loss ratio**
says how you and the buyer share that loss. It is agreed **before** anything
is sent and it can never be changed afterwards — not even by a mediator.

| Loss ratio | Meaning |
| --- | --- |
| 50 / 50 | You and the buyer each carry half of any loss. |
| 70 / 30 (buyer / seller) | The buyer carries 70 % of a loss, you carry 30 %. |
| 30 / 70 (buyer / seller) | The buyer carries 30 % of a loss, you carry 70 %. |

The trade screen shows this as **"Buyer absorbs"** and **"Seller absorbs"**.
Talk with the buyer and only trade with a ratio you are comfortable with.

<!-- screenshot: seller-03-loss-ratio.png — the trade showing "Buyer absorbs" and "Seller absorbs" -->

<a id="step-4-funded"></a>

## Step 4: Wait until the money is locked

After the trade is created, the buyer pays. Their naira is changed into cNGN
and locked in escrow.

**Do not send any goods until the trade shows "Funds Locked" (status
"Funded").** Before that, the buyer has not paid.

You can follow your trades on the **Dashboard**, the **Trades** page and the
**Vault** page.

<!-- screenshot: seller-04-funds-locked.png — a trade showing "Funds Locked" / "FUNDED" -->

<a id="step-5-dispatch"></a>

## Step 5: Send the goods

1. Load the goods. **Take a short video or photos while loading.** Show the
   bags, the quantity and the quality. Keep these files.
2. Open the **Vault** page, find the funded trade, and fill in the
   **"Contract Manifest"**: the **"Driver Name"**, the **"Driver Phone"** and
   the shipment details. Approve it in your wallet. This record is called the
   **manifest**.
3. The driver receives an **SMS with a link**. Ask the driver to open it and
   confirm. A manifest the driver has confirmed is much stronger evidence if
   there is ever a problem.
4. Keep your receipts: weighbridge tickets, loading tally and quality
   certificates.

<!-- screenshot: seller-05-contract-manifest.png — the Vault "Contract Manifest" form with driver name and phone -->

<a id="step-6-get-paid"></a>

## Step 6: Get paid

1. When the goods arrive, the buyer checks them and records a short **Proof
   of Delivery** video.
2. The buyer confirms the delivery in EziAgric.
3. The money is released to your wallet. A small **platform fee** (currently
   1 %) is taken from your payment. Nothing else is deducted.
4. The trade shows **"Funds Released"** and its status becomes "Completed".

**Example:** you sell 100 bags at ₦1,000 each = ₦100,000. The buyer confirms
the delivery. You receive ₦99,000 in cNGN, and the platform fee is ₦1,000.

To change cNGN into naira in your bank account, follow the cash-out steps
that your cooperative or EziAgric support gives you.

<!-- screenshot: seller-06-funds-released.png — a completed trade showing "Funds Released" -->

<a id="partial-delivery"></a>

## If only part of the goods arrive

If only some of the goods arrive (for example 80 of 100 bags), the buyer can
confirm a **partial delivery** instead of opening a dispute. EziAgric then
calculates a fair split:

- You are paid for the goods that arrived, minus the platform fee.
- For the goods that did not arrive, the loss is shared using your loss
  ratio.
- The buyer is refunded the rest.

**Example:** 100 bags at ₦1,000 each (₦100,000 locked), loss ratio 50 / 50,
80 bags arrive:

| | Amount |
| --- | --- |
| Value of the 80 bags that arrived | ₦80,000 |
| Platform fee (1 % of ₦80,000) | − ₦800 |
| Your half of the ₦20,000 loss | − ₦10,000 |
| **You receive** | **₦69,200** |
| **The buyer is refunded** | **₦30,000** |

You have **3 days** to **accept** the split. Nothing is paid until you
accept. If you do not agree, do not accept: after 3 days either of you can
send the trade to a dispute, and a mediator decides. The money stays locked
the whole time.

<a id="disputes"></a>

## If the buyer opens a dispute

A buyer can open a **dispute** if the goods are missing, damaged, late, short
or not what was promised. The money stays locked until the dispute is
resolved.

What happens:

1. You are told that a dispute was opened.
2. **Upload your evidence** on the trade page: loading videos and photos, the
   manifest, the driver's confirmation, receipts and quality certificates.
3. A trained, neutral **mediator** reviews the evidence from both sides. For
   high-value trades, several mediators vote.
4. The mediator decides what share of the trade value you earned — from 0 %
   to 100 %. The loss ratio you agreed is then applied to the rest.
5. The money is paid out according to the decision. The platform fee is only
   taken from the part paid to you.

Mediators aim to decide within **72 hours**. If you think the decision is
wrong, you can **appeal within 7 days** — but only with new evidence, or if
the mediator made a clear mistake.

**What makes evidence strong:**

- Videos and photos taken **at loading**, with the bags, labels and place
  visible.
- A manifest **confirmed by the driver** through the SMS link.
- Weighbridge tickets and quality certificates dated close to dispatch.

**What makes evidence weak:** general photos ("a pile of grain"), photos
taken long after dispatch, and "quality guarantee" letters you wrote
yourself.

If you send no evidence, the decision usually goes against you, because the
seller must show that the goods were sent.

<a id="cancel-and-deadlines"></a>

## Cancelling and deadlines

- **Before the buyer pays**, either of you can cancel the trade. No money
  moves.
- **After the buyer pays**, if you cannot deliver, you can **refund** the
  buyer in full instead of waiting for a dispute.
- Every trade has a **delivery deadline**. If the deadline passes and the
  delivery has not been confirmed, the buyer can take a full refund. If you
  need more time, ask the buyer to agree to an extension. A deadline can be
  extended at most 3 times, and by at most 30 days in total.

<a id="tips"></a>

## Tips to protect yourself

- Never send goods before the trade shows **"Funds Locked"**.
- Never share your wallet recovery phrase with anyone.
- Record a video at loading for every trade.
- Make sure the driver confirms the SMS link.
- Describe your produce honestly.
- Only agree to a loss ratio you understand.

<a id="glossary"></a>

## Words you will see

| Word | Meaning |
| --- | --- |
| **Escrow** | Money held by a neutral keeper until the delivery is done. |
| **cNGN** | A digital naira, designed to stay worth 1 naira. Trade money is held in cNGN. |
| **Loss ratio** | How you and the buyer share a loss if goods are damaged or lost on the road, for example 50 / 50. Agreed before sending and never changed. |
| **Wallet** | The app that holds your EziAgric money and lets you approve payments. |
| **Wallet address** | The code that starts with **G**. Safe to share; people use it to trade with you. |
| **Recovery phrase** | The secret list of words that can restore your wallet. Never share it. |
| **Trustline** | A one-time wallet setting that allows it to hold cNGN. |
| **Listing** | Your advert for produce: what, how much, what quality and what price. |
| **Trade** | One sale agreed with one buyer. |
| **Manifest** | The dispatch record: driver, phone number, vehicle and goods. |
| **Proof of Delivery** | A short video the buyer records when the goods arrive. |
| **Dispute** | A complaint about a delivery, decided by a mediator. |
| **Mediator** | A trained, neutral person who reviews evidence and decides a dispute. |
| **Platform fee** | A small fee (currently 1 %) taken from your payment when a trade is completed. |

<a id="help"></a>

## Getting help

- Your **cooperative administrator** is your first contact for accounts,
  wallets, listings and cash-out.
- For problems with a trade, contact EziAgric support.
- Pilot cooperatives follow the
  [pilot onboarding checklist](../../pilot-onboarding.md).
