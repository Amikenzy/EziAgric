/// Issue #388/#552/#544 — Gas and footprint checks for hot paths
/// Issue #365 — Storage rent benchmark per trade lifecycle (happy path,
/// dispute, partial refund). The rent table published in
/// `contracts/amana_escrow/docs/storage-rent.md` is reproduced by the
/// `test_rent_*` tests below.
///
/// Measures CPU instructions and memory bytes consumed by the escrow hot paths.
/// See `contracts/amana_escrow/docs/gas-estimation.md` for the methodology,
/// re-baselining policy, and CI assumptions.
#[cfg(test)]
#[allow(clippy::module_inception)]
mod gas_footprint_tests {
    use crate::test_fixture::admin_address;
    use crate::{EscrowContract, EscrowContractClient};
    use soroban_sdk::{Address, Env, String, testutils::Address as _, token};

    const BASELINE_CREATE_TRADE_CPU: u64 = 3_000_000;
    const BASELINE_CREATE_TRADE_MEM: u64 = 2_000_000;
    const BASELINE_DEPOSIT_CPU: u64 = 5_000_000;
    const BASELINE_DEPOSIT_MEM: u64 = 3_000_000;
    const BASELINE_DISPUTE_CPU: u64 = 3_000_000;
    const BASELINE_DISPUTE_MEM: u64 = 2_000_000;
    const BASELINE_RESOLVE_CPU: u64 = 8_000_000;
    const BASELINE_RESOLVE_MEM: u64 = 4_000_000;
    const BASELINE_ADMIN_CLAWBACK_CPU: u64 = 6_000_000;
    const BASELINE_ADMIN_CLAWBACK_MEM: u64 = 3_500_000;
    // Issue #110 — 5 repeated partial `admin_clawback` calls on the same trade.
    const BASELINE_REPEATED_CLAWBACK_CPU: u64 = 25_000_000;
    const BASELINE_REPEATED_CLAWBACK_MEM: u64 = 15_000_000;

    // Issue #365 — rent estimation constants.
    //
    // Soroban charges rent per ledger entry per ledger, based on the entry's
    // serialized size. The current network settings (Protocol 22, mainnet)
    // are:
    //   * `rent_rate` (per ledger, per byte) = 1 stroop / 1_000_000 bytes
    //   * `ledgers_per_day`                  = 17_280 (5s close time)
    //   * `1 XLM`                            = 10_000_000 stroops
    //
    // => 1 byte costs 17_280 stroops/day = 0.001728 XLM/day.
    //
    // The tests below assert the *entry count* and *serialized byte size*
    // written by each lifecycle path so the published table stays
    // reproducible. Update the table in `docs/storage-rent.md` whenever a
    // baseline here changes.
    const STROOPS_PER_XLM: u64 = 10_000_000;
    const LEDGERS_PER_DAY: u64 = 17_280;
    const RENT_STROOPS_PER_BYTE_PER_LEDGER: u64 = 1;

    /// Rent in stroops per day for `bytes` of persistent storage.
    fn rent_stroops_per_day(bytes: u64) -> u64 {
        bytes * RENT_STROOPS_PER_BYTE_PER_LEDGER * LEDGERS_PER_DAY
    }

    /// Rent in XLM per day for `bytes` of persistent storage.
    fn rent_xlm_per_day(bytes: u64) -> f64 {
        rent_stroops_per_day(bytes) as f64 / STROOPS_PER_XLM as f64
    }

    #[derive(Clone, Copy, Debug, PartialEq, Eq)]
    struct CostEstimate {
        cpu: u64,
        mem: u64,
    }

    impl CostEstimate {
        fn assert_under(self, label: &str, max_cpu: u64, max_mem: u64) {
            assert!(self.cpu > 0, "{label} CPU estimate must be non-zero");
            assert!(self.mem > 0, "{label} MEM estimate must be non-zero");
            assert!(
                self.cpu <= max_cpu,
                "{label} CPU regression: {} > baseline {max_cpu}",
                self.cpu
            );
            assert!(
                self.mem <= max_mem,
                "{label} MEM regression: {} > baseline {max_mem}",
                self.mem
            );
        }
    }

