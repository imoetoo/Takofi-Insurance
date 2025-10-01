// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract InsuranceToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}

contract PrincipalToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}

contract ProtocolInsurance is Ownable, ReentrancyGuard {
    struct ProtocolInfo {
        string name;
        bool active;
        InsuranceToken insuranceToken;
        PrincipalToken principalToken;
        uint256 totalDeposited;
        uint256 mintingFee; // Fee in basis points (100 = 1%)
    }
    
    // Supported stablecoins
    IERC20 public immutable USDT;
    IERC20 public immutable USDC;
    
    // Protocol mappings
    mapping(bytes32 => ProtocolInfo) public protocols;
    mapping(address => mapping(bytes32 => uint256)) public userDeposits;
    
    // Events
    event ProtocolAdded(bytes32 indexed protocolId, string name);
    event TokensMinted(
        address indexed user,
        bytes32 indexed protocolId,
        address token,
        uint256 amount,
        uint256 insuranceTokens,
        uint256 principalTokens
    );
    event TokensBurned(
        address indexed user,
        bytes32 indexed protocolId,
        uint256 insuranceTokens,
        uint256 principalTokens,
        uint256 stablecoinsReturned
    );
    
    constructor(address _usdt, address _usdc) Ownable(msg.sender) {
        USDT = IERC20(_usdt);
        USDC = IERC20(_usdc);
        
        // Automatically setup all protocols on deployment with 0% fee
        _addProtocol("SushiSwap", 0);
        _addProtocol("Curve Finance", 0);
        _addProtocol("Aave", 0);
        _addProtocol("Uniswap V3", 0);
        _addProtocol("Compound", 0);
        _addProtocol("MakerDAO", 0);
    }
    
    // Internal function to add protocols (used in constructor and externally)
    function _addProtocol(
        string memory protocolName,
        uint256 mintingFee
    ) internal {
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
            mintingFee: mintingFee
        });
        
        emit ProtocolAdded(protocolId, protocolName);
    }
    
    // External function to add additional protocols (only owner)
    function addProtocol(
        string memory protocolName,
        uint256 mintingFee
    ) external onlyOwner {
        _addProtocol(protocolName, mintingFee);
    }
    
    function mintTokens(
        bytes32 protocolId,
        address stablecoin,
        uint256 amount
    ) external nonReentrant {
        require(protocols[protocolId].active, "Protocol not active");
        require(stablecoin == address(USDT) || stablecoin == address(USDC), "Unsupported stablecoin");
        require(amount > 0, "Amount must be greater than 0");
        
        ProtocolInfo storage protocol = protocols[protocolId];
        
        // Calculate fee, protocol.mintingFee is in basis points (100 = 1% fee)
        uint256 fee = (amount * protocol.mintingFee) / 10000;
        uint256 netAmount = amount - fee;
        
        // Transfer stablecoins from user
        IERC20(stablecoin).transferFrom(msg.sender, address(this), amount);
        
        // Convert from 6-decimal stablecoin to 18-decimal tokens (multiply by 10^12)
        uint256 tokenAmount = netAmount * 10**12;
        
        // Mint tokens 1:1 with converted amount
        protocol.insuranceToken.mint(msg.sender, tokenAmount);
        protocol.principalToken.mint(msg.sender, tokenAmount);
        
        // Update records
        userDeposits[msg.sender][protocolId] += netAmount;
        protocol.totalDeposited += netAmount;
        
        emit TokensMinted(
            msg.sender,
            protocolId,
            stablecoin,
            amount,
            netAmount,
            netAmount
        );
    }
    
    function burnTokens(
        bytes32 protocolId,
        uint256 insuranceAmount,
        uint256 principalAmount,
        address preferredStablecoin
    ) external nonReentrant {
        require(protocols[protocolId].active, "Protocol not active");
        require(insuranceAmount == principalAmount, "Must burn equal amounts");
        require(preferredStablecoin == address(USDT) || preferredStablecoin == address(USDC), "Unsupported stablecoin");
        
        ProtocolInfo storage protocol = protocols[protocolId];
        
        // Burn tokens (18 decimals)
        protocol.insuranceToken.burn(msg.sender, insuranceAmount);
        protocol.principalToken.burn(msg.sender, principalAmount);
        
        // Convert from 18-decimal tokens back to 6-decimal stablecoins (divide by 10^12)
        uint256 returnAmount = insuranceAmount / 10**12; // Convert back to stablecoin decimals
        
        // Check if we have enough of preferred stablecoin, otherwise use available
        IERC20 tokenToReturn = IERC20(preferredStablecoin);
        if (tokenToReturn.balanceOf(address(this)) < returnAmount) {
            // Use alternative stablecoin
            tokenToReturn = preferredStablecoin == address(USDT) ? USDC : USDT;
        }
        
        tokenToReturn.transfer(msg.sender, returnAmount);
        
        // Update records
        userDeposits[msg.sender][protocolId] -= returnAmount;
        protocol.totalDeposited -= returnAmount;
        
        emit TokensBurned(
            msg.sender,
            protocolId,
            insuranceAmount,
            principalAmount,
            returnAmount
        );
    }
    
    // View functions
    function getProtocolTokens(bytes32 protocolId) external view returns (address insurance, address principal) {
        ProtocolInfo memory protocol = protocols[protocolId];
        return (address(protocol.insuranceToken), address(protocol.principalToken));
    }
    
    function getUserTokenBalances(address user, bytes32 protocolId) external view returns (uint256 insurance, uint256 principal) {
        ProtocolInfo memory protocol = protocols[protocolId];
        return (
            protocol.insuranceToken.balanceOf(user),
            protocol.principalToken.balanceOf(user)
        );
    }
    
    function getProtocolId(string memory protocolName) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(protocolName));
    }
    
    // Emergency functions
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
    
    function pauseProtocol(bytes32 protocolId) external onlyOwner {
        protocols[protocolId].active = false;
    }
    
    function unpauseProtocol(bytes32 protocolId) external onlyOwner {
        protocols[protocolId].active = true;
    }
}