// SPDX-License-Identifier: MIT
/**
 * @title MaturityManager
 * @notice [INTERNAL LIBRARY] Defines MaturityBucket struct and constants for 6M and 12M maturity indices -
 * provides the data structure for tracking maturity expiry times, settlement status, and breach information
 * @dev Code compiled into main contract, not deployed separately
 */
pragma solidity ^0.8.24;

import "./BokkyPooBahsDateTimeLibrary.sol";

// Constants for maturity indices
uint256 constant MATURITY_6M = 0;
uint256 constant MATURITY_12M = 1;

struct MaturityBucket {
    uint256 expiryTime;
    string label;
    bool isActive;
    bool isSettled;
    bool breachOccurred;
    uint256 totalITPayout;
}

library MaturityManager {
    event MaturityInitialized(bytes32 indexed protocolId, uint256 maturityIndex, uint256 expiryTime, string label);
    event MaturityRolled(bytes32 indexed protocolId, uint256 maturityIndex, uint256 newExpiryTime);
    event MaturitiesRolled(bytes32 indexed protocolId, uint256 newExpiry6M, uint256 newExpiry12M);
    
    /**
     * @dev Initialize rolling maturity buckets for a protocol
     * Creates 6M and 12M expiry dates from current block timestamp
     */
    function initializeMaturities(
        mapping(bytes32 => mapping(uint256 => MaturityBucket)) storage maturities,
        bytes32 protocolId
    ) internal {
        uint256 currentTime = block.timestamp;
        
        // Get current year and determine next June 30 and Dec 31
        uint256 currentYear = BokkyPooBahsDateTimeLibrary.getYear(currentTime);
        
        // Calculate June 30 of current year
        uint256 june30 = BokkyPooBahsDateTimeLibrary.timestampFromDateTime(currentYear, 6, 30, 23, 59, 59);
        
        // Calculate Dec 31 of current year
        uint256 dec31 = BokkyPooBahsDateTimeLibrary.timestampFromDateTime(currentYear, 12, 31, 23, 59, 59);
        
        // If we're past June 30, move it to next year
        if (currentTime >= june30) {
            june30 = BokkyPooBahsDateTimeLibrary.timestampFromDateTime(currentYear + 1, 6, 30, 23, 59, 59);
        }
        
        // If we're past Dec 31, move it to next year
        if (currentTime >= dec31) {
            dec31 = BokkyPooBahsDateTimeLibrary.timestampFromDateTime(currentYear + 1, 12, 31, 23, 59, 59);
        }
        
        // 6M is the nearer date, 12M is the farther date
        uint256 maturity6M;
        uint256 maturity12M;
        
        if (june30 < dec31) {
            maturity6M = june30;
            maturity12M = dec31;
        } else {
            maturity6M = dec31;
            maturity12M = june30;
        }
        
        maturities[protocolId][MATURITY_6M] = MaturityBucket({
            expiryTime: maturity6M,
            label: "Maturity_6M",
            isActive: true,
            isSettled: false,
            breachOccurred: false,
            totalITPayout: 0
        });
        
        maturities[protocolId][MATURITY_12M] = MaturityBucket({
            expiryTime: maturity12M,
            label: "Maturity_12M",
            isActive: true,
            isSettled: false,
            breachOccurred: false,
            totalITPayout: 0
        });
        
        emit MaturityInitialized(protocolId, MATURITY_6M, maturity6M, "Maturity_6M");
        emit MaturityInitialized(protocolId, MATURITY_12M, maturity12M, "Maturity_12M");
    }
    
    /**
     * @dev Roll expired maturity buckets to next generation
     * When 6M bucket expires, both buckets move forward
     */
    function rollMaturities(
        mapping(bytes32 => mapping(uint256 => MaturityBucket)) storage maturities,
        bytes32 protocolId
    ) internal {
        uint256 currentTime = block.timestamp;
        
        // Check if 6M bucket has expired
        require(
            currentTime >= maturities[protocolId][MATURITY_6M].expiryTime,
            "6M maturity not expired"
        );
        
        // Get current year for calculating next maturities
        uint256 currentYear = BokkyPooBahsDateTimeLibrary.getYear(currentTime);
        
        // Calculate next June 30 and Dec 31
        uint256 nextJune30 = BokkyPooBahsDateTimeLibrary.timestampFromDateTime(currentYear, 6, 30, 23, 59, 59);
        uint256 nextDec31 = BokkyPooBahsDateTimeLibrary.timestampFromDateTime(currentYear, 12, 31, 23, 59, 59);
        
        // If we're past these dates, move to next year
        if (currentTime >= nextJune30) {
            nextJune30 = BokkyPooBahsDateTimeLibrary.timestampFromDateTime(currentYear + 1, 6, 30, 23, 59, 59);
        }
        if (currentTime >= nextDec31) {
            nextDec31 = BokkyPooBahsDateTimeLibrary.timestampFromDateTime(currentYear + 1, 12, 31, 23, 59, 59);
        }
        
        // 6M is the nearer date, 12M is the farther date
        uint256 maturity6M;
        uint256 maturity12M;
        
        if (nextJune30 < nextDec31) {
            maturity6M = nextJune30;
            maturity12M = nextDec31;
        } else {
            maturity6M = nextDec31;
            maturity12M = nextJune30;
        }
        
        maturities[protocolId][MATURITY_6M] = MaturityBucket({
            expiryTime: maturity6M,
            label: "Maturity_6M_Rolled",
            isActive: true,
            isSettled: false,
            breachOccurred: false,
            totalITPayout: 0
        });
        
        maturities[protocolId][MATURITY_12M] = MaturityBucket({
            expiryTime: maturity12M,
            label: "Maturity_12M_Rolled",
            isActive: true,
            isSettled: false,
            breachOccurred: false,
            totalITPayout: 0
        });
        
        emit MaturitiesRolled(protocolId, maturity6M, maturity12M);
    }
    
    /**
     * @dev Check if maturity has expired
     */
    function isMaturityExpired(
        mapping(bytes32 => mapping(uint256 => MaturityBucket)) storage maturities,
        bytes32 protocolId,
        uint256 maturityIndex
    ) internal view returns (bool) {
        return block.timestamp >= maturities[protocolId][maturityIndex].expiryTime;
    }
    
    /**
     * @dev Get days until maturity expires
     */
    function getDaysUntilMaturity(
        mapping(bytes32 => mapping(uint256 => MaturityBucket)) storage maturities,
        bytes32 protocolId,
        uint256 maturityIndex
    ) internal view returns (uint256) {
        uint256 expiryTime = maturities[protocolId][maturityIndex].expiryTime;
        if (block.timestamp >= expiryTime) return 0;
        return (expiryTime - block.timestamp) / 86400;
    }
}
