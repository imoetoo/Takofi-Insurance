"use client";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  Chip,
} from "@mui/material";
import {
  Star,
  Security,
  TrendingUp,
  AccountBalance,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";

interface InsuranceListingCardProps {
  title: string;
  provider: string;
  minRate: string;
  maxRate: string;
  capacity: string;
  capacityUSD: string;
  isNew?: boolean;
  protocol: "defi" | "lending" | "exchange" | "other";
}

const getProtocolIcon = (protocol: string) => {
  switch (protocol) {
    case "defi":
      return <TrendingUp />;
    case "lending":
      return <AccountBalance />;
    case "exchange":
      return <Star />;
    default:
      return <Security />;
  }
};

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

export default function InsuranceListingCard({
  title,
  provider,
  minRate,
  maxRate,
  capacity,
  capacityUSD,
  isNew = false,
  protocol,
}: InsuranceListingCardProps) {
  const router = useRouter();

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
          <Avatar
            sx={{
              bgcolor: getProtocolColor(protocol),
              width: 48,
              height: 48,
            }}
          >
            {getProtocolIcon(protocol)}
          </Avatar>
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
            {minRate}%{" "}
            <Typography component="span" sx={{ color: "text.secondary" }}>
              ←→
            </Typography>{" "}
            {maxRate}%
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {capacity} ETH / {capacityUSD}m USD
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
