import { keccak256, toBytes } from "viem";

/**
 * Converts a protocol name to its bytes32 ID (keccak256 hash)
 * @param protocolName - The name of the protocol (e.g., "SushiSwap", "Aave")
 * @returns The bytes32 ID as a hex string
 */
export function getProtocolId(protocolName: string): `0x${string}` {
  return keccak256(toBytes(protocolName));
}

/**
 * List of supported protocol names
 */
export const SUPPORTED_PROTOCOLS = [
  "SushiSwap",
  "Curve Finance",
  "Aave",
  "Uniswap V3",
  "Compound",
  "PancakeSwap",
] as const;

export type ProtocolName = (typeof SUPPORTED_PROTOCOLS)[number];
