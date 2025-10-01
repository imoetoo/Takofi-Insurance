const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("🔍 Checking your actual token balances after minting...");

    // Get signers
    const [signer] = await ethers.getSigners();
    const userAddress = signer.address;

    // Contract address (deployed via Ignition)
    const protocolInsuranceAddress =
      "0xDC11f7E700A4c898AE5CAddB1082cFfa76512aDD";
    const protocolInsurance = await ethers.getContractAt(
      "ProtocolInsurance",
      protocolInsuranceAddress
    );

    console.log(`👤 User address: ${userAddress}`);
    console.log(`📍 Contract address: ${protocolInsuranceAddress}`);

    // Check all protocols (matching smart contract constructor)
    const protocols = [
      "SushiSwap",
      "Curve Finance",
      "Aave",
      "Uniswap V3",
      "Compound",
      "MakerDAO",
    ];

    console.log(`\n💰 Your Token Balances:\n`);

    for (const protocolName of protocols) {
      try {
        const protocolId = await protocolInsurance.getProtocolId(protocolName);
        const protocolInfo = await protocolInsurance.protocols(protocolId);

        const insuranceToken = await ethers.getContractAt(
          "InsuranceToken",
          protocolInfo.insuranceToken
        );
        const principalToken = await ethers.getContractAt(
          "PrincipalToken",
          protocolInfo.principalToken
        );

        const insuranceBalance = await insuranceToken.balanceOf(userAddress);
        const principalBalance = await principalToken.balanceOf(userAddress);

        const insuranceSymbol = await insuranceToken.symbol();
        const principalSymbol = await principalToken.symbol();

        console.log(`=== ${protocolName} ===`);
        console.log(
          `${insuranceSymbol}: ${ethers.formatUnits(insuranceBalance, 18)}`
        );
        console.log(
          `${principalSymbol}: ${ethers.formatUnits(principalBalance, 18)}`
        );

        // Show raw values for debugging if needed
        if (insuranceBalance > 0) {
          console.log(`  (Raw: ${insuranceBalance.toString()})`);
        }

        console.log(``);
      } catch (error) {
        console.log(`❌ Error checking ${protocolName}: ${error.message}`);
      }
    }

    // Check remaining stablecoin balances
    console.log(`💵 Remaining Stablecoin Balances:`);

    const usdtAddress = "0xD8a5a9b31c3C0232E196d518E89Fd8bF83AcAd43";
    const usdcAddress = "0x2E2Ed0Cfd3AD2f1d34481277b3204d807Ca2F8c2";

    const usdt = await ethers.getContractAt("MockStablecoin", usdtAddress);
    const usdc = await ethers.getContractAt("MockStablecoin", usdcAddress);

    const usdtBalance = await usdt.balanceOf(userAddress);
    const usdcBalance = await usdc.balanceOf(userAddress);

    console.log(`USDT: ${ethers.formatUnits(usdtBalance, 6)}`);
    console.log(`USDC: ${ethers.formatUnits(usdcBalance, 6)}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);
