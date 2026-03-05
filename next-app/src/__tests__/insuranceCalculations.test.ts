import { describe, it, expect } from "vitest";
import {
  formatCapacity,
  parseInsuranceMetrics,
  formatAnnualFee,
  formatCapacityDisplay,
} from "@/utils/insuranceCalculations";

describe("insuranceCalculations", () => {
  describe("formatCapacity", () => {
    it("formats millions with default decimals", () => {
      expect(formatCapacity(13500000)).toBe("13.5m");
    });

    it("formats millions with custom decimals", () => {
      expect(formatCapacity(13500000, 2)).toBe("13.50m");
    });

    it("formats exactly 1 million", () => {
      expect(formatCapacity(1000000)).toBe("1.0m");
    });

    it("formats thousands with default decimals", () => {
      expect(formatCapacity(3300)).toBe("3.3k");
    });

    it("formats thousands with custom decimals", () => {
      expect(formatCapacity(3300, 2)).toBe("3.30k");
    });

    it("formats exactly 1 thousand", () => {
      expect(formatCapacity(1000)).toBe("1.0k");
    });

    it("formats numbers below 1000", () => {
      expect(formatCapacity(500)).toBe("500.0");
    });

    it("formats zero", () => {
      expect(formatCapacity(0)).toBe("0.0");
    });

    it("formats small numbers with custom decimals", () => {
      expect(formatCapacity(42, 0)).toBe("42");
    });

    it("handles large millions", () => {
      expect(formatCapacity(100000000)).toBe("100.0m");
    });
  });

  describe("parseInsuranceMetrics", () => {
    it("returns zeros when metrics is undefined", () => {
      const result = parseInsuranceMetrics(undefined);
      expect(result).toEqual({
        availableCapacity: 0,
        totalValueLocked: 0,
        annualFeePercentage: 0,
        itPrice: 0,
      });
    });

    it("parses valid metrics correctly", () => {
      // availableCapacity: 1000 USDC (1000 * 10^6)
      // totalValueLocked: 5000 USDC (5000 * 10^6)
      // annualFeePercentage: 389 basis points = 3.89%
      // itPrice: 0.5 (0.5 * 10^18)
      const metrics: readonly [bigint, bigint, bigint, bigint] = [
        BigInt(1000 * 1e6),
        BigInt(5000 * 1e6),
        BigInt(389),
        BigInt("500000000000000000"), // 0.5 * 10^18
      ];

      const result = parseInsuranceMetrics(metrics);
      expect(result.availableCapacity).toBe(1000);
      expect(result.totalValueLocked).toBe(5000);
      expect(result.annualFeePercentage).toBe(3.89);
      expect(result.itPrice).toBe(0.5);
    });

    it("handles zero metrics", () => {
      const metrics: readonly [bigint, bigint, bigint, bigint] = [
        BigInt(0),
        BigInt(0),
        BigInt(0),
        BigInt(0),
      ];

      const result = parseInsuranceMetrics(metrics);
      expect(result.availableCapacity).toBe(0);
      expect(result.totalValueLocked).toBe(0);
      expect(result.annualFeePercentage).toBe(0);
      expect(result.itPrice).toBe(0);
    });

    it("handles large values", () => {
      const metrics: readonly [bigint, bigint, bigint, bigint] = [
        BigInt(50000000 * 1e6), // 50M USDC
        BigInt(100000000 * 1e6), // 100M USDC
        BigInt(1500), // 15%
        BigInt("1000000000000000000"), // 1.0 * 10^18
      ];

      const result = parseInsuranceMetrics(metrics);
      expect(result.availableCapacity).toBe(50000000);
      expect(result.totalValueLocked).toBe(100000000);
      expect(result.annualFeePercentage).toBe(15);
      expect(result.itPrice).toBe(1);
    });
  });

  describe("formatAnnualFee", () => {
    it("formats fee with default 2 decimals", () => {
      expect(formatAnnualFee(3.89)).toBe("3.89%");
    });

    it("formats fee with custom decimals", () => {
      expect(formatAnnualFee(3.89123, 3)).toBe("3.891%");
    });

    it("formats zero fee", () => {
      expect(formatAnnualFee(0)).toBe("0.00%");
    });

    it("formats whole number fee", () => {
      expect(formatAnnualFee(5)).toBe("5.00%");
    });

    it("formats fee with 0 decimals", () => {
      expect(formatAnnualFee(3.89, 0)).toBe("4%");
    });

    it("formats very small fee", () => {
      expect(formatAnnualFee(0.01)).toBe("0.01%");
    });
  });

  describe("formatCapacityDisplay", () => {
    it("formats capacity display with TVL value", () => {
      // formatCapacityDisplay uses tvlUSD, not capacityUSDC
      const result = formatCapacityDisplay(1000, 13500000);
      expect(result).toBe("13.5m USD");
    });

    it("formats capacity display with thousands", () => {
      const result = formatCapacityDisplay(500, 3300);
      expect(result).toBe("3.3k USD");
    });

    it("formats zero TVL", () => {
      const result = formatCapacityDisplay(1000, 0);
      expect(result).toBe("0.0 USD");
    });

    it("formats small TVL", () => {
      const result = formatCapacityDisplay(100, 500);
      expect(result).toBe("500.0 USD");
    });
  });
});
