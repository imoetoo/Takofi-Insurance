"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const viem_1 = require("viem");
require("viem/window"); // Augments window.ethereum type
const constants_ts_1 = require("./constants-ts");
// Define a proper chain object instead of just the number
const hardhatLocal = (0, viem_1.defineChain)({
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
function getElement(id) {
    const el = document.getElementById(id);
    if (!el)
        throw new Error(`Element #${id} not found`);
    return el;
}
const connectButton = getElement("connectButton");
const fundButton = getElement("fundButton");
const balanceButton = getElement("balanceButton");
const getBalanceButton = getElement("getBalanceButton");
const ethAmountInput = getElement("ethAmount");
const withdrawButton = getElement("withdrawButton");
let walletClient;
let publicClient;
async function connect() {
    if (typeof window.ethereum !== "undefined") {
        walletClient = (0, viem_1.createWalletClient)({
            chain: hardhatLocal,
            transport: (0, viem_1.custom)(window.ethereum),
        });
        const accounts = await walletClient.requestAddresses();
        connectButton.innerHTML = `Connected: ${accounts[0]}`;
    }
    else {
        connectButton.innerText = "Please install MetaMask";
    }
}
async function fund() {
    const ethAmount = ethAmountInput.value;
    if (!ethAmount || isNaN(Number(ethAmount))) {
        alert("Please enter a valid ETH amount");
        return;
    }
    if (typeof window.ethereum !== "undefined") {
        walletClient = (0, viem_1.createWalletClient)({
            chain: hardhatLocal,
            transport: (0, viem_1.custom)(window.ethereum),
        });
        const [connectedAccount] = await walletClient.requestAddresses();
        publicClient = (0, viem_1.createPublicClient)({
            chain: hardhatLocal,
            transport: (0, viem_1.http)("http://127.0.0.1:8545"),
        });
        try {
            const { request } = await publicClient.simulateContract({
                address: constants_ts_1.contractAddress,
                abi: constants_ts_1.abi,
                functionName: "fund",
                account: connectedAccount,
                value: (0, viem_1.parseEther)(ethAmount),
            });
            const hash = await walletClient.writeContract(request);
            console.log("Transaction hash:", hash);
        }
        catch (error) {
            console.error("Contract simulation failed:", error);
        }
    }
    else {
        connectButton.innerText = "Please install MetaMask";
    }
}
async function getAccountBalance() {
    if (typeof window.ethereum !== "undefined") {
        walletClient = (0, viem_1.createWalletClient)({
            chain: hardhatLocal,
            transport: (0, viem_1.custom)(window.ethereum),
        });
        const [connectedAccount] = await walletClient.requestAddresses();
        publicClient = (0, viem_1.createPublicClient)({
            chain: hardhatLocal,
            transport: (0, viem_1.http)("http://127.0.0.1:8545"),
        });
        const balance = await publicClient.getBalance({
            address: connectedAccount,
        });
        const balanceInEth = (0, viem_1.formatEther)(balance);
        balanceButton.innerHTML = `Balance: ${balanceInEth} ETH`;
    }
    else {
        balanceButton.innerText = "Please install MetaMask";
    }
}
async function getBalance() {
    publicClient = (0, viem_1.createPublicClient)({
        chain: hardhatLocal,
        transport: (0, viem_1.http)("http://127.0.0.1:8545"),
    });
    const balance = await publicClient.getBalance({
        address: constants_ts_1.contractAddress,
    });
    balanceButton.innerHTML = `Contract Balance: ${(0, viem_1.formatEther)(balance)} ETH`;
}
async function withdraw() {
    if (typeof window.ethereum !== "undefined") {
        walletClient = (0, viem_1.createWalletClient)({
            chain: hardhatLocal,
            transport: (0, viem_1.custom)(window.ethereum),
        });
        const [connectedAccount] = await walletClient.requestAddresses();
        publicClient = (0, viem_1.createPublicClient)({
            chain: hardhatLocal,
            transport: (0, viem_1.http)("http://127.0.0.1:8545"),
        });
        try {
            const { request } = await publicClient.simulateContract({
                address: constants_ts_1.contractAddress,
                abi: constants_ts_1.abi,
                functionName: "withdraw",
                account: connectedAccount,
            });
            const hash = await walletClient.writeContract(request);
            console.log("Transaction hash:", hash);
        }
        catch (error) {
            console.error("Contract withdrawal simulation failed:", error);
        }
    }
    else {
        connectButton.innerText = "Please install MetaMask";
    }
}
// Event binding
connectButton.onclick = connect;
fundButton.onclick = fund;
balanceButton.onclick = getBalance;
getBalanceButton.onclick = getAccountBalance;
withdrawButton.onclick = withdraw;
