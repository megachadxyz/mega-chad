// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

interface IMEGAGOONER {
    function mint(address to, uint256 amount) external;
}

interface IRewardNotifiable {
    function notifyRewardAmount(uint256 reward) external;
}

/**
 * @title EmissionController
 * @notice Manages MEGAGOONER token emissions over 225 weeks with quadratic decay
 *
 * Emission Schedule:
 * - Total duration: 225 weeks (~4.33 years)
 * - BASE_WEEKLY_EMISSION: 662,245 MEGAGOONER
 * - Total cap: 50,000,000 MEGAGOONER
 *
 * Formula: Weekly_Emission = 662,245 × (1 - week/225)²
 *
 * Distribution Split (governance-adjustable within bounds):
 * - 45% → MoggerStaking (stakers)
 * - 40% → JestergonerRewards (LP providers)
 * - 15% → Treasury (Tren Fund)
 */
contract EmissionController is
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ═══════════════════════════════════════════════════════════
    // EMISSION CONSTANTS (225-WEEK SCHEDULE)
    // ═══════════════════════════════════════════════════════════

    uint256 public constant TOTAL_WEEKS = 225; // ~4.33 years
    uint256 public constant BASE_WEEKLY_EMISSION = 662_245 ether; // 662,245 MEGAGOONER
    uint256 public constant MAX_SUPPLY = 50_000_000 ether;

    // ═══════════════════════════════════════════════════════════
    // EMISSION SPLIT (Adjustable within bounds)
    // ═══════════════════════════════════════════════════════════

    uint256 public treasuryBps; // 1500 = 15%
    uint256 public stakingBps;  // 4500 = 45%
    uint256 public lpBps;       // 4000 = 40%

    // Bounds: Each split can be adjusted ±5% (500 bps) from initial
    uint256 public constant TREASURY_MIN_BPS = 1000; // 10%
    uint256 public constant TREASURY_MAX_BPS = 2000; // 20%
    uint256 public constant STAKING_MIN_BPS = 4000;  // 40%
    uint256 public constant STAKING_MAX_BPS = 5000;  // 50%
    uint256 public constant LP_MIN_BPS = 3500;       // 35%
    uint256 public constant LP_MAX_BPS = 4500;       // 45%

    uint256 public constant ADJUSTMENT_COOLDOWN = 90 days;
    uint256 public lastAdjustment;

    // ═══════════════════════════════════════════════════════════
    // EMISSION TRACKING
    // ═══════════════════════════════════════════════════════════

    uint256 public genesisTimestamp;
    uint256 public totalEmitted;
    mapping(uint256 => bool) public weekClaimed; // Prevent double-claiming
    mapping(address => bool) public distributors; // MoggerStaking, JestergonerRewards

    address public megagooner;
    address public moggerStaking;
    address public jestergonerRewards;
    address public treasury;

    // ═══════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════

    event EmissionDistributed(
        uint256 indexed week,
        uint256 totalEmission,
        uint256 toStaking,
        uint256 toLp,
        uint256 toTreasury
    );
    event EmissionSplitAdjusted(
        uint256 newTreasuryBps,
        uint256 newStakingBps,
        uint256 newLpBps
    );
    event DistributorSet(address indexed distributor, bool enabled);

    // ═══════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════

    error EmissionsEnded();
    error ExceedsMaxSupply();
    error InvalidSplit();
    error OnCooldown();
    error OutOfBounds();
    error Unauthorized();
    error ZeroAddress();
    error WeekAlreadyClaimed();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _megagooner,
        address _moggerStaking,
        address _jestergonerRewards,
        address _treasury,
        address _governance,
        address _upgrader
    ) external initializer {
        if (_megagooner == address(0) ||
            _moggerStaking == address(0) ||
            _jestergonerRewards == address(0) ||
            _treasury == address(0) ||
            _governance == address(0) ||
            _upgrader == address(0)) revert ZeroAddress();

        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNANCE_ROLE, _governance);
        _grantRole(UPGRADER_ROLE, _upgrader);

        megagooner = _megagooner;
        moggerStaking = _moggerStaking;
        jestergonerRewards = _jestergonerRewards;
        treasury = _treasury;

        // Initialize split: 15% treasury, 45% staking, 40% LP
        treasuryBps = 1500;
        stakingBps = 4500;
        lpBps = 4000;

        genesisTimestamp = block.timestamp;
        lastAdjustment = block.timestamp;

        distributors[_moggerStaking] = true;
        distributors[_jestergonerRewards] = true;
    }

    // ═══════════════════════════════════════════════════════════
    // CORE EMISSION LOGIC
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Calculate weekly emission using quadratic decay
     * @param week Week number (0-224)
     * @return Weekly emission amount in MEGAGOONER
     *
     * Formula: BASE_WEEKLY_EMISSION × (1 - week/225)²
     */
    function calculateWeeklyEmission(uint256 week) public pure returns (uint256) {
        if (week >= TOTAL_WEEKS) return 0;

        uint256 remaining = TOTAL_WEEKS - week;
        uint256 decayNumerator = remaining * remaining;
        uint256 decayDenominator = TOTAL_WEEKS * TOTAL_WEEKS;

        return (BASE_WEEKLY_EMISSION * decayNumerator) / decayDenominator;
    }

    /**
     * @notice Get current week number based on genesis timestamp
     */
    function getCurrentWeek() public view returns (uint256) {
        if (block.timestamp < genesisTimestamp) return 0;
        uint256 elapsed = block.timestamp - genesisTimestamp;
        return elapsed / 1 weeks;
    }

    /**
     * @notice Distribute current week's emissions
     * @dev Called by distributors (MoggerStaking, JestergonerRewards)
     * @return amounts [staking, lp, treasury]
     */
    function distributeEmissions()
        external
        nonReentrant
        returns (uint256[3] memory amounts)
    {
        if (!distributors[msg.sender]) revert Unauthorized();

        uint256 week = getCurrentWeek();
        if (week >= TOTAL_WEEKS) revert EmissionsEnded();
        if (weekClaimed[week]) revert WeekAlreadyClaimed();

        uint256 weeklyEmission = calculateWeeklyEmission(week);

        if (totalEmitted + weeklyEmission > MAX_SUPPLY) {
            revert ExceedsMaxSupply();
        }

        // Calculate split
        uint256 toStaking = (weeklyEmission * stakingBps) / 10000;
        uint256 toLp = (weeklyEmission * lpBps) / 10000;
        uint256 toTreasury = weeklyEmission - toStaking - toLp; // Remainder to avoid rounding issues

        totalEmitted += weeklyEmission;
        weekClaimed[week] = true;

        // Mint to respective contracts
        IMEGAGOONER(megagooner).mint(moggerStaking, toStaking);
        IMEGAGOONER(megagooner).mint(jestergonerRewards, toLp);
        IMEGAGOONER(megagooner).mint(treasury, toTreasury);

        // Notify staking contracts so they update reward accounting with the exact new amounts
        IRewardNotifiable(moggerStaking).notifyRewardAmount(toStaking);
        IRewardNotifiable(jestergonerRewards).notifyRewardAmount(toLp);

        emit EmissionDistributed(week, weeklyEmission, toStaking, toLp, toTreasury);

        return [toStaking, toLp, toTreasury];
    }

    // ═══════════════════════════════════════════════════════════
    // GOVERNANCE FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Adjust emission split percentages
     * @dev Restricted by cooldown and bounds
     */
    function adjustEmissionSplit(
        uint256 _treasuryBps,
        uint256 _stakingBps,
        uint256 _lpBps
    ) external onlyRole(GOVERNANCE_ROLE) {
        if (block.timestamp < lastAdjustment + ADJUSTMENT_COOLDOWN) {
            revert OnCooldown();
        }

        // Must sum to 100%
        if (_treasuryBps + _stakingBps + _lpBps != 10000) {
            revert InvalidSplit();
        }

        // Check bounds
        if (_treasuryBps < TREASURY_MIN_BPS || _treasuryBps > TREASURY_MAX_BPS) {
            revert OutOfBounds();
        }
        if (_stakingBps < STAKING_MIN_BPS || _stakingBps > STAKING_MAX_BPS) {
            revert OutOfBounds();
        }
        if (_lpBps < LP_MIN_BPS || _lpBps > LP_MAX_BPS) {
            revert OutOfBounds();
        }

        treasuryBps = _treasuryBps;
        stakingBps = _stakingBps;
        lpBps = _lpBps;
        lastAdjustment = block.timestamp;

        emit EmissionSplitAdjusted(_treasuryBps, _stakingBps, _lpBps);
    }

    /**
     * @notice Enable/disable distributor contracts
     */
    function setDistributor(address distributor, bool enabled)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (distributor == address(0)) revert ZeroAddress();
        distributors[distributor] = enabled;
        emit DistributorSet(distributor, enabled);
    }

    // ═══════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Get projected emissions for next N weeks
     */
    function getProjectedEmissions(uint256 numWeeks)
        external
        view
        returns (uint256[] memory emissions)
    {
        uint256 currentWeek = getCurrentWeek();
        uint256 endWeek = currentWeek + numWeeks;
        if (endWeek > TOTAL_WEEKS) endWeek = TOTAL_WEEKS;

        emissions = new uint256[](endWeek - currentWeek);

        for (uint256 i = currentWeek; i < endWeek; i++) {
            emissions[i - currentWeek] = calculateWeeklyEmission(i);
        }
    }

    /**
     * @notice Get current emission split amounts
     */
    function getCurrentSplit()
        external
        view
        returns (uint256 staking, uint256 lp, uint256 treasuryAmt)
    {
        uint256 week = getCurrentWeek();
        if (week >= TOTAL_WEEKS) return (0, 0, 0);

        uint256 weeklyEmission = calculateWeeklyEmission(week);

        staking = (weeklyEmission * stakingBps) / 10000;
        lp = (weeklyEmission * lpBps) / 10000;
        treasuryAmt = weeklyEmission - staking - lp;
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
