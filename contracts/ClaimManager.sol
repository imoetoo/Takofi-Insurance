// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./TokenMinting.sol";
import "./TokenContracts.sol";

/**
 * @title ClaimManager
 * @notice Allows Insurance Token holders to submit breach claims for superadmin validation
 * @dev Centralized claim submission system - claims are reviewed by superadmin
 */
contract ClaimManager {
    // ========== STATE VARIABLES ==========
    
    ProtocolInsurance public protocolInsurance;
    address public constant SUPERADMIN = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    
    uint256 public claimCounter;
    
    // ========== STRUCTS ==========
    
    enum ClaimStatus {
        Pending,     // Awaiting superadmin review
        Approved,    // Approved by superadmin, settlement can proceed
        Rejected,    // Rejected by superadmin
        Settled      // Claim has been settled/paid out
    }
    
    struct Claim {
        uint256 claimId;
        bytes32 protocolId;
        uint256 maturityIndex;
        uint256 hackAmount;         // Amount hacked in stablecoin (6 decimals)
        uint256 hackDate;           // Unix timestamp of hack
        address claimant;           // User who submitted claim
        uint256 submissionTime;     // When claim was submitted
        string details;             // Description of the breach
        string attachmentURI;       // IPFS hash or URL to supporting documents
        ClaimStatus status;
        string superadminNotes;     // Notes from superadmin during review
        uint256 reviewTime;         // When superadmin reviewed the claim
    }
    
    // ========== MAPPINGS ==========
    
    // claimId => Claim
    mapping(uint256 => Claim) public claims;
    
    // protocolId => active claimId (0 if none)
    mapping(bytes32 => uint256) public activeClaimForProtocol;
    
    // User => list of their claim IDs
    mapping(address => uint256[]) public userClaims;
    
    // ========== EVENTS ==========
    
    event ClaimSubmitted(
        uint256 indexed claimId,
        bytes32 indexed protocolId,
        uint256 maturityIndex,
        uint256 hackAmount,
        uint256 hackDate,
        address indexed claimant,
        string details
    );
    
    event ClaimStatusChanged(
        uint256 indexed claimId,
        ClaimStatus oldStatus,
        ClaimStatus newStatus,
        string notes
    );
    
    event ClaimSettled(
        uint256 indexed claimId,
        bytes32 indexed protocolId,
        uint256 maturityIndex
    );
    
    // ========== MODIFIERS ==========
    
    modifier onlySuperadmin() {
        require(msg.sender == SUPERADMIN, "Only superadmin");
        _;
    }
    
    // ========== CONSTRUCTOR ==========
    
    constructor(address _protocolInsurance) {
        protocolInsurance = ProtocolInsurance(_protocolInsurance);
    }
    
    // ========== PUBLIC FUNCTIONS ==========
    
    /**
     * @notice Submit a new breach claim for a protocol
     * @param protocolId Protocol identifier
     * @param hackAmount Amount hacked in stablecoin (with decimals)
     * @param hackDate Unix timestamp of when hack occurred
     * @param details Description of the breach incident
     * @param attachmentURI Optional IPFS hash or URL to supporting documents
     */
    function submitClaim(
        bytes32 protocolId,
        uint256 hackAmount,
        uint256 hackDate,
        string memory details,
        string memory attachmentURI
    ) external returns (uint256) {
        require(hackAmount > 0, "Hack amount must be positive");
        require(hackDate <= block.timestamp, "Hack date cannot be in future");
        require(bytes(details).length > 0, "Details required");
        
        // Get protocol info to verify it exists
        (, bool active, , , , , ) = protocolInsurance.protocols(protocolId);
        require(active, "Protocol not active");
        
        // Determine maturity index for the user's IT tokens
        // We'll use the oldest maturity the user has IT in
        (uint256 maturityIndex, bool found) = _getUserMaturityIndex(msg.sender, protocolId);
        require(found, "No IT balance for this protocol");
        
        // Check there's no active claim for this protocol
        require(activeClaimForProtocol[protocolId] == 0, "Active claim exists for this protocol");
        
        // Verify maturity hasn't been settled yet
        (uint256 expiryTime, , , bool settled, , ) = protocolInsurance.maturities(protocolId, maturityIndex);
        require(!settled, "Maturity already settled");
        require(block.timestamp <= expiryTime, "Maturity expired");
        
        // Create claim
        claimCounter++;
        uint256 claimId = claimCounter;
        
        claims[claimId] = Claim({
            claimId: claimId,
            protocolId: protocolId,
            maturityIndex: maturityIndex,
            hackAmount: hackAmount,
            hackDate: hackDate,
            claimant: msg.sender,
            submissionTime: block.timestamp,
            details: details,
            attachmentURI: attachmentURI,
            status: ClaimStatus.Pending,
            superadminNotes: "",
            reviewTime: 0
        });
        
        activeClaimForProtocol[protocolId] = claimId;
        userClaims[msg.sender].push(claimId);
        
        emit ClaimSubmitted(
            claimId,
            protocolId,
            maturityIndex,
            hackAmount,
            hackDate,
            msg.sender,
            details
        );
        
        return claimId;
    }
    
    /**
     * @notice Update a pending claim's details
     * @param claimId ID of the claim to update
     * @param hackAmount New hack amount
     * @param hackDate New hack date
     * @param details New claim details
     * @param attachmentURI New attachment URI
     */
    function updateClaim(
        uint256 claimId,
        uint256 hackAmount,
        uint256 hackDate,
        string memory details,
        string memory attachmentURI
    ) external {
        Claim storage claim = claims[claimId];
        require(claim.claimId != 0, "Claim does not exist");
        require(claim.claimant == msg.sender, "Not claim owner");
        require(claim.status == ClaimStatus.Pending, "Can only update pending claims");
        
        require(hackAmount > 0, "Hack amount must be positive");
        require(hackDate <= block.timestamp, "Hack date cannot be in future");
        require(bytes(details).length > 0, "Details required");
        
        // Update claim fields
        claim.hackAmount = hackAmount;
        claim.hackDate = hackDate;
        claim.details = details;
        claim.attachmentURI = attachmentURI;
        
        emit ClaimStatusChanged(claimId, ClaimStatus.Pending, ClaimStatus.Pending, "Claim updated by user");
    }
    
    /**
     * @notice Superadmin approves a claim
     * @param claimId ID of the claim to approve
     * @param notes Notes from superadmin
     */
    function approveClaim(uint256 claimId, string memory notes) external onlySuperadmin {
        Claim storage claim = claims[claimId];
        require(claim.claimId != 0, "Claim does not exist");
        require(claim.status == ClaimStatus.Pending, "Claim not pending");
        
        ClaimStatus oldStatus = claim.status;
        claim.status = ClaimStatus.Approved;
        claim.superadminNotes = notes;
        claim.reviewTime = block.timestamp;
        
        emit ClaimStatusChanged(claimId, oldStatus, ClaimStatus.Approved, notes);
    }
    
    /**
     * @notice Superadmin rejects a claim
     * @param claimId ID of the claim to reject
     * @param notes Reason for rejection
     */
    function rejectClaim(uint256 claimId, string memory notes) external onlySuperadmin {
        Claim storage claim = claims[claimId];
        require(claim.claimId != 0, "Claim does not exist");
        require(claim.status == ClaimStatus.Pending, "Claim not pending");
        
        ClaimStatus oldStatus = claim.status;
        claim.status = ClaimStatus.Rejected;
        claim.superadminNotes = notes;
        claim.reviewTime = block.timestamp;
        
        // Remove active claim for protocol so new claims can be submitted
        activeClaimForProtocol[claim.protocolId] = 0;
        
        emit ClaimStatusChanged(claimId, oldStatus, ClaimStatus.Rejected, notes);
    }
    
    /**
     * @notice Finalize an approved claim and trigger settlement
     * @param claimId ID of the claim to finalize
     */
    function finalizeClaim(uint256 claimId) external onlySuperadmin {
        Claim storage claim = claims[claimId];
        require(claim.claimId != 0, "Claim does not exist");
        require(claim.status == ClaimStatus.Approved, "Claim not approved");
        
        // Call ProtocolInsurance to settle the maturity with breach
        protocolInsurance.settleMaturity(
            claim.protocolId,
            claim.maturityIndex,
            true,  // breach occurred
            claim.hackAmount
        );
        
        claim.status = ClaimStatus.Settled;
        
        // Remove active claim for protocol
        activeClaimForProtocol[claim.protocolId] = 0;
        
        emit ClaimSettled(claimId, claim.protocolId, claim.maturityIndex);
    }
    
    // ========== VIEW FUNCTIONS ==========
    
    /**
     * @notice Get all claim IDs for a user
     */
    function getUserClaims(address user) external view returns (uint256[] memory) {
        return userClaims[user];
    }
    
    /**
     * @notice Get claim details
     */
    function getClaim(uint256 claimId) external view returns (
        uint256,
        bytes32,
        uint256,
        uint256,
        uint256,
        address,
        uint256,
        string memory,
        string memory,
        ClaimStatus,
        string memory,
        uint256
    ) {
        Claim storage claim = claims[claimId];
        return (
            claim.claimId,
            claim.protocolId,
            claim.maturityIndex,
            claim.hackAmount,
            claim.hackDate,
            claim.claimant,
            claim.submissionTime,
            claim.details,
            claim.attachmentURI,
            claim.status,
            claim.superadminNotes,
            claim.reviewTime
        );
    }
    
    /**
     * @notice Get all pending claims (for superadmin)
     */
    function getAllPendingClaims() external view returns (uint256[] memory) {
        uint256 pendingCount = 0;
        
        // First pass: count pending claims
        for (uint256 i = 1; i <= claimCounter; i++) {
            if (claims[i].status == ClaimStatus.Pending) {
                pendingCount++;
            }
        }
        
        // Second pass: populate array
        uint256[] memory pendingClaims = new uint256[](pendingCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= claimCounter; i++) {
            if (claims[i].status == ClaimStatus.Pending) {
                pendingClaims[index] = i;
                index++;
            }
        }
        
        return pendingClaims;
    }
    
    // ========== INTERNAL FUNCTIONS ==========
    
    /**
     * @dev Get the maturity index where user has IT balance
     * Returns the first maturity found with balance, and a boolean indicating if found
     */
    function _getUserMaturityIndex(address user, bytes32 protocolId) internal view returns (uint256, bool) {
        // Check maturity indices 0-9 (we support up to 10 maturities)
        for (uint256 i = 0; i < 10; i++) {
            uint256 balance = protocolInsurance.userITByMaturity(user, protocolId, i);
            if (balance > 0) {
                return (i, true);
            }
        }
        return (0, false); // No balance found
    }
}