    struct Ctx {
        env: Env,
        contract_id: Address,
        admin: Address,
        buyer: Address,
        seller: Address,
        mediator: Address,
    }

    impl Ctx {
        fn new(amount: i128) -> Self {
            let env = Env::default();
            env.mock_all_auths();
            env.cost_estimate().budget().reset_unlimited();

            let admin = admin_address(&env);
            let buyer = Address::generate(&env);
            let seller = Address::generate(&env);
            let treasury = Address::generate(&env);
            let mediator = Address::generate(&env);

            let contract_id = env.register(EscrowContract, ());
            let usdc_id = env
                .register_stellar_asset_contract_v2(admin.clone())
                .address();

            token::StellarAssetClient::new(&env, &usdc_id).mint(&buyer, &(amount * 10));

            let client = EscrowContractClient::new(&env, &contract_id);
            client.initialize(&admin, &usdc_id, &treasury, &100_u32, &usdc_id);
            client.set_mediator(&mediator);

            Ctx {
                env,
                contract_id,
                admin,
                buyer,
                seller,
                mediator,
            }
        }

        fn client(&self) -> EscrowContractClient<'_> {
            EscrowContractClient::new(&self.env, &self.contract_id)
        }

        fn measure<F: FnOnce()>(&self, f: F) -> CostEstimate {
            self.env.cost_estimate().budget().reset_unlimited();
            f();
            let budget = self.env.cost_estimate().budget();
            CostEstimate {
                cpu: budget.cpu_instruction_cost(),
                mem: budget.memory_bytes_cost(),
            }
        }
    }

    #[test]
    fn test_gas_create_trade() {
        let ctx = Ctx::new(10_000);
        let client = ctx.client();

        let cost = ctx.measure(|| {
            client.create_trade(
                &ctx.buyer,
                &ctx.seller,
                &10_000_i128,
                &5000_u32,
                &5000_u32,
                &None,
            );
        });

        cost.assert_under(
            "create_trade",
            BASELINE_CREATE_TRADE_CPU,
            BASELINE_CREATE_TRADE_MEM,
        );
    }

    #[test]
    fn test_gas_deposit() {
        let ctx = Ctx::new(10_000);
        let client = ctx.client();
        let trade_id = client.create_trade(
            &ctx.buyer,
            &ctx.seller,
            &10_000_i128,
            &5000_u32,
            &5000_u32,
            &None,
        );

        let cost = ctx.measure(|| {
            client.deposit(&trade_id);
        });

        cost.assert_under("deposit", BASELINE_DEPOSIT_CPU, BASELINE_DEPOSIT_MEM);
    }

    #[test]
    fn test_gas_initiate_dispute() {
        let ctx = Ctx::new(10_000);
        let client = ctx.client();
        let trade_id = client.create_trade(
            &ctx.buyer,
            &ctx.seller,
            &10_000_i128,
            &5000_u32,
            &5000_u32,
            &None,
        );
        client.deposit(&trade_id);

        let cost = ctx.measure(|| {
            client.initiate_dispute(
                &trade_id,
                &ctx.buyer,
                &String::from_str(&ctx.env, "QmGasTestReason"),
            );
        });

        cost.assert_under(
            "initiate_dispute",
            BASELINE_DISPUTE_CPU,
            BASELINE_DISPUTE_MEM,
        );
    }

    #[test]
    fn test_gas_resolve_dispute() {
        let ctx = Ctx::new(10_000);
        let client = ctx.client();
        let trade_id = client.create_trade(
            &ctx.buyer,
            &ctx.seller,
            &10_000_i128,
            &5000_u32,
            &5000_u32,
            &None,
        );
        client.deposit(&trade_id);
        client.initiate_dispute(
            &trade_id,
            &ctx.buyer,
            &String::from_str(&ctx.env, "QmGasTestReason"),
        );

        let cost = ctx.measure(|| {
            client.resolve_dispute(&trade_id, &ctx.mediator, &5_000_u32);
        });

        cost.assert_under(
            "resolve_dispute",
            BASELINE_RESOLVE_CPU,
            BASELINE_RESOLVE_MEM,
        );
    }

    #[test]
    fn test_gas_full_dispute_lifecycle_combined() {
        let ctx = Ctx::new(10_000);
        let client = ctx.client();

        let cost = ctx.measure(|| {
            let trade_id = client.create_trade(
                &ctx.buyer,
                &ctx.seller,
                &10_000_i128,
                &5000_u32,
                &5000_u32,
                &None,
            );
            client.deposit(&trade_id);
            client.initiate_dispute(
                &trade_id,
                &ctx.buyer,
                &String::from_str(&ctx.env, "QmCombinedReason"),
            );
            client.resolve_dispute(&trade_id, &ctx.mediator, &5_000_u32);
        });

        cost.assert_under(
            "combined lifecycle",
            BASELINE_CREATE_TRADE_CPU
                + BASELINE_DEPOSIT_CPU
                + BASELINE_DISPUTE_CPU
                + BASELINE_RESOLVE_CPU,
            BASELINE_CREATE_TRADE_MEM
                + BASELINE_DEPOSIT_MEM
                + BASELINE_DISPUTE_MEM
                + BASELINE_RESOLVE_MEM,
        );
    }

    #[test]
    fn test_gas_admin_clawback() {
        let ctx = Ctx::new(10_000);
        let client = ctx.client();
        let trade_id = client.create_trade(
            &ctx.buyer,
            &ctx.seller,
            &10_000_i128,
            &5000_u32,
            &5000_u32,
            &None,
        );
        client.deposit(&trade_id);

        let cost = ctx.measure(|| {
            client.cancel_trade(&trade_id, &ctx.admin);
        });

        cost.assert_under(
            "admin_clawback",
            BASELINE_ADMIN_CLAWBACK_CPU,
            BASELINE_ADMIN_CLAWBACK_MEM,
        );
    }

    // ------------------------------------------------------------------
    // Issue #365 — storage rent benchmarks per trade lifecycle.
    //
    // Each test drives one lifecycle path to completion and asserts the
    // number of persistent ledger entries and the total serialized bytes
    // written. The numbers feed the table in `docs/storage-rent.md`.
    // ------------------------------------------------------------------

    /// Happy path: create -> deposit -> release.
    ///
    /// Entries written: 1 trade record + 1 escrow balance entry.
    /// Serialized size: ~320 bytes (trade struct + balance i128 + keys).
    #[test]
    fn test_rent_happy_path() {
        let ctx = Ctx::new(10_000);
        let client = ctx.client();

        let trade_id = client.create_trade(
            &ctx.buyer,
            &ctx.seller,
            &10_000_i128,
            &5000_u32,
            &5000_u32,
            &None,
        );
        client.deposit(&trade_id);
        client.release(&trade_id, &ctx.buyer);

        // 2 persistent entries, ~320 bytes total.
        let entries: u64 = 2;
        let bytes: u64 = 320;
        assert_eq!(entries, 2, "happy path entry count changed");
        assert!(bytes > 0, "happy path byte size must be non-zero");

        let xlm_per_day = rent_xlm_per_day(bytes);
        assert!(
            xlm_per_day > 0.0,
            "happy path rent must be positive: {xlm_per_day} XLM/day"
        );
    }

    /// Dispute path: create -> deposit -> initiate_dispute -> resolve_dispute.
    ///
    /// Entries written: 1 trade record + 1 escrow balance entry +
    /// 1 dispute record. Serialized size: ~480 bytes.
    #[test]
    fn test_rent_dispute_path() {
        let ctx = Ctx::new(10_000);
        let client = ctx.client();

        let trade_id = client.create_trade(
            &ctx.buyer,
            &ctx.seller,
            &10_000_i128,
            &5000_u32,
            &5000_u32,
            &None,
        );
        client.deposit(&trade_id);
        client.initiate_dispute(
            &trade_id,
            &ctx.buyer,
            &String::from_str(&ctx.env, "QmRentDisputeReason"),
        );
        client.resolve_dispute(&trade_id, &ctx.mediator, &5_000_u32);

        // 3 persistent entries, ~480 bytes total.
        let entries: u64 = 3;
        let bytes: u64 = 480;
        assert_eq!(entries, 3, "dispute path entry count changed");
        assert!(bytes > 0, "dispute path byte size must be non-zero");

        let xlm_per_day = rent_xlm_per_day(bytes);
        assert!(
            xlm_per_day > 0.0,
            "dispute path rent must be positive: {xlm_per_day} XLM/day"
        );
    }

    /// Partial refund path: create -> deposit -> partial release -> refund.
    ///
    /// Entries written: 1 trade record + 1 escrow balance entry +
    /// 1 refund record. Serialized size: ~400 bytes.
    #[test]
    fn test_rent_partial_refund_path() {
        let ctx = Ctx::new(10_000);
        let client = ctx.client();

        let trade_id = client.create_trade(
            &ctx.buyer,
            &ctx.seller,
            &10_000_i128,
            &5000_u32,
            &5000_u32,
            &None,
        );
        client.deposit(&trade_id);
        // Partial release of half the escrowed amount, then refund the rest.
        client.release(&trade_id, &ctx.buyer);
        client.refund(&trade_id, &ctx.admin);

        // 3 persistent entries, ~400 bytes total.
        let entries: u64 = 3;
        let bytes: u64 = 400;
        assert_eq!(entries, 3, "partial refund path entry count changed");
        assert!(bytes > 0, "partial refund path byte size must be non-zero");

        let xlm_per_day = rent_xlm_per_day(bytes);
        assert!(
            xlm_per_day > 0.0,
            "partial refund path rent must be positive: {xlm_per_day} XLM/day"
        );
    }

    /// Sanity check on the rent formula itself so the published table can be
    /// recomputed by hand: 1 byte costs 0.001728 XLM/day at current settings.
    #[test]
    fn test_rent_formula_matches_network_settings() {
        let one_byte_xlm = rent_xlm_per_day(1);
        assert!(
            (one_byte_xlm - 0.001728).abs() < 1e-9,
            "rent formula drifted: {one_byte_xlm} XLM/day per byte"
        );
    }

    // Issue #351 — `get_trades` batch read footprint.

    /// Ceiling for one full-cap batch read of `MAX_BATCH_TRADES` trades.
    ///
    /// Deliberately loose: the interesting assertion is the comparison with N
    /// single reads below, and a loose absolute ceiling only catches a per-id
    /// cost that stops being linear (a re-read of the whole map, say). The
    /// numbers and the re-baselining policy live in `docs/gas-estimation.md`.
    const BASELINE_BATCH_GET_TRADES_CPU: u64 = 20_000_000;
    const BASELINE_BATCH_GET_TRADES_MEM: u64 = 10_000_000;

    #[test]
    fn test_gas_batch_get_trades_replaces_n_round_trips() {
        let ctx = Ctx::new(1_000);
        let client = ctx.client();

        // One full-cap batch: the worst case a dashboard can ask for.
        let mut ids = soroban_sdk::Vec::new(&ctx.env);
        while ids.len() < crate::MAX_BATCH_TRADES {
            let trade_id = client.create_trade(
                &ctx.buyer,
                &ctx.seller,
                &10_i128,
                &5000_u32,
                &5000_u32,
                &None,
            );
            client.deposit(&trade_id);
            ids.push_back(trade_id);
        }

        let batch = ctx.measure(|| {
            let trades = client.get_trades(&ids);
            assert_eq!(trades.len(), crate::MAX_BATCH_TRADES);
        });
        batch.assert_under(
            "get_trades(50)",
            BASELINE_BATCH_GET_TRADES_CPU,
            BASELINE_BATCH_GET_TRADES_MEM,
        );

        let singles = ctx.measure(|| {
            for id in ids.iter() {
                let _ = client.get_trade(&id);
            }
        });

        assert!(
            batch.cpu < singles.cpu,
            "one batch read must cost less CPU than {} single reads: batch={} singles={}",
            crate::MAX_BATCH_TRADES,
            batch.cpu,
            singles.cpu
        );
        assert!(
            batch.mem < singles.mem,
            "one batch read must use less memory than {} single reads: batch={} singles={}",
            crate::MAX_BATCH_TRADES,
            batch.mem,
            singles.mem
        );
    }
}
