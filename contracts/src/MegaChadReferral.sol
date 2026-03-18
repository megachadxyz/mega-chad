// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title MegaChadReferral — Agent-to-Agent referral burns
/// @notice Agents register and earn 10% of the tren fund portion when they refer burns.
///         Burner approves this contract, then calls burnWithReferral(referrer).
///         The contract splits: 50% burned, 45% tren fund, 5% referrer.
contract MegaChadReferral is Ownable {
    IERC20 public immutable megachad;
    address public immutable burnAddress;
    address public immutable trenFundWallet;
    uint256 public immutable burnAmount;

    /// @notice Referral reward in basis points (out of the tren fund half)
    uint256 public referralBps = 1000; // 10% of the tren fund half = 5% of total burn

    mapping(address => uint256) public referralCount;
    mapping(address => uint256) public referralEarnings;
    mapping(address => bool) public registeredAgents;

    event AgentRegistered(address indexed agent);
    event ReferralBurn(
        address indexed burner,
        address indexed referrer,
        uint256 burnedAmount,
        uint256 trenAmount,
        uint256 referralReward
    );
    event ReferralBpsUpdated(uint256 oldBps, uint256 newBps);

    constructor(
        address megachad_,
        address burnAddress_,
        address trenFundWallet_,
        uint256 burnAmount_
    ) {
        require(megachad_ != address(0), "zero token");
        require(trenFundWallet_ != address(0), "zero tren");
        megachad = IERC20(megachad_);
        burnAddress = burnAddress_;
        trenFundWallet = trenFundWallet_;
        burnAmount = burnAmount_;
    }

    /// @notice Register as a referring agent
    function registerAgent() external {
        registeredAgents[msg.sender] = true;
        emit AgentRegistered(msg.sender);
    }

    /// @notice Burn with a referral — referrer earns a cut of the tren fund portion
    /// @param referrer The registered agent wallet that referred this burn
    function burnWithReferral(address referrer) external {
        require(registeredAgents[referrer], "Referrer not registered");
        require(referrer != msg.sender, "Cannot self-refer");

        uint256 half = burnAmount / 2;
        uint256 otherHalf = burnAmount - half;
        uint256 referralReward = (otherHalf * referralBps) / 10000;
        uint256 trenAmount = otherHalf - referralReward;

        require(
            megachad.transferFrom(msg.sender, burnAddress, half),
            "Burn transfer failed"
        );
        require(
            megachad.transferFrom(msg.sender, trenFundWallet, trenAmount),
            "Tren fund transfer failed"
        );
        require(
            megachad.transferFrom(msg.sender, referrer, referralReward),
            "Referral transfer failed"
        );

        referralCount[referrer]++;
        referralEarnings[referrer] += referralReward;

        emit ReferralBurn(msg.sender, referrer, half, trenAmount, referralReward);
    }

    /// @notice Standard burn without referral (same as direct transfer flow)
    function burn() external {
        uint256 half = burnAmount / 2;
        uint256 otherHalf = burnAmount - half;

        require(
            megachad.transferFrom(msg.sender, burnAddress, half),
            "Burn transfer failed"
        );
        require(
            megachad.transferFrom(msg.sender, trenFundWallet, otherHalf),
            "Tren fund transfer failed"
        );
    }

    /// @notice Owner can adjust referral reward percentage
    /// @param newBps New basis points (max 2000 = 20%)
    function setReferralBps(uint256 newBps) external onlyOwner {
        require(newBps <= 2000, "Max 20%");
        emit ReferralBpsUpdated(referralBps, newBps);
        referralBps = newBps;
    }

    /// @notice Check if an address is a registered agent
    function isAgent(address agent) external view returns (bool) {
        return registeredAgents[agent];
    }

    /// @notice Get referral stats for an agent
    function getAgentStats(address agent)
        external
        view
        returns (uint256 count, uint256 earnings, bool registered)
    {
        return (referralCount[agent], referralEarnings[agent], registeredAgents[agent]);
    }
}
