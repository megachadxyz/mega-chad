// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

interface IMEGAGOONERSnapshot {
    function balanceOfAt(address account, uint256 snapshotId) external view returns (uint256);
    function totalSupplyAt(uint256 snapshotId) external view returns (uint256);
    function snapshot() external returns (uint256);
}

interface INFTVetoCouncil {
    function canVeto(uint256 proposalId) external view returns (bool);
    function executeVeto(uint256 proposalId) external;
}

interface ICircuitBreaker {
    function isPaused() external view returns (bool);
}

interface IFramemogger {
    function canPropose(address account) external view returns (bool);
}

/**
 * @title Jestermogger
 * @notice Burn-to-Govern: Only top 3 MEGACHAD burners can propose, MEGAGOONER holders vote
 *
 * Two-Tier Governance:
 * - Proposal Creation: Top 3 weekly MEGACHAD burners (via Framemogger)
 * - Voting: MEGAGOONER token holders (1 token = 1 vote)
 *
 * Features:
 * - Burn-gated proposals (only top 3 burners can propose)
 * - Snapshot-based voting (flash loan protection)
 * - NFT veto council (top 20 NFT holders can veto)
 * - 3-day voting period
 * - 2-day timelock before execution
 * - 50% quorum required
 * - Simple majority (>50% of votes cast)
 *
 * Proposal Lifecycle:
 * 1. Top 3 burner creates proposal → snapshot taken
 * 2. 3-day voting period (MEGAGOONER holders vote)
 * 3. If passed + quorum met → 2-day timelock
 * 4. After timelock → execute (unless vetoed by NFT council)
 *
 * Emergency Circuit Breaker:
 * - If triggered, all governance paused
 * - Guardian council can unpause
 */
