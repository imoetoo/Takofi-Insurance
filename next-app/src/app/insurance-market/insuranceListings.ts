// Insurance listings data - metrics are fetched dynamically from smart contract
export const insuranceListings = [
  {
    title: "SushiSwap",
    provider: "SushiSwap Insurance Token",
    isNew: true,
    protocol: "exchange" as const,
  },
  {
    title: "Curve Finance",
    provider: "Curve Finance Insurance Token",
    isNew: false,
    protocol: "defi" as const,
  },
  {
    title: "Aave",
    provider: "Aave Insurance Token",
    isNew: false,
    protocol: "lending" as const,
  },
  {
    title: "Uniswap V3",
    provider: "Uniswap Insurance Token",
    isNew: false,
    protocol: "exchange" as const,
  },
  {
    title: "Compound",
    provider: "Compound Insurance Token",
    isNew: false,
    protocol: "lending" as const,
  },
  {
    title: "PancakeSwap",
    provider: "PancakeSwap Insurance Token",
    isNew: false,
    protocol: "exchange" as const,
  },
];
