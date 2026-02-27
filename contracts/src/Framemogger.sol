// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IMEGACHADNFTChecker {
    function balanceOf(address owner) external view returns (uint256);
}

interface IMEGAGOONERBurner {
    function burn(address from, uint256 amount) external;
}

/**
 * @title Framemogger
 * @notice Burn-to-Govern: Top 3 weekly MEGACHAD burners earn proposal rights
 *
 * Governance Model:
 * - Burn MEGACHAD → treasury (economic commitment)
 * - Burn MEGAGOONER → deflation (0.1 MEGAGOONER per 1 MEGACHAD)
 * - Top 3 burners each week earn governance proposal creation rights
 * - MEGAGOONER holders vote on proposals (standard token-weighted voting)
 *
 * Weekly Periods:
 * - 7-day cycles
 * - Top 3 burners tracked and updated automatically
 * - Proposal rights granted to current week's top 3
 *
 * Features:
 * - Requires 1+ NFT to burn
 * - Real-time leaderboard updates
 * - Historical tracking of past weeks
 */
contract Framemogger is
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ═══════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════

    IERC20 public megachad;
    IMEGAGOONERBurner public megagooner;
    IMEGACHADNFTChecker public nftContract;
    address public treasury;

    // Burn ratio: 1 MEGACHAD = 0.1 MEGAGOONER burned (basis points)
    uint256 public constant BURN_RATIO = 1000; // 10% = 1000 basis points

    // Week tracking
    uint256 public currentWeek;
    uint256 public genesisTimestamp;
    uint256 public constant WEEK_DURATION = 7 days;

    struct BurnEntry {
        address burner;
        uint256 amount;
    }

    struct WeekData {
        uint256 totalBurned;
        uint256 uniqueBurners;
        address[3] topBurners; // Top 3 get proposal rights
        uint256[3] topAmounts;
    }

    // week => user => amount burned
    mapping(uint256 => mapping(address => uint256)) public weeklyBurns;

    // week => WeekData
    mapping(uint256 => WeekData) public weekData;

    // ═══════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════

    event MEGACHADBurned(address indexed burner, uint256 amount, uint256 week);
    event MEGAGOONERDeflated(uint256 amount);
    event TopBurnersUpdated(uint256 indexed week, address[3] topBurners, uint256[3] amounts);
    event NewWeekStarted(uint256 indexed week, uint256 startTime);

    // ═══════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════

    error ZeroAmount();
    error NoNFT();
    error ZeroAddress();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _megachad,
        address _megagooner,
        address _nftContract,
        address _treasury,
        address _admin
    ) external initializer {
        if (_megachad == address(0) ||
            _megagooner == address(0) ||
            _nftContract == address(0) ||
            _treasury == address(0) ||
            _admin == address(0)) revert ZeroAddress();

        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        megachad = IERC20(_megachad);
        megagooner = IMEGAGOONERBurner(_megagooner);
        nftContract = IMEGACHADNFTChecker(_nftContract);
        treasury = _treasury;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);

        // Start first week
        currentWeek = 0;
        genesisTimestamp = block.timestamp;

        emit NewWeekStarted(0, block.timestamp);
    }

    // ═══════════════════════════════════════════════════════════
    // WEEK TRACKING
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Get current week number based on genesis timestamp
     */
    function getCurrentWeek() public view returns (uint256) {
        return (block.timestamp - genesisTimestamp) / WEEK_DURATION;
    }

    // ═══════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════

    modifier requireNFT() {
        if (nftContract.balanceOf(msg.sender) == 0) revert NoNFT();
        _;
    }

    modifier updateWeek() {
        uint256 week = getCurrentWeek();
        if (week > currentWeek) {
            currentWeek = week;
            emit NewWeekStarted(currentWeek, block.timestamp);
        }
        _;
    }

    // ═══════════════════════════════════════════════════════════
    // BURN FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Burn MEGACHAD → treasury, burn MEGAGOONER for deflation
     * @param amount Amount of MEGACHAD to burn
     * @dev Requires 1+ NFT, burns 0.1 MEGAGOONER per 1 MEGACHAD, updates leaderboard
     */
    function burnMEGACHAD(uint256 amount)
        external
        nonReentrant
        requireNFT
        updateWeek
    {
        if (amount == 0) revert ZeroAmount();

        // Transfer MEGACHAD to treasury
        megachad.safeTransferFrom(msg.sender, treasury, amount);

        // Burn MEGAGOONER (deflation): 1 MEGACHAD = 0.1 MEGAGOONER
        uint256 goonerBurnAmount = (amount * BURN_RATIO) / 10000;
        if (goonerBurnAmount > 0) {
            megagooner.burn(msg.sender, goonerBurnAmount);
            emit MEGAGOONERDeflated(goonerBurnAmount);
        }

        // Track burn and update leaderboard
        _recordBurn(msg.sender, amount);

        emit MEGACHADBurned(msg.sender, amount, currentWeek);
    }

    /**
     * @notice Record burn and update top 3 leaderboard
     */
    function _recordBurn(address burner, uint256 amount) internal {
        uint256 week = currentWeek;

        // First burn this week for this user
        if (weeklyBurns[week][burner] == 0) {
            weekData[week].uniqueBurners++;
        }

        weeklyBurns[week][burner] += amount;
        weekData[week].totalBurned += amount;

        // Update top 3 leaderboard
        _updateTop3(week, burner, weeklyBurns[week][burner]);
    }

    /**
     * @notice Update top 3 burners for current week
     */
    function _updateTop3(uint256 week, address burner, uint256 totalBurned) internal {
        address[3] storage topBurners = weekData[week].topBurners;
        uint256[3] storage topAmounts = weekData[week].topAmounts;

        // Check if burner is already in top 3
        int256 existingIndex = -1;
        for (uint256 i = 0; i < 3; i++) {
            if (topBurners[i] == burner) {
                existingIndex = int256(i);
                break;
            }
        }

        // Update existing entry
        if (existingIndex >= 0) {
            topAmounts[uint256(existingIndex)] = totalBurned;
        } else {
            // Try to add new entry if amount qualifies
            if (topAmounts[2] < totalBurned || topBurners[2] == address(0)) {
                topBurners[2] = burner;
                topAmounts[2] = totalBurned;
            }
        }

        // Sort top 3 (bubble sort - only 3 elements)
        for (uint256 i = 0; i < 3; i++) {
            for (uint256 j = i + 1; j < 3; j++) {
                if (topAmounts[j] > topAmounts[i]) {
                    // Swap
                    (topBurners[i], topBurners[j]) = (topBurners[j], topBurners[i]);
                    (topAmounts[i], topAmounts[j]) = (topAmounts[j], topAmounts[i]);
                }
            }
        }

        emit TopBurnersUpdated(week, topBurners, topAmounts);
    }

    // ═══════════════════════════════════════════════════════════
    // GOVERNANCE AUTHORIZATION
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Check if address can create governance proposals (top 3 burner)
     * @param account Address to check
     * @return bool True if in top 3 burners for current week
     */
    function canPropose(address account) external view returns (bool) {
        address[3] memory topBurners = weekData[getCurrentWeek()].topBurners;

        for (uint256 i = 0; i < 3; i++) {
            if (topBurners[i] == account) {
                return true;
            }
        }

        return false;
    }

    /**
     * @notice Get current week's top 3 burners
     * @return burners Top 3 addresses
     * @return amounts Corresponding burn amounts
     */
    function getCurrentTop3()
        external
        view
        returns (address[3] memory burners, uint256[3] memory amounts)
    {
        uint256 week = getCurrentWeek();
        burners = weekData[week].topBurners;
        amounts = weekData[week].topAmounts;
    }

    /**
     * @notice Get specific week's top 3 burners
     */
    function getWeekTop3(uint256 week)
        external
        view
        returns (address[3] memory burners, uint256[3] memory amounts)
    {
        burners = weekData[week].topBurners;
        amounts = weekData[week].topAmounts;
    }

    /**
     * @notice Get user's burns for specific week
     */
    function getUserWeeklyBurns(uint256 week, address user)
        external
        view
        returns (uint256)
    {
        return weeklyBurns[week][user];
    }

    /**
     * @notice Get week statistics
     */
    function getWeekStats(uint256 week)
        external
        view
        returns (
            uint256 totalBurned,
            uint256 uniqueBurners,
            uint256 timeUntilEnd
        )
    {
        totalBurned = weekData[week].totalBurned;
        uniqueBurners = weekData[week].uniqueBurners;

        if (week == getCurrentWeek()) {
            uint256 weekEnd = genesisTimestamp + (week + 1) * WEEK_DURATION;
            timeUntilEnd = weekEnd > block.timestamp ? weekEnd - block.timestamp : 0;
        } else {
            timeUntilEnd = 0;
        }
    }

    /**
     * @notice Get current week info
     */
    function getCurrentWeekInfo()
        external
        view
        returns (
            uint256 week,
            uint256 startTime,
            uint256 endTime,
            uint256 totalBurned,
            uint256 uniqueBurners,
            address[3] memory topBurners,
            uint256[3] memory topAmounts
        )
    {
        week = getCurrentWeek();
        startTime = genesisTimestamp + week * WEEK_DURATION;
        endTime = genesisTimestamp + (week + 1) * WEEK_DURATION;
        totalBurned = weekData[week].totalBurned;
        uniqueBurners = weekData[week].uniqueBurners;
        topBurners = weekData[week].topBurners;
        topAmounts = weekData[week].topAmounts;
    }

    // ═══════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Update treasury address
     */
    function updateTreasury(address _newTreasury)
        external
        onlyRole(ADMIN_ROLE)
    {
        if (_newTreasury == address(0)) revert ZeroAddress();
        treasury = _newTreasury;
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
