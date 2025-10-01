# Deploy to local network
npx hardhat ignition deploy ignition/modules/TokenMinting.js --network localhost

# If you already deployed contracts we can reset deployments:
rm -rf ignition/deployments

# Deploy to testnet
npx hardhat ignition deploy ignition/modules/TokenMinting.js --network sepolia

# Deploy to mainnet
npx hardhat ignition deploy ignition/modules/TokenMinting.js --network mainnet

