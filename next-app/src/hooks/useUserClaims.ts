import { useMemo } from "react";
import { useReadContracts, useAccount } from "wagmi";
import { keccak256, toHex } from "viem";
import {
  CLAIM_MANAGER_ADDRESS,
  CLAIM_MANAGER_ABI,
  PROTOCOLS,
} from "@/constants";

export interface UserClaim {
  claimId: number;
  protocolId: string;
  protocolName: string;
  maturityIndex: number;
  hackAmount: string;
  hackDate: number;
  claimant: string;
  submissionTime: number;
  details: string;
  attachmentURI: string;
  status: number;
  superadminNotes: string;
  reviewTime: number;
}

export function useUserClaims() {
  const { address } = useAccount();

  // First, get the claim IDs for the user
  const {
    data: claimIdsData,
    isLoading: claimIdsLoading,
    refetch: refetchClaimIds,
  } = useReadContracts({
    contracts: address
      ? [
          {
            address: CLAIM_MANAGER_ADDRESS,
            abi: CLAIM_MANAGER_ABI,
            functionName: "getUserClaims",
            args: [address],
          },
        ]
      : [],
    query: {
      enabled: !!address,
    },
  });

  // Extract claim IDs from the result
  const claimIds = useMemo(() => {
    if (
      !claimIdsData ||
      !claimIdsData[0] ||
      claimIdsData[0].status !== "success"
    ) {
      return [];
    }
    const result = claimIdsData[0].result;
    if (!result || !Array.isArray(result)) {
      return [];
    }
    return result as bigint[];
  }, [claimIdsData]);

  // Create contracts array to fetch details for each claim
  const claimDetailContracts = useMemo(() => {
    if (!claimIds || claimIds.length === 0) return [];

    return claimIds.map((claimId) => ({
      address: CLAIM_MANAGER_ADDRESS,
      abi: CLAIM_MANAGER_ABI,
      functionName: "getClaim",
      args: [claimId],
    }));
  }, [claimIds]);

  // Fetch claim details
  const {
    data: claimDetailsData,
    isLoading: claimDetailsLoading,
    refetch: refetchClaimDetails,
  } = useReadContracts({
    contracts: claimDetailContracts,
    query: {
      enabled: claimDetailContracts.length > 0,
    },
  });

  // Process claim data
  const claims = useMemo(() => {
    if (!claimDetailsData || !claimIds || claimIds.length === 0) {
      return [];
    }

    return claimDetailsData
      .map((result) => {
        if (result.status !== "success" || !result.result) {
          return null;
        }

        const [
          claimId,
          protocolId,
          maturityIndex,
          hackAmount,
          hackDate,
          claimant,
          submissionTime,
          details,
          attachmentURI,
          status,
          superadminNotes,
          reviewTime,
        ] = result.result as [
          bigint,
          string,
          bigint,
          bigint,
          bigint,
          string,
          bigint,
          string,
          string,
          number,
          string,
          bigint,
        ];

        // Find protocol name from protocolId
        const protocolName =
          PROTOCOLS.find((p) => {
            const pId = keccak256(toHex(p));
            return pId === protocolId;
          }) || "Unknown";

        return {
          claimId: Number(claimId),
          protocolId: protocolId as string,
          protocolName,
          maturityIndex: Number(maturityIndex),
          hackAmount: (Number(hackAmount) / 1e6).toFixed(2), // Convert from 6 decimals
          hackDate: Number(hackDate),
          claimant: claimant as string,
          submissionTime: Number(submissionTime),
          details: details as string,
          attachmentURI: attachmentURI as string,
          status: status as number,
          superadminNotes: superadminNotes as string,
          reviewTime: Number(reviewTime),
        };
      })
      .filter((claim): claim is UserClaim => claim !== null);
  }, [claimDetailsData, claimIds]);

  const refetch = async () => {
    await refetchClaimIds();
    await refetchClaimDetails();
  };

  return {
    claims,
    loading: claimIdsLoading || claimDetailsLoading,
    error: null,
    refetch,
  };
}
