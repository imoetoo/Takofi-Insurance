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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Schedule } from "@mui/icons-material";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import Image from "next/image";
import * as commonStyles from "@/styles/commonStyles";
import { RoundedTabs, Tab } from "@/components/RoundedTabs";
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
  isExpired: boolean;
}

interface StoredClaimedToken {
  protocol: string;
  maturity: string;
  maturityIndex: number;
  ptBalance: string;
  isSettled: boolean;
  breachOccurred: boolean;
  expiryTime: string;
  totalITPayout: string;
  impairmentFactor: string;
  iconPath: string;
  isExpired: boolean;
  redeemedAt: number;
}

const CLAIMED_TOKENS_KEY = "redeem-pt-claimed-tokens";

const saveClaimedTokens = (address: string, tokens: RedeemableToken[]) => {
  try {
    const stored: StoredClaimedToken[] = tokens.map((t) => ({
      protocol: t.protocol,
      maturity: t.maturity,
      maturityIndex: t.maturityIndex,
      ptBalance: t.ptBalance.toString(),
      isSettled: t.isSettled,
      breachOccurred: t.breachOccurred,
      expiryTime: t.expiryTime.toString(),
      totalITPayout: t.totalITPayout.toString(),
      impairmentFactor: t.impairmentFactor.toString(),
      iconPath: t.iconPath,
      isExpired: t.isExpired,
      redeemedAt: Date.now(),
    }));
    localStorage.setItem(`${CLAIMED_TOKENS_KEY}-${address}`, JSON.stringify(stored));
  } catch (e) {
    console.error("Failed to save claimed tokens:", e);
  }
};

