"use client";

import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Switch,
  TextField,
  Divider,
  Stack,
  CircularProgress,
  Alert,
} from "@mui/material";
import { AccessTime, Info } from "@mui/icons-material";
import { useState, useCallback } from "react";
import { useAccount, useConfig } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { waitForTransactionReceipt } from "wagmi/actions";
import toast from "react-hot-toast";
import CompactTokenSelector from "@/components/CompactTokenSelector";
import ProtocolSelector from "@/components/ProtocolSelector";
import * as commonStyles from "@/styles/commonStyles";
import * as mintStyles from "@/styles/mintTokensStyles";
import { insuranceListings } from "@/app/insurance-market/insuranceListings";
import { useTokenMinting } from "@/hooks/useTokenMinting";
import { useERC20Approval, useERC20Allowance } from "@/hooks/useERC20";
import {
  useMaturities,
  formatMaturityLabel,
  useDaysUntilMaturity,
} from "@/hooks/useMaturity";
import { useImpairmentFactor } from "@/hooks/useImpairmentFactor";
import { useFundStatus } from "@/hooks/useFundStatus";
import {
  TOKEN_MINTING_CONTRACT_ADDRESS,
  USDT_ADDRESS,
  USDC_ADDRESS,
  STABLECOIN_DECIMALS,
  MATURITY_6M,
  MATURITY_12M,
} from "@/constants";

interface MintTokensState {
  inputAmount: string;
  sendToAnotherAddress: boolean;
  recipientAddress: string;
  isProcessing: boolean;
  selectedMaturity: number;
}

// Available input tokens (USDT/USDC)
const inputTokens = [
  {
    symbol: "USDT",
    name: "Tether USD",
    network: "Ethereum",
    icon: "₮",
    color: "#26a17b",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    network: "Ethereum",
    icon: "$",
    color: "#2775ca",
  },
];

// Create unique list of base protocols for the selector (only 6M variants)
const uniqueBaseProtocols = insuranceListings
  .filter((listing) => !listing.title.match(/\(12M\)$/i))
  .map((listing) => ({
    ...listing,
    title: listing.title.replace(/\s*\(6M\)\s*$/i, ""),
  }));

