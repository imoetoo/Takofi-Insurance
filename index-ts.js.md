import {
  createWalletClient,
  custom,
  createPublicClient,
  parseEther,
  formatEther,
  http,
  defineChain,
} from "viem";
import { contractAddress, abi } from "./constants-js.js";

// Define a proper chain object instead of just the number
// This matches Hardhat's default chain ID of 31337
const hardhatLocal = defineChain({
  id: 31337,
  name: "Hardhat Local",
  network: "hardhat",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
  },
});

// Get DOM elements
const connectButton = document.getElementById("connectButton");
const fundButton = document.getElementById("fundButton");
const balanceButton = document.getElementById("balanceButton");
const getBalanceButton = document.getElementById("getBalanceButton");
const ethAmountInput = document.getElementById("ethAmount");
const withdrawButton = document.getElementById("withdrawButton");

// Global client variables
let walletClient; // For wallet transactions (signing)
let publicClient; // For public client interactions (reading blockchain)

// Connect to MetaMask wallet
async function connect() {
  if (typeof window.ethereum !== "undefined") {
    // Create wallet client for transaction signing
    walletClient = createWalletClient({
      chain: hardhatLocal,
      transport: custom(window.ethereum),
    });
    // Request user's Ethereum addresses
    const accounts = await walletClient.requestAddresses();
    connectButton.innerHTML = `Connected: ${accounts[0]}`;
  } else {
    connectButton.innerText = "Please install MetaMask";
  }
}

// Fund the contract (buy coffee)
async function fund() {
  const ethAmount = ethAmountInput.value;
  console.log(`Buying coffee with ${ethAmount} ETH...`);
  if (typeof window.ethereum !== "undefined") {
    // Create wallet client for signing transactions
    walletClient = createWalletClient({
      chain: hardhatLocal,
      transport: custom(window.ethereum),
    });
    const [connectedAccount] = await walletClient.requestAddresses();

    // Create public client for reading blockchain data and simulating transactions
    publicClient = createPublicClient({
      chain: hardhatLocal,
      transport: http("http://127.0.0.1:8545"), // Connect directly to Hardhat node
    });

    try {
      // Simulate the contract interaction first to check if it will succeed
      const { request } = await publicClient.simulateContract({
        address: contractAddress,
        abi: abi,
        functionName: "fund",
        account: connectedAccount,
        value: parseEther(ethAmount), // Convert ETH to wei (1 ETH = 1000000000000000000 wei)
      });
      console.log(request);
      console.log("Contract interaction simulation successful!");

      // If simulation passes, send the actual transaction
      const hash = await walletClient.writeContract(request);
      console.log("Transaction hash:", hash);
    } catch (error) {
      console.error("Contract simulation failed:", error);
    }
  } else {
    connectButton.innerText = "Please install MetaMask";
  }
}

// Gets balance of the user's wallet account
async function getAccountBalance() {
  if (typeof window.ethereum !== "undefined") {
    // Create wallet client to get connected account
    walletClient = createWalletClient({
      chain: hardhatLocal,
      transport: custom(window.ethereum),
    });
    const [connectedAccount] = await walletClient.requestAddresses();

    // Create public client to read blockchain data
    publicClient = createPublicClient({
      chain: hardhatLocal,
      transport: http("http://127.0.0.1:8545"),
    });

    // Get the ETH balance of the connected account
    const balance = await publicClient.getBalance({
      address: connectedAccount,
    });
    const balanceInEth = formatEther(balance); // Convert wei to ETH for display
    getBalanceButton.innerHTML = `Balance: ${balanceInEth} ETH`;
  } else {
    getBalanceButton.innerText = "Please install MetaMask";
  }
}

//Gets balance of the contract (how much ETH is stored in the smart contract)
async function getBalance() {
  // Create public client to read blockchain data
  publicClient = createPublicClient({
    chain: hardhatLocal,
    transport: http("http://127.0.0.1:8545"), // Connect directly to Hardhat node
  });
  // Get the ETH balance of the contract address
  const balance = await publicClient.getBalance({
    address: contractAddress,
  });
  console.log("Contract balance:", formatEther(balance));
  balanceButton.innerHTML = `Contract Balance: ${formatEther(balance)} ETH`;
}

// Withdraw funds from the contract (only owner can do this)
async function withdraw() {
  if (typeof window.ethereum !== "undefined") {
    // Create wallet client for transaction signing
    walletClient = createWalletClient({
      chain: hardhatLocal,
      transport: custom(window.ethereum),
    });
    const [connectedAccount] = await walletClient.requestAddresses();

    // Create public client for contract simulation
    publicClient = createPublicClient({
      chain: hardhatLocal,
      transport: http("http://127.0.0.1:8545"),
    });

    try {
      // Simulate the withdraw transaction first
      const { request } = await publicClient.simulateContract({
        address: contractAddress,
        abi: abi,
        functionName: "withdraw",
        account: connectedAccount,
      });
      console.log(request);
      console.log("Contract withdrawal simulation successful!");

      // If simulation passes, execute the actual withdrawal
      const hash = await walletClient.writeContract(request);
      console.log("Transaction hash:", hash);
    } catch (error) {
      console.error("Contract withdrawal simulation failed:", error);
    }
  } else {
    connectButton.innerText = "Please install MetaMask";
  }
}

// Event listeners - connect button click events to functions
connectButton.onclick = connect;
fundButton.onclick = fund;
balanceButton.onclick = getBalance;
getBalanceButton.onclick = getAccountBalance;
withdrawButton.onclick = withdraw;