const loadClaimedTokens = (address: string): RedeemableToken[] => {
  try {
    const raw = localStorage.getItem(`${CLAIMED_TOKENS_KEY}-${address}`);
    if (!raw) return [];
    const stored: StoredClaimedToken[] = JSON.parse(raw);
    return stored.map((t) => ({
      protocol: t.protocol,
      maturity: t.maturity,
      maturityIndex: t.maturityIndex,
      ptBalance: BigInt(t.ptBalance),
      isSettled: t.isSettled,
      breachOccurred: t.breachOccurred,
      expiryTime: BigInt(t.expiryTime),
      totalITPayout: BigInt(t.totalITPayout),
      impairmentFactor: BigInt(t.impairmentFactor),
      iconPath: t.iconPath,
      isExpired: t.isExpired,
    }));
  } catch (e) {
    console.error("Failed to load claimed tokens:", e);
    return [];
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

const formatDate = (timestamp: bigint): string => {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function RedeemPrincipalPage() {
  const { address, isConnected } = useAccount();
  const [allTokens, setAllTokens] = useState<RedeemableToken[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingTokenKey, setPendingTokenKey] = useState<string | null>(null);
  const [claimedTokens, setClaimedTokens] = useState<RedeemableToken[]>([]);

  // Load claimed tokens from localStorage on mount
  useEffect(() => {
    if (address) {
      const saved = loadClaimedTokens(address);
      setClaimedTokens(saved);
    }
  }, [address]);

  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
  const [selectedRedeemToken, setSelectedRedeemToken] = useState<RedeemableToken | null>(null);
  const [selectedStablecoin, setSelectedStablecoin] = useState<"USDT" | "USDC">("USDT");

  const { redeemPT, isPending } = useRedeemPrincipalTokens();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Call ALL hooks at top level for each protocol-maturity combination
  // SushiSwap
  const sushiswap6MPT = useUserPTByMaturity(address, "SushiSwap", MATURITY_6M);
  const sushiswap6MSettlement = useMaturitySettlement("SushiSwap", MATURITY_6M);
  const sushiswap6MExpired = useIsMaturityExpired("SushiSwap", MATURITY_6M);
  const sushiswap6MImpairment = useImpairmentFactor("SushiSwap", MATURITY_6M);
  const sushiswap12MPT = useUserPTByMaturity(address, "SushiSwap", MATURITY_12M);
  const sushiswap12MSettlement = useMaturitySettlement("SushiSwap", MATURITY_12M);
  const sushiswap12MExpired = useIsMaturityExpired("SushiSwap", MATURITY_12M);
  const sushiswap12MImpairment = useImpairmentFactor("SushiSwap", MATURITY_12M);

  // Curve Finance
  const curve6MPT = useUserPTByMaturity(address, "Curve Finance", MATURITY_6M);
  const curve6MSettlement = useMaturitySettlement("Curve Finance", MATURITY_6M);
  const curve6MExpired = useIsMaturityExpired("Curve Finance", MATURITY_6M);
  const curve6MImpairment = useImpairmentFactor("Curve Finance", MATURITY_6M);
  const curve12MPT = useUserPTByMaturity(address, "Curve Finance", MATURITY_12M);
  const curve12MSettlement = useMaturitySettlement("Curve Finance", MATURITY_12M);
  const curve12MExpired = useIsMaturityExpired("Curve Finance", MATURITY_12M);
  const curve12MImpairment = useImpairmentFactor("Curve Finance", MATURITY_12M);

  // Aave
  const aave6MPT = useUserPTByMaturity(address, "Aave", MATURITY_6M);
  const aave6MSettlement = useMaturitySettlement("Aave", MATURITY_6M);
  const aave6MExpired = useIsMaturityExpired("Aave", MATURITY_6M);
  const aave6MImpairment = useImpairmentFactor("Aave", MATURITY_6M);
  const aave12MPT = useUserPTByMaturity(address, "Aave", MATURITY_12M);
  const aave12MSettlement = useMaturitySettlement("Aave", MATURITY_12M);
  const aave12MExpired = useIsMaturityExpired("Aave", MATURITY_12M);
  const aave12MImpairment = useImpairmentFactor("Aave", MATURITY_12M);

  // Uniswap V3
  const uniswap6MPT = useUserPTByMaturity(address, "Uniswap V3", MATURITY_6M);
  const uniswap6MSettlement = useMaturitySettlement("Uniswap V3", MATURITY_6M);
  const uniswap6MExpired = useIsMaturityExpired("Uniswap V3", MATURITY_6M);
  const uniswap6MImpairment = useImpairmentFactor("Uniswap V3", MATURITY_6M);
  const uniswap12MPT = useUserPTByMaturity(address, "Uniswap V3", MATURITY_12M);
  const uniswap12MSettlement = useMaturitySettlement("Uniswap V3", MATURITY_12M);
  const uniswap12MExpired = useIsMaturityExpired("Uniswap V3", MATURITY_12M);
  const uniswap12MImpairment = useImpairmentFactor("Uniswap V3", MATURITY_12M);

  // Compound
  const compound6MPT = useUserPTByMaturity(address, "Compound", MATURITY_6M);
  const compound6MSettlement = useMaturitySettlement("Compound", MATURITY_6M);
  const compound6MExpired = useIsMaturityExpired("Compound", MATURITY_6M);
  const compound6MImpairment = useImpairmentFactor("Compound", MATURITY_6M);
  const compound12MPT = useUserPTByMaturity(address, "Compound", MATURITY_12M);
  const compound12MSettlement = useMaturitySettlement("Compound", MATURITY_12M);
  const compound12MExpired = useIsMaturityExpired("Compound", MATURITY_12M);
  const compound12MImpairment = useImpairmentFactor("Compound", MATURITY_12M);

  // PancakeSwap
  const pancakeswap6MPT = useUserPTByMaturity(address, "PancakeSwap", MATURITY_6M);
  const pancakeswap6MSettlement = useMaturitySettlement("PancakeSwap", MATURITY_6M);
  const pancakeswap6MExpired = useIsMaturityExpired("PancakeSwap", MATURITY_6M);
  const pancakeswap6MImpairment = useImpairmentFactor("PancakeSwap", MATURITY_6M);
  const pancakeswap12MPT = useUserPTByMaturity(address, "PancakeSwap", MATURITY_12M);
  const pancakeswap12MSettlement = useMaturitySettlement("PancakeSwap", MATURITY_12M);
  const pancakeswap12MExpired = useIsMaturityExpired("PancakeSwap", MATURITY_12M);
  const pancakeswap12MImpairment = useImpairmentFactor("PancakeSwap", MATURITY_12M);

  // Organize hook results into structured data (outside useEffect so deps work)
  const tokenData = [
    { protocol: "SushiSwap", maturity: "6M", maturityIndex: MATURITY_6M, ptBalance: sushiswap6MPT, settlement: sushiswap6MSettlement, isExpired: sushiswap6MExpired, impairment: sushiswap6MImpairment },
    { protocol: "SushiSwap", maturity: "12M", maturityIndex: MATURITY_12M, ptBalance: sushiswap12MPT, settlement: sushiswap12MSettlement, isExpired: sushiswap12MExpired, impairment: sushiswap12MImpairment },
    { protocol: "Curve Finance", maturity: "6M", maturityIndex: MATURITY_6M, ptBalance: curve6MPT, settlement: curve6MSettlement, isExpired: curve6MExpired, impairment: curve6MImpairment },
    { protocol: "Curve Finance", maturity: "12M", maturityIndex: MATURITY_12M, ptBalance: curve12MPT, settlement: curve12MSettlement, isExpired: curve12MExpired, impairment: curve12MImpairment },
    { protocol: "Aave", maturity: "6M", maturityIndex: MATURITY_6M, ptBalance: aave6MPT, settlement: aave6MSettlement, isExpired: aave6MExpired, impairment: aave6MImpairment },
    { protocol: "Aave", maturity: "12M", maturityIndex: MATURITY_12M, ptBalance: aave12MPT, settlement: aave12MSettlement, isExpired: aave12MExpired, impairment: aave12MImpairment },
    { protocol: "Uniswap V3", maturity: "6M", maturityIndex: MATURITY_6M, ptBalance: uniswap6MPT, settlement: uniswap6MSettlement, isExpired: uniswap6MExpired, impairment: uniswap6MImpairment },
    { protocol: "Uniswap V3", maturity: "12M", maturityIndex: MATURITY_12M, ptBalance: uniswap12MPT, settlement: uniswap12MSettlement, isExpired: uniswap12MExpired, impairment: uniswap12MImpairment },
    { protocol: "Compound", maturity: "6M", maturityIndex: MATURITY_6M, ptBalance: compound6MPT, settlement: compound6MSettlement, isExpired: compound6MExpired, impairment: compound6MImpairment },
    { protocol: "Compound", maturity: "12M", maturityIndex: MATURITY_12M, ptBalance: compound12MPT, settlement: compound12MSettlement, isExpired: compound12MExpired, impairment: compound12MImpairment },
    { protocol: "PancakeSwap", maturity: "6M", maturityIndex: MATURITY_6M, ptBalance: pancakeswap6MPT, settlement: pancakeswap6MSettlement, isExpired: pancakeswap6MExpired, impairment: pancakeswap6MImpairment },
    { protocol: "PancakeSwap", maturity: "12M", maturityIndex: MATURITY_12M, ptBalance: pancakeswap12MPT, settlement: pancakeswap12MSettlement, isExpired: pancakeswap12MExpired, impairment: pancakeswap12MImpairment },
  ];

  // Derive loading state directly from hooks
  const anyHookLoading = tokenData.some(
    ({ ptBalance, settlement, impairment }) =>
      ptBalance.isLoading || settlement.isLoading || impairment.isLoading,
  );

  // Process token data
  useEffect(() => {
    if (!address) {
      setAllTokens([]);
      setIsLoading(false);
      return;
    }

    if (anyHookLoading) {
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
        if (ptBalance.data && ptBalance.data > BigInt(0) && settlement.data) {
          const { expiryTime, isSettled, breachOccurred, totalITPayout } =
            settlement.data;
          const impairmentFactor = impairment.data ?? BigInt(1e18);
          const expired = isExpired.data ?? false;

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
            isExpired: expired,
          });
        }
      },
    );

    setAllTokens(tokens);
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, anyHookLoading, refreshKey]);

  // Filter tokens for different tabs
  const availableToRedeem = allTokens.filter(
    (t) => t.isExpired && (t.isSettled || !t.breachOccurred)
  );

  const futureRedeemable = allTokens.filter((t) => !t.isExpired);

  const calculateRedemptionValue = (token: RedeemableToken): string => {
    const ptBalanceInUSDT = Number(formatUnits(token.ptBalance, 18));
    const impairment = Number(formatUnits(token.impairmentFactor, 18));
    const redemptionValue =
      ptBalanceInUSDT * (Number.isFinite(impairment) ? impairment : 1);
    return redemptionValue.toFixed(2);
  };

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

      // Move token to claimed list, persist to localStorage, and refresh
      const redeemedToken = availableToRedeem.find(
        (t) => t.protocol === token.protocol && t.maturityIndex === token.maturityIndex
      );
      if (redeemedToken) {
        const updatedClaimed = [...claimedTokens, redeemedToken];
        setClaimedTokens(updatedClaimed);
        if (address) {
          saveClaimedTokens(address, updatedClaimed);
        }
      }

      // Trigger a refresh of the token list
      setTimeout(() => {
        setRefreshKey((k) => k + 1);
      }, 2000);
    } catch (err) {
      console.error("Redeem error:", err);
      setError(err instanceof Error ? err.message : "Failed to redeem tokens");
      setSuccess("");
    } finally {
      setPendingTokenKey(null);
      setRedeemDialogOpen(false);
      setSelectedRedeemToken(null);
    }
  };

  const handleOpenRedeemDialog = (token: RedeemableToken) => {
    setSelectedRedeemToken(token);
    setRedeemDialogOpen(true);
  };

  const handleConfirmRedeem = () => {
    if (selectedRedeemToken) {
      handleRedeem(selectedRedeemToken);
    }
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
            Manage and claim your principal tokens
          </Typography>
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

        {/* Tab Navigation */}
        <Card sx={commonStyles.cardStyles}>
          <CardContent sx={{ p: 0 }}>
            <RoundedTabs value={tabValue} onChange={handleTabChange} centered>
              <Tab label="All Principal Tokens" />
              <Tab label="Available to Redeem" />
              <Tab label="Future Redeemable" />
              <Tab label="Claimed Tokens" />
            </RoundedTabs>

            {/* Tab Content */}
            {isLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ p: 3 }}>
                {/* Tab 0: All Principal Tokens */}
                {tabValue === 0 && (
                  <Box>
                    {allTokens.length > 0 ? (
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow sx={{ bgcolor: "#1f2937" }}>
                              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                                Protocol
                              </TableCell>
                              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                                Maturity
                              </TableCell>
                              <TableCell sx={{ color: "#fff", fontWeight: "bold" }} align="right">
                                PT Balance
                              </TableCell>
                              <TableCell sx={{ color: "#fff", fontWeight: "bold" }} align="right">
                                Impairment Factor
                              </TableCell>
                              <TableCell sx={{ color: "#fff", fontWeight: "bold" }} align="right">
                                Expected Redemption
                              </TableCell>
                              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                                Status
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {allTokens.map((token, idx) => (
                              <TableRow key={idx} sx={{ "&:hover": { bgcolor: "#2a3f5f" } }}>
                                <TableCell>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Box
                                      sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: "50%",
                                        overflow: "hidden",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        bgcolor: "#1f2937",
                                      }}
                                    >
                                      <Image
                                        src={token.iconPath}
                                        alt={token.protocol}
                                        width={30}
                                        height={30}
                                      />
                                    </Box>
                                    {token.protocol}
                                  </Box>
                                </TableCell>
                                <TableCell>{token.maturity}</TableCell>
                                <TableCell align="right">
                                  {formatUnits(token.ptBalance, 18)}
                                </TableCell>
                                <TableCell align="right">
                                  {formatUnits(token.impairmentFactor, 18)}x
                                </TableCell>
                                <TableCell align="right">
                                  {calculateRedemptionValue(token)} {selectedStablecoin}
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: "flex", gap: 1 }}>
                                    {token.isExpired && (
                                      <Chip label="Expired" size="small" color="success" variant="outlined" />
                                    )}
                                    {!token.isExpired && (
                                      <Chip label="Active" size="small" color="info" variant="outlined" />
                                    )}
                                    {token.breachOccurred && (
                                      <Chip label="Breach" size="small" color="warning" variant="outlined" />
                                    )}
                                  </Box>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                        No principal tokens found
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Tab 1: Available to Redeem */}
                {tabValue === 1 && (
                  <Box>
                    {availableToRedeem.length > 0 ? (
                      <Stack spacing={3}>
                        {availableToRedeem.map((token, idx) => (
                          <Card key={idx} sx={{ bgcolor: "#0f1419", border: "1px solid #3b82f6" }}>
                            <CardContent sx={{ p: 3 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
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

                                <Box sx={{ flex: 1 }}>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
                                    <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                                      {token.protocol} ({token.maturity})
                                    </Typography>
                                  </Box>

                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    PT Balance: {formatUnits(token.ptBalance, 18)} PT
                                  </Typography>

                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    Impairment Factor: {formatUnits(token.impairmentFactor, 18)}x
                                  </Typography>

                                  <Typography variant="body2" color="text.secondary">
                                    Redemption Amount: {calculateRedemptionValue(token)} {selectedStablecoin}
                                  </Typography>

                                  {token.breachOccurred && (
                                    <Alert severity="warning" sx={{ mt: 2 }}>
                                      <Typography variant="body2">
                                        Breach occurred. PT value reduced by insurance payouts.
                                      </Typography>
                                    </Alert>
                                  )}
                                </Box>

                                <Button
                                  variant="contained"
                                  disabled={
                                    pendingTokenKey ===
                                      `${token.protocol}-${token.maturityIndex}` || isPending
                                  }
                                  onClick={() => handleOpenRedeemDialog(token)}
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
                                    "Redeem"
                                  )}
                                </Button>
                              </Box>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    ) : (
                      <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                        No tokens available for redemption yet
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Tab 2: Future Redeemable */}
                {tabValue === 2 && (
                  <Box>
                    {futureRedeemable.length > 0 ? (
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow sx={{ bgcolor: "#1f2937" }}>
                              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                                Protocol
                              </TableCell>
                              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                                Maturity
                              </TableCell>
                              <TableCell sx={{ color: "#fff", fontWeight: "bold" }} align="right">
                                PT Balance
                              </TableCell>
                              <TableCell sx={{ color: "#fff", fontWeight: "bold" }} align="right">
                                Current Impairment
                              </TableCell>
                              <TableCell sx={{ color: "#fff", fontWeight: "bold" }} align="center">
                                Maturity Date
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {futureRedeemable.map((token, idx) => (
                              <TableRow key={idx} sx={{ "&:hover": { bgcolor: "#2a3f5f" } }}>
                                <TableCell>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Box
                                      sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: "50%",
                                        overflow: "hidden",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        bgcolor: "#1f2937",
                                      }}
                                    >
                                      <Image
                                        src={token.iconPath}
                                        alt={token.protocol}
                                        width={30}
                                        height={30}
                                      />
                                    </Box>
                                    {token.protocol}
                                  </Box>
                                </TableCell>
                                <TableCell>{token.maturity}</TableCell>
                                <TableCell align="right">
                                  {formatUnits(token.ptBalance, 18)}
                                </TableCell>
                                <TableCell align="right">
                                  {formatUnits(token.impairmentFactor, 18)}x
                                </TableCell>
                                <TableCell align="center">
                                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                                    <Schedule sx={{ fontSize: "1rem" }} />
                                    {formatDate(token.expiryTime)}
                                  </Box>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                        No future redeemable tokens
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Tab 3: Claimed Tokens */}
                {tabValue === 3 && (
                  <Box>
                    {claimedTokens.length > 0 ? (
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow sx={{ bgcolor: "#1f2937" }}>
                              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                                Protocol
                              </TableCell>
                              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                                Maturity
                              </TableCell>
                              <TableCell sx={{ color: "#fff", fontWeight: "bold" }} align="right">
                                PT Redeemed
                              </TableCell>
                              <TableCell sx={{ color: "#fff", fontWeight: "bold" }} align="right">
                                Redeemed Amount
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {claimedTokens.map((token, idx) => (
                              <TableRow key={idx} sx={{ "&:hover": { bgcolor: "#2a3f5f" } }}>
                                <TableCell>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Box
                                      sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: "50%",
                                        overflow: "hidden",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        bgcolor: "#1f2937",
                                      }}
                                    >
                                      <Image
                                        src={token.iconPath}
                                        alt={token.protocol}
                                        width={30}
                                        height={30}
                                      />
                                    </Box>
                                    {token.protocol}
                                  </Box>
                                </TableCell>
                                <TableCell>{token.maturity}</TableCell>
                                <TableCell align="right">
                                  {formatUnits(token.ptBalance, 18)}
                                </TableCell>
                                <TableCell align="right" sx={{ color: "#10b981", fontWeight: "bold" }}>
                                  {calculateRedemptionValue(token)} {selectedStablecoin}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                        No claimed tokens yet
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Redeem Confirmation Dialog */}
        <Dialog
          open={redeemDialogOpen}
          onClose={() => {
            setRedeemDialogOpen(false);
            setSelectedRedeemToken(null);
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Confirm Redemption</DialogTitle>
          <DialogContent>
            {selectedRedeemToken && (
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  You are about to redeem Principal Tokens for:
                </Typography>
                <Card sx={{ bgcolor: "#0f1419", p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                    {selectedRedeemToken.protocol} ({selectedRedeemToken.maturity})
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    PT Balance: {formatUnits(selectedRedeemToken.ptBalance, 18)} PT
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Estimated Redemption:{" "}
                    <span style={{ color: "#10b981", fontWeight: "bold" }}>
                      {calculateRedemptionValue(selectedRedeemToken)}
                    </span>
                  </Typography>
                </Card>

                <FormControl fullWidth>
                  <InputLabel>Select Stablecoin</InputLabel>
                  <Select
                    value={selectedStablecoin}
                    label="Select Stablecoin"
                    onChange={(e) =>
                      setSelectedStablecoin(e.target.value as "USDT" | "USDC")
                    }
                  >
                    <MenuItem value="USDT">USDT</MenuItem>
                    <MenuItem value="USDC">USDC</MenuItem>
                  </Select>
                </FormControl>

                <Typography variant="caption" color="text.secondary">
                  You will receive your stablecoins in {selectedStablecoin}
                </Typography>
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              onClick={() => {
                setRedeemDialogOpen(false);
                setSelectedRedeemToken(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRedeem}
              variant="contained"
              disabled={isPending}
              sx={{ bgcolor: "#3b82f6" }}
            >
              {isPending ? <CircularProgress size={20} /> : "Confirm Redemption"}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
