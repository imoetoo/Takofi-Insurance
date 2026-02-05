import { useState, useEffect } from "react";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits } from "viem";
import { getProtocolId } from "@/utils/protocolUtils";
import deployments from "@/deployments.json";

const CLAIM_MANAGER_ABI = [
  {
    inputs: [
      { name: "protocolId", type: "bytes32" },
      { name: "hackAmount", type: "uint256" },
      { name: "hackDate", type: "uint256" },
      { name: "details", type: "string" },
      { name: "attachmentURI", type: "string" },
    ],
    name: "submitClaim",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getUserClaims",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "claimId", type: "uint256" }],
    name: "getClaim",
    outputs: [
      { name: "", type: "uint256" },
      { name: "", type: "bytes32" },
      { name: "", type: "uint256" },
      { name: "", type: "uint256" },
      { name: "", type: "uint256" },
      { name: "", type: "address" },
      { name: "", type: "uint256" },
      { name: "", type: "string" },
      { name: "", type: "string" },
      { name: "", type: "uint8" },
      { name: "", type: "string" },
      { name: "", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllPendingClaims",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "claimId", type: "uint256" },
      { name: "notes", type: "string" },
    ],
    name: "approveClaim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "claimId", type: "uint256" },
      { name: "notes", type: "string" },
    ],
    name: "rejectClaim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "claimId", type: "uint256" }],
    name: "finalizeClaim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

interface Claim {
  claimId: number;
  protocolName: string;
  hackAmount: string;
  submissionTime: number;
  status: number;
}

export function useSubmitClaim() {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  const submitClaim = async (
    protocolName: string,
    hackAmount: string,
    hackDate: string,
    details: string,
    attachmentURI: string = "",
  ) => {
    const protocolId = getProtocolId(protocolName);
    const hackAmountWei = parseUnits(hackAmount, 6); // USDC/USDT decimals
    const hackTimestamp = Math.floor(new Date(hackDate).getTime() / 1000);

    return writeContract({
      address: deployments.contracts.ClaimManager as `0x${string}`,
      abi: CLAIM_MANAGER_ABI,
      functionName: "submitClaim",
      args: [
        protocolId,
        hackAmountWei,
        BigInt(hackTimestamp),
        details,
        attachmentURI,
      ],
    });
  };

  return {
    submitClaim,
    isSubmitting: isPending,
    isSuccess,
    error,
  };
}

export function useUserClaims(userAddress: string | undefined) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  const { data: claimIds } = useReadContract({
    address: deployments.contracts.ClaimManager as `0x${string}`,
    abi: CLAIM_MANAGER_ABI,
    functionName: "getUserClaims",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  useEffect(() => {
    async function fetchClaims() {
      if (!claimIds || !Array.isArray(claimIds)) {
        setLoading(false);
        return;
      }

      const claimDetails: Claim[] = [];

      for (const claimId of claimIds) {
        // In a real implementation, you would fetch each claim detail
        // This is a placeholder
        claimDetails.push({
          claimId: Number(claimId),
          protocolName: "Protocol",
          hackAmount: "1000000",
          submissionTime: Math.floor(Date.now() / 1000),
          status: 0,
        });
      }

      setClaims(claimDetails);
      setLoading(false);
    }

    fetchClaims();
  }, [claimIds]);

  return {
    claims,
    loading,
    refetch: () => {
      setLoading(true);
      // Trigger refetch
    },
  };
}

export function useApproveClaim() {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  const approveClaim = async (claimId: number, notes: string) => {
    return writeContract({
      address: deployments.contracts.ClaimManager as `0x${string}`,
      abi: CLAIM_MANAGER_ABI,
      functionName: "approveClaim",
      args: [BigInt(claimId), notes],
    });
  };

  return {
    approveClaim,
    isApproving: isPending,
    isSuccess,
    error,
  };
}

export function useRejectClaim() {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  const rejectClaim = async (claimId: number, notes: string) => {
    return writeContract({
      address: deployments.contracts.ClaimManager as `0x${string}`,
      abi: CLAIM_MANAGER_ABI,
      functionName: "rejectClaim",
      args: [BigInt(claimId), notes],
    });
  };

  return {
    rejectClaim,
    isRejecting: isPending,
    isSuccess,
    error,
  };
}

export function useFinalizeClaim() {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  const finalizeClaim = async (claimId: number) => {
    return writeContract({
      address: deployments.contracts.ClaimManager as `0x${string}`,
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
