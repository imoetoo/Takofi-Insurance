import {
  createWalletClient,
  custom,
  createPublicClient,
  parseEther,
  formatEther,
  http,
  defineChain,
  WalletClient,
  PublicClient,
  Transport,
  Chain,
} from "viem";
import "viem/window"; // Augments window.ethereum type
import { contractAddress, abi } from "./constants-ts";

// Define a proper chain object instead of just the number
const hardhatLocal: Chain = defineChain({
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

// Type-safe element retrieval
function getElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el as T;
}
const connectButton = getElement<HTMLButtonElement>("connectButton");
const fundButton = getElement<HTMLButtonElement>("fundButton");
const balanceButton = getElement<HTMLButtonElement>("balanceButton");
const getBalanceButton = getElement<HTMLButtonElement>("getBalanceButton");
const ethAmountInput = getElement<HTMLInputElement>("ethAmount");
const withdrawButton = getElement<HTMLButtonElement>("withdrawButton");

let walletClient: any;
let publicClient : any;

async function connect(): Promise<void> {
  if (typeof window.ethereum !== "undefined") {
    walletClient = createWalletClient({
      chain: hardhatLocal,
      transport: custom(window.ethereum),
    });
    const accounts = await walletClient.requestAddresses();
    connectButton.innerHTML = `Connected: ${accounts[0]}`;
  } else {
    connectButton.innerText = "Please install MetaMask";
  }
}

async function fund(): Promise<void> {
  const ethAmount = ethAmountInput.value;
  if (!ethAmount || isNaN(Number(ethAmount))) {
    alert("Please enter a valid ETH amount");
    return;
  }
  if (typeof window.ethereum !== "undefined") {
    walletClient = createWalletClient({
      chain: hardhatLocal,
      transport: custom(window.ethereum),
    });
    const [connectedAccount] = await walletClient.requestAddresses();

    publicClient = createPublicClient({
      chain: hardhatLocal,
      transport: http("http://127.0.0.1:8545"),
    });

    try {
      const { request } = await publicClient.simulateContract({
        address: contractAddress,
        abi: abi,
        functionName: "fund",
        account: connectedAccount,
        value: parseEther(ethAmount),
      });
      const hash = await walletClient.writeContract(request);
      console.log("Transaction hash:", hash);
    } catch (error) {
      console.error("Contract simulation failed:", error);
    }
  } else {
    connectButton.innerText = "Please install MetaMask";
  }
}

async function getAccountBalance(): Promise<void> {
  if (typeof window.ethereum !== "undefined") {
    walletClient = createWalletClient({
      chain: hardhatLocal,
      transport: custom(window.ethereum),
    });
    const [connectedAccount] = await walletClient.requestAddresses();

    publicClient = createPublicClient({
      chain: hardhatLocal,
      transport: http("http://127.0.0.1:8545"),
    });

    const balance = await publicClient.getBalance({
      address: connectedAccount,
    });
    const balanceInEth = formatEther(balance);
    balanceButton.innerHTML = `Balance: ${balanceInEth} ETH`;
  } else {
    balanceButton.innerText = "Please install MetaMask";
  }
}

async function getBalance(): Promise<void> {
  publicClient = createPublicClient({
    chain: hardhatLocal,
    transport: http("http://127.0.0.1:8545"),
  });
  const balance = await publicClient.getBalance({
    address: contractAddress,
  });
  balanceButton.innerHTML = `Contract Balance: ${formatEther(balance)} ETH`;
}

async function withdraw(): Promise<void> {
  if (typeof window.ethereum !== "undefined") {
    walletClient = createWalletClient({
      chain: hardhatLocal,
      transport: custom(window.ethereum),
    });
    const [connectedAccount] = await walletClient.requestAddresses();

    publicClient = createPublicClient({
      chain: hardhatLocal,
      transport: http("http://127.0.0.1:8545"),
    });

    try {
      const { request } = await publicClient.simulateContract({
        address: contractAddress,
        abi: abi,
        functionName: "withdraw",
        account: connectedAccount,
      });
      const hash = await walletClient.writeContract(request);
      console.log("Transaction hash:", hash);
    } catch (error) {
      console.error("Contract withdrawal simulation failed:", error);
    }
  } else {
    connectButton.innerText = "Please install MetaMask";
  }
}

// Event binding
connectButton.onclick = connect;
fundButton.onclick = fund;
balanceButton.onclick = getBalance;
getBalanceButton.onclick = getAccountBalance;
withdrawButton.onclick = withdraw;
