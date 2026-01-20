import fs from "fs";
import path from "path";

/**
 * Load deployment addresses from Ignition deployment output
 * @param {number} chainId - The chain ID (default: 31337 for localhost)
 * @returns {Object} Object containing contract addresses
 */
function loadDeploymentAddresses(chainId = 31337) {
  const deploymentPath = path.resolve(
    `./ignition/deployments/chain-${chainId}/deployed_addresses.json`
  );

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(
      "Deployment addresses file not found. Please deploy contracts first."
    );
  }

  const deployedAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  return {
    protocolInsurance:
      deployedAddresses["TokenMintingModule#ProtocolInsurance"],
    mockUSDT: deployedAddresses["MockStablecoinsModule#MockUSDT"],
    mockUSDC: deployedAddresses["MockStablecoinsModule#MockUSDC"],
    dex: deployedAddresses["DexModule#Dex"],
    raw: deployedAddresses, // Keep raw object for any custom access
  };
}

export { loadDeploymentAddresses };
