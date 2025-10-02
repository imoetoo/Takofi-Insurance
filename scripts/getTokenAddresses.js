const { ethers } = require("hardhat");
require("dotenv").config({
  path: "/Users/gc/Desktop/Projects/takofi/Takofi-Insurance/next-app/.env.local",
});

async function main() {
  try {
    console.log("🔍 Getting token addresses from deployed contracts...\n");

    // Get contract address from environment variables
    const protocolInsuranceAddress =
      process.env.NEXT_PUBLIC_TOKEN_MINTING_ADDRESS;

    if (!protocolInsuranceAddress) {
      throw new Error(
        "NEXT_PUBLIC_TOKEN_MINTING_ADDRESS must be set in next-app/.env.local"
      );
    }
    const protocolInsurance = await ethers.getContractAt(
      "ProtocolInsurance",
      protocolInsuranceAddress
    );

    console.log(`📍 ProtocolInsurance Contract: ${protocolInsuranceAddress}\n`);

    // Check all protocols (matching smart contract constructor)
    const protocols = [
      "SushiSwap",
      "Curve Finance",
      "Aave",
      "Uniswap V3",
      "Compound",
      "MakerDAO",
    ];

    console.log(`📋 Token Contract Addresses:\n`);

    for (const protocolName of protocols) {
      try {
        const protocolId = await protocolInsurance.getProtocolId(protocolName);
        const protocolInfo = await protocolInsurance.protocols(protocolId);

        const insuranceTokenAddress = protocolInfo.insuranceToken;
        const principalTokenAddress = protocolInfo.principalToken;

        // Get token symbols to confirm
        const insuranceToken = await ethers.getContractAt(
          "InsuranceToken",
          insuranceTokenAddress
        );
        const principalToken = await ethers.getContractAt(
          "PrincipalToken",
          principalTokenAddress
        );

        const insuranceSymbol = await insuranceToken.symbol();
        const principalSymbol = await principalToken.symbol();

        console.log(`=== ${protocolName} ===`);
        console.log(`${insuranceSymbol}: ${insuranceTokenAddress}`);
        console.log(`${principalSymbol}: ${principalTokenAddress}`);
        console.log(``);
      } catch (error) {
        console.log(
          `❌ Error getting ${protocolName} addresses: ${error.message}`
        );
      }
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);
