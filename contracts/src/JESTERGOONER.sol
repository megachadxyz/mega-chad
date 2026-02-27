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

interface IEmissionController {
    function distributeEmissions() external returns (uint256[3] memory);
}

/**
 * @title JESTERGOONER
 * @notice LP staking with 4-week minimum lock and NFT multiplier boosts
 *
 * Features:
 * - Stake LP tokens → earn MEGAGOONER
 * - 4-week minimum lock period
 * - Time-weighted rewards
 * - NFT multiplier: 1.0x / 1.075x / 1.15x
 * - Receives 40% of weekly MEGAGOONER emissions
 *
 * NFT Multipliers:
 * - 1-9 NFTs: 1.0x
 * - 10-24 NFTs: 1.075x
 * - 25+ NFTs: 1.15x
 */
contract JESTERGOONER is
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

    IERC20 public lpToken;
    IERC20 public megagooner;
    IMEGACHADNFTChecker public nftContract;
    IEmissionController public emissionController;

    uint256 public constant MIN_LOCK_DURATION = 4 weeks;
    uint256 public totalStaked;
    uint256 public rewardPerTokenStored;

    struct StakerInfo {
        uint256 stakedAmount;
        uint256 stakeTimestamp;
        uint256 rewardPerTokenPaid;
        uint256 rewards;
    }

    mapping(address => StakerInfo) public stakers;

    // NFT multiplier tiers (in basis points, 10000 = 1.0x)
    uint256 public constant TIER1_MULTIPLIER = 10000;  // 1.0x (1-9 NFTs)
    uint256 public constant TIER2_MULTIPLIER = 10750;  // 1.075x (10-24 NFTs)
    uint256 public constant TIER3_MULTIPLIER = 11500;  // 1.15x (25+ NFTs)

    // ═══════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════

    event Staked(address indexed user, uint256 amount, uint256 lockUntil);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardsDistributed(uint256 amount);

    // ═══════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════

    error ZeroAmount();
    error InsufficientStake();
    error StillLocked();
    error NoNFT();
    error ZeroAddress();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _lpToken,
        address _megagooner,
        address _nftContract,
        address _emissionController,
        address _admin
    ) external initializer {
        if (_lpToken == address(0) ||
            _megagooner == address(0) ||
            _nftContract == address(0) ||
            _emissionController == address(0) ||
            _admin == address(0)) revert ZeroAddress();

        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        lpToken = IERC20(_lpToken);
        megagooner = IERC20(_megagooner);
        nftContract = IMEGACHADNFTChecker(_nftContract);
        emissionController = IEmissionController(_emissionController);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);

    }

    // ═══════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════

    modifier updateReward(address account) {
        if (account != address(0)) {
            stakers[account].rewards = earned(account);
            stakers[account].rewardPerTokenPaid = rewardPerTokenStored;
        }
        _;
    }

    modifier requireNFT() {
        if (nftContract.balanceOf(msg.sender) == 0) revert NoNFT();
        _;
    }

    // ═══════════════════════════════════════════════════════════
    // STAKING FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Stake LP tokens (requires 1+ NFT, 4-week lock)
     * @param amount Amount of LP tokens to stake
     */
    function stake(uint256 amount)
        external
        nonReentrant
        requireNFT
        updateReward(msg.sender)
    {
        if (amount == 0) revert ZeroAmount();

        bool isNewStake = stakers[msg.sender].stakedAmount == 0;
        stakers[msg.sender].stakedAmount += amount;
        if (isNewStake) {
            stakers[msg.sender].stakeTimestamp = block.timestamp;
        }
        totalStaked += amount;

        lpToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Staked(msg.sender, amount, block.timestamp + MIN_LOCK_DURATION);
    }

    /**
     * @notice Unstake LP tokens (after 4-week lock)
     * @param amount Amount of LP tokens to unstake
     */
    function unstake(uint256 amount)
        external
        nonReentrant
        updateReward(msg.sender)
    {
        if (amount == 0) revert ZeroAmount();
        if (stakers[msg.sender].stakedAmount < amount) revert InsufficientStake();

        uint256 lockEnd = stakers[msg.sender].stakeTimestamp + MIN_LOCK_DURATION;
        if (block.timestamp < lockEnd) revert StillLocked();

        stakers[msg.sender].stakedAmount -= amount;
        totalStaked -= amount;

        // Reset timestamp on full unstake so re-staking starts fresh lock
        if (stakers[msg.sender].stakedAmount == 0) {
            stakers[msg.sender].stakeTimestamp = 0;
        }

        lpToken.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    /**
     * @notice Claim earned MEGAGOONER rewards
     */
    function claimRewards()
        external
        nonReentrant
        updateReward(msg.sender)
    {
        uint256 reward = stakers[msg.sender].rewards;
        if (reward == 0) revert ZeroAmount();

        stakers[msg.sender].rewards = 0;
        megagooner.safeTransfer(msg.sender, reward);

        emit RewardsClaimed(msg.sender, reward);
    }

    /**
     * @notice Trigger weekly emission distribution from EmissionController
     * @dev Callable by anyone. EmissionController mints rewards and calls notifyRewardAmount().
     */
    function distributeWeeklyRewards() external nonReentrant {
        emissionController.distributeEmissions();
    }

    /**
     * @notice Called by EmissionController after minting rewards to this contract
     * @param reward Amount of MEGAGOONER minted to this contract this week
     */
    function notifyRewardAmount(uint256 reward) external {
        require(msg.sender == address(emissionController), "Only EmissionController");
        if (totalStaked > 0 && reward > 0) {
            rewardPerTokenStored += (reward * 1e18) / totalStaked;
        }
        emit RewardsDistributed(reward);
    }

    // ═══════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Get NFT multiplier for an address
     * @param account Address to check
     * @return Multiplier in basis points (10000 = 1.0x)
     */
    function getNFTMultiplier(address account) public view returns (uint256) {
        uint256 nftBalance = nftContract.balanceOf(account);

        if (nftBalance >= 25) return TIER3_MULTIPLIER; // 1.15x
        if (nftBalance >= 10) return TIER2_MULTIPLIER; // 1.075x
        if (nftBalance >= 1) return TIER1_MULTIPLIER;  // 1.0x

        return 0; // No NFTs = no staking allowed
    }

    /**
     * @notice Calculate time-weighted multiplier (vests over 4 weeks)
     * @dev 0-4 weeks: linear from 50% to 100%
     */
    function getTimeMultiplier(address account) public view returns (uint256) {
        uint256 stakeTimestamp = stakers[account].stakeTimestamp;
        if (stakeTimestamp == 0) return 0; // Not staked

        uint256 stakeDuration = block.timestamp - stakeTimestamp;

        if (stakeDuration >= MIN_LOCK_DURATION) return 10000; // 100% after 4 weeks

        // Linear vesting from 5000 (50%) to 10000 (100%)
        return 5000 + (stakeDuration * 5000 / MIN_LOCK_DURATION);
    }

    /**
     * @notice Calculate reward per staked token
     */
    function rewardPerToken() public view returns (uint256) {
        return rewardPerTokenStored;
    }

    /**
     * @notice Calculate earned rewards (with NFT + time multipliers)
     * @param account Address to check
     * @return Earned MEGAGOONER amount
     */
    function earned(address account) public view returns (uint256) {
        StakerInfo memory staker = stakers[account];
        if (staker.stakedAmount == 0) return staker.rewards;

        uint256 baseReward = (staker.stakedAmount *
            (rewardPerToken() - staker.rewardPerTokenPaid)) / 1e18;

        uint256 nftMultiplier = getNFTMultiplier(account);
        uint256 timeMultiplier = getTimeMultiplier(account);

        uint256 boostedReward = (baseReward * nftMultiplier * timeMultiplier) / (10000 * 10000);

        return staker.rewards + boostedReward;
    }

    /**
     * @notice Get staker information
     */
    function getStakerInfo(address account)
        external
        view
        returns (
            uint256 stakedAmount,
            uint256 earnedRewards,
            uint256 lockEnd,
            uint256 nftCount,
            uint256 nftMultiplier,
            uint256 timeMultiplier
        )
    {
        stakedAmount = stakers[account].stakedAmount;
        earnedRewards = earned(account);
        lockEnd = stakers[account].stakeTimestamp + MIN_LOCK_DURATION;
        nftCount = nftContract.balanceOf(account);
        nftMultiplier = getNFTMultiplier(account);
        timeMultiplier = getTimeMultiplier(account);
    }

    /**
     * @notice Check if user can unstake
     */
    function canUnstake(address account) external view returns (bool) {
        if (stakers[account].stakedAmount == 0) return false;
        uint256 lockEnd = stakers[account].stakeTimestamp + MIN_LOCK_DURATION;
        return block.timestamp >= lockEnd;
    }

    /**
     * @notice Get global staking stats
     */
    function getGlobalStats()
        external
        view
        returns (
            uint256 _totalStaked,
            uint256 _totalRewardsDistributed,
            uint256 _rewardRate
        )
    {
        _totalStaked = totalStaked;
        _totalRewardsDistributed = rewardPerTokenStored;
        _rewardRate = rewardPerToken();
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
