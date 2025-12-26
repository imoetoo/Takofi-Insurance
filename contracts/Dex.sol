// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Dex is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    /**
     * @dev Price precision for all trading pairs
     * @notice Prices are scaled by 1e18 to handle extreme price ranges
     * Examples:
     * - 1 PEPE = 0.0000001 USDT → stored as 100000000000 (0.0000001 × 1e18)
     * - 1 BTC = 50000 USDT → stored as 50000000000000000000000 (50000 × 1e18)
     * - Price = (quoteAmount × PRICE_PRECISION) / baseAmount
     */
    uint256 private constant PRICE_PRECISION = 1e18; // Price scaling factor: price = actualPrice × 1e18 (supports 18 decimal places)

    // 0 for BUY, 1 for SELL
    enum actionType { BUY, SELL }

    // Order structure
    struct Order {
        uint256 id;            
        address trader;        // Address of the trader
        actionType action;     // BUY or SELL
        address base;          // Address of the base token: USDT/USDC
        address quote;         // Address of the quote token: USDT/USDC
        uint256 amount;        
        uint256 filled;        // Amount already filled 
        uint256 price;         // Price in quote/base (e.g., USDC per USDT)
        uint256 maturityIndex; // Maturity index (0 for 6M, 1 for 12M, etc.)
        uint256 ts;            // Timestamp of order creation
        // uint256 expiry;        // Expiry timestamp
        bool active;           
    }

    struct StopLimitOrder {
        uint256 id;
        address trader;
        actionType action;
        address base;
        address quote;
        uint256 amount;
        uint256 stopPrice;
        uint256 limitPrice;
        uint256 maturityIndex; // Maturity index
        uint256 ts;
        bool active;
        bool triggered;
    }

    struct OrderBook {
        uint256[] buyOrders;
        uint256[] sellOrders;
    }
    struct StopBook {
        uint256[] buyStops; 
        uint256[] sellStops;  
    }

    // State variables
    mapping(uint256 => Order) public orders;
    mapping(bytes32 => OrderBook) private books;
    mapping(uint256 => StopLimitOrder) public stopOrders;
    mapping(bytes32 => StopBook) private stopBooks;

    uint256 public nextStopOrderId;
    uint256 public nextOrderId;
    uint256 public feePercent;
    address public feeAccount; // Account that receives fees

    // Events
    event NewOrder(uint256 id, address trader, actionType action, address base, address quote, uint256 amount, uint256 price);
    event StopLimitPlaced(uint256 indexed id, address indexed trader, actionType action, address base, address quote, uint256 amount, uint256 stopPrice, uint256 limitPrice);
    event StopLimitTriggered(uint256 indexed id, uint256 newOrderId);
    event OrderFilled(uint256 takerId, uint256 makerId, uint256 baseAmount, uint256 quoteAmount);
    event OrderCancelled(uint256 indexed orderId);
    event OrderClosed(uint256 indexed orderId);
    event StopLimitCancelled(uint256 indexed id);
    event FeeAccountChanged(address indexed oldFeeAccount, address indexed newFeeAccount);
    event FeePercentChanged(uint256 oldFeePercent, uint256 newFeePercent);

    constructor(address _feeAccount, uint256 _feePercent) Ownable(msg.sender) {
        feeAccount = _feeAccount;
        feePercent = _feePercent;
        nextOrderId = 1;
        nextStopOrderId = 1;
    }

    // Admin functions
    
    /**
     * @dev Changes the fee account that receives trading fees
     * @param newFeeAccount The new fee account address
     */
    function setFeeAccount(address newFeeAccount) external onlyOwner {
        require(newFeeAccount != address(0), "Fee account cannot be zero address");
        address oldFeeAccount = feeAccount;
        feeAccount = newFeeAccount;
        emit FeeAccountChanged(oldFeeAccount, newFeeAccount);
    }
    
    /**
     * @dev Changes the fee percentage for trades
     * @param newFeePercent The new fee percentage in basis points (e.g., 100 = 1%)
     */
    function setFeePercent(uint256 newFeePercent) external onlyOwner {
        require(newFeePercent <= 1000, "Fee percent cannot exceed 10%"); // Max 10% fee
        uint256 oldFeePercent = feePercent;
        feePercent = newFeePercent;
        emit FeePercentChanged(oldFeePercent, newFeePercent);
    }

    // Key generation for order pairs (now includes maturity)
    function _pairKey(address base, address quote, uint256 maturityIndex) internal pure returns (bytes32) {
        return keccak256(abi.encode(base, quote, maturityIndex));
    }

    // call for orderlist: regarding the base and quote token and maturity
    function getList(address base, address quote, uint256 maturityIndex) external view returns (uint256[] memory, uint256[] memory) {
        bytes32 key = _pairKey(base, quote, maturityIndex);
        OrderBook storage book = books[key];
        return (book.buyOrders, book.sellOrders);
    }

    function placeLimit(actionType action, address base, address quote, uint256 baseAmount, uint256 price, uint256 maturityIndex) external nonReentrant returns (uint256 orderId) {
        require(base != address(0) && quote != address(0), "Invalid token address");
        require(base != quote, "Base and quote tokens must differ");
        require(baseAmount > 0 && price > 0, "Amount and price must be positive");

        if (action == actionType.SELL) {
            // for SELL order, lock base tokens
            IERC20(base).safeTransferFrom(msg.sender, address(this), baseAmount);
        } else {
            // for BUY order, lock quote tokens
            // Calculate quote amount in 18 decimals, then scale to quote token's decimals (6 for USDT/USDC)
            uint256 needQuote18 = (baseAmount * price) / PRICE_PRECISION;
            uint256 needQuote = needQuote18 / 1e12; // Scale from 18 to 6 decimals
            IERC20(quote).safeTransferFrom(msg.sender, address(this), needQuote);
        }
        
        // Create and store the order
        orderId = nextOrderId++;
        orders[orderId] = Order({
            id: orderId,
            trader: msg.sender,
            action: action,
            base: base,
            quote: quote,
            amount: baseAmount,
            filled: 0,
            price: price,
            maturityIndex: maturityIndex,
            ts: block.timestamp,
            active: true
        });

        emit NewOrder(orderId, msg.sender, action, base, quote, baseAmount, price);

        // match order before adding to order book
        _matchOnPlace(orderId);
        
        // If still active (not fully filled), add to order book
        Order storage taker = orders[orderId];
        if (taker.active) {
            bytes32 key = _pairKey(base, quote, maturityIndex);
            OrderBook storage book = books[key];
            if (action == actionType.BUY) {
                _insertBuy(book.buyOrders, orderId);
            } else {
                _insertSell(book.sellOrders, orderId);
            }
        }
    }

    // Stop-limit order: Funds are locked when placing the order
    function placeStopLimit(
        actionType action,
        address base,
        address quote,
        uint256 amount,
        uint256 stopPrice,
        uint256 limitPrice,
        uint256 maturityIndex
    ) external nonReentrant returns (uint256 stopId) {
        require(base != address(0) && quote != address(0), "Invalid token address");
        require(base != quote, "Base and quote must differ");
        require(amount > 0 && stopPrice > 0 && limitPrice > 0, "Invalid params");

        if (action == actionType.SELL) {
            IERC20(base).safeTransferFrom(msg.sender, address(this), amount);
        } else {
            uint256 needQuote18 = (amount * limitPrice) / PRICE_PRECISION;
            uint256 needQuote = needQuote18 / 1e12; // Scale from 18 to 6 decimals
            IERC20(quote).safeTransferFrom(msg.sender, address(this), needQuote);
        }

        stopId = nextStopOrderId++;
        stopOrders[stopId] = StopLimitOrder({
            id: stopId,
            trader: msg.sender,
            action: action,
            base: base,
            quote: quote,
            amount: amount,
            stopPrice: stopPrice,
            limitPrice: limitPrice,
            maturityIndex: maturityIndex,
            ts: block.timestamp,
            active: true,
            triggered: false
        });

        bytes32 key = _pairKey(base, quote, maturityIndex);
        StopBook storage sbook = stopBooks[key];
        if (action == actionType.BUY) {
            sbook.buyStops.push(stopId);
        } else {
            sbook.sellStops.push(stopId);
        }

        emit StopLimitPlaced(stopId, msg.sender, action, base, quote, amount, stopPrice, limitPrice);
    }

    // Find the correct place to insert the new buy order to keep the array sorted
    function _insertBuy(uint256[] storage arr, uint256 id) internal {
        uint256 n = arr.length;
        arr.push(id);
        while (n > 0) {
            Order storage a = orders[arr[n - 1]]; // previous order of the current position
            Order storage b = orders[id];         // the new order to insert
            // If previous order has higher price (or same price but earlier), it should stay before the new order
            bool aBeforeB = (a.price > b.price) || (a.price == b.price && a.ts <= b.ts);
            if (aBeforeB) break;
            arr[n] = arr[n - 1];
            n--;
        }
        arr[n] = id;
    }

    // Find the correct place to insert the new sell order to keep the array sorted
    function _insertSell(uint256[] storage arr, uint256 id) internal {
        uint256 n = arr.length;
        arr.push(id);
        while (n > 0) {
            Order storage a = orders[arr[n - 1]];
            Order storage b = orders[id];
            // If previous order has lower price (or same price but earlier), it should stay before the new order
            bool aBeforeB = (a.price < b.price) || (a.price == b.price && a.ts <= b.ts);
            if (aBeforeB) break;
            arr[n] = arr[n - 1];
            n--;
        }
        arr[n] = id;
    }

    // Shift elements to the left to remove an element while maintaining order
    function _orderedRemove(uint256[] storage arr, uint256 idx) internal {
        for (uint256 i = idx; i < arr.length - 1; i++) {
            arr[i] = arr[i + 1];
        }
        arr.pop();
    }

    // Find the index of an order ID in an array and shift elements to remove it
    function _removeFromBook(Order storage o) internal {
        bytes32 key = _pairKey(o.base, o.quote, o.maturityIndex);
        OrderBook storage book = books[key];
        uint256[] storage arr = (o.action == actionType.BUY) ? book.buyOrders : book.sellOrders;
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == o.id) {
                _orderedRemove(arr, i);
                break;
            }
        }
    }

    function _matchOnPlace(uint256 takerId) internal {
        Order storage taker = orders[takerId];
        require(taker.active, "Taker order is not active");

        bytes32 key =_pairKey(taker.base, taker.quote, taker.maturityIndex);
        OrderBook storage book = books[key];

        // If taker is BUY, match with SELL orders; if taker is SELL, match with BUY orders
        uint256[] storage oppositeOrders = (taker.action == actionType.BUY) ? book.sellOrders : book.buyOrders;

        uint256 spentQuote = 0;

        // Iterate through opposite orders to find all possible matches
        for (uint256 i = 0; i < oppositeOrders.length && taker.active; ) {
            Order storage maker = orders[oppositeOrders[i]];
            // Check if the maker is active
            if (!maker.active) {
                _orderedRemove(oppositeOrders, i);
                continue;
            }

            // Check if BUY price >= SELL price
            bool priceMatch = (taker.action == actionType.BUY) ? (taker.price >= maker.price) : (maker.price >= taker.price);
            if (!priceMatch) break;

            // Determine the trade amount (reuse variables to save stack space)
            uint256 tradedBase;
            {
                uint256 takerRemain = taker.amount - taker.filled;
                uint256 makerRemain = maker.amount - maker.filled;
                tradedBase = takerRemain < makerRemain ? takerRemain : makerRemain;
            }

            // Compute trade quote amount and scale to 6 decimals
            uint256 tradedQuote = ((tradedBase * maker.price) / PRICE_PRECISION) / 1e12;

            // Execute trades
            if (taker.action == actionType.BUY) {
                IERC20(taker.base).safeTransfer(taker.trader, tradedBase);
                _payoutQuoteWithFee(taker.quote, maker.trader, tradedQuote);
                spentQuote += tradedQuote;
            } else {
                _payoutQuoteWithFee(taker.quote, taker.trader, tradedQuote);
                IERC20(taker.base).safeTransfer(maker.trader, tradedBase);
            }

            // Update filled amounts
            taker.filled += tradedBase;
            maker.filled += tradedBase;

            emit OrderFilled(taker.id, maker.id, tradedBase, tradedQuote);
            _checkAndTriggerStops(taker.base, taker.quote, taker.maturityIndex, maker.price);

            // Check if maker is fully filled
            if (maker.filled == maker.amount) {
                maker.active = false;
                _orderedRemove(oppositeOrders, i);
                emit OrderClosed(maker.id);
            } else {
                i++;
            }

            // Check if taker is fully filled and refund excess
            if (taker.filled == taker.amount) {
                taker.active = false;
                emit OrderClosed(taker.id);
                
                if (taker.action == actionType.BUY) {
                    uint256 deposited = (((taker.amount * taker.price) / PRICE_PRECISION) / 1e12);
                    if (deposited > spentQuote) {
                        IERC20(taker.quote).safeTransfer(taker.trader, deposited - spentQuote);
                    }
                }
            }
        }
    }

    function cancel(uint256 orderId) external nonReentrant {
        Order storage o = orders[orderId];
        require(o.active, "order inactive");
        require(o.trader == msg.sender, "not order owner");

        // Remaining amount to refund
        uint256 remainingBase = o.amount - o.filled;

        // Mark order as inactive and remove from order book
        o.active = false;
        _removeFromBook(o);

        // Refund remaining tokens
        if (remainingBase > 0) {
            // Refund "merchandis" for SELL
            if (o.action == actionType.SELL) {
                IERC20(o.base).safeTransfer(o.trader, remainingBase);
            } 
            // Refund "money" for BUY, total money spent depend on the actual filled price, not "expected" price by the 
            else {
                uint256 refundQuote18 = (remainingBase * o.price) / PRICE_PRECISION;
                uint256 refundQuote = refundQuote18 / 1e12; // Scale from 18 to 6 decimals
                IERC20(o.quote).safeTransfer(o.trader, refundQuote);
            }
        }

        emit OrderCancelled(orderId);
        emit OrderClosed(orderId);
    }

    function cancelStop(uint256 stopId) external nonReentrant {
        StopLimitOrder storage so = stopOrders[stopId];
        require(so.active, "stop inactive");
        require(!so.triggered, "already triggered");
        require(so.trader == msg.sender, "not stop owner");

        bytes32 key = _pairKey(so.base, so.quote, so.maturityIndex);
        StopBook storage sbook = stopBooks[key];
        
        bool found = false;
        uint256[] storage arr = (so.action == actionType.BUY) ? sbook.buyStops : sbook.sellStops;
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == stopId) {
                _orderedRemove(arr, i);
                found = true;
                break;
            }
        }
        require(found, "stop not found in book");

        if (so.action == actionType.SELL) {
            IERC20(so.base).safeTransfer(so.trader, so.amount);
        } else {
            uint256 needQuote18 = (so.amount * so.limitPrice) / PRICE_PRECISION;
            uint256 needQuote = needQuote18 / 1e12; // Scale from 18 to 6 decimals
            IERC20(so.quote).safeTransfer(so.trader, needQuote);
        }
        so.active = false;
        emit StopLimitCancelled(stopId);
    }

    function _payoutQuoteWithFee(address quoteToken, address to, uint256 gross) internal returns (uint256 net) {
        if (feePercent == 0) {
            IERC20(quoteToken).safeTransfer(to, gross);
            return gross;
        }
        uint256 fee = (gross * feePercent) / 10000; // feePercent 以 bps 计
        if (fee > 0) {
            IERC20(quoteToken).safeTransfer(feeAccount, fee);
        }
        net = gross - fee;
        IERC20(quoteToken).safeTransfer(to, net);
    }

    function _checkAndTriggerStops(
        address base,
        address quote,
        uint256 maturityIndex,
        uint256 tradePrice
    ) internal {
        bytes32 key = _pairKey(base, quote, maturityIndex);
        StopBook storage sb = stopBooks[key];

        // Buy-stop: tradePrice >= stopPrice
        uint256 i = sb.buyStops.length;
        while (i > 0) {
            i--;
            uint256 stopId = sb.buyStops[i];
            StopLimitOrder storage so = stopOrders[stopId];
            if (so.active && !so.triggered && tradePrice >= so.stopPrice) {
                _triggerStopOrder(key, i, true, so);
            }
        }

        // Sell-stop: tradePrice <= stopPrice
        i = sb.sellStops.length;
        while (i > 0) {
            i--;
            uint256 stopId = sb.sellStops[i];
            StopLimitOrder storage so = stopOrders[stopId];
            if (so.active && !so.triggered && tradePrice <= so.stopPrice) {
                _triggerStopOrder(key, i, false, so);
            }
        }
    }

    function _triggerStopOrder(
        bytes32 key,
        uint256 indexInArray,
        bool fromBuyArray,               
        StopLimitOrder storage so
    ) internal {
        // Remove from stop book array
        if (fromBuyArray) {
            uint256 last = stopBooks[key].buyStops.length - 1;
            stopBooks[key].buyStops[indexInArray] = stopBooks[key].buyStops[last];
            stopBooks[key].buyStops.pop();
        } else {
            uint256 last = stopBooks[key].sellStops.length - 1;
            stopBooks[key].sellStops[indexInArray] = stopBooks[key].sellStops[last];
            stopBooks[key].sellStops.pop();
        }

        so.active = false;
        so.triggered = true;

        uint256 newOrderId = nextOrderId++;
        orders[newOrderId] = Order({
            id: newOrderId,
            trader: so.trader,
            action: so.action,
            base: so.base,
            quote: so.quote,
            maturityIndex: so.maturityIndex,
            amount: so.amount,
            filled: 0,
            price: so.limitPrice, 
            ts: block.timestamp,
            active: true
        });

        emit NewOrder(
            newOrderId,
            so.trader,
            so.action,
            so.base,
            so.quote,
            so.amount,
            so.limitPrice
        );

        emit StopLimitTriggered(so.id, newOrderId);
        _matchOnPlace(newOrderId);
        Order storage newOrd = orders[newOrderId];
        if (newOrd.active) {
            OrderBook storage book = books[key];
            if (newOrd.action == actionType.BUY) {
                _insertBuy(book.buyOrders, newOrderId);
            } else {
                _insertSell(book.sellOrders, newOrderId);
            }
        }
    }

    function takeOrder(uint256 orderId, uint256 baseAmount) external nonReentrant {
        Order storage o = orders[orderId];
        require(o.active, "order inactive");
        uint256 remain = o.amount - o.filled;
        require(remain > 0, "order filled");
        uint256 qty = (baseAmount == 0) ? remain : baseAmount;
        require(qty <= remain, "exceed remain");
        uint256 quoteAmount18 = (qty * o.price) / PRICE_PRECISION;
        uint256 quoteAmount = quoteAmount18 / 1e12; // Scale from 18 to 6 decimals

        if (o.action == actionType.SELL) {
            IERC20(o.quote).safeTransferFrom(msg.sender, address(this), quoteAmount);
            _payoutQuoteWithFee(o.quote, o.trader, quoteAmount);
            IERC20(o.base).safeTransfer(msg.sender, qty);
        } else {
            IERC20(o.base).safeTransferFrom(msg.sender, address(this), qty);
            IERC20(o.base).safeTransfer(o.trader, qty);
            _payoutQuoteWithFee(o.quote, msg.sender, quoteAmount);
        }

        o.filled += qty;
        if (o.filled == o.amount) {
            o.active = false;
            _removeFromBook(o);
            emit OrderClosed(orderId);
        }
        emit OrderFilled(0, orderId, qty, quoteAmount);
        _checkAndTriggerStops(o.base, o.quote, o.maturityIndex, o.price);
    }

    // View functions to get order details
    function getOrder(uint256 orderId) external view returns (
        uint256 id,
        address trader,
        actionType action,
        address base,
        address quote,
        uint256 amount,
        uint256 filled,
        uint256 price,
        uint256 ts,
        bool active
    ) {
        Order storage o = orders[orderId];
        return (o.id, o.trader, o.action, o.base, o.quote, o.amount, o.filled, o.price, o.ts, o.active);
    }

    function getOrdersByTrader(address trader, address base, address quote, uint256 maturityIndex) external view returns (uint256[] memory) {
        bytes32 key = _pairKey(base, quote, maturityIndex);
        OrderBook storage book = books[key];
        
        uint256 count = 0;
        // Count trader's orders in both buy and sell sides
        for (uint256 i = 0; i < book.buyOrders.length; i++) {
            if (orders[book.buyOrders[i]].trader == trader) count++;
        }
        for (uint256 i = 0; i < book.sellOrders.length; i++) {
            if (orders[book.sellOrders[i]].trader == trader) count++;
        }
        
        uint256[] memory traderOrders = new uint256[](count);
        uint256 idx = 0;
        
        for (uint256 i = 0; i < book.buyOrders.length; i++) {
            if (orders[book.buyOrders[i]].trader == trader) {
                traderOrders[idx++] = book.buyOrders[i];
            }
        }
        for (uint256 i = 0; i < book.sellOrders.length; i++) {
            if (orders[book.sellOrders[i]].trader == trader) {
                traderOrders[idx++] = book.sellOrders[i];
            }
        }
        
        return traderOrders;
    }

    function getBestPrice(address base, address quote, uint256 maturityIndex, actionType action) external view returns (uint256) {
        bytes32 key = _pairKey(base, quote, maturityIndex);
        OrderBook storage book = books[key];
        
        uint256[] storage ordersArr = (action == actionType.BUY) ? book.sellOrders : book.buyOrders;
        
        if (ordersArr.length == 0) return 0;
        
        // Return the best price (first order in sorted array)
        return orders[ordersArr[0]].price;
    }

    function getStopOrder(uint256 stopId) external view returns (
        uint256 id,
        address trader,
        actionType action,
        address base,
        address quote,
        uint256 amount,
        uint256 stopPrice,
        uint256 limitPrice,
        uint256 ts,
        bool active,
        bool triggered
    ) {
        StopLimitOrder storage so = stopOrders[stopId];
        return (so.id, so.trader, so.action, so.base, so.quote, so.amount, so.stopPrice, so.limitPrice, so.ts, so.active, so.triggered);
    }
}