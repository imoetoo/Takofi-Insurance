"use client";

import { useWriteContract, useReadContract } from "wagmi";
import { parseUnits, keccak256, toBytes } from "viem";
import {
  TOKEN_MINTING_CONTRACT_ADDRESS,
  TOKEN_MINTING_ABI,
  USDT_ADDRESS,
  USDC_ADDRESS,
  STABLECOIN_DECIMALS,
} from "@/constants";

export function useTokenMinting() {
  const {
    writeContractAsync,
    isPending,
    error,
    data: hash,
  } = useWriteContract();

  const mintTokens = async (
    protocolName: string,
    stablecoinSymbol: string,
    amount: string
  ) => {
    // Convert protocol name to protocolId (bytes32)
    const protocolId = keccak256(toBytes(protocolName));

    // Determine stablecoin address
    const stablecoinAddress = (
      stablecoinSymbol === "USDT" ? USDT_ADDRESS : USDC_ADDRESS
    ) as `0x${string}`;

    // Convert amount to proper decimals (USDT/USDC typically use 6 decimals)
    const amountInWei = parseUnits(amount, STABLECOIN_DECIMALS);

    // Call the mint function and return the promise
    return writeContractAsync({
      address: TOKEN_MINTING_CONTRACT_ADDRESS as `0x${string}`,
      abi: TOKEN_MINTING_ABI,
      functionName: "mintTokens",
      args: [protocolId, stablecoinAddress, amountInWei],
    });
  };

  const getProtocolId = (protocolName: string): `0x${string}` => {
    return keccak256(toBytes(protocolName));
  };

  const burnTokens = async (
    protocolName: string,
    insuranceAmount: string,
    principalAmount: string,
    preferredStablecoinSymbol: string
  ) => {
    try {
      const protocolId = keccak256(toBytes(protocolName));
      const preferredStablecoin = (
        preferredStablecoinSymbol === "USDT" ? USDT_ADDRESS : USDC_ADDRESS
      ) as `0x${string}`;

      const insuranceAmountWei = parseUnits(insuranceAmount, 18); // Tokens are ERC20 with 18 decimals
      const principalAmountWei = parseUnits(principalAmount, 18);

      return await writeContractAsync({
        address: TOKEN_MINTING_CONTRACT_ADDRESS as `0x${string}`,
        abi: TOKEN_MINTING_ABI,
        functionName: "burnTokens",
        args: [
          protocolId,
          insuranceAmountWei,
          principalAmountWei,
          preferredStablecoin,
        ],
      });
    } catch (err) {
      console.error("Burning tokens failed:", err);
      throw err;
    }
  };

  return {
    mintTokens,
    burnTokens,
    getProtocolId,
    isPending,
    error,
    hash,
  };
}

// Hook for reading protocol token addresses
export function useProtocolTokens(protocolName: string) {
  const protocolId = keccak256(toBytes(protocolName));

  return useReadContract({
    address: TOKEN_MINTING_CONTRACT_ADDRESS as `0x${string}`,
    abi: TOKEN_MINTING_ABI,
    functionName: "getProtocolTokens",
    args: [protocolId],
  });
}

// Hook for reading user token balances
export function useUserTokenBalances(
  userAddress: string | undefined,
  protocolName: string
) {
  const protocolId = keccak256(toBytes(protocolName));

  return useReadContract({
    address: TOKEN_MINTING_CONTRACT_ADDRESS as `0x${string}`,
    abi: TOKEN_MINTING_ABI,
    functionName: "getUserTokenBalances",
    args: [userAddress as `0x${string}`, protocolId],
    query: {
      enabled: !!userAddress,
    },
  });
}

// Hook for reading protocol information
export function useProtocolInfo(protocolName: string) {
  const protocolId = keccak256(toBytes(protocolName));

  return useReadContract({
    address: TOKEN_MINTING_CONTRACT_ADDRESS as `0x${string}`,
    abi: TOKEN_MINTING_ABI,
    functionName: "protocols",
    args: [protocolId],
  });
}
