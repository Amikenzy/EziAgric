<!--
  Translation notes
  - This is the English source. To translate, copy this file to
    docs/user-guides/<language-code>/buyer-guide.md (for example `ha` for
    Hausa, `yo` for Yoruba, `ig` for Igbo) and translate the text.
  - Keep every <a id="..."></a> anchor, file name and screenshot name in
    English, so links keep working in every language.
  - Words in bold quotes such as **"Accept Goods"** are labels on the screen.
    Keep them in English until the app itself is translated.
  - Screenshots go in docs/user-guides/images/ and are shared by all
    languages. Each slot is marked with a `screenshot:` comment.
-->

# Buying on EziAgric: a guide for buyers

This guide is for people and businesses who buy produce on EziAgric. It uses
plain words. You do not need to know anything about computers or money
technology to follow it.

**In short:** you pay in naira. Your money is locked in a safe place that
nobody can touch — not even the seller. The seller sends the goods. You check
them, record a short video, and only then is the seller paid. If something is
wrong, a neutral mediator decides.

## Contents

1. [How EziAgric protects you](#how-it-protects-you)
2. [What you need before you start](#before-you-start)
3. [Step 1: Set up your wallet](#step-1-wallet)
4. [Step 2: Create a trade](#step-2-create-trade)
5. [Step 3: Pay in naira](#step-3-pay)
6. [Step 4: Wait for the goods](#step-4-wait)
7. [Step 5: Check the goods and record a video](#step-5-check)
8. [Step 6: Accept the goods](#step-6-accept)
9. [If only part of the goods arrive](#partial-delivery)
10. [If something is wrong: open a dispute](#disputes)
11. [What happens in a dispute](#dispute-process)
12. [Cancelling and deadlines](#cancel-and-deadlines)
13. [Frequently asked questions](#faq)
14. [Words you will see](#glossary)
15. [Getting help](#help)

---

<a id="how-it-protects-you"></a>

## How EziAgric protects you

Buying from a seller far away is risky. If you pay first, the goods may
never come, or may arrive damaged or short.

EziAgric solves this with **escrow**. Escrow means your money is held by a
neutral keeper until the delivery is done. On EziAgric the keeper is a
computer program on the Stellar network. Nobody — not the seller, not you,
and not EziAgric staff — can take the money out early.

The seller is paid only when **you** accept the goods, or when a mediator
decides a dispute.

Your money is held as **cNGN**, a digital naira designed to stay worth 1
naira. So its value does not go up and down while the goods are on the road.

<a id="before-you-start"></a>

## What you need before you start

- A smartphone or computer with internet and a camera.
- An EziAgric account.
- A **wallet** with enough money for your purchase (see Step 1).
- The seller's **wallet address** (a code that starts with **G**). The
  seller gives it to you.

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
4. Add money to your wallet. EziAgric support can tell you the supported ways
   to top up your wallet with naira.
5. Open EziAgric and choose **"Connect Wallet"** (on some pages
   **"Connect Freighter"**), then **"Sign In"**. Approve the requests in your
   wallet app.

<!-- screenshot: buyer-01-connect-wallet.png — the "Connect Wallet" button and the Freighter approval pop-up -->

<a id="step-2-create-trade"></a>

## Step 2: Create a trade

Find the produce you want on the **Marketplace**, then open **"Create
Trade"**. There are three short steps.

**Details**

1. Choose the **commodity** (for example maize, rice or cassava).
2. Enter the **quantity**, the **unit** and the **price per unit**.
3. Enter the seller's wallet address in **"Seller Address"**. Check it
   carefully — it must be the address the seller gave you.
4. Set the **"Delivery Window (days)"**: how many days the seller has to
   deliver (from 1 to 90).

**Negotiation — the loss ratio**

Sometimes goods are damaged, stolen or lost on the road. The **loss ratio**
says how you and the seller share that loss. Agree it with the seller before
you create the trade, because it can never be changed afterwards — not even
by a mediator.

| Loss ratio (buyer / seller) | Meaning |
| --- | --- |
| 50 / 50 | You and the seller each carry half of any loss. |
| 70 / 30 | You carry 70 % of a loss, the seller carries 30 %. |
| 30 / 70 | You carry 30 % of a loss, the seller carries 70 %. |

The screen shows what each choice means as **"Buyer absorbs"** and
**"Seller absorbs"**. The two numbers must add up to 100 %.

**Review**

Check every detail and the **"Total Value"**.

<!-- screenshot: buyer-02-create-trade.png — the Details step with commodity, quantity, price and seller address -->
<!-- screenshot: buyer-03-loss-ratio.png — the Negotiation step showing "Buyer absorbs" and "Seller absorbs" -->

<a id="step-3-pay"></a>

## Step 3: Pay in naira

1. On the Review step, choose **"Lock Funds & Create Trade"**.
2. EziAgric shows how much naira (NGN) you will pay. Your naira is changed
   into cNGN and locked in escrow in one step.
3. Approve the payment in your wallet app.
4. The trade shows **"Funds Locked"** (status "Funded"). The seller is told
   that you have paid and that they can send the goods.

Your money is now safe: the seller cannot receive it until you accept the
goods or a mediator decides.

<!-- screenshot: buyer-04-funds-locked.png — the trade showing "Funds Locked in escrow vault" -->

<a id="step-4-wait"></a>

## Step 4: Wait for the goods

The seller loads the goods and records the driver's name, phone number and
vehicle. This record is called the **manifest**. The driver confirms it
through a link sent by SMS.

You can follow the trade on the **Trades** page and the **Dashboard**. The
trade timeline shows each step.

<a id="step-5-check"></a>

## Step 5: Check the goods and record a video

When the goods arrive, **check them before you accept anything**.

1. Count the bags or weigh the goods.
2. Check the quality: look for mould, wet bags, damage or the wrong
   commodity.
3. On the trade page, choose **"Confirm Delivery"**. The **"Delivery
   Verification"** window opens.
4. Record a short **Proof of Delivery** video in the app, or upload one from
   your phone. If your device cannot record in the app, upload a video file
   instead.

**A good Proof of Delivery video:**

- is recorded **at unloading**, when the goods arrive — not days later;
- shows the bags, labels and the vehicle if possible;
- shows the count or the weighbridge reading;
- shows clearly any damage or problem;
- is steady and well lit.

<!-- screenshot: buyer-05-delivery-verification.png — the "Delivery Verification" window with the video upload -->

<a id="step-6-accept"></a>

## Step 6: Accept the goods

If everything is correct, choose **"Accept Goods"** and approve it in your
wallet.

- The seller is paid straight away. A small **platform fee** (currently 1 %)
  is taken from the seller's payment — you pay nothing extra.
- **This cannot be undone.** Only accept goods you have checked.
- The trade shows **"Funds Released"** and becomes "Completed".

The **"Accept Goods"** button only works after you add your video.

<!-- screenshot: buyer-06-funds-released.png — a completed trade showing "Funds Released" -->

<a id="partial-delivery"></a>

## If only part of the goods arrive

If some of the goods arrived but not all (for example 80 of 100 bags), you
can confirm a **partial delivery** instead of a dispute. EziAgric calculates
a fair split:

- The seller is paid for the goods that arrived, minus the platform fee.
- For the goods that did not arrive, the loss is shared using your loss
  ratio.
- You are refunded the rest.

**Example:** 100 bags at ₦1,000 each (₦100,000 locked), loss ratio 50 / 50,
80 bags arrive:

| | Amount |
| --- | --- |
| The 20 missing bags were worth | ₦20,000 |
| The seller's half of that loss | ₦10,000 |
| **You are refunded** | **₦30,000** (the ₦20,000 for the missing bags plus the seller's ₦10,000 share of the loss) |
| **The seller receives** | **₦69,200** (₦80,000 for the bags that arrived, minus ₦800 fee and ₦10,000 loss share) |

The seller has **3 days** to accept the split. If the seller does not accept,
either of you can send the trade to a dispute. Your money stays locked the
whole time.

<a id="disputes"></a>

## If something is wrong: open a dispute

Do **not** accept the goods if there is a problem. Open a dispute instead.
On the trade page or in the **"Delivery Verification"** window, choose
**"Raise Dispute"** (or **"Open Dispute"**), choose the reason, and describe
the problem clearly.

| Reason on screen | Use it when | Helpful evidence |
| --- | --- | --- |
| **Non-Delivery** | The goods never arrived within the delivery window. | Proof that the window has passed; your messages with the seller. |
| **Quality / Defect** | The goods are damaged or not the agreed quality. | Photo or video showing the defect; an inspection report if you have one. |
| **Wrong Quantity** | Fewer goods arrived than agreed. | Weigh-slip or count at unloading; photos of the quantity. |
| **Payment / Funding Issue** | The payment or the escrow looks wrong. | Screenshot of the trade status when it happened. |
| **Other** | Anything else. | A clear written description and any supporting files. |

<!-- screenshot: buyer-07-open-dispute.png — the dispute form with the list of reasons -->

<a id="dispute-process"></a>

## What happens in a dispute

1. **The money stays locked.** Nobody can move it until the dispute is
   decided.
2. **Both sides add evidence.** You add your video, photos and documents.
   The seller adds loading videos, the manifest, the driver's confirmation
   and receipts.
3. **A mediator reviews it.** A trained, neutral mediator looks at all the
   evidence and the listing terms. For high-value trades, several mediators
   vote, so no single person decides.
4. **The mediator decides.** The decision is the share of the trade value
   the seller earned — from 0 % (you get everything back) to 100 % (the
   seller is paid in full). Mediators aim to decide within **72 hours**.
5. **The money is paid out.** For the part the seller did not earn, the loss
   ratio you agreed is applied. The platform fee is only taken from the
   seller's part — never from your refund.

**Example:** you locked ₦100,000 with a 50 / 50 loss ratio. The mediator
decides the seller earned 70 % because 30 % of the goods were spoiled. The
₦30,000 loss is shared 50 / 50: you are refunded ₦15,000, and the seller
receives ₦85,000 minus the platform fee.

**Strong evidence wins.** Videos taken at unloading, weigh-slips and
inspection reports carry the most weight. If the seller cannot show that the
goods were sent, the mediator usually decides in your favour.

**Appeals.** If you think the decision is wrong, you can appeal within
**7 days** — but only with **new** evidence, or if the mediator made a clear
mistake. Simply disagreeing is not enough.

<a id="cancel-and-deadlines"></a>

## Cancelling and deadlines

- **Before you pay**, you or the seller can cancel the trade. No money moves.
- **If the seller cannot deliver**, they can refund you in full.
- **If the delivery window ends** and you have not confirmed delivery or
  opened a dispute, you can take a **full refund**.
- If the seller asks for more time, you can agree to an extension. A deadline
  can be extended at most 3 times, and by at most 30 days in total. You do
  not have to agree.

<a id="faq"></a>

## Frequently asked questions

**Can the seller take my money before I receive the goods?**
No. The money is locked in escrow. The seller is paid only when you choose
"Accept Goods", or when a mediator decides a dispute.

**Can EziAgric staff take my money?**
Not in normal operation. The escrow is a program on the Stellar network, and
trade money only moves by its rules. An emergency recovery control exists for
serious security incidents only, and it must wait through a public waiting
period before it can run.

**Do I pay a fee as a buyer?**
No. The platform fee (currently 1 %) is taken from the seller's payment. You
are never charged a fee on money refunded to you.

**What if the goods arrive damaged?**
Do not choose "Accept Goods". Record a video at unloading and choose "Raise
Dispute" with the reason **"Quality / Defect"**.

**What if the seller never delivers?**
If the delivery window ends without delivery, you can take a full refund. You
can also open a dispute with the reason **"Non-Delivery"**.

**I chose "Accept Goods" by mistake. Can I undo it?**
No. Accepting releases the money to the seller and cannot be reversed.
Contact the seller directly and EziAgric support.

**Why must I record a video?**
The video is your proof of what arrived and in what condition. The
"Accept Goods" button only works after you add it, and in a dispute it is
the most important evidence a mediator looks at.

**What is the loss ratio, and can it change later?**
It is how you and the seller share a loss if goods are damaged or lost on the
road. It is fixed when you create the trade and never changes — not even a
mediator can change it.

**Why do I see cNGN instead of naira?**
cNGN is a digital naira, designed to stay worth 1 naira. It lets the escrow
hold your money safely on the Stellar network.

**I lost my recovery phrase. What now?**
Without the recovery phrase, nobody can restore your wallet — not even
EziAgric. Always keep it written down in a safe place.

<a id="glossary"></a>

## Words you will see

| Word | Meaning |
| --- | --- |
| **Escrow** | Money held by a neutral keeper until the delivery is done. |
| **cNGN** | A digital naira, designed to stay worth 1 naira. Your payment is held in cNGN. |
| **Loss ratio** | How you and the seller share a loss if goods are damaged or lost on the road, for example 50 / 50. Fixed when the trade is created. |
| **Wallet** | The app that holds your EziAgric money and lets you approve payments. |
| **Wallet address** | A code that starts with **G**. Safe to share. |
| **Recovery phrase** | The secret list of words that can restore your wallet. Never share it. |
| **Trade** | One purchase agreed with one seller. |
| **Delivery window** | The number of days the seller has to deliver. |
| **Manifest** | The seller's dispatch record: driver, phone number, vehicle and goods. |
| **Proof of Delivery** | The short video you record when the goods arrive. |
| **Dispute** | A complaint about a delivery, decided by a mediator. |
| **Mediator** | A trained, neutral person who reviews evidence and decides a dispute. |
| **Platform fee** | A small fee (currently 1 %) taken from the seller's payment. |

<a id="help"></a>

## Getting help

- For problems with a trade, contact EziAgric support.
- If you buy through a cooperative, your cooperative administrator can help
  with accounts and wallets.
