// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./BokkyPooBahsDateTimeLibrary.sol";

// ========== MATURITY BUCKET SUPPORT ==========
// Constants for maturity indices
uint256 constant MATURITY_6M = 0;
uint256 constant MATURITY_12M = 1;

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
    function getBestPrice(address base, address quote, uint256 maturityIndex, actionType action) external view returns (uint256);
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

    struct MaturityBucket {
        uint256 expiryTime;
        string label;
        bool isActive;
        bool isSettled;
        bool breachOccurred;
        uint256 totalITPayout;
    }
    
    // Supported stablecoins
    IERC20 public immutable USDT;
    IERC20 public immutable USDC;
    
    // DEX contract for price oracle
    IDex public dexContract;
    
    // Protocol mappings
    mapping(bytes32 => ProtocolInfo) public protocols;
    mapping(address => mapping(bytes32 => uint256)) public userDeposits;
    
    // Maturity bucket mappings: protocol → maturityIndex → MaturityBucket
    mapping(bytes32 => mapping(uint256 => MaturityBucket)) public maturities;
    
    // Track total IT/PT issued per maturity: protocol → maturityIndex → total
    mapping(bytes32 => mapping(uint256 => uint256)) public totalITByMaturity;
    mapping(bytes32 => mapping(uint256 => uint256)) public totalPTByMaturity;
    
    // User balances by maturity: user → protocol → maturityIndex → balance
    mapping(address => mapping(bytes32 => mapping(uint256 => uint256))) public userITByMaturity;
    mapping(address => mapping(bytes32 => mapping(uint256 => uint256))) public userPTByMaturity;
    
    // Events
    event ProtocolAdded(bytes32 indexed protocolId, string name);
    event TokensMinted(
        address indexed user,
        bytes32 indexed protocolId,
        uint256 maturityIndex,
        address token,
        uint256 amount,
        uint256 insuranceTokens,
        uint256 principalTokens,
        uint256 expiryTime
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
    event MaturityInitialized(bytes32 indexed protocolId, uint256 maturityIndex, uint256 expiryTime, string label);
    event MaturityRolled(bytes32 indexed protocolId, uint256 maturityIndex, uint256 newExpiryTime);
    event MaturitiesRolled(bytes32 indexed protocolId, uint256 newExpiry6M, uint256 newExpiry12M);
    event MaturitySettled(bytes32 indexed protocolId, uint256 maturityIndex, bool breachOccurred, uint256 totalITPayout);
    event PrincipalRedeemed(address indexed user, bytes32 indexed protocolId, uint256 maturityIndex, uint256 ptAmount, uint256 payoutAmount);
    event InsuranceClaimed(address indexed user, bytes32 indexed protocolId, uint256 maturityIndex, uint256 itAmount, uint256 payoutAmount);
    event ExpiredITBurned(address indexed user, bytes32 indexed protocolId, uint256 maturityIndex, uint256 itAmount);
    
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
        
        // Initialize maturity buckets for all protocols
        bytes32[] memory protocolIds = new bytes32[](6);
        protocolIds[0] = keccak256(abi.encodePacked("SushiSwap"));
        protocolIds[1] = keccak256(abi.encodePacked("Curve Finance"));
        protocolIds[2] = keccak256(abi.encodePacked("Aave"));
        protocolIds[3] = keccak256(abi.encodePacked("Uniswap V3"));
        protocolIds[4] = keccak256(abi.encodePacked("Compound"));
        protocolIds[5] = keccak256(abi.encodePacked("PancakeSwap"));
        
        for (uint256 i = 0; i < protocolIds.length; i++) {
            _initializeMaturities(protocolIds[i]);
        }
    }
    
    // Internal function to add protocols (used in constructor and externally)
    function _addProtocol(
        string memory protocolName,
        uint256 mintingFee
    ) internal {
        bytes32 protocolId = keccak256(abi.encodePacked(protocolName));
        require(!protocols[protocolId].active, "");
        
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
        _initializeMaturities(keccak256(abi.encodePacked(protocolName)));
    }

    // ========== MATURITY BUCKET FUNCTIONS ==========
    
    /**
     * @dev Initialize rolling maturity buckets for a protocol
     * Creates 6M and 12M expiry dates from current block timestamp
     */
    function _initializeMaturities(bytes32 protocolId) internal {
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
     * Can be called by anyone (typically via automation/keeper)
     */
    function rollMaturities(bytes32 protocolId) external {
        uint256 currentTime = block.timestamp;
        
        // Check if 6M bucket has expired
        require(
            currentTime >= maturities[protocolId][MATURITY_6M].expiryTime,
"");
        
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
     * @dev Get maturity bucket details
     */
    function getMaturity(bytes32 protocolId, uint256 maturityIndex)
        external
        view
        returns (MaturityBucket memory)
    {
        return maturities[protocolId][maturityIndex];
    }

    /**
     * @dev Get both maturities for a protocol
     */
    function getMaturities(bytes32 protocolId)
        external
        view
        returns (MaturityBucket memory maturity6M, MaturityBucket memory maturity12M)
    {
        maturity6M = maturities[protocolId][MATURITY_6M];
        maturity12M = maturities[protocolId][MATURITY_12M];
    }

    /**
     * @dev Check if maturity has expired
     */
    function isMaturityExpired(bytes32 protocolId, uint256 maturityIndex)
        public
        view
        returns (bool)
    {
        return block.timestamp >= maturities[protocolId][maturityIndex].expiryTime;
    }

    /**
     * @dev Get days until maturity expires
     */
    function getDaysUntilMaturity(bytes32 protocolId, uint256 maturityIndex)
        external
        view
        returns (uint256)
    {
        uint256 expiryTime = maturities[protocolId][maturityIndex].expiryTime;
        if (block.timestamp >= expiryTime) return 0;
        return (expiryTime - block.timestamp) / 86400;
    }
    
    function mintTokens(
        bytes32 protocolId,
        uint256 maturityIndex,
        address stablecoin,
        uint256 amount
    ) external nonReentrant {
        require(protocols[protocolId].active, "");
        require(stablecoin == address(USDT) || stablecoin == address(USDC), "");
        require(amount > 0, "");
        require(maturityIndex == MATURITY_6M || maturityIndex == MATURITY_12M, "");
        
        MaturityBucket storage bucket = maturities[protocolId][maturityIndex];
        require(bucket.isActive, "");
        require(block.timestamp < bucket.expiryTime, "");
        
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
        
        // Track by maturity
        userITByMaturity[msg.sender][protocolId][maturityIndex] += tokenAmount;
        userPTByMaturity[msg.sender][protocolId][maturityIndex] += tokenAmount;
        
        totalITByMaturity[protocolId][maturityIndex] += tokenAmount;
        totalPTByMaturity[protocolId][maturityIndex] += tokenAmount;
        
        // Update overall records
        userDeposits[msg.sender][protocolId] += netAmount;
        protocol.totalDeposited += netAmount;
        
        emit TokensMinted(
            msg.sender,
            protocolId,
            maturityIndex,
            stablecoin,
            amount,
            netAmount,
            netAmount,
            bucket.expiryTime
        );
    }
    
    function burnTokens(
        bytes32 protocolId,
        uint256 insuranceAmount,
        uint256 principalAmount,
        address preferredStablecoin
    ) external nonReentrant {
        require(protocols[protocolId].active, "");
        require(insuranceAmount == principalAmount, "");
        require(preferredStablecoin == address(USDT) || preferredStablecoin == address(USDC), "");
        
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

    /**
     * @dev Get user's IT balance for specific maturity
     */
    function getUserITByMaturity(
        address user,
        bytes32 protocolId,
        uint256 maturityIndex
    ) external view returns (uint256) {
        return userITByMaturity[user][protocolId][maturityIndex];
    }

    /**
     * @dev Get user's PT balance for specific maturity
     */
    function getUserPTByMaturity(
        address user,
        bytes32 protocolId,
        uint256 maturityIndex
    ) external view returns (uint256) {
        return userPTByMaturity[user][protocolId][maturityIndex];
    }

    /**
     * @dev Get total IT issued for a maturity
     */
    function getTotalITByMaturity(
        bytes32 protocolId,
        uint256 maturityIndex
    ) external view returns (uint256) {
        return totalITByMaturity[protocolId][maturityIndex];
    }

    /**
     * @dev Get total PT issued for a maturity
     */
    function getTotalPTByMaturity(
        bytes32 protocolId,
        uint256 maturityIndex
    ) external view returns (uint256) {
        return totalPTByMaturity[protocolId][maturityIndex];
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
    function calculateAnnualFee(bytes32 protocolId, uint256 coverageAmount, uint256 maturityIndex) public view returns (uint256) {
        require(address(dexContract) != address(0), "");
        require(coverageAmount > 0, "");
        
        ProtocolInfo memory protocol = protocols[protocolId];
        require(protocol.active, "");
        
        // Get the cheapest sell price from DEX for BOTH USDC and USDT markets
        // base = Insurance Token, quote = USDC or USDT
        // We want SELL orders (people selling IT) which is what buyers see
        // Use the provided maturityIndex for maturity-specific pricing
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
        
        // Calculate annual fee for 1 USDC/USDT of coverage using maturity 0 as default for protocol-level view
        annualFeePercentage = calculateAnnualFee(protocolId, 1 * 10**6, 0);
        
        // Get IT price from DEX if available - return minimum of USDC and USDT markets
        if (address(dexContract) != address(0)) {
            uint256 itPriceUSDC = dexContract.getBestPrice(
                address(protocol.insuranceToken),
                address(USDC),
                0, // maturityIndex - use 0 as default for protocol-level metrics
                IDex.actionType.BUY
            );
            
            uint256 itPriceUSDT = dexContract.getBestPrice(
                address(protocol.insuranceToken),
                address(USDT),
                0, // maturityIndex - use 0 as default for protocol-level metrics
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
     * @dev Get insurance market metrics for a specific maturity bucket
     */
    function getInsuranceMarketMetricsByMaturity(
        bytes32 protocolId,
        uint256 maturityIndex
    ) external view returns (
        uint256 availableCapacity,
        uint256 totalValueLocked,
        uint256 annualFeePercentage,
        uint256 itPrice
    ) {
        ProtocolInfo memory protocol = protocols[protocolId];
        
        // Get IT price from DEX if available - return minimum of USDC and USDT markets
        if (address(dexContract) != address(0)) {
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
        
        // Calculate TVL for this specific maturity
        // TVL = Total deposited USDT value (convert IT from 18 decimals to 6 decimals)
        // Since tokens are minted 1:1 with deposited USDT, just convert decimals
        uint256 totalIT = totalITByMaturity[protocolId][maturityIndex];
        totalValueLocked = totalIT / 10**12; // Convert from 18 decimals to 6 decimals
        
        // Calculate maturity-specific metrics
        availableCapacity = getAvailableCapacity(protocolId);
        annualFeePercentage = calculateAnnualFee(protocolId, 1 * 10**6, maturityIndex);
        
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
        require(protocol.active, "");
        
        // Burn IT from claimant
        protocol.insuranceToken.burn(claimant, itAmount);
        
        // Convert to stablecoin amount (18 decimals to 6 decimals)
        uint256 payoutAmount = itAmount / 10**12;
        
        // Pay out in USDC (or USDT if insufficient)
        IERC20 payoutToken = USDC;
        if (payoutToken.balanceOf(address(this)) < payoutAmount) {
            payoutToken = USDT;
        }
        
        require(payoutToken.balanceOf(address(this)) >= payoutAmount, "");
        payoutToken.transfer(claimant, payoutAmount);
        
        // Track IT burnt from payouts
        protocol.totalITBurntFromPayouts += payoutAmount;
        protocol.totalDeposited -= payoutAmount;
        
        emit PayoutProcessed(protocolId, itAmount, payoutAmount);
    }
    
    // ========== SETTLEMENT & REDEMPTION FUNCTIONS ==========
    
    /**
     * @dev Settle a maturity after it expires
     * @param protocolId The protocol identifier
     * @param maturityIndex The maturity index (0 = 6M, 1 = 12M)
     * @param breachOccurred Whether a breach/hack occurred
     * @param totalITPayout Total IT payout amount (in USDC/USDT decimals = 6)
     * Only callable by owner (oracle/guardian in production)
     */
    function settleMaturity(
        bytes32 protocolId,
        uint256 maturityIndex,
        bool breachOccurred,
        uint256 totalITPayout
    ) external onlyOwner {
        MaturityBucket storage maturity = maturities[protocolId][maturityIndex];
        require(maturity.isActive, "");
        require(!maturity.isSettled, "");
        require(block.timestamp >= maturity.expiryTime, "");
        
        maturity.isSettled = true;
        maturity.breachOccurred = breachOccurred;
        maturity.totalITPayout = totalITPayout;
        
        if (breachOccurred && totalITPayout > 0) {
            // Update protocol total deposited
            ProtocolInfo storage protocol = protocols[protocolId];
            protocol.totalDeposited -= totalITPayout;
            protocol.totalITBurntFromPayouts += totalITPayout;
        }
        
        emit MaturitySettled(protocolId, maturityIndex, breachOccurred, totalITPayout);
    }
    
    /**
     * @dev Redeem principal tokens after maturity settlement
     * @param protocolId The protocol identifier
     * @param maturityIndex The maturity index
     * @param ptAmount Amount of PT to redeem (18 decimals)
     */
    function redeemPrincipalTokens(
        bytes32 protocolId,
        uint256 maturityIndex,
        uint256 ptAmount
    ) external nonReentrant {
        require(ptAmount > 0, "");
        
        MaturityBucket storage maturity = maturities[protocolId][maturityIndex];
        require(maturity.isActive, "");
        
        // Auto-settle if expired but not yet settled
        if (!maturity.isSettled && isMaturityExpired(protocolId, maturityIndex)) {
            // Only auto-settle if no breach has occurred
            // If breachOccurred is already true, don't override it
            if (!maturity.breachOccurred) {
                maturity.isSettled = true;
                // breachOccurred remains false (default)
                maturity.totalITPayout = 0;
                emit MaturitySettled(protocolId, maturityIndex, false, 0);
            } else {
                // Breach already occurred, cannot auto-settle
                revert("breach_requires_manual_settlement");
            }
        }
        
        require(maturity.isSettled, "!settled");
        // PT can be redeemed even if breach occurred, but at impaired value
        
        ProtocolInfo storage protocol = protocols[protocolId];
        
        // Check user balance
        uint256 userPT = userPTByMaturity[msg.sender][protocolId][maturityIndex];
        require(userPT >= ptAmount, "");
        
        // Calculate redemption value
        uint256 totalPT = totalPTByMaturity[protocolId][maturityIndex];
        require(totalPT > 0, "");
        
        // Redemption value per PT = (totalDeposited - totalITPayout) / totalPT
        // If breach occurred, totalITPayout > 0, so PT value is impaired
        // If no breach, totalITPayout = 0, so PT redeems at full value
        uint256 totalValueForPT = protocol.totalDeposited - maturity.totalITPayout;
        uint256 payoutAmount = (totalValueForPT * ptAmount) / totalPT;
        
        // Burn PT
        protocol.principalToken.burn(msg.sender, ptAmount);
        userPTByMaturity[msg.sender][protocolId][maturityIndex] -= ptAmount;
        totalPTByMaturity[protocolId][maturityIndex] -= ptAmount;
        
        // Reduce total deposited by payout amount
        protocol.totalDeposited -= payoutAmount;
        
        // Transfer stablecoin
        IERC20 payoutToken = USDC;
        if (payoutToken.balanceOf(address(this)) < payoutAmount) {
            payoutToken = USDT;
        }
        require(payoutToken.balanceOf(address(this)) >= payoutAmount, "");
        payoutToken.transfer(msg.sender, payoutAmount);
        
        emit PrincipalRedeemed(msg.sender, protocolId, maturityIndex, ptAmount, payoutAmount);
    }
    
    /**
     * @dev Claim insurance payout after breach settlement
     * @param protocolId The protocol identifier
     * @param maturityIndex The maturity index
     * @param itAmount Amount of IT to claim with (18 decimals)
     */
    function claimInsurancePayout(
        bytes32 protocolId,
        uint256 maturityIndex,
        uint256 itAmount
    ) external nonReentrant {
        require(itAmount > 0, "");
        
        MaturityBucket storage maturity = maturities[protocolId][maturityIndex];
        require(maturity.isActive, "");
        require(maturity.isSettled, "");
        require(maturity.breachOccurred, "");
        
        ProtocolInfo storage protocol = protocols[protocolId];
        
        // Check user balance
        uint256 userIT = userITByMaturity[msg.sender][protocolId][maturityIndex];
        require(userIT >= itAmount, "");
        
        // Calculate payout value
        uint256 totalIT = totalITByMaturity[protocolId][maturityIndex];
        require(totalIT > 0, "");
        
        // Payout value = totalITPayout * itAmount / totalIT
        uint256 payoutAmount = (maturity.totalITPayout * itAmount) / totalIT;
        
        // Burn IT
        protocol.insuranceToken.burn(msg.sender, itAmount);
        userITByMaturity[msg.sender][protocolId][maturityIndex] -= itAmount;
        totalITByMaturity[protocolId][maturityIndex] -= itAmount;
        
        // Transfer stablecoin
        IERC20 payoutToken = USDC;
        if (payoutToken.balanceOf(address(this)) < payoutAmount) {
            payoutToken = USDT;
        }
        require(payoutToken.balanceOf(address(this)) >= payoutAmount, "");
        payoutToken.transfer(msg.sender, payoutAmount);
        
        emit InsuranceClaimed(msg.sender, protocolId, maturityIndex, itAmount, payoutAmount);
    }
    
    /**
     * @dev Burn expired insurance tokens after maturity with no breach
     * @param protocolId The protocol identifier
     * @param maturityIndex The maturity index
     */
    function burnExpiredInsuranceTokens(
        bytes32 protocolId,
        uint256 maturityIndex
    ) external nonReentrant {
        MaturityBucket storage maturity = maturities[protocolId][maturityIndex];
        require(maturity.isActive, "");
        require(maturity.isSettled, "");
        require(!maturity.breachOccurred, "");
        
        ProtocolInfo storage protocol = protocols[protocolId];
        
        // Check user balance
        uint256 userIT = userITByMaturity[msg.sender][protocolId][maturityIndex];
        require(userIT > 0, "");
        
        // Burn IT (worthless after maturity with no breach)
        protocol.insuranceToken.burn(msg.sender, userIT);
        userITByMaturity[msg.sender][protocolId][maturityIndex] = 0;
        totalITByMaturity[protocolId][maturityIndex] -= userIT;
        
        emit ExpiredITBurned(msg.sender, protocolId, maturityIndex, userIT);
    }
    
    // ========== ADMIN FUNCTIONS ==========
    
    /**
     * @dev Set the DEX contract address for price oracle
     */
    function setDexContract(address _dexContract) external onlyOwner {
        require(_dexContract != address(0), "");
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