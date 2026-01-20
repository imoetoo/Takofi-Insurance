// SPDX-License-Identifier: MIT
/**
 * @title MaturityHelper
 * @notice [EXTERNAL CONTRACT] Helper contract for maturity bucket date calculations - computes 6M and 12M expiry dates
 * aligned to June 30 and December 31, and handles rolling maturities forward
 * @dev Deployed separately to reduce main contract size
 */
pragma solidity ^0.8.24;

import "./BokkyPooBahsDateTimeLibrary.sol";
import "./MaturityManager.sol";

/**
 * @dev External helper contract for maturity operations
 */
contract MaturityHelper {
    
    /**
     * @dev Initialize rolling maturity buckets for a protocol
     */
    function initializeMaturities() 
        external 
        view 
        returns (MaturityBucket memory maturity6M, MaturityBucket memory maturity12M) 
    {
        uint256 currentTime = block.timestamp;
        uint256 currentYear = BokkyPooBahsDateTimeLibrary.getYear(currentTime);
        
        uint256 june30 = BokkyPooBahsDateTimeLibrary.timestampFromDateTime(currentYear, 6, 30, 23, 59, 59);
        uint256 dec31 = BokkyPooBahsDateTimeLibrary.timestampFromDateTime(currentYear, 12, 31, 23, 59, 59);
        
        if (currentTime >= june30) {
            june30 = BokkyPooBahsDateTimeLibrary.timestampFromDateTime(currentYear + 1, 6, 30, 23, 59, 59);
        }
        if (currentTime >= dec31) {
            dec31 = BokkyPooBahsDateTimeLibrary.timestampFromDateTime(currentYear + 1, 12, 31, 23, 59, 59);
        }
        
        uint256 expiry6M;
        uint256 expiry12M;
        
        if (june30 < dec31) {
            expiry6M = june30;
            expiry12M = dec31;
        } else {
            expiry6M = dec31;
            expiry12M = june30;
        }
        
        maturity6M = MaturityBucket({
            expiryTime: expiry6M,
            label: "Maturity_6M",
            isActive: true,
            isSettled: false,
            breachOccurred: false,
            totalITPayout: 0
        });
        
        maturity12M = MaturityBucket({
            expiryTime: expiry12M,
            label: "Maturity_12M",
            isActive: true,
            isSettled: false,
            breachOccurred: false,
            totalITPayout: 0
        });
    }
    
    /**
     * @dev Calculate next maturity dates for rolling
     */
    function calculateNextMaturities() 
        external 
        view 
        returns (MaturityBucket memory maturity6M, MaturityBucket memory maturity12M) 
    {
        uint256 currentTime = block.timestamp;
        uint256 currentYear = BokkyPooBahsDateTimeLibrary.getYear(currentTime);
        
        uint256 nextJune30 = BokkyPooBahsDateTimeLibrary.timestampFromDateTime(currentYear, 6, 30, 23, 59, 59);
        uint256 nextDec31 = BokkyPooBahsDateTimeLibrary.timestampFromDateTime(currentYear, 12, 31, 23, 59, 59);
        
        if (currentTime >= nextJune30) {
            nextJune30 = BokkyPooBahsDateTimeLibrary.timestampFromDateTime(currentYear + 1, 6, 30, 23, 59, 59);
        }
        if (currentTime >= nextDec31) {
            nextDec31 = BokkyPooBahsDateTimeLibrary.timestampFromDateTime(currentYear + 1, 12, 31, 23, 59, 59);
        }
        
        uint256 expiry6M;
        uint256 expiry12M;
        
        if (nextJune30 < nextDec31) {
            expiry6M = nextJune30;
            expiry12M = nextDec31;
        } else {
            expiry6M = nextDec31;
            expiry12M = nextJune30;
        }
        
        maturity6M = MaturityBucket({
            expiryTime: expiry6M,
            label: "Maturity_6M_Rolled",
            isActive: true,
            isSettled: false,
            breachOccurred: false,
            totalITPayout: 0
        });
        
        maturity12M = MaturityBucket({
            expiryTime: expiry12M,
            label: "Maturity_12M_Rolled",
            isActive: true,
            isSettled: false,
            breachOccurred: false,
            totalITPayout: 0
        });
    }
    
    /**
     * @dev Get days until maturity expires
     */
    function getDaysUntilMaturity(uint256 expiryTime) external view returns (uint256) {
        if (block.timestamp >= expiryTime) return 0;
        return (expiryTime - block.timestamp) / 86400;
    }
}
