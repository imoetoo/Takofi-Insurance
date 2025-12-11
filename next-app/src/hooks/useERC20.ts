"use client";

import { useWriteContract, useReadContract } from "wagmi";
import { parseUnits } from "viem";
import { ERC20_ABI, STABLECOIN_DECIMALS } from "@/constants";

export function useERC20Approval(tokenAddress: string, spenderAddress: string) {
  const {
    writeContractAsync,
    isPending,
    error,
    data: hash,
  } = useWriteContract();

  const approve = async (amount: string) => {
    const amountInWei = parseUnits(amount, STABLECOIN_DECIMALS);

    return writeContractAsync({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spenderAddress as `0x${string}`, amountInWei],
    });
  };

  const approveMax = async () => {
    try {
      // Approve maximum amount
      const maxAmount = BigInt(
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
      );

      return await writeContractAsync({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [spenderAddress as `0x${string}`, maxAmount],
      });
    } catch (err) {
      console.error("Max approval failed:", err);
      throw err;
    }
  };

  return {
    approve,
    approveMax,
    isPending,
    error,
    hash,
  };
}

// Hook for checking allowance
export function useERC20Allowance(
  tokenAddress: string,
  ownerAddress: string | undefined,
  spenderAddress: string
) {
  return useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [ownerAddress as `0x${string}`, spenderAddress as `0x${string}`],
    query: {
      enabled: !!ownerAddress,
    },
  });
}

// Hook for checking token balance
export function useERC20Balance(
  tokenAddress: string,
  userAddress: string | undefined
) {
  return useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [userAddress as `0x${string}`],
    query: {
      enabled: !!userAddress,
    },
  });
}

// Combined hook for balance, allowance, and approval
export function useERC20(
  tokenAddress: `0x${string}` | undefined,
  ownerAddress: `0x${string}` | undefined,
  spenderAddress: `0x${string}` | undefined
) {
  const { writeContractAsync } = useWriteContract();

  // Get balance
  const { data: balance = BigInt(0), refetch: refetchBalance } =
    useReadContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: ownerAddress ? [ownerAddress] : undefined,
      query: { enabled: !!tokenAddress && !!ownerAddress },
    });

  // Get allowance
  const { data: allowance = BigInt(0), refetch: refetchAllowance } =
    useReadContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "allowance",
      args:
        ownerAddress && spenderAddress
          ? [ownerAddress, spenderAddress]
          : undefined,
      query: { enabled: !!tokenAddress && !!ownerAddress && !!spenderAddress },
    });

  // Approve tokens
  const approve = async (amount: bigint) => {
    if (!tokenAddress || !spenderAddress) {
      throw new Error("Token address or spender address not set");
    }

    const hash = await writeContractAsync({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spenderAddress, amount],
    });

    return hash;
  };

  return {
    balance,
    allowance,
    approve,
    isLoading: false,
    refetch: () => {
      refetchBalance();
      refetchAllowance();
    },
  };
}
