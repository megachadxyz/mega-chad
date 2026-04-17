// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IMEGACHADNFTChecker {
    function balanceOf(address owner) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface IJestermogger {
    function state(uint256 proposalId) external view returns (uint8);
}

/// @title NFTVetoCouncil — Top 20 MEGACHAD NFT holders can veto governance proposals
/// @notice 11/20 threshold, 2-day veto window after proposal queued
contract NFTVetoCouncil is Ownable {
    IMEGACHADNFTChecker public nftContract;
    IJestermogger public governance;

    uint256 public constant COUNCIL_SIZE = 20;
    uint256 public constant VETO_THRESHOLD = 11;
    uint256 public constant VETO_VOTING_PERIOD = 2 days;
    uint256 public constant MAX_SCAN_LIMIT = 5000;

    address[20] public councilMembers;
    mapping(address => bool) public isCouncilMember;

    struct VetoVote {
        uint256 proposalId;
        uint256 startTime;
        uint256 yesVotes;
        uint256 noVotes;
        bool executed;
        bool expired;
    }

    mapping(uint256 => VetoVote) public vetoVotes;
    mapping(uint256 => mapping(address => bool)) public hasVotedOnVeto;
    mapping(uint256 => mapping(address => bool)) public vetoVoteChoice;

    event CouncilUpdated(address[20] newMembers);
    event VetoVoteStarted(uint256 indexed proposalId, uint256 startTime);
    event VetoCast(uint256 indexed proposalId, address indexed voter, bool support);
    event VetoExecuted(uint256 indexed proposalId, uint256 yesVotes, uint256 noVotes);
    event VetoFailed(uint256 indexed proposalId, uint256 yesVotes, uint256 noVotes);

    constructor(address _nftContract, address _governance) {
        nftContract = IMEGACHADNFTChecker(_nftContract);
        governance = IJestermogger(_governance);
    }

    /// @notice Update council to current top 20 NFT holders (callable by anyone)
    function updateCouncil(uint256 maxTokenId) external {
        require(maxTokenId < MAX_SCAN_LIMIT, "scan limit exceeded");
        uint256 scanCount = maxTokenId + 1;

        address[] memory holders = new address[](scanCount);
        uint256[] memory balances = new uint256[](scanCount);
        uint256 uniqueHolders = 0;

        for (uint256 tokenId = 0; tokenId < scanCount; tokenId++) {
            try nftContract.ownerOf(tokenId) returns (address owner) {
                if (owner == address(0)) continue;
                bool found = false;
                for (uint256 i = 0; i < uniqueHolders; i++) {
                    if (holders[i] == owner) { found = true; break; }
                }
                if (!found) {
                    holders[uniqueHolders] = owner;
                    balances[uniqueHolders] = nftContract.balanceOf(owner);
                    uniqueHolders++;
                }
            } catch { continue; }
        }

        uint256 sortLimit = uniqueHolders < COUNCIL_SIZE ? uniqueHolders : COUNCIL_SIZE;
        for (uint256 i = 0; i < sortLimit; i++) {
            uint256 maxIdx = i;
            for (uint256 j = i + 1; j < uniqueHolders; j++) {
                if (balances[j] > balances[maxIdx]) maxIdx = j;
            }
            if (maxIdx != i) {
                (holders[i], holders[maxIdx]) = (holders[maxIdx], holders[i]);
                (balances[i], balances[maxIdx]) = (balances[maxIdx], balances[i]);
            }
        }

        for (uint256 i = 0; i < COUNCIL_SIZE; i++) {
            if (councilMembers[i] != address(0)) {
                isCouncilMember[councilMembers[i]] = false;
                councilMembers[i] = address(0);
            }
        }
        for (uint256 i = 0; i < sortLimit; i++) {
            councilMembers[i] = holders[i];
            isCouncilMember[holders[i]] = true;
        }

        emit CouncilUpdated(councilMembers);
    }

    /// @notice Start veto vote for a queued proposal (council member only)
    function startVetoVote(uint256 proposalId) external {
        require(isCouncilMember[msg.sender], "not council member");
        require(vetoVotes[proposalId].startTime == 0, "veto already started");
        require(governance.state(proposalId) == 4, "proposal not queued");

        vetoVotes[proposalId].proposalId = proposalId;
        vetoVotes[proposalId].startTime = block.timestamp;

        emit VetoVoteStarted(proposalId, block.timestamp);
    }

    /// @notice Auto-start veto window (called by governance on queue)
    function initializeVetoWindow(uint256 proposalId) external {
        require(msg.sender == address(governance), "unauthorized");
        require(vetoVotes[proposalId].startTime == 0, "veto already started");

        vetoVotes[proposalId].proposalId = proposalId;
        vetoVotes[proposalId].startTime = block.timestamp;

        emit VetoVoteStarted(proposalId, block.timestamp);
    }

    /// @notice Cast veto vote (council members with NFT balance only)
    function castVetoVote(uint256 proposalId, bool support) external {
        require(isCouncilMember[msg.sender], "not council member");
        require(nftContract.balanceOf(msg.sender) > 0, "no NFT balance");

        VetoVote storage v = vetoVotes[proposalId];
        require(v.startTime > 0, "veto not active");
        require(block.timestamp <= v.startTime + VETO_VOTING_PERIOD, "veto window expired");
        require(!hasVotedOnVeto[proposalId][msg.sender], "already voted");

        hasVotedOnVeto[proposalId][msg.sender] = true;
        vetoVoteChoice[proposalId][msg.sender] = support;

        if (support) {
            v.yesVotes++;
        } else {
            v.noVotes++;
        }

        emit VetoCast(proposalId, msg.sender, support);

        if (v.yesVotes >= VETO_THRESHOLD) {
            v.executed = true;
            emit VetoExecuted(proposalId, v.yesVotes, v.noVotes);
        }
    }

    function canVeto(uint256 proposalId) external view returns (bool) {
        VetoVote storage v = vetoVotes[proposalId];
        if (v.startTime == 0) return false;
        if (block.timestamp > v.startTime + VETO_VOTING_PERIOD) return false;
        return v.yesVotes >= VETO_THRESHOLD;
    }

    function isVetoed(uint256 proposalId) external view returns (bool) {
        return vetoVotes[proposalId].yesVotes >= VETO_THRESHOLD;
    }

    function vetoWindowElapsed(uint256 proposalId) external view returns (bool) {
        VetoVote storage v = vetoVotes[proposalId];
        if (v.startTime == 0) return false;
        return block.timestamp > v.startTime + VETO_VOTING_PERIOD;
    }

    function executeVeto(uint256 proposalId) external {
        require(msg.sender == address(governance), "unauthorized");
        VetoVote storage v = vetoVotes[proposalId];
        require(v.yesVotes >= VETO_THRESHOLD, "threshold not met");
        require(!v.executed, "already executed");
        v.executed = true;
        emit VetoExecuted(proposalId, v.yesVotes, v.noVotes);
    }

    function getCouncil() external view returns (address[20] memory) {
        return councilMembers;
    }

    function getCouncilMember(uint256 index) external view returns (address) {
        require(index < COUNCIL_SIZE, "invalid index");
        return councilMembers[index];
    }

    function checkCouncilMembership(address account) external view returns (bool) {
        return isCouncilMember[account];
    }

    function getVetoVote(uint256 proposalId) external view returns (
        uint256 startTime,
        uint256 endTime,
        uint256 yesVotes,
        uint256 noVotes,
        bool executed,
        bool expired,
        bool canExecute
    ) {
        VetoVote storage v = vetoVotes[proposalId];
        startTime = v.startTime;
        endTime = v.startTime + VETO_VOTING_PERIOD;
        yesVotes = v.yesVotes;
        noVotes = v.noVotes;
        executed = v.executed;
        expired = v.expired || (v.startTime > 0 && block.timestamp > v.startTime + VETO_VOTING_PERIOD);
        canExecute = yesVotes >= VETO_THRESHOLD && !executed && !expired;
    }

    function getVetoVoteFromAddress(uint256 proposalId, address voter) external view returns (bool) {
        return vetoVoteChoice[proposalId][voter];
    }

    function updateGovernance(address _newGovernance) external onlyOwner {
        require(_newGovernance != address(0), "zero address");
        governance = IJestermogger(_newGovernance);
    }
}
