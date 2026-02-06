"use client";

import { useReadContracts } from "wagmi";
import { keccak256, stringToBytes } from "viem";
import { TOKEN_MINTING_ABI, TOKEN_MINTING_CONTRACT_ADDRESS } from "@/constants";

export function useFundStatus(protocolName: string, maturityIndex: number) {
  const protocolId = keccak256(stringToBytes(protocolName));

  const { data, isLoading, error } = useReadContracts({
    contracts: [
      {
        address: TOKEN_MINTING_CONTRACT_ADDRESS as `0x${string}`,
        abi: TOKEN_MINTING_ABI,
        functionName: "originalTotalDepositedByMaturity",
        args: [protocolId, BigInt(maturityIndex)],
      },
      {
        address: TOKEN_MINTING_CONTRACT_ADDRESS as `0x${string}`,
        abi: TOKEN_MINTING_ABI,
        functionName: "totalPayoutByMaturity",
        args: [protocolId, BigInt(maturityIndex)],
      },
    ],
    query: {
      enabled: !!protocolName,
    },
  });

  const totalDeposited =
    data?.[0]?.status === "success" ? (data[0].result as bigint) : 0n;
  const totalPayout =
    data?.[1]?.status === "success" ? (data[1].result as bigint) : 0n;

  const isDrained = totalPayout > 0n && totalDeposited <= totalPayout;

  return {
    totalDeposited,
    totalPayout,
    isDrained,
    isLoading,
    error,
  };
}
