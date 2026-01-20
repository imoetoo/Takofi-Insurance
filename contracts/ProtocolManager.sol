// SPDX-License-Identifier: MIT
/**
 * @title ProtocolManager
 * @notice [INTERNAL LIBRARY] Protocol management functions - handles adding new protocols, deploying their token contracts,
 * and calculating available insurance capacity
 * @dev Code compiled into main contract, not deployed separately
 */
pragma solidity ^0.8.24;

import "./TokenContracts.sol";

struct ProtocolInfo {
    string name;
    bool active;
    InsuranceToken insuranceToken;
    PrincipalToken principalToken;
    uint256 totalDeposited;
    uint256 totalITBurntFromPayouts; // Track IT burnt from hack payouts
    uint256 mintingFee; // Fee in basis points (100 = 1%)
}

library ProtocolManager {
    event ProtocolAdded(bytes32 indexed protocolId, string name);
    
    /**
     * @dev Add a new protocol
     */
    function addProtocol(
        mapping(bytes32 => ProtocolInfo) storage protocols,
        string memory protocolName,
        uint256 mintingFee
    ) internal returns (bytes32) {
        bytes32 protocolId = keccak256(abi.encodePacked(protocolName));
        require(!protocols[protocolId].active, "Protocol already exists");
        
        // Deploy new token contracts
        string memory insuranceName = string(abi.encodePacked(protocolName, " Insurance Token"));
        string memory insuranceSymbol = string(abi.encodePacked("i", protocolName));
        string memory principalName = string(abi.encodePacked(protocolName, " Principal Token"));
        string memory principalSymbol = string(abi.encodePacked("p", protocolName));
        
        InsuranceToken insuranceToken = new InsuranceToken(insuranceName, insuranceSymbol);
        PrincipalToken principalToken = new PrincipalToken(principalName, principalSymbol);
        
        protocols[protocolId] = ProtocolInfo({
            name: protocolName,
            active: true,
            insuranceToken: insuranceToken,
            principalToken: principalToken,
            totalDeposited: 0,
            totalITBurntFromPayouts: 0,
            mintingFee: mintingFee
        });
        
        emit ProtocolAdded(protocolId, protocolName);
        
        return protocolId;
    }
    
    /**
     * @dev Get protocol ID from name
     */
    function getProtocolId(string memory protocolName) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(protocolName));
    }
    
    /**
     * @dev Get the available capacity for a protocol
     * Available Capacity = Total IT in circulation - IT burnt from payouts
     */
    function getAvailableCapacity(
        mapping(bytes32 => ProtocolInfo) storage protocols,
        bytes32 protocolId
    ) internal view returns (uint256) {
        ProtocolInfo memory protocol = protocols[protocolId];
        uint256 totalITSupply = protocol.insuranceToken.totalSupply();
        // Convert from 18 decimals to 6 decimals (stablecoin units)
        return (totalITSupply / 10**12) - protocol.totalITBurntFromPayouts;
    }
}
