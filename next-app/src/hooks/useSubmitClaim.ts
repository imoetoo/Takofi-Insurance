import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { keccak256, toHex } from "viem";
import { CLAIM_MANAGER_ADDRESS, CLAIM_MANAGER_ABI } from "@/constants";

interface SubmitClaimParams {
  protocol: string;
  hackAmount: string;
  hackDate: string;
  details: string;
  attachmentURI: string;
}

export function useSubmitClaim() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}` | undefined,
  });

  const submitClaim = async (params: SubmitClaimParams) => {
    try {
      setIsSubmitting(true);
      setError(null);
      setTxHash(null);

      // Validate inputs
      if (
        !params.protocol ||
        !params.hackAmount ||
        !params.hackDate ||
        !params.details
      ) {
        throw new Error("Missing required fields");
      }

      const hackAmountNumber = parseFloat(params.hackAmount);
      if (isNaN(hackAmountNumber) || hackAmountNumber <= 0) {
        throw new Error("Hack amount must be a valid positive number");
      }

      // Parse date and convert to Unix timestamp
      const hackDateObj = new Date(params.hackDate);
      if (isNaN(hackDateObj.getTime())) {
        throw new Error("Invalid hack date");
      }
      const hackDateTimestamp = Math.floor(hackDateObj.getTime() / 1000);

      // Generate protocol ID
      const protocolId = keccak256(toHex(params.protocol));

      // Convert hack amount to proper format (assuming 6 decimals like USDC/USDT)
      const hackAmountScaled = Math.floor(hackAmountNumber * 1e6).toString();

      console.log("Submitting claim with:", {
        protocolId,
        hackAmountScaled,
        hackDateTimestamp,
        details: params.details,
        attachmentURI: params.attachmentURI,
      });

      // Call smart contract
      const result = await new Promise<`0x${string}`>((resolve, reject) => {
        writeContract(
          {
            address: CLAIM_MANAGER_ADDRESS,
            abi: CLAIM_MANAGER_ABI,
            functionName: "submitClaim",
            args: [
              protocolId,
              BigInt(hackAmountScaled),
              BigInt(hackDateTimestamp),
              params.details,
              params.attachmentURI,
            ],
          },
          {
            onSuccess: (hash) => {
              console.log("Claim submitted with tx hash:", hash);
              setTxHash(hash);
              resolve(hash);
            },
            onError: (err) => {
              const errorMessage =
                err instanceof Error ? err.message : "Unknown error occurred";
              setError(errorMessage);
              reject(err);
            },
          },
        );
      });

      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to submit claim";
      setError(errorMessage);
      setIsSubmitting(false);
      throw err;
    }
  };

  return {
    submitClaim,
    isSubmitting: isSubmitting || isPending || isConfirming,
    isSuccess,
    error,
    txHash,
  };
}
