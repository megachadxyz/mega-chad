// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MoggerStakingV2 — Stake MEGACHAD to earn MEGAGOONER (proportional emissions)
/// @notice 225-week quadratic emission schedule. Rewards shared proportionally by effective stake.
///         NFT tier multipliers: Tier 1 (1-9 NFTs) 1.0x, Tier 2 (10-24) 1.075x, Tier 3 (25+) 1.15x.
///         Requires 1+ Looksmaxxed NFT for any emissions eligibility.
contract MoggerStakingV2 is Ownable {
    IERC20 public immutable megachad;
    IERC20 public immutable megagooner;
    IERC721 public immutable nft;

    // Emission schedule
    uint256 public immutable startTime;
    uint256 public immutable totalBudget; // Total MEGAGOONER to distribute over 225 weeks
    uint256 public constant TOTAL_WEEKS = 225;
    uint256 public constant WEEK_DURATION = 1 weeks;
    uint256 public constant QUADRATIC_SUM = 3_822_225; // sum(k^2, k=1..225) = 225*226*451/6

    // Synthetix accumulator
    uint256 public rewardPerTokenStored;
    uint256 public lastUpdateTime;
    uint256 public totalStaked;
    uint256 public totalEffectiveStake;

    struct Staker {
        uint256 staked;
        uint256 effectiveStake;
        uint256 rewardPerTokenPaid;
        uint256 rewards;
    }

    mapping(address => Staker) public stakers;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 reward);

    constructor(
        address _megachad,
        address _megagooner,
        address _nft,
        uint256 _totalBudget
    ) {
        megachad = IERC20(_megachad);
        megagooner = IERC20(_megagooner);
        nft = IERC721(_nft);
        totalBudget = _totalBudget;
        startTime = block.timestamp;
        lastUpdateTime = block.timestamp;
    }

    // ── Core actions ──────────────────────────────────────

    function stake(uint256 amount) external {
        require(amount > 0, "zero amount");
        require(nft.balanceOf(msg.sender) >= 1, "need 1+ Looksmaxxed NFT");

        _updateReward(msg.sender);

        require(megachad.transferFrom(msg.sender, address(this), amount), "transfer failed");

        Staker storage s = stakers[msg.sender];
        s.staked += amount;
        totalStaked += amount;

        _recalcEffectiveStake(msg.sender);

        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external {
        Staker storage s = stakers[msg.sender];
        require(s.staked >= amount && amount > 0, "invalid amount");

        _updateReward(msg.sender);

        s.staked -= amount;
        totalStaked -= amount;

        _recalcEffectiveStake(msg.sender);

        require(megachad.transfer(msg.sender, amount), "transfer failed");

        emit Unstaked(msg.sender, amount);
    }

    function claimRewards() external {
        _updateReward(msg.sender);

        Staker storage s = stakers[msg.sender];
        uint256 reward = s.rewards;
        require(reward > 0, "no rewards");

        s.rewards = 0;
        _safeRewardTransfer(msg.sender, reward);

        emit RewardsClaimed(msg.sender, reward);
    }

    /// @notice Recalculate effective stake when NFT balance changes
    function refreshEffectiveStake(address account) external {
        _updateReward(account);
        _recalcEffectiveStake(account);
    }

    // ── Views ─────────────────────────────────────────────

    function earned(address account) external view returns (uint256) {
        Staker storage s = stakers[account];
        uint256 rpt = _rewardPerTokenView();
        return s.rewards + (s.effectiveStake * (rpt - s.rewardPerTokenPaid)) / 1e18;
    }

    function getNFTMultiplier(address account) public view returns (uint256) {
        uint256 nftCount = nft.balanceOf(account);
        if (nftCount == 0) return 0;
        if (nftCount >= 25) return 11500;
        if (nftCount >= 10) return 10750;
        return 10000;
    }

    function getCurrentWeek() public view returns (uint256) {
        if (block.timestamp <= startTime) return 0;
        uint256 w = (block.timestamp - startTime) / WEEK_DURATION;
        return w >= TOTAL_WEEKS ? TOTAL_WEEKS : w;
    }

    function getWeeklyEmission(uint256 week) public view returns (uint256) {
        if (week >= TOTAL_WEEKS) return 0;
        uint256 remaining = TOTAL_WEEKS - week;
        return (totalBudget * remaining * remaining) / QUADRATIC_SUM;
    }

    function getStakerInfo(address account) external view returns (
        uint256 staked,
        uint256 effectiveStake,
        uint256 pendingReward,
        uint256 multiplier,
        uint256 nftCount
    ) {
        Staker storage s = stakers[account];
        staked = s.staked;
        effectiveStake = s.effectiveStake;
        uint256 rpt = _rewardPerTokenView();
        pendingReward = s.rewards + (s.effectiveStake * (rpt - s.rewardPerTokenPaid)) / 1e18;
        multiplier = getNFTMultiplier(account);
        nftCount = nft.balanceOf(account);
    }

    function getGlobalStats() external view returns (
        uint256 _totalStaked,
        uint256 _totalEffectiveStake,
        uint256 currentWeek,
        uint256 weeklyEmission,
        uint256 rewardsRemaining
    ) {
        _totalStaked = totalStaked;
        _totalEffectiveStake = totalEffectiveStake;
        currentWeek = getCurrentWeek();
        weeklyEmission = getWeeklyEmission(currentWeek);
        rewardsRemaining = megagooner.balanceOf(address(this));
    }

    // ── Internal: Synthetix accumulator ───────────────────

    function _rewardPerTokenView() internal view returns (uint256) {
        if (totalEffectiveStake == 0) return rewardPerTokenStored;
        return rewardPerTokenStored + _accumulateSince(lastUpdateTime);
    }

    /// @dev Accumulate rewardPerToken from `since` to `block.timestamp`, crossing week boundaries
    function _accumulateSince(uint256 since) internal view returns (uint256) {
        if (totalEffectiveStake == 0) return 0;

        uint256 accumulated = 0;
        uint256 t = since;
        uint256 endTime = startTime + TOTAL_WEEKS * WEEK_DURATION;
        uint256 now_ = block.timestamp < endTime ? block.timestamp : endTime;

        while (t < now_) {
            uint256 week = (t - startTime) / WEEK_DURATION;
            if (week >= TOTAL_WEEKS) break;

            uint256 weekEnd = startTime + (week + 1) * WEEK_DURATION;
            uint256 end = now_ < weekEnd ? now_ : weekEnd;
            uint256 duration = end - t;

            // rewardRate for this week = weeklyEmission / WEEK_DURATION (in tokens/sec, 18 decimals)
            uint256 weeklyEmission = getWeeklyEmission(week);
            // accumulated += weeklyEmission * duration * 1e18 / (WEEK_DURATION * totalEffectiveStake)
            accumulated += (weeklyEmission * duration * 1e18) / (WEEK_DURATION * totalEffectiveStake);

            t = end;
        }

        return accumulated;
    }

    function _updateReward(address account) internal {
        rewardPerTokenStored = _rewardPerTokenView();
        lastUpdateTime = block.timestamp;

        if (account != address(0)) {
            Staker storage s = stakers[account];
            s.rewards += (s.effectiveStake * (rewardPerTokenStored - s.rewardPerTokenPaid)) / 1e18;
            s.rewardPerTokenPaid = rewardPerTokenStored;
        }
    }

    function _recalcEffectiveStake(address account) internal {
        Staker storage s = stakers[account];
        uint256 oldEffective = s.effectiveStake;
        uint256 multiplier = getNFTMultiplier(account);
        uint256 newEffective = (s.staked * multiplier) / 10000;

        s.effectiveStake = newEffective;
        totalEffectiveStake = totalEffectiveStake - oldEffective + newEffective;
    }

    function _safeRewardTransfer(address to, uint256 amount) internal {
        uint256 bal = megagooner.balanceOf(address(this));
        if (amount > bal) amount = bal;
        if (amount > 0) {
            megagooner.transfer(to, amount);
        }
    }
}
