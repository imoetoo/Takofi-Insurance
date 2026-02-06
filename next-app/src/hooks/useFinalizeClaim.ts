"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CLAIM_MANAGER_ABI, CLAIM_MANAGER_ADDRESS } from "@/constants";

export function useFinalizeClaim() {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  const finalizeClaim = async (claimId: number) => {
    return writeContract({
      address: CLAIM_MANAGER_ADDRESS as `0x${string}`,
      abi: CLAIM_MANAGER_ABI,
      functionName: "finalizeClaim",
      args: [BigInt(claimId)],
    });
  };

  return {
    finalizeClaim,
    isFinalizing: isPending,
    isSuccess,
    error,
  };
}
