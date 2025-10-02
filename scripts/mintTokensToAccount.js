const hre = require("hardhat");
require("dotenv").config({
  path: "/Users/gc/Desktop/Projects/takofi/Takofi-Insurance/next-app/.env.local",
});

async function main() {
  console.log("Minting tokens to existing deployed contracts...");

  // Use the addresses from next-app/.env.local
  const usdtAddress = process.env.NEXT_PUBLIC_USDT_ADDRESS;
  const usdcAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS;

  if (!usdtAddress || !usdcAddress) {
    throw new Error(
      "NEXT_PUBLIC_USDT_ADDRESS and NEXT_PUBLIC_USDC_ADDRESS must be set in next-app/.env.local"
    );
  }

  // Get contract instances
  const MockStablecoin = await hre.ethers.getContractFactory("MockStablecoin");
  const mockUSDT = MockStablecoin.attach(usdtAddress);
  const mockUSDC = MockStablecoin.attach(usdcAddress);

  // Test account address
  const testAccount = "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc";
  const amount = hre.ethers.parseUnits("100000", 6); // 100k tokens

  console.log(`Minting 100,000 tokens to ${testAccount}...`);

  await mockUSDT.mint(testAccount, amount);
  await mockUSDC.mint(testAccount, amount);

  console.log("✅ Minting complete!");

  // Verify balances
  const usdtBalance = await mockUSDT.balanceOf(testAccount);
  const usdcBalance = await mockUSDC.balanceOf(testAccount);

  console.log("\n💰 Token balances for test account:");
  console.log(`USDT: ${hre.ethers.formatUnits(usdtBalance, 6)}`);
  console.log(`USDC: ${hre.ethers.formatUnits(usdcBalance, 6)}`);

  console.log("\n📍 Contract addresses (already in constants.ts):");
  console.log(`USDT: ${usdtAddress}`);
  console.log(`USDC: ${usdcAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
