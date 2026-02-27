// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Named imports avoid interface name collisions (IMEGACHADNFTChecker etc. are
// defined in multiple source files; named imports keep them in their own namespaces)
import { MEGAGOONER }    from "../src/MEGAGOONER.sol";
import { Framemogger }   from "../src/Framemogger.sol";
import { MoggerStaking } from "../src/MoggerStaking.sol";
import { JESTERGOONER }  from "../src/JESTERGOONER.sol";
import { Jestermogger }  from "../src/Jestermogger.sol";
import { NFTVetoCouncil } from "../src/NFTVetoCouncil.sol";
import { CircuitBreaker } from "../src/CircuitBreaker.sol";

// ─────────────────────────────────────────────────────────────────
// MOCKS
// ─────────────────────────────────────────────────────────────────

contract MockERC20 is ERC20 {
    constructor(string memory n, string memory s) ERC20(n, s) {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

contract MockNFT {
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _owners;
    uint256 private _total;

    function mint(address to) external returns (uint256 id) {
        id = ++_total;
        _owners[id] = to;
        _balances[to]++;
    }

    function balanceOf(address owner) external view returns (uint256) { return _balances[owner]; }
    function ownerOf(uint256 id) external view returns (address) { return _owners[id]; }
    function totalSupply() external view returns (uint256) { return _total; }
}

contract MockCircuitBreaker {
    bool public isPaused;
    function setPaused(bool v) external { isPaused = v; }
}

contract MockFramemogger {
    mapping(address => bool) private _can;
    function allow(address a) external { _can[a] = true; }
    function deny(address a)  external { _can[a] = false; }
    function canPropose(address a) external view returns (bool) { return _can[a]; }
}

contract MockVetoCouncil {
    bool private _veto;
    function setVeto(bool v) external { _veto = v; }
    function canVeto(uint256) external view returns (bool) { return _veto; }
    function executeVeto(uint256) external {}
}

contract MockGovernance {
    mapping(uint256 => uint8) private _states;
    function setState(uint256 proposalId, uint8 s) external { _states[proposalId] = s; }
    function state(uint256 proposalId) external view returns (uint8) { return _states[proposalId]; }
}

// ─────────────────────────────────────────────────────────────────
// BASE HELPER
// ─────────────────────────────────────────────────────────────────

contract ProxyHelper is Test {
    function _proxy(address impl, bytes memory data) internal returns (address) {
        return address(new ERC1967Proxy(impl, data));
    }

    function _deployMEGAGOONER(
        address admin,
        address emissionCtrl,
        address governanceAddr
    ) internal returns (MEGAGOONER) {
        MEGAGOONER impl = new MEGAGOONER();
        bytes memory data = abi.encodeWithSelector(
            MEGAGOONER.initialize.selector,
            admin,
            emissionCtrl,
            governanceAddr
        );
        return MEGAGOONER(_proxy(address(impl), data));
    }
}

// ═════════════════════════════════════════════════════════════════
// FRAMEMOGGER TESTS
// ═════════════════════════════════════════════════════════════════

contract FramemoggerTest is ProxyHelper {
    MockERC20    megachad;
    MockNFT      nft;
    MEGAGOONER   megagooner;
    Framemogger  framemogger;

    address admin    = address(0x1);
    address treasury = address(0x2);
    address alice    = address(0x10);
    address bob      = address(0x11);
    address carol    = address(0x12);

    uint256 constant BURN_AMOUNT  = 1000 ether;
    uint256 constant GOONER_BURN  = 100 ether; // 1000 * 10% = 100

    function setUp() public {
        megachad   = new MockERC20("MEGACHAD", "MEGACHAD");
        nft        = new MockNFT();
        // admin acts as emission controller so it can mint
        megagooner = _deployMEGAGOONER(admin, admin, admin);

        Framemogger impl = new Framemogger();
        bytes memory data = abi.encodeWithSelector(
            Framemogger.initialize.selector,
            address(megachad),
            address(megagooner),
            address(nft),
            treasury,
            admin
        );
        framemogger = Framemogger(_proxy(address(impl), data));

        vm.prank(admin);
        megagooner.grantBurnerRole(address(framemogger));

        // Give everyone an NFT and tokens
        nft.mint(alice); nft.mint(bob); nft.mint(carol);
        megachad.mint(alice, 100_000 ether);
        megachad.mint(bob,   100_000 ether);
        megachad.mint(carol, 100_000 ether);

        vm.prank(admin); megagooner.mint(alice, 10_000 ether);
        vm.prank(admin); megagooner.mint(bob,   10_000 ether);
        vm.prank(admin); megagooner.mint(carol,  10_000 ether);

        vm.prank(alice); megachad.approve(address(framemogger), type(uint256).max);
        vm.prank(bob);   megachad.approve(address(framemogger), type(uint256).max);
        vm.prank(carol); megachad.approve(address(framemogger), type(uint256).max);
    }

    // ── Happy path ───────────────────────────────────────────────

    function testBurn_sendsMegachadToTreasury() public {
        uint256 before = megachad.balanceOf(treasury);
        vm.prank(alice);
        framemogger.burnMEGACHAD(BURN_AMOUNT);
        assertEq(megachad.balanceOf(treasury), before + BURN_AMOUNT);
    }

    function testBurn_burnsGoonerFromCaller_notContract() public {
        uint256 aliceBefore   = megagooner.balanceOf(alice);
        uint256 contractBefore = megagooner.balanceOf(address(framemogger));

        vm.prank(alice);
        framemogger.burnMEGACHAD(BURN_AMOUNT);

        // alice's MEGAGOONER decreases
        assertEq(megagooner.balanceOf(alice), aliceBefore - GOONER_BURN);
        // contract's balance untouched
        assertEq(megagooner.balanceOf(address(framemogger)), contractBefore);
    }

    function testBurn_updatesWeeklyBurns() public {
        vm.prank(alice);
        framemogger.burnMEGACHAD(BURN_AMOUNT);
        assertEq(framemogger.weeklyBurns(0, alice), BURN_AMOUNT);
    }

    // ── Leaderboard ──────────────────────────────────────────────

    function testLeaderboard_sortedDescending() public {
        vm.prank(alice); framemogger.burnMEGACHAD(3000 ether);
        vm.prank(bob);   framemogger.burnMEGACHAD(2000 ether);
        vm.prank(carol); framemogger.burnMEGACHAD(1000 ether);

        (address[3] memory top, uint256[3] memory amts) = framemogger.getCurrentTop3();
        assertEq(top[0], alice);  assertEq(amts[0], 3000 ether);
        assertEq(top[1], bob);    assertEq(amts[1], 2000 ether);
        assertEq(top[2], carol);  assertEq(amts[2], 1000 ether);
    }

    function testLeaderboard_cumulativeAcrossMultipleBurns() public {
        vm.prank(alice); framemogger.burnMEGACHAD(1000 ether);
        vm.prank(alice); framemogger.burnMEGACHAD(500 ether);

        (, uint256[3] memory amts) = framemogger.getCurrentTop3();
        assertEq(amts[0], 1500 ether);
    }

    function testLeaderboard_newEntrantDisplaceLowest() public {
        vm.prank(alice); framemogger.burnMEGACHAD(3000 ether);
        vm.prank(bob);   framemogger.burnMEGACHAD(2000 ether);
        vm.prank(carol); framemogger.burnMEGACHAD(1000 ether);

        // carol burns more and stays at correct rank
        vm.prank(carol); framemogger.burnMEGACHAD(1500 ether);

        (address[3] memory top, uint256[3] memory amts) = framemogger.getCurrentTop3();
        assertEq(top[0], alice);  assertEq(amts[0], 3000 ether);
        assertEq(top[1], carol);  assertEq(amts[1], 2500 ether);
        assertEq(top[2], bob);    assertEq(amts[2], 2000 ether);
    }

    // ── Week transitions ─────────────────────────────────────────

    function testWeekTransition_directJump_notOneAtATime() public {
        vm.prank(alice); framemogger.burnMEGACHAD(BURN_AMOUNT);
        assertEq(framemogger.currentWeek(), 0);

        // Skip 3 full weeks — the fix ensures we jump to 3, not 1
        vm.warp(block.timestamp + 21 days + 1);
        vm.prank(bob); framemogger.burnMEGACHAD(BURN_AMOUNT);

        assertEq(framemogger.currentWeek(), 3);
    }

    function testWeekTransition_newWeekStartsWithEmptyLeaderboard() public {
        vm.prank(alice); framemogger.burnMEGACHAD(BURN_AMOUNT);

        vm.warp(block.timestamp + 7 days + 1);
        vm.prank(bob); framemogger.burnMEGACHAD(BURN_AMOUNT);

        // Alice was top of week 0, not week 1
        assertFalse(framemogger.canPropose(alice));
        assertTrue(framemogger.canPropose(bob));
    }

    // ── canPropose ───────────────────────────────────────────────

    function testCanPropose_usesCurrentWeek_notStoredWeek() public {
        // Alice burns in week 0
        vm.prank(alice); framemogger.burnMEGACHAD(BURN_AMOUNT);
        assertTrue(framemogger.canPropose(alice));

        // Time advances to week 1 but no one calls burnMEGACHAD
        // stored currentWeek is still 0, but getCurrentWeek() == 1
        vm.warp(block.timestamp + 7 days + 1);

        // The fix: canPropose reads getCurrentWeek() → week 1 top3 is empty → false
        assertFalse(framemogger.canPropose(alice));
    }

    function testCanPropose_falseBeforeAnyBurn() public {
        assertFalse(framemogger.canPropose(alice));
    }

    function testCanPropose_trueForTop3() public {
        vm.prank(alice); framemogger.burnMEGACHAD(3000 ether);
        vm.prank(bob);   framemogger.burnMEGACHAD(2000 ether);
        vm.prank(carol); framemogger.burnMEGACHAD(1000 ether);

        assertTrue(framemogger.canPropose(alice));
        assertTrue(framemogger.canPropose(bob));
        assertTrue(framemogger.canPropose(carol));
    }

    // ── Reverts ──────────────────────────────────────────────────

    function testBurn_revertsWithoutNFT() public {
        address noNFT = address(0x99);
        megachad.mint(noNFT, 10_000 ether);
        vm.prank(noNFT); megachad.approve(address(framemogger), type(uint256).max);

        vm.prank(noNFT);
        vm.expectRevert(Framemogger.NoNFT.selector);
        framemogger.burnMEGACHAD(BURN_AMOUNT);
    }

    function testBurn_revertsZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(Framemogger.ZeroAmount.selector);
        framemogger.burnMEGACHAD(0);
    }

    // ── View functions ───────────────────────────────────────────

    function testGetCurrentWeekInfo_correctTimes() public {
        (uint256 week, uint256 start, uint256 end,,,,) = framemogger.getCurrentWeekInfo();
        assertEq(week, 0);
        assertEq(end - start, 7 days);
        assertGt(end, block.timestamp);
    }

    function testGetWeekStats_timeUntilEnd() public {
        (,, uint256 timeUntilEnd) = framemogger.getWeekStats(0);
        assertApproxEqAbs(timeUntilEnd, 7 days, 5);
    }
}

// ═════════════════════════════════════════════════════════════════
// MOGGERSTAKING TESTS
// ═════════════════════════════════════════════════════════════════

contract MoggerStakingTest is ProxyHelper {
    MockERC20    megachad;
    MockNFT      nft;
    MEGAGOONER   megagooner;
    MoggerStaking staking;

    address admin    = address(0x1);
    address treasury = address(0x2);
    address emCtrl   = address(0x3);
    address alice    = address(0x10);
    address bob      = address(0x11);

    function setUp() public {
        megachad   = new MockERC20("MEGACHAD", "MEGACHAD");
        nft        = new MockNFT();
        megagooner = _deployMEGAGOONER(admin, emCtrl, admin);

        MoggerStaking impl = new MoggerStaking();
        bytes memory data = abi.encodeWithSelector(
            MoggerStaking.initialize.selector,
            address(megachad),
            address(megagooner),
            address(nft),
            emCtrl,
            treasury,
            admin
        );
        staking = MoggerStaking(_proxy(address(impl), data));

        nft.mint(alice); nft.mint(bob);
        megachad.mint(alice, 10_000 ether);
        megachad.mint(bob,   10_000 ether);
        vm.prank(alice); megachad.approve(address(staking), type(uint256).max);
        vm.prank(bob);   megachad.approve(address(staking), type(uint256).max);
    }

    // ── Staking ──────────────────────────────────────────────────

    function testStake_updatesState() public {
        vm.prank(alice);
        staking.stake(1000 ether);

        assertEq(staking.totalStaked(), 1000 ether);
        (uint256 amount,,) = staking.stakers(alice);
        assertEq(amount, 1000 ether);
    }

    function testStake_revertsWithoutNFT() public {
        address noNFT = address(0x99);
        megachad.mint(noNFT, 1000 ether);
        vm.prank(noNFT); megachad.approve(address(staking), type(uint256).max);

        vm.prank(noNFT);
        vm.expectRevert(MoggerStaking.NoNFT.selector);
        staking.stake(1000 ether);
    }

    function testStake_revertsForTreasury() public {
        nft.mint(treasury);
        megachad.mint(treasury, 1000 ether);
        vm.prank(treasury); megachad.approve(address(staking), type(uint256).max);

        vm.prank(treasury);
        vm.expectRevert(MoggerStaking.TreasuryBlacklisted.selector);
        staking.stake(1000 ether);
    }

    // ── Unstaking ────────────────────────────────────────────────

    function testUnstake_returnsTokens() public {
        vm.prank(alice); staking.stake(1000 ether);
        vm.prank(alice); staking.unstake(1000 ether);

        assertEq(staking.totalStaked(), 0);
        assertEq(megachad.balanceOf(alice), 10_000 ether);
    }

    function testUnstake_revertsInsufficientStake() public {
        vm.prank(alice); staking.stake(1000 ether);

        vm.prank(alice);
        vm.expectRevert(MoggerStaking.InsufficientStake.selector);
        staking.unstake(2000 ether);
    }

    // ── Reward accounting ────────────────────────────────────────

    function testNotifyRewardAmount_updatesAccumulator() public {
        vm.prank(alice); staking.stake(1000 ether);

        vm.prank(emCtrl); megagooner.mint(address(staking), 100 ether);
        vm.prank(emCtrl); staking.notifyRewardAmount(100 ether);

        // rewardPerTokenStored = 100e18 * 1e18 / 1000e18 = 1e17
        assertEq(staking.rewardPerTokenStored(), (100 ether * 1e18) / 1000 ether);
    }

    function testNotifyRewardAmount_onlyEmissionController() public {
        vm.prank(alice); staking.stake(1000 ether);

        vm.prank(alice);
        vm.expectRevert("Only EmissionController");
        staking.notifyRewardAmount(100 ether);
    }

    function testNotifyRewardAmount_noStakers_doesNotRevert() public {
        // reward with no stakers: rewardPerTokenStored stays 0
        vm.prank(emCtrl); staking.notifyRewardAmount(100 ether);
        assertEq(staking.rewardPerTokenStored(), 0);
    }

    function testRewards_proportionalToStake() public {
        // alice: 3000, bob: 1000 → 75% / 25%
        vm.prank(alice); staking.stake(3000 ether);
        vm.prank(bob);   staking.stake(1000 ether);

        vm.prank(emCtrl); megagooner.mint(address(staking), 400 ether);
        vm.prank(emCtrl); staking.notifyRewardAmount(400 ether);

        // Both have tier1 NFT multiplier (1.0x), so proportional
        assertApproxEqAbs(staking.earned(alice), 300 ether, 1e10);
        assertApproxEqAbs(staking.earned(bob),   100 ether, 1e10);
    }

    function testRewards_nftMultiplierTier3() public {
        // Give alice 25 NFTs (already has 1, mint 24 more)
        for (uint256 i = 0; i < 24; i++) { nft.mint(alice); }

        vm.prank(alice); staking.stake(1000 ether);

        vm.prank(emCtrl); megagooner.mint(address(staking), 100 ether);
        vm.prank(emCtrl); staking.notifyRewardAmount(100 ether);

        // base = 100 ether, tier3 multiplier = 1.15x → 115 ether
        assertApproxEqAbs(staking.earned(alice), 115 ether, 1e10);
    }

    function testRewards_nftMultiplierTier2() public {
        // Give alice 10 NFTs total (1 + 9 more)
        for (uint256 i = 0; i < 9; i++) { nft.mint(alice); }

        vm.prank(alice); staking.stake(1000 ether);

        vm.prank(emCtrl); megagooner.mint(address(staking), 100 ether);
        vm.prank(emCtrl); staking.notifyRewardAmount(100 ether);

        // tier2 multiplier = 1.075x → 107.5 ether
        assertApproxEqAbs(staking.earned(alice), 107.5 ether, 1e10);
    }

    function testClaimRewards_transfersAndClears() public {
        vm.prank(alice); staking.stake(1000 ether);

        vm.prank(emCtrl); megagooner.mint(address(staking), 100 ether);
        vm.prank(emCtrl); staking.notifyRewardAmount(100 ether);

        uint256 before = megagooner.balanceOf(alice);
        vm.prank(alice); staking.claimRewards();

        assertGt(megagooner.balanceOf(alice), before);
        assertApproxEqAbs(staking.earned(alice), 0, 1e10);
    }

    function testRewards_accumulateAcrossMultipleDistributions() public {
        vm.prank(alice); staking.stake(1000 ether);

        // First distribution
        vm.prank(emCtrl); megagooner.mint(address(staking), 100 ether);
        vm.prank(emCtrl); staking.notifyRewardAmount(100 ether);

        // Second distribution
        vm.prank(emCtrl); megagooner.mint(address(staking), 100 ether);
        vm.prank(emCtrl); staking.notifyRewardAmount(100 ether);

        // Should have earned rewards from both distributions
        assertApproxEqAbs(staking.earned(alice), 200 ether, 1e10);
    }

    function testRewards_newStakerDoesNotBackfill() public {
        vm.prank(alice); staking.stake(1000 ether);

        vm.prank(emCtrl); megagooner.mint(address(staking), 100 ether);
        vm.prank(emCtrl); staking.notifyRewardAmount(100 ether);

        // bob stakes AFTER the distribution
        vm.prank(bob); staking.stake(1000 ether);

        // bob should have earned 0 (not entitled to past rewards)
        assertEq(staking.earned(bob), 0);
    }
}

// ═════════════════════════════════════════════════════════════════
// JESTERGOONER TESTS
// ═════════════════════════════════════════════════════════════════

contract JESTERGOONERTest is ProxyHelper {
    MockERC20  lpToken;
    MockNFT    nft;
    MEGAGOONER megagooner;
    JESTERGOONER jester;

    address admin  = address(0x1);
    address emCtrl = address(0x3);
    address alice  = address(0x10);
    address bob    = address(0x11);

    uint256 constant MIN_LOCK = 4 weeks;

    function setUp() public {
        lpToken    = new MockERC20("LP", "LP");
        nft        = new MockNFT();
        megagooner = _deployMEGAGOONER(admin, emCtrl, admin);

        JESTERGOONER impl = new JESTERGOONER();
        bytes memory data = abi.encodeWithSelector(
            JESTERGOONER.initialize.selector,
            address(lpToken),
            address(megagooner),
            address(nft),
            emCtrl,
            admin
        );
        jester = JESTERGOONER(_proxy(address(impl), data));

        nft.mint(alice); nft.mint(bob);
        lpToken.mint(alice, 10_000 ether);
        lpToken.mint(bob,   10_000 ether);
        vm.prank(alice); lpToken.approve(address(jester), type(uint256).max);
        vm.prank(bob);   lpToken.approve(address(jester), type(uint256).max);
    }

    // ── Lock timestamp ───────────────────────────────────────────

    function testStake_setsTimestampOnFirstStake() public {
        vm.prank(alice); jester.stake(1000 ether);
        (, uint256 ts,,) = jester.stakers(alice);
        assertEq(ts, block.timestamp);
    }

    function testStake_additionalStakePreservesTimestamp() public {
        vm.prank(alice); jester.stake(500 ether);
        (, uint256 tsBefore,,) = jester.stakers(alice);

        vm.warp(block.timestamp + 1 days);
        vm.prank(alice); jester.stake(500 ether);
        (, uint256 tsAfter,,) = jester.stakers(alice);

        // The fix: second stake must NOT reset the lock timer
        assertEq(tsAfter, tsBefore);
    }

    function testStake_lockNotReset_canUnstakeAfterOriginalPeriod() public {
        // Stake at t=0
        vm.prank(alice); jester.stake(500 ether);

        // Add more at t=3 weeks (almost done)
        vm.warp(block.timestamp + 21 days);
        vm.prank(alice); jester.stake(500 ether);

        // At t=4 weeks + 1s (from original stake), should be unlocked
        vm.warp(block.timestamp + 7 days + 1);
        vm.prank(alice); jester.unstake(1000 ether);
        assertEq(lpToken.balanceOf(alice), 10_000 ether);
    }

    // ── Lock enforcement ─────────────────────────────────────────

    function testUnstake_beforeLock_reverts() public {
        vm.prank(alice); jester.stake(1000 ether);
        vm.warp(block.timestamp + 20 days); // < 4 weeks

        vm.prank(alice);
        vm.expectRevert(JESTERGOONER.StillLocked.selector);
        jester.unstake(1000 ether);
    }

    function testUnstake_afterLock_succeeds() public {
        vm.prank(alice); jester.stake(1000 ether);
        vm.warp(block.timestamp + MIN_LOCK + 1);

        vm.prank(alice); jester.unstake(1000 ether);
        assertEq(lpToken.balanceOf(alice), 10_000 ether);
    }

    function testCanUnstake_falseBeforeLock_trueAfter() public {
        vm.prank(alice); jester.stake(1000 ether);
        assertFalse(jester.canUnstake(alice));

        vm.warp(block.timestamp + MIN_LOCK + 1);
        assertTrue(jester.canUnstake(alice));
    }

    // ── Time multiplier ──────────────────────────────────────────

    function testTimeMultiplier_50PercentAtStakeTime() public {
        vm.prank(alice); jester.stake(1000 ether);
        assertEq(jester.getTimeMultiplier(alice), 5000); // 50%
    }

    function testTimeMultiplier_100PercentAfter4Weeks() public {
        vm.prank(alice); jester.stake(1000 ether);
        vm.warp(block.timestamp + MIN_LOCK);
        assertEq(jester.getTimeMultiplier(alice), 10000); // 100%
    }

    function testTimeMultiplier_linearInterpolation() public {
        vm.prank(alice); jester.stake(1000 ether);
        vm.warp(block.timestamp + 2 weeks); // halfway through lock
        uint256 mult = jester.getTimeMultiplier(alice);
        // Expected: 5000 + (14 * 86400 * 5000 / (28 * 86400)) = 5000 + 2500 = 7500
        assertApproxEqAbs(mult, 7500, 10);
    }

    // ── Reward accounting ────────────────────────────────────────

    function testNotifyRewardAmount_updatesAccumulator() public {
        vm.prank(alice); jester.stake(1000 ether);

        vm.prank(emCtrl); megagooner.mint(address(jester), 100 ether);
        vm.prank(emCtrl); jester.notifyRewardAmount(100 ether);

        assertEq(jester.rewardPerTokenStored(), (100 ether * 1e18) / 1000 ether);
    }

    function testNotifyRewardAmount_onlyEmissionController() public {
        vm.prank(alice); jester.stake(1000 ether);

        vm.prank(alice);
        vm.expectRevert("Only EmissionController");
        jester.notifyRewardAmount(100 ether);
    }

    function testEarned_appliesTimeAndNFTMultiplier() public {
        vm.prank(alice); jester.stake(1000 ether);
        // At t=0: timeMultiplier=5000 (50%), nftMultiplier=10000 (1.0x, tier1)

        vm.prank(emCtrl); megagooner.mint(address(jester), 100 ether);
        vm.prank(emCtrl); jester.notifyRewardAmount(100 ether);

        // boosted = 100e18 * 10000 * 5000 / (10000 * 10000) = 50 ether
        assertApproxEqAbs(jester.earned(alice), 50 ether, 1e10);
    }

    function testEarned_fullMultiplierAfterLock() public {
        vm.prank(alice); jester.stake(1000 ether);
        vm.warp(block.timestamp + MIN_LOCK); // timeMultiplier = 10000

        vm.prank(emCtrl); megagooner.mint(address(jester), 100 ether);
        vm.prank(emCtrl); jester.notifyRewardAmount(100 ether);

        // boosted = 100e18 * 10000 * 10000 / (10000 * 10000) = 100 ether
        assertApproxEqAbs(jester.earned(alice), 100 ether, 1e10);
    }

    function testClaimRewards_works() public {
        vm.prank(alice); jester.stake(1000 ether);

        vm.prank(emCtrl); megagooner.mint(address(jester), 100 ether);
        vm.prank(emCtrl); jester.notifyRewardAmount(100 ether);

        uint256 before = megagooner.balanceOf(alice);
        vm.prank(alice); jester.claimRewards();

        assertGt(megagooner.balanceOf(alice), before);
    }
}

// ═════════════════════════════════════════════════════════════════
// JESTERMOGGER TESTS
// ═════════════════════════════════════════════════════════════════

contract JestermoggerTest is ProxyHelper {
    MEGAGOONER       megagooner;
    MockCircuitBreaker circuitBreaker;
    MockFramemogger  framemogger;
    MockVetoCouncil  vetoCouncil;
    Jestermogger     governance;

    address admin    = address(0x1);
    address proposer = address(0x10);
    address voter1   = address(0x11);
    address voter2   = address(0x12);

    function setUp() public {
        circuitBreaker = new MockCircuitBreaker();
        framemogger    = new MockFramemogger();
        vetoCouncil    = new MockVetoCouncil();

        // admin is both emission controller (for minting) and governance
        megagooner = _deployMEGAGOONER(admin, admin, admin);

        Jestermogger impl = new Jestermogger();
        bytes memory data = abi.encodeWithSelector(
            Jestermogger.initialize.selector,
            address(megagooner),
            address(vetoCouncil),
            address(circuitBreaker),
            address(framemogger),
            admin
        );
        governance = Jestermogger(payable(_proxy(address(impl), data)));

        // Grant SNAPSHOT_ROLE to governance contract.
        // NOTE: vm.prank(admin) is consumed by the first external call.
        // Cache the role constant first so grantRole() is the pranked call.
        bytes32 snapshotRole = megagooner.SNAPSHOT_ROLE();
        vm.startPrank(admin);
        megagooner.grantRole(snapshotRole, address(governance));

        // Mint supply: voter1 has 100 ether, voter2 has 10 ether → total 110
        // Quorum = 50% × 110 = 55 ether
        megagooner.mint(voter1, 100 ether);
        megagooner.mint(voter2, 10 ether);
        vm.stopPrank();

        framemogger.allow(proposer);
    }

    // Helper: create a minimal valid proposal
    function _propose() internal returns (uint256 id) {
        address[] memory targets = new address[](1);
        uint256[] memory values  = new uint256[](1);
        bytes[]   memory calls   = new bytes[](1);
        targets[0] = address(0x1234);

        vm.prank(proposer);
        id = governance.propose(targets, values, calls, "test");
    }

    // ── Proposal creation ────────────────────────────────────────

    function testPropose_top3CanPropose() public {
        uint256 id = _propose();
        assertEq(id, 1);
    }

    function testPropose_nonTop3Reverts() public {
        address[] memory targets = new address[](1);
        uint256[] memory values  = new uint256[](1);
        bytes[]   memory calls   = new bytes[](1);
        targets[0] = address(0x1234);

        vm.prank(voter1); // not allowed in framemogger
        vm.expectRevert(Jestermogger.NotAuthorizedProposer.selector);
        governance.propose(targets, values, calls, "test");
    }

    function testPropose_emptyTargetsReverts() public {
        address[] memory targets = new address[](0);
        uint256[] memory values  = new uint256[](0);
        bytes[]   memory calls   = new bytes[](0);

        vm.prank(proposer);
        vm.expectRevert(Jestermogger.InvalidProposal.selector);
        governance.propose(targets, values, calls, "test");
    }

    // ── Voting period is timestamp-based ─────────────────────────

    function testVotingPeriod_isThreeDaysTimestamp() public {
        uint256 id = _propose();
        (,,,,, uint256 startTime, uint256 endTime,,,,) = governance.getProposal(id);
        assertEq(endTime - startTime, 3 days);
    }

    function testState_activeDuringVotingPeriod() public {
        uint256 id = _propose();
        assertEq(uint8(governance.state(id)), uint8(Jestermogger.ProposalState.Active));
    }

    // ── Voting ───────────────────────────────────────────────────

    function testCastVote_forVote() public {
        uint256 id = _propose();
        vm.prank(voter1); governance.castVote(id, 1);

        (,, uint256 forVotes,,,,,,,, ) = governance.getProposal(id);
        assertEq(forVotes, 100 ether);
    }

    function testCastVote_againstVote() public {
        uint256 id = _propose();
        vm.prank(voter1); governance.castVote(id, 0);

        (,,, uint256 againstVotes,,,,,,, ) = governance.getProposal(id);
        assertEq(againstVotes, 100 ether);
    }

    function testCastVote_doubleVoteReverts() public {
        uint256 id = _propose();
        vm.prank(voter1); governance.castVote(id, 1);

        vm.prank(voter1);
        vm.expectRevert(Jestermogger.AlreadyVoted.selector);
        governance.castVote(id, 0);
    }

    function testCastVote_afterPeriodReverts() public {
        uint256 id = _propose();
        vm.warp(block.timestamp + 3 days + 1);

        vm.prank(voter1);
        vm.expectRevert(Jestermogger.VotingPeriodEnded.selector);
        governance.castVote(id, 1);
    }

    function testCastVote_noTokensReverts() public {
        uint256 id = _propose();
        address noTokens = address(0x999);

        vm.prank(noTokens);
        vm.expectRevert(Jestermogger.InsufficientBalance.selector);
        governance.castVote(id, 1);
    }

    // ── Proposal state machine ───────────────────────────────────

    function testState_succeededAfterQuorumMet() public {
        uint256 id = _propose();
        // voter1 has 100 ether, quorum = 55 ether → met
        vm.prank(voter1); governance.castVote(id, 1);
        vm.warp(block.timestamp + 3 days + 1);

        assertEq(uint8(governance.state(id)), uint8(Jestermogger.ProposalState.Succeeded));
    }

    function testState_defeatedWhenQuorumNotMet() public {
        uint256 id = _propose();
        // voter2 has only 10 ether, quorum = 55 ether → not met
        vm.prank(voter2); governance.castVote(id, 1);
        vm.warp(block.timestamp + 3 days + 1);

        assertEq(uint8(governance.state(id)), uint8(Jestermogger.ProposalState.Defeated));
    }

    function testState_defeatedWhenMajorityAgainst() public {
        uint256 id = _propose();
        // voter1 votes against: quorum met (100 > 55), but majority is against
        vm.prank(voter1); governance.castVote(id, 0);
        vm.warp(block.timestamp + 3 days + 1);

        assertEq(uint8(governance.state(id)), uint8(Jestermogger.ProposalState.Defeated));
    }

    function testQueue_afterSucceeded() public {
        uint256 id = _propose();
        vm.prank(voter1); governance.castVote(id, 1);
        vm.warp(block.timestamp + 3 days + 1);

        governance.queue(id);
        assertEq(uint8(governance.state(id)), uint8(Jestermogger.ProposalState.Queued));
    }

    function testQueue_beforeSucceededReverts() public {
        uint256 id = _propose();
        vm.expectRevert(Jestermogger.ProposalNotSucceeded.selector);
        governance.queue(id);
    }

    function testExecute_afterTimelock() public {
        uint256 id = _propose();
        vm.prank(voter1); governance.castVote(id, 1);
        vm.warp(block.timestamp + 3 days + 1);

        governance.queue(id);
        vm.warp(block.timestamp + 2 days + 1); // past timelock

        // Target is address(0x1234) with empty calldata — call to EOA succeeds
        governance.execute(id);
        (,,,,,,,, bool executed,,) = governance.getProposal(id);
        assertTrue(executed);
    }

    function testExecute_beforeTimelockReverts() public {
        uint256 id = _propose();
        vm.prank(voter1); governance.castVote(id, 1);
        vm.warp(block.timestamp + 3 days + 1);

        governance.queue(id);
        // Do NOT warp past timelock
        vm.expectRevert(Jestermogger.TimelockNotMet.selector);
        governance.execute(id);
    }

    // ── Circuit breaker integration ──────────────────────────────

    function testCircuitBreaker_pausesPropose() public {
        circuitBreaker.setPaused(true);

        address[] memory targets = new address[](1);
        uint256[] memory values  = new uint256[](1);
        bytes[]   memory calls   = new bytes[](1);
        targets[0] = address(0x1234);

        vm.prank(proposer);
        vm.expectRevert(Jestermogger.GovernancePaused.selector);
        governance.propose(targets, values, calls, "test");
    }

    function testCircuitBreaker_pausesCastVote() public {
        uint256 id = _propose();
        circuitBreaker.setPaused(true);

        vm.prank(voter1);
        vm.expectRevert(Jestermogger.GovernancePaused.selector);
        governance.castVote(id, 1);
    }

    // ── Quorum uses snapshot supply ──────────────────────────────

    function testQuorum_basedOnSnapshotSupply_notMaxSupply() public {
        // With only 110 ether total supply, voter1's 100 ether exceeds 50% quorum
        // (Old code required 25M votes — this would always be Defeated)
        uint256 id = _propose();
        vm.prank(voter1); governance.castVote(id, 1);
        vm.warp(block.timestamp + 3 days + 1);

        // Should succeed with snapshot-based quorum
        assertEq(uint8(governance.state(id)), uint8(Jestermogger.ProposalState.Succeeded));
    }
}

// ═════════════════════════════════════════════════════════════════
// NFTVETOCOUNCIL TESTS
// ═════════════════════════════════════════════════════════════════

contract NFTVetoCouncilTest is ProxyHelper {
    MockNFT        nft;
    MockGovernance gov;
    NFTVetoCouncil council;

    address admin = address(0x1);

    address[20] holders;

    function setUp() public {
        nft = new MockNFT();
        gov = new MockGovernance();

        NFTVetoCouncil impl = new NFTVetoCouncil();
        bytes memory data = abi.encodeWithSelector(
            NFTVetoCouncil.initialize.selector,
            address(nft),
            address(gov),
            admin
        );
        council = NFTVetoCouncil(_proxy(address(impl), data));

        // Mint 1 NFT each to 20 different addresses
        for (uint256 i = 0; i < 20; i++) {
            holders[i] = address(uint160(0x200 + i));
            nft.mint(holders[i]);
        }
    }

    // ── Council membership ───────────────────────────────────────

    function testUpdateCouncil_setsTop20Holders() public {
        council.updateCouncil();
        for (uint256 i = 0; i < 20; i++) {
            assertTrue(council.checkCouncilMembership(holders[i]));
        }
    }

    function testUpdateCouncil_nonMemberNotInCouncil() public {
        council.updateCouncil();
        assertFalse(council.checkCouncilMembership(address(0x999)));
    }

    function testUpdateCouncil_ranksByNFTBalance() public {
        // Give holders[0] a second NFT — should still be in council
        nft.mint(holders[0]);
        council.updateCouncil();
        assertTrue(council.checkCouncilMembership(holders[0]));
    }

    // ── Veto voting ──────────────────────────────────────────────

    function testStartVetoVote_anyoneCanStart() public {
        gov.setState(1, 4); // Queued state
        council.startVetoVote(1); // called from address(this) which is not a council member
        (uint256 startTime,,,,,, ) = council.getVetoVote(1);
        assertEq(startTime, block.timestamp);
    }

    function testCastVetoVote_councilMemberCanVote() public {
        council.updateCouncil();
        gov.setState(1, 4);
        council.startVetoVote(1);

        vm.prank(holders[0]);
        council.castVetoVote(1, true);

        assertTrue(council.hasVotedOnVeto(1, holders[0]));
        (, , uint256 yesVotes,,,,) = council.getVetoVote(1);
        assertEq(yesVotes, 1);
    }

    function testCastVetoVote_nonMemberReverts() public {
        council.updateCouncil();
        gov.setState(1, 4);
        council.startVetoVote(1);

        vm.prank(address(0x999));
        vm.expectRevert(NFTVetoCouncil.NotCouncilMember.selector);
        council.castVetoVote(1, true);
    }

    function testCastVetoVote_doubleVoteReverts() public {
        council.updateCouncil();
        gov.setState(1, 4);
        council.startVetoVote(1);

        vm.prank(holders[0]); council.castVetoVote(1, true);

        vm.prank(holders[0]);
        vm.expectRevert(NFTVetoCouncil.AlreadyVoted.selector);
        council.castVetoVote(1, true);
    }

    function testCastVetoVote_afterWindowReverts() public {
        council.updateCouncil();
        gov.setState(1, 4);
        council.startVetoVote(1);

        vm.warp(block.timestamp + 2 days + 1);

        vm.prank(holders[0]);
        vm.expectRevert(NFTVetoCouncil.VetoWindowExpired.selector);
        council.castVetoVote(1, true);
    }

    // ── canVeto ──────────────────────────────────────────────────

    function testCanVeto_falseWithInsufficientVotes() public {
        council.updateCouncil();
        gov.setState(1, 4);
        council.startVetoVote(1);

        for (uint256 i = 0; i < 10; i++) {
            vm.prank(holders[i]); council.castVetoVote(1, true);
        }
        assertFalse(council.canVeto(1)); // only 10, need 11
    }

    function testCanVeto_trueAfter11Votes() public {
        council.updateCouncil();
        gov.setState(1, 4);
        council.startVetoVote(1);

        for (uint256 i = 0; i < 11; i++) {
            vm.prank(holders[i]); council.castVetoVote(1, true);
        }
        assertTrue(council.canVeto(1));
    }

    function testCanVeto_falseAfterWindowExpires() public {
        council.updateCouncil();
        gov.setState(1, 4);
        council.startVetoVote(1);

        for (uint256 i = 0; i < 11; i++) {
            vm.prank(holders[i]); council.castVetoVote(1, true);
        }

        vm.warp(block.timestamp + 2 days + 1);
        assertFalse(council.canVeto(1)); // window expired
    }

    function testCanVeto_falseWithNoVoteStarted() public {
        assertFalse(council.canVeto(99));
    }

    // ── executeVeto access control ───────────────────────────────

    function testExecuteVeto_nonGovernanceReverts() public {
        council.updateCouncil();
        gov.setState(1, 4);
        council.startVetoVote(1);

        vm.prank(address(0x999));
        vm.expectRevert("NFTVetoCouncil: unauthorized");
        council.executeVeto(1);
    }

    function testExecuteVeto_thresholdNotMetReverts() public {
        council.updateCouncil();
        gov.setState(1, 4);
        council.startVetoVote(1);

        // Only 5 yes votes — below threshold
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(holders[i]); council.castVetoVote(1, true);
        }

        vm.prank(address(gov));
        vm.expectRevert(NFTVetoCouncil.VetoThresholdNotMet.selector);
        council.executeVeto(1);
    }
}

