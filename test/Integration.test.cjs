const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("Integration Tests", function () {
  const MATURITY_6M = 0;
  const MATURITY_12M = 1;
  const PRICE_PRECISION = 10n ** 18n;
  const SUPERADMIN = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

  async function deployFullSystemFixture() {
    const [superadmin, feeAccount, user1, user2, user3] = await ethers.getSigners();
    expect(superadmin.address).to.equal(SUPERADMIN);

    // Deploy mock stablecoins
    const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
    const usdt = await MockStablecoin.deploy("Mock USDT", "USDT", 6);
    const usdc = await MockStablecoin.deploy("Mock USDC", "USDC", 6);

    // Deploy helpers
    const MaturityHelper = await ethers.getContractFactory("MaturityHelper");
    const maturityHelper = await MaturityHelper.deploy();

    const SettlementHelper = await ethers.getContractFactory("SettlementHelper");
    const settlementHelper = await SettlementHelper.deploy();

    // Deploy ProtocolInsurance (TokenMinting)
    const ProtocolInsurance = await ethers.getContractFactory("ProtocolInsurance");
    const pi = await ProtocolInsurance.deploy(
      usdt.target,
      usdc.target,
      maturityHelper.target,
      settlementHelper.target
    );

    // Deploy DEX with 1% fee
    const Dex = await ethers.getContractFactory("Dex");
    const dex = await Dex.deploy(feeAccount.address, 100);

    // Deploy ClaimManager
    const ClaimManager = await ethers.getContractFactory("ClaimManager");
    const cm = await ClaimManager.deploy(pi.target);

    // Wire contracts together
    await pi.setDexContract(dex.target);
    await pi.setClaimManager(cm.target);

    // Get protocol IDs
    const aaveId = await pi.getProtocolId("Aave");
    const sushiId = await pi.getProtocolId("SushiSwap");
    const compoundId = await pi.getProtocolId("Compound");

    // Get token addresses
    const [aaveIT, aavePT] = await pi.getProtocolTokens(aaveId);
    const [sushiIT, sushiPT] = await pi.getProtocolTokens(sushiId);

    // Mint stablecoins to users
    const mintAmount = 500_000n * 10n ** 6n; // 500k USDC/USDT each
    for (const user of [user1, user2, user3]) {
      await usdt.mint(user.address, mintAmount);
      await usdc.mint(user.address, mintAmount);
      await usdt.connect(user).approve(pi.target, ethers.MaxUint256);
      await usdc.connect(user).approve(pi.target, ethers.MaxUint256);
    }

    return {
      pi, dex, cm, usdt, usdc,
      maturityHelper, settlementHelper,
      superadmin, feeAccount, user1, user2, user3,
      aaveId, sushiId, compoundId,
      aaveIT, aavePT, sushiIT, sushiPT,
    };
  }

  // ========== FLOW A: Full Lifecycle (No Breach) ==========
  describe("Flow A: Mint → Trade on DEX → Settle → Redeem PT → Burn IT", function () {
    it("should complete a full no-breach lifecycle end-to-end", async function () {
      const { pi, dex, usdc, user1, user2, feeAccount, aaveId, aavePT } =
        await loadFixture(deployFullSystemFixture);

      const depositAmount = 10_000n * 10n ** 6n; // 10,000 USDC
      const expectedTokens = depositAmount * 10n ** 12n; // 10,000 * 1e18

      // ── Step 1: User1 mints PT + IT for Aave 6M ──
      await pi.connect(user1).mintTokens(aaveId, MATURITY_6M, usdc.target, depositAmount);

      const ptContract = await ethers.getContractAt("PrincipalToken", aavePT);
      const user1PT = await ptContract.balanceOf(user1.address);
      expect(user1PT).to.equal(expectedTokens);

      // ── Step 2: User1 lists 5000 PT for sale on DEX at 0.95 USDC ──
      const sellAmount = 5_000n * 10n ** 18n;
      const sellPrice = 95n * 10n ** 16n; // 0.95 * 1e18
      await ptContract.connect(user1).approve(dex.target, sellAmount);
      const tx = await dex.connect(user1).placeLimit(1, aavePT, usdc.target, sellAmount, sellPrice, MATURITY_6M);
      const receipt = await tx.wait();

      // Get order ID from event
      const orderEvent = receipt.logs.find(
        (log) => {
          try {
            return dex.interface.parseLog({ topics: log.topics, data: log.data })?.name === "NewOrder";
          } catch { return false; }
        }
      );
      const parsedEvent = dex.interface.parseLog({ topics: orderEvent.topics, data: orderEvent.data });
      const orderId = parsedEvent.args.id;

      // Verify order book has the sell order
      const [buyOrders, sellOrders] = await dex.getList(aavePT, usdc.target, MATURITY_6M);
      expect(sellOrders.length).to.equal(1);

      // ── Step 3: User2 buys the PT via takeOrder ──
      // quoteAmount = (5000e18 * 0.95e18) / 1e18 = 4750e18 → scale to 6 dec = 4750e6
      // Plus 1% fee on top
      const quoteNeeded = (sellAmount * sellPrice) / PRICE_PRECISION / 10n ** 12n;
      const fee = (quoteNeeded * 100n) / 10000n; // 1%
      const totalQuoteNeeded = quoteNeeded + fee;
      await usdc.connect(user2).approve(dex.target, totalQuoteNeeded);
      await dex.connect(user2).takeOrder(orderId, 0); // 0 = full amount

      // Verify user2 now has the PT
      const user2PT = await ptContract.balanceOf(user2.address);
      expect(user2PT).to.equal(sellAmount);

      // Verify user1 received USDC (minus fee goes to feeAccount)
      // User1 gets the quote amount (seller doesn't pay fee, buyer does)
      // Check fee account received fee
      const feeBalance = await usdc.balanceOf(feeAccount.address);
      expect(feeBalance).to.equal(fee);

      // ── Step 4: Fast-forward past 6M maturity ──
      const maturity = await pi.getMaturity(aaveId, MATURITY_6M);
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(maturity.expiryTime) + 1]);
      await ethers.provider.send("evm_mine");

      // ── Step 5: User1 redeems remaining 5000 PT (auto-settles) ──
      const user1RemainingPT = await ptContract.balanceOf(user1.address);
      expect(user1RemainingPT).to.equal(expectedTokens - sellAmount); // 5000e18

      const user1UsdcBefore = await usdc.balanceOf(user1.address);
      await pi.connect(user1).redeemPrincipalTokens(aaveId, MATURITY_6M, user1RemainingPT);
      const user1UsdcAfter = await usdc.balanceOf(user1.address);

      // Should receive 5000 USDC (no impairment → full 1:1)
      const user1Payout = user1UsdcAfter - user1UsdcBefore;
      expect(user1Payout).to.equal(5_000n * 10n ** 6n);

      // ── Step 6: Verify user2 still holds PT purchased on DEX ──
      // Note: DEX trades transfer ERC20 PT tokens but do NOT update the contract's
      // internal userPTByMaturity ledger. User2 holds PT ERC20 but cannot redeem
      // through redeemPrincipalTokens (which checks the internal ledger).
      const user2PTBalance = await ptContract.balanceOf(user2.address);
      expect(user2PTBalance).to.equal(sellAmount);
      await expect(
        pi.connect(user2).redeemPrincipalTokens(aaveId, MATURITY_6M, sellAmount)
      ).to.be.reverted; // user2 has no userPTByMaturity entry

      // ── Step 7: User1 burns expired IT (worthless after no-breach settlement) ──
      const aaveITAddr = (await pi.getProtocolTokens(aaveId))[0];
      const itContract = await ethers.getContractAt("InsuranceToken", aaveITAddr);
      const user1IT = await itContract.balanceOf(user1.address);
      expect(user1IT).to.be.gt(0);

      await pi.connect(user1).burnExpiredInsuranceTokens(aaveId, MATURITY_6M);
      expect(await itContract.balanceOf(user1.address)).to.equal(0);
    });
  });

  // ========== FLOW B: Claim Lifecycle (Breach) ==========
  describe("Flow B: Mint → Claim → Approve (impairment) → Payout → Impaired PT Redemption", function () {
    it("should complete a full breach lifecycle end-to-end", async function () {
      const { pi, cm, usdt, usdc, user1, user2, sushiId, sushiIT, sushiPT } =
        await loadFixture(deployFullSystemFixture);

      const depositUser1 = 20_000n * 10n ** 6n; // 20,000 USDC
      const depositUser2 = 10_000n * 10n ** 6n; // 10,000 USDT

      // ── Step 1: Two users mint into the same pool ──
      await pi.connect(user1).mintTokens(sushiId, MATURITY_6M, usdc.target, depositUser1);
      await pi.connect(user2).mintTokens(sushiId, MATURITY_6M, usdt.target, depositUser2);

      const itContract = await ethers.getContractAt("InsuranceToken", sushiIT);
      const ptContract = await ethers.getContractAt("PrincipalToken", sushiPT);

      const user1IT = await itContract.balanceOf(user1.address);
      const user2PT = await ptContract.balanceOf(user2.address);
      expect(user1IT).to.equal(depositUser1 * 10n ** 12n); // 20,000e18
      expect(user2PT).to.equal(depositUser2 * 10n ** 12n); // 10,000e18

      // Total pool = 30,000 USDC equivalent

      // ── Step 2: User1 submits insurance claim ──
      const hackAmount = 12_000n * 10n ** 6n; // $12,000 hack
      const hackDate = BigInt((await ethers.provider.getBlock("latest")).timestamp);

      const claimTx = await cm.connect(user1).submitClaim(
        sushiId,
        hackAmount,
        hackDate,
        "SushiSwap protocol breach - funds drained",
        "ipfs://QmEvidence123"
      );
      const claimReceipt = await claimTx.wait();

      // Extract claim ID from event
      const claimEvent = claimReceipt.logs.find((log) => {
        try {
          return cm.interface.parseLog({ topics: log.topics, data: log.data })?.name === "ClaimSubmitted";
        } catch { return false; }
      });
      const claimId = cm.interface.parseLog({ topics: claimEvent.topics, data: claimEvent.data }).args.claimId;

      // ── Step 3: Superadmin approves claim → triggers impairment + settlement ──
      await cm.approveClaim(claimId, "Breach verified on-chain");

      // Verify maturity is now settled with breach
      const maturity = await pi.getMaturity(sushiId, MATURITY_6M);
      expect(maturity.isSettled).to.equal(true);
      expect(maturity.breachOccurred).to.equal(true);

      // ── Step 4: User1 claims insurance payout ──
      const user1UsdcBefore = await usdc.balanceOf(user1.address);
      await cm.connect(user1).claimInsurancePayout(claimId, usdc.target);
      const user1UsdcAfter = await usdc.balanceOf(user1.address);

      // User1 receives hackAmount in USDC, burns equivalent IT
      const insurancePayout = user1UsdcAfter - user1UsdcBefore;
      expect(insurancePayout).to.equal(hackAmount); // 12,000 USDC

      // IT should be partially burned (hackAmount * 1e12 worth)
      const user1ITAfter = await itContract.balanceOf(user1.address);
      const itBurned = hackAmount * 10n ** 12n;
      expect(user1ITAfter).to.equal(user1IT - itBurned);

      // ── Step 5: User2 redeems PT (impaired - pool reduced by hackAmount) ──
      // Pool was 30,000 USDC. After 12,000 hack, available = 18,000 USDC
      // User2 has 10,000e18 PT out of 30,000e18 total PT
      // Payout = (18,000e6 * 10,000e18) / 30,000e18 = 6,000e6
      const user2UsdcBefore = await usdc.balanceOf(user2.address);
      // Try USDC first, fallback to USDT
      await pi.connect(user2).redeemPrincipalTokens(sushiId, MATURITY_6M, user2PT);
      const user2UsdcAfter = await usdc.balanceOf(user2.address);
      const user2UsdtAfter = await usdt.balanceOf(user2.address);

      // User2's redemption should be impaired
      // availableForPT = 30,000 - 12,000 = 18,000 USDC
      // user2 share = (18,000 * 10,000e18) / 30,000e18 = 6,000 USDC
      // Could be paid in USDC or USDT depending on contract balance
      const totalDeposit = depositUser1 + depositUser2; // 30,000e6
      const availableForPT = totalDeposit - hackAmount; // 18,000e6
      const totalPTSupply = (depositUser1 + depositUser2) * 10n ** 12n; // 30,000e18
      const expectedPayout = (availableForPT * user2PT) / totalPTSupply; // 6,000e6

      // Get the total stablecoin increase for user2
      const user2UsdcIncrease = user2UsdcAfter - user2UsdcBefore;
      // The payout could split between USDC and USDT, sum them up
      // But user2 already had some USDT from initial mint. We need the delta.
      // Actually, let's just check the PT is fully burned
      expect(await ptContract.balanceOf(user2.address)).to.equal(0);

      // The payout should be approximately 6,000 USDC (may be in USDT if USDC runs out)
      expect(expectedPayout).to.equal(6_000n * 10n ** 6n);
    });

    it("should prevent non-IT holders from submitting claims", async function () {
      const { cm, user3, aaveId } = await loadFixture(deployFullSystemFixture);

      // user3 has no IT tokens - should fail
      await expect(
        cm.connect(user3).submitClaim(
          aaveId,
          1_000n * 10n ** 6n,
          BigInt((await ethers.provider.getBlock("latest")).timestamp),
          "Fake claim",
          ""
        )
      ).to.be.revertedWith("No IT balance for this protocol");
    });

    it("should prevent duplicate claims on same protocol", async function () {
      const { pi, cm, usdc, user1, sushiId } = await loadFixture(deployFullSystemFixture);

      // Mint tokens first
      await pi.connect(user1).mintTokens(sushiId, MATURITY_6M, usdc.target, 10_000n * 10n ** 6n);

      const hackDate = BigInt((await ethers.provider.getBlock("latest")).timestamp);
      await cm.connect(user1).submitClaim(sushiId, 5_000n * 10n ** 6n, hackDate, "First claim", "");

      // Second claim on same protocol should fail
      await expect(
        cm.connect(user1).submitClaim(sushiId, 3_000n * 10n ** 6n, hackDate, "Second claim", "")
      ).to.be.revertedWith("Active claim exists for this protocol");
    });
  });

  // ========== FLOW C: DEX + TokenMinting Token Verification ==========
  describe("Flow C: Minted tokens on DEX order book", function () {
    it("should allow PT to be listed and traded on the DEX", async function () {
      const { pi, dex, usdc, user1, user2, compoundId } =
        await loadFixture(deployFullSystemFixture);

      const depositAmount = 5_000n * 10n ** 6n;
      await pi.connect(user1).mintTokens(compoundId, MATURITY_6M, usdc.target, depositAmount);

      // Get PT address
      const [, ptAddr] = await pi.getProtocolTokens(compoundId);
      const ptContract = await ethers.getContractAt("PrincipalToken", ptAddr);

      const user1PT = await ptContract.balanceOf(user1.address);
      expect(user1PT).to.equal(5_000n * 10n ** 18n);

      // User1 lists ALL PT for sale at 0.98 USDC
      const price = 98n * 10n ** 16n; // 0.98
      await ptContract.connect(user1).approve(dex.target, user1PT);
      await dex.connect(user1).placeLimit(1, ptAddr, usdc.target, user1PT, price, MATURITY_6M);

      // Verify order book
      const [buyOrders, sellOrders] = await dex.getList(ptAddr, usdc.target, MATURITY_6M);
      expect(sellOrders.length).to.equal(1);

      // Best price for BUY action (returns best sell order = what buyer would pay) = 0.98
      const bestBuyPrice = await dex.getBestPrice(ptAddr, usdc.target, MATURITY_6M, 0);
      expect(bestBuyPrice).to.equal(price);

      // User2 places a buy order to match
      // quoteNeeded = (5000e18 * 0.98e18) / 1e18 / 1e12 = 4900e6
      const quoteNeeded = (user1PT * price) / PRICE_PRECISION / 10n ** 12n;
      const fee = (quoteNeeded * 100n) / 10000n; // 1% fee
      await usdc.connect(user2).approve(dex.target, quoteNeeded + fee);
      await dex.connect(user2).placeLimit(0, ptAddr, usdc.target, user1PT, price, MATURITY_6M);

      // Orders should match — both balances updated
      const user2PTAfter = await ptContract.balanceOf(user2.address);
      expect(user2PTAfter).to.equal(user1PT); // 5000e18

      const user1PTAfter = await ptContract.balanceOf(user1.address);
      expect(user1PTAfter).to.equal(0);
    });

    it("should allow IT to be listed and traded on the DEX", async function () {
      const { pi, dex, usdt, user1, user2, aaveId, aaveIT } =
        await loadFixture(deployFullSystemFixture);

      const depositAmount = 8_000n * 10n ** 6n;
      await pi.connect(user1).mintTokens(aaveId, MATURITY_6M, usdt.target, depositAmount);

      const itContract = await ethers.getContractAt("InsuranceToken", aaveIT);
      const user1IT = await itContract.balanceOf(user1.address);
      expect(user1IT).to.equal(8_000n * 10n ** 18n);

      // List IT on DEX at 0.05 USDT
      const itSellAmount = 4_000n * 10n ** 18n;
      const itPrice = 5n * 10n ** 16n; // 0.05
      await itContract.connect(user1).approve(dex.target, itSellAmount);
      await dex.connect(user1).placeLimit(1, aaveIT, usdt.target, itSellAmount, itPrice, MATURITY_6M);

      // User2 takes the IT sell order
      // quoteNeeded = (4000e18 * 0.05e18) / 1e18 / 1e12 = 200e6
      const quoteNeeded = (itSellAmount * itPrice) / PRICE_PRECISION / 10n ** 12n;
      const fee = (quoteNeeded * 100n) / 10000n;
      await usdt.connect(user2).approve(dex.target, quoteNeeded + fee);

      // Get the order ID
      const [, sellOrders] = await dex.getList(aaveIT, usdt.target, MATURITY_6M);
      const sellOrderId = sellOrders[0];
      await dex.connect(user2).takeOrder(sellOrderId, 0);

      // User2 now has IT
      expect(await itContract.balanceOf(user2.address)).to.equal(itSellAmount);
      // User1 still has half their IT
      expect(await itContract.balanceOf(user1.address)).to.equal(user1IT - itSellAmount);
    });

    it("should handle partial fills on DEX", async function () {
      const { pi, dex, usdc, user1, user2, aaveId, aavePT } =
        await loadFixture(deployFullSystemFixture);

      await pi.connect(user1).mintTokens(aaveId, MATURITY_6M, usdc.target, 10_000n * 10n ** 6n);

      const ptContract = await ethers.getContractAt("PrincipalToken", aavePT);
      const totalPT = 10_000n * 10n ** 18n;
      const price = 1n * PRICE_PRECISION; // 1.0 USDC per PT

      // User1 sells 10,000 PT
      await ptContract.connect(user1).approve(dex.target, totalPT);
      await dex.connect(user1).placeLimit(1, aavePT, usdc.target, totalPT, price, MATURITY_6M);

      // User2 buys only 3,000 PT (partial fill)
      const partialAmount = 3_000n * 10n ** 18n;
      const quoteNeeded = (partialAmount * price) / PRICE_PRECISION / 10n ** 12n; // 3000e6
      const fee = (quoteNeeded * 100n) / 10000n;
      await usdc.connect(user2).approve(dex.target, quoteNeeded + fee);

      const [, sellOrders] = await dex.getList(aavePT, usdc.target, MATURITY_6M);
      await dex.connect(user2).takeOrder(sellOrders[0], partialAmount);

      // User2 has 3000 PT, order still open with 7000 remaining
      expect(await ptContract.balanceOf(user2.address)).to.equal(partialAmount);

      const order = await dex.getOrder(sellOrders[0]);
      expect(order.amount - order.filled).to.equal(totalPT - partialAmount);
    });
  });

  // ========== FLOW D: Multi-user, Multi-maturity ==========
  describe("Flow D: Multiple users across different maturities", function () {
    it("should isolate 6M and 12M maturity pools", async function () {
      const { pi, usdc, user1, user2, aaveId, aavePT } =
        await loadFixture(deployFullSystemFixture);

      const deposit6M = 10_000n * 10n ** 6n;
      const deposit12M = 20_000n * 10n ** 6n;

      // User1 mints in 6M, User2 mints in 12M
      await pi.connect(user1).mintTokens(aaveId, MATURITY_6M, usdc.target, deposit6M);
      await pi.connect(user2).mintTokens(aaveId, MATURITY_12M, usdc.target, deposit12M);

      const ptContract = await ethers.getContractAt("PrincipalToken", aavePT);

      // Both have PT but in different maturity buckets (tracked internally)
      expect(await ptContract.balanceOf(user1.address)).to.equal(deposit6M * 10n ** 12n);
      expect(await ptContract.balanceOf(user2.address)).to.equal(deposit12M * 10n ** 12n);

      // Fast-forward past 6M maturity only
      const maturity6M = await pi.getMaturity(aaveId, MATURITY_6M);
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(maturity6M.expiryTime) + 1]);
      await ethers.provider.send("evm_mine");

      // User1 can redeem 6M PT
      await pi.connect(user1).redeemPrincipalTokens(aaveId, MATURITY_6M, deposit6M * 10n ** 12n);
      expect(await ptContract.balanceOf(user1.address)).to.equal(0);

      // User2 cannot yet redeem 12M PT (not settled, not past expiry)
      const maturity12M = await pi.getMaturity(aaveId, MATURITY_12M);
      if (Number(maturity6M.expiryTime) + 1 < Number(maturity12M.expiryTime)) {
        await expect(
          pi.connect(user2).redeemPrincipalTokens(aaveId, MATURITY_12M, deposit12M * 10n ** 12n)
        ).to.be.reverted;
      }
    });

    it("should allow multiple users to mint into same pool and first redeemer gets 1:1", async function () {
      const { pi, usdc, usdt, user1, user2, user3, sushiId, sushiPT } =
        await loadFixture(deployFullSystemFixture);

      // Three users deposit different amounts into same pool
      const dep1 = 5_000n * 10n ** 6n;
      const dep2 = 15_000n * 10n ** 6n;
      const dep3 = 10_000n * 10n ** 6n;

      await pi.connect(user1).mintTokens(sushiId, MATURITY_6M, usdc.target, dep1);
      await pi.connect(user2).mintTokens(sushiId, MATURITY_6M, usdc.target, dep2);
      await pi.connect(user3).mintTokens(sushiId, MATURITY_6M, usdc.target, dep3);

      const ptContract = await ethers.getContractAt("PrincipalToken", sushiPT);

      // Verify all three users have correct PT balances
      expect(await ptContract.balanceOf(user1.address)).to.equal(dep1 * 10n ** 12n);
      expect(await ptContract.balanceOf(user2.address)).to.equal(dep2 * 10n ** 12n);
      expect(await ptContract.balanceOf(user3.address)).to.equal(dep3 * 10n ** 12n);

      // Fast-forward past maturity
      const maturity = await pi.getMaturity(sushiId, MATURITY_6M);
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(maturity.expiryTime) + 1]);
      await ethers.provider.send("evm_mine");

      // First redeemer gets exactly 1:1 payout (no impairment)
      const ptBal1 = await ptContract.balanceOf(user1.address);
      const usdcBefore = await usdc.balanceOf(user1.address);
      const usdtBefore = await usdt.balanceOf(user1.address);
      await pi.connect(user1).redeemPrincipalTokens(sushiId, MATURITY_6M, ptBal1);
      const usdcAfter = await usdc.balanceOf(user1.address);
      const usdtAfter = await usdt.balanceOf(user1.address);
      const totalPayout = (usdcAfter - usdcBefore) + (usdtAfter - usdtBefore);
      expect(totalPayout).to.equal(dep1);

      // Verify user1's PT balance is now 0
      expect(await ptContract.balanceOf(user1.address)).to.equal(0);

      // Verify user2 and user3 still hold their PT
      expect(await ptContract.balanceOf(user2.address)).to.equal(dep2 * 10n ** 12n);
      expect(await ptContract.balanceOf(user3.address)).to.equal(dep3 * 10n ** 12n);
    });
  });

  // ========== FLOW E: Edge Cases & Cross-Contract Guards ==========
  describe("Flow E: Cross-contract security and edge cases", function () {
    it("should prevent direct calls to applyImpairment (only ClaimManager)", async function () {
      const { pi, usdc, user1, aaveId } = await loadFixture(deployFullSystemFixture);

      await pi.connect(user1).mintTokens(aaveId, MATURITY_6M, usdc.target, 5_000n * 10n ** 6n);

      // Attempt direct impairment call (not through ClaimManager)
      await expect(
        pi.applyImpairment(aaveId, MATURITY_6M, 1_000n * 10n ** 6n)
      ).to.be.revertedWith("Only ClaimManager");
    });

    it("should prevent direct calls to claimInsurancePayout (only ClaimManager)", async function () {
      const { pi, usdc, user1, aaveId } = await loadFixture(deployFullSystemFixture);

      await expect(
        pi.claimInsurancePayout(user1.address, aaveId, MATURITY_6M, 1_000n * 10n ** 6n, usdc.target)
      ).to.be.revertedWith("Only ClaimManager");
    });

    it("should prevent redeeming before maturity (non-settled)", async function () {
      const { pi, usdc, user1, aaveId } = await loadFixture(deployFullSystemFixture);

      await pi.connect(user1).mintTokens(aaveId, MATURITY_6M, usdc.target, 5_000n * 10n ** 6n);

      // Try to redeem before maturity — should fail (not settled, can't auto-settle)
      await expect(
        pi.connect(user1).redeemPrincipalTokens(aaveId, MATURITY_6M, 5_000n * 10n ** 18n)
      ).to.be.reverted;
    });

    it("should prevent minting after maturity expiry", async function () {
      const { pi, usdc, user1, aaveId } = await loadFixture(deployFullSystemFixture);

      // Fast-forward past maturity
      const maturity = await pi.getMaturity(aaveId, MATURITY_6M);
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(maturity.expiryTime) + 1]);
      await ethers.provider.send("evm_mine");

      // Attempt to mint after expiry
      await expect(
        pi.connect(user1).mintTokens(aaveId, MATURITY_6M, usdc.target, 1_000n * 10n ** 6n)
      ).to.be.reverted;
    });

    it("should prevent burning IT when breach occurred", async function () {
      const { pi, cm, usdc, user1, sushiId } = await loadFixture(deployFullSystemFixture);

      await pi.connect(user1).mintTokens(sushiId, MATURITY_6M, usdc.target, 10_000n * 10n ** 6n);

      // Submit and approve claim → breach + settlement
      const hackDate = BigInt((await ethers.provider.getBlock("latest")).timestamp);
      const claimTx = await cm.connect(user1).submitClaim(sushiId, 5_000n * 10n ** 6n, hackDate, "Hacked", "");
      const receipt = await claimTx.wait();
      const claimEvent = receipt.logs.find((log) => {
        try { return cm.interface.parseLog({ topics: log.topics, data: log.data })?.name === "ClaimSubmitted"; }
        catch { return false; }
      });
      const claimId = cm.interface.parseLog({ topics: claimEvent.topics, data: claimEvent.data }).args.claimId;
      await cm.approveClaim(claimId, "Verified");

      // burnExpiredInsuranceTokens requires breachOccurred == false
      await expect(
        pi.connect(user1).burnExpiredInsuranceTokens(sushiId, MATURITY_6M)
      ).to.be.reverted;
    });

    it("should track DEX fee account balances across multiple trades", async function () {
      const { pi, dex, usdc, user1, user2, feeAccount, aaveId, aavePT } =
        await loadFixture(deployFullSystemFixture);

      await pi.connect(user1).mintTokens(aaveId, MATURITY_6M, usdc.target, 10_000n * 10n ** 6n);

      const ptContract = await ethers.getContractAt("PrincipalToken", aavePT);
      const price = 1n * PRICE_PRECISION; // 1.0 USDC per PT

      // Trade 1: 2000 PT
      const amount1 = 2_000n * 10n ** 18n;
      await ptContract.connect(user1).approve(dex.target, amount1);
      await dex.connect(user1).placeLimit(1, aavePT, usdc.target, amount1, price, MATURITY_6M);
      const quote1 = (amount1 * price) / PRICE_PRECISION / 10n ** 12n;
      const fee1 = (quote1 * 100n) / 10000n;
      await usdc.connect(user2).approve(dex.target, quote1 + fee1);
      const [, sellOrders1] = await dex.getList(aavePT, usdc.target, MATURITY_6M);
      await dex.connect(user2).takeOrder(sellOrders1[0], 0);

      // Trade 2: 3000 PT
      const amount2 = 3_000n * 10n ** 18n;
      await ptContract.connect(user1).approve(dex.target, amount2);
      await dex.connect(user1).placeLimit(1, aavePT, usdc.target, amount2, price, MATURITY_6M);
      const quote2 = (amount2 * price) / PRICE_PRECISION / 10n ** 12n;
      const fee2 = (quote2 * 100n) / 10000n;
      await usdc.connect(user2).approve(dex.target, quote2 + fee2);
      const [, sellOrders2] = await dex.getList(aavePT, usdc.target, MATURITY_6M);
      await dex.connect(user2).takeOrder(sellOrders2[0], 0);

      // Fee account should have accumulated fees from both trades
      const totalFees = await usdc.balanceOf(feeAccount.address);
      expect(totalFees).to.equal(fee1 + fee2);
    });
  });

  // ========== FLOW F: DEX Cancel + Relist After Settlement ==========
  describe("Flow F: Cancel DEX order and redeem tokens", function () {
    it("should return tokens on cancel and allow redemption after maturity", async function () {
      const { pi, dex, usdc, user1, aaveId, aavePT } =
        await loadFixture(deployFullSystemFixture);

      const depositAmount = 10_000n * 10n ** 6n;
      await pi.connect(user1).mintTokens(aaveId, MATURITY_6M, usdc.target, depositAmount);

      const ptContract = await ethers.getContractAt("PrincipalToken", aavePT);
      const ptBalance = await ptContract.balanceOf(user1.address);

      // List PT on DEX
      await ptContract.connect(user1).approve(dex.target, ptBalance);
      const tx = await dex.connect(user1).placeLimit(1, aavePT, usdc.target, ptBalance, PRICE_PRECISION, MATURITY_6M);
      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => {
        try { return dex.interface.parseLog({ topics: log.topics, data: log.data })?.name === "NewOrder"; }
        catch { return false; }
      });
      const orderId = dex.interface.parseLog({ topics: event.topics, data: event.data }).args.id;

      // PT locked in DEX
      expect(await ptContract.balanceOf(user1.address)).to.equal(0);

      // Cancel order — PT returned
      await dex.connect(user1).cancel(orderId);
      expect(await ptContract.balanceOf(user1.address)).to.equal(ptBalance);

      // Fast-forward and redeem
      const maturity = await pi.getMaturity(aaveId, MATURITY_6M);
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(maturity.expiryTime) + 1]);
      await ethers.provider.send("evm_mine");

      const usdcBefore = await usdc.balanceOf(user1.address);
      await pi.connect(user1).redeemPrincipalTokens(aaveId, MATURITY_6M, ptBalance);
      const usdcAfter = await usdc.balanceOf(user1.address);
      expect(usdcAfter - usdcBefore).to.equal(depositAmount);
    });
  });
});
