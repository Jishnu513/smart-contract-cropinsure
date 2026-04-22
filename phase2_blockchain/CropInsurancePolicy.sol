// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title CropInsurancePolicy
 * @dev Smart Contract for Automated Crop Insurance System
 * @author Jishnu S - Smart Contract-Based Automated Crop Insurance System
 * 
 * Features:
 * - Farmer registration and policy creation
 * - Premium payment collection
 * - Automated claim verification (weather + NDVI)
 * - Instant payout execution
 * - Transparent and tamper-proof records
 */

contract CropInsurancePolicy {
    
    // ==================== STATE VARIABLES ====================
    
    address public owner;
    uint256 public policyCounter;
    uint256 public claimCounter;
    
    // ==================== STRUCTS ====================
    
    struct Farmer {
        address walletAddress;
        string name;
        string farmLocation;  // GPS coordinates as string
        uint256 farmArea;     // in hectares (scaled by 100, e.g., 250 = 2.5 hectares)
        string cropType;
        bool isRegistered;
        uint256 registrationDate;
    }
    
    struct Policy {
        uint256 policyId;
        address farmerAddress;
        string cropType;
        uint256 premiumAmount;      // in wei
        uint256 coverageAmount;     // in wei
        uint256 policyStartDate;
        uint256 policyEndDate;
        bool isPremiumPaid;
        bool isActive;
        uint256 creationDate;
    }
    
    struct ClaimVerification {
        bool weatherTrigger;
        bool ndviTrigger;
        uint256 verificationDate;
        string weatherData;      // JSON string with weather parameters
        string ndviData;         // JSON string with NDVI value
    }
    
    struct Claim {
        uint256 claimId;
        uint256 policyId;
        address farmerAddress;
        bool weatherTrigger;
        bool ndviTrigger;
        bool isApproved;
        bool isPaid;
        uint256 payoutAmount;
        uint256 claimDate;
        uint256 payoutDate;
        string verificationHash;  // IPFS hash for off-chain data
    }
    
    // ==================== MAPPINGS ====================
    
    mapping(address => Farmer) public farmers;
    mapping(uint256 => Policy) public policies;
    mapping(address => uint256[]) public farmerPolicies;
    mapping(uint256 => Claim) public claims;
    mapping(uint256 => uint256[]) public policyClaims;
    
    // ==================== EVENTS ====================
    
    event FarmerRegistered(
        address indexed farmerAddress,
        string name,
        uint256 timestamp
    );
    
    event PolicyCreated(
        uint256 indexed policyId,
        address indexed farmerAddress,
        uint256 premiumAmount,
        uint256 coverageAmount,
        uint256 timestamp
    );
    
    event PremiumPaid(
        uint256 indexed policyId,
        address indexed farmerAddress,
        uint256 amount,
        uint256 timestamp
    );
    
    event ClaimSubmitted(
        uint256 indexed claimId,
        uint256 indexed policyId,
        address indexed farmerAddress,
        uint256 timestamp
    );
    
    event ClaimVerified(
        uint256 indexed claimId,
        bool weatherTrigger,
        bool ndviTrigger,
        bool isApproved,
        uint256 timestamp
    );
    
    event PayoutExecuted(
        uint256 indexed claimId,
        address indexed farmerAddress,
        uint256 amount,
        uint256 timestamp
    );
    
    // ==================== MODIFIERS ====================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyRegisteredFarmer() {
        require(farmers[msg.sender].isRegistered, "Farmer not registered");
        _;
    }
    
    modifier policyExists(uint256 _policyId) {
        require(_policyId > 0 && _policyId <= policyCounter, "Policy does not exist");
        _;
    }
    
    modifier policyActive(uint256 _policyId) {
        require(policies[_policyId].isActive, "Policy is not active");
        require(block.timestamp >= policies[_policyId].policyStartDate, "Policy not started yet");
        require(block.timestamp <= policies[_policyId].policyEndDate, "Policy has expired");
        _;
    }
    
    // ==================== CONSTRUCTOR ====================
    
    constructor() {
        owner = msg.sender;
        policyCounter = 0;
        claimCounter = 0;
    }
    
    // ==================== FARMER REGISTRATION ====================
    
    /**
     * @dev Register a new farmer in the system
     */
    function registerFarmer(
        string memory _name,
        string memory _farmLocation,
        uint256 _farmArea,
        string memory _cropType
    ) public {
        require(!farmers[msg.sender].isRegistered, "Farmer already registered");
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(_farmArea > 0, "Farm area must be greater than 0");
        
        farmers[msg.sender] = Farmer({
            walletAddress: msg.sender,
            name: _name,
            farmLocation: _farmLocation,
            farmArea: _farmArea,
            cropType: _cropType,
            isRegistered: true,
            registrationDate: block.timestamp
        });
        
        emit FarmerRegistered(msg.sender, _name, block.timestamp);
    }
    
    // ==================== POLICY MANAGEMENT ====================
    
    /**
     * @dev Create a new insurance policy
     */
    function createPolicy(
        string memory _cropType,
        uint256 _premiumAmount,
        uint256 _coverageAmount,
        uint256 _policyDurationDays
    ) public onlyRegisteredFarmer returns (uint256) {
        require(_premiumAmount > 0, "Premium must be greater than 0");
        require(_coverageAmount > _premiumAmount, "Coverage must be greater than premium");
        require(_policyDurationDays >= 30, "Policy duration must be at least 30 days");
        
        policyCounter++;
        
        uint256 policyStartDate = block.timestamp;
        uint256 policyEndDate = block.timestamp + (_policyDurationDays * 1 days);
        
        policies[policyCounter] = Policy({
            policyId: policyCounter,
            farmerAddress: msg.sender,
            cropType: _cropType,
            premiumAmount: _premiumAmount,
            coverageAmount: _coverageAmount,
            policyStartDate: policyStartDate,
            policyEndDate: policyEndDate,
            isPremiumPaid: false,
            isActive: false,
            creationDate: block.timestamp
        });
        
        farmerPolicies[msg.sender].push(policyCounter);
        
        emit PolicyCreated(
            policyCounter,
            msg.sender,
            _premiumAmount,
            _coverageAmount,
            block.timestamp
        );
        
        return policyCounter;
    }
    
    /**
     * @dev Pay premium to activate policy
     */
    function payPremium(uint256 _policyId) 
        public 
        payable 
        policyExists(_policyId) 
    {
        Policy storage policy = policies[_policyId];
        
        require(msg.sender == policy.farmerAddress, "Only policy owner can pay premium");
        require(!policy.isPremiumPaid, "Premium already paid");
        require(msg.value == policy.premiumAmount, "Incorrect premium amount");
        
        policy.isPremiumPaid = true;
        policy.isActive = true;
        
        emit PremiumPaid(_policyId, msg.sender, msg.value, block.timestamp);
    }
    
    // ==================== CLAIM PROCESSING ====================
    
    /**
     * @dev Submit a claim with verification data
     */
    function submitClaim(
        uint256 _policyId,
        bool _weatherTrigger,
        bool _ndviTrigger,
        string memory _verificationHash
    ) 
        public 
        onlyRegisteredFarmer
        policyExists(_policyId)
        policyActive(_policyId)
        returns (uint256)
    {
        Policy storage policy = policies[_policyId];
        
        require(msg.sender == policy.farmerAddress, "Only policy owner can submit claim");
        require(policy.isPremiumPaid, "Premium not paid");
        require(bytes(_verificationHash).length > 0, "Verification hash required");
        
        claimCounter++;
        
        // Double verification: BOTH triggers must be TRUE for approval
        bool isApproved = _weatherTrigger && _ndviTrigger;
        uint256 payoutAmount = isApproved ? policy.coverageAmount : 0;
        
        claims[claimCounter] = Claim({
            claimId: claimCounter,
            policyId: _policyId,
            farmerAddress: msg.sender,
            weatherTrigger: _weatherTrigger,
            ndviTrigger: _ndviTrigger,
            isApproved: isApproved,
            isPaid: false,
            payoutAmount: payoutAmount,
            claimDate: block.timestamp,
            payoutDate: 0,
            verificationHash: _verificationHash
        });
        
        policyClaims[_policyId].push(claimCounter);
        
        emit ClaimSubmitted(claimCounter, _policyId, msg.sender, block.timestamp);
        emit ClaimVerified(claimCounter, _weatherTrigger, _ndviTrigger, isApproved, block.timestamp);
        
        // Automatic payout if approved
        if (isApproved) {
            _executePayout(claimCounter);
        }
        
        return claimCounter;
    }
    
    /**
     * @dev Execute payout for approved claim (internal function)
     */
    function _executePayout(uint256 _claimId) private {
        Claim storage claim = claims[_claimId];
        
        require(claim.isApproved, "Claim not approved");
        require(!claim.isPaid, "Claim already paid");
        require(address(this).balance >= claim.payoutAmount, "Insufficient contract balance");
        
        claim.isPaid = true;
        claim.payoutDate = block.timestamp;
        
        // Transfer payout to farmer
        payable(claim.farmerAddress).transfer(claim.payoutAmount);
        
        emit PayoutExecuted(_claimId, claim.farmerAddress, claim.payoutAmount, block.timestamp);
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    /**
     * @dev Get farmer details
     */
    function getFarmer(address _farmerAddress) 
        public 
        view 
        returns (
            string memory name,
            string memory farmLocation,
            uint256 farmArea,
            string memory cropType,
            bool isRegistered,
            uint256 registrationDate
        ) 
    {
        Farmer memory farmer = farmers[_farmerAddress];
        return (
            farmer.name,
            farmer.farmLocation,
            farmer.farmArea,
            farmer.cropType,
            farmer.isRegistered,
            farmer.registrationDate
        );
    }
    
    /**
     * @dev Get policy details
     */
    function getPolicy(uint256 _policyId) 
        public 
        view 
        policyExists(_policyId)
        returns (
            address farmerAddress,
            string memory cropType,
            uint256 premiumAmount,
            uint256 coverageAmount,
            uint256 policyStartDate,
            uint256 policyEndDate,
            bool isPremiumPaid,
            bool isActive
        ) 
    {
        Policy memory policy = policies[_policyId];
        return (
            policy.farmerAddress,
            policy.cropType,
            policy.premiumAmount,
            policy.coverageAmount,
            policy.policyStartDate,
            policy.policyEndDate,
            policy.isPremiumPaid,
            policy.isActive
        );
    }
    
    /**
     * @dev Get claim details
     */
    function getClaim(uint256 _claimId) 
        public 
        view 
        returns (
            uint256 policyId,
            address farmerAddress,
            bool weatherTrigger,
            bool ndviTrigger,
            bool isApproved,
            bool isPaid,
            uint256 payoutAmount,
            uint256 claimDate,
            string memory verificationHash
        ) 
    {
        Claim memory claim = claims[_claimId];
        return (
            claim.policyId,
            claim.farmerAddress,
            claim.weatherTrigger,
            claim.ndviTrigger,
            claim.isApproved,
            claim.isPaid,
            claim.payoutAmount,
            claim.claimDate,
            claim.verificationHash
        );
    }
    
    /**
     * @dev Get all policies for a farmer
     */
    function getFarmerPolicies(address _farmerAddress) 
        public 
        view 
        returns (uint256[] memory) 
    {
        return farmerPolicies[_farmerAddress];
    }
    
    /**
     * @dev Get all claims for a policy
     */
    function getPolicyClaims(uint256 _policyId) 
        public 
        view 
        policyExists(_policyId)
        returns (uint256[] memory) 
    {
        return policyClaims[_policyId];
    }
    
    /**
     * @dev Get contract balance
     */
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }
    
    // ==================== ADMIN FUNCTIONS ====================
    
    /**
     * @dev Fund the contract (owner only)
     */
    function fundContract() public payable onlyOwner {
        require(msg.value > 0, "Must send some ether");
    }
    
    /**
     * @dev Withdraw funds (owner only, emergency)
     */
    function withdrawFunds(uint256 _amount) public onlyOwner {
        require(_amount <= address(this).balance, "Insufficient balance");
        payable(owner).transfer(_amount);
    }
    
    /**
     * @dev Deactivate a policy (owner only, emergency)
     */
    function deactivatePolicy(uint256 _policyId) 
        public 
        onlyOwner 
        policyExists(_policyId) 
    {
        policies[_policyId].isActive = false;
    }
    
    // ==================== FALLBACK ====================
    
    receive() external payable {}
    fallback() external payable {}
}
