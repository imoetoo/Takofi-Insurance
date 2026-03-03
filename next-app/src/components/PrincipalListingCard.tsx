"use client";
import { Card, CardContent, Typography, Box, Chip } from "@mui/material";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useInsuranceMarketMetricsByMaturity } from "@/hooks/useTokenMinting";
import { useDex } from "@/hooks/useDex";
import {
  parseInsuranceMetrics,
  formatCapacityDisplay,
} from "@/utils/insuranceCalculations";
import {
  MATURITY_6M,
  MATURITY_12M,
  DEX_CONTRACT_ADDRESS,
  USDT_ADDRESS,
  PROTOCOL_TOKENS,
} from "@/constants";

interface PrincipalListingCardProps {
  title: string;
  provider: string;
  isNew?: boolean;
  protocol: "defi" | "lending" | "exchange" | "other";
}

const getProtocolColor = (protocol: string) => {
  switch (protocol) {
    case "defi":
      return "#14b8a6"; // Teal
    case "lending":
      return "#3b82f6"; // Blue
    case "exchange":
      return "#f59e0b"; // Amber
    default:
      return "#14b8a6"; // Teal default
  }
};

const getProtocolLogo = (title: string): string => {
  const logoMap: { [key: string]: string } = {
    SushiSwap: "/protocols/sushiswap.png",
    "Curve Finance": "/protocols/Curve.png",
    Aave: "/protocols/aave.png",
    "Uniswap V3": "/protocols/uniswap.png",
    Compound: "/protocols/compound.png",
    PancakeSwap: "/protocols/pancakeswap.png",
  };
  // Remove maturity suffix (6M or 12M) from title to get base protocol name
  const protocolName = title.replace(/\s*\((?:6M|12M)\)\s*$/, "");
  return logoMap[protocolName] || "/protocols/sushiswap.png";
};

// Convert protocol title to URL-friendly key for PROTOCOL_TOKENS lookup
const getProtocolKey = (baseTitle: string): string => {
  return baseTitle
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
};

export default function PrincipalListingCard({
  title,
  provider,
  isNew = false,
  protocol,
}: PrincipalListingCardProps) {
  const router = useRouter();

  // Extract base protocol name and maturity variant
  const baseTitle = title.replace(/\s*\((?:6M|12M)\)\s*$/, "");
  const maturityMatch = title.match(/\((6M|12M)\)/);
  const maturity = maturityMatch ? maturityMatch[1] : "6M";
  const maturityIndex = maturity === "6M" ? MATURITY_6M : MATURITY_12M;

  // Fetch maturity-specific insurance market metrics (TVL is the same for PT and IT)
  const { data: metrics, isLoading: isMetricsLoading } =
    useInsuranceMarketMetricsByMaturity(baseTitle, maturityIndex);

  // Parse metrics for TVL
  const { availableCapacity, totalValueLocked } = metrics
    ? parseInsuranceMetrics(metrics)
    : { availableCapacity: 0, totalValueLocked: 0 };

  // Get principal token address to fetch order book price
  const protocolKey = getProtocolKey(baseTitle);
  const principalTokenAddress =
    PROTOCOL_TOKENS[protocolKey as keyof typeof PROTOCOL_TOKENS]
      ?.principalToken;

  // Use DEX hook to get best sell price (lowest ask = lowest price in order book)
  const { bestBuyPrice } = useDex({
    dexAddress: DEX_CONTRACT_ADDRESS,
    baseToken: principalTokenAddress || ("0x0" as `0x${string}`),
    quoteToken: USDT_ADDRESS,
    maturityIndex: maturityIndex,
  });

  // Format the lowest price display
  const formatLowestPrice = (): string => {
    // bestBuyPrice from useDex is the best sell price (lowest ask for buyers)
    // Actually bestSellPrice in useDex is best bid; bestBuyPrice is best ask
    // Let's check: useDex returns bestBuyPrice from getBestPrice(action=1) = SELL orders = best ask
    // So bestBuyPrice is the lowest sell order price = what we want
    const priceVal = parseFloat(bestBuyPrice);
    if (priceVal > 0) {
      return `${priceVal.toFixed(4)} USDT`;
    }
    return "No orders";
  };

  const handleClick = () => {
    const protocolName = baseTitle
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    const maturitySuffix = maturity === "12M" ? "-12m" : "-6m";
    router.push(`/principal-market/${protocolName}${maturitySuffix}`);
  };

  return (
    <Card
      onClick={handleClick}
      sx={{
        backgroundColor: "transparent",
        border: "1px solid #374151",
        "&:hover": {
          backgroundColor: "#1f2937",
          transform: "translateY(-2px)",
          transition: "all 0.3s ease",
          boxShadow: `0 8px 25px ${getProtocolColor(protocol)}15`,
        },
        cursor: "pointer",
        transition: "all 0.3s ease",
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          "&:last-child": { pb: 2 },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "background.paper",
              border: "2px solid",
              borderColor: "divider",
            }}
          >
            <Image
              src={getProtocolLogo(title)}
              alt={`${title} logo`}
              width={40}
              height={40}
              style={{ objectFit: "contain" }}
            />
          </Box>
          <Box>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: "text.primary",
                }}
              >
                {title}
              </Typography>
              {isNew && (
                <Chip
                  label="New"
                  size="small"
                  sx={{
                    backgroundColor: "#d1fae5",
                    color: "#065f46",
                    fontSize: "0.75rem",
                    height: 20,
                  }}
                />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              {provider}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ textAlign: "right" }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: "bold",
              color: "text.primary",
              mb: 0.5,
            }}
          >
            {isMetricsLoading ? "Loading..." : formatLowestPrice()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isMetricsLoading
              ? "..."
              : formatCapacityDisplay(availableCapacity, totalValueLocked)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
