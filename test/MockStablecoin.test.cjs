const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("MockStablecoin", function () {
  async function deployStablecoinFixture() {
    const [deployer, user1, user2] = await ethers.getSigners();

    const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
    const usdt = await MockStablecoin.deploy("Mock USDT", "USDT", 6);
    const usdc = await MockStablecoin.deploy("Mock USDC", "USDC", 6);

    return { usdt, usdc, deployer, user1, user2 };
  }

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      const { usdt, usdc } = await loadFixture(deployStablecoinFixture);

      expect(await usdt.name()).to.equal("Mock USDT");
      expect(await usdt.symbol()).to.equal("USDT");
      expect(await usdc.name()).to.equal("Mock USDC");
      expect(await usdc.symbol()).to.equal("USDC");
    });

    it("Should set 6 decimals", async function () {
      const { usdt, usdc } = await loadFixture(deployStablecoinFixture);

      expect(await usdt.decimals()).to.equal(6);
      expect(await usdc.decimals()).to.equal(6);
    });

    it("Should mint 1M tokens to deployer", async function () {
      const { usdt, deployer } = await loadFixture(deployStablecoinFixture);

      const expectedSupply = 1_000_000n * 10n ** 6n; // 1M with 6 decimals
      expect(await usdt.balanceOf(deployer.address)).to.equal(expectedSupply);
      expect(await usdt.totalSupply()).to.equal(expectedSupply);
    });
  });

  describe("mint()", function () {
    it("Should allow anyone to mint tokens", async function () {
      const { usdt, user1 } = await loadFixture(deployStablecoinFixture);

      const amount = 5000n * 10n ** 6n;
      await usdt.mint(user1.address, amount);
      expect(await usdt.balanceOf(user1.address)).to.equal(amount);
    });

    it("Should increase total supply after minting", async function () {
      const { usdt, user1 } = await loadFixture(deployStablecoinFixture);

      const initialSupply = await usdt.totalSupply();
      const mintAmount = 1000n * 10n ** 6n;
      await usdt.mint(user1.address, mintAmount);
      expect(await usdt.totalSupply()).to.equal(initialSupply + mintAmount);
    });
  });

  describe("faucet()", function () {
    it("Should mint 10k tokens to caller", async function () {
      const { usdt, user1 } = await loadFixture(deployStablecoinFixture);

      await usdt.connect(user1).faucet();
      const expected = 10_000n * 10n ** 6n;
      expect(await usdt.balanceOf(user1.address)).to.equal(expected);
    });

    it("Should be callable multiple times", async function () {
      const { usdt, user1 } = await loadFixture(deployStablecoinFixture);

      await usdt.connect(user1).faucet();
      await usdt.connect(user1).faucet();
      const expected = 20_000n * 10n ** 6n;
      expect(await usdt.balanceOf(user1.address)).to.equal(expected);
    });
  });

  describe("checkBalance()", function () {
    it("Should return correct balance", async function () {
      const { usdt, deployer } = await loadFixture(deployStablecoinFixture);

      const balance = await usdt.checkBalance(deployer.address);
      expect(balance).to.equal(await usdt.balanceOf(deployer.address));
    });
  });

  describe("checkBalances()", function () {
    it("Should return multiple balances at once", async function () {
      const { usdt, deployer, user1, user2 } = await loadFixture(deployStablecoinFixture);

      await usdt.mint(user1.address, 100n * 10n ** 6n);
      await usdt.mint(user2.address, 200n * 10n ** 6n);

      const balances = await usdt.checkBalances([
        deployer.address,
        user1.address,
        user2.address,
      ]);

      expect(balances[0]).to.equal(await usdt.balanceOf(deployer.address));
      expect(balances[1]).to.equal(100n * 10n ** 6n);
      expect(balances[2]).to.equal(200n * 10n ** 6n);
    });
  });

  describe("ERC20 standard", function () {
    it("Should support transfers", async function () {
      const { usdt, deployer, user1 } = await loadFixture(deployStablecoinFixture);

      const amount = 500n * 10n ** 6n;
      await usdt.transfer(user1.address, amount);
      expect(await usdt.balanceOf(user1.address)).to.equal(amount);
    });

    it("Should support approve and transferFrom", async function () {
      const { usdt, deployer, user1 } = await loadFixture(deployStablecoinFixture);

      const amount = 500n * 10n ** 6n;
      await usdt.approve(user1.address, amount);
      await usdt.connect(user1).transferFrom(deployer.address, user1.address, amount);
      expect(await usdt.balanceOf(user1.address)).to.equal(amount);
    });
  });
});
