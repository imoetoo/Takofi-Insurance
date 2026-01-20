import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import hre from "hardhat";

async function main() {
  console.log("🚀 Starting complete deployment process...\n");

  // ============================================
  // Step 1: Clean old artifacts, cache and deployment files
  // ============================================
  console.log("🧹 Step 1: Cleaning old files...");

  const dirsToClean = ["./artifacts", "./cache", "./ignition/deployments"];

  for (const dir of dirsToClean) {
    const fullPath = path.resolve(dir);
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`   ✅ Removed ${dir}`);
    } else {
      console.log(`   ⏭️  ${dir} does not exist, skipping`);
    }
  }
  console.log();

  // ============================================
  // Step 2: Compile contracts
  // ============================================
  console.log("⚙️  Step 2: Compiling contracts...");
  console.log(
    "   Compiling: Dex.sol, TokenMinting.sol (ProtocolInsurance), MockStablecoin.sol"
  );

  try {
    execSync("npx hardhat compile", {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    console.log("   ✅ Compilation successful\n");
  } catch (error) {
    console.error("   ❌ Compilation failed");
    process.exit(1);
  }

  // ============================================
  // Step 3: Deploy Mock Stablecoins using Hardhat Ignition
  // ============================================
  console.log("💰 Step 3: Deploying Mock Stablecoins (USDT & USDC)...");

  let mockUSDT, mockUSDC;
  try {
    execSync(
      "npx hardhat ignition deploy ignition/modules/MockStablecoins.js --network localhost",
      { stdio: "inherit", cwd: process.cwd() }
    );

    // Read deployment addresses from Ignition output
    const chainId = 31337; // localhost chain ID
    const deploymentPath = `./ignition/deployments/chain-${chainId}/deployed_addresses.json`;

    if (fs.existsSync(deploymentPath)) {
      const deployedAddresses = JSON.parse(
        fs.readFileSync(deploymentPath, "utf8")
      );
      mockUSDT = deployedAddresses["MockStablecoinsModule#MockUSDT"];
      mockUSDC = deployedAddresses["MockStablecoinsModule#MockUSDC"];

      console.log(`   ✅ Mock USDT deployed at: ${mockUSDT}`);
      console.log(`   ✅ Mock USDC deployed at: ${mockUSDC}\n`);
    } else {
      throw new Error("Deployment addresses file not found");
    }
  } catch (error) {
    console.error("   ❌ Mock Stablecoins deployment failed:", error.message);
    process.exit(1);
  }

  // ============================================
  // Step 4: Deploy DEX contract using Hardhat Ignition
  // ============================================
  console.log("🔄 Step 4: Deploying DEX contract...");

  let dexAddress;
  try {
    execSync(
      "npx hardhat ignition deploy ignition/modules/Dex.js --network localhost",
      { stdio: "inherit", cwd: process.cwd() }
    );

    const chainId = 31337;
    const deploymentPath = `./ignition/deployments/chain-${chainId}/deployed_addresses.json`;

    if (fs.existsSync(deploymentPath)) {
      const deployedAddresses = JSON.parse(
        fs.readFileSync(deploymentPath, "utf8")
      );
      dexAddress = deployedAddresses["DexModule#Dex"];

      console.log(`   ✅ DEX deployed at: ${dexAddress}\n`);
    } else {
      throw new Error("Deployment addresses file not found");
    }
  } catch (error) {
    console.error("   ❌ DEX deployment failed:", error.message);
    process.exit(1);
  }

  // ============================================
  // Step 5: Deploy TokenMinting contract using Hardhat Ignition
  // ============================================
  console.log(
    "🛡️  Step 5: Deploying TokenMinting (ProtocolInsurance) and helper contracts..."
  );

  let tokenMintingAddress, maturityHelperAddress, settlementHelperAddress;
  try {
    execSync(
      "npx hardhat ignition deploy ignition/modules/TokenMinting.js --network localhost",
      { stdio: "inherit", cwd: process.cwd() }
    );

    const chainId = 31337;
    const deploymentPath = `./ignition/deployments/chain-${chainId}/deployed_addresses.json`;

    if (fs.existsSync(deploymentPath)) {
      const deployedAddresses = JSON.parse(
        fs.readFileSync(deploymentPath, "utf8")
      );
      tokenMintingAddress =
        deployedAddresses["TokenMintingModule#ProtocolInsurance"];
      maturityHelperAddress =
        deployedAddresses["TokenMintingModule#MaturityHelper"];
      settlementHelperAddress =
        deployedAddresses["TokenMintingModule#SettlementHelper"];

      if (!tokenMintingAddress) {
        console.log(
          "   ⚠️  Available deployment keys:",
          Object.keys(deployedAddresses)
        );
        throw new Error("TokenMinting address not found in deployment");
      }

      console.log(`   ✅ TokenMinting deployed at: ${tokenMintingAddress}`);
      console.log(`   ✅ MaturityHelper deployed at: ${maturityHelperAddress}`);
      console.log(`   ✅ SettlementHelper deployed at: ${settlementHelperAddress}\n`);
    } else {
      throw new Error("Deployment addresses file not found");
    }
  } catch (error) {
    console.error("   ❌ TokenMinting deployment failed:", error.message);
    process.exit(1);
  }

  // ============================================
  // Step 6: Set DEX contract address in TokenMinting
  // ============================================
  console.log("🔗 Step 6: Linking DEX contract to TokenMinting...");

  try {
    const ProtocolInsurance = await hre.ethers.getContractAt(
      "ProtocolInsurance",
      tokenMintingAddress
    );

    // Get the signer (deployer)
    const [signer] = await hre.ethers.getSigners();

    // Set the DEX contract address in TokenMinting
    const setDexTx = await ProtocolInsurance.connect(signer).setDexContract(
      dexAddress
    );
    await setDexTx.wait();

    console.log(`   ✅ DEX contract linked to TokenMinting\n`);
  } catch (error) {
    console.error("   ⚠️  Failed to link DEX contract:", error.message);
    console.log("   ℹ️  You may need to manually call setDexContract()\n");
  }

  // ============================================
  // Step 7: Get protocol token addresses and copy to frontend
  // ============================================
  console.log(
    "📋 Step 7: Extracting protocol token addresses and copying to frontend..."
  );

  try {
    const ProtocolInsurance = await hre.ethers.getContractAt(
      "ProtocolInsurance",
      tokenMintingAddress
    );

    // Get all 6 protocols
    const protocols = [
      "SushiSwap",
      "Curve Finance",
      "Aave",
      "Uniswap V3",
      "Compound",
      "PancakeSwap",
    ];

    const protocolTokens = {};

    for (const protocolName of protocols) {
      const protocolId = hre.ethers.keccak256(
        hre.ethers.toUtf8Bytes(protocolName)
      );

      try {
        const tokens = await ProtocolInsurance.getProtocolTokens(protocolId);
        const key = protocolName.replace(/\s+/g, ""); // Remove spaces for key

        protocolTokens[key] = {
          name: protocolName,
          insuranceToken: tokens[0],
          principalToken: tokens[1],
        };

        console.log(
          `   ✅ ${protocolName}: i${key}=${tokens[0]}, p${key}=${tokens[1]}`
        );
      } catch (error) {
        console.log(
          `   ⚠️  ${protocolName}: Protocol not found or not yet set up`
        );
      }
    }

    // ============================================
    // Create deployments.json for frontend
    // ============================================
    const deploymentsData = {
      network: "localhost",
      chainId: 31337,
      timestamp: new Date().toISOString(),
      contracts: {
        MockUSDT: mockUSDT,
        MockUSDC: mockUSDC,
        Dex: dexAddress,
        TokenMinting: tokenMintingAddress,
        MaturityHelper: maturityHelperAddress,
        SettlementHelper: settlementHelperAddress,
      },
      protocols: protocolTokens,
    };

    // Ensure frontend src directory exists
    const frontendDir = path.resolve("./next-app/src");
    if (!fs.existsSync(frontendDir)) {
      fs.mkdirSync(frontendDir, { recursive: true });
    }

    // Write deployments.json
    const deploymentsPath = path.join(frontendDir, "deployments.json");
    fs.writeFileSync(
      deploymentsPath,
      JSON.stringify(deploymentsData, null, 2),
      "utf8"
    );

    console.log(`\n   ✅ Deployment addresses copied to: ${deploymentsPath}\n`);
  } catch (error) {
    console.error("   ❌ Failed to extract token addresses:", error.message);
    console.log("   ℹ️  Continuing with basic deployment info...\n");

    // Fallback: create basic deployments.json without protocol tokens
    const deploymentsData = {
      network: "localhost",
      chainId: 31337,
      timestamp: new Date().toISOString(),
      contracts: {
        MockUSDT: mockUSDT,
        MockUSDC: mockUSDC,
        Dex: dexAddress,
        TokenMinting: tokenMintingAddress,
      },
      protocols: {},
    };

    const frontendDir = path.resolve("./next-app/src");
    if (!fs.existsSync(frontendDir)) {
      fs.mkdirSync(frontendDir, { recursive: true });
    }

    const deploymentsPath = path.join(frontendDir, "deployments.json");
    fs.writeFileSync(
      deploymentsPath,
      JSON.stringify(deploymentsData, null, 2),
      "utf8"
    );

    console.log(
      `   ✅ Basic deployment addresses copied to: ${deploymentsPath}\n`
    );
  }

  // ============================================
  // Deployment Summary
  // ============================================
  console.log("═══════════════════════════════════════════════════════");
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("═══════════════════════════════════════════════════════");
  console.log("\n📝 Summary:");
  console.log(`   Mock USDT:     ${mockUSDT}`);
  console.log(`   Mock USDC:     ${mockUSDC}`);
  console.log(`   DEX:           ${dexAddress}`);
  console.log(`   TokenMinting:  ${tokenMintingAddress}`);
  console.log("\n💡 Next Steps:");
  console.log(
    "   1. Run: npx hardhat run scripts/mintTokensToAccount.js --network localhost"
  );
  console.log("   2. Start frontend: cd next-app && npm run dev");
  console.log("   3. Visit: http://localhost:3000");
  console.log("\n═══════════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
