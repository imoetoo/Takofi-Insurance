"use client";

import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Stack,
  Divider,
  CircularProgress,
} from "@mui/material";
import { useAccount, useReadContract } from "wagmi";
import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import * as commonStyles from "@/styles/commonStyles";
import { insuranceListings } from "@/app/insurance-market/insuranceListings";
import { useTokenMinting } from "@/hooks/useTokenMinting";
import {
  TOKEN_MINTING_CONTRACT_ADDRESS,
  USDT_ADDRESS,
  USDC_ADDRESS,
  STABLECOIN_DECIMALS,
  ERC20_ABI,
  TOKEN_MINTING_ABI,
} from "@/constants";

type TokenBalance = {
  symbol: string;
  balance: bigint;
  decimals: number;
};

type ProtocolBalance = {
  name: string;
  insuranceToken: TokenBalance;
  principalToken: TokenBalance;
};

export default function Portfolio() {
  const { address, isConnected } = useAccount();
  const [protocolBalances, setProtocolBalances] = useState<ProtocolBalance[]>(
    []
  );
  const [stablecoinBalances, setStablecoinBalances] = useState<TokenBalance[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);

  // Contract hooks
  const { getProtocolId } = useTokenMinting();

  // Helper function to read token balance
  const readBalance = async (tokenAddress: string, walletAddress: string) => {
    try {
      const result = await useReadContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [walletAddress as `0x${string}`],
      });
      return (result?.data as bigint) || BigInt("0");
    } catch (error) {
      console.error(`Error reading balance for ${tokenAddress}:`, error);
      return BigInt("0");
    }
  };

  // Fetch balances for all protocols and stablecoins
  const fetchBalances = async () => {
    if (!address) return;

    try {
      setIsLoading(true);

      // Fetch protocol token balances
      const protocolsData = await Promise.all(
        insuranceListings.map(async (protocol) => {
          const protocolId = getProtocolId(protocol.title);

          // Get protocol info from contract
          const protocolInfo = await useReadContract({
            address: TOKEN_MINTING_CONTRACT_ADDRESS as `0x${string}`,
            abi: TOKEN_MINTING_ABI,
            functionName: "protocols",
            args: [protocolId],
          });

          const { insuranceToken, principalToken } = protocolInfo?.data as any;

          const [insBalance, prinBalance] = await Promise.all([
            readBalance(insuranceToken, address),
            readBalance(principalToken, address),
          ]);

          return {
            name: protocol.title,
            insuranceToken: {
              symbol: `${protocol.title}-INS`,
              balance: insBalance,
              decimals: 18,
            },
            principalToken: {
              symbol: `${protocol.title}-PRIN`,
              balance: prinBalance,
              decimals: 18,
            },
          };
        })
      );

      // Fetch stablecoin balances
      const [usdtBalance, usdcBalance] = await Promise.all([
        readBalance(USDT_ADDRESS, address),
        readBalance(USDC_ADDRESS, address),
      ]);

      setProtocolBalances(protocolsData);
      setStablecoinBalances([
        {
          symbol: "USDT",
          balance: usdtBalance || BigInt("0"),
          decimals: STABLECOIN_DECIMALS,
        },
        {
          symbol: "USDC",
          balance: usdcBalance || BigInt("0"),
          decimals: STABLECOIN_DECIMALS,
        },
      ]);
    } catch (error) {
      console.error("Error fetching balances:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchBalances();
    }
  }, [address, isConnected]);

  if (!isConnected) {
    return (
      <Box sx={commonStyles.pageContainerStyles}>
        <Container maxWidth="lg">
          <Card sx={commonStyles.cardStyles}>
            <CardContent sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="h6" color="text.secondary">
                Please connect your wallet to view your portfolio
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
        <Card sx={commonStyles.cardStyles}>
          <CardContent sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={commonStyles.headerSectionStyles}>
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: "bold",
                  color: "text.primary",
                }}
              >
                My Portfolio
              </Typography>
            </Box>

            {isLoading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  py: 4,
                }}
              >
                <CircularProgress />
              </Box>
            ) : (
              <Stack spacing={3}>
                {/* Protocol Balances */}
                <Box>
                  <Typography
                    variant="h6"
                    sx={{ mb: 2, color: "text.secondary" }}
                  >
                    Protocol Tokens
                  </Typography>
                  <Stack spacing={2}>
                    {protocolBalances.map((protocol) => (
                      <Card
                        key={protocol.name}
                        sx={{
                          ...commonStyles.cardStyles,
                          bgcolor: "background.paper",
                        }}
                      >
                        <CardContent>
                          <Typography
                            variant="subtitle1"
                            sx={{ mb: 2, fontWeight: "bold" }}
                          >
                            {protocol.name}
                          </Typography>
                          <Stack spacing={1}>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <Typography color="text.secondary">
                                Insurance Token (
                                {protocol.insuranceToken.symbol})
                              </Typography>
                              <Typography>
                                {formatUnits(
                                  protocol.insuranceToken.balance,
                                  protocol.insuranceToken.decimals
                                )}
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <Typography color="text.secondary">
                                Principal Token (
                                {protocol.principalToken.symbol})
                              </Typography>
                              <Typography>
                                {formatUnits(
                                  protocol.principalToken.balance,
                                  protocol.principalToken.decimals
                                )}
                              </Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Box>

                <Divider />

                {/* Stablecoin Balances */}
                <Box>
                  <Typography
                    variant="h6"
                    sx={{ mb: 2, color: "text.secondary" }}
                  >
                    Stablecoin Balances
                  </Typography>
                  <Stack spacing={2}>
                    {stablecoinBalances.map((token) => (
                      <Card
                        key={token.symbol}
                        sx={{
                          ...commonStyles.cardStyles,
                          bgcolor: "background.paper",
                        }}
                      >
                        <CardContent>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Typography variant="subtitle1">
                              {token.symbol}
                            </Typography>
                            <Typography>
                              {formatUnits(token.balance, token.decimals)}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Box>
              </Stack>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
