"use client";

import { useWriteContract } from "wagmi";
import { usePublicClient } from "wagmi";
import { CLAIM_MANAGER_ABI, CLAIM_MANAGER_ADDRESS } from "@/constants";

export function useClaimInsurancePayout() {
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient();

  const claimInsurancePayout = async (
    claimId: number,
    preferredStablecoin: `0x${string}`,
  ) => {
    try {
      const hash = await writeContractAsync({
        address: CLAIM_MANAGER_ADDRESS as `0x${string}`,
        abi: CLAIM_MANAGER_ABI,
        functionName: "claimInsurancePayout",
        args: [BigInt(claimId), preferredStablecoin],
      });

      // Wait for transaction to be mined
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      return hash;
    } catch (error) {
      throw error;
    }
  };

  return {
    claimInsurancePayout,
    isClaiming: isPending,
  };
}
