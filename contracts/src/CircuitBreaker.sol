// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

/**
 * @title CircuitBreaker
 * @notice Emergency pause mechanism for MEGA Protocol
 *
 * Features:
 * - Emergency pause controlled by guardian council
 * - Requires 3/5 guardians to trigger pause
 * - Automatic unpause after 7 days (safety mechanism)
 * - Manual unpause requires 4/5 guardians
 * - Pauses all protocol contracts: governance, staking, emissions, burns
 *
 * Guardian Council:
 * - 5 trusted addresses (multisig, core team, etc.)
 * - Can be updated by governance
 * - Designed for critical exploits/attacks only
 *
 * Pause Scope:
 * - Jestermogger: All governance operations
 * - MoggerStaking: New stakes/unstakes
 * - JESTERGOONER: New stakes/unstakes
 * - Framemogger: Burns
 * - EmissionController: Distributions
 *
 * Note: Does NOT pause emergency withdrawals or critical user protections
 */
contract CircuitBreaker is
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ═══════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════

    bool public isPaused;
    uint256 public pauseTimestamp;
    uint256 public constant AUTO_UNPAUSE_DURATION = 7 days;

    uint256 public constant GUARDIAN_COUNT = 5;
    uint256 public constant PAUSE_THRESHOLD = 3; // 3/5 to pause
    uint256 public constant UNPAUSE_THRESHOLD = 4; // 4/5 to unpause

    address[5] public guardians;
    mapping(address => bool) public isGuardian;

    // Pause voting state
    struct PauseVote {
        uint256 yesVotes;
        uint256 noVotes;
        mapping(address => bool) hasVoted;
        bool executed;
    }

    PauseVote public pauseVote;

    // Unpause voting state
    struct UnpauseVote {
        uint256 yesVotes;
        uint256 noVotes;
        mapping(address => bool) hasVoted;
        bool executed;
    }

    UnpauseVote public unpauseVote;

    // ═══════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════

    event ProtocolPaused(address indexed guardian, uint256 timestamp);
    event ProtocolUnpaused(address indexed guardian, uint256 timestamp);
    event PauseVoteCast(address indexed guardian, bool support);
    event UnpauseVoteCast(address indexed guardian, bool support);
    event GuardiansUpdated(address[5] newGuardians);
    event AutoUnpauseExecuted(uint256 timestamp);

    // ═══════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════

    error NotGuardian();
    error AlreadyPaused();
    error NotPaused();
    error AlreadyVoted();
    error ThresholdNotMet();
    error ZeroAddress();
    error DuplicateGuardian();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address[5] memory _guardians,
        address _admin
    ) external initializer {
        if (_admin == address(0)) revert ZeroAddress();

        // Validate no zero addresses and no duplicates
        for (uint256 i = 0; i < 5; i++) {
            if (_guardians[i] == address(0)) revert ZeroAddress();
            for (uint256 j = 0; j < i; j++) {
                if (_guardians[i] == _guardians[j]) revert DuplicateGuardian();
            }
        }

        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);

        // Set guardians
        for (uint256 i = 0; i < GUARDIAN_COUNT; i++) {
            guardians[i] = _guardians[i];
            isGuardian[_guardians[i]] = true;
            _grantRole(GUARDIAN_ROLE, _guardians[i]);
        }

        isPaused = false;
    }

    // ═══════════════════════════════════════════════════════════
    // PAUSE FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Vote to pause the protocol (3/5 guardians required)
     * @param support true = vote to pause, false = vote against
     */
    function votePause(bool support) external nonReentrant {
        if (!isGuardian[msg.sender]) revert NotGuardian();
        if (isPaused) revert AlreadyPaused();
        if (pauseVote.hasVoted[msg.sender]) revert AlreadyVoted();

        pauseVote.hasVoted[msg.sender] = true;

        if (support) {
            pauseVote.yesVotes++;
        } else {
            pauseVote.noVotes++;
        }

        emit PauseVoteCast(msg.sender, support);

        // Check if threshold met
        if (pauseVote.yesVotes >= PAUSE_THRESHOLD) {
            _executePause();
        }
    }

    /**
     * @notice Internal pause execution
     */
    function _executePause() internal {
        if (pauseVote.executed) return;

        pauseVote.executed = true;
        isPaused = true;
        pauseTimestamp = block.timestamp;

        emit ProtocolPaused(msg.sender, block.timestamp);
    }

    /**
     * @notice Vote to unpause the protocol (4/5 guardians required)
     * @param support true = vote to unpause, false = vote against
     */
    function voteUnpause(bool support) external nonReentrant {
        if (!isGuardian[msg.sender]) revert NotGuardian();
        if (!isPaused) revert NotPaused();
        if (unpauseVote.hasVoted[msg.sender]) revert AlreadyVoted();

        unpauseVote.hasVoted[msg.sender] = true;

        if (support) {
            unpauseVote.yesVotes++;
        } else {
            unpauseVote.noVotes++;
        }

        emit UnpauseVoteCast(msg.sender, support);

        // Check if threshold met
        if (unpauseVote.yesVotes >= UNPAUSE_THRESHOLD) {
            _executeUnpause();
        }
    }

    /**
     * @notice Internal unpause execution
     */
    function _executeUnpause() internal {
        if (unpauseVote.executed) return;

        unpauseVote.executed = true;
        _resetState();

        emit ProtocolUnpaused(msg.sender, block.timestamp);
    }

    /**
     * @notice Automatic unpause after 7 days (safety mechanism)
     * @dev Callable by anyone after 7 days of pause
     */
    function autoUnpause() external nonReentrant {
        if (!isPaused) revert NotPaused();
        if (block.timestamp < pauseTimestamp + AUTO_UNPAUSE_DURATION) {
            revert ThresholdNotMet();
        }

        _resetState();

        emit AutoUnpauseExecuted(block.timestamp);
        emit ProtocolUnpaused(msg.sender, block.timestamp);
    }

    /**
     * @notice Reset pause state
     */
    function _resetState() internal {
        isPaused = false;
        pauseTimestamp = 0;

        // Reset pause vote
        pauseVote.yesVotes = 0;
        pauseVote.noVotes = 0;
        pauseVote.executed = false;
        for (uint256 i = 0; i < GUARDIAN_COUNT; i++) {
            pauseVote.hasVoted[guardians[i]] = false;
        }

        // Reset unpause vote
        unpauseVote.yesVotes = 0;
        unpauseVote.noVotes = 0;
        unpauseVote.executed = false;
        for (uint256 i = 0; i < GUARDIAN_COUNT; i++) {
            unpauseVote.hasVoted[guardians[i]] = false;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Get pause status
     */
    function getPauseStatus()
        external
        view
        returns (
            bool paused,
            uint256 pausedAt,
            uint256 autoUnpauseTime,
            uint256 pauseYesVotes,
            uint256 pauseNoVotes,
            uint256 unpauseYesVotes,
            uint256 unpauseNoVotes
        )
    {
        paused = isPaused;
        pausedAt = pauseTimestamp;
        autoUnpauseTime = isPaused ? pauseTimestamp + AUTO_UNPAUSE_DURATION : 0;
        pauseYesVotes = pauseVote.yesVotes;
        pauseNoVotes = pauseVote.noVotes;
        unpauseYesVotes = unpauseVote.yesVotes;
        unpauseNoVotes = unpauseVote.noVotes;
    }

    /**
     * @notice Get all guardians
     */
    function getGuardians() external view returns (address[5] memory) {
        return guardians;
    }

    /**
     * @notice Check if address is guardian
     */
    function checkGuardianStatus(address account) external view returns (bool) {
        return isGuardian[account];
    }

    /**
     * @notice Check if guardian has voted on pause
     */
    function hasVotedPause(address guardian) external view returns (bool) {
        return pauseVote.hasVoted[guardian];
    }

    /**
     * @notice Check if guardian has voted on unpause
     */
    function hasVotedUnpause(address guardian) external view returns (bool) {
        return unpauseVote.hasVoted[guardian];
    }

    /**
     * @notice Get time remaining until auto-unpause
     */
    function timeUntilAutoUnpause() external view returns (uint256) {
        if (!isPaused) return 0;

        uint256 unpauseTime = pauseTimestamp + AUTO_UNPAUSE_DURATION;
        if (block.timestamp >= unpauseTime) return 0;

        return unpauseTime - block.timestamp;
    }

    // ═══════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Update guardian list (only admin/governance)
     * @param _newGuardians Array of 5 guardian addresses
     */
    function updateGuardians(address[5] memory _newGuardians)
        external
        onlyRole(ADMIN_ROLE)
        nonReentrant
    {
        // Validate no zero addresses and no duplicates
        for (uint256 i = 0; i < GUARDIAN_COUNT; i++) {
            if (_newGuardians[i] == address(0)) revert ZeroAddress();
            for (uint256 j = 0; j < i; j++) {
                if (_newGuardians[i] == _newGuardians[j]) revert DuplicateGuardian();
            }
        }

        // Remove old guardians
        for (uint256 i = 0; i < GUARDIAN_COUNT; i++) {
            if (guardians[i] != address(0)) {
                isGuardian[guardians[i]] = false;
                _revokeRole(GUARDIAN_ROLE, guardians[i]);
            }
        }

        // Set new guardians
        for (uint256 i = 0; i < GUARDIAN_COUNT; i++) {
            guardians[i] = _newGuardians[i];
            isGuardian[_newGuardians[i]] = true;
            _grantRole(GUARDIAN_ROLE, _newGuardians[i]);
        }

        emit GuardiansUpdated(_newGuardians);
    }

    /**
     * @notice Emergency unpause by admin (for critical recovery)
     * @dev Should only be used in extreme circumstances
     */
    function emergencyUnpause() external onlyRole(ADMIN_ROLE) {
        if (!isPaused) revert NotPaused();
        _resetState();
        emit AutoUnpauseExecuted(block.timestamp);
        emit ProtocolUnpaused(msg.sender, block.timestamp);
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
