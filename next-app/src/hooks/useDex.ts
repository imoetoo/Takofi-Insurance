import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWatchContractEvent,
  usePublicClient,
} from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { Address, parseUnits, formatUnits } from "viem";
import { useState, useEffect, useCallback } from "react";

const DEX_ABI = [
  {
    inputs: [
      { internalType: "uint8", name: "action", type: "uint8" },
      { internalType: "address", name: "base", type: "address" },
      { internalType: "address", name: "quote", type: "address" },
      { internalType: "uint256", name: "baseAmount", type: "uint256" },
      { internalType: "uint256", name: "price", type: "uint256" },
    ],
    name: "placeLimit",
    outputs: [{ internalType: "uint256", name: "orderId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "orderId", type: "uint256" }],
    name: "cancel",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "orderId", type: "uint256" },
      { internalType: "uint256", name: "baseAmount", type: "uint256" },
    ],
    name: "takeOrder",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "base", type: "address" },
      { internalType: "address", name: "quote", type: "address" },
    ],
    name: "getList",
    outputs: [
      { internalType: "uint256[]", name: "", type: "uint256[]" },
      { internalType: "uint256[]", name: "", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "orderId", type: "uint256" }],
    name: "getOrder",
    outputs: [
      { internalType: "uint256", name: "id", type: "uint256" },
      { internalType: "address", name: "trader", type: "address" },
      { internalType: "uint8", name: "action", type: "uint8" },
      { internalType: "address", name: "base", type: "address" },
      { internalType: "address", name: "quote", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint256", name: "filled", type: "uint256" },
      { internalType: "uint256", name: "price", type: "uint256" },
      { internalType: "uint256", name: "ts", type: "uint256" },
      { internalType: "bool", name: "active", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "trader", type: "address" },
      { internalType: "address", name: "base", type: "address" },
      { internalType: "address", name: "quote", type: "address" },
    ],
    name: "getOrdersByTrader",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "base", type: "address" },
      { internalType: "address", name: "quote", type: "address" },
      { internalType: "uint8", name: "action", type: "uint8" },
    ],
    name: "getBestPrice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "id", type: "uint256" },
      {
        indexed: false,
        internalType: "address",
        name: "trader",
        type: "address",
      },
      { indexed: false, internalType: "uint8", name: "action", type: "uint8" },
      {
        indexed: false,
        internalType: "address",
        name: "base",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "quote",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "price",
        type: "uint256",
      },
    ],
    name: "NewOrder",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "takerId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "makerId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "baseAmount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "quoteAmount",
        type: "uint256",
      },
    ],
    name: "OrderFilled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "orderId",
        type: "uint256",
      },
    ],
    name: "OrderCancelled",
    type: "event",
  },
] as const;

export type OrderType = "buy" | "sell";
export type OrderAction = 0 | 1; // 0 for BUY, 1 for SELL

export interface Order {
  id: bigint;
  trader: Address;
  action: OrderAction;
  base: Address;
  quote: Address;
  amount: bigint;
  filled: bigint;
  price: bigint;
  ts: bigint;
  active: boolean;
}

// Type for the raw contract return value from getOrder
type GetOrderResult = readonly [
  bigint, // id
  Address, // trader
  number, // action
  Address, // base
  Address, // quote
  bigint, // amount
  bigint, // filled
  bigint, // price
  bigint, // ts
  boolean // active
];

interface UseDexProps {
  dexAddress: Address;
  baseToken: Address; // Insurance Token
  quoteToken: Address; // USDT or USDC
}

export const PRICE_PRECISION = BigInt(10 ** 18);

