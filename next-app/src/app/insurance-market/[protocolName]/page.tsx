"use client";

import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  Divider,
} from "@mui/material";
import {
  ArrowBack,
  TrendingUp,
  AccountBalance,
  Star,
  Security,
} from "@mui/icons-material";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import * as commonStyles from "@/styles/commonStyles";

// Mock order book data - in real app, this would come from API
const mockOrderBook = {
  sells: [
    { rate: "26.90%", size: "551.59 IT", total: "148.37 IT" },
    { rate: "26.77%", size: "401.72 IT", total: "549.96 IT" },
    { rate: "22.00%", size: "721,466.57 IT", total: "722,016.53 IT" },
    { rate: "21.00%", size: "90,274.17 IT", total: "812,290.70 IT" },
    { rate: "17.10%", size: "643,937.42 IT", total: "1,456,228.12 IT" },
  ],
  buys: [
    { rate: "27.00%", size: "10,261.24 IT", total: "10,261.24 IT" },
    { rate: "28.43%", size: "15,733.32 IT", total: "25,994.56 IT" },
    { rate: "28.69%", size: "20,982.34 IT", total: "46,976.90 IT" },
    { rate: "28.96%", size: "15,740.31 IT", total: "62,717.21 IT" },
    { rate: "40.00%", size: "2,488.98 IT", total: "65,206.19 IT" },
  ],
};

// Mock insurance data - match with your main listings
interface InsuranceData {
  title: string;
  provider: string;
  protocol: string;
  currentRate: string;
  isNew: boolean;
}

const getInsuranceData = (protocolName: string): InsuranceData | undefined => {
  const insuranceMap: { [key: string]: InsuranceData } = {
    sushiswap: {
      title: "SushiSwap",
      provider: "SushiSwap Insurance Token",
      protocol: "exchange",
      currentRate: "26.98%",
      isNew: true,
    },
    "curve-finance": {
      title: "Curve Finance",
      provider: "Curve Finance Insurance Token",
      protocol: "defi",
      currentRate: "25.45%",
      isNew: false,
    },
    aave: {
      title: "Aave",
      provider: "Aave Insurance Token",
      protocol: "lending",
      currentRate: "24.12%",
      isNew: false,
    },
    "uniswap-v3": {
      title: "Uniswap V3",
      provider: "Uniswap Insurance Token",
      protocol: "exchange",
      currentRate: "28.76%",
      isNew: false,
    },
    compound: {
      title: "Compound",
      provider: "Compound Insurance Token",
      protocol: "lending",
      currentRate: "23.89%",
      isNew: false,
    },
    makerdao: {
      title: "MakerDAO",
      provider: "MakerDAO Insurance Token",
      protocol: "defi",
      currentRate: "22.34%",
      isNew: false,
    },
  };

  return insuranceMap[protocolName];
};

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
      return "#14b8a6";
    case "lending":
      return "#3b82f6";
    case "exchange":
      return "#f59e0b";
    default:
      return "#14b8a6";
  }
};

