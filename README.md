# TakoFi Insurance Protocol

**Your All-Reliable DeFi Insurance Protocol** - A comprehensive decentralized insurance platform that protects DeFi investments through innovative tokenization and yield optimization strategies.

## 🌟 Overview

TakoFi is a next-generation DeFi insurance protocol that allows users to protect their investments while maintaining yield opportunities. By converting stablecoins (USDT/USDC) into Insurance Tokens (IT) and Principal Tokens (PT), users can trade IT and PT however they see fit, and participate in a dynamic insurance marketplace.

## 🚀 Key Features

### Core Functionality

- **🛡️ Smart Contract Protection**: Safeguard DeFi investments against protocol vulnerabilities and risks
- **💰 Yield Optimization**: Maximize returns by trading Insurance Tokens while maintaining principal amounts
- **🔄 Seamless Token Minting**: Convert USDT/USDC into insurance and principal tokens with intuitive UX
- **📊 Dynamic Insurance/Principal Market**: Trade insurance tokens/ principal tokens with real-time order books and pricing
- **🌐 Multi-Protocol Support**: Coverage for major DeFi protocols (Aave, Compound, Uniswap, Curve, etc.)

### User Experience

- **🔗 Wallet Integration**: RainbowKit-powered wallet connection with multi-wallet support
- **📱 Responsive Design**: Modern UI built with Material-UI and Tailwind CSS
- **⚡ Real-time Updates**: Live market data and trading interface
- **🎯 Protocol-Specific Pages**: Detailed trading interfaces for each supported protocol

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
├── contracts/                 # Smart contracts
│   ├── TokenMinting.sol      # Core protocol logic
│   ├── FundMe.sol           # Funding mechanisms
│   └── Lock.sol             # Time-locked contracts
├── next-app/                 # Frontend application
│   ├── src/app/             # Next.js App Router pages
│   │   ├── insurance-market/ # Insurance marketplace
│   │   ├── mint-tokens/     # Token minting interface
│   │   └── principal-market/ # Principal token trading
│   ├── src/components/      # Reusable UI components
│   └── src/styles/          # Styling and themes
├── ignition/                # Deployment modules
├── test/                    # Smart contract tests
└── scripts/                 # Utility scripts
```

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
# Install smart contract dependencies
npm install

# Install frontend dependencies
cd next-app
npm install
cd ..
```

3. **Start local blockchain**

```bash
npx hardhat node
```

4. **Deploy contracts** (in new terminal)

```bash
npx hardhat ignition deploy ignition/modules/TokenMinting.js --network localhost
```

5. **Start the frontend** (in new terminal)

```bash
cd next-app
npm run dev
```

6. **Configure MetaMask**
   - Network: Localhost 8545
   - Chain ID: 31337
   - RPC URL: http://127.0.0.1:8545

### 🎮 Usage Guide

#### 1. Connect Your Wallet

- Visit `http://localhost:3000`
- Click "Connect Wallet" to connect via RainbowKit
- Select your preferred wallet (MetaMask, WalletConnect, etc.)

#### 2. Mint Insurance Tokens

- Navigate to "Mint Tokens" page
- Select input token (USDT/USDC) and protocol
- Enter deposit amount
- Receive Insurance Tokens (IT) and Principal Tokens (PT)

#### 3. Trade in Insurance Market

- Browse available insurance protocols
- Click on any protocol to view detailed trading interface
- Use order book to buy/sell insurance tokens
- Monitor real-time rates and market depth

#### 4. Explore Principal Market

- Trade principal tokens to optimize yields
- Maintain exposure to underlying assets
- Leverage yield strategies across protocols

## 📋 Smart Contract Architecture

### Core Contracts

**`ProtocolInsurance.sol`**

- Main protocol logic and token management
- Multi-protocol support with configurable parameters
- Fee management and owner controls

**`InsuranceToken.sol` & `PrincipalToken.sol`**

- ERC20 implementations for protocol tokens
- Mintable/burnable with access controls
- Protocol-specific token pairs

**Key Functions:**

- `mintTokens()` - Convert stablecoins to IT/PT pairs
- `burnTokens()` - Redeem IT/PT for stablecoins
- `addProtocol()` - Admin function to add new protocols
- `updateFees()` - Dynamic fee management

## 🧪 Development Commands

```bash
# Smart Contract Development
npx hardhat compile                    # Compile contracts
npx hardhat test                      # Run tests
npx hardhat node                      # Start local node
npx hardhat ignition deploy <module>  # Deploy contracts

# Frontend Development
cd next-app
npm run dev                           # Start dev server
npm run build                         # Production build
npm run dev:clean                     # Clean dev start
```

## 🔒 Security Features

- **ReentrancyGuard**: Protection against reentrancy attacks
- **Access Control**: Owner-only administrative functions
- **OpenZeppelin**: Battle-tested security standards
- **Input Validation**: Comprehensive parameter checking
- **Fee Protection**: Configurable and capped fee structures

## 🌐 Supported Protocols

Current insurance coverage includes:

- **Aave** - Lending protocol insurance
- **Compound** - Money market protection
- **Uniswap V3** - DEX insurance coverage
- **Curve Finance** - Stablecoin pool protection
- **SushiSwap** - Exchange insurance
- **MakerDAO** - CDP and stability fee coverage

## 📈 Future Roadmap

- [ ] Mainnet deployment and audit
- [ ] Additional protocol integrations
- [ ] Advanced yield strategies
- [ ] Cross-chain expansion
- [ ] Governance token implementation
- [ ] Mobile application development

## 🤝 Contributing

This project is part of a Final Year Project (FYP) exploring innovative DeFi insurance mechanisms. Contributions, suggestions, and feedback are welcome!

## 📄 License

This project is for educational and research purposes as part of academic coursework.

---

**Built with ❤️ for the future of DeFi insurance**
