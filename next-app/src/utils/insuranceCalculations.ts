import { formatUnits } from "viem";

/**
 * Format large numbers into readable format with k/m suffixes
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string like "3.3k" or "13.5m"
 */
export function formatCapacity(value: number, decimals: number = 1): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(decimals)}m`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(decimals)}k`;
  }
  return value.toFixed(decimals);
}

/**
 * Parse insurance market metrics from contract data
 * @param metrics - Raw metrics data from smart contract
 * @returns Parsed metrics with properly formatted values
 */
export function parseInsuranceMetrics(
  metrics: readonly [bigint, bigint, bigint, bigint] | undefined
) {
  if (!metrics) {
    return {
      availableCapacity: 0,
      totalValueLocked: 0,
      annualFeePercentage: 0,
      itPrice: 0,
    };
  }

  // metrics[0] = availableCapacity (6 decimals)
  // metrics[1] = totalValueLocked (6 decimals)
  // metrics[2] = annualFeePercentage (basis points: 389 = 3.89%)
  // metrics[3] = itPrice (18 decimals - PRICE_PRECISION)

  return {
    availableCapacity: Number(formatUnits(metrics[0], 6)),
    totalValueLocked: Number(formatUnits(metrics[1], 6)),
    annualFeePercentage: Number(metrics[2]) / 100, // Convert basis points to percentage
    itPrice: Number(formatUnits(metrics[3], 18)),
  };
}

/**
 * Format annual fee percentage for display
 * @param feePercentage - Fee as a percentage (e.g., 3.89)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string like "3.89%"
 */
export function formatAnnualFee(
  feePercentage: number,
  decimals: number = 2
): string {
  return `${feePercentage.toFixed(decimals)}%`;
}

/**
 * Format capacity display with USD value only
 * @param capacityUSDC - Available capacity in USDC (used as USD equivalent since USDC ≈ USD)
 * @param tvlUSD - Total value locked in USD
 * @returns Formatted string like "13.5m USD"
 */
export function formatCapacityDisplay(
  capacityUSDC: number,
  tvlUSD: number
): string {
  return `${formatCapacity(tvlUSD)} USD`;
}
