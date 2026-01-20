# TakoFi Insurance Protocol

**Your All-Reliable DeFi Insurance Protocol** - A comprehensive decentralized insurance platform that protects DeFi investments through innovative tokenization, maturity-based coverage, and yield optimization strategies.

## 🌟 Overview

TakoFi is a next-generation DeFi insurance protocol that allows users to protect their investments while maintaining yield opportunities. By converting stablecoins (USDT/USDC) into Insurance Tokens (IT) and Principal Tokens (PT) with specific maturity dates, users can trade tokens, participate in a dynamic insurance marketplace, and manage risk across multiple DeFi protocols.

## 🚀 Key Features

### Core Functionality

- **🛡️ Smart Contract Protection**: Safeguard DeFi investments against protocol vulnerabilities and hacks
- **📅 Maturity-Based Coverage**: 6-month and 12-month insurance periods aligned to June 30 and December 31
- **💰 Yield Optimization**: Maximize returns by trading Insurance Tokens while maintaining principal amounts
- **🔄 Seamless Token Minting**: Convert USDT/USDC into insurance and principal tokens with maturity-specific pricing
- **📊 Dynamic DEX Market**: Trade insurance/principal tokens with real-time order books and price discovery
- **🌐 Multi-Protocol Support**: Coverage for 6 major DeFi protocols (Aave, Compound, Uniswap, Curve, SushiSwap, PancakeSwap)
- **⚖️ Settlement System**: Automatic principal redemption and insurance claims at maturity
- **📈 Market-Based Pricing**: Annual insurance fees calculated from DEX order book prices

### User Experience

- **🔗 Wallet Integration**: RainbowKit-powered wallet connection with multi-wallet support
- **📱 Responsive Design**: Modern UI built with Material-UI and Tailwind CSS
- **⚡ Real-time Updates**: Live market data and trading interface
- **🎯 Protocol-Specific Pages**: Detailed trading interfaces for each supported protocol
- **📊 Maturity Dashboard**: Track insurance coverage periods and expiry dates

## 🏗️ Tech Stack

### Frontend

- **Framework**: Next.js 15 with App Router & Turbopack
- **Styling**: Material-UI (MUI) + Tailwind CSS
- **Web3**: Wagmi + RainbowKit + Viem
- **Language**: TypeScript
- **State Management**: React Query (TanStack)

### Blockchain

- **Smart Contracts**: Solidity ^0.8.24
- **Development**: Hardhat
- **Security**: OpenZeppelin Contracts
- **Token Standards**: ERC20 (Insurance & Principal Tokens)

### Architecture

- **Deployment**: Ignition modules for contract deployment
- **Testing**: Hardhat test suite
- **Development**: Hot reloading with Turbopack

## 📁 Project Structure

```
├── contracts/                      # Smart contracts
│   ├── TokenMinting.sol           # [MAIN] Protocol insurance system
│   ├── MaturityHelper.sol         # [EXTERNAL] Date calculations for maturities
│   ├── SettlementHelper.sol       # [EXTERNAL] Settlement & redemption calculations
│   ├── Dex.sol                    # [STANDALONE] Order book DEX
│   ├── TokenContracts.sol         # [TOKENS] Insurance & Principal tokens
│   ├── MaturityManager.sol        # [LIBRARY] Maturity bucket structures
│   ├── ProtocolManager.sol        # [LIBRARY] Protocol management
│   ├── InsuranceCalculator.sol    # [LIBRARY] Pricing calculations
│   ├── BokkyPooBahsDateTimeLibrary.sol  # [LIBRARY] Date utilities
│   └── MockStablecoin.sol         # [TEST] Mock USDT/USDC
├── next-app/                      # Frontend application
│   ├── src/app/                   # Next.js App Router pages
│   │   ├── insurance-market/      # Insurance marketplace
│   │   ├── mint-tokens/           # Token minting interface
│   │   ├── principal-market/      # Principal token trading
│   │   └── redeem-principal/      # Principal redemption interface
│   ├── src/components/            # Reusable UI components
│   ├── src/hooks/                 # Custom React hooks
│   └── src/styles/                # Styling and themes
├── ignition/modules/              # Deployment modules
│   ├── TokenMinting.js            # Main contract + helpers deployment
│   ├── MockStablecoins.js         # Mock token deployment
│   └── Dex.js                     # DEX deployment
├── scripts/                       # Utility scripts
│   ├── deployAll.js               # Complete deployment automation
│   ├── mintTokensToAccount.js     # Mint test tokens
│   ├── settleMaturity.js          # Settle maturity buckets
│   ├── analyzeBalances.js         # Balance analysis
│   └── utils/loadDeployments.js   # Deployment address loader
└── test/                          # Smart contract tests
```

