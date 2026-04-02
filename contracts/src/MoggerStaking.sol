// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MoggerStaking — Stake MEGACHAD to earn MEGAGOONER
/// @notice NFT tier multipliers: Tier 1 (1-9 NFTs) 1.0x, Tier 2 (10-24) 1.075x, Tier 3 (25+) 1.15x.
///         Requires 1+ Looksmaxxed NFT for any emissions eligibility.
contract MoggerStaking is Ownable {
    IERC20 public immutable megachad;
    IERC20 public immutable megagooner;
    IERC721 public immutable nft;

    // Reward rate: MEGAGOONER per second per staked MEGACHAD (scaled by 1e18)
    uint256 public rewardRate; // e.g. 1e12 = 0.000001 MEGAGOONER per MEGACHAD per second
    uint256 public totalStaked;

    struct StakerInfo {
        uint256 staked;
        uint256 rewardDebt;
        uint256 lastUpdate;
    }

    mapping(address => StakerInfo) public stakers;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 reward);
    event RewardRateUpdated(uint256 newRate);

    constructor(
        address _megachad,
        address _megagooner,
        address _nft,
        uint256 _rewardRate
    ) {
        megachad = IERC20(_megachad);
        megagooner = IERC20(_megagooner);
        nft = IERC721(_nft);
        rewardRate = _rewardRate;
    }

    /// @notice Stake MEGACHAD tokens (requires 1+ NFT)
    function stake(uint256 amount) external {
        require(amount > 0, "zero amount");
        require(nft.balanceOf(msg.sender) >= 1, "need 1+ Looksmaxxed NFT");

        StakerInfo storage s = stakers[msg.sender];

        // Claim pending rewards first
        if (s.staked > 0) {
            uint256 pending = _pendingReward(msg.sender);
            if (pending > 0) {
                _safeRewardTransfer(msg.sender, pending);
                emit RewardsClaimed(msg.sender, pending);
            }
        }

        require(megachad.transferFrom(msg.sender, address(this), amount), "transfer failed");

        s.staked += amount;
        s.lastUpdate = block.timestamp;
        s.rewardDebt = 0;
        totalStaked += amount;

        emit Staked(msg.sender, amount);
    }

    /// @notice Unstake MEGACHAD tokens
    function unstake(uint256 amount) external {
        StakerInfo storage s = stakers[msg.sender];
        require(s.staked >= amount, "insufficient stake");
        require(amount > 0, "zero amount");

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

        require(megachad.transfer(msg.sender, amount), "transfer failed");

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

    /// @notice View pending rewards for an account
    function earned(address account) external view returns (uint256) {
        return _pendingReward(account);
    }

    /// @notice Get NFT multiplier for an account (basis points, 10000 = 1.0x)
    function getNFTMultiplier(address account) public view returns (uint256) {
        uint256 nftCount = nft.balanceOf(account);
        if (nftCount == 0) return 0; // No emissions without NFT
        if (nftCount >= 25) return 11500; // 1.15x
        if (nftCount >= 10) return 10750; // 1.075x
        return 10000; // 1.0x
    }

    /// @notice Get full staker info
    function getStakerInfo(address account) external view returns (
        uint256 staked,
        uint256 pendingReward,
        uint256 multiplier,
        uint256 nftCount
    ) {
        StakerInfo storage s = stakers[account];
        staked = s.staked;
        pendingReward = _pendingReward(account);
        multiplier = getNFTMultiplier(account);
        nftCount = nft.balanceOf(account);
    }

    /// @notice Get global stats
    function getGlobalStats() external view returns (
        uint256 _totalStaked,
        uint256 _rewardRate,
        uint256 rewardsRemaining
    ) {
        _totalStaked = totalStaked;
        _rewardRate = rewardRate;
        rewardsRemaining = megagooner.balanceOf(address(this));
    }

    /// @notice Owner can update reward rate
    function setRewardRate(uint256 _rewardRate) external onlyOwner {
        rewardRate = _rewardRate;
        emit RewardRateUpdated(_rewardRate);
    }

    function _pendingReward(address account) internal view returns (uint256) {
        StakerInfo storage s = stakers[account];
        if (s.staked == 0) return 0;

        uint256 multiplier = getNFTMultiplier(account);
        if (multiplier == 0) return 0;

        uint256 elapsed = block.timestamp - s.lastUpdate;
        // reward = staked * rewardRate * elapsed * multiplier / (1e18 * 10000)
        uint256 baseReward = (s.staked * rewardRate * elapsed) / 1e18;
        return (baseReward * multiplier) / 10000 + s.rewardDebt;
    }

    function _safeRewardTransfer(address to, uint256 amount) internal {
        uint256 bal = megagooner.balanceOf(address(this));
        if (amount > bal) amount = bal;
        if (amount > 0) {
            megagooner.transfer(to, amount);
        }
    }
}
