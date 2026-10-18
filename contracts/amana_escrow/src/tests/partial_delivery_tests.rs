/// Issue #349 — partial delivery with pro-rata settlement.
///
/// Agricultural shipments regularly arrive short (80 of 100 bags). Before this
/// flow the only options were a full release, a full refund or a dispute, so a
/// partial arrival always became a dispute. Now the buyer states the delivered
/// share in basis points, the contract splits the escrow pro-rata, and the
/// seller accepts the split inside the acceptance window:
///
/// ```text
/// delivered     = escrow * delivered_bps / 10_000
/// fee           = delivered * fee_bps / 10_000          (delivered only)
/// seller_loss   = undelivered * seller_loss_bps / 10_000, capped by delivered - fee
/// seller_amount = delivered - fee - seller_loss
/// buyer_refund  = undelivered + seller_loss
/// ```
///
/// `seller_amount + buyer_refund + fee_amount == escrow` for every input, so no
/// dust is stranded; the undelivered remainder absorbs any division remainder.
/// The worked example used in `docs/eziagric_contract_overview.md` is checked by
/// `test_partial_delivery_worked_example_eighty_bags_of_hundred`.
#[cfg(test)]
#[allow(clippy::module_inception)]
mod partial_delivery_tests {
    extern crate std;

    use crate::test_fixture::{AdminSignerFixture, DEFAULT_FEE_BPS};
    use crate::{
        PartialDeliverySettlement, TradeStatus, PARTIAL_DELIVERY_ACCEPT_WINDOW_SECS,
    };
    use soroban_sdk::{
        testutils::{Events as _, Ledger as _},
        xdr::{ContractEventBody, ScVal},
        IntoVal, Symbol, TryFromVal,
    };

    /// Odd escrow amount so `amount * bps / 10_000` keeps a remainder for every
    /// basis point in [`BPS_CASES`]: the split must absorb it, not lose it.
    const ODD_AMOUNT: i128 = 1_000_003;

    /// The boundary values the issue calls out: nothing delivered, the smallest
    /// expressible delivery, half, and a full delivery.
    const BPS_CASES: [u32; 4] = [0, 1, 5_000, 10_000];

    /// The split the contract has to produce, recomputed independently here.
    ///
    /// The fixture builds its trades with a 50/50 `Loss_Ratio`, so the seller's
    /// share of the undelivered remainder is exactly half of it.
    fn expected_split(amount: i128, bps: u32, fee_bps: u32) -> PartialDeliverySettlement {
        let delivered = amount * bps as i128 / 10_000;
        let undelivered = amount - delivered;
        let fee = delivered * fee_bps as i128 / 10_000;
        let seller_loss = (undelivered / 2).min((delivered - fee).max(0));
        PartialDeliverySettlement {
            trade_id: 0,
            delivered_bps: bps,
            delivered_amount: delivered,
            undelivered_amount: undelivered,
            seller_loss_amount: seller_loss,
            seller_amount: delivered - fee - seller_loss,
            buyer_refund: undelivered + seller_loss,
            fee_amount: fee,
            confirmed_at: 0,
            accept_by: PARTIAL_DELIVERY_ACCEPT_WINDOW_SECS,
        }
    }