export default function InsuranceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const protocolName = params?.protocolName as string;

  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");

  const insuranceData = getInsuranceData(protocolName);

  if (!insuranceData) {
    return (
      <Box sx={commonStyles.pageContainerStyles}>
        <Container maxWidth="lg">
          <Typography variant="h4" color="text.primary">
            Insurance listing not found
          </Typography>
        </Container>
      </Box>
    );
  }

  const handleBackClick = () => {
    router.push("/insurance-market");
  };

  const handleTradeTypeChange = (type: "buy" | "sell") => {
    setTradeType(type);
  };

  return (
    <Box sx={commonStyles.pageContainerStyles}>
      <Container maxWidth="xl">
        {/* Back Button */}
        <Button
          startIcon={<ArrowBack />}
          onClick={handleBackClick}
          sx={{ mb: 3, color: "text.secondary" }}
        >
          Back to Insurance Market
        </Button>

        {/* Header with Insurance Info */}
        <Card sx={{ ...commonStyles.cardStyles, mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Avatar
                sx={{
                  bgcolor: getProtocolColor(insuranceData.protocol),
                  width: 64,
                  height: 64,
                }}
              >
                {getProtocolIcon(insuranceData.protocol)}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}
                >
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: "bold", color: "text.primary" }}
                  >
                    {insuranceData.title}
                  </Typography>
                  {insuranceData.isNew && (
                    <Chip
                      label="New"
                      size="small"
                      sx={{
                        backgroundColor: "#d1fae5",
                        color: "#065f46",
                        fontSize: "0.75rem",
                      }}
                    />
                  )}
                </Box>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  {insuranceData.provider}
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    color: getProtocolColor(insuranceData.protocol),
                    fontWeight: "bold",
                  }}
                >
                  Current Rate: {insuranceData.currentRate}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Main Trading Interface */}
        <Box sx={{ display: "flex", gap: 3 }}>
          {/* Order Book */}
          <Card sx={{ ...commonStyles.cardStyles, flex: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="h5"
                sx={{ mb: 3, fontWeight: "bold", color: "text.primary" }}
              >
                Order Book
              </Typography>

              <Box sx={{ display: "flex", gap: 3 }}>
                {/* Sell Orders */}
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="h6"
                    sx={{ mb: 2, color: "#ef4444", fontWeight: "bold" }}
                  >
                    SELL ORDERS
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell
                            sx={{ color: "text.secondary", fontWeight: "bold" }}
                          >
                            Rate
                          </TableCell>
                          <TableCell
                            sx={{ color: "text.secondary", fontWeight: "bold" }}
                          >
                            Size
                          </TableCell>
                          <TableCell
                            sx={{ color: "text.secondary", fontWeight: "bold" }}
                          >
                            Total
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {mockOrderBook.sells.map((order, index) => (
                          <TableRow
                            key={index}
                            sx={{ "&:hover": { backgroundColor: "#1f2937" } }}
                          >
                            <TableCell
                              sx={{ color: "#ef4444", fontWeight: "600" }}
                            >
                              {order.rate}
                            </TableCell>
                            <TableCell sx={{ color: "text.primary" }}>
                              {order.size}
                            </TableCell>
                            <TableCell sx={{ color: "text.secondary" }}>
                              {order.total}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>

                <Divider orientation="vertical" flexItem />

                {/* Buy Orders */}
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="h6"
                    sx={{ mb: 2, color: "#10b981", fontWeight: "bold" }}
                  >
                    BUY ORDERS
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell
                            sx={{ color: "text.secondary", fontWeight: "bold" }}
                          >
                            Rate
                          </TableCell>
                          <TableCell
                            sx={{ color: "text.secondary", fontWeight: "bold" }}
                          >
                            Size
                          </TableCell>
                          <TableCell
                            sx={{ color: "text.secondary", fontWeight: "bold" }}
                          >
                            Total
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {mockOrderBook.buys.map((order, index) => (
                          <TableRow
                            key={index}
                            sx={{ "&:hover": { backgroundColor: "#1f2937" } }}
                          >
                            <TableCell
                              sx={{ color: "#10b981", fontWeight: "600" }}
                            >
                              {order.rate}
                            </TableCell>
                            <TableCell sx={{ color: "text.primary" }}>
                              {order.size}
                            </TableCell>
                            <TableCell sx={{ color: "text.secondary" }}>
                              {order.total}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Trading Panel */}
          <Card sx={{ ...commonStyles.cardStyles, flex: 1, minWidth: "400px" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="h5"
                sx={{ mb: 3, fontWeight: "bold", color: "text.primary" }}
              >
                Trade Insurance Tokens
              </Typography>

              {/* Buy/Sell Toggle */}
              <Box
                sx={{
                  display: "flex",
                  mb: 3,
                  backgroundColor: "#1f2937",
                  borderRadius: "12px",
                  p: "4px",
                }}
              >
                <Button
                  fullWidth
                  variant={tradeType === "buy" ? "contained" : "text"}
                  onClick={() => handleTradeTypeChange("buy")}
                  sx={{
                    borderRadius: "8px",
                    backgroundColor:
                      tradeType === "buy" ? "#10b981" : "transparent",
                    color: tradeType === "buy" ? "white" : "text.secondary",
                    "&:hover": {
                      backgroundColor:
                        tradeType === "buy" ? "#059669" : "#374151",
                    },
                  }}
                >
                  Buy IT
                </Button>
                <Button
                  fullWidth
                  variant={tradeType === "sell" ? "contained" : "text"}
                  onClick={() => handleTradeTypeChange("sell")}
                  sx={{
                    borderRadius: "8px",
                    backgroundColor:
                      tradeType === "sell" ? "#ef4444" : "transparent",
                    color: tradeType === "sell" ? "white" : "text.secondary",
                    "&:hover": {
                      backgroundColor:
                        tradeType === "sell" ? "#dc2626" : "#374151",
                    },
                  }}
                >
                  Sell IT
                </Button>
              </Box>

              {/* Input Fields */}
              <Stack spacing={3}>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ mb: 1, color: "text.secondary" }}
                  >
                    Amount (IT)
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    slotProps={{
                      input: {
                        sx: commonStyles.inputFieldStyles,
                      },
                    }}
                  />
                </Box>

                <Box>
                  <Typography
                    variant="body2"
                    sx={{ mb: 1, color: "text.secondary" }}
                  >
                    Price (%)
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    slotProps={{
                      input: {
                        sx: commonStyles.inputFieldStyles,
                      },
                    }}
                  />
                </Box>

                <Box
                  sx={{ p: 2, backgroundColor: "#1f2937", borderRadius: "8px" }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Total Cost:
                    </Typography>
                    <Typography variant="body2" color="text.primary">
                      {amount && price
                        ? (
                            (parseFloat(amount) * parseFloat(price)) /
                            100
                          ).toFixed(2)
                        : "0.00"}{" "}
                      ETH
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Balance:
                    </Typography>
                    <Typography variant="body2" color="text.primary">
                      0 ETH
                    </Typography>
                  </Box>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{
                    backgroundColor:
                      tradeType === "buy" ? "#10b981" : "#ef4444",
                    color: "white",
                    fontWeight: "bold",
                    py: 1.5,
                    "&:hover": {
                      backgroundColor:
                        tradeType === "buy" ? "#059669" : "#dc2626",
                    },
                  }}
                >
                  {tradeType === "buy" ? "Buy" : "Sell"} Insurance Tokens
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  sx={{
                    borderColor: "#4b5563",
                    color: "text.secondary",
                    "&:hover": {
                      borderColor: "#6b7280",
                      backgroundColor: "#1f2937",
                    },
                  }}
                >
                  Connect Wallet
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </Box>
  );
}