export function useDex({ dexAddress, baseToken, quoteToken }: UseDexProps) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const [orderBook, setOrderBook] = useState<{
    buyOrders: Order[];
    sellOrders: Order[];
  }>({
    buyOrders: [],
    sellOrders: [],
  });
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Get order book lists (buy and sell order IDs)
  // Get order book lists (buy and sell order IDs)
  const { data: orderLists, refetch: refetchOrderLists } = useReadContract({
    address: dexAddress,
    abi: DEX_ABI,
    functionName: "getList",
    args: [baseToken, quoteToken],
  });

  // Get user's orders
  const { data: userOrderIds, refetch: refetchUserOrders } = useReadContract({
    address: dexAddress,
    abi: DEX_ABI,
    functionName: "getOrdersByTrader",
    args: address ? [address, baseToken, quoteToken] : undefined,
    query: { enabled: !!address },
  });

  // Get best prices
  // Note: For market orders:
  // - To BUY, we need the lowest SELL price (action=1)
  // - To SELL, we need the highest BUY price (action=0)
  const { data: bestBuyPrice } = useReadContract({
    address: dexAddress,
    abi: DEX_ABI,
    functionName: "getBestPrice",
    args: [baseToken, quoteToken, 1], // 1 for SELL orders (best ask for buyers)
  });

  const { data: bestSellPrice } = useReadContract({
    address: dexAddress,
    abi: DEX_ABI,
    functionName: "getBestPrice",
    args: [baseToken, quoteToken, 0], // 0 for BUY orders (best bid for sellers)
  });

  // Watch for new orders
  useWatchContractEvent({
    address: dexAddress,
    abi: DEX_ABI,
    eventName: "NewOrder",
    onLogs: async () => {
      await refetchOrderLists();
      if (address) await refetchUserOrders();
      setRefreshTrigger((prev) => prev + 1);
    },
  });

  // Watch for order fills
  useWatchContractEvent({
    address: dexAddress,
    abi: DEX_ABI,
    eventName: "OrderFilled",
    onLogs: async () => {
      await refetchOrderLists();
      if (address) await refetchUserOrders();
      setRefreshTrigger((prev) => prev + 1); // Force order book reload
    },
  });

  // Watch for order cancellations
  useWatchContractEvent({
    address: dexAddress,
    abi: DEX_ABI,
    eventName: "OrderCancelled",
    onLogs: async () => {
      await refetchOrderLists();
      if (address) await refetchUserOrders();
      setRefreshTrigger((prev) => prev + 1);
    },
  });

  // Watch for order cancellations
  useWatchContractEvent({
    address: dexAddress,
    abi: DEX_ABI,
    eventName: "OrderCancelled",
    onLogs: async () => {
      await refetchOrderLists();
      if (address) await refetchUserOrders();
      setRefreshTrigger((prev) => prev + 1);
    },
  });

  // Fetch full order details using viem
  const fetchOrderDetails = useCallback(
    async (orderIds: readonly bigint[]): Promise<Order[]> => {
      if (!orderIds || orderIds.length === 0) return [];

      const orders: Order[] = [];

      // Import necessary functions dynamically
      const { createPublicClient, http } = await import("viem");
      const { localhost } = await import("viem/chains");

      const client = createPublicClient({
        chain: localhost,
        transport: http(),
      });

      for (const orderId of orderIds) {
        try {
          const result = (await client.readContract({
            address: dexAddress,
            abi: DEX_ABI,
            functionName: "getOrder",
            args: [orderId],
          })) as GetOrderResult;

          if (result && result[9]) {
            // Check if active
            orders.push({
              id: result[0],
              trader: result[1],
              action: result[2] as OrderAction,
              base: result[3],
              quote: result[4],
              amount: result[5],
              filled: result[6],
              price: result[7],
              ts: result[8],
              active: result[9],
            });
          }
        } catch (error) {
          console.error(`Failed to fetch order ${orderId}:`, error);
        }
      }
      return orders;
    },
    [dexAddress]
  );

  // Load order book details
  useEffect(() => {
    let mounted = true;

    const loadOrderBook = async () => {
      if (!orderLists) return;

      const [buyIds, sellIds] = orderLists;
      const [buyOrders, sellOrders] = await Promise.all([
        fetchOrderDetails(buyIds),
        fetchOrderDetails(sellIds),
      ]);

      if (mounted) {
        setOrderBook({ buyOrders, sellOrders });
      }
    };

    loadOrderBook();

    return () => {
      mounted = false;
    };
  }, [orderLists, fetchOrderDetails, refreshTrigger]); // Added refreshTrigger

  // Load user orders
  useEffect(() => {
    let mounted = true;

    const loadUserOrders = async () => {
      if (!userOrderIds || !address) return;
      const orders = await fetchOrderDetails(userOrderIds);
      if (mounted) {
        setUserOrders(orders);
      }
    };

    loadUserOrders();

    return () => {
      mounted = false;
    };
  }, [userOrderIds, address, fetchOrderDetails, refreshTrigger]); // Added refreshTrigger

  // Place limit order
  const placeOrder = async (
    action: OrderType,
    amount: string,
    price: string
  ) => {
    if (!address) throw new Error("Wallet not connected");
    if (!publicClient) throw new Error("Public client not available");

    setIsLoading(true);
    try {
      const actionType: OrderAction = action === "buy" ? 0 : 1;
      const amountBigInt = parseUnits(amount, 18);
      const priceBigInt = parseUnits(price, 18);

      const hash = await writeContractAsync({
        address: dexAddress,
        abi: DEX_ABI,
        functionName: "placeLimit",
        args: [actionType, baseToken, quoteToken, amountBigInt, priceBigInt],
      });

      // Wait for transaction confirmation
      await publicClient.waitForTransactionReceipt({ hash });

      return hash;
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel order
  const cancelOrder = async (orderId: bigint) => {
    if (!address) throw new Error("Wallet not connected");
    if (!publicClient) throw new Error("Public client not available");

    setIsLoading(true);
    try {
      const hash = await writeContractAsync({
        address: dexAddress,
        abi: DEX_ABI,
        functionName: "cancel",
        args: [orderId],
      });

      // Wait for transaction confirmation
      await publicClient.waitForTransactionReceipt({ hash });

      return hash;
    } finally {
      setIsLoading(false);
    }
  };

  // Take an existing order
  const takeOrder = async (orderId: bigint, amount: string) => {
    if (!address) throw new Error("Wallet not connected");
    if (!publicClient) throw new Error("Public client not available");

    setIsLoading(true);
    try {
      const amountBigInt = parseUnits(amount, 18);

      const hash = await writeContractAsync({
        address: dexAddress,
        abi: DEX_ABI,
        functionName: "takeOrder",
        args: [orderId, amountBigInt],
      });

      // Wait for transaction confirmation
      await publicClient.waitForTransactionReceipt({ hash });

      return hash;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    orderBook,
    userOrders,
    bestBuyPrice: bestBuyPrice ? formatUnits(bestBuyPrice, 18) : "0",
    bestSellPrice: bestSellPrice ? formatUnits(bestSellPrice, 18) : "0",
    placeOrder,
    cancelOrder,
    takeOrder,
    isLoading,
    refetch: async () => {
      await queryClient.invalidateQueries();
      await Promise.all([
        refetchOrderLists(),
        address ? refetchUserOrders() : Promise.resolve(),
      ]);
      setRefreshTrigger((prev) => prev + 1);
    },
  };
}
