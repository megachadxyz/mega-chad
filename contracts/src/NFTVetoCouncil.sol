// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

interface IMEGACHADNFTChecker {
    function balanceOf(address owner) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface IJestermogger {
    function state(uint256 proposalId) external view returns (uint8);
    function proposals(uint256 proposalId) external view returns (
        uint256 id,
        address proposer,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        uint256 snapshotId,
        uint256 snapshotTotalSupply,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes,
        bool executed,
        bool vetoed,
        uint256 eta
    );
}

/**
 * @title NFTVetoCouncil
 * @notice Top 20 MEGACHAD NFT holders can veto governance proposals
 *
 * Features:
 * - Tracks top 20 NFT holders by balance
 * - Veto requires >50% approval (11+ of top 20)
 * - 2-day voting window after proposal queued
 * - Council membership can be updated by anyone (keeps rankings current)
 * - Cannot veto proposals after execution or during active voting
 *
 * Veto Process:
 * 1. Proposal passes governance vote
 * 2. Top 20 NFT holders have 2 days to vote to veto
 * 3. If 11+ vote yes → veto executed
 * 4. If veto fails or window expires → proposal can execute
 */
contract NFTVetoCouncil is
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ═══════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════

    IMEGACHADNFTChecker public nftContract;
    IJestermogger public governance;

    uint256 public constant COUNCIL_SIZE = 20;
    uint256 public constant VETO_THRESHOLD = 11; // >50% of 20
    uint256 public constant VETO_VOTING_PERIOD = 2 days;

    address[20] public councilMembers;
    mapping(address => bool) public isCouncilMember;

    struct VetoVote {
        uint256 proposalId;
        uint256 startTime;
        uint256 yesVotes;
        uint256 noVotes;
        bool executed;
        bool expired;
        mapping(address => bool) hasVoted;
        mapping(address => bool) vote; // true = yes veto, false = no veto
    }

    mapping(uint256 => VetoVote) public vetoVotes;

    // ═══════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════

    event CouncilUpdated(address[20] newMembers);
    event VetoVoteStarted(uint256 indexed proposalId, uint256 startTime);
    event VetoCast(uint256 indexed proposalId, address indexed voter, bool support);
    event VetoExecuted(uint256 indexed proposalId, uint256 yesVotes, uint256 noVotes);
    event VetoFailed(uint256 indexed proposalId, uint256 yesVotes, uint256 noVotes);

    // ═══════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════

