# Scripts Directory

This directory contains utility scripts for managing and testing the TakoFi Insurance protocol. All scripts are designed to work with Hardhat and should be run from the project root directory.

## 📋 Available Scripts (3 Total)

### 💰 `mintTokensToAccount.js`

**Purpose:** Mint test tokens to existing deployed mock contracts

**Description:**

- Uses existing mock USDT/USDC contracts deployed via Ignition
- Mints 100,000 tokens of each type to the test account
- Works with the addresses from deployment output
- Essential for getting test tokens to use with the frontend

**Usage:**

```bash
npx hardhat run scripts/mintTokensToAccount.js --network localhost
```

**Output:**

- Minting confirmation for both USDT and USDC
- Updated token balances for verification
- Contract addresses for MetaMask integration

---

### 🔍 `analyzeBalances.js`

**Purpose:** Comprehensive balance analysis after minting insurance tokens

**Description:**

- Detailed check of all protocol token balances (insurance and principal tokens)
- Shows balances for all 6 protocols: SushiSwap, Curve Finance, Aave, Uniswap V3, Compound, PancakeSwap
- Contract status verification and complete system health overview
- Use after minting insurance tokens through the frontend

**Usage:**

```bash
npx hardhat run scripts/analyzeBalances.js --network localhost
```

**Output:**

- Insurance token balances (iSushiSwap, iAave, etc.)
- Principal token balances (pSushiSwap, pAave, etc.)
- Protocol status for each supported protocol
- User address and contract information

---

### 📋 `getTokenAddresses.js`

**Purpose:** Extract token contract addresses from deployed protocols

**Description:**

- Gets insurance and principal token addresses for all 6 protocols
- Provides addresses for adding tokens to MetaMask
- Useful for external integrations and verification
- Shows contract addresses in organized format

**Usage:**

```bash
npx hardhat run scripts/getTokenAddresses.js --network localhost
```

**Output:**

- Insurance token contract addresses for all protocols
- Principal token contract addresses for all protocols
- Main ProtocolInsurance contract address
- Formatted for easy copy-paste into MetaMask

---

## 🛠 **Recommended Workflow**

### **Initial Setup:**

1. **Start Hardhat Node:**

   ```bash
   npx hardhat node
   ```

2. **Deploy Complete System:**

   ```bash
   npx hardhat ignition deploy ignition/modules/FullDeployment.js --network localhost
   ```

3. **Get Test Tokens:**

   ```bash
   npx hardhat run scripts/mintTokensToAccount.js --network localhost
   ```

4. **Start Frontend:**
   ```bash
   cd next-app && npm run dev
   ```

### **After Using Frontend to Mint Insurance Tokens:**

1. **Check Your Token Balances:**

   ```bash
   npx hardhat run scripts/analyzeBalances.js --network localhost
   ```

2. **Get Token Addresses for MetaMask:**
   ```bash
   npx hardhat run scripts/getTokenAddresses.js --network localhost
   ```

---

## 🎯 **Supported Protocols**

The system supports 6 DeFi protocols:

- **SushiSwap** (Decentralized Exchange)
- **Curve Finance** (Stablecoin Exchange)
- **Aave** (Lending Protocol)
- **Uniswap V3** (Automated Market Maker)
- **Compound** (Money Market)
- **PancakeSwap** (Decentralized Exchange)

All protocols are configured with **0% minting fees** for testing.

---

## 🔧 **Prerequisites**

- **Hardhat node** running on localhost (`npx hardhat node`)
- **Compiled contracts** (`npx hardhat compile`)
- **Test account** with ETH for gas fees
- **MetaMask** configured for localhost network

---

## 📱 **MetaMask Integration**

### **Network Configuration:**

- **Network Name:** Localhost 8545
- **RPC URL:** http://127.0.0.1:8545
- **Chain ID:** 31337
- **Currency Symbol:** ETH

### **Test Account:**

- **Address:** `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Private Key:** Available in Hardhat node output

### **Adding Tokens:**

1. Run `getTokenAddresses.js` to get current contract addresses
2. Add tokens to MetaMask:
   - **Mock USDT & USDC** (6 decimals)
   - **Insurance Tokens** (18 decimals): iSushiSwap, iCurve Finance, iAave, etc.
   - **Principal Tokens** (18 decimals): pSushiSwap, pCurve Finance, pAave, etc.

---

## 🐛 **Common Issues & Solutions**

### **"Artifact not found"**

```bash
npx hardhat compile
```

### **"Network connection failed"**

- Ensure Hardhat node is running
- Check if port 8545 is available

### **"Contract not deployed"**

- Use Ignition deployment first:

```bash
npx hardhat ignition deploy ignition/modules/FullDeployment.js --network localhost
```

### **"No token balances showing"**

- Make sure you've minted test tokens first with `mintTokensToAccount.js`
- Verify you've minted insurance tokens through the frontend
- Use `analyzeBalances.js` to check current status

---

## 💡 **Script Usage Tips**

1. **Always start with** `mintTokensToAccount.js` to get USDT/USDC for testing
2. **Use the frontend** at `http://localhost:3000` to mint insurance tokens
3. **Run** `analyzeBalances.js` after each minting operation to verify results
4. **Use** `getTokenAddresses.js` whenever you need contract addresses for MetaMask
5. **Keep Hardhat node running** throughout your development session

---

## 🔄 **Typical Development Session**

1. Start Hardhat node: `npx hardhat node`
2. Deploy contracts: `npx hardhat ignition deploy ignition/modules/FullDeployment.js --network localhost`
3. Get test tokens: `npx hardhat run scripts/mintTokensToAccount.js --network localhost`
4. Start frontend: `cd next-app && npm run dev`
5. Visit `http://localhost:3000` and mint insurance tokens
6. Check results: `npx hardhat run scripts/analyzeBalances.js --network localhost`
7. Get addresses for MetaMask: `npx hardhat run scripts/getTokenAddresses.js --network localhost`
