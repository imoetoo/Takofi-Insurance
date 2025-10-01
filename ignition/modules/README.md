# Ignition Deployment Modules

This directory contains Hardhat Ignition deployment modules for the TakoFi Insurance protocol. These modules handle automated contract deployment with proper dependency management.

# Ignition Deployment Modules

This directory contains Hardhat Ignition deployment modules for the TakoFi Insurance protocol. These modules handle automated contract deployment with proper dependency management.

## 📋 Available Modules (3 Total)

### 🚀 `FullDeployment.js` ⭐ **RECOMMENDED**

**Purpose:** Complete system deployment in one command

**What it deploys:**

- Mock USDT and USDC contracts (6 decimals)
- TokenMinting contract with automatic protocol setup
- All 6 protocols: SushiSwap, Curve Finance, Aave, Uniswap V3, Compound, MakerDAO
- 0% minting fees for all protocols

**Usage:**

```bash
npx hardhat ignition deploy ignition/modules/FullDeployment.js --network localhost
```

**Why use this:** Single command deploys everything you need for development.

---

### 💰 `MockStablecoins.js`

**Purpose:** Deploy only the mock USDT/USDC contracts

**What it deploys:**

- Mock USDT (6 decimals, symbol: USDT)
- Mock USDC (6 decimals, symbol: USDC)

**Usage:**

```bash
npx hardhat ignition deploy ignition/modules/MockStablecoins.js --network localhost
```

**When to use:** If you only need test tokens without the insurance contract.

---

### 🛡️ `TokenMinting.js`

**Purpose:** Deploy TokenMinting contract using pre-deployed stablecoin addresses

**What it deploys:**

- TokenMinting contract only
- Uses hardcoded USDT/USDC addresses from previous deployment
- Automatically sets up all 6 protocols with 0% fees

**Usage:**

```bash
npx hardhat ignition deploy ignition/modules/TokenMinting.js --network localhost
```

**When to use:** If you already have mock stablecoins deployed and just need the main contract.

---

## 🛠 **Deployment Workflows**

### **Option 1: Complete Setup (Recommended)**

```bash
# Deploy everything in one command
npx hardhat ignition deploy ignition/modules/FullDeployment.js --network localhost

# Mint test tokens
npx hardhat run scripts/mintTokensToAccount.js --network localhost
```

### **Option 2: Step-by-Step Setup**

```bash
# Step 1: Deploy mock tokens
npx hardhat ignition deploy ignition/modules/MockStablecoins.js --network localhost

# Step 2: Deploy main contract
npx hardhat ignition deploy ignition/modules/TokenMinting.js --network localhost

# Step 3: Mint test tokens
npx hardhat run scripts/mintTokensToAccount.js --network localhost
```

### **Option 3: Fresh Start (Reset Everything)**

```bash
# Remove existing deployments
rm -rf ignition/deployments

# Deploy fresh system
npx hardhat ignition deploy ignition/modules/FullDeployment.js --network localhost
```

---

## 🌐 **Network Support**

### **Local Development:**

```bash
npx hardhat ignition deploy ignition/modules/FullDeployment.js --network localhost
```

### **Testnet (Sepolia):**

```bash
npx hardhat ignition deploy ignition/modules/FullDeployment.js --network sepolia
```

### **Mainnet:**

```bash
npx hardhat ignition deploy ignition/modules/FullDeployment.js --network mainnet
```

---

## 🎯 **What Gets Deployed**

### **Contracts:**

- **MockStablecoin (USDT)** - 6 decimal test token
- **MockStablecoin (USDC)** - 6 decimal test token
- **TokenMinting** - Main insurance contract
- **InsuranceToken contracts** - 6 protocol-specific tokens (iSushiSwap, iAave, etc.)
- **PrincipalToken contracts** - 6 protocol-specific tokens (pSushiSwap, pAave, etc.)

### **Protocols Automatically Configured:**

1. **SushiSwap** (0% fee)
2. **Curve Finance** (0% fee)
3. **Aave** (0% fee)
4. **Uniswap V3** (0% fee)
5. **Compound** (0% fee)
6. **MakerDAO** (0% fee)

---

## 🔧 **Prerequisites**

- Hardhat node running: `npx hardhat node`
- Contracts compiled: `npx hardhat compile`
- Sufficient ETH for gas fees

---

## 📋 **Deployment Outputs**

After successful deployment, you'll get:

- Contract addresses for all deployed contracts
- Transaction hashes for verification
- Deployment artifacts in `ignition/deployments/`

Use these addresses to:

- Update `next-app/src/constants.ts` if needed
- Add tokens to MetaMask
- Verify deployment with scripts

---

## 🐛 **Troubleshooting**

### **"Already deployed" errors:**

```bash
rm -rf ignition/deployments
```

### **"Insufficient funds" errors:**

- Ensure your account has enough ETH for gas
- Check that Hardhat node is running

### **"Contract not found" errors:**

```bash
npx hardhat compile
```

### **"Network connection failed":**

- Verify Hardhat node is running on port 8545
- Check network configuration in `hardhat.config.cjs`

---

## 💡 **Best Practices**

1. **Always use `FullDeployment.js`** for new development environments
2. **Keep deployments folder** - contains important contract addresses
3. **Update constants.ts** if you redeploy and get new addresses
4. **Test deployment** with scripts after deployment
5. **Use same network** for deployment and testing (localhost)
