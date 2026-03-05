import { describe, it, expect } from "vitest";
import {
  getProtocolId,
  getProtocolNameFromId,
  SUPPORTED_PROTOCOLS,
} from "@/utils/protocolUtils";

describe("protocolUtils", () => {
  describe("SUPPORTED_PROTOCOLS", () => {
    it("contains 6 protocols", () => {
      expect(SUPPORTED_PROTOCOLS).toHaveLength(6);
    });

    it("includes all required protocols", () => {
      expect(SUPPORTED_PROTOCOLS).toContain("SushiSwap");
      expect(SUPPORTED_PROTOCOLS).toContain("Curve Finance");
      expect(SUPPORTED_PROTOCOLS).toContain("Aave");
      expect(SUPPORTED_PROTOCOLS).toContain("Uniswap V3");
      expect(SUPPORTED_PROTOCOLS).toContain("Compound");
      expect(SUPPORTED_PROTOCOLS).toContain("PancakeSwap");
    });
  });

  describe("getProtocolId", () => {
    it("returns a bytes32 hex string", () => {
      const id = getProtocolId("SushiSwap");
      expect(id).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it("returns consistent hash for same input", () => {
      const id1 = getProtocolId("Aave");
      const id2 = getProtocolId("Aave");
      expect(id1).toBe(id2);
    });

    it("returns different hashes for different inputs", () => {
      const id1 = getProtocolId("Aave");
      const id2 = getProtocolId("Compound");
      expect(id1).not.toBe(id2);
    });

    it("is case-sensitive", () => {
      const id1 = getProtocolId("SushiSwap");
      const id2 = getProtocolId("sushiswap");
      expect(id1).not.toBe(id2);
    });

    it("handles spaces in protocol names", () => {
      const id = getProtocolId("Curve Finance");
      expect(id).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it("produces unique IDs for all supported protocols", () => {
      const ids = SUPPORTED_PROTOCOLS.map((name) => getProtocolId(name));
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(SUPPORTED_PROTOCOLS.length);
    });
  });

  describe("getProtocolNameFromId", () => {
    it("resolves SushiSwap from its hash", () => {
      const id = getProtocolId("SushiSwap");
      expect(getProtocolNameFromId(id)).toBe("SushiSwap");
    });

    it("resolves Curve Finance from its hash", () => {
      const id = getProtocolId("Curve Finance");
      expect(getProtocolNameFromId(id)).toBe("Curve Finance");
    });

    it("resolves Aave from its hash", () => {
      const id = getProtocolId("Aave");
      expect(getProtocolNameFromId(id)).toBe("Aave");
    });

    it("resolves Uniswap V3 from its hash", () => {
      const id = getProtocolId("Uniswap V3");
      expect(getProtocolNameFromId(id)).toBe("Uniswap V3");
    });

    it("resolves Compound from its hash", () => {
      const id = getProtocolId("Compound");
      expect(getProtocolNameFromId(id)).toBe("Compound");
    });

    it("resolves PancakeSwap from its hash", () => {
      const id = getProtocolId("PancakeSwap");
      expect(getProtocolNameFromId(id)).toBe("PancakeSwap");
    });

    it("returns 'Unknown' for unrecognized hash", () => {
      expect(
        getProtocolNameFromId(
          "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        ),
      ).toBe("Unknown");
    });

    it("is case-insensitive for lookup", () => {
      const id = getProtocolId("Aave");
      const upperCaseId = id.toUpperCase().replace("0X", "0x") as `0x${string}`;
      expect(getProtocolNameFromId(upperCaseId)).toBe("Aave");
    });

    it("resolves all supported protocols via round-trip", () => {
      for (const name of SUPPORTED_PROTOCOLS) {
        const id = getProtocolId(name);
        expect(getProtocolNameFromId(id)).toBe(name);
      }
    });
  });
});
