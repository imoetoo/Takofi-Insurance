# Solidity Practice

A personal project for learning Solidity and Web3 development, featuring wallet connection, balance checking, and smart contract interactions.

## Features

- Connect to MetaMask wallet
- Check account balance
- Check smart contract balance
- Fund smart contract (Buy Coffee)
- Withdraw funds (Owner only)
- TypeScript integration with Viem library

## Tech Stack

- **Frontend**: HTML, TypeScript, Vite
- **Blockchain**: Solidity, Hardhat
- **Web3 Library**: Viem
- **Development**: Node.js, npm

## Getting Started

### Prerequisites

- Node.js (v18.x recommended)
- MetaMask browser extension
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/[your-username]/solidity-practice.git
cd solidity-practice
```

2. Install dependencies:
```bash
npm install
```

3. Start the local blockchain:
```bash
npx hardhat node
```

4. In a new terminal, start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to the local development server
6. Connect your MetaMask to the local Hardhat network (Chain ID: 31337, RPC: http://127.0.0.1:8545)

## Usage

1. **Connect Wallet**: Click "Connect" to connect your MetaMask wallet
2. **Fund Contract**: Enter an ETH amount and click "Buy Coffee" to send ETH to the contract
3. **Check Balances**: Use the balance buttons to check your account and contract balances
4. **Withdraw**: Only the contract owner can withdraw funds

## Smart Contract

The project includes a `FundMe.sol` contract with the following features:
- Minimum funding amount (0.01 ETH)
- Owner-only withdrawal functionality
- Funder tracking and mapping

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npx hardhat node` - Start local blockchain
- `npx hardhat compile` - Compile smart contracts

## License

This project is for educational purposes.