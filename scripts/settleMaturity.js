/*
 * Script to settle SushiSwap protocol insurance maturities (6M and 12M)
 * assuming no breach has occurred.
 */

const hre = require("hardhat");
const { ethers } = require("hardhat");
const { loadDeploymentAddresses } = require("./utils/loadDeployments");

async function main() {
  console.log("🔧 Settling SushiSwap maturities (6M and 12M)...\n");

  const [owner] = await ethers.getSigners();
  console.log("Owner address:", owner.address);

  // Load contract addresses from deployment
  const addresses = loadDeploymentAddresses();
  const tokenMintingAddress = addresses.protocolInsurance;

  console.log("TokenMinting address:", tokenMintingAddress);

  const tokenMinting = await ethers.getContractAt("ProtocolInsurance", tokenMintingAddress);

  // Protocol details
  const protocolName = "SushiSwap";
  const protocolId = ethers.keccak256(ethers.toUtf8Bytes(protocolName));

  const maturitiesToSettle = [
    { index: 0, label: "6M" },
    { index: 1, label: "12M" }
  ];

  // Check both maturities and find latest expiry time
  let latestExpiryTime = 0;
  console.log("\n📋 Step 1: Check maturity statuses\n");

  for (const mat of maturitiesToSettle) {
    try {
      const maturity = await tokenMinting.maturities(protocolId, mat.index);
      const expiryTime = Number(maturity[0]);

      console.log(`${mat.label} Maturity (Index ${mat.index}):`);
      console.log("   Expiry Time:", new Date(expiryTime * 1000).toLocaleString());
      console.log("   Label:", maturity[1]);
      console.log("   Is Active:", maturity[2]);
      console.log("   Is Settled:", maturity[3]);
      console.log("   Breach Occurred:", maturity[4]);
      console.log("");

      if (expiryTime > latestExpiryTime) {
        latestExpiryTime = expiryTime;
      }
    } catch (e) {
      console.log(`❌ Error reading ${mat.label} maturity:`, e.message);
    }
  }

  // Fast-forward if needed
  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime < latestExpiryTime) {
    console.log("\n⏰ Maturities not expired yet. Fast-forwarding blockchain time...");
    const timeToSkip = latestExpiryTime - currentTime + 86400; // +1 day past latest expiry
    console.log("   Advancing time by", Math.floor(timeToSkip / 86400), "days...");

    await hre.network.provider.send("evm_increaseTime", [timeToSkip]);
    await hre.network.provider.send("evm_mine");

    console.log("   ✅ Time advanced successfully!");
    console.log("   New blockchain time:", new Date((currentTime + timeToSkip) * 1000).toLocaleString());
  } else {
    console.log("\n✅ All maturities have expired");
  }

  // Settle both maturities
  console.log("\n📋 Step 2: Settle both maturities\n");

  for (const mat of maturitiesToSettle) {
    try {
      const maturity = await tokenMinting.maturities(protocolId, mat.index);

      if (maturity[3]) {
        console.log(`⚠️  ${mat.label} maturity is already settled, skipping...`);
        continue;
      }

      console.log(`Settling ${mat.label} maturity (Index ${mat.index})...`);
      console.log("   NO BREACH - PT retains full value");

      const settleTx = await tokenMinting.settleMaturity(
        protocolId,
        mat.index,
        false, // No breach occurred
        0      // No IT payout
      );

      await settleTx.wait();
      console.log(`   ✅ ${mat.label} maturity settled successfully!\n`);
    } catch (error) {
      console.log(`❌ Error settling ${mat.label} maturity:`, error.message, "\n");
    }
  }

  // Check balances
  console.log("📋 Step 3: Your token balances\n");

  for (const mat of maturitiesToSettle) {
    const itBalance = await tokenMinting.getUserITByMaturity(owner.address, protocolId, mat.index);
    const ptBalance = await tokenMinting.getUserPTByMaturity(owner.address, protocolId, mat.index);

    console.log(`${mat.label} Maturity:`);
    console.log("   IT Balance:", ethers.formatUnits(itBalance, 18));
    console.log("   PT Balance:", ethers.formatUnits(ptBalance, 18));
    console.log("");
  }

  console.log("✅ Setup complete!");
  console.log("📍 You can now redeem PT at: http://localhost:3000/redeem-principal");
  console.log("💡 Both maturities settled with no breach - PT redeems at 1:1");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
