// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title JESTERGOONER — Stake MEGACHAD/MEGAGOONER LP to earn MEGAGOONER
/// @notice 4-week minimum lock. Time multiplier + NFT tier multiplier.
///         Requires 1+ Looksmaxxed NFT for any emissions eligibility.
contract JesterGooner is Ownable {
    IERC20 public immutable lpToken;
    IERC20 public immutable megagooner;
    IERC721 public immutable nft;

    uint256 public rewardRate; // MEGAGOONER per second per staked LP (scaled by 1e18)
    uint256 public totalStaked;

    uint256 public constant MIN_LOCK_DURATION = 4 weeks;
    uint256 public constant MAX_LOCK_DURATION = 52 weeks;

    // Time multiplier: 4 weeks = 1.0x, 52 weeks = 2.0x (linear interpolation)
    uint256 private constant TIME_MULT_BASE = 10000; // 1.0x
    uint256 private constant TIME_MULT_MAX = 20000;  // 2.0x

    struct StakerInfo {
        uint256 staked;
        uint256 lockEnd;
        uint256 lockDuration;
        uint256 rewardDebt;
        uint256 lastUpdate;
    }

    mapping(address => StakerInfo) public stakers;

    event Staked(address indexed user, uint256 amount, uint256 lockDuration);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 reward);
    event RewardRateUpdated(uint256 newRate);

    constructor(
        address _lpToken,
        address _megagooner,
        address _nft,
        uint256 _rewardRate
    ) {
        lpToken = IERC20(_lpToken);
        megagooner = IERC20(_megagooner);
        nft = IERC721(_nft);
        rewardRate = _rewardRate;
    }

    /// @notice Stake LP tokens with a lock duration (requires 1+ NFT)
    function stake(uint256 amount, uint256 lockDuration) external {
        require(amount > 0, "zero amount");
        require(nft.balanceOf(msg.sender) >= 1, "need 1+ Looksmaxxed NFT");
        require(lockDuration >= MIN_LOCK_DURATION, "lock too short");
        require(lockDuration <= MAX_LOCK_DURATION, "lock too long");

        StakerInfo storage s = stakers[msg.sender];

        // Claim pending rewards first
        if (s.staked > 0) {
            uint256 pending = _pendingReward(msg.sender);
            if (pending > 0) {
                _safeRewardTransfer(msg.sender, pending);
                emit RewardsClaimed(msg.sender, pending);
            }
        }

        require(lpToken.transferFrom(msg.sender, address(this), amount), "transfer failed");

        s.staked += amount;
        s.lockEnd = block.timestamp + lockDuration;
        s.lockDuration = lockDuration;
        s.lastUpdate = block.timestamp;
        s.rewardDebt = 0;
        totalStaked += amount;

        emit Staked(msg.sender, amount, lockDuration);
    }

    /// @notice Unstake LP tokens (only after lock expires)
    function unstake(uint256 amount) external {
        StakerInfo storage s = stakers[msg.sender];
        require(s.staked >= amount, "insufficient stake");
        require(amount > 0, "zero amount");
        require(block.timestamp >= s.lockEnd, "still locked");

        // Claim pending rewards
        uint256 pending = _pendingReward(msg.sender);
        if (pending > 0) {
            _safeRewardTransfer(msg.sender, pending);
            emit RewardsClaimed(msg.sender, pending);
        }

        s.staked -= amount;
        s.lastUpdate = block.timestamp;
        s.rewardDebt = 0;
        totalStaked -= amount;

        require(lpToken.transfer(msg.sender, amount), "transfer failed");

        emit Unstaked(msg.sender, amount);
    }

    /// @notice Claim pending MEGAGOONER rewards
    function claimRewards() external {
        uint256 pending = _pendingReward(msg.sender);
        require(pending > 0, "no rewards");

        StakerInfo storage s = stakers[msg.sender];
        s.lastUpdate = block.timestamp;
        s.rewardDebt = 0;

        _safeRewardTransfer(msg.sender, pending);
        emit RewardsClaimed(msg.sender, pending);
    }

    /// @notice Check if user can unstake
    function canUnstake(address account) external view returns (bool) {
        return block.timestamp >= stakers[account].lockEnd && stakers[account].staked > 0;
    }

    /// @notice View pending rewards
    function earned(address account) external view returns (uint256) {
        return _pendingReward(account);
    }

    /// @notice Get time multiplier (basis points: 10000 = 1.0x, 20000 = 2.0x)
    function getTimeMultiplier(address account) public view returns (uint256) {
        StakerInfo storage s = stakers[account];
        if (s.staked == 0) return TIME_MULT_BASE;

        uint256 duration = s.lockDuration;
        if (duration <= MIN_LOCK_DURATION) return TIME_MULT_BASE;
        if (duration >= MAX_LOCK_DURATION) return TIME_MULT_MAX;

        // Linear interpolation between 1.0x and 2.0x
        uint256 range = MAX_LOCK_DURATION - MIN_LOCK_DURATION;
        uint256 extra = duration - MIN_LOCK_DURATION;
        return TIME_MULT_BASE + (extra * (TIME_MULT_MAX - TIME_MULT_BASE)) / range;
    }

    /// @notice Get NFT multiplier (basis points: 10000 = 1.0x)
    function getNFTMultiplier(address account) public view returns (uint256) {
        uint256 nftCount = nft.balanceOf(account);
        if (nftCount == 0) return 0;
        if (nftCount >= 25) return 11500; // 1.15x
        if (nftCount >= 10) return 10750; // 1.075x
        return 10000; // 1.0x
    }

    /// @notice Get full staker info
    function getStakerInfo(address account) external view returns (
        uint256 staked,
        uint256 lockEnd,
        uint256 pendingReward,
        uint256 timeMultiplier,
        uint256 nftMultiplier,
        bool _canUnstake
    ) {
        StakerInfo storage s = stakers[account];
        staked = s.staked;
        lockEnd = s.lockEnd;
        pendingReward = _pendingReward(account);
        timeMultiplier = getTimeMultiplier(account);
        nftMultiplier = getNFTMultiplier(account);
        _canUnstake = block.timestamp >= s.lockEnd && s.staked > 0;
    }

    /// @notice Owner can update reward rate
    function setRewardRate(uint256 _rewardRate) external onlyOwner {
        rewardRate = _rewardRate;
        emit RewardRateUpdated(_rewardRate);
    }

    function _pendingReward(address account) internal view returns (uint256) {
        StakerInfo storage s = stakers[account];
        if (s.staked == 0) return 0;

        uint256 nftMult = getNFTMultiplier(account);
        if (nftMult == 0) return 0;

        uint256 timeMult = getTimeMultiplier(account);
        uint256 elapsed = block.timestamp - s.lastUpdate;

        // reward = staked * rewardRate * elapsed * timeMult * nftMult / (1e18 * 10000 * 10000)
        uint256 baseReward = (s.staked * rewardRate * elapsed) / 1e18;
        return (baseReward * timeMult * nftMult) / (10000 * 10000) + s.rewardDebt;
    }

    function _safeRewardTransfer(address to, uint256 amount) internal {
        uint256 bal = megagooner.balanceOf(address(this));
        if (amount > bal) amount = bal;
        if (amount > 0) {
            megagooner.transfer(to, amount);
        }
    }
}
