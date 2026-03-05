import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import InsuranceListingCard from "@/components/InsuranceListingCard";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

/* eslint-disable @next/next/no-img-element */
// Mock next/image
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, width, height, ...rest } = props;
    return (
      <img
        src={src as string}
        alt={alt as string}
        width={width as number}
        height={height as number}
        {...rest}
      />
    );
  },
}));
/* eslint-enable @next/next/no-img-element */

// Mock useInsuranceMarketMetricsByMaturity hook
const mockMetricsData = vi.fn();
vi.mock("@/hooks/useTokenMinting", () => ({
  useInsuranceMarketMetricsByMaturity: (...args: unknown[]) =>
    mockMetricsData(...args),
}));

// Mock constants
vi.mock("@/constants", () => ({
  MATURITY_6M: 0,
  MATURITY_12M: 1,
}));

describe("InsuranceListingCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMetricsData.mockReturnValue({ data: undefined, isLoading: false });
  });

  it("renders the title and provider", () => {
    render(
      <InsuranceListingCard
        title="SushiSwap (6M)"
        provider="TakoFi Protocol"
        protocol="defi"
      />,
    );

    expect(screen.getByText("SushiSwap (6M)")).toBeInTheDocument();
    expect(screen.getByText("TakoFi Protocol")).toBeInTheDocument();
  });

  it("shows 'New' chip when isNew is true", () => {
    render(
      <InsuranceListingCard
        title="Aave (6M)"
        provider="TakoFi Protocol"
        isNew={true}
        protocol="lending"
      />,
    );

    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("does not show 'New' chip when isNew is false", () => {
    render(
      <InsuranceListingCard
        title="Aave (6M)"
        provider="TakoFi Protocol"
        isNew={false}
        protocol="lending"
      />,
    );

    expect(screen.queryByText("New")).not.toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockMetricsData.mockReturnValue({ data: undefined, isLoading: true });

    render(
      <InsuranceListingCard
        title="SushiSwap (6M)"
        provider="TakoFi Protocol"
        protocol="defi"
      />,
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.getByText("...")).toBeInTheDocument();
  });

  it("displays formatted metrics when data is loaded", () => {
    // 1000 USDC capacity, 5000 USDC TVL, 389 bp = 3.89%, 0.5 IT price
    mockMetricsData.mockReturnValue({
      data: [
        BigInt(1000 * 1e6),
        BigInt(5000 * 1e6),
        BigInt(389),
        BigInt("500000000000000000"),
      ],
      isLoading: false,
    });

    render(
      <InsuranceListingCard
        title="SushiSwap (6M)"
        provider="TakoFi Protocol"
        protocol="defi"
      />,
    );

    expect(screen.getByText("3.89%")).toBeInTheDocument();
    expect(screen.getByText("5.0k USD")).toBeInTheDocument();
  });

  it("displays 0.00% and 0.0 USD when metrics are undefined", () => {
    mockMetricsData.mockReturnValue({ data: undefined, isLoading: false });

    render(
      <InsuranceListingCard
        title="SushiSwap (6M)"
        provider="TakoFi Protocol"
        protocol="defi"
      />,
    );

    expect(screen.getByText("0.00%")).toBeInTheDocument();
    expect(screen.getByText("0.0 USD")).toBeInTheDocument();
  });

  it("navigates to insurance market page on click (6M)", () => {
    render(
      <InsuranceListingCard
        title="SushiSwap (6M)"
        provider="TakoFi Protocol"
        protocol="defi"
      />,
    );

    // Click the card
    fireEvent.click(screen.getByText("SushiSwap (6M)"));

    expect(mockPush).toHaveBeenCalledWith("/insurance-market/sushiswap-6m");
  });

  it("navigates to insurance market page on click (12M)", () => {
    render(
      <InsuranceListingCard
        title="SushiSwap (12M)"
        provider="TakoFi Protocol"
        protocol="defi"
      />,
    );

    fireEvent.click(screen.getByText("SushiSwap (12M)"));

    expect(mockPush).toHaveBeenCalledWith("/insurance-market/sushiswap-12m");
  });

  it("handles protocol names with spaces in URL", () => {
    render(
      <InsuranceListingCard
        title="Curve Finance (6M)"
        provider="TakoFi Protocol"
        protocol="defi"
      />,
    );

    fireEvent.click(screen.getByText("Curve Finance (6M)"));

    expect(mockPush).toHaveBeenCalledWith("/insurance-market/curve-finance-6m");
  });

  it("handles Uniswap V3 protocol name in URL", () => {
    render(
      <InsuranceListingCard
        title="Uniswap V3 (6M)"
        provider="TakoFi Protocol"
        protocol="exchange"
      />,
    );

    fireEvent.click(screen.getByText("Uniswap V3 (6M)"));

    expect(mockPush).toHaveBeenCalledWith("/insurance-market/uniswap-v3-6m");
  });

  it("renders protocol logo with correct src", () => {
    render(
      <InsuranceListingCard
        title="Aave (6M)"
        provider="TakoFi Protocol"
        protocol="lending"
      />,
    );

    const img = screen.getByAltText("Aave (6M) logo");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/protocols/aave.png");
  });

  it("passes correct maturity index to hook (6M)", () => {
    render(
      <InsuranceListingCard
        title="Aave (6M)"
        provider="TakoFi Protocol"
        protocol="lending"
      />,
    );

    // Should call with base protocol name "Aave" and maturityIndex 0 (MATURITY_6M)
    expect(mockMetricsData).toHaveBeenCalledWith("Aave", 0);
  });

  it("passes correct maturity index to hook (12M)", () => {
    render(
      <InsuranceListingCard
        title="Aave (12M)"
        provider="TakoFi Protocol"
        protocol="lending"
      />,
    );

    // Should call with base protocol name "Aave" and maturityIndex 1 (MATURITY_12M)
    expect(mockMetricsData).toHaveBeenCalledWith("Aave", 1);
  });
});
