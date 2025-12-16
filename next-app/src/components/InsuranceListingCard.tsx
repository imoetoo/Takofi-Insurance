"use client";
import { Card, CardContent, Typography, Box, Chip } from "@mui/material";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useInsuranceMarketMetrics } from "@/hooks/useTokenMinting";
import {
  parseInsuranceMetrics,
  formatAnnualFee,
  formatCapacityDisplay,
} from "@/utils/insuranceCalculations";

interface InsuranceListingCardProps {
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
  return logoMap[title] || "/protocols/sushiswap.png";
};

export default function InsuranceListingCard({
  title,
  provider,
  isNew = false,
  protocol,
}: InsuranceListingCardProps) {
  const router = useRouter();

  // Fetch real-time insurance market metrics
  const { data: metrics, isLoading } = useInsuranceMarketMetrics(title);

  // Parse metrics using utility function
  const { availableCapacity, totalValueLocked, annualFeePercentage } =
    parseInsuranceMetrics(metrics);

  const handleClick = () => {
    // Convert title to URL-friendly protocol name
    // makes all lower case, replaces all whitespaces with hyphens, removes special characters
    const protocolName = title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    router.push(`/insurance-market/${protocolName}`);
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
            {isLoading ? "Loading..." : formatAnnualFee(annualFeePercentage)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isLoading
              ? "..."
              : formatCapacityDisplay(availableCapacity, totalValueLocked)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
