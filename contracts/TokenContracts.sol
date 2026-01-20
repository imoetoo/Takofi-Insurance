// SPDX-License-Identifier: MIT
/**
 * @title InsuranceToken & PrincipalToken
 * @notice [TOKEN CONTRACTS] ERC20 token contracts for protocol insurance - InsuranceToken provides coverage against hacks,
 * PrincipalToken represents deposited capital redeemable at maturity
 * @dev Each protocol gets its own pair of these tokens deployed by ProtocolManager
 */
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract InsuranceToken is ERC20 {
    address public protocolInsurance;
    
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        protocolInsurance = msg.sender;
    }
    
    function mint(address to, uint256 amount) external {
        require(msg.sender == protocolInsurance, "Only ProtocolInsurance");
        _mint(to, amount);
    }
    
    function burn(address from, uint256 amount) external {
        require(msg.sender == protocolInsurance, "Only ProtocolInsurance");
        _burn(from, amount);
    }
}

contract PrincipalToken is ERC20 {
    address public protocolInsurance;
    
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        protocolInsurance = msg.sender;
    }
    
    function mint(address to, uint256 amount) external {
        require(msg.sender == protocolInsurance, "Only ProtocolInsurance");
        _mint(to, amount);
    }
    
    function burn(address from, uint256 amount) external {
        require(msg.sender == protocolInsurance, "Only ProtocolInsurance");
        _burn(from, amount);
    }
}
