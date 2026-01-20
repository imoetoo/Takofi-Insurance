// SPDX-License-Identifier: MIT
/**
 * @title InsuranceCalculator
 * @notice [INTERNAL LIBRARY] Insurance pricing calculations - computes annual insurance fees based on DEX market prices,
 * fetches insurance token prices from order books across USDC and USDT markets
 * @dev Code compiled into main contract, not deployed separately
 */
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ProtocolManager.sol";

// Interface for DEX to fetch order book prices
interface IDex {
    enum actionType { BUY, SELL }
    function getBestPrice(address base, address quote, uint256 maturityIndex, actionType action) external view returns (uint256);
}

library InsuranceCalculator {
    uint256 constant PRICE_PRECISION = 1e18;
    
    /**
     * @dev Calculate annual fee percentage based on DEX order book price
     * Annual Fee % = (IT Price / Coverage Amount) × 100%
     * IT Price is fetched from the cheapest sell order on the DEX across BOTH USDC and USDT markets
     * @param protocolId The protocol identifier
     * @param coverageAmount The amount of coverage in stablecoin (6 decimals)
     * @param maturityIndex The maturity index for pricing
     * @return annualFeePercentage The annual fee in basis points (389 = 3.89%)
     */
    function calculateAnnualFee(
        mapping(bytes32 => ProtocolInfo) storage protocols,
        IDex dexContract,
        IERC20 USDC,
        IERC20 USDT,
        bytes32 protocolId,
        uint256 coverageAmount,
        uint256 maturityIndex
    ) internal view returns (uint256) {
        require(address(dexContract) != address(0), "DEX not set");
        require(coverageAmount > 0, "Invalid coverage");
        
        ProtocolInfo memory protocol = protocols[protocolId];
        require(protocol.active, "Protocol not active");
        
        // Get the cheapest sell price from DEX for BOTH USDC and USDT markets
        uint256 itPriceUSDC = dexContract.getBestPrice(
            address(protocol.insuranceToken),
            address(USDC),
            maturityIndex,
            IDex.actionType.BUY // Get sell orders (what it costs to buy IT)
        );
        
        uint256 itPriceUSDT = dexContract.getBestPrice(
            address(protocol.insuranceToken),
            address(USDT),
            maturityIndex,
            IDex.actionType.BUY // Get sell orders (what it costs to buy IT)
        );
        
        // Use the minimum price from both markets (cheapest available)
        uint256 itPrice;
        if (itPriceUSDC == 0 && itPriceUSDT == 0) {
            // No orders in either market, return base minting fee
            return protocol.mintingFee;
        } else if (itPriceUSDC == 0) {
            itPrice = itPriceUSDT;
        } else if (itPriceUSDT == 0) {
            itPrice = itPriceUSDC;
        } else {
            // Both markets have orders, take the minimum (cheapest)
            itPrice = itPriceUSDC < itPriceUSDT ? itPriceUSDC : itPriceUSDT;
        }
        
        // Calculate annual fee in basis points
        uint256 annualFeeBps = (itPrice * 10000) / PRICE_PRECISION;
        
        // Ensure fee is at least the minimum minting fee and cap at reasonable maximum (50%)
        if (annualFeeBps < protocol.mintingFee) {
            annualFeeBps = protocol.mintingFee;
        } else if (annualFeeBps > 5000) { // Cap at 50%
            annualFeeBps = 5000;
        }
        
        return annualFeeBps;
    }
    
    /**
     * @dev Get IT price from DEX (minimum of USDC/USDT markets)
     */
    function getITPrice(
        ProtocolInfo memory protocol,
        IDex dexContract,
        IERC20 USDC,
        IERC20 USDT,
        uint256 maturityIndex
    ) internal view returns (uint256) {
        if (address(dexContract) == address(0)) {
            return 0;
        }
        
        uint256 itPriceUSDC = dexContract.getBestPrice(
            address(protocol.insuranceToken),
            address(USDC),
            maturityIndex,
            IDex.actionType.BUY
        );
        
        uint256 itPriceUSDT = dexContract.getBestPrice(
            address(protocol.insuranceToken),
            address(USDT),
            maturityIndex,
            IDex.actionType.BUY
        );
        
        // Return minimum price from both markets
        if (itPriceUSDC == 0 && itPriceUSDT == 0) {
            return 0;
        } else if (itPriceUSDC == 0) {
            return itPriceUSDT;
        } else if (itPriceUSDT == 0) {
            return itPriceUSDC;
        } else {
            return itPriceUSDC < itPriceUSDT ? itPriceUSDC : itPriceUSDT;
        }
    }
}
