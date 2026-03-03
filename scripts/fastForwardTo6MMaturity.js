/*
 * Script to fast forward blockchain time to after June 2026 (6M maturity expiry)
 * and settle the maturity so you can redeem principal tokens
 */

import hre from "hardhat";
import { loadDeploymentAddresses } from "./utils/loadDeployments.js";

async function main() {
  console.log("⏱️  Fast forwarding blockchain to after June 2026...\n");

  const [owner] = await hre.ethers.getSigners();

  // Load contract addresses from deployment
  const addresses = loadDeploymentAddresses();
  const tokenMintingAddress = addresses.protocolInsurance;

  const tokenMinting = await hre.ethers.getContractAt(
    "ProtocolInsurance",
    tokenMintingAddress,
  );

  // Protocol details
  const protocolName = "SushiSwap";
  const protocolId = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(protocolName));

  // Check current 6M maturity
  console.log("📋 Current maturity status:\n");
  const maturity6M = await tokenMinting.maturities(protocolId, 0); // 0 = MATURITY_6M
  const expiryTime = Number(maturity6M[0]);
  const currentTime = Math.floor(Date.now() / 1000);

  console.log(
    `Current blockchain time: ${new Date(currentTime * 1000).toLocaleString()}`,
  );
  console.log(
    `6M Maturity expiry time: ${new Date(expiryTime * 1000).toLocaleString()}`,
  );
  console.log(
    `Days until expiry: ${Math.ceil((expiryTime - currentTime) / 86400)}\n`,
  );

  // Fast forward to 1 day after 6M maturity expiry
  const timeToSkip = expiryTime - currentTime + 86400; // +1 day past expiry

  console.log(
    `⏳ Advancing time by ${Math.ceil(timeToSkip / 86400)} days...\n`,
  );

  await hre.network.provider.send("evm_increaseTime", [timeToSkip]);
  await hre.network.provider.send("evm_mine");

  const newTime = Math.floor(Date.now() / 1000) + timeToSkip;
  console.log(`✅ Time advanced successfully!`);
  console.log(
    `New blockchain time: ${new Date(newTime * 1000).toLocaleString()}\n`,
  );

  // Settle the 6M maturity
  console.log("📋 Settling 6M maturity...\n");
  const maturityAfter = await tokenMinting.maturities(protocolId, 0);

  if (!maturityAfter[3]) {
    // Check if not already settled
    console.log("Settling 6M maturity with NO BREACH...");
    const settleTx = await tokenMinting.settleMaturity(
      protocolId,
      0, // MATURITY_6M
      false, // No breach
      0, // No IT payout
    );

    await settleTx.wait();
    console.log("✅ 6M maturity settled successfully!\n");
  } else {
    console.log("⚠️  6M maturity already settled\n");
  }

  // Show redemption info
  console.log(
    "🎉 Ready to redeem! Your 6M principal tokens are now eligible for redemption.\n",
  );
  console.log("Next steps:");
  console.log("1. Go to your dashboard");
  console.log("2. Navigate to the 'Redeem' section");
  console.log("3. Select your expired 6M tokens");
  console.log("4. Click 'Redeem Principal Tokens'\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
