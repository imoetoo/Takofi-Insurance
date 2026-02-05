import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import hre from "hardhat";

/**
 * Deploys the ClaimManager contract and sets it up in ProtocolInsurance
 * Run after TokenMinting deployment
 */
async function main() {
  console.log("🚀 Deploying ClaimManager contract...\n");

  // Read the existing deployments to get ProtocolInsurance address
  const chainId = 31337; // localhost
  const deploymentPath = `./ignition/deployments/chain-${chainId}/deployed_addresses.json`;

  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ Deployment addresses file not found");
    console.error("   Please deploy TokenMinting first using deployAll.js");
    process.exit(1);
  }

  const deployedAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const protocolInsuranceAddress =
    deployedAddresses["TokenMintingModule#ProtocolInsurance"];

  if (!protocolInsuranceAddress) {
    console.error("❌ ProtocolInsurance address not found in deployments");
    console.error("   Please deploy TokenMinting first using deployAll.js");
    process.exit(1);
  }

  console.log(`📄 Using ProtocolInsurance at: ${protocolInsuranceAddress}`);

  // Deploy ClaimManager using Ignition
  console.log("\n🔨 Deploying ClaimManager...");

  try {
    const claimModuleImport = await import(
      "../ignition/modules/ClaimManager.js"
    );
    const claimModule = claimModuleImport.default;

    const { claimManager } = await hre.ignition.deploy(claimModule, {
      parameters: {
        ClaimManagerModule: {
          protocolInsuranceAddress: protocolInsuranceAddress,
        },
      },
    });

    const claimManagerAddress = await claimManager.getAddress();
    console.log(`   ✅ ClaimManager deployed at: ${claimManagerAddress}`);

    // Set ClaimManager in ProtocolInsurance
    console.log("\n🔗 Linking ClaimManager to ProtocolInsurance...");

    const ProtocolInsurance = await hre.ethers.getContractAt(
      "ProtocolInsurance",
      protocolInsuranceAddress,
    );

    const [signer] = await hre.ethers.getSigners();
    const setClaimManagerTx = await ProtocolInsurance.connect(
      signer,
    ).setClaimManager(claimManagerAddress);
    await setClaimManagerTx.wait();

    console.log("   ✅ ClaimManager linked to ProtocolInsurance");

    // Update the deployments.json for frontend
    console.log("\n📝 Updating frontend deployments...");

    const frontendDeploymentsPath = "./next-app/src/deployments.json";
    let frontendDeployments = {};

    if (fs.existsSync(frontendDeploymentsPath)) {
      frontendDeployments = JSON.parse(
        fs.readFileSync(frontendDeploymentsPath, "utf8"),
      );
    }

    frontendDeployments.ClaimManager = claimManagerAddress;

    fs.writeFileSync(
      frontendDeploymentsPath,
      JSON.stringify(frontendDeployments, null, 2),
    );

    console.log(`   ✅ Updated ${frontendDeploymentsPath}`);
    console.log(`   📄 ClaimManager: ${claimManagerAddress}`);

    console.log("\n✅ ClaimManager deployment complete!\n");
    console.log("Summary:");
    console.log("========");
    console.log(`   ProtocolInsurance: ${protocolInsuranceAddress}`);
    console.log(`   ClaimManager:      ${claimManagerAddress}`);
    console.log(
      `   Superadmin:        0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`,
    );
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
