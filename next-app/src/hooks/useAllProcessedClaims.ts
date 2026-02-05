import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { CLAIM_MANAGER_ADDRESS, CLAIM_MANAGER_ABI } from "@/constants";

export interface ProcessedClaim {
  claimId: number;
  protocolName: string;
  hackAmount: string;
  hackDate: number;
  submissionTime: number;
  details: string;
  attachmentURI: string;
  status: number;
  claimant: string;
  superadminNotes: string;
  reviewTime: number;
}

export function useAllProcessedClaims() {
  const {
    data: allClaimIdsData,
    isLoading: allClaimIdsLoading,
    refetch: refetchAllClaimIds,
  } = useReadContracts({
    contracts: [
      {
        address: CLAIM_MANAGER_ADDRESS,
        abi: CLAIM_MANAGER_ABI,
        functionName: "getAllPendingClaims",
        args: [],
      },
    ],
  });

  const allClaimIds = useMemo(() => {
    if (
      !allClaimIdsData ||
      !allClaimIdsData[0] ||
      allClaimIdsData[0].status !== "success"
    ) {
      return [];
    }
    const result = allClaimIdsData[0].result;
    if (!result || !Array.isArray(result)) {
      return [];
    }
    return result as bigint[];
  }, [allClaimIdsData]);

  // Note: We use getAllPendingClaims as a starting point, but we'll need to fetch all claims
  // For now, we'll fetch details for all IDs we can get
  const claimDetailContracts = useMemo(() => {
    if (!allClaimIds || allClaimIds.length === 0) return [];

    return allClaimIds.map((claimId) => ({
      address: CLAIM_MANAGER_ADDRESS,
      abi: CLAIM_MANAGER_ABI,
      functionName: "getClaim",
      args: [claimId],
    }));
  }, [allClaimIds]);

  const { data: claimDetailsData, isLoading: claimDetailsLoading } =
    useReadContracts({
      contracts: claimDetailContracts,
      query: {
        enabled: claimDetailContracts.length > 0,
      },
    });

  const processedClaims = useMemo(() => {
    if (!claimDetailsData || claimDetailsData.length === 0) {
      return [];
    }

    const claims: ProcessedClaim[] = [];

    claimDetailsData.forEach((claimData, index) => {
      if (!claimData || claimData.status !== "success" || !claimData.result) {
        return;
      }

      const result = claimData.result as [
        number, // claimId
        string, // protocolId (but we don't use it)
        bigint, // hackAmount
        number, // hackDate
        number, // submissionTime
        string, // claimant
        number, // maturityIndex
        string, // details
        string, // attachmentURI
        number, // status
        string, // superadminNotes
        number, // reviewTime
      ];
      const claimId = Number(allClaimIds[index]);
      const status = result[9]; // status is at index 9

      // Only include processed claims (status !== 0 which is Pending)
      if (status !== 0) {
        claims.push({
          claimId,
          protocolName: result[1] || "Unknown",
          hackAmount: String(result[2] || 0),
          hackDate: result[3] || 0,
          submissionTime: result[4] || 0,
          details: result[7] || "",
          attachmentURI: result[8] || "",
          status,
          claimant: result[5] || "",
          superadminNotes: result[10] || "",
          reviewTime: result[11] || 0,
        });
      }
    });

    return claims;
  }, [claimDetailsData, allClaimIds]);

  return {
    claims: processedClaims,
    loading: allClaimIdsLoading || claimDetailsLoading,
    refetch: refetchAllClaimIds,
  };
}
