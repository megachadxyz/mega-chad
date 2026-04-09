// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title JesterGoonerV3 — Multi-pool LP staking with proportional emissions
/// @notice MasterChef-style: multiple LP tokens share a single MEGAGOONER emission budget.
///         225-week quadratic decay. Pool weights configurable by owner.
///         NFT tier multipliers: 1-9 NFTs 1.0x, 10-24 1.075x, 25+ 1.15x.
///         Requires 1+ Looksmaxxed NFT for any emissions eligibility.
contract JesterGoonerV3 is Ownable {
    IERC20 public immutable megagooner;
    IERC721 public immutable nft;

    uint256 public immutable startTime;
    uint256 public immutable totalBudget;
    uint256 public constant TOTAL_WEEKS = 225;
    uint256 public constant WEEK_DURATION = 1 weeks;
    uint256 public constant QUADRATIC_SUM = 3_822_225;

    struct PoolInfo {
        IERC20 lpToken;
        uint256 allocPoint;
        uint256 rewardPerTokenStored;
        uint256 lastUpdateTime;
        uint256 totalStaked;
        uint256 totalEffectiveStake;
    }

    struct UserInfo {
        uint256 staked;
        uint256 effectiveStake;
        uint256 rewardPerTokenPaid;
        uint256 rewards;
    }

    PoolInfo[] public poolInfo;
    uint256 public totalAllocPoint;

    mapping(uint256 => mapping(address => UserInfo)) public userInfo;

    event Staked(address indexed user, uint256 indexed pid, uint256 amount);
    event Unstaked(address indexed user, uint256 indexed pid, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 indexed pid, uint256 reward);
    event AllocPointUpdated(uint256 indexed pid, uint256 oldPoints, uint256 newPoints);

    constructor(
        address _megagooner,
        address _nft,
        uint256 _totalBudget,
        address[] memory _lpTokens,
        uint256[] memory _allocPoints
    ) {
        require(_lpTokens.length == _allocPoints.length, "length mismatch");
        require(_lpTokens.length > 0, "no pools");

        megagooner = IERC20(_megagooner);
        nft = IERC721(_nft);
        totalBudget = _totalBudget;
        startTime = block.timestamp;

        uint256 totalAlloc = 0;
        for (uint256 i = 0; i < _lpTokens.length; i++) {
            require(_lpTokens[i] != address(0), "zero lp token");
            require(_allocPoints[i] > 0, "zero alloc");
            poolInfo.push(PoolInfo({
                lpToken: IERC20(_lpTokens[i]),
                allocPoint: _allocPoints[i],
                rewardPerTokenStored: 0,
                lastUpdateTime: block.timestamp,
                totalStaked: 0,
                totalEffectiveStake: 0
            }));
            totalAlloc += _allocPoints[i];
        }
        totalAllocPoint = totalAlloc;
    }

    // ── Core actions ──────────────────────────────────────

    function stake(uint256 pid, uint256 amount) external {
        require(pid < poolInfo.length, "invalid pid");
        require(amount > 0, "zero amount");
        require(nft.balanceOf(msg.sender) >= 1, "need 1+ Looksmaxxed NFT");

        _updatePoolReward(pid, msg.sender);

        PoolInfo storage pool = poolInfo[pid];
        UserInfo storage user = userInfo[pid][msg.sender];

        require(pool.lpToken.transferFrom(msg.sender, address(this), amount), "transfer failed");

        user.staked += amount;
        pool.totalStaked += amount;
        _recalcEffectiveStake(pid, msg.sender);

        emit Staked(msg.sender, pid, amount);
    }

    function unstake(uint256 pid, uint256 amount) external {
        require(pid < poolInfo.length, "invalid pid");
        UserInfo storage user = userInfo[pid][msg.sender];
        require(user.staked >= amount && amount > 0, "invalid amount");

        _updatePoolReward(pid, msg.sender);

        PoolInfo storage pool = poolInfo[pid];
        user.staked -= amount;
        pool.totalStaked -= amount;
        _recalcEffectiveStake(pid, msg.sender);

        require(pool.lpToken.transfer(msg.sender, amount), "transfer failed");

        emit Unstaked(msg.sender, pid, amount);
    }

    function claimRewards(uint256 pid) external {
        require(pid < poolInfo.length, "invalid pid");
        _updatePoolReward(pid, msg.sender);

        UserInfo storage user = userInfo[pid][msg.sender];
        uint256 reward = user.rewards;
        require(reward > 0, "no rewards");

        user.rewards = 0;
        _safeRewardTransfer(msg.sender, reward);

        emit RewardsClaimed(msg.sender, pid, reward);
    }

    function claimAllRewards() external {
        uint256 totalReward = 0;
        for (uint256 pid = 0; pid < poolInfo.length; pid++) {
            _updatePoolReward(pid, msg.sender);
            UserInfo storage user = userInfo[pid][msg.sender];
            if (user.rewards > 0) {
                totalReward += user.rewards;
                emit RewardsClaimed(msg.sender, pid, user.rewards);
                user.rewards = 0;
            }
        }
        require(totalReward > 0, "no rewards");
        _safeRewardTransfer(msg.sender, totalReward);
    }

    function refreshEffectiveStake(uint256 pid, address account) external {
        require(pid < poolInfo.length, "invalid pid");
        _updatePoolReward(pid, account);
        _recalcEffectiveStake(pid, account);
    }

    // ── Owner ─────────────────────────────────────────────

    function setAllocPoint(uint256 pid, uint256 newAllocPoint) external onlyOwner {
        require(pid < poolInfo.length, "invalid pid");
        require(newAllocPoint > 0, "zero alloc");

        _massUpdatePools();

        uint256 oldAlloc = poolInfo[pid].allocPoint;
        totalAllocPoint = totalAllocPoint - oldAlloc + newAllocPoint;
        emit AllocPointUpdated(pid, oldAlloc, newAllocPoint);
        poolInfo[pid].allocPoint = newAllocPoint;
    }

    // ── Views ─────────────────────────────────────────────

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    function earned(uint256 pid, address account) external view returns (uint256) {
        UserInfo storage user = userInfo[pid][account];
        uint256 rpt = _rewardPerTokenView(pid);
        return user.rewards + (user.effectiveStake * (rpt - user.rewardPerTokenPaid)) / 1e18;
    }

    function earnedAll(address account) external view returns (uint256 total) {
        for (uint256 pid = 0; pid < poolInfo.length; pid++) {
            UserInfo storage user = userInfo[pid][account];
            uint256 rpt = _rewardPerTokenView(pid);
            total += user.rewards + (user.effectiveStake * (rpt - user.rewardPerTokenPaid)) / 1e18;
        }
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

    function getPoolInfo(uint256 pid) external view returns (
        address lpToken,
        uint256 allocPoint,
        uint256 totalStaked,
        uint256 totalEffectiveStake,
        uint256 weeklyEmission
    ) {
        require(pid < poolInfo.length, "invalid pid");
        PoolInfo storage pool = poolInfo[pid];
        lpToken = address(pool.lpToken);
        allocPoint = pool.allocPoint;
        totalStaked = pool.totalStaked;
        totalEffectiveStake = pool.totalEffectiveStake;
        uint256 currentWeek = getCurrentWeek();
        weeklyEmission = (getWeeklyEmission(currentWeek) * pool.allocPoint) / totalAllocPoint;
    }

    function getUserInfo(uint256 pid, address account) external view returns (
        uint256 staked,
        uint256 effectiveStake,
        uint256 pendingReward,
        uint256 multiplier,
        uint256 nftCount
    ) {
        require(pid < poolInfo.length, "invalid pid");
        UserInfo storage user = userInfo[pid][account];
        staked = user.staked;
        effectiveStake = user.effectiveStake;
        uint256 rpt = _rewardPerTokenView(pid);
        pendingReward = user.rewards + (user.effectiveStake * (rpt - user.rewardPerTokenPaid)) / 1e18;
        multiplier = getNFTMultiplier(account);
        nftCount = nft.balanceOf(account);
    }

    function getGlobalStats() external view returns (
        uint256 currentWeek,
        uint256 totalWeeklyEmission,
        uint256 rewardsRemaining,
        uint256 numPools
    ) {
        currentWeek = getCurrentWeek();
        totalWeeklyEmission = getWeeklyEmission(currentWeek);
        rewardsRemaining = megagooner.balanceOf(address(this));
        numPools = poolInfo.length;
    }

    // ── Internal: per-pool Synthetix accumulator ──────────

    function _rewardPerTokenView(uint256 pid) internal view returns (uint256) {
        PoolInfo storage pool = poolInfo[pid];
        if (pool.totalEffectiveStake == 0) return pool.rewardPerTokenStored;
        return pool.rewardPerTokenStored + _accumulateSince(pid, pool.lastUpdateTime);
    }

    function _accumulateSince(uint256 pid, uint256 since) internal view returns (uint256) {
        PoolInfo storage pool = poolInfo[pid];
        if (pool.totalEffectiveStake == 0) return 0;

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

            uint256 poolWeeklyEmission = (getWeeklyEmission(week) * pool.allocPoint) / totalAllocPoint;
            accumulated += (poolWeeklyEmission * duration * 1e18) / (WEEK_DURATION * pool.totalEffectiveStake);

            t = end;
        }

        return accumulated;
    }

    function _updatePoolReward(uint256 pid, address account) internal {
        PoolInfo storage pool = poolInfo[pid];
        pool.rewardPerTokenStored = _rewardPerTokenView(pid);
        pool.lastUpdateTime = block.timestamp;

        if (account != address(0)) {
            UserInfo storage user = userInfo[pid][account];
            user.rewards += (user.effectiveStake * (pool.rewardPerTokenStored - user.rewardPerTokenPaid)) / 1e18;
            user.rewardPerTokenPaid = pool.rewardPerTokenStored;
        }
    }

    function _massUpdatePools() internal {
        for (uint256 pid = 0; pid < poolInfo.length; pid++) {
            _updatePoolReward(pid, address(0));
        }
    }

    function _recalcEffectiveStake(uint256 pid, address account) internal {
        UserInfo storage user = userInfo[pid][account];
        PoolInfo storage pool = poolInfo[pid];
        uint256 oldEffective = user.effectiveStake;
        uint256 multiplier = getNFTMultiplier(account);
        uint256 newEffective = (user.staked * multiplier) / 10000;

        user.effectiveStake = newEffective;
        pool.totalEffectiveStake = pool.totalEffectiveStake - oldEffective + newEffective;
    }

    function _safeRewardTransfer(address to, uint256 amount) internal {
        uint256 bal = megagooner.balanceOf(address(this));
        if (amount > bal) amount = bal;
        if (amount > 0) {
            megagooner.transfer(to, amount);
        }
    }
}
