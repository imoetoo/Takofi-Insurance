import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { CLAIM_MANAGER_ADDRESS, CLAIM_MANAGER_ABI } from "@/constants";
import { getProtocolNameFromId } from "@/utils/protocolUtils";
import { formatUnits } from "viem";
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
        functionName: "getAllProcessedClaims",
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

  const claimDetailContracts = useMemo(() => {
    if (!allClaimIds || allClaimIds.length === 0) return [];

    return allClaimIds.map((claimId) => ({
      address: CLAIM_MANAGER_ADDRESS,
      abi: CLAIM_MANAGER_ABI,
      functionName: "getClaim",
      args: [claimId],
    }));
  }, [allClaimIds]);

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
        bigint, // 0: claimId
        string, // 1: protocolId
        bigint, // 2: maturityIndex
        bigint, // 3: hackAmount
        bigint, // 4: hackDate
        string, // 5: claimant
        bigint, // 6: submissionTime
        string, // 7: details
        string, // 8: attachmentURI
        number, // 9: status
        string, // 10: superadminNotes
        bigint, // 11: reviewTime
      ];
      const claimId = Number(allClaimIds[index]);
      const status = result[9];

      claims.push({
        claimId,
        protocolName: getProtocolNameFromId(result[1]),
        hackAmount: formatUnits(result[3] || 0n, 6), // Format as USDT (6 decimals)
        hackDate: Number(result[4]) || 0,
        submissionTime: Number(result[6]) || 0,
        details: result[7] || "",
        attachmentURI: result[8] || "",
        status,
        claimant: result[5] || "",
        superadminNotes: result[10] || "",
        reviewTime: Number(result[11]) || 0,
      });
    });

    return claims;
  }, [claimDetailsData, allClaimIds]);

  const refetch = async () => {
    await refetchAllClaimIds();
    await refetchClaimDetails();
  };

  return {
    claims: processedClaims,
    loading: allClaimIdsLoading || claimDetailsLoading,
    refetch,
  };
}
