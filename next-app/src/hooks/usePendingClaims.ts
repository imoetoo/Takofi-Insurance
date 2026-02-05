import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { keccak256, toHex } from "viem";
import {
  CLAIM_MANAGER_ADDRESS,
  CLAIM_MANAGER_ABI,
  PROTOCOLS,
} from "@/constants";

export interface PendingClaim {
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

export function usePendingClaims() {
  const {
    data: pendingIdsData,
    isLoading: pendingIdsLoading,
    refetch: refetchPendingIds,
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

  const pendingIds = useMemo(() => {
    if (
      !pendingIdsData ||
      !pendingIdsData[0] ||
      pendingIdsData[0].status !== "success"
    ) {
      return [];
    }
    const result = pendingIdsData[0].result;
    if (!result || !Array.isArray(result)) {
      return [];
    }
    return result as bigint[];
  }, [pendingIdsData]);

  const pendingDetailContracts = useMemo(() => {
    if (!pendingIds || pendingIds.length === 0) return [];

    return pendingIds.map((claimId) => ({
      address: CLAIM_MANAGER_ADDRESS,
      abi: CLAIM_MANAGER_ABI,
      functionName: "getClaim",
      args: [claimId],
    }));
  }, [pendingIds]);

  const {
    data: pendingDetailsData,
    isLoading: pendingDetailsLoading,
    refetch: refetchPendingDetails,
  } = useReadContracts({
    contracts: pendingDetailContracts,
    query: {
      enabled: pendingDetailContracts.length > 0,
    },
  });

  const claims = useMemo(() => {
    if (!pendingDetailsData || !pendingIds || pendingIds.length === 0) {
      return [];
    }

    return pendingDetailsData
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
          hackAmount: (Number(hackAmount) / 1e6).toFixed(2),
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
      .filter((claim): claim is PendingClaim => claim !== null);
  }, [pendingDetailsData, pendingIds]);

  const refetch = async () => {
    await refetchPendingIds();
    await refetchPendingDetails();
  };

  return {
    claims,
    loading: pendingIdsLoading || pendingDetailsLoading,
    error: null,
    refetch,
  };
}
