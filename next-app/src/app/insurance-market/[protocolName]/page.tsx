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
  Chip,
  Divider,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Tab,
  Tabs,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { ArrowBack, Refresh } from "@mui/icons-material";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import Image from "next/image";
import * as commonStyles from "@/styles/commonStyles";
import { useDex, Order, PRICE_PRECISION } from "@/hooks/useDex";
import { useERC20 } from "@/hooks/useERC20";
import { useInsuranceMarketMetrics } from "@/hooks/useTokenMinting";
import {
  parseInsuranceMetrics,
  formatAnnualFee,
} from "@/utils/insuranceCalculations";
import {
  DEX_CONTRACT_ADDRESS,
  USDT_ADDRESS,
  USDC_ADDRESS,
  PROTOCOL_TOKENS,
} from "@/constants";

// Mock insurance data - match with your main listings
interface InsuranceData {
  title: string;
  provider: string;
  protocol: string;
  isNew: boolean;
}

const getInsuranceData = (protocolName: string): InsuranceData | undefined => {
  const insuranceMap: { [key: string]: InsuranceData } = {
    sushiswap: {
      title: "SushiSwap",
      provider: "SushiSwap Insurance Token",
      protocol: "exchange",
      isNew: true,
    },
    "curve-finance": {
      title: "Curve Finance",
      provider: "Curve Finance Insurance Token",
      protocol: "defi",
      isNew: false,
    },
    aave: {
      title: "Aave",
      provider: "Aave Insurance Token",
      protocol: "lending",
      isNew: false,
    },
    "uniswap-v3": {
      title: "Uniswap V3",
      provider: "Uniswap Insurance Token",
      protocol: "exchange",
      isNew: false,
    },
    compound: {
      title: "Compound",
      provider: "Compound Insurance Token",
      protocol: "lending",
      isNew: false,
    },
    pancakeswap: {
      title: "PancakeSwap",
      provider: "PancakeSwap Insurance Token",
      protocol: "exchange",
      isNew: false,
    },
  };

  return insuranceMap[protocolName];
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
  const { address, isConnected } = useAccount();

  // State for trading
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [stablecoin, setStablecoin] = useState<"USDT" | "USDC">("USDT");
  const [orderType, setOrderType] = useState<"market" | "limit">("limit");
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const insuranceData = getInsuranceData(protocolName);

  // Fetch dynamic annual fee percentage
  const { data: metrics, isLoading: isMetricsLoading } =
    useInsuranceMarketMetrics(insuranceData?.title || protocolName);
  const { annualFeePercentage } = metrics
    ? parseInsuranceMetrics(metrics)
    : { annualFeePercentage: 0 };

  // Get token addresses
  const insuranceTokenAddress =
    PROTOCOL_TOKENS[protocolName as keyof typeof PROTOCOL_TOKENS]
      ?.insuranceToken;
  const quoteTokenAddress = stablecoin === "USDT" ? USDT_ADDRESS : USDC_ADDRESS;

  // Use DEX hook
  const {
    orderBook,
    userOrders,
    bestBuyPrice,
    bestSellPrice,
    placeOrder,
    cancelOrder,
    takeOrder,
    isLoading: isDexLoading,
    refetch: refetchDex,
  } = useDex({
    dexAddress: DEX_CONTRACT_ADDRESS,
    baseToken: insuranceTokenAddress || ("0x0" as `0x${string}`),
    quoteToken: quoteTokenAddress,
  });

  // Use ERC20 hooks for approvals
  const {
    balance: insuranceBalance,
    allowance: insuranceAllowance,
    approve: approveInsurance,
  } = useERC20(
    insuranceTokenAddress || ("0x0" as `0x${string}`),
    address,
    DEX_CONTRACT_ADDRESS
  );

  const {
    balance: stablecoinBalance,
    allowance: stablecoinAllowance,
    approve: approveStablecoin,
  } = useERC20(quoteTokenAddress, address, DEX_CONTRACT_ADDRESS);

  // Auto-fill price with best available
  useEffect(() => {
    if (orderType === "market") {
      const bestPrice = tradeType === "buy" ? bestSellPrice : bestBuyPrice;
      if (bestPrice && bestPrice !== "0") {
        setPrice(bestPrice);
      }
    }
  }, [orderType, tradeType, bestBuyPrice, bestSellPrice]);

  if (!insuranceData || !insuranceTokenAddress) {
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
    setAmount("");
    setPrice("");
    setError("");
  };

  const handleStablecoinToggle = () => {
    setStablecoin((prev) => (prev === "USDT" ? "USDC" : "USDT"));
    setAmount("");
    setPrice("");
    setError("");
  };

  const handlePlaceOrder = async () => {
    setError("");
    setSuccess("");

    if (!isConnected) {
      setError("Please connect your wallet");
      return;
    }

    if (!amount || !price) {
      setError("Please enter amount and price");
      return;
    }

    try {
      // Check and approve if needed
      const amountBigInt = parseUnits(amount, 18); // IT amount (18 decimals)
      const priceBigInt = parseUnits(price, 18); // Price scaled by 1e18

      // Calculate required quote tokens (USDT/USDC with 6 decimals)
      // Formula: (IT_amount * price) / PRICE_PRECISION / 1e12 = quote_amount in 6 decimals
      const quoteDecimals = 6; // USDT/USDC decimals
      const requiredQuote =
        (amountBigInt * priceBigInt) / PRICE_PRECISION / BigInt(1e12);

      console.log(
        "Debug - Amount (IT):",
        amount,
        "BigInt:",
        amountBigInt.toString()
      );
      console.log("Debug - Price:", price, "BigInt:", priceBigInt.toString());
      console.log("Debug - Required Quote:", requiredQuote.toString());
      console.log("Debug - Stablecoin Balance:", stablecoinBalance.toString());
      console.log(
        "Debug - Stablecoin Allowance:",
        stablecoinAllowance.toString()
      );

      if (tradeType === "sell") {
        // Selling IT: need IT approval
        if (insuranceAllowance < amountBigInt) {
          setSuccess("Approving Insurance Token...");
          await approveInsurance(amountBigInt);
        }
      } else {
        // Buying IT: need stablecoin approval
        if (stablecoinAllowance < requiredQuote) {
          setSuccess(`Approving ${stablecoin}...`);
          await approveStablecoin(requiredQuote);
        }

        // Check if user has enough balance
        if (stablecoinBalance < requiredQuote) {
          throw new Error(
            `Insufficient ${stablecoin} balance. Need ${formatUnits(
              requiredQuote,
              quoteDecimals
            )} but have ${formatUnits(stablecoinBalance, quoteDecimals)}`
          );
        }
      }

      setSuccess("Placing order...");
      await placeOrder(tradeType, amount, price);
      setSuccess("Order placed successfully!");
      setAmount("");
      setPrice("");

      // Trigger refetch after short delay
      setTimeout(async () => {
        await refetchDex();
        setSuccess("");
      }, 500);
    } catch (err) {
      console.error("Order error:", err);
      setError(err instanceof Error ? err.message : "Failed to place order");
    }
  };

  const handleCancelOrder = async (orderId: bigint) => {
    setError("");
    try {
      await cancelOrder(orderId);
      setSuccess("Order cancelled successfully!");

      setTimeout(async () => {
        await refetchDex();
        setSuccess("");
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel order");
    }
  };

  const handleTakeOrder = async (order: Order) => {
    setError("");
    setSuccess("");

    if (!isConnected) {
      setError("Please connect your wallet");
      return;
    }

    try {
      const remainingAmount = order.amount - order.filled;
      const amountToTake = remainingAmount;

      // Check and approve if needed
      if (order.action === 1) {
        // Order is SELL, so we need to BUY (pay with stablecoin)
        const requiredQuote =
          (amountToTake * order.price) / BigInt(10 ** 18) / BigInt(1e12);
        if (stablecoinAllowance < requiredQuote) {
          setSuccess(`Approving ${stablecoin}...`);
          await approveStablecoin(requiredQuote);
        }
      } else {
        // Order is BUY, so we need to SELL (pay with IT)
        if (insuranceAllowance < amountToTake) {
          setSuccess("Approving Insurance Token...");
          await approveInsurance(amountToTake);
        }
      }

      setSuccess("Taking order...");
      await takeOrder(order.id, formatUnits(remainingAmount, 18));
      setSuccess("Order executed successfully!");

      setTimeout(async () => {
        await refetchDex();
        setSuccess("");
      }, 500);
    } catch (err) {
      console.error("Take order error:", err);
      setError(err instanceof Error ? err.message : "Failed to take order");
    }
  };

  const calculateTotal = () => {
    if (!amount || !price) return "0.00";
    return ((parseFloat(amount) * parseFloat(price)) / 1e18).toFixed(6);
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

        {/* Error/Success Messages */}
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

        {/* Header with Insurance Info */}
        <Card sx={{ ...commonStyles.cardStyles, mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
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
                    bgcolor: "background.paper",
                    border: "2px solid",
                    borderColor: "divider",
                  }}
                >
                  <Image
                    src={getProtocolLogo(insuranceData.title)}
                    alt={`${insuranceData.title} logo`}
                    width={48}
                    height={48}
                    style={{ objectFit: "contain" }}
                  />
                </Box>
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
                  <Box sx={{ mb: 1 }}>
                    <Typography
                      variant="h5"
                      sx={{
                        color: getProtocolColor(insuranceData.protocol),
                        fontWeight: "bold",
                      }}
                    >
                      Annual Coverage Fee:{" "}
                      {isMetricsLoading
                        ? "Loading..."
                        : formatAnnualFee(annualFeePercentage)}
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: "block" }}
                  >
                    {isMetricsLoading
                      ? "..."
                      : `${annualFeePercentage.toFixed(
                          4
                        )} ${stablecoin} per 1 ${stablecoin} coverage`}
                  </Typography>
                </Box>
              </Box>

              {/* Stablecoin Toggle */}
              <Tooltip
                title={`Switch to ${stablecoin === "USDT" ? "USDC" : "USDT"}`}
              >
                <IconButton
                  onClick={handleStablecoinToggle}
                  sx={{
                    bgcolor: stablecoin === "USDT" ? "#10b981" : "#3b82f6",
                    color: "white",
                    "&:hover": {
                      bgcolor: stablecoin === "USDT" ? "#059669" : "#2563eb",
                    },
                    width: 56,
                    height: 56,
                  }}
                >
                  <Typography variant="h6" fontWeight="bold">
                    {stablecoin}
                  </Typography>
                </IconButton>
              </Tooltip>
            </Box>
          </CardContent>
        </Card>

        {/* Tabs for Order Book and My Orders */}
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="Order Book" />
          <Tab label="My Orders" />
        </Tabs>

        {/* Main Trading Interface */}
        <Box sx={{ display: "flex", gap: 3 }}>
          {/* Order Book or My Orders */}
          <Card sx={{ ...commonStyles.cardStyles, flex: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 3,
                }}
              >
                <Typography
                  variant="h5"
                  sx={{ fontWeight: "bold", color: "text.primary" }}
                >
                  {activeTab === 0 ? "Order Book" : "My Orders"}
                </Typography>
                <IconButton onClick={refetchDex} size="small">
                  <Refresh />
                </IconButton>
              </Box>

              {activeTab === 0 ? (
                // Order Book View
                <Box sx={{ display: "flex", gap: 3 }}>
                  {/* Sell Orders */}
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{ mb: 2, color: "#ef4444", fontWeight: "bold" }}
                    >
                      SELL ORDERS ({orderBook.sellOrders.length})
                    </Typography>
                    <TableContainer sx={{ maxHeight: 400, overflow: "auto" }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell
                              sx={{
                                color: "text.secondary",
                                fontWeight: "bold",
                                bgcolor: "background.paper",
                                borderBottom: "2px solid",
                                borderColor: "divider",
                              }}
                            >
                              Price ({stablecoin})
                            </TableCell>
                            <TableCell
                              sx={{
                                color: "text.secondary",
                                fontWeight: "bold",
                                bgcolor: "background.paper",
                                borderBottom: "2px solid",
                                borderColor: "divider",
                              }}
                            >
                              Size (IT)
                            </TableCell>
                            <TableCell
                              sx={{
                                color: "text.secondary",
                                fontWeight: "bold",
                                bgcolor: "background.paper",
                                borderBottom: "2px solid",
                                borderColor: "divider",
                              }}
                            >
                              Action
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {orderBook.sellOrders.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={3}
                                align="center"
                                sx={{ color: "text.secondary" }}
                              >
                                No sell orders
                              </TableCell>
                            </TableRow>
                          ) : (
                            orderBook.sellOrders.map((order) => {
                              const remaining = order.amount - order.filled;
                              return (
                                <TableRow
                                  key={order.id.toString()}
                                  sx={{
                                    "&:hover": { backgroundColor: "#1f2937" },
                                    cursor: "pointer",
                                  }}
                                >
                                  <TableCell
                                    sx={{ color: "#ef4444", fontWeight: "600" }}
                                  >
                                    {parseFloat(
                                      formatUnits(order.price, 18)
                                    ).toFixed(6)}
                                  </TableCell>
                                  <TableCell sx={{ color: "text.primary" }}>
                                    {parseFloat(
                                      formatUnits(remaining, 18)
                                    ).toFixed(4)}
                                  </TableCell>
                                  <TableCell>
                                    {isConnected &&
                                      order.trader !== address && (
                                        <Button
                                          size="small"
                                          variant="contained"
                                          onClick={() => handleTakeOrder(order)}
                                          sx={{
                                            bgcolor: "#10b981",
                                            "&:hover": { bgcolor: "#059669" },
                                            fontSize: "0.75rem",
                                          }}
                                        >
                                          Buy
                                        </Button>
                                      )}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
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
                      BUY ORDERS ({orderBook.buyOrders.length})
                    </Typography>
                    <TableContainer sx={{ maxHeight: 400, overflow: "auto" }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell
                              sx={{
                                color: "text.secondary",
                                fontWeight: "bold",
                                bgcolor: "background.paper",
                                borderBottom: "2px solid",
                                borderColor: "divider",
                              }}
                            >
                              Price ({stablecoin})
                            </TableCell>
                            <TableCell
                              sx={{
                                color: "text.secondary",
                                fontWeight: "bold",
                                bgcolor: "background.paper",
                                borderBottom: "2px solid",
                                borderColor: "divider",
                              }}
                            >
                              Size (IT)
                            </TableCell>
                            <TableCell
                              sx={{
                                color: "text.secondary",
                                fontWeight: "bold",
                                bgcolor: "background.paper",
                                borderBottom: "2px solid",
                                borderColor: "divider",
                              }}
                            >
                              Action
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {orderBook.buyOrders.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={3}
                                align="center"
                                sx={{ color: "text.secondary" }}
                              >
                                No buy orders
                              </TableCell>
                            </TableRow>
                          ) : (
                            orderBook.buyOrders.map((order) => {
                              const remaining = order.amount - order.filled;
                              return (
                                <TableRow
                                  key={order.id.toString()}
                                  sx={{
                                    "&:hover": { backgroundColor: "#1f2937" },
                                    cursor: "pointer",
                                  }}
                                >
                                  <TableCell
                                    sx={{ color: "#10b981", fontWeight: "600" }}
                                  >
                                    {parseFloat(
                                      formatUnits(order.price, 18)
                                    ).toFixed(6)}
                                  </TableCell>
                                  <TableCell sx={{ color: "text.primary" }}>
                                    {parseFloat(
                                      formatUnits(remaining, 18)
                                    ).toFixed(4)}
                                  </TableCell>
                                  <TableCell>
                                    {isConnected &&
                                      order.trader !== address && (
                                        <Button
                                          size="small"
                                          variant="contained"
                                          onClick={() => handleTakeOrder(order)}
                                          sx={{
                                            bgcolor: "#ef4444",
                                            "&:hover": { bgcolor: "#dc2626" },
                                            fontSize: "0.75rem",
                                          }}
                                        >
                                          Sell
                                        </Button>
                                      )}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Box>
              ) : (
                // My Orders View
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell
                          sx={{ color: "text.secondary", fontWeight: "bold" }}
                        >
                          Type
                        </TableCell>
                        <TableCell
                          sx={{ color: "text.secondary", fontWeight: "bold" }}
                        >
                          Price ({stablecoin})
                        </TableCell>
                        <TableCell
                          sx={{ color: "text.secondary", fontWeight: "bold" }}
                        >
                          Amount (IT)
                        </TableCell>
                        <TableCell
                          sx={{ color: "text.secondary", fontWeight: "bold" }}
                        >
                          Filled
                        </TableCell>
                        <TableCell
                          sx={{ color: "text.secondary", fontWeight: "bold" }}
                        >
                          Status
                        </TableCell>
                        <TableCell
                          sx={{ color: "text.secondary", fontWeight: "bold" }}
                        >
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {userOrders.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            align="center"
                            sx={{ color: "text.secondary", py: 4 }}
                          >
                            No orders found
                          </TableCell>
                        </TableRow>
                      ) : (
                        userOrders.map((order) => (
                          <TableRow key={order.id.toString()}>
                            <TableCell>
                              <Chip
                                label={order.action === 0 ? "BUY" : "SELL"}
                                size="small"
                                sx={{
                                  bgcolor:
                                    order.action === 0 ? "#10b981" : "#ef4444",
                                  color: "white",
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ color: "text.primary" }}>
                              {parseFloat(formatUnits(order.price, 18)).toFixed(
                                6
                              )}
                            </TableCell>
                            <TableCell sx={{ color: "text.primary" }}>
                              {parseFloat(
                                formatUnits(order.amount, 18)
                              ).toFixed(4)}
                            </TableCell>
                            <TableCell sx={{ color: "text.primary" }}>
                              {parseFloat(
                                formatUnits(order.filled, 18)
                              ).toFixed(4)}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={order.active ? "Active" : "Closed"}
                                size="small"
                                color={order.active ? "success" : "default"}
                              />
                            </TableCell>
                            <TableCell>
                              {order.active && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => handleCancelOrder(order.id)}
                                  sx={{
                                    bgcolor: "#ef4444",
                                    color: "white",
                                    "&:hover": { bgcolor: "#dc2626" },
                                    fontSize: "0.75rem",
                                    fontWeight: "bold",
                                  }}
                                >
                                  Cancel
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
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

              {/* Order Type Dropdown */}
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel
                  id="order-type-label"
                  sx={{ color: "text.secondary" }}
                >
                  Order Type
                </InputLabel>
                <Select
                  labelId="order-type-label"
                  value={orderType}
                  label="Order Type"
                  onChange={(e) =>
                    setOrderType(e.target.value as "market" | "limit")
                  }
                  sx={{
                    ...commonStyles.inputFieldStyles,
                    "& .MuiSelect-select": {
                      py: 1.5,
                    },
                  }}
                >
                  <MenuItem value="limit">Limit Order</MenuItem>
                  <MenuItem value="market">Market Order</MenuItem>
                  <MenuItem value="stop-limit" disabled>
                    Stop-Limit Order (Coming Soon)
                  </MenuItem>
                  <MenuItem value="trailing-stop" disabled>
                    Trailing Stop (Coming Soon)
                  </MenuItem>
                </Select>
              </FormControl>

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
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    slotProps={{
                      input: {
                        sx: commonStyles.inputFieldStyles,
                      },
                    }}
                  />
                  {isConnected && (
                    <Typography variant="caption" color="text.secondary">
                      Max:{" "}
                      {tradeType === "sell"
                        ? parseFloat(formatUnits(insuranceBalance, 18)).toFixed(
                            4
                          )
                        : "∞"}{" "}
                      IT
                    </Typography>
                  )}
                </Box>

                <Box>
                  <Typography
                    variant="body2"
                    sx={{ mb: 1, color: "text.secondary" }}
                  >
                    Price ({stablecoin}/IT){" "}
                    {orderType === "market" && "(Best Available)"}
                  </Typography>
                  {orderType === "market" ? (
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: "#1f2937",
                        borderRadius: "8px",
                        border: "2px solid",
                        borderColor:
                          tradeType === "buy" ? "#10b981" : "#ef4444",
                      }}
                    >
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1 }}
                      >
                        Best Available Price
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{
                          color: tradeType === "buy" ? "#10b981" : "#ef4444",
                          fontWeight: "bold",
                        }}
                      >
                        {tradeType === "buy"
                          ? bestSellPrice !== "0"
                            ? `${parseFloat(bestSellPrice).toFixed(
                                6
                              )} ${stablecoin}`
                            : "No orders available"
                          : bestBuyPrice !== "0"
                          ? `${parseFloat(bestBuyPrice).toFixed(
                              6
                            )} ${stablecoin}`
                          : "No orders available"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {tradeType === "buy" ? "Best Ask" : "Best Bid"}
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <TextField
                        fullWidth
                        type="number"
                        placeholder="0.00"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        slotProps={{
                          input: {
                            sx: commonStyles.inputFieldStyles,
                          },
                        }}
                      />
                      {tradeType === "buy" && bestSellPrice !== "0" && (
                        <Typography variant="caption" color="#10b981">
                          Best Ask: {parseFloat(bestSellPrice).toFixed(6)}{" "}
                          {stablecoin}
                        </Typography>
                      )}
                      {tradeType === "sell" && bestBuyPrice !== "0" && (
                        <Typography variant="caption" color="#ef4444">
                          Best Bid: {parseFloat(bestBuyPrice).toFixed(6)}{" "}
                          {stablecoin}
                        </Typography>
                      )}
                    </>
                  )}
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
                      Total:
                    </Typography>
                    <Typography variant="body2" color="text.primary">
                      {calculateTotal()} {stablecoin}
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {tradeType === "buy" ? stablecoin : "IT"} Balance:
                    </Typography>
                    <Typography variant="body2" color="text.primary">
                      {isConnected
                        ? tradeType === "buy"
                          ? formatUnits(stablecoinBalance, 6)
                          : formatUnits(insuranceBalance, 18)
                        : "0.00"}
                    </Typography>
                  </Box>
                </Box>

                {isConnected ? (
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handlePlaceOrder}
                    disabled={isDexLoading || !amount || !price}
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
                      "&:disabled": {
                        backgroundColor: "#374151",
                        color: "#6b7280",
                      },
                    }}
                  >
                    {isDexLoading ? (
                      <CircularProgress size={24} />
                    ) : (
                      `Place ${tradeType === "buy" ? "Buy" : "Sell"} Order`
                    )}
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    variant="outlined"
                    size="large"
                    sx={{
                      borderColor: "#4b5563",
                      color: "text.secondary",
                      py: 1.5,
                      "&:hover": {
                        borderColor: "#6b7280",
                        backgroundColor: "#1f2937",
                      },
                    }}
                  >
                    Connect Wallet to Trade
                  </Button>
                )}

                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="caption" color="text.secondary">
                    Trading {insuranceData.title} IT with {stablecoin}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </Box>
  );
}
