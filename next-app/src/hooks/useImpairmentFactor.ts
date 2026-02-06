"use client";

import { useReadContract } from "wagmi";
import { keccak256, stringToBytes } from "viem";
import { TOKEN_MINTING_ABI, TOKEN_MINTING_CONTRACT_ADDRESS } from "@/constants";

export function useImpairmentFactor(
  protocolName: string,
  maturityIndex: number,
) {
  const protocolId = keccak256(stringToBytes(protocolName));

  return useReadContract({
    address: TOKEN_MINTING_CONTRACT_ADDRESS as `0x${string}`,
    abi: TOKEN_MINTING_ABI,
    functionName: "getImpairmentFactor",
    args: [protocolId, BigInt(maturityIndex)],
    query: {
      enabled: !!protocolName,
    },
  }) as {
    data: bigint | undefined;
    isLoading: boolean;
    error: Error | null;
  };
}
