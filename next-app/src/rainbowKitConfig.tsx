"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  anvil,
  zksync,
  sepolia,
} from "wagmi/chains";

// Only log once in development
if (process.env.NODE_ENV === "development") {
  console.log(
    "WalletConnect Project ID:",
    process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID
  );
}

// Create config outside component to prevent re-initialization
let config: ReturnType<typeof getDefaultConfig> | null = null;

function getConfig() {
  if (!config) {
    config = getDefaultConfig({
      appName: "TakoFi",
      projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID!,
      chains: [mainnet, optimism, arbitrum, base, zksync, sepolia, anvil],
      ssr: false,
    });
  }
  return config;
}

export default getConfig();
