// SPDX-License-Identifier: MIT
/**
 * @title ProtocolInsurance
 * @notice [MAIN CONTRACT] Protocol insurance system - manages minting/burning of insurance and principal tokens,
 * handles maturity settlements, processes payouts, and coordinates with helper contracts for date calculations and settlements
 */
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TokenContracts.sol";
import "./MaturityManager.sol";
import "./ProtocolManager.sol";
import "./InsuranceCalculator.sol";
import "./MaturityHelper.sol";
import "./SettlementHelper.sol";

contract ProtocolInsurance is Ownable, ReentrancyGuard {
    
    // Helper contracts
    MaturityHelper public maturityHelper;
    SettlementHelper public settlementHelper;
    
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
    
    constructor(address _usdt, address _usdc, address _maturityHelper, address _settlementHelper) Ownable(msg.sender) {
        USDT = IERC20(_usdt);
        USDC = IERC20(_usdc);
        maturityHelper = MaturityHelper(_maturityHelper);
        settlementHelper = SettlementHelper(_settlementHelper);
        
        // Automatically setup all protocols on deployment with 0% fee
        bytes32 protocolId;
        protocolId = ProtocolManager.addProtocol(protocols, "SushiSwap", 0);
        _initializeMaturitiesWithHelper(protocolId);
        
        protocolId = ProtocolManager.addProtocol(protocols, "Curve Finance", 0);
        _initializeMaturitiesWithHelper(protocolId);
        
        protocolId = ProtocolManager.addProtocol(protocols, "Aave", 0);
        _initializeMaturitiesWithHelper(protocolId);
        
        protocolId = ProtocolManager.addProtocol(protocols, "Uniswap V3", 0);
        _initializeMaturitiesWithHelper(protocolId);
        
        protocolId = ProtocolManager.addProtocol(protocols, "Compound", 0);
        _initializeMaturitiesWithHelper(protocolId);
        
        protocolId = ProtocolManager.addProtocol(protocols, "PancakeSwap", 0);
        _initializeMaturitiesWithHelper(protocolId);
    }
    
    function _initializeMaturitiesWithHelper(bytes32 protocolId) internal {
        (MaturityBucket memory mat6M, MaturityBucket memory mat12M) = maturityHelper.initializeMaturities();
        maturities[protocolId][MATURITY_6M] = mat6M;
        maturities[protocolId][MATURITY_12M] = mat12M;
        emit MaturityInitialized(protocolId, MATURITY_6M, mat6M.expiryTime, mat6M.label);
        emit MaturityInitialized(protocolId, MATURITY_12M, mat12M.expiryTime, mat12M.label);
    }
    
    // External function to add additional protocols (only owner)
    function addProtocol(
        string memory protocolName,
        uint256 mintingFee
    ) external onlyOwner {
        bytes32 protocolId = ProtocolManager.addProtocol(protocols, protocolName, mintingFee);
        _initializeMaturitiesWithHelper(protocolId);
    }

    // ========== MATURITY BUCKET FUNCTIONS ==========
    
    /**
     * @dev Roll expired maturity buckets to next generation
     */
    function rollMaturities(bytes32 protocolId) external {
        require(block.timestamp >= maturities[protocolId][MATURITY_6M].expiryTime, "");
        
        (MaturityBucket memory mat6M, MaturityBucket memory mat12M) = maturityHelper.calculateNextMaturities();
        maturities[protocolId][MATURITY_6M] = mat6M;
        maturities[protocolId][MATURITY_12M] = mat12M;
        
        emit MaturitiesRolled(protocolId, mat6M.expiryTime, mat12M.expiryTime);
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
        return maturityHelper.getDaysUntilMaturity(maturities[protocolId][maturityIndex].expiryTime);
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
        return ProtocolManager.getProtocolId(protocolName);
    }
    
    /**
     * @dev Get the available capacity for a protocol
     */
    function getAvailableCapacity(bytes32 protocolId) public view returns (uint256) {
        return ProtocolManager.getAvailableCapacity(protocols, protocolId);
    }
    
    /**
     * @dev Calculate annual fee percentage based on DEX order book price
     */
    function calculateAnnualFee(bytes32 protocolId, uint256 coverageAmount, uint256 maturityIndex) public view returns (uint256) {
        return InsuranceCalculator.calculateAnnualFee(
            protocols,
            dexContract,
            USDC,
            USDT,
            protocolId,
            coverageAmount,
            maturityIndex
        );
    }
    
    /**
     * @dev Get comprehensive insurance market metrics for a protocol
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
        annualFeePercentage = calculateAnnualFee(protocolId, 1 * 10**6, 0);
        itPrice = InsuranceCalculator.getITPrice(protocol, dexContract, USDC, USDT, 0);
        
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
        
        itPrice = InsuranceCalculator.getITPrice(protocol, dexContract, USDC, USDT, maturityIndex);
        
        // Calculate TVL for this specific maturity
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
     */
    function settleMaturity(
        bytes32 protocolId,
        uint256 maturityIndex,
        bool breachOccurred,
        uint256 totalITPayout
    ) external onlyOwner {
        MaturityBucket storage maturity = maturities[protocolId][maturityIndex];
        settlementHelper.validateSettlement(maturity, block.timestamp);
        
        maturity.isSettled = true;
        maturity.breachOccurred = breachOccurred;
        maturity.totalITPayout = totalITPayout;
        
        if (breachOccurred && totalITPayout > 0) {
            ProtocolInfo storage protocol = protocols[protocolId];
            protocol.totalDeposited -= totalITPayout;
            protocol.totalITBurntFromPayouts += totalITPayout;
        }
        
        emit MaturitySettled(protocolId, maturityIndex, breachOccurred, totalITPayout);
    }
    
    /**
     * @dev Redeem principal tokens after maturity settlement
     */
    function redeemPrincipalTokens(
        bytes32 protocolId,
        uint256 maturityIndex,
        uint256 ptAmount
    ) external nonReentrant {
        MaturityBucket storage maturity = maturities[protocolId][maturityIndex];
        require(maturity.isActive, "");
        
        // Auto-settle if conditions met
        if (settlementHelper.canAutoSettle(maturity, block.timestamp)) {
            maturity.isSettled = true;
            emit MaturitySettled(protocolId, maturityIndex, false, 0);
        }
        
        require(maturity.isSettled, "");
        
        ProtocolInfo storage protocol = protocols[protocolId];
        uint256 userPT = userPTByMaturity[msg.sender][protocolId][maturityIndex];
        uint256 totalPT = totalPTByMaturity[protocolId][maturityIndex];
        
        // Use helper for calculation
        uint256 payoutAmount = settlementHelper.calculatePTRedemption(
            ptAmount,
            userPT,
            totalPT,
            protocol.totalDeposited,
            maturity.totalITPayout
        );
        
        // Burn PT
        protocol.principalToken.burn(msg.sender, ptAmount);
        userPTByMaturity[msg.sender][protocolId][maturityIndex] -= ptAmount;
        totalPTByMaturity[protocolId][maturityIndex] -= ptAmount;
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
     */
    function claimInsurancePayout(
        bytes32 protocolId,
        uint256 maturityIndex,
        uint256 itAmount
    ) external nonReentrant {
        MaturityBucket storage maturity = maturities[protocolId][maturityIndex];
        require(maturity.isActive, "");
        require(maturity.isSettled, "");
        require(maturity.breachOccurred, "");
        
        ProtocolInfo storage protocol = protocols[protocolId];
        uint256 userIT = userITByMaturity[msg.sender][protocolId][maturityIndex];
        uint256 totalIT = totalITByMaturity[protocolId][maturityIndex];
        
        // Use helper for calculation
        uint256 payoutAmount = settlementHelper.calculateITClaim(
            itAmount,
            userIT,
            totalIT,
            maturity.totalITPayout
        );
        
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
        uint256 userIT = userITByMaturity[msg.sender][protocolId][maturityIndex];
        require(userIT > 0, "");
        
        // Burn IT
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