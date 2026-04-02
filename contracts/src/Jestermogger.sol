// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Jestermogger — Governance DAO for MEGA Protocol
/// @notice Top 3 Framemogger participants propose. MEGAGOONER holders vote.
///         Proposal lifecycle: Pending → Active → Succeeded/Defeated → Queued → Executed
interface IFramemogger {
    function canPropose(address account) external view returns (bool);
}

contract Jestermogger is Ownable {
    IERC20 public immutable megagooner;
    IFramemogger public immutable framemogger;

    uint256 public votingDelay = 1 days;
    uint256 public votingPeriod = 3 days;
    uint256 public timelockDelay = 1 days;
    uint256 public gracePeriod = 3 days;
    uint256 public quorumPercentage = 4; // 4% of total supply

    uint256 public proposalCount;

    enum ProposalState { Pending, Active, Defeated, Succeeded, Queued, Executed, Expired, Vetoed }

    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        address[] targets;
        uint256[] values;
        bytes[] calldatas;
        uint256 startTime;
        uint256 endTime;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        uint256 eta; // execution time after queue
        bool executed;
        bool vetoed;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => uint8)) public voteChoice; // 0=against, 1=for, 2=abstain

    event ProposalCreated(uint256 indexed id, address indexed proposer, string description);
    event VoteCast(uint256 indexed proposalId, address indexed voter, uint8 support, uint256 weight);
    event ProposalQueued(uint256 indexed id, uint256 eta);
    event ProposalExecuted(uint256 indexed id);
    event ProposalVetoed(uint256 indexed id);

    constructor(address _megagooner, address _framemogger) {
        megagooner = IERC20(_megagooner);
        framemogger = IFramemogger(_framemogger);
    }

    /// @notice Create a proposal (must be top 3 Framemogger participant)
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) external returns (uint256) {
        require(framemogger.canPropose(msg.sender), "not in top 3 burners");
        require(targets.length == values.length && values.length == calldatas.length, "length mismatch");
        require(targets.length > 0, "empty proposal");
        require(bytes(description).length > 0, "empty description");

        proposalCount++;
        uint256 id = proposalCount;

        Proposal storage p = proposals[id];
        p.id = id;
        p.proposer = msg.sender;
        p.description = description;
        p.targets = targets;
        p.values = values;
        p.calldatas = calldatas;
        p.startTime = block.timestamp + votingDelay;
        p.endTime = block.timestamp + votingDelay + votingPeriod;

        emit ProposalCreated(id, msg.sender, description);
        return id;
    }

    /// @notice Cast a vote (0=against, 1=for, 2=abstain)
    function castVote(uint256 proposalId, uint8 support) external {
        require(support <= 2, "invalid vote");
        require(!hasVoted[proposalId][msg.sender], "already voted");

        Proposal storage p = proposals[proposalId];
        require(p.id > 0, "proposal not found");
        require(block.timestamp >= p.startTime, "voting not started");
        require(block.timestamp <= p.endTime, "voting ended");
        require(!p.vetoed, "vetoed");

        uint256 weight = megagooner.balanceOf(msg.sender);
        require(weight > 0, "no voting power");

        hasVoted[proposalId][msg.sender] = true;
        voteChoice[proposalId][msg.sender] = support;

        if (support == 0) {
            p.againstVotes += weight;
        } else if (support == 1) {
            p.forVotes += weight;
        } else {
            p.abstainVotes += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    /// @notice Queue a succeeded proposal for execution
    function queue(uint256 proposalId) external {
        require(state(proposalId) == ProposalState.Succeeded, "not succeeded");
        Proposal storage p = proposals[proposalId];
        p.eta = block.timestamp + timelockDelay;
        emit ProposalQueued(proposalId, p.eta);
    }

    /// @notice Execute a queued proposal
    function execute(uint256 proposalId) external {
        require(state(proposalId) == ProposalState.Queued, "not queued");
        Proposal storage p = proposals[proposalId];
        require(block.timestamp >= p.eta, "timelock not expired");

        p.executed = true;

        for (uint256 i = 0; i < p.targets.length; i++) {
            (bool success, ) = p.targets[i].call{value: p.values[i]}(p.calldatas[i]);
            require(success, "execution failed");
        }

        emit ProposalExecuted(proposalId);
    }

    /// @notice Owner can veto a proposal
    function veto(uint256 proposalId) external onlyOwner {
        Proposal storage p = proposals[proposalId];
        require(p.id > 0, "proposal not found");
        require(!p.executed, "already executed");
        p.vetoed = true;
        emit ProposalVetoed(proposalId);
    }

    /// @notice Get current state of a proposal
    function state(uint256 proposalId) public view returns (ProposalState) {
        Proposal storage p = proposals[proposalId];
        require(p.id > 0, "proposal not found");

        if (p.vetoed) return ProposalState.Vetoed;
        if (p.executed) return ProposalState.Executed;

        if (block.timestamp < p.startTime) return ProposalState.Pending;
        if (block.timestamp <= p.endTime) return ProposalState.Active;

        // Voting ended — check result
        uint256 quorum = (megagooner.totalSupply() * quorumPercentage) / 100;
        bool quorumReached = (p.forVotes + p.againstVotes + p.abstainVotes) >= quorum;
        bool passed = p.forVotes > p.againstVotes && quorumReached;

        if (!passed) return ProposalState.Defeated;

        // Passed — check queue/execution
        if (p.eta == 0) return ProposalState.Succeeded;

        if (block.timestamp > p.eta + gracePeriod) return ProposalState.Expired;

        return ProposalState.Queued;
    }

    /// @notice Get proposal votes and state
    function getProposalVotes(uint256 proposalId) external view returns (
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes,
        ProposalState currentState
    ) {
        Proposal storage p = proposals[proposalId];
        return (p.forVotes, p.againstVotes, p.abstainVotes, state(proposalId));
    }

    /// @notice Get proposal metadata
    function getProposalMeta(uint256 proposalId) external view returns (
        address proposer,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        uint256 eta
    ) {
        Proposal storage p = proposals[proposalId];
        return (p.proposer, p.description, p.startTime, p.endTime, p.eta);
    }

    /// @notice Get voter receipt
    function getReceipt(uint256 proposalId, address voter) external view returns (
        bool voted,
        uint8 support,
        uint256 weight
    ) {
        voted = hasVoted[proposalId][voter];
        support = voteChoice[proposalId][voter];
        weight = megagooner.balanceOf(voter);
    }

    /// @notice Owner can adjust governance parameters
    function setVotingDelay(uint256 _delay) external onlyOwner { votingDelay = _delay; }
    function setVotingPeriod(uint256 _period) external onlyOwner { votingPeriod = _period; }
    function setTimelockDelay(uint256 _delay) external onlyOwner { timelockDelay = _delay; }
    function setQuorum(uint256 _pct) external onlyOwner { quorumPercentage = _pct; }
}
