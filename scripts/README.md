# Scripts Directory

This directory contains utility scripts for deploying, managing, and testing the Takofi Insurance protocol. All scripts are designed to work with Hardhat and should be run from the project root directory.

## 📋 Available Scripts

### 🔍 `checkBalances.js`
**Purpose:** Verify token balances for the test account

**Description:** 
- Checks USDT and USDC balances for the default test account
- Displays contract addresses for adding tokens to MetaMask
- Useful for debugging and verification

**Usage:**
```bash
npx hardhat run scripts/checkBalances.js --network localhost
```

**Output:**
- Current token balances for test account
- Contract addresses with proper decimals
- Network confirmation

---
### 💰 `mintTokensToAccount.js`
**Purpose:** Mint tokens to existing deployed mock contracts

**Description:**
- Uses existing mock USDT/USDC contracts deployed via Ignition
- Mints 100,000 tokens of each type to the test account
- Works with the addresses already in constants.ts
- Preferred method when contracts are already deployed

**Usage:**
```bash
npx hardhat run scripts/mintTokensToAccount.js --network localhost
```

**Contract Addresses Used:**
- Mock USDT: `0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0`
- Mock USDC: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`

**Output:**
- Minting confirmation
- Updated token balances
- Contract addresses for MetaMask

---

## 🛠 Setup Workflow

### Initial Setup (First Time):
1. **Deploy contracts using Ignition:**
   ```bash
   npx hardhat ignition deploy ignition/modules/MockStablecoins.js --network localhost
   ```

2. **Mint tokens to test account:**
   ```bash
   npx hardhat run scripts/mintTokensToAccount.js --network localhost
   ```

3. **Verify balances:**
   ```bash
   npx hardhat run scripts/checkBalances.js --network localhost
   ```

## 🔧 Prerequisites

- Hardhat node running on localhost (`npx hardhat node`)
- Compiled contracts (`npx hardhat compile`)
- Test account with ETH for gas fees

## 📱 MetaMask Integration

After running the scripts, add tokens to MetaMask:

1. **Switch to Localhost8545 network**
2. **Import custom tokens:**
   - USDT: `0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0` (6 decimals)
   - USDC: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e` (6 decimals)

## 🎯 Test Account

Default test account: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

This account will have:
- ~10,000 ETH for gas
- 1,200,000+ USDT tokens
- 1,200,000+ USDC tokens

## 🐛 Troubleshooting

- **"Artifact not found"**: Run `npx hardhat compile` first
- **"Network connection failed"**: Ensure Hardhat node is running
- **"Transaction failed"**: Check if you have enough ETH for gas
- **"Contract not deployed"**: Use Ignition deployment first, then run mint scripts
