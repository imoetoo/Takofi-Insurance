// Contract addresses from deployment (loaded from environment variables)
export const TOKEN_MINTING_CONTRACT_ADDRESS = process.env
  .NEXT_PUBLIC_TOKEN_MINTING_ADDRESS! as `0x${string}`;

// Mock stablecoin addresses from deployment (for localhost testing)
export const USDT_ADDRESS = process.env
  .NEXT_PUBLIC_USDT_ADDRESS! as `0x${string}`; // Mock USDT deployed address
export const USDC_ADDRESS = process.env
  .NEXT_PUBLIC_USDC_ADDRESS! as `0x${string}`; // Mock USDC deployed address

// Ensure addresses are available
if (!TOKEN_MINTING_CONTRACT_ADDRESS || !USDT_ADDRESS || !USDC_ADDRESS) {
  throw new Error("Contract addresses not found in environment variables");
}

// TokenMinting contract ABI - essential functions only
export const TOKEN_MINTING_ABI = [
  {
    inputs: [
      { internalType: "bytes32", name: "protocolId", type: "bytes32" },
      { internalType: "address", name: "stablecoin", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "mintTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "protocolId", type: "bytes32" },
      { internalType: "uint256", name: "insuranceAmount", type: "uint256" },
      { internalType: "uint256", name: "principalAmount", type: "uint256" },
      { internalType: "address", name: "preferredStablecoin", type: "address" },
    ],
    name: "burnTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "protocolName", type: "string" }],
    name: "getProtocolId",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "protocolId", type: "bytes32" }],
    name: "getProtocolTokens",
    outputs: [
      { internalType: "address", name: "insurance", type: "address" },
      { internalType: "address", name: "principal", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "user", type: "address" },
      { internalType: "bytes32", name: "protocolId", type: "bytes32" },
    ],
    name: "getUserTokenBalances",
    outputs: [
      { internalType: "uint256", name: "insurance", type: "uint256" },
      { internalType: "uint256", name: "principal", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    name: "protocols",
    outputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "bool", name: "active", type: "bool" },
      {
        internalType: "contract InsuranceToken",
        name: "insuranceToken",
        type: "address",
      },
      {
        internalType: "contract PrincipalToken",
        name: "principalToken",
        type: "address",
      },
      { internalType: "uint256", name: "totalDeposited", type: "uint256" },
      { internalType: "uint256", name: "mintingFee", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ERC20 ABI for token approvals
export const ERC20_ABI = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Token decimals
export const STABLECOIN_DECIMALS = 6; // USDT and USDC typically use 6 decimals
