"use client";
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Stack,
  Skeleton,
  Chip,
  Button,
  Paper,
} from "@mui/material";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { useState, useEffect } from "react";
import Image from "next/image";
import * as commonStyles from "@/styles/commonStyles";
import { insuranceListings } from "@/app/insurance-market/insuranceListings";
import { PROTOCOL_TOKENS } from "@/constants";
import { useERC20Balance } from "@/hooks/useERC20";
import { SwapHoriz } from "@mui/icons-material";

interface UserInsuranceToken {
  protocol: string;
  title: string;
  balance: number;
  isNew?: boolean;
  iconPath: string;
  protocolType: "defi" | "lending" | "exchange" | "other";
}

const getProtocolColor = (
  protocol: string | "defi" | "lending" | "exchange" | "other" | undefined
) => {
  if (!protocol) return "#14b8a6";
  switch (protocol?.toLowerCase()) {
    case "defi":
      return "#14b8a6";
    case "lending":
      return "#3b82f6";
    case "exchange":
      return "#f59e0b";
    default:
      return "#14b8a6";
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

export default function MyInsuranceTokens() {
  const { address } = useAccount();
  const [userTokens, setUserTokens] = useState<UserInsuranceToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalValueCovered, setTotalValueCovered] = useState<number>(0);

  // Create a mapping of all insurance token addresses
  const insuranceTokenAddresses = insuranceListings.map((listing) => {
    const protocolKey = listing.title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    return {
      listing,
      tokenAddress:
        PROTOCOL_TOKENS[protocolKey as keyof typeof PROTOCOL_TOKENS]
          ?.insuranceToken,
    };
  });

  // Fetch balances for all tokens
  const balances = insuranceTokenAddresses.map(({ tokenAddress }) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useERC20Balance(tokenAddress, address)
  );

  // Process token balances and calculate total whenever balances update
  useEffect(() => {
    if (!address) {
      setIsLoading(false);
      return;
    }

    const tokens: UserInsuranceToken[] = [];
    let total = 0;

    insuranceTokenAddresses.forEach(({ listing }, index) => {
      const balanceResult = balances[index];
      if (balanceResult.data !== undefined && balanceResult.data !== null) {
        const balance = Number(formatUnits(balanceResult.data as bigint, 18));
        if (balance > 0) {
          tokens.push({
            protocol: listing.title,
            title: listing.title,
            balance,
            isNew: listing.isNew,
            iconPath: getProtocolLogo(listing.title),
            protocolType: listing.protocol,
          });
          total += balance;
        }
      }
    });

    setUserTokens(tokens);
    setTotalValueCovered(total);
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, balances]);

  const handleTradeToken = (protocol: string) => {
    const protocolName = protocol
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    // Navigate directly to the protocol's trading page
    window.location.href = `/insurance-market/${protocolName}`;
  };

  if (!address) {
    return (
      <Box sx={commonStyles.pageContainerStyles}>
        <Container maxWidth="lg">
          <Card sx={commonStyles.cardStyles}>
            <CardContent sx={{ p: 3, textAlign: "center" }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                Please connect your wallet to view your insurance tokens
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Connect your wallet to see your insurance token holdings and
                total coverage value.
              </Typography>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={commonStyles.pageContainerStyles}>
      <Container maxWidth="lg">
        <Box sx={commonStyles.headerSectionStyles}>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: "bold",
              color: "text.primary",
            }}
          >
            My Insurance Tokens
          </Typography>
        </Box>

        {/* Total Value Covered Card */}
        <Card
          sx={{
            ...commonStyles.cardStyles,
            mb: 4,
            background: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
            border: "1px solid #374151",
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={2}>
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", fontWeight: 500 }}
              >
                TOTAL VALUE COVERED
              </Typography>
              {isLoading ? (
                <Skeleton variant="text" width="300px" height={50} />
              ) : (
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: "bold",
                    color: "text.primary",
                    background:
                      "linear-gradient(135deg, #f97316 0%, #fbbf24 100%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {totalValueCovered.toFixed(2)} IT
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                This means up to {totalValueCovered > 0 ? `$${(totalValueCovered).toFixed(2)}` : "$0.00"} of USD is covered with your Insurance Tokens!
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        {/* Insurance Tokens Grid */}
        <Box sx={{ mb: 4 }}>
          {isLoading ? (
            <Stack spacing={3}>
              {[1, 2, 3].map((i) => (
                <Paper
                  key={i}
                  sx={{
                    ...commonStyles.cardStyles,
                    p: 3,
                    display: "flex",
                    gap: 2,
                  }}
                >
                  <Skeleton variant="circular" width={56} height={56} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" />
                    <Skeleton variant="text" width="60%" />
                  </Box>
                </Paper>
              ))}
            </Stack>
          ) : userTokens.length > 0 ? (
            <Stack spacing={3}>
              {userTokens.map((token, index) => (
                <Card
                  key={index}
                  sx={{
                    ...commonStyles.cardStyles,
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    transition: "all 0.3s ease",
                    "&:hover": {
                      backgroundColor: "#1f2937",
                      transform: "translateX(4px)",
                      boxShadow: `0 12px 24px ${getProtocolColor(
                        token.protocolType
                      )}20`,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#1f2937",
                      border: `2px solid ${getProtocolColor(
                        token.protocolType
                      )}`,
                      flexShrink: 0,
                      ml: 2,
                    }}
                  >
                    <Image
                      src={token.iconPath}
                      alt={token.title}
                      width={60}
                      height={60}
                      style={{ borderRadius: "50%" }}
                    />
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: "bold", color: "text.primary" }}
                      >
                        {token.title}
                      </Typography>
                      {token.isNew && (
                        <Chip
                          label="New"
                          size="small"
                          sx={{
                            backgroundColor: "#10b981",
                            color: "white",
                            fontSize: "0.75rem",
                            height: 20,
                          }}
                        />
                      )}
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      Balance:{" "}
                      <span style={{ color: "#f97316", fontWeight: 600 }}>
                        {token.balance.toFixed(2)} IT
                      </span>
                    </Typography>
                  </Box>

                  <Button
                    variant="outlined"
                    startIcon={<SwapHoriz />}
                    onClick={() => handleTradeToken(token.title)}
                    sx={{
                      borderColor: "#f97316",
                      color: "#f97316",
                      "&:hover": {
                        backgroundColor: "#f9731615",
                        borderColor: "#ea580c",
                      },
                      mr: 2,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Trade Token
                  </Button>
                </Card>
              ))}
            </Stack>
          ) : (
            <Card sx={commonStyles.cardStyles}>
              <CardContent sx={{ p: 4, textAlign: "center" }}>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  No Insurance Tokens Yet
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 3 }}
                >
                  You don&apos;t currently hold any insurance tokens. Browse the
                  insurance market to purchase coverage.
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => (window.location.href = "/insurance-market")}
                  sx={{
                    backgroundColor: "#f97316",
                    color: "white",
                    "&:hover": {
                      backgroundColor: "#ea580c",
                    },
                  }}
                >
                  Browse Insurance Market
                </Button>
              </CardContent>
            </Card>
          )}
        </Box>
      </Container>
    </Box>
  );
}
