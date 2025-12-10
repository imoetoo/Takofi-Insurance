const hre = require("hardhat");
const { loadDeploymentAddresses } = require("./utils/loadDeployments");

async function main() {
  // Load deployment addresses
  const addresses = loadDeploymentAddresses();
  const usdtAddress = addresses.mockUSDT;
  const usdcAddress = addresses.mockUSDC;

  console.log(`   ✅ Mock USDT deployed at: ${usdtAddress}`);
  console.log(`   ✅ Mock USDC deployed at: ${usdcAddress}\n`);

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