contract Jestermogger is
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    // ═══════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════

    IMEGAGOONERSnapshot public megagooner;
    INFTVetoCouncil public vetoCouncil;
    ICircuitBreaker public circuitBreaker;
    IFramemogger public framemogger;

    uint256 public constant VOTING_PERIOD = 3 days;
    uint256 public constant TIMELOCK_PERIOD = 2 days;
    uint256 public constant QUORUM_PERCENTAGE = 50; // 50% of circulating supply

    uint256 public proposalCount;

    enum ProposalState {
        Pending,
        Active,
        Defeated,
        Succeeded,
        Queued,
        Expired,
        Executed,
        Vetoed
    }

    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        address[] targets;
        uint256[] values;
        bytes[] calldatas;
        uint256 startTime;
        uint256 endTime;
        uint256 snapshotId;
        uint256 snapshotTotalSupply;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool executed;
        bool vetoed;
        uint256 eta; // Execution time (after timelock)
    }

    struct Receipt {
        bool hasVoted;
        uint8 support; // 0 = against, 1 = for, 2 = abstain
        uint256 votes;
    }

    // proposalId => Proposal
    mapping(uint256 => Proposal) public proposals;

    // proposalId => voter => Receipt
    mapping(uint256 => mapping(address => Receipt)) public receipts;

    // ═══════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address[] targets,
        uint256[] values,
        string description,
        uint256 startTime,
        uint256 endTime
    );

    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        uint8 support,
        uint256 votes
    );

    event ProposalQueued(uint256 indexed proposalId, uint256 eta);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalVetoed(uint256 indexed proposalId);

    // ═══════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════

    error InsufficientBalance();
    error InvalidProposal();
    error VotingPeriodNotEnded();
    error ProposalNotSucceeded();
    error TimelockNotMet();
    error ProposalAlreadyExecuted();
    error ProposalIsVetoed();
    error AlreadyVoted();
    error VotingPeriodEnded();
    error GovernancePaused();
    error ZeroAddress();
    error ArrayLengthMismatch();
    error NotAuthorizedProposer();
    error InvalidVoteType();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _megagooner,
        address _vetoCouncil,
        address _circuitBreaker,
        address _framemogger,
        address _admin
    ) external initializer {
        if (_megagooner == address(0) ||
            _vetoCouncil == address(0) ||
            _circuitBreaker == address(0) ||
            _framemogger == address(0) ||
            _admin == address(0)) revert ZeroAddress();

        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        megagooner = IMEGAGOONERSnapshot(_megagooner);
        vetoCouncil = INFTVetoCouncil(_vetoCouncil);
        circuitBreaker = ICircuitBreaker(_circuitBreaker);
        framemogger = IFramemogger(_framemogger);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
        _grantRole(GUARDIAN_ROLE, _admin);

        proposalCount = 0;
    }

    // ═══════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════

    modifier whenNotPaused() {
        if (circuitBreaker.isPaused()) revert GovernancePaused();
        _;
    }

    // ═══════════════════════════════════════════════════════════
    // PROPOSAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Create a new governance proposal (only top 3 MEGACHAD burners)
     * @param targets Contract addresses to call
     * @param values ETH values to send
     * @param calldatas Function call data
     * @param description Proposal description
     * @return Proposal ID
     */
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    )
        external
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
        // Check proposer is in top 3 burners (Framemogger authorization)
        if (!framemogger.canPropose(msg.sender)) revert NotAuthorizedProposer();

        // Take snapshot for voting
        uint256 snapshotId = megagooner.snapshot();

        // Validate arrays
        if (targets.length != values.length || targets.length != calldatas.length) {
            revert ArrayLengthMismatch();
        }
        if (targets.length == 0) revert InvalidProposal();

        uint256 proposalId = ++proposalCount;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + VOTING_PERIOD;
        uint256 snapshotTotalSupply = megagooner.totalSupplyAt(snapshotId);

        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.description = description;
        proposal.targets = targets;
        proposal.values = values;
        proposal.calldatas = calldatas;
        proposal.startTime = startTime;
        proposal.endTime = endTime;
        proposal.snapshotId = snapshotId;
        proposal.snapshotTotalSupply = snapshotTotalSupply;

        emit ProposalCreated(
            proposalId,
            msg.sender,
            targets,
            values,
            description,
            startTime,
            endTime
        );

        return proposalId;
    }

    /**
     * @notice Cast a vote on a proposal
     * @param proposalId Proposal to vote on
     * @param support 0 = against, 1 = for, 2 = abstain
     */
    function castVote(uint256 proposalId, uint8 support)
        external
        whenNotPaused
        nonReentrant
    {
        return _castVote(msg.sender, proposalId, support);
    }

    /**
     * @notice Internal vote casting logic
     */
    function _castVote(address voter, uint256 proposalId, uint8 support) internal {
        if (support > 2) revert InvalidVoteType();

        Proposal storage proposal = proposals[proposalId];

        if (block.timestamp > proposal.endTime) revert VotingPeriodEnded();
        if (block.timestamp < proposal.startTime) revert InvalidProposal();
        if (receipts[proposalId][voter].hasVoted) revert AlreadyVoted();

        uint256 votes = megagooner.balanceOfAt(voter, proposal.snapshotId);
        if (votes == 0) revert InsufficientBalance();

        receipts[proposalId][voter] = Receipt({
            hasVoted: true,
            support: support,
            votes: votes
        });

        if (support == 0) {
            proposal.againstVotes += votes;
        } else if (support == 1) {
            proposal.forVotes += votes;
        } else {
            proposal.abstainVotes += votes;
        }

        emit VoteCast(voter, proposalId, support, votes);
    }

    /**
     * @notice Queue a successful proposal for execution (starts timelock)
     * @param proposalId Proposal to queue
     */
    function queue(uint256 proposalId)
        external
        whenNotPaused
    {
        ProposalState proposalState = state(proposalId);
        if (proposalState != ProposalState.Succeeded) revert ProposalNotSucceeded();

        Proposal storage proposal = proposals[proposalId];
        uint256 eta = block.timestamp + TIMELOCK_PERIOD;
        proposal.eta = eta;

        emit ProposalQueued(proposalId, eta);
    }

    /**
     * @notice Execute a queued proposal (after timelock)
     * @param proposalId Proposal to execute
     */
    function execute(uint256 proposalId)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        ProposalState currentState = state(proposalId);
        if (currentState != ProposalState.Queued) revert ProposalNotSucceeded();

        Proposal storage proposal = proposals[proposalId];

        if (block.timestamp < proposal.eta) revert TimelockNotMet();
        if (proposal.executed) revert ProposalAlreadyExecuted();
        if (proposal.vetoed) revert ProposalIsVetoed();

        // Check for veto
        if (vetoCouncil.canVeto(proposalId)) {
            proposal.vetoed = true;
            emit ProposalVetoed(proposalId);
            revert ProposalIsVetoed();
        }

        proposal.executed = true;

        // Execute all calls
        for (uint256 i = 0; i < proposal.targets.length; i++) {
            (bool success, ) = proposal.targets[i].call{value: proposal.values[i]}(
                proposal.calldatas[i]
            );
            require(success, "Jestermogger: execution failed");
        }

        emit ProposalExecuted(proposalId);
    }

    /**
     * @notice Veto a proposal (only NFT veto council)
     * @param proposalId Proposal to veto
     */
    function veto(uint256 proposalId) external {
        if (proposals[proposalId].executed) revert ProposalAlreadyExecuted();
        if (proposals[proposalId].vetoed) revert ProposalIsVetoed();

        // Delegate to veto council for authorization
        vetoCouncil.executeVeto(proposalId);

        proposals[proposalId].vetoed = true;
        emit ProposalVetoed(proposalId);
    }

    // ═══════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Get proposal state
     */
    function state(uint256 proposalId) public view returns (ProposalState) {
        Proposal storage proposal = proposals[proposalId];

        if (proposal.vetoed) return ProposalState.Vetoed;
        if (proposal.executed) return ProposalState.Executed;

        // Voting period not ended
        if (block.timestamp <= proposal.endTime) {
            return ProposalState.Active;
        }

        // Calculate results
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        bool quorumMet = _checkQuorum(totalVotes, proposal.snapshotTotalSupply);
        bool majorityFor = proposal.forVotes > proposal.againstVotes;

        // Failed quorum or vote
        if (!quorumMet || !majorityFor) {
            return ProposalState.Defeated;
        }

        // Passed vote and quorum
        if (proposal.eta == 0) {
            return ProposalState.Succeeded; // Ready to queue
        }

        // Queued with timelock
        if (block.timestamp < proposal.eta) {
            return ProposalState.Queued;
        }

        // Timelock expired (7 days after eta)
        if (block.timestamp > proposal.eta + 7 days) {
            return ProposalState.Expired;
        }

        return ProposalState.Queued; // Ready to execute
    }

    /**
     * @notice Check if quorum is met (based on supply at snapshot time)
     */
    function _checkQuorum(uint256 totalVotes, uint256 snapshotTotalSupply) internal pure returns (bool) {
        uint256 quorumRequired = (snapshotTotalSupply * QUORUM_PERCENTAGE) / 100;
        return totalVotes >= quorumRequired;
    }

    /**
     * @notice Get proposal details
     */
    function getProposal(uint256 proposalId)
        external
        view
        returns (
            address proposer,
            string memory description,
            uint256 forVotes,
            uint256 againstVotes,
            uint256 abstainVotes,
            uint256 startTime,
            uint256 endTime,
            uint256 eta,
            bool executed,
            bool vetoed,
            ProposalState currentState
        )
    {
        Proposal storage proposal = proposals[proposalId];

        proposer = proposal.proposer;
        description = proposal.description;
        forVotes = proposal.forVotes;
        againstVotes = proposal.againstVotes;
        abstainVotes = proposal.abstainVotes;
        startTime = proposal.startTime;
        endTime = proposal.endTime;
        eta = proposal.eta;
        executed = proposal.executed;
        vetoed = proposal.vetoed;
        currentState = state(proposalId);
    }

    /**
     * @notice Get proposal actions
     */
    function getActions(uint256 proposalId)
        external
        view
        returns (
            address[] memory targets,
            uint256[] memory values,
            bytes[] memory calldatas
        )
    {
        Proposal storage proposal = proposals[proposalId];
        return (proposal.targets, proposal.values, proposal.calldatas);
    }

    /**
     * @notice Get voter receipt
     */
    function getReceipt(uint256 proposalId, address voter)
        external
        view
        returns (Receipt memory)
    {
        return receipts[proposalId][voter];
    }

    // ═══════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Update veto council address
     */
    function updateVetoCouncil(address _newCouncil)
        external
        onlyRole(ADMIN_ROLE)
    {
        if (_newCouncil == address(0)) revert ZeroAddress();
        vetoCouncil = INFTVetoCouncil(_newCouncil);
    }

    /**
     * @notice Update circuit breaker address
     */
    function updateCircuitBreaker(address _newBreaker)
        external
        onlyRole(ADMIN_ROLE)
    {
        if (_newBreaker == address(0)) revert ZeroAddress();
        circuitBreaker = ICircuitBreaker(_newBreaker);
    }

    /**
     * @notice Update framemogger address
     */
    function updateFramemogger(address _newFramemogger)
        external
        onlyRole(ADMIN_ROLE)
    {
        if (_newFramemogger == address(0)) revert ZeroAddress();
        framemogger = IFramemogger(_newFramemogger);
    }

    // ═══════════════════════════════════════════════════════════
    // UUPS UPGRADE
    // ═══════════════════════════════════════════════════════════

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}

    // Receive ETH for proposals
    receive() external payable {}
}