// ═════════════════════════════════════════════════════════════════
// CIRCUITBREAKER TESTS
// ═════════════════════════════════════════════════════════════════

contract CircuitBreakerTest is ProxyHelper {
    CircuitBreaker cb;

    address admin = address(0x1);
    address[5] guardians;

    function setUp() public {
        for (uint256 i = 0; i < 5; i++) {
            guardians[i] = address(uint160(0x100 + i));
        }

        CircuitBreaker impl = new CircuitBreaker();
        bytes memory data = abi.encodeWithSelector(
            CircuitBreaker.initialize.selector,
            guardians,
            admin
        );
        cb = CircuitBreaker(_proxy(address(impl), data));
    }

    // ── Pause voting ─────────────────────────────────────────────

    function testVotePause_nonGuardianReverts() public {
        vm.prank(address(0x999));
        vm.expectRevert(CircuitBreaker.NotGuardian.selector);
        cb.votePause(true);
    }

    function testVotePause_2VotesNotEnough() public {
        vm.prank(guardians[0]); cb.votePause(true);
        vm.prank(guardians[1]); cb.votePause(true);
        assertFalse(cb.isPaused());
    }

    function testVotePause_3VotesTriggersPause() public {
        vm.prank(guardians[0]); cb.votePause(true);
        vm.prank(guardians[1]); cb.votePause(true);
        vm.prank(guardians[2]); cb.votePause(true);
        assertTrue(cb.isPaused());
        assertEq(cb.pauseTimestamp(), block.timestamp);
    }

    function testVotePause_doubleVoteReverts() public {
        vm.prank(guardians[0]); cb.votePause(true);

        vm.prank(guardians[0]);
        vm.expectRevert(CircuitBreaker.AlreadyVoted.selector);
        cb.votePause(true);
    }

    function testVotePause_whilePausedReverts() public {
        vm.prank(guardians[0]); cb.votePause(true);
        vm.prank(guardians[1]); cb.votePause(true);
        vm.prank(guardians[2]); cb.votePause(true);

        vm.prank(guardians[3]);
        vm.expectRevert(CircuitBreaker.AlreadyPaused.selector);
        cb.votePause(true);
    }

    // ── Unpause voting ───────────────────────────────────────────

    function testVoteUnpause_notPausedReverts() public {
        vm.prank(guardians[0]);
        vm.expectRevert(CircuitBreaker.NotPaused.selector);
        cb.voteUnpause(true);
    }

    function testVoteUnpause_3VotesNotEnough() public {
        vm.prank(guardians[0]); cb.votePause(true);
        vm.prank(guardians[1]); cb.votePause(true);
        vm.prank(guardians[2]); cb.votePause(true);

        vm.prank(guardians[0]); cb.voteUnpause(true);
        vm.prank(guardians[1]); cb.voteUnpause(true);
        vm.prank(guardians[2]); cb.voteUnpause(true);

        assertTrue(cb.isPaused()); // only 3/4, still paused
    }

    function testVoteUnpause_4VotesUnpauses() public {
        vm.prank(guardians[0]); cb.votePause(true);
        vm.prank(guardians[1]); cb.votePause(true);
        vm.prank(guardians[2]); cb.votePause(true);

        vm.prank(guardians[0]); cb.voteUnpause(true);
        vm.prank(guardians[1]); cb.voteUnpause(true);
        vm.prank(guardians[2]); cb.voteUnpause(true);
        vm.prank(guardians[3]); cb.voteUnpause(true);

        assertFalse(cb.isPaused());
    }

    function testVoteUnpause_doubleVoteReverts() public {
        vm.prank(guardians[0]); cb.votePause(true);
        vm.prank(guardians[1]); cb.votePause(true);
        vm.prank(guardians[2]); cb.votePause(true);

        vm.prank(guardians[0]); cb.voteUnpause(true);

        vm.prank(guardians[0]);
        vm.expectRevert(CircuitBreaker.AlreadyVoted.selector);
        cb.voteUnpause(true);
    }

    // ── Auto-unpause ─────────────────────────────────────────────

    function testAutoUnpause_before7Days_reverts() public {
        vm.prank(guardians[0]); cb.votePause(true);
        vm.prank(guardians[1]); cb.votePause(true);
        vm.prank(guardians[2]); cb.votePause(true);

        vm.warp(block.timestamp + 6 days);
        vm.expectRevert(CircuitBreaker.ThresholdNotMet.selector);
        cb.autoUnpause();
    }

    function testAutoUnpause_after7Days_succeeds() public {
        vm.prank(guardians[0]); cb.votePause(true);
        vm.prank(guardians[1]); cb.votePause(true);
        vm.prank(guardians[2]); cb.votePause(true);

        vm.warp(block.timestamp + 7 days + 1);
        cb.autoUnpause();
        assertFalse(cb.isPaused());
    }

    function testAutoUnpause_whenNotPaused_reverts() public {
        vm.expectRevert(CircuitBreaker.NotPaused.selector);
        cb.autoUnpause();
    }

    // ── Emergency unpause ────────────────────────────────────────

    function testEmergencyUnpause_adminCanUnpause() public {
        vm.prank(guardians[0]); cb.votePause(true);
        vm.prank(guardians[1]); cb.votePause(true);
        vm.prank(guardians[2]); cb.votePause(true);

        vm.prank(admin); cb.emergencyUnpause();
        assertFalse(cb.isPaused());
    }

    function testEmergencyUnpause_nonAdminReverts() public {
        vm.prank(guardians[0]); cb.votePause(true);
        vm.prank(guardians[1]); cb.votePause(true);
        vm.prank(guardians[2]); cb.votePause(true);

        vm.prank(address(0x999));
        vm.expectRevert();
        cb.emergencyUnpause();
    }

    // ── State reset ──────────────────────────────────────────────

    function testStateResets_canPauseAgainAfterUnpause() public {
        // First pause cycle
        vm.prank(guardians[0]); cb.votePause(true);
        vm.prank(guardians[1]); cb.votePause(true);
        vm.prank(guardians[2]); cb.votePause(true);

        // Unpause
        vm.prank(guardians[0]); cb.voteUnpause(true);
        vm.prank(guardians[1]); cb.voteUnpause(true);
        vm.prank(guardians[2]); cb.voteUnpause(true);
        vm.prank(guardians[3]); cb.voteUnpause(true);
        assertFalse(cb.isPaused());

        // Second pause cycle — should work (state was reset)
        vm.prank(guardians[0]); cb.votePause(true);
        vm.prank(guardians[1]); cb.votePause(true);
        vm.prank(guardians[2]); cb.votePause(true);
        assertTrue(cb.isPaused());
    }

    function testPauseStatus_returnsCorrectData() public {
        vm.prank(guardians[0]); cb.votePause(true);
        vm.prank(guardians[1]); cb.votePause(true);

        (bool paused,, uint256 autoTime, uint256 pYes,,, ) = cb.getPauseStatus();
        assertFalse(paused);
        assertEq(pYes, 2);
        assertEq(autoTime, 0); // only set when paused

        vm.prank(guardians[2]); cb.votePause(true);

        (paused,, autoTime,,,,) = cb.getPauseStatus();
        assertTrue(paused);
        assertEq(autoTime, block.timestamp + 7 days);
    }
}