## 🏗️ Smart Contract Architecture

### Contract Categories

#### **[MAIN CONTRACT]**

- **ProtocolInsurance** (`TokenMinting.sol`)
  - Core protocol logic managing all insurance operations
  - Coordinates minting, burning, settlements, and payouts
  - Integrates with helper contracts and libraries
  - Manages maturity buckets and protocol states

#### **[EXTERNAL CONTRACTS]** - Deployed separately to reduce main contract size

- **MaturityHelper**
  - Computes 6M and 12M expiry dates (June 30 / December 31)
  - Handles rolling maturities forward
  - Pure date calculation logic
- **SettlementHelper**
  - Calculates principal token redemption values
  - Computes insurance claim payouts
  - Validates settlement conditions
  - Auto-settlement checks

#### **[STANDALONE CONTRACT]**

- **Dex**
  - Order book-based decentralized exchange
  - Supports limit orders, market orders, cancellations
  - Provides price discovery for insurance pricing
  - Maturity-specific order books for IT/PT trading

#### **[TOKEN CONTRACTS]** - Deployed per protocol (6 protocols × 2 tokens = 12 tokens)

- **InsuranceToken** (IT)
  - ERC20 providing coverage against protocol hacks
  - Pays out if breach occurs at maturity
  - Tradeable on DEX for yield optimization
- **PrincipalToken** (PT)
  - ERC20 representing deposited capital
  - Redeemable at maturity for stablecoins
  - Value may be impaired if breach occurred

#### **[INTERNAL LIBRARIES]** - Code compiled into main contract

- **MaturityManager**
  - Defines MaturityBucket struct
  - Constants for 6M and 12M indices
  - Tracks expiry times, settlement status, breach info
- **ProtocolManager**
  - Adds new protocols and deploys token pairs
  - Calculates available insurance capacity
  - Manages protocol states
- **InsuranceCalculator**
  - Computes annual insurance fees from DEX prices
  - Fetches IT prices across USDC/USDT markets
  - Returns minimum price for best rates
- **BokkyPooBahsDateTimeLibrary**
  - Gas-efficient date/time utilities
  - Converts between timestamps and calendar dates
  - Source: https://github.com/bokkypoobah/BokkyPooBahsDateTimeLibrary

#### **[TEST CONTRACT]**

- **MockStablecoin**
  - Simulates USDT/USDC with 6 decimals
  - Allows minting for development/testing

## 🛠️ Getting Started

### Prerequisites

- **Node.js** v18+
- **MetaMask** or compatible Web3 wallet
- **Git**

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/imoetoo/Takofi-insurance.git
cd Crypto-FYP
```

2. **Install dependencies**

```bash
# Install all dependencies (contracts + frontend)
npm install
```

3. **Start local blockchain**

```bash
npm run node
# Runs: npx hardhat node --hostname 127.0.0.1 --port 8545
```

4. **Deploy all contracts** (in new terminal)

```bash
npm run deploy:all
# Runs complete deployment:
# - Cleans old deployments
# - Compiles contracts
# - Deploys MockUSDT, MockUSDC
# - Deploys Dex
# - Deploys MaturityHelper, SettlementHelper
# - Deploys ProtocolInsurance with 6 protocols
# - Links DEX contract
# - Extracts token addresses
# - Creates deployments.json for frontend
```

5. **Mint test tokens** (optional, in new terminal)

```bash
npm run mint
# Mints test USDT/USDC to your account
```

6. **Start the frontend** (in new terminal)

```bash
cd next-app
npm run dev
```

7. **Configure MetaMask**

   - Network: Localhost 8545
   - Chain ID: 31337
   - RPC URL: http://127.0.0.1:8545
   - Import private key from Hardhat (shown in terminal output)
   - Add test tokens (USDT/USDC) using addresses from deployment

8. **Access the application**
   - Visit `http://localhost:3000`
   - Connect your wallet via RainbowKit
   - Start minting and trading insurance tokens

