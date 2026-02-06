"use client";

import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { CheckCircle, AccessTime } from "@mui/icons-material";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import Image from "next/image";
import * as commonStyles from "@/styles/commonStyles";
import {
  useUserPTByMaturity,
  useMaturitySettlement,
  useRedeemPrincipalTokens,
  useIsMaturityExpired,
} from "@/hooks/useTokenMinting";
import { useImpairmentFactor } from "@/hooks/useImpairmentFactor";
import { MATURITY_6M, MATURITY_12M } from "@/constants";

interface RedeemableToken {
  protocol: string;
  maturity: string;
  maturityIndex: number;
  ptBalance: bigint;
  isSettled: boolean;
  breachOccurred: boolean;
  expiryTime: bigint;
  totalITPayout: bigint;
  impairmentFactor: bigint;
  iconPath: string;
}

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

export default function RedeemPrincipalPage() {
  const { address, isConnected } = useAccount();
  const [redeemableTokens, setRedeemableTokens] = useState<RedeemableToken[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStablecoin, setSelectedStablecoin] = useState<"USDT" | "USDC">(
    "USDT",
  );
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingTokenKey, setPendingTokenKey] = useState<string | null>(null);

  const { redeemPT, isPending } = useRedeemPrincipalTokens();

  // Call ALL hooks at top level (React Rules of Hooks requirement)
  // SushiSwap
  const sushiswap6MPT = useUserPTByMaturity(address, "SushiSwap", MATURITY_6M);
  const sushiswap6MSettlement = useMaturitySettlement("SushiSwap", MATURITY_6M);
  const sushiswap6MExpired = useIsMaturityExpired("SushiSwap", MATURITY_6M);
  const sushiswap12MPT = useUserPTByMaturity(
    address,
    "SushiSwap",
    MATURITY_12M,
  );
  const sushiswap12MSettlement = useMaturitySettlement(
    "SushiSwap",
    MATURITY_12M,
  );
  const sushiswap12MExpired = useIsMaturityExpired("SushiSwap", MATURITY_12M);

  // Curve Finance
  const curve6MPT = useUserPTByMaturity(address, "Curve Finance", MATURITY_6M);
  const curve6MSettlement = useMaturitySettlement("Curve Finance", MATURITY_6M);
  const curve6MExpired = useIsMaturityExpired("Curve Finance", MATURITY_6M);
  const curve12MPT = useUserPTByMaturity(
    address,
    "Curve Finance",
    MATURITY_12M,
  );
  const curve12MSettlement = useMaturitySettlement(
    "Curve Finance",
    MATURITY_12M,
  );
  const curve12MExpired = useIsMaturityExpired("Curve Finance", MATURITY_12M);

  // Aave
  const aave6MPT = useUserPTByMaturity(address, "Aave", MATURITY_6M);
  const aave6MSettlement = useMaturitySettlement("Aave", MATURITY_6M);
  const aave6MExpired = useIsMaturityExpired("Aave", MATURITY_6M);
  const aave12MPT = useUserPTByMaturity(address, "Aave", MATURITY_12M);
  const aave12MSettlement = useMaturitySettlement("Aave", MATURITY_12M);
  const aave12MExpired = useIsMaturityExpired("Aave", MATURITY_12M);

  // Uniswap V3
  const uniswap6MPT = useUserPTByMaturity(address, "Uniswap V3", MATURITY_6M);
  const uniswap6MSettlement = useMaturitySettlement("Uniswap V3", MATURITY_6M);
  const uniswap6MExpired = useIsMaturityExpired("Uniswap V3", MATURITY_6M);
  const uniswap12MPT = useUserPTByMaturity(address, "Uniswap V3", MATURITY_12M);
  const uniswap12MSettlement = useMaturitySettlement(
    "Uniswap V3",
    MATURITY_12M,
  );
  const uniswap12MExpired = useIsMaturityExpired("Uniswap V3", MATURITY_12M);

  // Compound
  const compound6MPT = useUserPTByMaturity(address, "Compound", MATURITY_6M);
  const compound6MSettlement = useMaturitySettlement("Compound", MATURITY_6M);
  const compound6MExpired = useIsMaturityExpired("Compound", MATURITY_6M);
  const compound12MPT = useUserPTByMaturity(address, "Compound", MATURITY_12M);
  const compound12MSettlement = useMaturitySettlement("Compound", MATURITY_12M);
  const compound12MExpired = useIsMaturityExpired("Compound", MATURITY_12M);

  // PancakeSwap
  const pancakeswap6MPT = useUserPTByMaturity(
    address,
    "PancakeSwap",
    MATURITY_6M,
  );
  const pancakeswap6MSettlement = useMaturitySettlement(
    "PancakeSwap",
    MATURITY_6M,
  );
  const pancakeswap6MExpired = useIsMaturityExpired("PancakeSwap", MATURITY_6M);
  const pancakeswap12MPT = useUserPTByMaturity(
    address,
    "PancakeSwap",
    MATURITY_12M,
  );
  const pancakeswap12MSettlement = useMaturitySettlement(
    "PancakeSwap",
    MATURITY_12M,
  );
  const pancakeswap12MExpired = useIsMaturityExpired(
    "PancakeSwap",
    MATURITY_12M,
  );

  // Impairment factors
  const sushiswap6MImpairment = useImpairmentFactor("SushiSwap", MATURITY_6M);
  const sushiswap12MImpairment = useImpairmentFactor("SushiSwap", MATURITY_12M);
  const curve6MImpairment = useImpairmentFactor("Curve Finance", MATURITY_6M);
  const curve12MImpairment = useImpairmentFactor("Curve Finance", MATURITY_12M);
  const aave6MImpairment = useImpairmentFactor("Aave", MATURITY_6M);
  const aave12MImpairment = useImpairmentFactor("Aave", MATURITY_12M);
  const uniswap6MImpairment = useImpairmentFactor("Uniswap V3", MATURITY_6M);
  const uniswap12MImpairment = useImpairmentFactor("Uniswap V3", MATURITY_12M);
  const compound6MImpairment = useImpairmentFactor("Compound", MATURITY_6M);
  const compound12MImpairment = useImpairmentFactor("Compound", MATURITY_12M);
  const pancakeswap6MImpairment = useImpairmentFactor(
    "PancakeSwap",
    MATURITY_6M,
  );
  const pancakeswap12MImpairment = useImpairmentFactor(
    "PancakeSwap",
    MATURITY_12M,
  );

  // Process token data
  useEffect(() => {
    if (!address) {
      setRedeemableTokens([]);
      setIsLoading(false);
      return;
    }

    // Organize hook results into structured data (inside useEffect to avoid recreation on every render)
    const tokenData = [
      {
        protocol: "SushiSwap",
        maturity: "6M",
        maturityIndex: MATURITY_6M,
        ptBalance: sushiswap6MPT,
        settlement: sushiswap6MSettlement,
        isExpired: sushiswap6MExpired,
        impairment: sushiswap6MImpairment,
      },
      {
        protocol: "SushiSwap",
        maturity: "12M",
        maturityIndex: MATURITY_12M,
        ptBalance: sushiswap12MPT,
        settlement: sushiswap12MSettlement,
        isExpired: sushiswap12MExpired,
        impairment: sushiswap12MImpairment,
      },
      {
        protocol: "Curve Finance",
        maturity: "6M",
        maturityIndex: MATURITY_6M,
        ptBalance: curve6MPT,
        settlement: curve6MSettlement,
        isExpired: curve6MExpired,
        impairment: curve6MImpairment,
      },
      {
        protocol: "Curve Finance",
        maturity: "12M",
        maturityIndex: MATURITY_12M,
        ptBalance: curve12MPT,
        settlement: curve12MSettlement,
        isExpired: curve12MExpired,
        impairment: curve12MImpairment,
      },
      {
        protocol: "Aave",
        maturity: "6M",
        maturityIndex: MATURITY_6M,
        ptBalance: aave6MPT,
        settlement: aave6MSettlement,
        isExpired: aave6MExpired,
        impairment: aave6MImpairment,
      },
      {
        protocol: "Aave",
        maturity: "12M",
        maturityIndex: MATURITY_12M,
        ptBalance: aave12MPT,
        settlement: aave12MSettlement,
        isExpired: aave12MExpired,
        impairment: aave12MImpairment,
      },
      {
        protocol: "Uniswap V3",
        maturity: "6M",
        maturityIndex: MATURITY_6M,
        ptBalance: uniswap6MPT,
        settlement: uniswap6MSettlement,
        isExpired: uniswap6MExpired,
        impairment: uniswap6MImpairment,
      },
      {
        protocol: "Uniswap V3",
        maturity: "12M",
        maturityIndex: MATURITY_12M,
        ptBalance: uniswap12MPT,
        settlement: uniswap12MSettlement,
        isExpired: uniswap12MExpired,
        impairment: uniswap12MImpairment,
      },
      {
        protocol: "Compound",
        maturity: "6M",
        maturityIndex: MATURITY_6M,
        ptBalance: compound6MPT,
        settlement: compound6MSettlement,
        isExpired: compound6MExpired,
        impairment: compound6MImpairment,
      },
      {
        protocol: "Compound",
        maturity: "12M",
        maturityIndex: MATURITY_12M,
        ptBalance: compound12MPT,
        settlement: compound12MSettlement,
        isExpired: compound12MExpired,
        impairment: compound12MImpairment,
      },
      {
        protocol: "PancakeSwap",
        maturity: "6M",
        maturityIndex: MATURITY_6M,
        ptBalance: pancakeswap6MPT,
        settlement: pancakeswap6MSettlement,
        isExpired: pancakeswap6MExpired,
        impairment: pancakeswap6MImpairment,
      },
      {
        protocol: "PancakeSwap",
        maturity: "12M",
        maturityIndex: MATURITY_12M,
        ptBalance: pancakeswap12MPT,
        settlement: pancakeswap12MSettlement,
        isExpired: pancakeswap12MExpired,
        impairment: pancakeswap12MImpairment,
      },
    ];

    // Check if any data is still loading
    const anyLoading = tokenData.some(
      ({ ptBalance, settlement, impairment }) =>
        ptBalance.isLoading || settlement.isLoading || impairment.isLoading,
    );

    if (anyLoading) {
      setIsLoading(true);
      return;
    }

    const tokens: RedeemableToken[] = [];

    tokenData.forEach(
      ({
        protocol,
        maturity,
        maturityIndex,
        ptBalance,
        settlement,
        isExpired,
        impairment,
      }) => {
        if (
          ptBalance.data &&
          ptBalance.data > BigInt(0) &&
          settlement.data &&
          isExpired.data !== undefined
        ) {
          const { expiryTime, isSettled, breachOccurred, totalITPayout } =
            settlement.data;
          const impairmentFactor = impairment.data ?? BigInt(1e18);

          // Show tokens that are past maturity date (using blockchain time):
          // 1. Already settled (regardless of breach) - can redeem at calculated value
          // 2. Expired + no breach - will auto-settle at 1:1 on redemption
          // Hide: Expired + breach + not settled - needs manual settlement first
          const canRedeem = isSettled || (isExpired.data && !breachOccurred);

          if (canRedeem) {
            tokens.push({
              protocol,
              maturity,
              maturityIndex,
              ptBalance: ptBalance.data,
              isSettled,
              breachOccurred,
              expiryTime,
              totalITPayout,
              impairmentFactor,
              iconPath: getProtocolLogo(protocol),
            });
          }
        }
      },
    );

    setRedeemableTokens(tokens);
    setIsLoading(false);
  }, [
    address,
    refreshKey,
    // Include all hook objects so useEffect re-runs when data loads
    sushiswap6MPT,
    sushiswap6MSettlement,
    sushiswap6MExpired,
    sushiswap12MPT,
    sushiswap12MSettlement,
    sushiswap12MExpired,
    curve6MPT,
    curve6MSettlement,
    curve6MExpired,
    curve12MPT,
    curve12MSettlement,
    curve12MExpired,
    aave6MPT,
    aave6MSettlement,
    aave6MExpired,
    aave12MPT,
    aave12MSettlement,
    aave12MExpired,
    uniswap6MPT,
    uniswap6MSettlement,
    uniswap6MExpired,
    uniswap12MPT,
    uniswap12MSettlement,
    uniswap12MExpired,
    compound6MPT,
    compound6MSettlement,
    compound6MExpired,
    compound12MPT,
    compound12MSettlement,
    compound12MExpired,
    pancakeswap6MPT,
    pancakeswap6MSettlement,
    pancakeswap6MExpired,
    pancakeswap12MPT,
    pancakeswap12MSettlement,
    pancakeswap12MExpired,
    sushiswap6MImpairment,
    sushiswap12MImpairment,
    curve6MImpairment,
    curve12MImpairment,
    aave6MImpairment,
    aave12MImpairment,
    uniswap6MImpairment,
    uniswap12MImpairment,
    compound6MImpairment,
    compound12MImpairment,
    pancakeswap6MImpairment,
    pancakeswap12MImpairment,
  ]);

  const handleRedeem = async (token: RedeemableToken) => {
    const tokenKey = `${token.protocol}-${token.maturityIndex}`;
    setPendingTokenKey(tokenKey);
    setError("");
    setSuccess("");

    try {
      setSuccess("Redeeming Principal Tokens...");
      const hash = await redeemPT(
        token.protocol,
        token.maturityIndex,
        token.ptBalance,
      );
      setSuccess(`Successfully redeemed! Transaction: ${hash}`);

      // Refresh the page after a delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error("Redeem error:", err);
      setError(err instanceof Error ? err.message : "Failed to redeem tokens");
      setSuccess("");
    } finally {
      setPendingTokenKey(null);
    }
  };

  const calculateRedemptionValue = (token: RedeemableToken): string => {
    const ptBalanceInUSDT = Number(formatUnits(token.ptBalance, 18));
    const impairment = Number(formatUnits(token.impairmentFactor, 18));
    const redemptionValue =
      ptBalanceInUSDT * (Number.isFinite(impairment) ? impairment : 1);
    return redemptionValue.toFixed(2);
  };

  if (!isConnected) {
    return (
      <Box sx={commonStyles.pageContainerStyles}>
        <Container maxWidth="lg">
          <Card sx={commonStyles.cardStyles}>
            <CardContent sx={{ p: 3, textAlign: "center" }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                Please connect your wallet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Connect your wallet to redeem your principal tokens
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
        {/* Header */}
        <Box sx={commonStyles.headerSectionStyles}>
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: "bold", color: "text.primary" }}
          >
            Redeem Principal Tokens
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            Claim your principal tokens after maturity expiry
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setRefreshKey((k) => k + 1)}
            sx={{ mt: 2 }}
          >
            🔄 Refresh Tokens
          </Button>
        </Box>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            onClose={() => setSuccess("")}
          >
            {success}
          </Alert>
        )}

        {/* Stablecoin Selection */}
        <Card sx={{ ...commonStyles.cardStyles, mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Preferred Stablecoin</InputLabel>
              <Select
                value={selectedStablecoin}
                label="Preferred Stablecoin"
                onChange={(e) =>
                  setSelectedStablecoin(e.target.value as "USDT" | "USDC")
                }
              >
                <MenuItem value="USDT">USDT</MenuItem>
                <MenuItem value="USDC">USDC</MenuItem>
              </Select>
            </FormControl>
          </CardContent>
        </Card>

        {/* Redeemable Tokens */}
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : redeemableTokens.length > 0 ? (
          <Stack spacing={3}>
            {redeemableTokens.map((token, index) => (
              <Card key={index} sx={commonStyles.cardStyles}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                    {/* Protocol Icon */}
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "#1f2937",
                        border: "2px solid #3b82f6",
                      }}
                    >
                      <Image
                        src={token.iconPath}
                        alt={token.protocol}
                        width={60}
                        height={60}
                      />
                    </Box>

                    {/* Token Info */}
                    <Box sx={{ flex: 1 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          mb: 1,
                        }}
                      >
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: "bold", color: "text.primary" }}
                        >
                          {token.protocol} ({token.maturity})
                        </Typography>
                        {token.isSettled && (
                          <Chip
                            icon={<CheckCircle />}
                            label="Settled"
                            size="small"
                            color="success"
                            sx={{ fontSize: "0.75rem" }}
                          />
                        )}
                        {!token.isSettled && (
                          <Chip
                            icon={<AccessTime />}
                            label="Pending Settlement"
                            size="small"
                            color="warning"
                            sx={{ fontSize: "0.75rem" }}
                          />
                        )}
                      </Box>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1 }}
                      >
                        PT Balance: {formatUnits(token.ptBalance, 18)} PT
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1 }}
                      >
                        Impairment Factor:{" "}
                        {formatUnits(token.impairmentFactor, 18)}x
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        Redemption Amount: {calculateRedemptionValue(token)}{" "}
                        {selectedStablecoin}
                      </Typography>

                      {token.breachOccurred && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                          <Typography variant="body2">
                            Breach occurred. PT value reduced by insurance
                            payouts.
                          </Typography>
                        </Alert>
                      )}
                    </Box>

                    {/* Redeem Button */}
                    <Button
                      variant="contained"
                      disabled={
                        pendingTokenKey ===
                          `${token.protocol}-${token.maturityIndex}` ||
                        isPending
                      }
                      onClick={() => handleRedeem(token)}
                      sx={{
                        bgcolor: "#3b82f6",
                        color: "white",
                        "&:hover": { bgcolor: "#2563eb" },
                        minWidth: 120,
                      }}
                    >
                      {pendingTokenKey ===
                      `${token.protocol}-${token.maturityIndex}` ? (
                        <CircularProgress size={24} />
                      ) : (
                        "Redeem PT"
                      )}
                    </Button>
                  </Box>

                  {!token.isSettled && !token.breachOccurred && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        🎯 Auto-settlement: This will be automatically settled
                        at 1:1 when you redeem.
                      </Typography>
                    </Alert>
                  )}
                  {!token.isSettled && token.breachOccurred && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        ⚠️ Breach occurred: Must be manually settled by protocol
                        owner before redemption.
                      </Typography>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          <Card sx={commonStyles.cardStyles}>
            <CardContent sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No Principal Tokens to Redeem
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You don&apos;t have any redeemable principal tokens at this
                time.
              </Typography>
            </CardContent>
          </Card>
        )}
      </Container>
    </Box>
  );
}
