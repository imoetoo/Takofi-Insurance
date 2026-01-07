"use client";

import { useWriteContract, useReadContract } from "wagmi";
import { parseUnits, keccak256, stringToBytes } from "viem";
import {
  TOKEN_MINTING_CONTRACT_ADDRESS,
  TOKEN_MINTING_ABI,
  USDT_ADDRESS,
  USDC_ADDRESS,
  STABLECOIN_DECIMALS,
} from "@/constants";

interface ProtocolTokens {
  itToken: `0x${string}`;
  ptToken: `0x${string}`;
}

interface UserTokenBalances {
  insuranceTokenBalance: bigint;
  principalTokenBalance: bigint;
}

interface ProtocolInfo {
  name: string;
  tvl: bigint;
  annualFee: bigint;
}

// Result tuple from getInsuranceMarketMetrics and getInsuranceMarketMetricsByMaturity
type InsuranceMarketMetrics = readonly [bigint, bigint, bigint, bigint];

interface UseTokenMintingReturn {
  mintTokens: (
    protocolName: string,
    maturityIndex: number,
    stablecoinSymbol: string,
    amount: string
  ) => Promise<`0x${string}`>;
  burnTokens: (
    protocolName: string,
    insuranceAmount: string,
    principalAmount: string,
    preferredStablecoinSymbol: string
  ) => Promise<`0x${string}`>;
  getProtocolId: (protocolName: string) => `0x${string}`;
  isPending: boolean;
  error: Error | null;
  hash: `0x${string}` | undefined;
}

