// SPDX-License-Identifier: MIT
/**
 * @title SettlementHelper
 * @notice [EXTERNAL CONTRACT] Helper contract for settlement calculations - computes principal token redemption values,
 * insurance claim payouts, and validates settlement conditions
 * @dev Deployed separately to reduce main contract size
 */
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MaturityManager.sol";

/**
 * @dev External helper contract for settlement and redemption calculations
 */
contract SettlementHelper {
    
    /**
     * @dev Calculate redemption payout for PT
     */
    function calculatePTRedemption(
        uint256 ptAmount,
        uint256 userPTBalance,
        uint256 totalPT,
        uint256 totalDeposited,
        uint256 totalITPayout
    ) external pure returns (uint256 payoutAmount) {
        require(ptAmount > 0, "");
        require(userPTBalance >= ptAmount, "");
        require(totalPT > 0, "");
        
        uint256 totalValueForPT = totalDeposited - totalITPayout;
        payoutAmount = (totalValueForPT * ptAmount) / totalPT;
        
        return payoutAmount;
    }
    
    /**
     * @dev Calculate insurance claim payout for IT
     */
    function calculateITClaim(
        uint256 itAmount,
        uint256 userITBalance,
        uint256 totalIT,
        uint256 totalITPayout
    ) external pure returns (uint256 payoutAmount) {
        require(itAmount > 0, "");
        require(userITBalance >= itAmount, "");
        require(totalIT > 0, "");
        
        payoutAmount = (totalITPayout * itAmount) / totalIT;
        
        return payoutAmount;
    }
    
    /**
     * @dev Validate settlement conditions
     */
    function validateSettlement(
        MaturityBucket memory maturity,
        uint256 currentTime
    ) external pure returns (bool) {
        require(maturity.isActive, "");
        require(!maturity.isSettled, "");
        require(currentTime >= maturity.expiryTime, "");
        return true;
    }
    
    /**
     * @dev Auto-settle if conditions are met
     */
    function canAutoSettle(
        MaturityBucket memory maturity,
        uint256 currentTime
    ) external pure returns (bool) {
        return !maturity.isSettled && 
               currentTime >= maturity.expiryTime && 
               !maturity.breachOccurred;
    }
}