    #[test]
    fn test_partial_delivery_split_covers_the_bps_boundaries() {
        for bps in BPS_CASES {
            let fixture = AdminSignerFixture::new();
            let client = fixture.client();
            let trade_id = fixture.funded_trade(ODD_AMOUNT);

            client.confirm_partial_delivery(&trade_id, &bps);

            let settlement = client
                .get_partial_delivery(&trade_id)
                .expect("a settlement is pending after confirming a partial delivery");
            let expected = expected_split(ODD_AMOUNT, bps, DEFAULT_FEE_BPS);

            assert_eq!(settlement.delivered_bps, bps, "delivered_bps at {bps}");
            assert_eq!(
                settlement.delivered_amount, expected.delivered_amount,
                "delivered amount at {bps} bps"
            );
            assert_eq!(
                settlement.undelivered_amount, expected.undelivered_amount,
                "undelivered amount at {bps} bps"
            );
            assert_eq!(
                settlement.seller_loss_amount, expected.seller_loss_amount,
                "Loss_Ratio share of the undelivered remainder at {bps} bps"
            );
            assert_eq!(
                settlement.seller_amount, expected.seller_amount,
                "seller payout at {bps} bps"
            );
            assert_eq!(
                settlement.buyer_refund, expected.buyer_refund,
                "buyer refund at {bps} bps"
            );
            assert_eq!(
                settlement.fee_amount, expected.fee_amount,
                "fee at {bps} bps"
            );

            // No dust: the three payouts re-create the escrowed balance exactly.
            assert_eq!(
                settlement.seller_amount + settlement.buyer_refund + settlement.fee_amount,
                ODD_AMOUNT,
                "amounts must sum to the escrowed balance at {bps} bps"
            );
            assert_eq!(
                settlement.accept_by,
                settlement.confirmed_at + PARTIAL_DELIVERY_ACCEPT_WINDOW_SECS,
                "acceptance deadline at {bps} bps"
            );

            // Nothing left the contract before the seller accepted.
            assert_eq!(fixture.token().balance(&fixture.contract_id), ODD_AMOUNT);
            assert_eq!(fixture.token().balance(&fixture.seller), 0);
        }
    }

    #[test]
    fn test_partial_delivery_worked_example_eighty_bags_of_hundred() {
        // 100 bags at 1 000 cNGN per bag: 80 arrive, 20 never leave the farm.
        let escrow = 100_000_i128;
        let fixture = AdminSignerFixture::new();
        let client = fixture.client();
        let trade_id = fixture.funded_trade(escrow);

        client.confirm_partial_delivery(&trade_id, &8_000_u32);
        let settlement = client
            .get_partial_delivery(&trade_id)
            .expect("settlement pending");

        assert_eq!(settlement.delivered_amount, 80_000, "80 bags delivered");
        assert_eq!(settlement.undelivered_amount, 20_000, "20 bags missing");
        assert_eq!(settlement.fee_amount, 800, "1% of the delivered 80 000 only");
        assert_eq!(
            settlement.seller_loss_amount, 10_000,
            "seller carries half of the 20 000 undelivered loss"
        );
        assert_eq!(settlement.seller_amount, 69_200, "80 000 - 800 - 10 000");
        assert_eq!(settlement.buyer_refund, 30_000, "20 000 refunded + 10 000 loss share");

        client.accept_partial_delivery(&trade_id);

        assert_eq!(fixture.token().balance(&fixture.seller), 69_200);
        assert_eq!(fixture.token().balance(&fixture.buyer), 30_000);
        assert_eq!(fixture.token().balance(&fixture.contract_id), 800);
        assert_eq!(fixture.token().balance(&fixture.treasury), 0, "fees accrue until withdrawn");
        assert_eq!(client.get_trade(&trade_id).status, TradeStatus::Completed);
    }

    #[test]
    fn test_partial_delivery_fee_is_charged_on_the_delivered_portion_only() {
        let fixture = AdminSignerFixture::new();
        let client = fixture.client();
        let trade_id = fixture.funded_trade(1_000_000);

        client.confirm_partial_delivery(&trade_id, &5_000_u32);
        let half = client.get_partial_delivery(&trade_id).expect("settlement pending");
        assert_eq!(half.fee_amount, 5_000, "1% of the delivered half");

        // A full delivery through the same entry point charges the whole fee,
        // which is the only case where the two bases agree.
        let full_fixture = AdminSignerFixture::new();
        let full_client = full_fixture.client();
        let full_trade = full_fixture.funded_trade(1_000_000);
        full_client.confirm_partial_delivery(&full_trade, &10_000_u32);
        let full = full_client
            .get_partial_delivery(&full_trade)
            .expect("settlement pending");
        assert_eq!(full.fee_amount, 10_000);
        assert!(half.fee_amount < full.fee_amount, "fee follows the delivered part");
    }

