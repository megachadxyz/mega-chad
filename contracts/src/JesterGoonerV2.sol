// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title JesterGoonerV2 — Stake MEGACHAD/MEGAGOONER LP to earn MEGAGOONER (proportional emissions)
/// @notice 225-week quadratic emission schedule. Rewards shared proportionally by effective stake.
///         4-week minimum lock, 52-week maximum. Time multiplier: 1.0x (4wk) → 2.0x (52wk).
///         NFT tier multipliers: 1-9 NFTs 1.0x, 10-24 1.075x, 25+ 1.15x.
///         Requires 1+ Looksmaxxed NFT for any emissions eligibility.
contract JesterGoonerV2 is Ownable {
    IERC20 public immutable lpToken;
    IERC20 public immutable megagooner;
    IERC721 public immutable nft;

    // Emission schedule
    uint256 public immutable startTime;
    uint256 public immutable totalBudget;
    uint256 public constant TOTAL_WEEKS = 225;
    uint256 public constant WEEK_DURATION = 1 weeks;
    uint256 public constant QUADRATIC_SUM = 3_822_225; // sum(k^2, k=1..225) = 225*226*451/6

    // Lock constraints
    uint256 public constant MIN_LOCK_DURATION = 4 weeks;
    uint256 public constant MAX_LOCK_DURATION = 52 weeks;

    // Time multiplier: 4 weeks = 1.0x (10000), 52 weeks = 2.0x (20000)
    uint256 private constant TIME_MULT_BASE = 10000;
    uint256 private constant TIME_MULT_MAX = 20000;

    // Synthetix accumulator
    uint256 public rewardPerTokenStored;
    uint256 public lastUpdateTime;
    uint256 public totalStaked;
    uint256 public totalEffectiveStake;

    struct Staker {
        uint256 staked;
        uint256 effectiveStake;
        uint256 lockEnd;
        uint256 lockDuration;
        uint256 rewardPerTokenPaid;
        uint256 rewards;
    }

    mapping(address => Staker) public stakers;

    event Staked(address indexed user, uint256 amount, uint256 lockUntil);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 reward);

    constructor(
        address _lpToken,
        address _megagooner,
        address _nft,
        uint256 _totalBudget
    ) {
        lpToken = IERC20(_lpToken);
        megagooner = IERC20(_megagooner);
        nft = IERC721(_nft);
        totalBudget = _totalBudget;
        startTime = block.timestamp;
        lastUpdateTime = block.timestamp;
    }

    // ── Core actions ──────────────────────────────────────

    function stake(uint256 amount, uint256 lockDuration) external {
        require(amount > 0, "zero amount");
        require(nft.balanceOf(msg.sender) >= 1, "need 1+ Looksmaxxed NFT");
        require(lockDuration >= MIN_LOCK_DURATION, "lock too short");
        require(lockDuration <= MAX_LOCK_DURATION, "lock too long");

        _updateReward(msg.sender);

        require(lpToken.transferFrom(msg.sender, address(this), amount), "transfer failed");

        Staker storage s = stakers[msg.sender];

        // If already staked, new lock must be at least as long as remaining lock
        if (s.staked > 0 && s.lockEnd > block.timestamp) {
            uint256 remaining = s.lockEnd - block.timestamp;
            require(lockDuration >= remaining, "cannot shorten existing lock");
        }

        s.staked += amount;
        s.lockEnd = block.timestamp + lockDuration;
        s.lockDuration = lockDuration;
        totalStaked += amount;

        _recalcEffectiveStake(msg.sender);

        emit Staked(msg.sender, amount, s.lockEnd);
    }

    /// @notice Convenience overload: stake with minimum lock (4 weeks)
    function stake(uint256 amount) external {
        require(amount > 0, "zero amount");
        require(nft.balanceOf(msg.sender) >= 1, "need 1+ Looksmaxxed NFT");

        _updateReward(msg.sender);

        require(lpToken.transferFrom(msg.sender, address(this), amount), "transfer failed");

        Staker storage s = stakers[msg.sender];

        uint256 lockDuration = MIN_LOCK_DURATION;
        if (s.staked > 0 && s.lockEnd > block.timestamp) {
            uint256 remaining = s.lockEnd - block.timestamp;
            if (remaining > lockDuration) lockDuration = remaining;
        }

        s.staked += amount;
        s.lockEnd = block.timestamp + lockDuration;
        s.lockDuration = lockDuration;
        totalStaked += amount;

        _recalcEffectiveStake(msg.sender);

        emit Staked(msg.sender, amount, s.lockEnd);
    }

    function unstake(uint256 amount) external {
        Staker storage s = stakers[msg.sender];
        require(s.staked >= amount && amount > 0, "invalid amount");
        require(block.timestamp >= s.lockEnd, "still locked");

        _updateReward(msg.sender);

        s.staked -= amount;
        totalStaked -= amount;

        _recalcEffectiveStake(msg.sender);

        require(lpToken.transfer(msg.sender, amount), "transfer failed");

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

    function canUnstake(address account) external view returns (bool) {
        Staker storage s = stakers[account];
        return block.timestamp >= s.lockEnd && s.staked > 0;
    }

    function getTimeMultiplier(address account) public view returns (uint256) {
        Staker storage s = stakers[account];
        if (s.staked == 0) return TIME_MULT_BASE;
        uint256 duration = s.lockDuration;
        if (duration <= MIN_LOCK_DURATION) return TIME_MULT_BASE;
        if (duration >= MAX_LOCK_DURATION) return TIME_MULT_MAX;
        uint256 range = MAX_LOCK_DURATION - MIN_LOCK_DURATION;
        uint256 extra = duration - MIN_LOCK_DURATION;
        return TIME_MULT_BASE + (extra * (TIME_MULT_MAX - TIME_MULT_BASE)) / range;
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
        uint256 lockEnd,
        uint256 pendingReward,
        uint256 timeMultiplier,
        uint256 nftMultiplier,
        bool _canUnstake
    ) {
        Staker storage s = stakers[account];
        staked = s.staked;
        effectiveStake = s.effectiveStake;
        lockEnd = s.lockEnd;
        uint256 rpt = _rewardPerTokenView();
        pendingReward = s.rewards + (s.effectiveStake * (rpt - s.rewardPerTokenPaid)) / 1e18;
        timeMultiplier = getTimeMultiplier(account);
        nftMultiplier = getNFTMultiplier(account);
        _canUnstake = block.timestamp >= s.lockEnd && s.staked > 0;
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

            uint256 weeklyEmission = getWeeklyEmission(week);
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
        uint256 nftMult = getNFTMultiplier(account);
        uint256 timeMult = getTimeMultiplier(account);
        uint256 newEffective = (s.staked * nftMult * timeMult) / (10000 * 10000);

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
