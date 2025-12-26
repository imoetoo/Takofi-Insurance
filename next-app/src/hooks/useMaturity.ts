"use client";

import { useReadContract } from "wagmi";
import { TOKEN_MINTING_CONTRACT_ADDRESS, TOKEN_MINTING_ABI } from "@/constants";
import { keccak256, stringToBytes } from "viem";

export interface MaturityBucket {
  expiryTime: bigint;
  label: string;
  isActive: boolean;
}

interface UseMaturitiesReturn {
  maturity6M: MaturityBucket | undefined;
  maturity12M: MaturityBucket | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch both maturity buckets for a protocol
 */
export function useMaturities(
  protocolName: string | null | undefined
): UseMaturitiesReturn {
  const protocolId = protocolName
    ? keccak256(stringToBytes(protocolName))
    : null;

  const { data, isLoading, error, refetch } = useReadContract({
    address: TOKEN_MINTING_CONTRACT_ADDRESS,
    abi: TOKEN_MINTING_ABI,
    functionName: "getMaturities",
    args: protocolId ? [protocolId] : undefined,
    query: {
      enabled: !!protocolId,
    },
  });

  let maturity6M: MaturityBucket | undefined;
  let maturity12M: MaturityBucket | undefined;

  if (data && Array.isArray(data) && data.length >= 2) {
    const bucket1 = data[0] as {
      expiryTime?: bigint;
      label?: string;
      isActive?: boolean;
    };
    const bucket2 = data[1] as {
      expiryTime?: bigint;
      label?: string;
      isActive?: boolean;
    };

    if (bucket1.expiryTime !== undefined) {
      maturity6M = {
        expiryTime: bucket1.expiryTime,
        label: bucket1.label || "",
        isActive: bucket1.isActive ?? false,
      };
    }

    if (bucket2.expiryTime !== undefined) {
      maturity12M = {
        expiryTime: bucket2.expiryTime,
        label: bucket2.label || "",
        isActive: bucket2.isActive ?? false,
      };
    }
  }

  return {
    maturity6M,
    maturity12M,
    isLoading,
    error: error instanceof Error ? error : null,
    refetch,
  };
}

/**
 * Hook to check if a maturity has expired
 */
export function useIsMaturityExpired(
  protocolName: string | null | undefined,
  maturityIndex: number
): boolean {
  const protocolId = protocolName
    ? keccak256(stringToBytes(protocolName))
    : null;

  const { data: isExpired } = useReadContract({
    address: TOKEN_MINTING_CONTRACT_ADDRESS,
    abi: TOKEN_MINTING_ABI,
    functionName: "isMaturityExpired",
    args: protocolId ? [protocolId, BigInt(maturityIndex)] : undefined,
    query: {
      enabled: !!protocolId,
    },
  });

  return typeof isExpired === "boolean" ? isExpired : false;
}

/**
 * Hook to get days until maturity expires
 */
export function useDaysUntilMaturity(
  protocolName: string | null | undefined,
  maturityIndex: number
): number {
  const protocolId = protocolName
    ? keccak256(stringToBytes(protocolName))
    : null;

  const { data: daysLeft } = useReadContract({
    address: TOKEN_MINTING_CONTRACT_ADDRESS,
    abi: TOKEN_MINTING_ABI,
    functionName: "getDaysUntilMaturity",
    args: protocolId ? [protocolId, BigInt(maturityIndex)] : undefined,
    query: {
      enabled: !!protocolId,
    },
  });

  return daysLeft ? Number(daysLeft) : 0;
}

/**
 * Format maturity data for display
 */
export function formatMaturityLabel(maturity: MaturityBucket | undefined) {
  if (!maturity) return "N/A";

  const expiryDate = new Date(Number(maturity.expiryTime) * 1000);
  return expiryDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Get time remaining string
 */
export function formatTimeRemaining(days: number): string {
  if (days <= 0) return "Expired";
  if (days > 60) {
    const months = Math.floor(days / 30);
    return `${months}m remaining`;
  }
  return `${days}d remaining`;
}