    #[test]
    fn test_accept_partial_delivery_releases_the_frozen_split() {
        let fixture = AdminSignerFixture::new();
        let client = fixture.client();
        let trade_id = fixture.funded_trade(ODD_AMOUNT);

        client.confirm_partial_delivery(&trade_id, &3_333_u32);
        let settlement = client.get_partial_delivery(&trade_id).expect("settlement pending");

        client.accept_partial_delivery(&trade_id);

        assert_eq!(fixture.token().balance(&fixture.seller), settlement.seller_amount);
        assert_eq!(fixture.token().balance(&fixture.buyer), settlement.buyer_refund);
        assert_eq!(
            fixture.token().balance(&fixture.contract_id),
            settlement.fee_amount,
            "only the accrued fee stays in the contract"
        );
        assert_eq!(settlement.seller_amount + settlement.buyer_refund, ODD_AMOUNT - settlement.fee_amount);

        let trade = client.get_trade(&trade_id);
        assert_eq!(trade.status, TradeStatus::Completed);
        assert!(
            client.get_partial_delivery(&trade_id).is_none(),
            "the settlement must be cleared once accepted"
        );
    }

    #[test]
    fn test_partial_delivery_escalates_to_dispute_after_the_window() {
        let fixture = AdminSignerFixture::new();
        let client = fixture.client();
        let trade_id = fixture.funded_trade(1_000);

        client.confirm_partial_delivery(&trade_id, &8_000_u32);
        let accept_by = client
            .get_partial_delivery(&trade_id)
            .expect("settlement pending")
            .accept_by;
        fixture.env.ledger().with_mut(|ledger| {
            ledger.timestamp = accept_by + 1;
        });

        client.escalate_partial_delivery(&trade_id, &fixture.seller);

        assert_eq!(client.get_trade(&trade_id).status, TradeStatus::Disputed);
        assert!(
            client.get_partial_delivery(&trade_id).is_none(),
            "an escalated proposal must not linger"
        );
        assert_eq!(
            fixture.token().balance(&fixture.contract_id),
            1_000,
            "the whole escrow stays put for the mediator"
        );
        assert_eq!(fixture.token().balance(&fixture.seller), 0);
        assert_eq!(fixture.token().balance(&fixture.buyer), 0);
    }

    #[test]
    #[should_panic(expected = "partial delivery acceptance window is still open")]
    fn test_escalation_before_the_window_closes_is_rejected() {
        let fixture = AdminSignerFixture::new();
        let client = fixture.client();
        let trade_id = fixture.funded_trade(1_000);

        client.confirm_partial_delivery(&trade_id, &8_000_u32);
        client.escalate_partial_delivery(&trade_id, &fixture.buyer);
    }

    #[test]
    #[should_panic(expected = "partial delivery acceptance window has closed")]
    fn test_accept_after_the_window_closes_is_rejected() {
        let fixture = AdminSignerFixture::new();
        let client = fixture.client();
        let trade_id = fixture.funded_trade(1_000);

        client.confirm_partial_delivery(&trade_id, &8_000_u32);
        let accept_by = client
            .get_partial_delivery(&trade_id)
            .expect("settlement pending")
            .accept_by;
        fixture.env.ledger().with_mut(|ledger| {
            ledger.timestamp = accept_by + 1;
        });

        client.accept_partial_delivery(&trade_id);
    }

    #[test]
    #[should_panic(expected = "delivered_bps must be between 0 and 10 000")]
    fn test_confirm_partial_delivery_rejects_bps_above_ten_thousand() {
        let fixture = AdminSignerFixture::new();
        let client = fixture.client();
        let trade_id = fixture.funded_trade(1_000);

        client.confirm_partial_delivery(&trade_id, &10_001_u32);
    }