### 🎮 Usage Guide

#### 1. Connect Your Wallet

- Visit `http://localhost:3000`
- Click "Connect Wallet"
- Select your wallet (MetaMask, WalletConnect, etc.)
- Approve connection

#### 2. Mint Insurance + Principal Tokens

- Navigate to **"Mint Tokens"** page
- Select protocol (Aave, Compound, etc.)
- Choose maturity (6M or 12M)
- Select input token (USDT or USDC)
- Enter deposit amount
- Approve token spending
- Confirm transaction
- Receive IT + PT tokens (1:1 ratio with deposit)

#### 3. Trade on Insurance Market

- Navigate to **"Insurance Market"**
- Select a protocol to view detailed trading interface
- View order book with maturity-specific prices
- Place limit orders or execute market orders
- Monitor positions and market depth

#### 4. Trade on Principal Market

- Navigate to **"Principal Market"**
- Trade principal tokens for yield optimization
- Maintain exposure to underlying assets
- Execute orders on maturity-specific order books

#### 5. Redeem Principal Tokens at Maturity

- Navigate to **"Redeem Principal"** page
- Select expired maturity bucket
- Enter PT amount to redeem
- Receive stablecoins based on settlement:
  - **No breach**: Full principal value
  - **Breach occurred**: Impaired value (reduced by insurance payouts)

#### 6. Claim Insurance Payouts (if breach occurred)

- Only available if protocol was breached and maturity settled
- Call `claimInsurancePayout()` with IT amount
- Receive proportional payout from total insurance pool

## 📋 Core Smart Contract Functions

### Token Minting & Burning

**`mintTokens(protocolId, maturityIndex, stablecoin, amount)`**

- Converts USDT/USDC into IT and PT pairs
- Parameters:
  - `protocolId`: Protocol hash (e.g., keccak256("Aave"))
  - `maturityIndex`: 0 for 6M, 1 for 12M
  - `stablecoin`: USDT or USDC address
  - `amount`: Stablecoin amount (6 decimals)
- Mints 1:1 ratio (minus fees) in 18-decimal IT/PT tokens
- Tracks per-maturity balances

**`burnTokens(protocolId, insuranceAmount, principalAmount, preferredStablecoin)`**

- Redeems IT and PT for stablecoins (before maturity)
- Must burn equal amounts of IT and PT
- Returns stablecoins in preferred currency

### Maturity Management

**`rollMaturities(protocolId)`**

- Rolls expired maturity buckets to next generation
- Calculates new June 30 / December 31 dates
- Callable by anyone after 6M bucket expires

**`getMaturity(protocolId, maturityIndex)`**

- Returns MaturityBucket details:
  - `expiryTime`: Unix timestamp
  - `label`: "Maturity_6M" or "Maturity_12M"
  - `isActive`, `isSettled`, `breachOccurred`
  - `totalITPayout`: Total insurance payout amount

**`getDaysUntilMaturity(protocolId, maturityIndex)`**

- Returns days remaining until expiry

### Settlement & Redemption

**`settleMaturity(protocolId, maturityIndex, breachOccurred, totalITPayout)`** (Owner only)

- Settles a maturity after expiry
- Records breach status and payout amount
- Updates protocol accounting

**`redeemPrincipalTokens(protocolId, maturityIndex, ptAmount)`**

- Redeems PT for stablecoins after settlement
- Auto-settles if expired and no breach
- Calculates value: (totalDeposited - totalITPayout) / totalPT
- Impaired value if breach occurred

**`claimInsurancePayout(protocolId, maturityIndex, itAmount)`**

