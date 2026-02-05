import hre from "hardhat";
import { loadDeploymentAddresses } from "./utils/loadDeployments.js";

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

  // Hardhat test accounts (excluding account 0 which is admin)
  const testAccounts = [
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Account #1
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Account #2
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906", // Account #3
    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", // Account #4
    "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc", // Account #5
    "0x976EA74026E726554dB657fA54763abd0C3a0aa9", // Account #6
    "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955", // Account #7
    "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f", // Account #8
    "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720", // Account #9
    "0xBcd4042DE499D14e55001CcbB24a551F3b954096", // Account #10
    "0x71bE63f3384f5fb98995898A86B02Fb2426c5788", // Account #11
    "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a", // Account #12
    "0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec", // Account #13
    "0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097", // Account #14
    "0xcd3B766CCDd6AE721141F452C550Ca635964ce71", // Account #15
    "0x2546BcD3c84621e976D8185a91A922aE77ECEc30", // Account #16
    "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E", // Account #17
    "0xdD2FD4581271e230360230F9337D5c0430Bf44C0", // Account #18
    "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199", // Account #19
  ];

  const amount = hre.ethers.parseUnits("100000", 6); // 100k tokens

  console.log(
    `\nMinting 100,000 USDT and USDC to ${testAccounts.length} accounts...\n`,
  );

  for (let i = 0; i < testAccounts.length; i++) {
    const account = testAccounts[i];
    console.log(`[${i + 1}/${testAccounts.length}] Minting to ${account}...`);

    await mockUSDT.mint(account, amount);
    await mockUSDC.mint(account, amount);
  }

  console.log("\n✅ Minting complete for all accounts!");

  // Verify balances for first account
  const firstAccount = testAccounts[0];
  const usdtBalance = await mockUSDT.balanceOf(firstAccount);
  const usdcBalance = await mockUSDC.balanceOf(firstAccount);

  console.log(`\n💰 Sample balance (Account #1: ${firstAccount}):`);
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