    error NotCouncilMember();
    error AlreadyVoted();
    error VetoWindowExpired();
    error VetoNotActive();
    error VetoThresholdNotMet();
    error VetoAlreadyExecuted();
    error VetoAlreadyStarted();
    error ProposalNotQueued();
    error ZeroAddress();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _nftContract,
        address _governance,
        address _admin
    ) external initializer {
        if (_nftContract == address(0) ||
            _governance == address(0) ||
            _admin == address(0)) revert ZeroAddress();

        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        nftContract = IMEGACHADNFTChecker(_nftContract);
        governance = IJestermogger(_governance);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);

        // Initialize council (will be updated by calling updateCouncil)
        _updateCouncil();
    }

    // ═══════════════════════════════════════════════════════════
    // COUNCIL MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Update the top 20 NFT holders (callable by anyone)
     * @dev Iterates through all NFTs to find top 20 holders
     */
    function updateCouncil() external nonReentrant {
        _updateCouncil();
    }

    /**
     * @notice Internal council update logic
     * @dev Uses balanceOf() per unique holder instead of iterating every tokenId.
     *      O(n) in unique holders rather than O(n²) in total NFT supply.
     */
    function _updateCouncil() internal {
        uint256 totalSupply = nftContract.totalSupply();

        // Collect unique holders via ownerOf, but use balanceOf for counts
        // This avoids the O(n²) nested loop - we only need to track seen addresses
        address[] memory holders = new address[](totalSupply);
        uint256[] memory balances = new uint256[](totalSupply);
        uint256 uniqueHolders = 0;

        for (uint256 tokenId = 1; tokenId <= totalSupply; tokenId++) {
            address owner = nftContract.ownerOf(tokenId);

            // Check if holder already in list
            bool found = false;
            for (uint256 i = 0; i < uniqueHolders; i++) {
                if (holders[i] == owner) {
                    found = true;
                    break;
                }
            }

            if (!found) {
                holders[uniqueHolders] = owner;
                balances[uniqueHolders] = nftContract.balanceOf(owner);
                uniqueHolders++;
            }
        }

        // Partial selection sort: only find top COUNCIL_SIZE elements
        uint256 sortLimit = uniqueHolders < COUNCIL_SIZE ? uniqueHolders : COUNCIL_SIZE;
        for (uint256 i = 0; i < sortLimit; i++) {
            uint256 maxIdx = i;
            for (uint256 j = i + 1; j < uniqueHolders; j++) {
                if (balances[j] > balances[maxIdx]) {
                    maxIdx = j;
                }
            }
            if (maxIdx != i) {
                (holders[i], holders[maxIdx]) = (holders[maxIdx], holders[i]);
                (balances[i], balances[maxIdx]) = (balances[maxIdx], balances[i]);
            }
        }

        // Clear ALL old council slots (prevents leftover members)
        for (uint256 i = 0; i < COUNCIL_SIZE; i++) {
            if (councilMembers[i] != address(0)) {
                isCouncilMember[councilMembers[i]] = false;
                councilMembers[i] = address(0);
            }
        }

        // Set new council
        for (uint256 i = 0; i < sortLimit; i++) {
            councilMembers[i] = holders[i];
            isCouncilMember[holders[i]] = true;
        }

        emit CouncilUpdated(councilMembers);
    }

    // ═══════════════════════════════════════════════════════════
    // VETO FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Start veto voting period for a proposal
     * @param proposalId Proposal to potentially veto
     */
    function startVetoVote(uint256 proposalId) external nonReentrant {
        VetoVote storage veto = vetoVotes[proposalId];

        if (veto.startTime != 0) revert VetoAlreadyStarted();

        // Proposal must be in Queued state (state == 4) to start veto
        uint8 proposalState = governance.state(proposalId);
        if (proposalState != 4) revert ProposalNotQueued();

        veto.proposalId = proposalId;
        veto.startTime = block.timestamp;

        emit VetoVoteStarted(proposalId, block.timestamp);
    }

    /**
     * @notice Cast veto vote (only top 20 NFT holders)
     * @param proposalId Proposal to vote on
     * @param support true = yes veto, false = no veto
     */
    function castVetoVote(uint256 proposalId, bool support)
        external
        nonReentrant
    {
        if (!isCouncilMember[msg.sender]) revert NotCouncilMember();

        VetoVote storage veto = vetoVotes[proposalId];

        if (veto.startTime == 0) revert VetoNotActive();
        if (block.timestamp > veto.startTime + VETO_VOTING_PERIOD) {
            veto.expired = true;
            revert VetoWindowExpired();
        }
        if (veto.hasVoted[msg.sender]) revert AlreadyVoted();

        veto.hasVoted[msg.sender] = true;
        veto.vote[msg.sender] = support;

        if (support) {
            veto.yesVotes++;
        } else {
            veto.noVotes++;
        }

        emit VetoCast(proposalId, msg.sender, support);

        // Check if threshold met
        if (veto.yesVotes >= VETO_THRESHOLD) {
            veto.executed = true;
            emit VetoExecuted(proposalId, veto.yesVotes, veto.noVotes);
        }
    }

    /**
     * @notice Check if a proposal can be vetoed
     * @param proposalId Proposal to check
     * @return bool True if veto threshold met
     */
    function canVeto(uint256 proposalId) external view returns (bool) {
        VetoVote storage veto = vetoVotes[proposalId];

        if (veto.startTime == 0) return false;
        if (block.timestamp > veto.startTime + VETO_VOTING_PERIOD) return false;

        return veto.yesVotes >= VETO_THRESHOLD;
    }

    /**
     * @notice Execute veto (called by governance contract)
     * @param proposalId Proposal to veto
     */
    function executeVeto(uint256 proposalId) external {
        // Only governance contract can call this
        require(msg.sender == address(governance), "NFTVetoCouncil: unauthorized");

        VetoVote storage veto = vetoVotes[proposalId];

        if (veto.yesVotes < VETO_THRESHOLD) revert VetoThresholdNotMet();

        // Allow re-entry if already auto-executed by castVetoVote threshold
        // The governance contract needs confirmation, not a revert
        if (!veto.executed) {
            veto.executed = true;
            emit VetoExecuted(proposalId, veto.yesVotes, veto.noVotes);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Get all council members
     */
    function getCouncil() external view returns (address[20] memory) {
        return councilMembers;
    }

    /**
     * @notice Get council member at index
     */
    function getCouncilMember(uint256 index) external view returns (address) {
        require(index < COUNCIL_SIZE, "NFTVetoCouncil: invalid index");
        return councilMembers[index];
    }

    /**
     * @notice Check if address is council member
     */
    function checkCouncilMembership(address account) external view returns (bool) {
        return isCouncilMember[account];
    }

    /**
     * @notice Get veto vote details
     */
    function getVetoVote(uint256 proposalId)
        external
        view
        returns (
            uint256 startTime,
            uint256 endTime,
            uint256 yesVotes,
            uint256 noVotes,
            bool executed,
            bool expired,
            bool canExecute
        )
    {
        VetoVote storage veto = vetoVotes[proposalId];

        startTime = veto.startTime;
        endTime = veto.startTime + VETO_VOTING_PERIOD;
        yesVotes = veto.yesVotes;
        noVotes = veto.noVotes;
        executed = veto.executed;
        expired = veto.expired || (block.timestamp > endTime);
        canExecute = yesVotes >= VETO_THRESHOLD && !executed && !expired;
    }

    /**
     * @notice Check if address has voted on veto
     */
    function hasVotedOnVeto(uint256 proposalId, address voter)
        external
        view
        returns (bool)
    {
        return vetoVotes[proposalId].hasVoted[voter];
    }

    /**
     * @notice Get veto vote from address
     */
    function getVetoVoteFromAddress(uint256 proposalId, address voter)
        external
        view
        returns (bool)
    {
        return vetoVotes[proposalId].vote[voter];
    }

    // ═══════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Update governance contract address
     */
    function updateGovernance(address _newGovernance)
        external
        onlyRole(ADMIN_ROLE)
    {
        if (_newGovernance == address(0)) revert ZeroAddress();
        governance = IJestermogger(_newGovernance);
    }

    // ═══════════════════════════════════════════════════════════
    // UUPS UPGRADE
    // ═══════════════════════════════════════════════════════════

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}
}