export function useTokenMinting(): UseTokenMintingReturn {
  const {
    writeContractAsync,
    isPending,
    error,
    data: hash,
  } = useWriteContract();

  const mintTokens = async (
    protocolName: string,
    maturityIndex: number,
    stablecoinSymbol: string,
    amount: string
  ): Promise<`0x${string}`> => {
    try {
      // Convert protocol name to protocolId (bytes32)
      const protocolId = keccak256(stringToBytes(protocolName));

      // Determine stablecoin address
      const stablecoinAddress =
        stablecoinSymbol === "USDT" ? USDT_ADDRESS : USDC_ADDRESS;

      // Convert amount to proper decimals (USDT/USDC typically use 6 decimals)
      const amountInWei = parseUnits(amount, STABLECOIN_DECIMALS);

      // Call the mint function and return the promise
      return await writeContractAsync({
        address: TOKEN_MINTING_CONTRACT_ADDRESS as `0x${string}`,
        abi: TOKEN_MINTING_ABI,
        functionName: "mintTokens",
        args: [
          protocolId,
          BigInt(maturityIndex),
          stablecoinAddress,
          amountInWei,
        ],
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("Minting tokens failed:", error);
      throw error;
    }
  };

  const getProtocolId = (protocolName: string): `0x${string}` => {
    return keccak256(stringToBytes(protocolName)) as `0x${string}`;
  };

  const burnTokens = async (
    protocolName: string,
    insuranceAmount: string,
    principalAmount: string,
    preferredStablecoinSymbol: string
  ): Promise<`0x${string}`> => {
    try {
      const protocolId = keccak256(stringToBytes(protocolName));
      const preferredStablecoin =
        preferredStablecoinSymbol === "USDT" ? USDT_ADDRESS : USDC_ADDRESS;

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
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("Burning tokens failed:", error);
      throw error;
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
  const protocolId = keccak256(stringToBytes(protocolName));

  return useReadContract({
    address: TOKEN_MINTING_CONTRACT_ADDRESS as `0x${string}`,
    abi: TOKEN_MINTING_ABI,
    functionName: "getProtocolTokens",
    args: [protocolId],
  }) as {
    data: ProtocolTokens | undefined;
    isLoading: boolean;
    error: Error | null;
  };
}

// Hook for reading user token balances
export function useUserTokenBalances(
  userAddress: string | undefined,
  protocolName: string
) {
  const protocolId = keccak256(stringToBytes(protocolName));

  return useReadContract({
    address: TOKEN_MINTING_CONTRACT_ADDRESS as `0x${string}`,
    abi: TOKEN_MINTING_ABI,
    functionName: "getUserTokenBalances",
    args: [userAddress as `0x${string}`, protocolId],
    query: {
      enabled: !!userAddress,
    },
  }) as {
    data: UserTokenBalances | undefined;
    isLoading: boolean;
    error: Error | null;
  };
}

// Hook for reading protocol information
export function useProtocolInfo(protocolName: string) {
  const protocolId = keccak256(stringToBytes(protocolName));

  return useReadContract({
    address: TOKEN_MINTING_CONTRACT_ADDRESS as `0x${string}`,
    abi: TOKEN_MINTING_ABI,
    functionName: "protocols",
    args: [protocolId],
  }) as {
    data: ProtocolInfo | undefined;
    isLoading: boolean;
    error: Error | null;
  };
}

// Hook for reading user IT balance for a specific maturity
export function useUserITByMaturity(
  userAddress: string | undefined,
  protocolName: string,
  maturityIndex: number
) {
  const protocolId = keccak256(stringToBytes(protocolName));

  return useReadContract({
    address: TOKEN_MINTING_CONTRACT_ADDRESS as `0x${string}`,
    abi: TOKEN_MINTING_ABI,
    functionName: "getUserITByMaturity",
    args: [userAddress as `0x${string}`, protocolId, BigInt(maturityIndex)],
    query: {
      enabled: !!userAddress,
    },
  }) as { data: bigint | undefined; isLoading: boolean; error: Error | null };
}

// Hook for reading user's PT balance for a specific maturity
export function useUserPTByMaturity(
  userAddress: string | undefined,
  protocolName: string,
  maturityIndex: number
) {
  const protocolId = keccak256(stringToBytes(protocolName));

  return useReadContract({
    address: TOKEN_MINTING_CONTRACT_ADDRESS as `0x${string}`,
    abi: TOKEN_MINTING_ABI,
    functionName: "getUserPTByMaturity",
    args: [userAddress as `0x${string}`, protocolId, BigInt(maturityIndex)],
    query: {
      enabled: !!userAddress,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    },
  }) as { data: bigint | undefined; isLoading: boolean; error: Error | null };
}

// Hook for reading insurance market metrics (Available Capacity, TVL, Annual Fee, IT Price)
export function useInsuranceMarketMetrics(protocolName: string) {
  const protocolId = keccak256(stringToBytes(protocolName));

  return useReadContract({
    address: TOKEN_MINTING_CONTRACT_ADDRESS as `0x${string}`,
    abi: TOKEN_MINTING_ABI,
    functionName: "getInsuranceMarketMetrics",
    args: [protocolId],
    query: {
      refetchInterval: false, // Fetch only once on page load
    },
  }) as {
    data: InsuranceMarketMetrics | undefined;
    isLoading: boolean;
    error: Error | null;
  };
}

// Hook for reading insurance market metrics for a specific maturity
export function useInsuranceMarketMetricsByMaturity(
  protocolName: string,
  maturityIndex: number
) {
  const protocolId = keccak256(stringToBytes(protocolName));

  return useReadContract({
    address: TOKEN_MINTING_CONTRACT_ADDRESS as `0x${string}`,
    abi: TOKEN_MINTING_ABI,
    functionName: "getInsuranceMarketMetricsByMaturity",
    args: [protocolId, BigInt(maturityIndex)],
    query: {
      refetchInterval: false, // Fetch only once on page load
    },
  }) as {
    data: InsuranceMarketMetrics | undefined;
    isLoading: boolean;
    error: Error | null;
  };
}
// Hook to read maturity details
export function useMaturitySettlement(
  protocolName: string,
  maturityIndex: number
) {
  const protocolId = keccak256(stringToBytes(protocolName));

  return useReadContract({
    address: TOKEN_MINTING_CONTRACT_ADDRESS as `0x${string}`,
    abi: TOKEN_MINTING_ABI,
    functionName: "getMaturity",
    args: [protocolId, BigInt(maturityIndex)],
    query: {
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    },
  }) as {
    data: {
      expiryTime: bigint;
      label: string;
      isActive: boolean;
      isSettled: boolean;
      breachOccurred: boolean;
      totalITPayout: bigint;
    } | undefined;
    isLoading: boolean;
    error: Error | null;
  };
}

// Hook to check if maturity has expired (using blockchain time)
export function useIsMaturityExpired(
  protocolName: string,
  maturityIndex: number
) {
  const protocolId = keccak256(stringToBytes(protocolName));

  return useReadContract({
    address: TOKEN_MINTING_CONTRACT_ADDRESS as `0x${string}`,
    abi: TOKEN_MINTING_ABI,
    functionName: "isMaturityExpired",
    args: [protocolId, BigInt(maturityIndex)],
  }) as {
    data: boolean | undefined;
    isLoading: boolean;
    error: Error | null;
  };
}


// Hook to redeem Principal Tokens
export function useRedeemPrincipalTokens() {
  const { writeContractAsync, isPending, error, data: hash } = useWriteContract();

  const redeemPT = async (
    protocolName: string,
    maturityIndex: number,
    ptAmount: bigint
  ) => {
    const protocolId = keccak256(stringToBytes(protocolName));

    const hash = await writeContractAsync({
      address: TOKEN_MINTING_CONTRACT_ADDRESS as `0x${string}`,
      abi: TOKEN_MINTING_ABI,
      functionName: "redeemPrincipalTokens",
      args: [protocolId, BigInt(maturityIndex), ptAmount],
    });

    return hash;
  };

  return {
    redeemPT,
    isPending,
    error,
    hash,
  };
}

// Hook to burn expired Insurance Tokens (no payout)
export function useBurnExpiredIT() {
  const { writeContractAsync, isPending, error, data: hash } = useWriteContract();

  const burnIT = async (protocolName: string, maturityIndex: number) => {
    const protocolId = keccak256(stringToBytes(protocolName));

    const hash = await writeContractAsync({
      address: TOKEN_MINTING_CONTRACT_ADDRESS as `0x${string}`,
      abi: TOKEN_MINTING_ABI,
      functionName: "burnExpiredInsuranceTokens",
      args: [protocolId, BigInt(maturityIndex)],
    });

    return hash;
  };

  return {
    burnIT,
    isPending,
    error,
    hash,
  };
}