- Claims insurance payout after breach settlement
- Only available if `breachOccurred == true`
- Payout = (totalITPayout × itAmount) / totalIT

**`burnExpiredInsuranceTokens(protocolId, maturityIndex)`**

- Burns worthless IT after maturity with no breach
- Cleans up expired positions

### Market Metrics & Pricing

**`calculateAnnualFee(protocolId, coverageAmount, maturityIndex)`**

- Returns annual insurance fee in basis points (e.g., 389 = 3.89%)
- Fetches IT price from DEX order books (USDC & USDT)
- Uses minimum price for best rate
- Falls back to mintingFee if no market

**`getInsuranceMarketMetricsByMaturity(protocolId, maturityIndex)`**

- Returns maturity-specific metrics:
  - `availableCapacity`: Total IT supply - burnt IT
  - `totalValueLocked`: TVL for this maturity
  - `annualFeePercentage`: Current fee in bps
  - `itPrice`: Current IT market price

**`getAvailableCapacity(protocolId)`**

- Total insurance capacity available
- = Total IT supply - IT burnt from payouts

### Protocol Management

**`addProtocol(protocolName, mintingFee)`** (Owner only)

- Adds new protocol with fee structure
- Deploys new IT and PT token contracts
- Initializes maturity buckets

**`pauseProtocol(protocolId)`** / **`unpauseProtocol(protocolId)`** (Owner only)

- Emergency pause/unpause for specific protocols

**`setDexContract(dexAddress)`** (Owner only)

- Links DEX contract for price oracle

### View Functions

- `getProtocolTokens(protocolId)`: Returns IT and PT addresses
- `getUserTokenBalances(user, protocolId)`: Returns IT/PT balances
- `getUserITByMaturity(user, protocolId, maturityIndex)`: IT balance for maturity
- `getUserPTByMaturity(user, protocolId, maturityIndex)`: PT balance for maturity
- `getTotalITByMaturity(protocolId, maturityIndex)`: Total IT issued
- `getTotalPTByMaturity(protocolId, maturityIndex)`: Total PT issued
- `getProtocolId(protocolName)`: Converts name to bytes32 hash

## 🧪 Development Commands

```bash
# Smart Contract Development
npm run compile          # Compile contracts
npm run clean           # Clean artifacts and cache
npm run node            # Start local Hardhat node

# Deployment
npm run deploy:all      # Complete deployment with automation

# Utility Scripts
npm run mint            # Mint test tokens to your account
npm run addresses       # Get all token addresses
npm run bal             # Analyze account balances

# Manual deployment (if needed)
npx hardhat ignition deploy ignition/modules/MockStablecoins.js --network localhost
npx hardhat ignition deploy ignition/modules/Dex.js --network localhost
npx hardhat ignition deploy ignition/modules/TokenMinting.js --network localhost

# Settlement (Owner only)
npx hardhat run scripts/settleMaturity.js --network localhost

# Frontend Development
cd next-app
npm run dev             # Start dev server with Turbopack
npm run build           # Production build
npm run lint            # Lint code
```

## 🔐 Security Features

- **ReentrancyGuard**: Protection against reentrancy attacks on all state-changing functions
- **Access Control**: Owner-only administrative functions (settle, pause, setDex)
- **OpenZeppelin**: Battle-tested security standards for ERC20 and access control
- **Input Validation**: Comprehensive parameter checking on all functions
- **Fee Protection**: Configurable minting fees, capped annual fees (max 50%)
- **Balance Checks**: Strict validation of user balances before burns/redemptions
- **Settlement Guards**: Maturity must be active, expired, and not already settled
- **Modular Design**: External helper contracts reduce main contract complexity

## 🌐 Supported Protocols

Current insurance coverage includes:

| Protocol          | Type    | Coverage                          |
| ----------------- | ------- | --------------------------------- |
| **Aave**          | Lending | Money market protocol insurance   |
| **Compound**      | Lending | Interest rate protocol protection |
| **Uniswap V3**    | DEX     | Concentrated liquidity insurance  |
| **Curve Finance** | DEX     | Stablecoin pool protection        |
| **SushiSwap**     | DEX     | AMM exchange insurance            |
| **PancakeSwap**   | DEX     | BNB chain DEX coverage            |

