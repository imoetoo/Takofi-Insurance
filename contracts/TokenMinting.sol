// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

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
        _initializeMaturities(keccak256(abi.encodePacked(protocolName)));
    }

    // ========== MATURITY BUCKET FUNCTIONS ==========
    
    /**
     * @dev Initialize rolling maturity buckets for a protocol
     * Creates 6M and 12M expiry dates from current block timestamp
     */
    function _initializeMaturities(bytes32 protocolId) internal {
        uint256 currentTime = block.timestamp;
        
        // Calculate next June 30 and December 31
        uint256 nextJune30 = _getNextJune30(currentTime);
        uint256 nextDec31 = _getNextDec31(currentTime);
        
        // 6M bucket is always the nearer date, 12M is the farther date
        uint256 maturity6M;
        uint256 maturity12M;
        
        if (nextJune30 < nextDec31) {
            // June 30 is sooner
            maturity6M = nextJune30;
            maturity12M = nextDec31;
        } else {
            // Dec 31 is sooner
            maturity6M = nextDec31;
            maturity12M = nextJune30;
        }
        
        string memory label6M = _formatDateLabel(maturity6M);
        string memory label12M = _formatDateLabel(maturity12M);
        
        maturities[protocolId][MATURITY_6M] = MaturityBucket({
            expiryTime: maturity6M,
            label: label6M,
            isActive: true
        });
        
        maturities[protocolId][MATURITY_12M] = MaturityBucket({
            expiryTime: maturity12M,
            label: label12M,
            isActive: true
        });
        
        emit MaturityInitialized(protocolId, MATURITY_6M, maturity6M, label6M);
        emit MaturityInitialized(protocolId, MATURITY_12M, maturity12M, label12M);
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
            "6M maturity has not expired yet"
        );
        
        uint256 nextJune30 = _getNextJune30(currentTime);
        uint256 nextDec31 = _getNextDec31(currentTime);
        
        // Ensure 6M is sooner than 12M
        if (nextJune30 > nextDec31) {
            uint256 temp = nextJune30;
            nextJune30 = nextDec31;
            nextDec31 = temp + 365 days;
        }
        
        string memory newLabel6M = _formatDateLabel(nextJune30);
        string memory newLabel12M = _formatDateLabel(nextDec31);
        
        maturities[protocolId][MATURITY_6M] = MaturityBucket({
            expiryTime: nextJune30,
            label: newLabel6M,
            isActive: true
        });
        
        maturities[protocolId][MATURITY_12M] = MaturityBucket({
            expiryTime: nextDec31,
            label: newLabel12M,
            isActive: true
        });
        
        emit MaturitiesRolled(protocolId, nextJune30, nextDec31);
    }

    /**
     * @dev Get next June 30 from given timestamp
     */
    function _getNextJune30(uint256 timestamp) internal pure returns (uint256) {
        uint256 year = _getYear(timestamp);
        uint256 june30 = _mktime(year, 6, 30);
        
        if (timestamp > june30) {
            // If past June 30, next one is next year
            june30 = _mktime(year + 1, 6, 30);
        }
        
        return june30;
    }

    /**
     * @dev Get next December 31 from given timestamp
     */
    function _getNextDec31(uint256 timestamp) internal pure returns (uint256) {
        uint256 year = _getYear(timestamp);
        uint256 dec31 = _mktime(year, 12, 31);
        
        if (timestamp > dec31) {
            // If past December 31, next one is next year
            dec31 = _mktime(year + 1, 12, 31);
        }
        
        return dec31;
    }

    /**
     * @dev Extract year from unix timestamp (simplified, assumes Gregorian calendar)
     */
    function _getYear(uint256 timestamp) internal pure returns (uint256) {
        uint256 secondsPerYear = 31536000; // 365 days
        uint256 year = 1970 + timestamp / secondsPerYear;
        return year;
    }

    /**
     * @dev Convert date components to unix timestamp
     * Simplified version - assumes UTC timezone
     */
    function _mktime(uint256 year, uint256 month, uint256 day) internal pure returns (uint256) {
        // Days in month
        uint256[12] memory daysInMonth = [uint256(31), 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        
        // Adjust for leap year (Feb only)
        if (month > 2 && ((year % 4 == 0 && year % 100 != 0) || year % 400 == 0)) {
            daysInMonth[1] = 29;
        }
        
        require(month >= 1 && month <= 12, "Invalid month");
        require(day >= 1 && day <= daysInMonth[month - 1], "Invalid day");
        
        // Calculate days since epoch (1970-01-01)
        uint256 daysSinceEpoch = 0;
        
        // Add days for complete years
        for (uint256 y = 1970; y < year; y++) {
            if ((y % 4 == 0 && y % 100 != 0) || y % 400 == 0) {
                daysSinceEpoch += 366;
            } else {
                daysSinceEpoch += 365;
            }
        }
        
        // Add days for complete months in current year
        for (uint256 m = 1; m < month; m++) {
            daysSinceEpoch += daysInMonth[m - 1];
        }
        
        // Add remaining days
        daysSinceEpoch += day;
        
        // Convert to unix timestamp (seconds since epoch, at end of day 23:59:59)
        return (daysSinceEpoch - 1) * 86400 + 86399; // 86400 = seconds per day, +86399 for end of day
    }

    /**
     * @dev Format date label from unix timestamp (e.g., "Jun 30, 2026")
     */
    function _formatDateLabel(uint256 timestamp) internal pure returns (string memory) {
        // Simplified - just return the timestamp as string
        // In production, implement proper date formatting

        uint256 year = _getYear(timestamp);
        uint256 month = ((timestamp / 2592000) % 12) + 1; // Simplified month calc
        
        // Return "Mon DD, YYYY" format
        return string(abi.encodePacked("Maturity_", _uint2str(month), "_", _uint2str(year)));
    }

    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - (_i / 10) * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
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
        require(protocols[protocolId].active, "Protocol not active");
        require(stablecoin == address(USDT) || stablecoin == address(USDC), "Unsupported stablecoin");
        require(amount > 0, "Amount must be greater than 0");
        require(maturityIndex == MATURITY_6M || maturityIndex == MATURITY_12M, "Invalid maturity index");
        
        MaturityBucket storage bucket = maturities[protocolId][maturityIndex];
        require(bucket.isActive, "Maturity inactive");
        require(block.timestamp < bucket.expiryTime, "Maturity expired");
        
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
        require(address(dexContract) != address(0), "DEX contract not set");
        require(coverageAmount > 0, "Coverage amount must be greater than 0");
        
        ProtocolInfo memory protocol = protocols[protocolId];
        require(protocol.active, "Protocol not active");
        
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