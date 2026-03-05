const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("ClaimManager", function () {
  const MATURITY_6M = 0;
  const SUPERADMIN = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Hardhat account #0

  async function deployClaimManagerFixture() {
    const [superadmin, user1, user2] = await ethers.getSigners();

    // Superadmin should be account #0 (matches SUPERADMIN constant)
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

    // Deploy main ProtocolInsurance contract
    const ProtocolInsurance = await ethers.getContractFactory("ProtocolInsurance");
    const pi = await ProtocolInsurance.deploy(
      usdt.target,
      usdc.target,
      maturityHelper.target,
      settlementHelper.target
    );

    // Deploy ClaimManager
    const ClaimManager = await ethers.getContractFactory("ClaimManager");
    const cm = await ClaimManager.deploy(pi.target);

    // Set ClaimManager on ProtocolInsurance
    await pi.setClaimManager(cm.target);

    // Get protocol IDs
    const sushiId = await pi.getProtocolId("SushiSwap");
    const aaveId = await pi.getProtocolId("Aave");

    // Mint stablecoins and approve
    const amount = 100_000n * 10n ** 6n;
    await usdt.mint(user1.address, amount);
    await usdt.mint(user2.address, amount);
    await usdc.mint(user1.address, amount);
    await usdt.connect(user1).approve(pi.target, ethers.MaxUint256);
    await usdt.connect(user2).approve(pi.target, ethers.MaxUint256);
    await usdc.connect(user1).approve(pi.target, ethers.MaxUint256);

    // User1 mints tokens so they have IT balance for claims
    await pi.connect(user1).mintTokens(sushiId, MATURITY_6M, usdt.target, 10_000n * 10n ** 6n);

    return { pi, cm, usdt, usdc, superadmin, user1, user2, sushiId, aaveId };
  }

  describe("Deployment", function () {
    it("Should set correct ProtocolInsurance address", async function () {
      const { cm, pi } = await loadFixture(deployClaimManagerFixture);
      expect(await cm.protocolInsurance()).to.equal(pi.target);
    });

    it("Should have correct SUPERADMIN address", async function () {
      const { cm } = await loadFixture(deployClaimManagerFixture);
      expect(await cm.SUPERADMIN()).to.equal(SUPERADMIN);
    });

    it("Should start with zero claim counter", async function () {
      const { cm } = await loadFixture(deployClaimManagerFixture);
      expect(await cm.claimCounter()).to.equal(0);
    });
  });

  describe("submitClaim()", function () {
    it("Should submit a claim successfully", async function () {
      const { cm, sushiId, user1 } = await loadFixture(deployClaimManagerFixture);

      const hackAmount = 5000n * 10n ** 6n;
      const hackDate = BigInt(await time.latest()) - 86400n; // yesterday

      await expect(
        cm.connect(user1).submitClaim(sushiId, hackAmount, hackDate, "Protocol was hacked", "ipfs://evidence")
      ).to.emit(cm, "ClaimSubmitted");

      expect(await cm.claimCounter()).to.equal(1);
    });

    it("Should store correct claim data", async function () {
      const { cm, sushiId, user1 } = await loadFixture(deployClaimManagerFixture);

      const hackAmount = 5000n * 10n ** 6n;
      const hackDate = BigInt(await time.latest()) - 86400n;

      await cm.connect(user1).submitClaim(sushiId, hackAmount, hackDate, "Hack details", "ipfs://hash");

      const claim = await cm.getClaim(1);
      expect(claim[0]).to.equal(1); // claimId
      expect(claim[1]).to.equal(sushiId); // protocolId
      expect(claim[3]).to.equal(hackAmount); // hackAmount
      expect(claim[5]).to.equal(user1.address); // claimant
      expect(claim[7]).to.equal("Hack details"); // details
      expect(claim[8]).to.equal("ipfs://hash"); // attachmentURI
      expect(claim[9]).to.equal(0); // Pending status
    });

    it("Should reject claim with zero hack amount", async function () {
      const { cm, sushiId, user1 } = await loadFixture(deployClaimManagerFixture);

      await expect(
        cm.connect(user1).submitClaim(sushiId, 0, BigInt(await time.latest()), "Details", "")
      ).to.be.revertedWith("Hack amount must be positive");
    });

    it("Should reject future hack date", async function () {
      const { cm, sushiId, user1 } = await loadFixture(deployClaimManagerFixture);

      const futureDate = BigInt(await time.latest()) + 100000n;
      await expect(
        cm.connect(user1).submitClaim(sushiId, 1000n * 10n ** 6n, futureDate, "Details", "")
      ).to.be.revertedWith("Hack date cannot be in future");
    });

    it("Should reject empty details", async function () {
      const { cm, sushiId, user1 } = await loadFixture(deployClaimManagerFixture);

      await expect(
        cm.connect(user1).submitClaim(sushiId, 1000n * 10n ** 6n, BigInt(await time.latest()), "", "")
      ).to.be.revertedWith("Details required");
    });

    it("Should reject user without IT balance", async function () {
      const { cm, sushiId, user2 } = await loadFixture(deployClaimManagerFixture);

      await expect(
        cm.connect(user2).submitClaim(sushiId, 1000n * 10n ** 6n, BigInt(await time.latest()), "Details", "")
      ).to.be.revertedWith("No IT balance for this protocol");
    });

    it("Should reject duplicate active claim for same protocol", async function () {
      const { cm, sushiId, user1 } = await loadFixture(deployClaimManagerFixture);

      const hackDate = BigInt(await time.latest()) - 86400n;
      await cm.connect(user1).submitClaim(sushiId, 5000n * 10n ** 6n, hackDate, "First claim", "");

      await expect(
        cm.connect(user1).submitClaim(sushiId, 3000n * 10n ** 6n, hackDate, "Second claim", "")
      ).to.be.revertedWith("Active claim exists for this protocol");
    });
  });

  describe("updateClaim()", function () {
    it("Should allow claimant to update pending claim", async function () {
      const { cm, sushiId, user1 } = await loadFixture(deployClaimManagerFixture);

      const hackDate = BigInt(await time.latest()) - 86400n;
      await cm.connect(user1).submitClaim(sushiId, 5000n * 10n ** 6n, hackDate, "Details", "");

      await cm.connect(user1).updateClaim(1, 7000n * 10n ** 6n, hackDate, "Updated details", "ipfs://new");

      const claim = await cm.getClaim(1);
      expect(claim[3]).to.equal(7000n * 10n ** 6n); // Updated hackAmount
      expect(claim[7]).to.equal("Updated details");
    });

    it("Should reject update from non-owner", async function () {
      const { cm, sushiId, user1, user2 } = await loadFixture(deployClaimManagerFixture);

      const hackDate = BigInt(await time.latest()) - 86400n;
      await cm.connect(user1).submitClaim(sushiId, 5000n * 10n ** 6n, hackDate, "Details", "");

      await expect(
        cm.connect(user2).updateClaim(1, 7000n * 10n ** 6n, hackDate, "Updated", "")
      ).to.be.revertedWith("Not claim owner");
    });
  });

  describe("approveClaim()", function () {
    it("Should approve claim and settle maturity", async function () {
      const { cm, pi, sushiId, user1, superadmin } = await loadFixture(deployClaimManagerFixture);

      const hackDate = BigInt(await time.latest()) - 86400n;
      await cm.connect(user1).submitClaim(sushiId, 5000n * 10n ** 6n, hackDate, "Hack details", "");

      await expect(
        cm.connect(superadmin).approveClaim(1, "Verified breach")
      ).to.emit(cm, "ClaimSettled");

      const claim = await cm.getClaim(1);
      expect(claim[9]).to.equal(3); // Settled status

      // Maturity should be settled with breach
      const mat = await pi.getMaturity(sushiId, MATURITY_6M);
      expect(mat.isSettled).to.be.true;
      expect(mat.breachOccurred).to.be.true;
    });

    it("Should reject non-superadmin approval", async function () {
      const { cm, sushiId, user1, user2 } = await loadFixture(deployClaimManagerFixture);

      const hackDate = BigInt(await time.latest()) - 86400n;
      await cm.connect(user1).submitClaim(sushiId, 5000n * 10n ** 6n, hackDate, "Details", "");

      await expect(
        cm.connect(user2).approveClaim(1, "Notes")
      ).to.be.revertedWith("Only superadmin");
    });

    it("Should apply impairment on approval", async function () {
      const { cm, pi, sushiId, user1, superadmin } = await loadFixture(deployClaimManagerFixture);

      const hackDate = BigInt(await time.latest()) - 86400n;
      const hackAmount = 5000n * 10n ** 6n;
      await cm.connect(user1).submitClaim(sushiId, hackAmount, hackDate, "Details", "");

      await cm.connect(superadmin).approveClaim(1, "Approved");

      const totalPayout = await pi.getTotalPayoutByMaturity(sushiId, MATURITY_6M);
      expect(totalPayout).to.equal(hackAmount);
    });
  });

  describe("rejectClaim()", function () {
    it("Should reject claim and free active claim slot", async function () {
      const { cm, sushiId, user1, superadmin } = await loadFixture(deployClaimManagerFixture);

      const hackDate = BigInt(await time.latest()) - 86400n;
      await cm.connect(user1).submitClaim(sushiId, 5000n * 10n ** 6n, hackDate, "Details", "");

      await cm.connect(superadmin).rejectClaim(1, "Insufficient evidence");

      const claim = await cm.getClaim(1);
      expect(claim[9]).to.equal(2); // Rejected status

      // Should be able to submit new claim
      const activeClaimId = await cm.activeClaimForProtocol(sushiId);
      expect(activeClaimId).to.equal(0);
    });

    it("Should reject non-superadmin rejection", async function () {
      const { cm, sushiId, user1, user2 } = await loadFixture(deployClaimManagerFixture);

      const hackDate = BigInt(await time.latest()) - 86400n;
      await cm.connect(user1).submitClaim(sushiId, 5000n * 10n ** 6n, hackDate, "Details", "");

      await expect(
        cm.connect(user2).rejectClaim(1, "Notes")
      ).to.be.revertedWith("Only superadmin");
    });
  });

  describe("claimInsurancePayout()", function () {
    it("Should payout stablecoins after claim settlement", async function () {
      const { cm, pi, usdt, sushiId, user1, superadmin } = await loadFixture(deployClaimManagerFixture);

      const hackAmount = 5000n * 10n ** 6n;
      const hackDate = BigInt(await time.latest()) - 86400n;
      await cm.connect(user1).submitClaim(sushiId, hackAmount, hackDate, "Details", "");
      await cm.connect(superadmin).approveClaim(1, "Approved");

      const balBefore = await usdt.balanceOf(user1.address);
      await cm.connect(user1).claimInsurancePayout(1, usdt.target);
      const balAfter = await usdt.balanceOf(user1.address);

      expect(balAfter - balBefore).to.equal(hackAmount);

      // Claim should be marked as Claimed
      const claim = await cm.getClaim(1);
      expect(claim[9]).to.equal(4); // Claimed status
    });

    it("Should reject payout from non-claimant", async function () {
      const { cm, usdt, sushiId, user1, user2, superadmin } = await loadFixture(deployClaimManagerFixture);

      const hackDate = BigInt(await time.latest()) - 86400n;
      await cm.connect(user1).submitClaim(sushiId, 5000n * 10n ** 6n, hackDate, "Details", "");
      await cm.connect(superadmin).approveClaim(1, "Approved");

      await expect(
        cm.connect(user2).claimInsurancePayout(1, usdt.target)
      ).to.be.revertedWith("Only claim submitter can claim");
    });
  });

  describe("View functions", function () {
    it("getUserClaims() should return user's claim IDs", async function () {
      const { cm, sushiId, user1 } = await loadFixture(deployClaimManagerFixture);

      const hackDate = BigInt(await time.latest()) - 86400n;
      await cm.connect(user1).submitClaim(sushiId, 5000n * 10n ** 6n, hackDate, "Details", "");

      const claims = await cm.getUserClaims(user1.address);
      expect(claims.length).to.equal(1);
      expect(claims[0]).to.equal(1);
    });

    it("getAllPendingClaims() should return pending claims", async function () {
      const { cm, sushiId, user1 } = await loadFixture(deployClaimManagerFixture);

      const hackDate = BigInt(await time.latest()) - 86400n;
      await cm.connect(user1).submitClaim(sushiId, 5000n * 10n ** 6n, hackDate, "Details", "");

      const pending = await cm.getAllPendingClaims();
      expect(pending.length).to.equal(1);
    });

    it("getAllProcessedClaims() should return non-pending claims", async function () {
      const { cm, sushiId, user1, superadmin } = await loadFixture(deployClaimManagerFixture);

      const hackDate = BigInt(await time.latest()) - 86400n;
      await cm.connect(user1).submitClaim(sushiId, 5000n * 10n ** 6n, hackDate, "Details", "");
      await cm.connect(superadmin).rejectClaim(1, "Rejected");

      const processed = await cm.getAllProcessedClaims();
      expect(processed.length).to.equal(1);
    });
  });

  describe("Full claim lifecycle", function () {
    it("Submit → Approve → Claim payout → PT redemption with impairment", async function () {
      const { cm, pi, usdt, sushiId, user1, superadmin } = await loadFixture(deployClaimManagerFixture);

      // 1. User1 has 10,000 USDT worth of IT/PT from fixture setup
      const hackAmount = 3000n * 10n ** 6n;
      const hackDate = BigInt(await time.latest()) - 86400n;

      // 2. Submit claim
      await cm.connect(user1).submitClaim(sushiId, hackAmount, hackDate, "Protocol hacked for 3000 USDT", "ipfs://evidence");

      // 3. Superadmin approves (settles maturity, applies impairment)
      await cm.connect(superadmin).approveClaim(1, "Verified breach");

      // 4. User claims insurance payout
      const balBeforeClaim = await usdt.balanceOf(user1.address);
      await cm.connect(user1).claimInsurancePayout(1, usdt.target);
      const balAfterClaim = await usdt.balanceOf(user1.address);
      expect(balAfterClaim - balBeforeClaim).to.equal(hackAmount);

      // 5. Redeem PT (should get 10000 - 3000 = 7000)
      const ptBalance = await pi.getUserPTByMaturity(user1.address, sushiId, MATURITY_6M);
      const balBeforeRedeem = await usdt.balanceOf(user1.address);
      await pi.connect(user1).redeemPrincipalTokens(sushiId, MATURITY_6M, ptBalance);
      const balAfterRedeem = await usdt.balanceOf(user1.address);

      expect(balAfterRedeem - balBeforeRedeem).to.equal(7000n * 10n ** 6n);
    });
  });
});
