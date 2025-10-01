const hre = require("hardhat");

async function main() {
  console.log("Minting tokens to existing deployed contracts...");

  // Use the addresses from ignition deployment
  const usdtAddress = "0xD8a5a9b31c3C0232E196d518E89Fd8bF83AcAd43";
  const usdcAddress = "0x2E2Ed0Cfd3AD2f1d34481277b3204d807Ca2F8c2";
  
  // Get contract instances
  const MockStablecoin = await hre.ethers.getContractFactory("MockStablecoin");
  const mockUSDT = MockStablecoin.attach(usdtAddress);
  const mockUSDC = MockStablecoin.attach(usdcAddress);

  // Test account address
  const testAccount = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
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
