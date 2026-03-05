const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("Dex", function () {
  const PRICE_PRECISION = 10n ** 18n;
  const MATURITY_6M = 0;
  const MATURITY_12M = 1;

  async function deployDexFixture() {
    const [owner, feeAccount, trader1, trader2] = await ethers.getSigners();

    // Deploy mock stablecoins
    const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
    const usdt = await MockStablecoin.deploy("Mock USDT", "USDT", 6);
    const usdc = await MockStablecoin.deploy("Mock USDC", "USDC", 6);

    // Deploy mock tokens for base (IT/PT-like ERC20s)
    const baseToken = await MockStablecoin.deploy("Insurance Token", "iToken", 18);
    const baseToken2 = await MockStablecoin.deploy("Principal Token", "pToken", 18);

    // Deploy DEX with 1% fee (100 bps)
    const Dex = await ethers.getContractFactory("Dex");
    const dex = await Dex.deploy(feeAccount.address, 100);

    // Mint tokens to traders
    const traderUsdtAmount = 100_000n * 10n ** 6n;
    const traderBaseAmount = 100_000n * 10n ** 18n;

    await usdt.mint(trader1.address, traderUsdtAmount);
    await usdt.mint(trader2.address, traderUsdtAmount);
    await usdc.mint(trader1.address, traderUsdtAmount);
    await usdc.mint(trader2.address, traderUsdtAmount);
    await baseToken.mint(trader1.address, traderBaseAmount);
    await baseToken.mint(trader2.address, traderBaseAmount);

    // Approve DEX for spending
    const maxApproval = ethers.MaxUint256;
    await usdt.connect(trader1).approve(dex.target, maxApproval);
    await usdt.connect(trader2).approve(dex.target, maxApproval);
    await usdc.connect(trader1).approve(dex.target, maxApproval);
    await usdc.connect(trader2).approve(dex.target, maxApproval);
    await baseToken.connect(trader1).approve(dex.target, maxApproval);
    await baseToken.connect(trader2).approve(dex.target, maxApproval);

    return { dex, usdt, usdc, baseToken, baseToken2, owner, feeAccount, trader1, trader2 };
  }

  describe("Deployment", function () {
    it("Should set correct fee account and fee percent", async function () {
      const { dex, feeAccount } = await loadFixture(deployDexFixture);

      expect(await dex.feeAccount()).to.equal(feeAccount.address);
      expect(await dex.feePercent()).to.equal(100);
    });

    it("Should start order IDs at 1", async function () {
      const { dex } = await loadFixture(deployDexFixture);

      expect(await dex.nextOrderId()).to.equal(1);
      expect(await dex.nextStopOrderId()).to.equal(1);
    });
  });

  describe("Admin functions", function () {
    it("Should allow owner to change fee account", async function () {
      const { dex, owner, trader1 } = await loadFixture(deployDexFixture);

      await expect(dex.setFeeAccount(trader1.address))
        .to.emit(dex, "FeeAccountChanged");

      expect(await dex.feeAccount()).to.equal(trader1.address);
    });

    it("Should reject zero address for fee account", async function () {
      const { dex } = await loadFixture(deployDexFixture);

      await expect(dex.setFeeAccount(ethers.ZeroAddress))
        .to.be.revertedWith("Fee account cannot be zero address");
    });

    it("Should allow owner to change fee percent", async function () {
      const { dex } = await loadFixture(deployDexFixture);

      await expect(dex.setFeePercent(200))
        .to.emit(dex, "FeePercentChanged");

      expect(await dex.feePercent()).to.equal(200);
    });

    it("Should reject fee percent over 10%", async function () {
      const { dex } = await loadFixture(deployDexFixture);

      await expect(dex.setFeePercent(1001))
        .to.be.revertedWith("Fee percent cannot exceed 10%");
    });

    it("Should reject non-owner from changing fee settings", async function () {
      const { dex, trader1 } = await loadFixture(deployDexFixture);

      await expect(dex.connect(trader1).setFeePercent(200))
        .to.be.reverted;
    });
  });

  describe("placeLimit() — SELL orders", function () {
    it("Should place a SELL order and lock base tokens", async function () {
      const { dex, baseToken, usdt, trader1 } = await loadFixture(deployDexFixture);

      const sellAmount = 100n * 10n ** 18n;
      const price = PRICE_PRECISION / 10n; // 0.1 USDT per token

      const balBefore = await baseToken.balanceOf(trader1.address);

      await expect(
        dex.connect(trader1).placeLimit(1, baseToken.target, usdt.target, sellAmount, price, MATURITY_6M)
      ).to.emit(dex, "NewOrder");

      const balAfter = await baseToken.balanceOf(trader1.address);
      expect(balBefore - balAfter).to.equal(sellAmount);
    });

    it("Should create correctly structured order", async function () {
      const { dex, baseToken, usdt, trader1 } = await loadFixture(deployDexFixture);

      const sellAmount = 50n * 10n ** 18n;
      const price = PRICE_PRECISION / 5n; // 0.2

      await dex.connect(trader1).placeLimit(1, baseToken.target, usdt.target, sellAmount, price, MATURITY_6M);

      const order = await dex.getOrder(1);
      expect(order.trader).to.equal(trader1.address);
      expect(order.action).to.equal(1); // SELL
      expect(order.amount).to.equal(sellAmount);
      expect(order.price).to.equal(price);
      expect(order.active).to.be.true;
    });
  });

  describe("placeLimit() — BUY orders", function () {
    it("Should place a BUY order and lock quote tokens", async function () {
      const { dex, baseToken, usdt, trader1 } = await loadFixture(deployDexFixture);

      const buyAmount = 100n * 10n ** 18n;
      const price = PRICE_PRECISION / 10n; // 0.1 USDT per token

      // Expected quote locked = (buyAmount * price / PRICE_PRECISION) / 1e12
      const expectedQuoteLocked = (buyAmount * price / PRICE_PRECISION) / 10n ** 12n;
      const balBefore = await usdt.balanceOf(trader1.address);

      await dex.connect(trader1).placeLimit(0, baseToken.target, usdt.target, buyAmount, price, MATURITY_6M);

      const balAfter = await usdt.balanceOf(trader1.address);
      expect(balBefore - balAfter).to.equal(expectedQuoteLocked);
    });
  });

  describe("placeLimit() — validation", function () {
    it("Should reject zero base address", async function () {
      const { dex, usdt, trader1 } = await loadFixture(deployDexFixture);

      await expect(
        dex.connect(trader1).placeLimit(0, ethers.ZeroAddress, usdt.target, 100, PRICE_PRECISION, 0)
      ).to.be.revertedWith("Invalid token address");
    });

    it("Should reject same base and quote", async function () {
      const { dex, usdt, trader1 } = await loadFixture(deployDexFixture);

      await expect(
        dex.connect(trader1).placeLimit(0, usdt.target, usdt.target, 100, PRICE_PRECISION, 0)
      ).to.be.revertedWith("Base and quote tokens must differ");
    });

    it("Should reject zero amount", async function () {
      const { dex, baseToken, usdt, trader1 } = await loadFixture(deployDexFixture);

      await expect(
        dex.connect(trader1).placeLimit(0, baseToken.target, usdt.target, 0, PRICE_PRECISION, 0)
      ).to.be.revertedWith("Amount and price must be positive");
    });
  });

  describe("Order matching", function () {
    it("Should match BUY against existing SELL when prices cross", async function () {
      const { dex, baseToken, usdt, trader1, trader2 } = await loadFixture(deployDexFixture);

      const amount = 10n * 10n ** 18n;
      const sellPrice = PRICE_PRECISION / 10n; // 0.1
      const buyPrice = PRICE_PRECISION / 10n; // 0.1 (matches)

      // Trader1 places SELL
      await dex.connect(trader1).placeLimit(1, baseToken.target, usdt.target, amount, sellPrice, MATURITY_6M);

      // Trader2 places BUY — should match
      await expect(
        dex.connect(trader2).placeLimit(0, baseToken.target, usdt.target, amount, buyPrice, MATURITY_6M)
      ).to.emit(dex, "OrderFilled");

      // Trader2 should have received base tokens
      expect(await baseToken.balanceOf(trader2.address)).to.be.greaterThan(0n);
    });

    it("Should NOT match when BUY price < SELL price", async function () {
      const { dex, baseToken, usdt, trader1, trader2 } = await loadFixture(deployDexFixture);

      const amount = 10n * 10n ** 18n;
      const sellPrice = PRICE_PRECISION / 5n; // 0.2
      const buyPrice = PRICE_PRECISION / 10n; // 0.1 (below sell)

      await dex.connect(trader1).placeLimit(1, baseToken.target, usdt.target, amount, sellPrice, MATURITY_6M);
      await dex.connect(trader2).placeLimit(0, baseToken.target, usdt.target, amount, buyPrice, MATURITY_6M);

      // Both orders should remain active
      const sellOrder = await dex.getOrder(1);
      const buyOrder = await dex.getOrder(2);
      expect(sellOrder.active).to.be.true;
      expect(buyOrder.active).to.be.true;
    });
  });

  describe("cancel()", function () {
    it("Should cancel SELL order and refund base tokens", async function () {
      const { dex, baseToken, usdt, trader1 } = await loadFixture(deployDexFixture);

      const amount = 50n * 10n ** 18n;
      const price = PRICE_PRECISION / 10n;

      const balBefore = await baseToken.balanceOf(trader1.address);
      await dex.connect(trader1).placeLimit(1, baseToken.target, usdt.target, amount, price, MATURITY_6M);
      await dex.connect(trader1).cancel(1);

      const balAfter = await baseToken.balanceOf(trader1.address);
      expect(balAfter).to.equal(balBefore); // Full refund
    });

    it("Should cancel BUY order and refund quote tokens", async function () {
      const { dex, baseToken, usdt, trader1 } = await loadFixture(deployDexFixture);

      const amount = 50n * 10n ** 18n;
      const price = PRICE_PRECISION / 10n;

      const balBefore = await usdt.balanceOf(trader1.address);
      await dex.connect(trader1).placeLimit(0, baseToken.target, usdt.target, amount, price, MATURITY_6M);
      await dex.connect(trader1).cancel(1);

      const balAfter = await usdt.balanceOf(trader1.address);
      expect(balAfter).to.equal(balBefore); // Full refund
    });

    it("Should reject cancel from non-owner", async function () {
      const { dex, baseToken, usdt, trader1, trader2 } = await loadFixture(deployDexFixture);

      await dex.connect(trader1).placeLimit(1, baseToken.target, usdt.target, 10n * 10n ** 18n, PRICE_PRECISION / 10n, 0);

      await expect(dex.connect(trader2).cancel(1))
        .to.be.revertedWith("not order owner");
    });

    it("Should reject cancel of inactive order", async function () {
      const { dex, baseToken, usdt, trader1 } = await loadFixture(deployDexFixture);

      await dex.connect(trader1).placeLimit(1, baseToken.target, usdt.target, 10n * 10n ** 18n, PRICE_PRECISION / 10n, 0);
      await dex.connect(trader1).cancel(1);

      await expect(dex.connect(trader1).cancel(1))
        .to.be.revertedWith("order inactive");
    });

    it("Should emit OrderCancelled event", async function () {
      const { dex, baseToken, usdt, trader1 } = await loadFixture(deployDexFixture);

      await dex.connect(trader1).placeLimit(1, baseToken.target, usdt.target, 10n * 10n ** 18n, PRICE_PRECISION / 10n, 0);

      await expect(dex.connect(trader1).cancel(1))
        .to.emit(dex, "OrderCancelled")
        .withArgs(1);
    });
  });

  describe("takeOrder()", function () {
    it("Should fill a SELL order (taker buys)", async function () {
      const { dex, baseToken, usdt, trader1, trader2 } = await loadFixture(deployDexFixture);

      const amount = 10n * 10n ** 18n;
      const price = PRICE_PRECISION / 10n; // 0.1

      // Trader1 places SELL
      await dex.connect(trader1).placeLimit(1, baseToken.target, usdt.target, amount, price, 0);

      // Trader2 takes the order
      await expect(
        dex.connect(trader2).takeOrder(1, amount)
      ).to.emit(dex, "OrderFilled");

      // Trader2 should have received the base tokens
      const trader2Base = await baseToken.balanceOf(trader2.address);
      expect(trader2Base).to.be.greaterThan(100_000n * 10n ** 18n - 1n); // Original balance + bought
    });

    it("Should allow partial fills", async function () {
      const { dex, baseToken, usdt, trader1, trader2 } = await loadFixture(deployDexFixture);

      const amount = 100n * 10n ** 18n;
      const takeAmount = 40n * 10n ** 18n;
      const price = PRICE_PRECISION / 10n;

      await dex.connect(trader1).placeLimit(1, baseToken.target, usdt.target, amount, price, 0);
      await dex.connect(trader2).takeOrder(1, takeAmount);

      const order = await dex.getOrder(1);
      expect(order.filled).to.equal(takeAmount);
      expect(order.active).to.be.true; // Still active
    });
  });

  describe("getBestPrice()", function () {
    it("Should return 0 when no orders exist", async function () {
      const { dex, baseToken, usdt } = await loadFixture(deployDexFixture);

      const price = await dex.getBestPrice(baseToken.target, usdt.target, 0, 0); // BUY
      expect(price).to.equal(0);
    });

    it("Should return best sell price for BUY action", async function () {
      const { dex, baseToken, usdt, trader1 } = await loadFixture(deployDexFixture);

      const lowPrice = PRICE_PRECISION / 10n; // 0.1
      const highPrice = PRICE_PRECISION / 5n; // 0.2

      // Place two sell orders
      await dex.connect(trader1).placeLimit(1, baseToken.target, usdt.target, 10n * 10n ** 18n, highPrice, 0);
      await dex.connect(trader1).placeLimit(1, baseToken.target, usdt.target, 10n * 10n ** 18n, lowPrice, 0);

      // Best price for buying = lowest sell price
      const best = await dex.getBestPrice(baseToken.target, usdt.target, 0, 0);
      expect(best).to.equal(lowPrice);
    });

    it("Should return best buy price for SELL action", async function () {
      const { dex, baseToken, usdt, trader1, trader2 } = await loadFixture(deployDexFixture);

      const lowPrice = PRICE_PRECISION / 20n; // 0.05
      const highPrice = PRICE_PRECISION / 10n; // 0.1

      await dex.connect(trader1).placeLimit(0, baseToken.target, usdt.target, 10n * 10n ** 18n, lowPrice, 0);
      await dex.connect(trader2).placeLimit(0, baseToken.target, usdt.target, 10n * 10n ** 18n, highPrice, 0);

      // Best price for selling = highest buy price
      const best = await dex.getBestPrice(baseToken.target, usdt.target, 0, 1);
      expect(best).to.equal(highPrice);
    });
  });

  describe("getList()", function () {
    it("Should return buy and sell order arrays", async function () {
      const { dex, baseToken, usdt, trader1, trader2 } = await loadFixture(deployDexFixture);

      await dex.connect(trader1).placeLimit(1, baseToken.target, usdt.target, 10n * 10n ** 18n, PRICE_PRECISION / 10n, 0);
      await dex.connect(trader2).placeLimit(0, baseToken.target, usdt.target, 10n * 10n ** 18n, PRICE_PRECISION / 20n, 0);

      const [buyOrders, sellOrders] = await dex.getList(baseToken.target, usdt.target, 0);
      expect(sellOrders.length).to.equal(1);
      expect(buyOrders.length).to.equal(1);
    });
  });

  describe("getOrdersByTrader()", function () {
    it("Should return all orders for a specific trader", async function () {
      const { dex, baseToken, usdt, trader1 } = await loadFixture(deployDexFixture);

      await dex.connect(trader1).placeLimit(1, baseToken.target, usdt.target, 10n * 10n ** 18n, PRICE_PRECISION / 10n, 0);
      await dex.connect(trader1).placeLimit(0, baseToken.target, usdt.target, 5n * 10n ** 18n, PRICE_PRECISION / 20n, 0);

      const traderOrders = await dex.getOrdersByTrader(trader1.address, baseToken.target, usdt.target, 0);
      expect(traderOrders.length).to.equal(2);
    });
  });

  describe("Maturity-scoped order books", function () {
    it("Should keep separate order books per maturity index", async function () {
      const { dex, baseToken, usdt, trader1 } = await loadFixture(deployDexFixture);

      // Place sell order in maturity 0
      await dex.connect(trader1).placeLimit(1, baseToken.target, usdt.target, 10n * 10n ** 18n, PRICE_PRECISION / 10n, MATURITY_6M);
      // Place sell order in maturity 1
      await dex.connect(trader1).placeLimit(1, baseToken.target, usdt.target, 10n * 10n ** 18n, PRICE_PRECISION / 5n, MATURITY_12M);

      const [, sells6M] = await dex.getList(baseToken.target, usdt.target, MATURITY_6M);
      const [, sells12M] = await dex.getList(baseToken.target, usdt.target, MATURITY_12M);

      expect(sells6M.length).to.equal(1);
      expect(sells12M.length).to.equal(1);

      // Best prices should differ per maturity
      const best6M = await dex.getBestPrice(baseToken.target, usdt.target, MATURITY_6M, 0);
      const best12M = await dex.getBestPrice(baseToken.target, usdt.target, MATURITY_12M, 0);
      expect(best6M).to.not.equal(best12M);
    });
  });

  describe("Fees", function () {
    it("Should deduct fees and send to fee account", async function () {
      const { dex, baseToken, usdt, trader1, trader2, feeAccount } = await loadFixture(deployDexFixture);

      const amount = 1000n * 10n ** 18n;
      const price = PRICE_PRECISION / 10n; // 0.1 per token

      // Trader1 sells, trader2 takes
      await dex.connect(trader1).placeLimit(1, baseToken.target, usdt.target, amount, price, 0);

      const feeBefore = await usdt.balanceOf(feeAccount.address);
      await dex.connect(trader2).takeOrder(1, amount);
      const feeAfter = await usdt.balanceOf(feeAccount.address);

      // Fee should be 1% of quote amount
      // quoteAmount = (1000 * 1e18 * 0.1*1e18 / 1e18) / 1e12 = 100 * 1e6
      const expectedQuote = 100n * 10n ** 6n;
      const expectedFee = expectedQuote / 100n; // 1%
      expect(feeAfter - feeBefore).to.equal(expectedFee);
    });
  });

  describe("Stop-limit orders", function () {
    it("Should place a stop-limit order", async function () {
      const { dex, baseToken, usdt, trader1 } = await loadFixture(deployDexFixture);

      const amount = 10n * 10n ** 18n;
      const stopPrice = PRICE_PRECISION / 20n;
      const limitPrice = PRICE_PRECISION / 10n;

      await expect(
        dex.connect(trader1).placeStopLimit(1, baseToken.target, usdt.target, amount, stopPrice, limitPrice, 0)
      ).to.emit(dex, "StopLimitPlaced");

      const stopOrder = await dex.getStopOrder(1);
      expect(stopOrder.trader).to.equal(trader1.address);
      expect(stopOrder.active).to.be.true;
      expect(stopOrder.triggered).to.be.false;
    });

    it("Should cancel a stop-limit order and refund", async function () {
      const { dex, baseToken, usdt, trader1 } = await loadFixture(deployDexFixture);

      const amount = 10n * 10n ** 18n;
      const balBefore = await baseToken.balanceOf(trader1.address);

      await dex.connect(trader1).placeStopLimit(1, baseToken.target, usdt.target, amount, PRICE_PRECISION / 20n, PRICE_PRECISION / 10n, 0);
      await dex.connect(trader1).cancelStop(1);

      const balAfter = await baseToken.balanceOf(trader1.address);
      expect(balAfter).to.equal(balBefore);
    });
  });
});
