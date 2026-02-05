import { useState, useEffect, useMemo } from "react";
import { useReadContracts } from "wagmi";
import { formatEther, keccak256, toHex } from "viem";
import {
  PROTOCOLS,
  TOKEN_MINTING_CONTRACT_ADDRESS,
  TOKEN_MINTING_ABI,
} from "@/constants";

interface ProtocolBalance {
  name: string;
  balance: string;
  maturityIndex: number;
  maturityLabel: string;
  expiryTime: bigint;
  isExpired: boolean;
}

interface MaturityBucket {
  expiryTime: bigint;
  label: string;
  isActive: boolean;
  isSettled: boolean;
  breachOccurred: boolean;
  totalITPayout: bigint;
}

// interface SelectedMaturity {
//   index: number;
//   label: string;
//   expiryTime: bigint;
//   balance: string;
//   isExpired: boolean;
// }

export function useProtocolITBalances(address: `0x${string}` | undefined) {
  const [protocolBalances, setProtocolBalances] = useState<ProtocolBalance[]>(
    [],
  );

  // Build contract calls for all protocols - memoized to prevent hydration issues
  const contracts = useMemo(() => {
    if (!address) return [];

    return PROTOCOLS.flatMap((protocolName) => {
      const protocolId = keccak256(toHex(protocolName));

      return [
        {
          address: TOKEN_MINTING_CONTRACT_ADDRESS,
          abi: TOKEN_MINTING_ABI,
          functionName: "getMaturity",
          args: [protocolId, 0],
        },
        {
          address: TOKEN_MINTING_CONTRACT_ADDRESS,
          abi: TOKEN_MINTING_ABI,
          functionName: "getMaturity",
          args: [protocolId, 1],
        },
        {
          address: TOKEN_MINTING_CONTRACT_ADDRESS,
          abi: TOKEN_MINTING_ABI,
          functionName: "getUserITByMaturity",
          args: [address, protocolId, 0],
        },
        {
          address: TOKEN_MINTING_CONTRACT_ADDRESS,
          abi: TOKEN_MINTING_ABI,
          functionName: "getUserITByMaturity",
          args: [address, protocolId, 1],
        },
      ];
    });
  }, [address]);

  const { data, isLoading, error } = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0 && !!address, // Only run when address is available
    },
  });

  useEffect(() => {
    if (!data || !address || isLoading) {
      setProtocolBalances([]);
      return;
    }

    const balances: ProtocolBalance[] = [];
    const now = BigInt(Math.floor(Date.now() / 1000));

    // Process results (4 calls per protocol)
    for (let i = 0; i < PROTOCOLS.length; i++) {
      const baseIndex = i * 4;
      const protocolName = PROTOCOLS[i];

      try {
        const mat6MData = data[baseIndex];
        const mat12MData = data[baseIndex + 1];
        const bal6MData = data[baseIndex + 2];
        const bal12MData = data[baseIndex + 3];

        // Check for errors in individual reads
        if (
          mat6MData?.error ||
          mat12MData?.error ||
          bal6MData?.error ||
          bal12MData?.error
        ) {
          console.warn(`Error reading data for ${protocolName}:`, {
            mat6M: mat6MData?.error?.message,
            mat12M: mat12MData?.error?.message,
            bal6M: bal6MData?.error?.message,
            bal12M: bal12MData?.error?.message,
          });
          continue; // Skip this protocol if there's an error
        }

        const maturity6M = mat6MData?.result as MaturityBucket | undefined;
        const maturity12M = mat12MData?.result as MaturityBucket | undefined;
        const balance6M = bal6MData?.result as bigint | undefined;
        const balance12M = bal12MData?.result as bigint | undefined;

        // Combine both 6M and 12M balances
        const combined6M = balance6M || 0n;
        const combined12M = balance12M || 0n;
        const totalBalance = combined6M + combined12M;

        console.debug(
          `${protocolName}: 6M=${combined6M}, 12M=${combined12M}, Total=${totalBalance}`,
        );

        // Only add if user has any IT balance
        if (totalBalance > 0n && (maturity6M || maturity12M)) {
          // Determine which maturity to use for expiry time (prefer non-expired)
          let selectedMaturity = maturity6M;
          if (
            !maturity6M ||
            (maturity12M &&
              now >= maturity6M.expiryTime &&
              now < maturity12M.expiryTime)
          ) {
            selectedMaturity = maturity12M;
          }

          balances.push({
            name: protocolName,
            balance: formatEther(totalBalance), // Combined balance
            maturityIndex: 0, // Not used anymore since we combine both
            maturityLabel: "", // Removed - no longer showing maturity label
            expiryTime: selectedMaturity?.expiryTime || 0n,
            isExpired: selectedMaturity
              ? now >= selectedMaturity.expiryTime
              : true,
          });
        }
      } catch (e) {
        console.error(`Error processing protocol ${protocolName}:`, e);
      }
    }

    setProtocolBalances(balances);
  }, [data, address, isLoading]);

  return { protocolBalances, loading: isLoading, error };
}