export default function MintTokens() {
  const [inputToken, setInputToken] = useState(inputTokens[0]);
  const [selectedProtocol, setSelectedProtocol] = useState(
    uniqueBaseProtocols[0],
  );
  const [state, setState] = useState<MintTokensState>({
    inputAmount: "",
    sendToAnotherAddress: false,
    recipientAddress: "",
    isProcessing: false,
    selectedMaturity: MATURITY_6M,
  });

  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const config = useConfig();

  // Contract hooks
  const { mintTokens, isPending: isMinting } = useTokenMinting();

  // Extract base protocol name (remove maturity suffix like "(6M)" or "(12M)")
  const baseProtocolName = selectedProtocol.title.replace(
    /\s*\((?:6M|12M)\)\s*$/i,
    "",
  );

  // Maturity hooks
  const { maturity6M, maturity12M } = useMaturities(baseProtocolName);
  const days6M = useDaysUntilMaturity(baseProtocolName, MATURITY_6M);
  const days12M = useDaysUntilMaturity(baseProtocolName, MATURITY_12M);

  // Get token address based on selection
  const tokenAddress =
    inputToken.symbol === "USDT" ? USDT_ADDRESS : USDC_ADDRESS;

  // ERC20 hooks for approval
  const { approve } = useERC20Approval(
    tokenAddress,
    TOKEN_MINTING_CONTRACT_ADDRESS,
  );

  // Check current allowance
  const { data: allowance, refetch: refetchAllowance } = useERC20Allowance(
    tokenAddress,
    address,
    TOKEN_MINTING_CONTRACT_ADDRESS,
  );

  // Note: Balance checking can be added later if needed for validation

  // Check if user has sufficient allowance
  const hasAllowance =
    allowance && state.inputAmount
      ? allowance >= parseUnits(state.inputAmount, STABLECOIN_DECIMALS)
      : false;

  // Calculate fee (0% = 0 basis points)
  const feeAmount = "0";
  const netAmount = state.inputAmount || "0";

  // Get maturity data
  const maturities = [maturity6M, maturity12M];
  const daysRemaining = [days6M, days12M];
  const selectedDays = daysRemaining[state.selectedMaturity];

  // Impairment factor for selected protocol & maturity
  const { data: impairmentFactorData } = useImpairmentFactor(
    baseProtocolName,
    state.selectedMaturity,
  );
  const {
    isDrained,
    totalDeposited,
    totalPayout,
    isLoading: fundStatusLoading,
  } = useFundStatus(baseProtocolName, state.selectedMaturity);
  const impairmentFactor = impairmentFactorData
    ? Number(formatUnits(impairmentFactorData, 18))
    : 1;
  const inputAmountNumber = Number(netAmount || "0");
  const itDisplayAmount = Number.isFinite(inputAmountNumber)
    ? inputAmountNumber
    : 0;
  // If fund is drained, PT should be 0
  const ptDisplayAmount = isDrained
    ? 0
    : impairmentFactor > 0
    ? itDisplayAmount / impairmentFactor
    : itDisplayAmount;
  const formatDisplay = (value: number) =>
    Number.isFinite(value) ? value.toFixed(2) : "0.00";

  // Debug logging
  console.log("[Mint Page] Fund Status:", {
    isDrained,
    totalDeposited: totalDeposited?.toString(),
    totalPayout: totalPayout?.toString(),
    fundStatusLoading,
    impairmentFactor,
  });

  // Handler for protocol change
  const handleProtocolChange = (protocol: (typeof insuranceListings)[0]) => {
    setState((prev) => ({
      ...prev,
      selectedMaturity: MATURITY_6M, // Reset to 6M when protocol changes
    }));
    setSelectedProtocol(protocol);
  };

  const handleInputAmountChange = (value: string) => {
    setState((prev) => ({ ...prev, inputAmount: value }));
  };

  const handleMaturitySelect = (maturityIndex: number): void => {
    setState((prev) => ({ ...prev, selectedMaturity: maturityIndex }));
  };

  // Handle minting with automatic approval
  const handleMintWithApproval = useCallback(async (): Promise<void> => {
    if (!state.inputAmount || !address || !selectedProtocol) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (selectedDays <= 0) {
      toast.error(
        "Selected maturity has expired. Please choose another bucket.",
      );
      return;
    }

    setState((prev) => ({ ...prev, isProcessing: true }));

    try {
      // Check if approval is needed
      const needsApproval = !hasAllowance;

      if (needsApproval) {
        console.log("Requesting approval for amount:", state.inputAmount);

        try {
          // Trigger approval transaction and get hash directly
          const approvalTxHash = await approve(state.inputAmount);
          console.log("Approval transaction submitted:", approvalTxHash);

          console.log("Waiting for approval confirmation...");
          // Wait for approval transaction to be confirmed
          await waitForTransactionReceipt(config, { hash: approvalTxHash });
          await refetchAllowance();
          console.log("Approval confirmed on blockchain");
        } catch (approvalError) {
          console.error("Approval failed:", approvalError);
          throw new Error(
            `Approval failed: ${
              approvalError instanceof Error
                ? approvalError.message
                : String(approvalError)
            }`,
          );
        }
      }

      // Proceed with minting
      console.log("Requesting mint transaction...");
      console.log(
        "Protocol:",
        selectedProtocol.title,
        "Token:",
        inputToken.symbol,
        "Amount:",
        state.inputAmount,
        "Maturity:",
        state.selectedMaturity,
      );

      try {
        // Trigger mint transaction with maturityIndex
        const mintTransactionHash = await mintTokens(
          baseProtocolName,
          state.selectedMaturity,
          inputToken.symbol,
          state.inputAmount,
        );
        console.log("Mint transaction submitted:", mintTransactionHash);

        console.log("Waiting for mint transaction confirmation...");
        // Wait for mint transaction to be confirmed
        await waitForTransactionReceipt(config, { hash: mintTransactionHash });
        console.log("Mint transaction confirmed on blockchain");
      } catch (mintError) {
        console.error("Mint transaction failed:", mintError);
        throw new Error(
          `Mint transaction failed: ${
            mintError instanceof Error ? mintError.message : String(mintError)
          }`,
        );
      }

      // Show success only after both transactions are ACTUALLY confirmed
      console.log("Both transactions confirmed! Showing success toast...");
      const maturityLabel =
        state.selectedMaturity === MATURITY_6M ? "6-Month" : "12-Month";
      toast.success(
        `Successfully minted ${netAmount} i${baseProtocolName} and p${baseProtocolName} tokens (${maturityLabel})!`,
        {
          duration: 4000,
          icon: "🎉",
        },
      );
      setState((prev) => ({ ...prev, inputAmount: "" }));

      // Refetch allowance in background, don't let it fail the whole process
      refetchAllowance().catch((refetchError) => {
        console.error(
          "Error refetching allowance (non-critical):",
          refetchError,
        );
      });

      console.log("Minting process completed successfully!");
    } catch (err: unknown) {
      console.error("Minting process failed:", err);

      // Provide specific error messages
      let errorMessage = "Minting failed. ";
      const errorString = err instanceof Error ? err.message : String(err);

      // Check for specific error patterns
      if (
        errorString.includes("user rejected") ||
        errorString.includes("User rejected")
      ) {
        errorMessage += "Transaction was rejected by user.";
      } else if (errorString.includes("insufficient funds")) {
        errorMessage += "Insufficient ETH for gas fees.";
      } else if (errorString.includes("allowance")) {
        errorMessage += "Token approval failed. Please try again.";
      } else if (errorString.includes("balance")) {
        errorMessage += `Insufficient ${inputToken.symbol} balance.`;
      } else if (
        errorString.includes("Internal JSON-RPC error") ||
        errorString.includes("-32603")
      ) {
        errorMessage +=
          "Network error occurred. Please check your connection and try again.";
      } else if (err && typeof err === "object") {
        // Handle wagmi/viem error objects
        const errorObj = err as {
          code?: number | string;
          reason?: string;
          message?: string;
        };
        if (errorObj.code) {
          errorMessage += `Error code: ${errorObj.code}`;
        } else if (errorObj.reason) {
          errorMessage += `Reason: ${errorObj.reason}`;
        } else if (errorObj.message) {
          errorMessage += `${errorObj.message}`;
        } else {
          errorMessage += `${errorString}`;
        }
      } else if (errorString) {
        errorMessage += `${errorString}`;
      } else {
        errorMessage +=
          "Please check your balance and network connection, then try again.";
      }

      toast.error(errorMessage, {
        duration: 4000,
        icon: "❌",
      });
    } finally {
      setState((prev) => ({ ...prev, isProcessing: false }));
    }
  }, [
    state.inputAmount,
    state.selectedMaturity,
    address,
    selectedProtocol,
    selectedDays,
    hasAllowance,
    approve,
    config,
    mintTokens,
    inputToken.symbol,
    refetchAllowance,
    netAmount,
    baseProtocolName,
  ]);

  return (
    <Box sx={commonStyles.pageContainerStyles}>
      <Container maxWidth="xl">
        <Box sx={mintStyles.mintContainerStyles}>
          {/* Header */}
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: "bold",
              color: "text.primary",
              textAlign: "center",
              mb: 4,
            }}
          >
            Mint Insurance Tokens
          </Typography>

          {/* Two Column Layout */}
          <Box sx={mintStyles.mintLayoutStyles}>
            {/* How It Works Section - Left Side */}
            <Box sx={mintStyles.howItWorksContainer}>
              <Card sx={{ ...commonStyles.cardStyles }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography
                    variant="h6"
                    sx={{ mb: 2, fontWeight: "bold", color: "text.primary" }}
                  >
                    How it works
                  </Typography>
                  <Stack spacing={2}>
                    <Typography variant="body2" color="text.secondary">
                      • Select a protocol to mint insurance tokens for
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • Choose a maturity bucket (6-month or 12-month)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • Enter USDT/USDC amount to mint tokens
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • Receive both Insurance and Principal tokens
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • Insurance tokens provide coverage, Principal tokens earn
                      yield
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Box>

            {/* Main Mint Card - Right Side */}
            <Box sx={mintStyles.mintMainCardContainer}>
              <Card sx={mintStyles.mintCardStyles}>
                <CardContent sx={{ p: 3 }}>
                  {/* Protocol Selection */}
                  <Box sx={{ mb: 2.5 }}>
                    <ProtocolSelector
                      // @ts-expect-error - insuranceListings has compatible structure
                      selectedProtocol={selectedProtocol}
                      // @ts-expect-error - compatible protocol types
                      onProtocolChange={handleProtocolChange}
                      // @ts-expect-error - compatible protocol array
                      protocols={uniqueBaseProtocols}
                    />
                  </Box>

                  {/* Maturity Selection */}
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="body2"
                      sx={{ mb: 1.5, color: "text.secondary", fontWeight: 600 }}
                    >
                      Select Token Maturity
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      {[MATURITY_6M, MATURITY_12M].map((idx) => (
                        <Card
                          key={idx}
                          onClick={() => handleMaturitySelect(idx)}
                          sx={{
                            flex: 1,
                            p: 2,
                            cursor: "pointer",
                            border:
                              state.selectedMaturity === idx
                                ? "2px solid #f97316"
                                : "1px solid #374151",
                            backgroundColor:
                              state.selectedMaturity === idx
                                ? "#1f293722"
                                : "transparent",
                            transition: "all 0.2s",
                            "&:hover": {
                              backgroundColor: "#1f293722",
                              borderColor: "#f97316",
                            },
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: "bold",
                              color: "#f97316",
                              mb: 0.5,
                            }}
                          >
                            {idx === MATURITY_6M ? "6-Month" : "12-Month"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Expires: {formatMaturityLabel(maturities[idx])}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mt: 0.5 }}
                          >
                            {daysRemaining[idx]} days remaining
                          </Typography>
                        </Card>
                      ))}
                    </Stack>
                    {selectedDays < 30 && selectedDays > 0 && (
                      <Alert severity="warning" sx={{ mt: 2 }}>
                        ⏰ This maturity has less than 30 days remaining
                      </Alert>
                    )}
                    {selectedDays <= 0 && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        ❌ This maturity has expired
                      </Alert>
                    )}
                  </Box>

                  {/* From Token */}
                  <Box sx={{ mb: 1.5 }}>
                    <CompactTokenSelector
                      label="From"
                      selectedToken={inputToken}
                      onTokenChange={setInputToken}
                      availableTokens={inputTokens}
                      amount={state.inputAmount}
                      onAmountChange={handleInputAmountChange}
                      placeholder="0"
                      helperText="$0"
                    />
                  </Box>

                  {/* Fund Drained Warning */}
                  {isDrained && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      Coverage fund fully drained - minting disabled for this
                      maturity. Please select a different maturity or protocol.
                    </Alert>
                  )}

                  {/* Output Tokens */}
                  <Box sx={{ mb: 2.5, mt: 2.5 }}>
                    <Typography
                      variant="body2"
                      sx={{ mb: 1.5, color: "text.secondary", fontWeight: 600 }}
                    >
                      You Will Receive
                    </Typography>

                    {/* Insurance Token */}
                    <Card
                      sx={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #4b5563",
                        borderRadius: "12px",
                        mb: 2,
                      }}
                    >
                      <CardContent
                        sx={{
                          p: 2,
                          "&:last-child": { pb: 2 },
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            flex: 1,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "1.2rem",
                              width: 32,
                              height: 32,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "50%",
                              backgroundColor: "#374151",
                            }}
                          >
                            🛡️
                          </Typography>
                          <Box>
                            <Typography
                              variant="body1"
                              sx={{
                                fontWeight: "bold",
                                color: "text.primary",
                                mb: 0,
                              }}
                            >
                              {selectedProtocol.title} Insurance Token
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Provides coverage protection
                            </Typography>
                          </Box>
                        </Box>
                        <Typography
                          variant="h6"
                          color="text.primary"
                          sx={{ fontWeight: "bold" }}
                        >
                          {formatDisplay(itDisplayAmount)}
                        </Typography>
                      </CardContent>
                    </Card>

                    {/* Principal Token */}
                    <Card
                      sx={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #4b5563",
                        borderRadius: "12px",
                      }}
                    >
                      <CardContent
                        sx={{
                          p: 2,
                          "&:last-child": { pb: 2 },
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            flex: 1,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "1.2rem",
                              width: 32,
                              height: 32,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "50%",
                              backgroundColor: "#374151",
                            }}
                          >
                            💎
                          </Typography>
                          <Box>
                            <Typography
                              variant="body1"
                              sx={{
                                fontWeight: "bold",
                                color: "text.primary",
                                mb: 0,
                              }}
                            >
                              {selectedProtocol.title} Principal Token
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Earns yield from premiums
                            </Typography>
                          </Box>
                        </Box>
                        <Typography
                          variant="h6"
                          color="text.primary"
                          sx={{ fontWeight: "bold" }}
                        >
                          {formatDisplay(ptDisplayAmount)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>

                  {/* Send to Another Address Toggle */}
                  <Box sx={mintStyles.addressToggleStyles}>
                    <Switch
                      checked={state.sendToAnotherAddress}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          sendToAnotherAddress: e.target.checked,
                        }))
                      }
                      size="small"
                    />
                    <Typography variant="body2" color="text.secondary">
                      Send to another address
                    </Typography>
                  </Box>

                  {/* Recipient Address Input */}
                  {state.sendToAnotherAddress && (
                    <Box sx={{ mt: 2, mb: 3 }}>
                      <TextField
                        fullWidth
                        placeholder="Enter recipient address"
                        value={state.recipientAddress}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            recipientAddress: e.target.value,
                          }))
                        }
                        slotProps={{
                          input: {
                            sx: commonStyles.inputFieldStyles,
                          },
                        }}
                      />
                    </Box>
                  )}

                  <Divider sx={{ my: 2.5, borderColor: "#374151" }} />

                  {/* Fee Information */}
                  <Stack spacing={0.5} sx={{ mb: 2.5 }}>
                    <Box sx={mintStyles.feeInfoStyles}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Protocol fee (0%)
                        </Typography>
                        <Info sx={{ fontSize: 16, color: "text.secondary" }} />
                      </Box>
                      <Typography variant="body2" color="text.primary">
                        {feeAmount} {inputToken.symbol}
                      </Typography>
                    </Box>

                    <Box sx={mintStyles.feeInfoStyles}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          You&apos;ll receive
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.primary">
                        IT: {formatDisplay(itDisplayAmount)} · PT:{" "}
                        {formatDisplay(ptDisplayAmount)}
                      </Typography>
                    </Box>
                    <Box sx={mintStyles.feeInfoStyles}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Impairment factor
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        color={isDrained ? "error" : "text.primary"}
                        sx={{ fontWeight: isDrained ? 600 : 400 }}
                      >
                        {isDrained
                          ? "DRAINED"
                          : `${formatDisplay(impairmentFactor)}x`}
                      </Typography>
                    </Box>

                    <Box sx={mintStyles.feeInfoStyles}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <AccessTime
                          sx={{ fontSize: 16, color: "text.secondary" }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          ~ 1 min 0 sec
                        </Typography>
                      </Box>
                    </Box>
                  </Stack>

                  {/* Action Button */}
                  {!isConnected ? (
                    <Button
                      fullWidth
                      variant="contained"
                      sx={mintStyles.connectButtonStyles}
                    >
                      Connect wallet
                    </Button>
                  ) : (
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleMintWithApproval}
                      disabled={
                        !state.inputAmount ||
                        parseFloat(state.inputAmount) <= 0 ||
                        isMinting ||
                        state.isProcessing ||
                        selectedDays <= 0 ||
                        isDrained
                      }
                      sx={mintStyles.connectButtonStyles}
                    >
                      {isDrained ? (
                        "Fund Drained - Minting Disabled"
                      ) : isMinting || state.isProcessing ? (
                        <>
                          <CircularProgress size={20} sx={{ mr: 1 }} />
                          {!hasAllowance
                            ? "Approving & Minting..."
                            : "Processing..."}
                        </>
                      ) : (
                        `Mint ${
                          state.selectedMaturity === MATURITY_6M
                            ? "6-Month"
                            : "12-Month"
                        } Tokens`
                      )}
                    </Button>
                  )}

                  {/* Additional Info */}
                  {isConnected && (
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        textAlign: "center",
                        color: "text.secondary",
                        mt: 2,
                      }}
                    >
                      Make sure you have enough balance and gas fees
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
