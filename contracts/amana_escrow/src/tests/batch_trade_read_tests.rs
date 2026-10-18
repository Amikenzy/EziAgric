/// Issue #351 — batch trade reads.
///
/// `get_trades` answers one `Option<Trade>` per requested id, in input order,
/// so a dashboard page or the event listener hydrates a page from a single
/// simulation instead of one per row. The batch is capped at
/// [`crate::MAX_BATCH_TRADES`] and an over-long request fails loudly with the
/// `BATCH_TOO_LARGE` error token (see `docs/contract-error-codes.md`) rather
/// than being truncated, so a caller can never mistake a partial answer for a
/// complete one. Footprint: `src/tests/gas_footprint_tests.rs`.
#[cfg(test)]
#[allow(clippy::module_inception)]
mod batch_trade_read_tests {
    use crate::test_fixture::AdminSignerFixture;
    use crate::MAX_BATCH_TRADES;
    use soroban_sdk::Vec;

    #[test]
    fn test_get_trades_preserves_input_order() {
        let fixture = AdminSignerFixture::new();
        let client = fixture.client();
        let first = fixture.funded_trade(1_000);
        let second = fixture.funded_trade(2_000);
        let third = fixture.funded_trade(3_000);

        let mut ids = Vec::new(&fixture.env);
        ids.push_back(third);
        ids.push_back(first);
        ids.push_back(second);

        let trades = client.get_trades(&ids);

        assert_eq!(trades.len(), 3);
        assert_eq!(trades.get(0).unwrap().unwrap().trade_id, third);
        assert_eq!(trades.get(1).unwrap().unwrap().trade_id, first);
        assert_eq!(trades.get(2).unwrap().unwrap().trade_id, second);
    }

    #[test]
    fn test_get_trades_returns_none_for_missing_ids_without_panicking() {
        let fixture = AdminSignerFixture::new();
        let client = fixture.client();
        let existing = fixture.funded_trade(1_000);

        let mut ids = Vec::new(&fixture.env);
        ids.push_back(existing);
        ids.push_back(9_999);
        ids.push_back(0);

        let trades = client.get_trades(&ids);

        assert_eq!(trades.len(), 3);
        assert_eq!(trades.get(0).unwrap().unwrap().trade_id, existing);
        assert!(trades.get(1).unwrap().is_none(), "unknown id must be None");
        assert!(trades.get(2).unwrap().is_none(), "unknown id must be None");
    }

    #[test]
    fn test_get_trades_matches_get_trade_for_the_same_id() {
        let fixture = AdminSignerFixture::new();
        let client = fixture.client();
        let trade_id = fixture.funded_trade(1_000);

        let mut ids = Vec::new(&fixture.env);
        ids.push_back(trade_id);

        let batched = client.get_trades(&ids).get(0).unwrap().unwrap();
        let single = client.get_trade(&trade_id);

        assert_eq!(batched, single, "a batch read must agree with a single read");
    }

    #[test]
    fn test_get_trades_accepts_an_empty_batch() {
        let fixture = AdminSignerFixture::new();
        let client = fixture.client();

        let trades = client.get_trades(&Vec::new(&fixture.env));

        assert_eq!(trades.len(), 0);
    }

    #[test]
    fn test_get_trades_accepts_a_batch_of_exactly_the_cap() {
        let fixture = AdminSignerFixture::new();
        let client = fixture.client();
        let existing = fixture.funded_trade(1_000);

        let mut ids = Vec::new(&fixture.env);
        ids.push_back(existing);
        while ids.len() < MAX_BATCH_TRADES {
            ids.push_back(9_000 + ids.len() as u64);
        }

        let trades = client.get_trades(&ids);

        assert_eq!(trades.len(), MAX_BATCH_TRADES);
        assert_eq!(trades.get(0).unwrap().unwrap().trade_id, existing);
    }

    #[test]
    #[should_panic(expected = "BATCH_TOO_LARGE")]
    fn test_get_trades_rejects_a_batch_over_the_cap() {
        let fixture = AdminSignerFixture::new();
        let client = fixture.client();

        let mut ids = Vec::new(&fixture.env);
        let mut id = 0_u64;
        while ids.len() <= MAX_BATCH_TRADES {
            ids.push_back(id);
            id += 1;
        }

        client.get_trades(&ids);
    }
}
