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

// Interface for DEX to fetch order book prices
interface IDex {
    enum actionType { BUY, SELL }
    function getBestPrice(address base, address quote, actionType action) external view returns (uint256);
}

contract ProtocolInsurance is Ownable, ReentrancyGuard {
    struct ProtocolInfo {
        string name;
        bool active;
        InsuranceToken insuranceToken;
        PrincipalToken principalToken;
        uint256 totalDeposited;
        uint256 totalITBurntFromPayouts; // Track IT burnt from hack payouts
        uint256 mintingFee; // Fee in basis points (100 = 1%)
    }
    
    // Supported stablecoins
    IERC20 public immutable USDT;
    IERC20 public immutable USDC;
    
    // DEX contract for price oracle
    IDex public dexContract;
    
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
    event PayoutProcessed(
        bytes32 indexed protocolId,
        uint256 itBurnt,
        uint256 stablecoinsPaidOut
    );
    event DexContractUpdated(address indexed oldDex, address indexed newDex);
    
    constructor(address _usdt, address _usdc) Ownable(msg.sender) {
        USDT = IERC20(_usdt);
        USDC = IERC20(_usdc);
        
        // Automatically setup all protocols on deployment with 0% fee
        _addProtocol("SushiSwap", 0);
        _addProtocol("Curve Finance", 0);
        _addProtocol("Aave", 0);
        _addProtocol("Uniswap V3", 0);
        _addProtocol("Compound", 0);
        _addProtocol("PancakeSwap", 0);
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
            totalITBurntFromPayouts: 0,
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
    
    /**
     * @dev Get the available capacity for a protocol
     * Available Capacity = Total IT in circulation - IT burnt from payouts
     * This represents the total insurance coverage currently active
     */
    function getAvailableCapacity(bytes32 protocolId) public view returns (uint256) {
        ProtocolInfo memory protocol = protocols[protocolId];
        uint256 totalITSupply = protocol.insuranceToken.totalSupply();
        // Convert from 18 decimals to 6 decimals (stablecoin units)
        return (totalITSupply / 10**12) - protocol.totalITBurntFromPayouts;
    }
    
    /**
     * @dev Calculate annual fee percentage based on DEX order book price
     * Annual Fee % = (IT Price / Coverage Amount) × 100%
     * IT Price is fetched from the cheapest sell order on the DEX across BOTH USDC and USDT markets
     * @param protocolId The protocol identifier
     * @param coverageAmount The amount of coverage in stablecoin (6 decimals)
     * @return annualFeePercentage The annual fee in basis points (389 = 3.89%)
     */
    function calculateAnnualFee(bytes32 protocolId, uint256 coverageAmount) public view returns (uint256) {
        require(address(dexContract) != address(0), "DEX contract not set");
        require(coverageAmount > 0, "Coverage amount must be greater than 0");
        
        ProtocolInfo memory protocol = protocols[protocolId];
        require(protocol.active, "Protocol not active");
        
        // Get the cheapest sell price from DEX for BOTH USDC and USDT markets
        // base = Insurance Token, quote = USDC or USDT
        // We want SELL orders (people selling IT) which is what buyers see
        uint256 itPriceUSDC = dexContract.getBestPrice(
            address(protocol.insuranceToken),
            address(USDC),
            IDex.actionType.BUY // Get sell orders (what it costs to buy IT)
        );
        
        uint256 itPriceUSDT = dexContract.getBestPrice(
            address(protocol.insuranceToken),
            address(USDT),
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
        
        // itPrice is in PRICE_PRECISION (1e18)
        // Convert price from per 18-decimal IT to per 6-decimal stablecoin coverage
        // Formula: (itPrice / coverageAmount) × 10000 to get basis points
        // itPrice is quote per base, scaled by 1e18
        // We need: (price in USDC for 1 IT) / (coverage in USDC) × 10000
        
        // itPrice is in PRICE_PRECISION (1e18)
        // For 1 stablecoin coverage, we calculate the fee as:
        // annualFee% = (itPrice / PRICE_PRECISION) * 100%
        // In basis points: (itPrice / PRICE_PRECISION) * 10000
        // Which simplifies to: (itPrice * 10000) / PRICE_PRECISION
        
        // For the general case with coverageAmount in 6 decimals:
        // annualFeeBps = (itPrice * 10000) / (coverageAmount * 10^12 * PRICE_PRECISION / 10^18)
        // = (itPrice * 10000 * 10^18) / (coverageAmount * 10^12 * PRICE_PRECISION)
        // = (itPrice * 10000 * 10^6) / (coverageAmount * PRICE_PRECISION)
        
        // Using 1 USDC/USDT for coverage (10^6 units):
        // annualFeeBps = (itPrice * 10000) / PRICE_PRECISION
        uint256 PRICE_PRECISION = 1e18;
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
     * @dev Get comprehensive insurance market metrics for a protocol
     * @return availableCapacity Total IT in circulation (in stablecoin units)
     * @return totalValueLocked Total stablecoins deposited
     * @return annualFeePercentage Current annual fee in basis points (uses min price from USDC/USDT markets)
     * @return itPrice Current IT price from DEX in PRICE_PRECISION (1e18) - minimum of USDC/USDT markets
     */
    function getInsuranceMarketMetrics(bytes32 protocolId) external view returns (
        uint256 availableCapacity,
        uint256 totalValueLocked,
        uint256 annualFeePercentage,
        uint256 itPrice
    ) {
        ProtocolInfo memory protocol = protocols[protocolId];
        
        availableCapacity = getAvailableCapacity(protocolId);
        totalValueLocked = protocol.totalDeposited;
        
        // Calculate annual fee for 1 USDC/USDT of coverage (already checks both markets for min price)
        annualFeePercentage = calculateAnnualFee(protocolId, 1 * 10**6);
        
        // Get IT price from DEX if available - return minimum of USDC and USDT markets
        if (address(dexContract) != address(0)) {
            uint256 itPriceUSDC = dexContract.getBestPrice(
                address(protocol.insuranceToken),
                address(USDC),
                IDex.actionType.BUY
            );
            
            uint256 itPriceUSDT = dexContract.getBestPrice(
                address(protocol.insuranceToken),
                address(USDT),
                IDex.actionType.BUY
            );
            
            // Return minimum price from both markets
            if (itPriceUSDC == 0 && itPriceUSDT == 0) {
                itPrice = 0;
            } else if (itPriceUSDC == 0) {
                itPrice = itPriceUSDT;
            } else if (itPriceUSDT == 0) {
                itPrice = itPriceUSDC;
            } else {
                itPrice = itPriceUSDC < itPriceUSDT ? itPriceUSDC : itPriceUSDT;
            }
        } else {
            itPrice = 0;
        }
        
        return (availableCapacity, totalValueLocked, annualFeePercentage, itPrice);
    }
    
    /**
     * @dev Process insurance payout in case of protocol hack
     * Burns IT tokens and pays out stablecoins to claimants
     * Only callable by owner (governance in production)
     */
    function processPayout(
        bytes32 protocolId,
        address claimant,
        uint256 itAmount
    ) external onlyOwner nonReentrant {
        ProtocolInfo storage protocol = protocols[protocolId];
        require(protocol.active, "Protocol not active");
        
        // Burn IT from claimant
        protocol.insuranceToken.burn(claimant, itAmount);
        
        // Convert to stablecoin amount (18 decimals to 6 decimals)
        uint256 payoutAmount = itAmount / 10**12;
        
        // Pay out in USDC (or USDT if insufficient)
        IERC20 payoutToken = USDC;
        if (payoutToken.balanceOf(address(this)) < payoutAmount) {
            payoutToken = USDT;
        }
        
        require(payoutToken.balanceOf(address(this)) >= payoutAmount, "Insufficient funds for payout");
        payoutToken.transfer(claimant, payoutAmount);
        
        // Track IT burnt from payouts
        protocol.totalITBurntFromPayouts += payoutAmount;
        protocol.totalDeposited -= payoutAmount;
        
        emit PayoutProcessed(protocolId, itAmount, payoutAmount);
    }
    
    // ========== ADMIN FUNCTIONS ==========
    
    /**
     * @dev Set the DEX contract address for price oracle
     */
    function setDexContract(address _dexContract) external onlyOwner {
        require(_dexContract != address(0), "Invalid DEX address");
        address oldDex = address(dexContract);
        dexContract = IDex(_dexContract);
        emit DexContractUpdated(oldDex, _dexContract);
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