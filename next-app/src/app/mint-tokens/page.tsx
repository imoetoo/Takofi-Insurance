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
} from "@mui/material";
import { AccessTime, Info } from "@mui/icons-material";
import { useState } from "react";
import CompactTokenSelector from "@/components/CompactTokenSelector";
import ProtocolSelector from "@/components/ProtocolSelector";
import * as commonStyles from "@/styles/commonStyles";
import * as mintStyles from "@/styles/mintTokensStyles";
import { insuranceListings } from "@/app/insurance-market/insuranceListings";

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

export default function MintTokens() {
  const [inputToken, setInputToken] = useState(inputTokens[0]);
  const [selectedProtocol, setSelectedProtocol] = useState(
    insuranceListings[0]
  );
  const [inputAmount, setInputAmount] = useState("");
  const [sendToAnotherAddress, setSendToAnotherAddress] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  // Handler for protocol change
  const handleProtocolChange = (protocol: (typeof insuranceListings)[0]) => {
    setSelectedProtocol(protocol);
  };

  const handleConnect = () => {
    setIsConnected(true);
  };

  const handleInputAmountChange = (value: string) => {
    setInputAmount(value);
  };

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
                      selectedProtocol={selectedProtocol}
                      onProtocolChange={handleProtocolChange}
                      protocols={insuranceListings}
                    />
                  </Box>

                  {/* From Token */}
                  <Box sx={{ mb: 1.5 }}>
                    <CompactTokenSelector
                      label="From"
                      selectedToken={inputToken}
                      onTokenChange={setInputToken}
                      availableTokens={inputTokens}
                      amount={inputAmount}
                      onAmountChange={handleInputAmountChange}
                      placeholder="0"
                      helperText="$0"
                    />
                  </Box>

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
                          {inputAmount || "0"}
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
                          {inputAmount || "0"}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>

                  {/* Send to Another Address Toggle */}
                  <Box sx={mintStyles.addressToggleStyles}>
                    <Switch
                      checked={sendToAnotherAddress}
                      onChange={(e) =>
                        setSendToAnotherAddress(e.target.checked)
                      }
                      size="small"
                    />
                    <Typography variant="body2" color="text.secondary">
                      Send to another address
                    </Typography>
                  </Box>

                  {/* Recipient Address Input */}
                  {sendToAnotherAddress && (
                    <Box sx={{ mt: 2, mb: 3 }}>
                      <TextField
                        fullWidth
                        placeholder="Enter recipient address"
                        value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
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
                          Total fee
                        </Typography>
                        <Info sx={{ fontSize: 16, color: "text.secondary" }} />
                      </Box>
                      <Typography variant="body2" color="text.primary">
                        $0
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

                  {/* Connect/Mint Button */}
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={isConnected ? undefined : handleConnect}
                    disabled={
                      isConnected &&
                      (!inputAmount || parseFloat(inputAmount) <= 0)
                    }
                    sx={mintStyles.connectButtonStyles}
                  >
                    {!isConnected
                      ? "Connect wallet"
                      : "Mint Insurance & Principal Tokens"}
                  </Button>

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