Each protocol has:

- Unique Insurance Token (e.g., iAave, iCompound)
- Unique Principal Token (e.g., pAave, pCompound)
- Independent maturity buckets (6M and 12M)
- Separate DEX order books per maturity
- Configurable minting fees (currently 0%)

## 💡 How It Works

### The Insurance Flow

1. **User deposits** USDT/USDC into a protocol with chosen maturity (6M or 12M)
2. **Contract mints** equal amounts of IT and PT tokens (18 decimals)
3. **User can:**
   - Hold both tokens until maturity
   - Trade IT on DEX to earn premium yield
   - Trade PT on DEX for different exposure
4. **At maturity:**
   - **If no breach**: PT redeems for full principal value, IT expires worthless
   - **If breach**: IT holders claim proportional insurance payout, PT value impaired

### Maturity System

- **6-Month Bucket**: Expires June 30 or December 31 (whichever is nearer)
- **12-Month Bucket**: Expires 6 months after the 6M bucket
- **Rolling**: When 6M expires, both buckets roll forward to next dates
- **Settlement**: Owner settles maturity, recording breach status and payout amounts
- **Auto-Settlement**: PT redemption auto-settles if no breach occurred

### Pricing Mechanism

Annual insurance fees calculated from DEX market:

```
Annual Fee % = (IT Market Price / Coverage Amount) × 100%
```

- Fetches best sell price from USDC and USDT order books
- Takes minimum for best rate
- Falls back to base minting fee if no market
- Capped at 50% maximum

## 📈 Future Roadmap

- [ ] Comprehensive test suite for all contracts
- [ ] Security audit and formal verification
- [ ] Mainnet deployment on Ethereum/L2s
- [ ] Additional protocol integrations (MakerDAO, Balancer, etc.)
- [ ] Advanced yield strategies and vault integration
- [ ] Cross-chain expansion (Polygon, Arbitrum, Optimism)
- [ ] Governance token and DAO implementation
- [ ] Automated keeper network for settlements and rollovers
- [ ] Insurance pool rebalancing mechanisms
- [ ] Mobile application development
- [ ] Integration with DeFi aggregators

## 🏛️ Technical Highlights

### Gas Optimization

- **External Helper Contracts**: Offloads calculations to reduce main contract size (under 24KB limit)
- **Internal Libraries**: Code organization without deployment overhead
- **Efficient Storage**: Optimized mapping structures for maturity tracking
- **Minimal Error Strings**: Empty error messages to save bytecode

### Architectural Benefits

- **Modular Design**: Separate concerns (minting, settlement, pricing, dates)
- **Upgradeable Helpers**: Can deploy new helper versions if needed
- **Library Reuse**: BokkyPooBah date library for gas-efficient date math
- **DEX Integration**: Decoupled price oracle via external DEX contract

### Data Structures

```solidity
struct MaturityBucket {
    uint256 expiryTime;        // Unix timestamp
    string label;              // "Maturity_6M" / "Maturity_12M"
    bool isActive;             // Active state
    bool isSettled;            // Settlement status
    bool breachOccurred;       // Breach flag
    uint256 totalITPayout;     // Insurance payout (6 decimals)
}

struct ProtocolInfo {
    string name;                      // Protocol name
    bool active;                      // Active state
    InsuranceToken insuranceToken;    // IT contract
    PrincipalToken principalToken;    // PT contract
    uint256 totalDeposited;           // Total USDT/USDC (6 decimals)
    uint256 totalITBurntFromPayouts;  // Burnt IT amount
    uint256 mintingFee;               // Fee in basis points
}
```

## 🤝 Contributing

This project is part of a Final Year Project (FYP) exploring innovative DeFi insurance mechanisms. Contributions, suggestions, and feedback are welcome!

## 📄 License

This project is for educational and research purposes as part of academic coursework.

---

**Built with ❤️ for the future of DeFi insurance**
