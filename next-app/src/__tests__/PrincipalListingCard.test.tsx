import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PrincipalListingCard from "@/components/PrincipalListingCard";

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

// Mock useDex hook
const mockUseDex = vi.fn();
vi.mock("@/hooks/useDex", () => ({
  useDex: (...args: unknown[]) => mockUseDex(...args),
}));

// Mock constants
vi.mock("@/constants", () => ({
  MATURITY_6M: 0,
  MATURITY_12M: 1,
  DEX_CONTRACT_ADDRESS: "0xDEXADDRESS",
  USDT_ADDRESS: "0xUSDTADDRESS",
  PROTOCOL_TOKENS: {
    sushiswap: {
      principalToken: "0xPT_SUSHI",
      insuranceToken: "0xIT_SUSHI",
    },
    "curve-finance": {
      principalToken: "0xPT_CURVE",
      insuranceToken: "0xIT_CURVE",
    },
    aave: {
      principalToken: "0xPT_AAVE",
      insuranceToken: "0xIT_AAVE",
    },
    "uniswap-v3": {
      principalToken: "0xPT_UNI",
      insuranceToken: "0xIT_UNI",
    },
    compound: {
      principalToken: "0xPT_COMP",
      insuranceToken: "0xIT_COMP",
    },
    pancakeswap: {
      principalToken: "0xPT_PANCAKE",
      insuranceToken: "0xIT_PANCAKE",
    },
  },
}));

describe("PrincipalListingCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMetricsData.mockReturnValue({ data: undefined, isLoading: false });
    mockUseDex.mockReturnValue({
      bestBuyPrice: "0",
      bestSellPrice: "0",
      orderBook: [],
      userOrders: [],
      isLoading: false,
    });
  });

  it("renders the title and provider", () => {
    render(
      <PrincipalListingCard
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
      <PrincipalListingCard
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
      <PrincipalListingCard
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
      <PrincipalListingCard
        title="SushiSwap (6M)"
        provider="TakoFi Protocol"
        protocol="defi"
      />,
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.getByText("...")).toBeInTheDocument();
  });

  it("shows 'No orders' when bestBuyPrice is 0", () => {
    mockUseDex.mockReturnValue({
      bestBuyPrice: "0",
      bestSellPrice: "0",
      orderBook: [],
      userOrders: [],
      isLoading: false,
    });

    render(
      <PrincipalListingCard
        title="SushiSwap (6M)"
        provider="TakoFi Protocol"
        protocol="defi"
      />,
    );

    expect(screen.getByText("No orders")).toBeInTheDocument();
  });

  it("displays formatted price when bestBuyPrice has a value", () => {
    mockUseDex.mockReturnValue({
      bestBuyPrice: "0.9500",
      bestSellPrice: "0",
      orderBook: [],
      userOrders: [],
      isLoading: false,
    });

    render(
      <PrincipalListingCard
        title="SushiSwap (6M)"
        provider="TakoFi Protocol"
        protocol="defi"
      />,
    );

    expect(screen.getByText("0.9500 USDT")).toBeInTheDocument();
  });

  it("displays TVL from metrics", () => {
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
      <PrincipalListingCard
        title="SushiSwap (6M)"
        provider="TakoFi Protocol"
        protocol="defi"
      />,
    );

    expect(screen.getByText("5.0k USD")).toBeInTheDocument();
  });

  it("navigates to principal market page on click (6M)", () => {
    render(
      <PrincipalListingCard
        title="SushiSwap (6M)"
        provider="TakoFi Protocol"
        protocol="defi"
      />,
    );

    fireEvent.click(screen.getByText("SushiSwap (6M)"));

    expect(mockPush).toHaveBeenCalledWith("/principal-market/sushiswap-6m");
  });

  it("navigates to principal market page on click (12M)", () => {
    render(
      <PrincipalListingCard
        title="SushiSwap (12M)"
        provider="TakoFi Protocol"
        protocol="defi"
      />,
    );

    fireEvent.click(screen.getByText("SushiSwap (12M)"));

    expect(mockPush).toHaveBeenCalledWith("/principal-market/sushiswap-12m");
  });

  it("handles protocol names with spaces in URL", () => {
    render(
      <PrincipalListingCard
        title="Curve Finance (6M)"
        provider="TakoFi Protocol"
        protocol="defi"
      />,
    );

    fireEvent.click(screen.getByText("Curve Finance (6M)"));

    expect(mockPush).toHaveBeenCalledWith("/principal-market/curve-finance-6m");
  });

  it("renders protocol logo with correct src", () => {
    render(
      <PrincipalListingCard
        title="Compound (6M)"
        provider="TakoFi Protocol"
        protocol="lending"
      />,
    );

    const img = screen.getByAltText("Compound (6M) logo");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/protocols/compound.png");
  });

  it("passes correct params to useDex hook", () => {
    render(
      <PrincipalListingCard
        title="SushiSwap (6M)"
        provider="TakoFi Protocol"
        protocol="defi"
      />,
    );

    expect(mockUseDex).toHaveBeenCalledWith({
      dexAddress: "0xDEXADDRESS",
      baseToken: "0xPT_SUSHI",
      quoteToken: "0xUSDTADDRESS",
      maturityIndex: 0,
    });
  });

  it("passes correct maturity index to hooks (12M)", () => {
    render(
      <PrincipalListingCard
        title="SushiSwap (12M)"
        provider="TakoFi Protocol"
        protocol="defi"
      />,
    );

    // Metrics hook should be called with maturityIndex 1
    expect(mockMetricsData).toHaveBeenCalledWith("SushiSwap", 1);

    // Dex hook should be called with maturityIndex 1
    expect(mockUseDex).toHaveBeenCalledWith(
      expect.objectContaining({ maturityIndex: 1 }),
    );
  });

  it("formats price with 4 decimal places", () => {
    mockUseDex.mockReturnValue({
      bestBuyPrice: "0.9",
      bestSellPrice: "0",
      orderBook: [],
      userOrders: [],
      isLoading: false,
    });

    render(
      <PrincipalListingCard
        title="Aave (6M)"
        provider="TakoFi Protocol"
        protocol="lending"
      />,
    );

    expect(screen.getByText("0.9000 USDT")).toBeInTheDocument();
  });
});
