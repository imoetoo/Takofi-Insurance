const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("ProtocolInsurance (TokenMinting)", function () {
  const MATURITY_6M = 0;
  const MATURITY_12M = 1;

  async function deployProtocolInsuranceFixture() {
    const [owner, user1, user2, feeAccount] = await ethers.getSigners();

    // Deploy mock stablecoins
    const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
    const usdt = await MockStablecoin.deploy("Mock USDT", "USDT", 6);
    const usdc = await MockStablecoin.deploy("Mock USDC", "USDC", 6);

    // Deploy helpers
    const MaturityHelper = await ethers.getContractFactory("MaturityHelper");
    const maturityHelper = await MaturityHelper.deploy();

    const SettlementHelper = await ethers.getContractFactory("SettlementHelper");
    const settlementHelper = await SettlementHelper.deploy();

    // Deploy main contract
    const ProtocolInsurance = await ethers.getContractFactory("ProtocolInsurance");
    const pi = await ProtocolInsurance.deploy(
      usdt.target,
      usdc.target,
      maturityHelper.target,
      settlementHelper.target
    );

    // Deploy DEX
    const Dex = await ethers.getContractFactory("Dex");
    const dex = await Dex.deploy(feeAccount.address, 100);
    await pi.setDexContract(dex.target);

    // Mint stablecoins to users
    const userUsdtAmount = 100_000n * 10n ** 6n;
    await usdt.mint(user1.address, userUsdtAmount);
    await usdt.mint(user2.address, userUsdtAmount);
    await usdc.mint(user1.address, userUsdtAmount);
    await usdc.mint(user2.address, userUsdtAmount);

    // Approve the protocol contract
    const maxApproval = ethers.MaxUint256;
    await usdt.connect(user1).approve(pi.target, maxApproval);
    await usdt.connect(user2).approve(pi.target, maxApproval);
    await usdc.connect(user1).approve(pi.target, maxApproval);
    await usdc.connect(user2).approve(pi.target, maxApproval);

    // Get SushiSwap protocol ID (auto-registered in constructor)
    const sushiId = await pi.getProtocolId("SushiSwap");
    const aaveId = await pi.getProtocolId("Aave");

    return { pi, usdt, usdc, dex, maturityHelper, settlementHelper, owner, user1, user2, feeAccount, sushiId, aaveId };
  }

  describe("Deployment", function () {
    it("Should set correct owner", async function () {
      const { pi, owner } = await loadFixture(deployProtocolInsuranceFixture);
      expect(await pi.owner()).to.equal(owner.address);
    });

    it("Should set correct stablecoin addresses", async function () {
      const { pi, usdt, usdc } = await loadFixture(deployProtocolInsuranceFixture);
      expect(await pi.USDT()).to.equal(usdt.target);
      expect(await pi.USDC()).to.equal(usdc.target);
    });

    it("Should auto-register 6 protocols", async function () {
      const { pi } = await loadFixture(deployProtocolInsuranceFixture);

      const names = ["SushiSwap", "Curve Finance", "Aave", "Uniswap V3", "Compound", "PancakeSwap"];
      for (const name of names) {
        const protocolId = await pi.getProtocolId(name);
        const [, active] = await pi.protocols(protocolId);
        expect(active).to.be.true;
      }
    });

    it("Should initialize 6M and 12M maturities for each protocol", async function () {
      const { pi, sushiId } = await loadFixture(deployProtocolInsuranceFixture);

      const mat6M = await pi.getMaturity(sushiId, MATURITY_6M);
      const mat12M = await pi.getMaturity(sushiId, MATURITY_12M);

      expect(mat6M.isActive).to.be.true;
      expect(mat12M.isActive).to.be.true;
      expect(mat6M.expiryTime).to.be.lt(mat12M.expiryTime);
    });
  });

  describe("addProtocol()", function () {
    it("Should allow owner to add new protocol", async function () {
      const { pi } = await loadFixture(deployProtocolInsuranceFixture);

      await pi.addProtocol("NewProtocol", 200);
      const protocolId = await pi.getProtocolId("NewProtocol");
      const [, active] = await pi.protocols(protocolId);
      expect(active).to.be.true;
    });

    it("Should reject non-owner", async function () {
      const { pi, user1 } = await loadFixture(deployProtocolInsuranceFixture);
      await expect(pi.connect(user1).addProtocol("X", 0)).to.be.reverted;
    });

    it("Should deploy IT and PT tokens", async function () {
      const { pi } = await loadFixture(deployProtocolInsuranceFixture);

      await pi.addProtocol("TestProto", 0);
      const protocolId = await pi.getProtocolId("TestProto");
      const [insurance, principal] = await pi.getProtocolTokens(protocolId);
      expect(insurance).to.not.equal(ethers.ZeroAddress);
      expect(principal).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("mintTokens()", function () {
    it("Should mint IT and PT tokens with correct amounts", async function () {
      const { pi, usdt, sushiId, user1 } = await loadFixture(deployProtocolInsuranceFixture);

      const depositAmount = 1000n * 10n ** 6n; // 1000 USDT
      await pi.connect(user1).mintTokens(sushiId, MATURITY_6M, usdt.target, depositAmount);

      // 1000 USDT (6 dec) → 1000 * 10^12 = 1000 * 10^18 IT tokens
      const expectedIT = depositAmount * 10n ** 12n;
      const userIT = await pi.getUserITByMaturity(user1.address, sushiId, MATURITY_6M);
      const userPT = await pi.getUserPTByMaturity(user1.address, sushiId, MATURITY_6M);

      expect(userIT).to.equal(expectedIT);
      // PT should equal IT when no impairment (first deposit)
      expect(userPT).to.equal(expectedIT);
    });

    it("Should transfer stablecoins from user to contract", async function () {
      const { pi, usdt, sushiId, user1 } = await loadFixture(deployProtocolInsuranceFixture);

      const depositAmount = 500n * 10n ** 6n;
      const balBefore = await usdt.balanceOf(user1.address);

      await pi.connect(user1).mintTokens(sushiId, MATURITY_6M, usdt.target, depositAmount);

      const balAfter = await usdt.balanceOf(user1.address);
      expect(balBefore - balAfter).to.equal(depositAmount);
    });

    it("Should update totalDeposited", async function () {
      const { pi, usdt, sushiId, user1 } = await loadFixture(deployProtocolInsuranceFixture);

      await pi.connect(user1).mintTokens(sushiId, MATURITY_6M, usdt.target, 1000n * 10n ** 6n);

      const [, , , , totalDeposited] = await pi.protocols(sushiId);
      expect(totalDeposited).to.equal(1000n * 10n ** 6n);
    });

    it("Should emit TokensMinted event", async function () {
      const { pi, usdt, sushiId, user1 } = await loadFixture(deployProtocolInsuranceFixture);

      await expect(
        pi.connect(user1).mintTokens(sushiId, MATURITY_6M, usdt.target, 1000n * 10n ** 6n)
      ).to.emit(pi, "TokensMinted");
    });

    it("Should reject inactive protocol", async function () {
      const { pi, usdt, sushiId, user1 } = await loadFixture(deployProtocolInsuranceFixture);

      await pi.pauseProtocol(sushiId);
      await expect(
        pi.connect(user1).mintTokens(sushiId, MATURITY_6M, usdt.target, 1000n * 10n ** 6n)
      ).to.be.reverted;
    });

    it("Should reject unsupported stablecoin", async function () {
      const { pi, sushiId, user1 } = await loadFixture(deployProtocolInsuranceFixture);

      await expect(
        pi.connect(user1).mintTokens(sushiId, MATURITY_6M, ethers.ZeroAddress, 1000n * 10n ** 6n)
      ).to.be.reverted;
    });

    it("Should reject zero amount", async function () {
      const { pi, usdt, sushiId, user1 } = await loadFixture(deployProtocolInsuranceFixture);

      await expect(
        pi.connect(user1).mintTokens(sushiId, MATURITY_6M, usdt.target, 0)
      ).to.be.reverted;
    });

    it("Should work with USDC", async function () {
      const { pi, usdc, sushiId, user1 } = await loadFixture(deployProtocolInsuranceFixture);

      const depositAmount = 500n * 10n ** 6n;
      await pi.connect(user1).mintTokens(sushiId, MATURITY_6M, usdc.target, depositAmount);

      const userIT = await pi.getUserITByMaturity(user1.address, sushiId, MATURITY_6M);
      expect(userIT).to.equal(depositAmount * 10n ** 12n);
    });

    it("Should track total IT and PT by maturity", async function () {
      const { pi, usdt, sushiId, user1, user2 } = await loadFixture(deployProtocolInsuranceFixture);

      await pi.connect(user1).mintTokens(sushiId, MATURITY_6M, usdt.target, 1000n * 10n ** 6n);
      await pi.connect(user2).mintTokens(sushiId, MATURITY_6M, usdt.target, 2000n * 10n ** 6n);

      const totalIT = await pi.getTotalITByMaturity(sushiId, MATURITY_6M);
      expect(totalIT).to.equal(3000n * 10n ** 18n);
    });
  });

  describe("burnTokens()", function () {
    it("Should burn equal IT and PT and return stablecoins", async function () {
      const { pi, usdt, sushiId, user1 } = await loadFixture(deployProtocolInsuranceFixture);

      const depositAmount = 1000n * 10n ** 6n;
      await pi.connect(user1).mintTokens(sushiId, MATURITY_6M, usdt.target, depositAmount);

      const tokenAmount = depositAmount * 10n ** 12n;
      const balBefore = await usdt.balanceOf(user1.address);

      await pi.connect(user1).burnTokens(sushiId, tokenAmount, tokenAmount, usdt.target);

      const balAfter = await usdt.balanceOf(user1.address);
      expect(balAfter - balBefore).to.equal(depositAmount);
    });

    it("Should reject unequal IT and PT amounts", async function () {
      const { pi, usdt, sushiId, user1 } = await loadFixture(deployProtocolInsuranceFixture);

      await pi.connect(user1).mintTokens(sushiId, MATURITY_6M, usdt.target, 1000n * 10n ** 6n);

      await expect(
        pi.connect(user1).burnTokens(sushiId, 100n * 10n ** 18n, 200n * 10n ** 18n, usdt.target)
      ).to.be.reverted;
    });
  });

  describe("View functions", function () {
    it("getProtocolTokens() should return valid token addresses", async function () {
      const { pi, sushiId } = await loadFixture(deployProtocolInsuranceFixture);

      const [insurance, principal] = await pi.getProtocolTokens(sushiId);
      expect(insurance).to.not.equal(ethers.ZeroAddress);
      expect(principal).to.not.equal(ethers.ZeroAddress);
    });

    it("getUserTokenBalances() should reflect minted tokens", async function () {
      const { pi, usdt, sushiId, user1 } = await loadFixture(deployProtocolInsuranceFixture);

      await pi.connect(user1).mintTokens(sushiId, MATURITY_6M, usdt.target, 1000n * 10n ** 6n);

      const [insurance, principal] = await pi.getUserTokenBalances(user1.address, sushiId);
      expect(insurance).to.be.gt(0);
      expect(principal).to.be.gt(0);
    });

    it("getProtocolId() should be deterministic", async function () {
      const { pi } = await loadFixture(deployProtocolInsuranceFixture);

      const id1 = await pi.getProtocolId("SushiSwap");
      const id2 = await pi.getProtocolId("SushiSwap");
      expect(id1).to.equal(id2);
    });

    it("getMaturities() should return both maturities", async function () {
      const { pi, sushiId } = await loadFixture(deployProtocolInsuranceFixture);

      const [mat6M, mat12M] = await pi.getMaturities(sushiId);
      expect(mat6M.isActive).to.be.true;
      expect(mat12M.isActive).to.be.true;
    });

    it("isMaturityExpired() should return false for future maturity", async function () {
      const { pi, sushiId } = await loadFixture(deployProtocolInsuranceFixture);

      const expired = await pi.isMaturityExpired(sushiId, MATURITY_6M);
      expect(expired).to.be.false;
    });

    it("getDaysUntilMaturity() should return non-zero value", async function () {
      const { pi, sushiId } = await loadFixture(deployProtocolInsuranceFixture);

      const days = await pi.getDaysUntilMaturity(sushiId, MATURITY_6M);
      expect(days).to.be.gt(0);
    });
  });

  describe("Impairment", function () {
    it("getImpairmentFactor() should return 1e18 with no payouts", async function () {
      const { pi, sushiId } = await loadFixture(deployProtocolInsuranceFixture);

      const factor = await pi.getImpairmentFactor(sushiId, MATURITY_6M);
      expect(factor).to.equal(10n ** 18n);
    });

    it("applyImpairment() should only be callable by claimManager", async function () {
      const { pi, sushiId, user1 } = await loadFixture(deployProtocolInsuranceFixture);

      await expect(
        pi.connect(user1).applyImpairment(sushiId, MATURITY_6M, 100n * 10n ** 6n)
      ).to.be.revertedWith("Only ClaimManager");
    });

    it("applyImpairment() should increase totalPayoutByMaturity", async function () {
      const { pi, usdt, sushiId, user1, owner } = await loadFixture(deployProtocolInsuranceFixture);

      // Deposit first
      await pi.connect(user1).mintTokens(sushiId, MATURITY_6M, usdt.target, 10_000n * 10n ** 6n);

      // Set claimManager to owner for testing
      await pi.setClaimManager(owner.address);

      const payoutAmount = 1000n * 10n ** 6n;
      await pi.applyImpairment(sushiId, MATURITY_6M, payoutAmount);

      const totalPayout = await pi.getTotalPayoutByMaturity(sushiId, MATURITY_6M);
      expect(totalPayout).to.equal(payoutAmount);
    });

    it("Impairment should change impairment factor", async function () {
      const { pi, usdt, sushiId, user1, owner } = await loadFixture(deployProtocolInsuranceFixture);

      await pi.connect(user1).mintTokens(sushiId, MATURITY_6M, usdt.target, 10_000n * 10n ** 6n);
      await pi.setClaimManager(owner.address);

      await pi.applyImpairment(sushiId, MATURITY_6M, 2000n * 10n ** 6n);

      const factor = await pi.getImpairmentFactor(sushiId, MATURITY_6M);
      // (10000 - 2000) / 10000 = 0.8 = 8e17
      expect(factor).to.equal(8n * 10n ** 17n);
    });
  });

  describe("Settlement & Redemption", function () {
    it("settleMaturity() should mark maturity as settled", async function () {
      const { pi, usdt, sushiId, user1 } = await loadFixture(deployProtocolInsuranceFixture);

      // Need to deposit and fast forward past maturity
      await pi.connect(user1).mintTokens(sushiId, MATURITY_6M, usdt.target, 1000n * 10n ** 6n);

      const mat = await pi.getMaturity(sushiId, MATURITY_6M);
      await time.increaseTo(mat.expiryTime + 1n);

      await pi.settleMaturity(sushiId, MATURITY_6M, false, 0);

      const settledMat = await pi.getMaturity(sushiId, MATURITY_6M);
      expect(settledMat.isSettled).to.be.true;
      expect(settledMat.breachOccurred).to.be.false;
    });

    it("redeemPrincipalTokens() should return stablecoins after settlement", async function () {
      const { pi, usdt, sushiId, user1 } = await loadFixture(deployProtocolInsuranceFixture);

      const depositAmount = 1000n * 10n ** 6n;
      await pi.connect(user1).mintTokens(sushiId, MATURITY_6M, usdt.target, depositAmount);

      const mat = await pi.getMaturity(sushiId, MATURITY_6M);
      await time.increaseTo(mat.expiryTime + 1n);
      await pi.settleMaturity(sushiId, MATURITY_6M, false, 0);

      const ptBalance = await pi.getUserPTByMaturity(user1.address, sushiId, MATURITY_6M);
      const balBefore = await usdt.balanceOf(user1.address);

      await pi.connect(user1).redeemPrincipalTokens(sushiId, MATURITY_6M, ptBalance);

      const balAfter = await usdt.balanceOf(user1.address);
      // Should get back ~1000 USDT (no breach)
      expect(balAfter - balBefore).to.equal(depositAmount);
    });

    it("redeemPrincipalTokens() should auto-settle if conditions met", async function () {
      const { pi, usdt, sushiId, user1 } = await loadFixture(deployProtocolInsuranceFixture);

      const depositAmount = 1000n * 10n ** 6n;
      await pi.connect(user1).mintTokens(sushiId, MATURITY_6M, usdt.target, depositAmount);

      const mat = await pi.getMaturity(sushiId, MATURITY_6M);
      await time.increaseTo(mat.expiryTime + 1n);

      // Don't manually settle — let auto-settle happen
      const ptBalance = await pi.getUserPTByMaturity(user1.address, sushiId, MATURITY_6M);
      await pi.connect(user1).redeemPrincipalTokens(sushiId, MATURITY_6M, ptBalance);

      const settledMat = await pi.getMaturity(sushiId, MATURITY_6M);
      expect(settledMat.isSettled).to.be.true;
    });

    it("redeemPrincipalTokens() should revert before maturity", async function () {
      const { pi, usdt, sushiId, user1 } = await loadFixture(deployProtocolInsuranceFixture);

      await pi.connect(user1).mintTokens(sushiId, MATURITY_6M, usdt.target, 1000n * 10n ** 6n);
      const ptBalance = await pi.getUserPTByMaturity(user1.address, sushiId, MATURITY_6M);

      await expect(
        pi.connect(user1).redeemPrincipalTokens(sushiId, MATURITY_6M, ptBalance)
      ).to.be.reverted;
    });

    it("redeemPrincipalTokens() with impairment should return less", async function () {
      const { pi, usdt, sushiId, user1, owner } = await loadFixture(deployProtocolInsuranceFixture);

      const depositAmount = 10_000n * 10n ** 6n;
      await pi.connect(user1).mintTokens(sushiId, MATURITY_6M, usdt.target, depositAmount);

      await pi.setClaimManager(owner.address);
      // 20% breach
      await pi.applyImpairment(sushiId, MATURITY_6M, 2000n * 10n ** 6n);

      const mat = await pi.getMaturity(sushiId, MATURITY_6M);
      await time.increaseTo(mat.expiryTime + 1n);
      await pi.settleMaturity(sushiId, MATURITY_6M, true, 2000n * 10n ** 6n);

      const ptBalance = await pi.getUserPTByMaturity(user1.address, sushiId, MATURITY_6M);
      const balBefore = await usdt.balanceOf(user1.address);

      await pi.connect(user1).redeemPrincipalTokens(sushiId, MATURITY_6M, ptBalance);

      const balAfter = await usdt.balanceOf(user1.address);
      // Should get back 8000 USDT (10000 - 2000 breach)
      expect(balAfter - balBefore).to.equal(8000n * 10n ** 6n);
    });

    it("burnExpiredInsuranceTokens() should work after no-breach settlement", async function () {
      const { pi, usdt, sushiId, user1 } = await loadFixture(deployProtocolInsuranceFixture);

      await pi.connect(user1).mintTokens(sushiId, MATURITY_6M, usdt.target, 1000n * 10n ** 6n);

      const mat = await pi.getMaturity(sushiId, MATURITY_6M);
      await time.increaseTo(mat.expiryTime + 1n);
      await pi.settleMaturity(sushiId, MATURITY_6M, false, 0);

      await expect(
        pi.connect(user1).burnExpiredInsuranceTokens(sushiId, MATURITY_6M)
      ).to.emit(pi, "ExpiredITBurned");

      const userIT = await pi.getUserITByMaturity(user1.address, sushiId, MATURITY_6M);
      expect(userIT).to.equal(0);
    });
  });

  describe("Admin functions", function () {
    it("setDexContract() should update DEX address", async function () {
      const { pi, dex } = await loadFixture(deployProtocolInsuranceFixture);

      await expect(pi.setDexContract(dex.target))
        .to.emit(pi, "DexContractUpdated");
    });

    it("setClaimManager() should update claim manager", async function () {
      const { pi, user1 } = await loadFixture(deployProtocolInsuranceFixture);

      await pi.setClaimManager(user1.address);
      expect(await pi.claimManager()).to.equal(user1.address);
    });

    it("pauseProtocol() should deactivate protocol", async function () {
      const { pi, sushiId } = await loadFixture(deployProtocolInsuranceFixture);

      await pi.pauseProtocol(sushiId);
      const [, active] = await pi.protocols(sushiId);
      expect(active).to.be.false;
    });

    it("unpauseProtocol() should reactivate protocol", async function () {
      const { pi, sushiId } = await loadFixture(deployProtocolInsuranceFixture);

      await pi.pauseProtocol(sushiId);
      await pi.unpauseProtocol(sushiId);
      const [, active] = await pi.protocols(sushiId);
      expect(active).to.be.true;
    });

    it("emergencyWithdraw() should withdraw tokens", async function () {
      const { pi, usdt, sushiId, user1, owner } = await loadFixture(deployProtocolInsuranceFixture);

      // Deposit some stablecoins
      await pi.connect(user1).mintTokens(sushiId, MATURITY_6M, usdt.target, 1000n * 10n ** 6n);

      const ownerBalBefore = await usdt.balanceOf(owner.address);
      await pi.emergencyWithdraw(usdt.target, 500n * 10n ** 6n);
      const ownerBalAfter = await usdt.balanceOf(owner.address);

      expect(ownerBalAfter - ownerBalBefore).to.equal(500n * 10n ** 6n);
    });
  });
});
