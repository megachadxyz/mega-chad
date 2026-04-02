// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title Framemogger — Send MEGACHAD to Tren Fund + burn MEGAGOONER for deflation
/// @notice 1:4 ratio — for every 4 MEGACHAD sent, 1 MEGAGOONER is burned.
///         Top 3 weekly senders earn governance proposal rights via Jestermogger.
///         Requires 1+ Looksmaxxed NFT to participate.
contract Framemogger {
    IERC20 public immutable megachad;
    ERC20Burnable public immutable megagooner;
    IERC721 public immutable nft;
    address public immutable trenFund;

    uint256 public immutable genesisTimestamp;
    uint256 public constant WEEK_DURATION = 7 days;
    uint256 public constant MEGAGOONER_RATIO = 4; // 4 MEGACHAD : 1 MEGAGOONER burned

    // Weekly tracking
    struct WeekData {
        uint256 totalSent;
        uint256 uniqueSenders;
        address[3] top3;
        uint256[3] top3Amounts;
    }

    // Per-user per-week tracking
    mapping(uint256 => mapping(address => uint256)) public weeklyUserSent;
    mapping(uint256 => WeekData) public weekData;
    mapping(uint256 => mapping(address => bool)) private countedSender;

    // Lifetime stats
    mapping(address => uint256) public totalUserSent;
    uint256 public totalSentAllTime;
    uint256 public totalMegagoonerBurned;

    event MegachadSent(
        address indexed sender,
        uint256 megachadAmount,
        uint256 megagoonerBurned,
        uint256 week
    );
    event TopBurnersUpdated(uint256 indexed week, address[3] top3, uint256[3] amounts);

    constructor(
        address _megachad,
        address _megagooner,
        address _nft,
        address _trenFund
    ) {
        require(_megachad != address(0), "zero megachad");
        require(_megagooner != address(0), "zero megagooner");
        require(_nft != address(0), "zero nft");
        require(_trenFund != address(0), "zero tren fund");

        megachad = IERC20(_megachad);
        megagooner = ERC20Burnable(_megagooner);
        nft = IERC721(_nft);
        trenFund = _trenFund;
        genesisTimestamp = block.timestamp;
    }

    /// @notice Send MEGACHAD to Tren Fund and burn MEGAGOONER at 1:4 ratio
    /// @param megachadAmount Amount of MEGACHAD to send (must be approved)
    function sendMegachad(uint256 megachadAmount) external {
        require(megachadAmount > 0, "zero amount");
        require(nft.balanceOf(msg.sender) >= 1, "need 1+ Looksmaxxed NFT");

        uint256 megagoonerToBurn = megachadAmount / MEGAGOONER_RATIO;
        require(megagoonerToBurn > 0, "amount too small");

        // Transfer MEGACHAD to Tren Fund
        require(megachad.transferFrom(msg.sender, trenFund, megachadAmount), "MEGACHAD transfer failed");

        // Burn MEGAGOONER from sender (sender must have approved this contract)
        megagooner.burnFrom(msg.sender, megagoonerToBurn);

        // Update tracking
        uint256 week = getCurrentWeek();

        weeklyUserSent[week][msg.sender] += megachadAmount;
        totalUserSent[msg.sender] += megachadAmount;
        totalSentAllTime += megachadAmount;
        totalMegagoonerBurned += megagoonerToBurn;

        WeekData storage wd = weekData[week];
        wd.totalSent += megachadAmount;

        if (!countedSender[week][msg.sender]) {
            countedSender[week][msg.sender] = true;
            wd.uniqueSenders++;
        }

        // Update top 3
        _updateTop3(week, msg.sender);

        emit MegachadSent(msg.sender, megachadAmount, megagoonerToBurn, week);
    }

    /// @notice Get current week number (0-indexed from genesis)
    function getCurrentWeek() public view returns (uint256) {
        return (block.timestamp - genesisTimestamp) / WEEK_DURATION;
    }

    /// @notice Get time remaining in current week (seconds)
    function getTimeRemaining() external view returns (uint256) {
        uint256 week = getCurrentWeek();
        uint256 weekEnd = genesisTimestamp + (week + 1) * WEEK_DURATION;
        if (block.timestamp >= weekEnd) return 0;
        return weekEnd - block.timestamp;
    }

    /// @notice Get MEGACHAD and MEGAGOONER requirements for a given MEGACHAD amount
    function getBurnRequirements(uint256 megachadAmount) external pure returns (uint256 megagoonerNeeded) {
        megagoonerNeeded = megachadAmount / MEGAGOONER_RATIO;
    }

    /// @notice Check if account is in top 3 for a given week
    function canPropose(address account) external view returns (bool) {
        uint256 week = getCurrentWeek();
        // Check current and previous week (grace period)
        return _isTop3(week, account) || (week > 0 && _isTop3(week - 1, account));
    }

    /// @notice Get top 3 burners for a given week
    function getWeekTop3(uint256 week) external view returns (address[3] memory, uint256[3] memory) {
        WeekData storage wd = weekData[week];
        return (wd.top3, wd.top3Amounts);
    }

    /// @notice Get week stats
    function getWeekStats(uint256 week) external view returns (
        uint256 totalSent,
        uint256 uniqueSenders,
        uint256 timeRemaining
    ) {
        WeekData storage wd = weekData[week];
        totalSent = wd.totalSent;
        uniqueSenders = wd.uniqueSenders;

        uint256 weekEnd = genesisTimestamp + (week + 1) * WEEK_DURATION;
        timeRemaining = block.timestamp >= weekEnd ? 0 : weekEnd - block.timestamp;
    }

    function _isTop3(uint256 week, address account) internal view returns (bool) {
        WeekData storage wd = weekData[week];
        return wd.top3[0] == account || wd.top3[1] == account || wd.top3[2] == account;
    }

    function _updateTop3(uint256 week, address sender) internal {
        WeekData storage wd = weekData[week];
        uint256 userAmount = weeklyUserSent[week][sender];

        // Find if sender is already in top 3
        int8 existingIdx = -1;
        for (uint8 i = 0; i < 3; i++) {
            if (wd.top3[i] == sender) {
                existingIdx = int8(i);
                break;
            }
        }

        if (existingIdx >= 0) {
            // Update existing entry
            wd.top3Amounts[uint8(uint256(int256(existingIdx)))] = userAmount;
        } else if (userAmount > wd.top3Amounts[2]) {
            // Replace lowest in top 3
            wd.top3[2] = sender;
            wd.top3Amounts[2] = userAmount;
        } else {
            return; // Not in top 3, no change
        }

        // Sort top 3 (simple bubble sort for 3 elements)
        for (uint8 i = 0; i < 2; i++) {
            for (uint8 j = 0; j < 2 - i; j++) {
                if (wd.top3Amounts[j] < wd.top3Amounts[j + 1]) {
                    (wd.top3[j], wd.top3[j + 1]) = (wd.top3[j + 1], wd.top3[j]);
                    (wd.top3Amounts[j], wd.top3Amounts[j + 1]) = (wd.top3Amounts[j + 1], wd.top3Amounts[j]);
                }
            }
        }

        emit TopBurnersUpdated(week, wd.top3, wd.top3Amounts);
    }
}