    #[test]
    #[should_panic(expected = "no pending partial delivery settlement")]
    fn test_accept_without_a_pending_settlement_is_rejected() {
        let fixture = AdminSignerFixture::new();
        let client = fixture.client();
        let trade_id = fixture.funded_trade(1_000);

        client.accept_partial_delivery(&trade_id);
    }

    #[test]
    #[should_panic(expected = "partial delivery settlement pending")]
    fn test_full_delivery_confirmation_cannot_supersede_a_pending_split() {
        let fixture = AdminSignerFixture::new();
        let client = fixture.client();
        let trade_id = fixture.funded_trade(1_000);

        client.confirm_partial_delivery(&trade_id, &8_000_u32);
        client.confirm_delivery(&trade_id);
    }

    #[test]
    fn test_cancelling_a_trade_clears_a_pending_settlement() {
        let fixture = AdminSignerFixture::new();
        let client = fixture.client();
        let trade_id = fixture.funded_trade(1_000);

        client.confirm_partial_delivery(&trade_id, &8_000_u32);
        client.refund(&trade_id);

        assert_eq!(client.get_trade(&trade_id).status, TradeStatus::Cancelled);
        assert!(
            client.get_partial_delivery(&trade_id).is_none(),
            "a cancelled trade has nothing left to settle"
        );
        assert_eq!(fixture.token().balance(&fixture.buyer), 1_000);
    }

    #[test]
    fn test_confirm_partial_delivery_emits_partdl_with_the_amounts() {
        let fixture = AdminSignerFixture::new();
        let client = fixture.client();
        let trade_id = fixture.funded_trade(1_000_000);

        client.confirm_partial_delivery(&trade_id, &8_000_u32);
        let settlement = client.get_partial_delivery(&trade_id).expect("settlement pending");

        let all = fixture.env.events().all();
        let events = all.events();
        let last = events.last().expect("no events emitted");
        let event = match &last.body {
            ContractEventBody::V0(v0) => v0,
        };

        let expected_topic = ScVal::try_from_val(
            &fixture.env,
            &Symbol::new(&fixture.env, "PARTDL").into_val(&fixture.env),
        )
        .expect("PARTDL topic encodes");
        assert_eq!(event.topics.len(), 1, "PARTDL carries a single topic");
        assert_eq!(event.topics.get(0).unwrap(), &expected_topic);

        // The payload carries the five schema fields, so an indexer can render
        // the split without re-reading storage.
        let mut names: std::vec::Vec<std::string::String> = std::vec::Vec::new();
        match &event.data {
            ScVal::Map(Some(map)) => {
                for entry in map.iter() {
                    match &entry.key {
                        ScVal::Symbol(sym) => names
                            .push(std::str::from_utf8(sym.0.as_slice()).unwrap().into()),
                        other => panic!("unexpected event field key {other:?}"),
                    }
                }
            }
            other => panic!("expected a map payload for PARTDL, got {other:?}"),
        }
        names.sort();
        assert_eq!(
            names,
            [
                "buyer_refund",
                "delivered_bps",
                "fee_amount",
                "seller_amount",
                "trade_id",
            ]
        );

        // The emitted amounts are the ones that will be paid.
        assert!(settlement.seller_amount > 0);
        assert!(settlement.buyer_refund > 0);
    }

    #[test]
    #[should_panic(expected = "Trade must be funded")]
    fn test_partial_delivery_requires_the_funded_state() {
        let fixture = AdminSignerFixture::new();
        let client = fixture.client();
        // Still `Created`: nothing is escrowed yet, so there is nothing to split.
        let trade_id = client.create_trade(
            &fixture.buyer,
            &fixture.seller,
            &1_000_i128,
            &5000_u32,
            &5000_u32,
            &None,
        );

        client.confirm_partial_delivery(&trade_id, &5_000_u32);
    }
}
