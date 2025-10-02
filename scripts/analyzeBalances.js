const { ethers } = require("hardhat");
require("dotenv").config({
  path: "/Users/gc/Desktop/Projects/takofi/Takofi-Insurance/next-app/.env.local",
});

async function main() {
  try {
    console.log("🔍 Checking your actual token balances after minting...");

    // Get signers
    const testAccount = "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc";

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

    console.log(`👤 Test account address: ${testAccount}`);
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

        const insuranceBalance = await insuranceToken.balanceOf(testAccount);
        const principalBalance = await principalToken.balanceOf(testAccount);

        const insuranceSymbol = await insuranceToken.symbol();
        const principalSymbol = await principalToken.symbol();

        console.log(`=== ${protocolName} ===`);
        console.log(
          `${insuranceSymbol}: ${ethers.formatUnits(insuranceBalance, 18)}`
        );
        console.log(
          `${principalSymbol}: ${ethers.formatUnits(principalBalance, 18)}`
        );

        console.log(``);
      } catch (error) {
        console.log(`❌ Error checking ${protocolName}: ${error.message}`);
      }
    }

    // Check remaining stablecoin balances
    console.log(`💵 Remaining Stablecoin Balances:`);

    const usdtAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    const usdcAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

    const usdt = await ethers.getContractAt("MockStablecoin", usdtAddress);
    const usdc = await ethers.getContractAt("MockStablecoin", usdcAddress);

    const usdtBalance = await usdt.balanceOf(testAccount);
    const usdcBalance = await usdc.balanceOf(testAccount);

    console.log(`USDT: ${ethers.formatUnits(usdtBalance, 6)}`);
    console.log(`USDC: ${ethers.formatUnits(usdcBalance, 6)}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);
