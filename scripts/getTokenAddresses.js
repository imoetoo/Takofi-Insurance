const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("🔍 Getting token addresses from deployed contracts...\n");

    // Contract address (deployed via Ignition)
    const protocolInsuranceAddress =
      "0xDC11f7E700A4c898AE5CAddB1082cFfa76512aDD";
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
