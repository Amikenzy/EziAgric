# Trade lifecycle sequences

The happy path from a signed agreement to money in the seller's hands, plus the
partial-delivery path that exists because shipments regularly arrive short.

## Create, fund, deliver, release

![Trade lifecycle](rendered/trade-lifecycle.svg)

<!-- docref: contracts/amana_escrow/src/lib.rs#create_trade -->
<!-- docref: contracts/amana_escrow/src/lib.rs#deposit -->
<!-- docref: contracts/amana_escrow/src/lib.rs#confirm_delivery -->
<!-- docref: contracts/amana_escrow/src/lib.rs#release_funds -->

```mermaid
sequenceDiagram
    autonumber
    participant Buyer
    participant Contract as amana_escrow
    participant Token as cNGN SAC
    participant Seller

    Buyer->>Contract: "create_trade(buyer, seller, amount, loss_bps, deadline)"
    Contract-->>Buyer: "TradeCreatedEvent (status Created)"
    Buyer->>Contract: "deposit(trade_id)"
    Contract->>Token: "transfer buyer to contract"
    Contract-->>Seller: "TradeFundedEvent (status Funded)"
    Seller->>Contract: "hand over goods and submit_manifest(trade_id)"
    Buyer->>Contract: "confirm_delivery(trade_id)"
    Contract-->>Buyer: "DeliveryConfirmedEvent (status Delivered)"
    Buyer->>Contract: "release_funds(trade_id, buyer)"
    Contract->>Token: "transfer contract to seller"
    Contract-->>Seller: "FundsReleasedEvent (status Completed)"
```

The order matters: funds exist before the seller commits to shipping, the buyer
confirms delivery, and only then does the release move cNGN. Every arrow after
`deposit` is one call on the escrow contract, so a failure between them leaves a
state the contract can still resolve (expiry refund, cancellation, dispute).

## Partial delivery with pro-rata settlement

![Partial delivery](rendered/partial-delivery.svg)

<!-- docref: contracts/amana_escrow/src/lib.rs#confirm_partial_delivery -->
<!-- docref: contracts/amana_escrow/src/lib.rs#accept_partial_delivery -->
<!-- docref: contracts/amana_escrow/src/lib.rs#escalate_partial_delivery -->

```mermaid
sequenceDiagram
    autonumber
    participant Buyer
    participant Contract as amana_escrow
    participant Token as cNGN SAC
    participant Seller

    Buyer->>Contract: "confirm_partial_delivery(trade_id, delivered_bps)"
    Contract-->>Buyer: "PARTDL event with the frozen split"
    Seller->>Contract: "accept_partial_delivery(trade_id)"
    Contract->>Token: "transfer seller_amount to seller"
    Contract->>Token: "transfer buyer_refund to buyer"
    Contract-->>Seller: "FundsReleasedEvent (status Completed)"
    Seller->>Contract: "escalate_partial_delivery(trade_id, caller) after the window"
    Contract-->>Buyer: "DisputeInitiatedEvent (status Disputed)"
```

Two exits, and one of them always opens: the seller accepts inside the three-day
window and the frozen split is paid out, or — after the window — either party
escalates and the trade enters the normal dispute flow with the whole escrow
still in the contract. The arithmetic behind `seller_amount`, `buyer_refund` and
`fee_amount`, including the 80-of-100-bags worked example, is in
[the contract overview](../eziagric_contract_overview.md).
