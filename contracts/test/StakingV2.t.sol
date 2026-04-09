// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MegaChadToken.sol";
import "../src/MegaGoonerToken.sol";
import "../src/MegaCHADNFT.sol";
import "../src/MegaChadLP.sol";
import "../src/MoggerStakingV2.sol";
import "../src/JesterGoonerV2.sol";

contract StakingV2Test is Test {
    MegaChadToken megachad;
    MegaGoonerToken megagooner;
    MegaCHADNFT nft;
    MegaChadLP lp;
    MoggerStakingV2 mogger;
    JesterGoonerV2 jester;

    address deployer = address(this);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address carol = address(0xCA201);

    uint256 constant MOGGER_BUDGET = 8_000_000 * 1e18;
    uint256 constant JESTER_BUDGET = 12_000_000 * 1e18;

    function setUp() public {
        // Deploy tokens
        megachad = new MegaChadToken("MegaCHAD", "MEGACHAD", deployer);
        megagooner = new MegaGoonerToken();
        nft = new MegaCHADNFT();

        // Deploy LP
        lp = new MegaChadLP(address(megachad), address(megagooner), "MEGACHAD-MEGAGOONER LP", "MC-MG-LP");

        // Deploy staking
        mogger = new MoggerStakingV2(address(megachad), address(megagooner), address(nft), MOGGER_BUDGET);
        jester = new JesterGoonerV2(address(lp), address(megagooner), address(nft), JESTER_BUDGET);

        // Fund staking contracts
        megagooner.transfer(address(mogger), MOGGER_BUDGET);
        megagooner.transfer(address(jester), JESTER_BUDGET);

        // Give alice and bob some tokens
        megachad.transfer(alice, 1_000_000 * 1e18);
        megachad.transfer(bob, 1_000_000 * 1e18);
        megagooner.transfer(alice, 500_000 * 1e18);
        megagooner.transfer(bob, 500_000 * 1e18);
    }

    // ─── Helper: mint N NFTs to an address ───
    function _mintNFTs(address to, uint256 count) internal {
        for (uint256 i = 0; i < count; i++) {
            nft.mint(to, "ipfs://test");
        }
    }

    // ─── Helper: create LP tokens for a user ───
    function _addLiquidity(address user, uint256 amountA, uint256 amountB) internal returns (uint256) {
        vm.startPrank(user);
        megachad.approve(address(lp), amountA);
        megagooner.approve(address(lp), amountB);
        uint256 liquidity = lp.addLiquidity(amountA, amountB, user);
        vm.stopPrank();
        return liquidity;
    }

    // ═══════════════════════════════════════════════════════
    // MoggerStakingV2 Tests
    // ═══════════════════════════════════════════════════════

    function test_mogger_stakeRequiresNFT() public {
        vm.startPrank(alice);
        megachad.approve(address(mogger), 1000 * 1e18);
        vm.expectRevert("need 1+ Looksmaxxed NFT");
        mogger.stake(1000 * 1e18);
        vm.stopPrank();
    }

    function test_mogger_stakeSucceedsWithNFT() public {
        _mintNFTs(alice, 1);

        vm.startPrank(alice);
        megachad.approve(address(mogger), 1000 * 1e18);
        mogger.stake(1000 * 1e18);
        vm.stopPrank();

        (uint256 staked,,,,) = mogger.getStakerInfo(alice);
        assertEq(staked, 1000 * 1e18);
        assertEq(mogger.totalStaked(), 1000 * 1e18);
    }

    function test_mogger_unstake() public {
        _mintNFTs(alice, 1);

        vm.startPrank(alice);
        megachad.approve(address(mogger), 1000 * 1e18);
        mogger.stake(1000 * 1e18);

        uint256 balBefore = megachad.balanceOf(alice);
        mogger.unstake(500 * 1e18);
        uint256 balAfter = megachad.balanceOf(alice);
        vm.stopPrank();

        assertEq(balAfter - balBefore, 500 * 1e18);
        (uint256 staked,,,,) = mogger.getStakerInfo(alice);
        assertEq(staked, 500 * 1e18);
    }

    function test_mogger_earnedAccumulates() public {
        _mintNFTs(alice, 1);

        vm.startPrank(alice);
        megachad.approve(address(mogger), 10_000 * 1e18);
        mogger.stake(10_000 * 1e18);
        vm.stopPrank();

        // Warp 1 week
        vm.warp(block.timestamp + 1 weeks);

        uint256 earned = mogger.earned(alice);
        assertGt(earned, 0, "should have earned rewards after 1 week");

        // Week 0 emission for 8M budget: 8_000_000 * 225^2 / 3_822_225 ≈ 105,839
        // Alice is sole staker with 1.0x multiplier, should get ~full emission
        uint256 expectedApprox = (MOGGER_BUDGET * 225 * 225) / 3_822_225;
        assertApproxEqRel(earned, expectedApprox, 0.01e18); // within 1%
    }

    function test_mogger_claimRewards() public {
        _mintNFTs(alice, 1);

        vm.startPrank(alice);
        megachad.approve(address(mogger), 10_000 * 1e18);
        mogger.stake(10_000 * 1e18);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 weeks);

        uint256 goonerBefore = megagooner.balanceOf(alice);
        vm.prank(alice);
        mogger.claimRewards();
        uint256 goonerAfter = megagooner.balanceOf(alice);

        assertGt(goonerAfter - goonerBefore, 0, "should have received MEGAGOONER");
    }

    function test_mogger_nftMultiplierTiers() public {
        // 0 NFTs = 0
        assertEq(mogger.getNFTMultiplier(alice), 0);

        // 1 NFT = 10000 (1.0x)
        _mintNFTs(alice, 1);
        assertEq(mogger.getNFTMultiplier(alice), 10000);

        // 10 NFTs = 10750 (1.075x)
        _mintNFTs(alice, 9); // total 10
        assertEq(mogger.getNFTMultiplier(alice), 10750);

        // 25 NFTs = 11500 (1.15x)
        _mintNFTs(alice, 15); // total 25
        assertEq(mogger.getNFTMultiplier(alice), 11500);
    }

    function test_mogger_proportionalRewards() public {
        _mintNFTs(alice, 1);
        _mintNFTs(bob, 1);

        // Alice stakes 3x more than Bob
        vm.startPrank(alice);
        megachad.approve(address(mogger), 30_000 * 1e18);
        mogger.stake(30_000 * 1e18);
        vm.stopPrank();

        vm.startPrank(bob);
        megachad.approve(address(mogger), 10_000 * 1e18);
        mogger.stake(10_000 * 1e18);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 weeks);

        uint256 aliceEarned = mogger.earned(alice);
        uint256 bobEarned = mogger.earned(bob);

        // Alice should earn ~3x Bob's rewards
        assertApproxEqRel(aliceEarned, bobEarned * 3, 0.01e18);
    }

    function test_mogger_refreshEffectiveStake() public {
        _mintNFTs(alice, 1);

        vm.startPrank(alice);
        megachad.approve(address(mogger), 10_000 * 1e18);
        mogger.stake(10_000 * 1e18);
        vm.stopPrank();

        (, uint256 effectiveBefore,,,) = mogger.getStakerInfo(alice);
        assertEq(effectiveBefore, 10_000 * 1e18); // 1.0x

        // Mint more NFTs to hit tier 2 (10+)
        _mintNFTs(alice, 9); // total 10
        mogger.refreshEffectiveStake(alice);

        (, uint256 effectiveAfter,,,) = mogger.getStakerInfo(alice);
        assertEq(effectiveAfter, 10_000 * 1e18 * 10750 / 10000); // 1.075x
    }

    function test_mogger_getStakerInfo() public {
        _mintNFTs(alice, 5);

        vm.startPrank(alice);
        megachad.approve(address(mogger), 5000 * 1e18);
        mogger.stake(5000 * 1e18);
        vm.stopPrank();

        (uint256 staked, uint256 effective, uint256 pending, uint256 mult, uint256 nftCount) = mogger.getStakerInfo(alice);
        assertEq(staked, 5000 * 1e18);
        assertEq(effective, 5000 * 1e18); // tier 1 = 1.0x
        assertEq(pending, 0); // no time passed
        assertEq(mult, 10000);
        assertEq(nftCount, 5);
    }

    function test_mogger_getGlobalStats() public {
        _mintNFTs(alice, 1);

        vm.startPrank(alice);
        megachad.approve(address(mogger), 10_000 * 1e18);
        mogger.stake(10_000 * 1e18);
        vm.stopPrank();

        (uint256 ts, uint256 tes, uint256 week, uint256 emission, uint256 remaining) = mogger.getGlobalStats();
        assertEq(ts, 10_000 * 1e18);
        assertEq(tes, 10_000 * 1e18);
        assertEq(week, 0);
        assertGt(emission, 0);
        assertEq(remaining, MOGGER_BUDGET);
    }

    function test_mogger_weekProgression() public {
        uint256 week0 = mogger.getWeeklyEmission(0);
        uint256 week112 = mogger.getWeeklyEmission(112);
        uint256 week224 = mogger.getWeeklyEmission(224);

        assertGt(week0, week112, "week 0 emission > week 112");
        assertGt(week112, week224, "week 112 emission > week 224");
        assertEq(mogger.getWeeklyEmission(225), 0, "no emission after week 225");
    }

    // ═══════════════════════════════════════════════════════
    // JesterGoonerV2 Tests
    // ═══════════════════════════════════════════════════════

    function test_jester_stakeRequiresNFT() public {
        uint256 lpAmount = _addLiquidity(alice, 10_000 * 1e18, 500 * 1e18);

        vm.startPrank(alice);
        lp.approve(address(jester), lpAmount);
        vm.expectRevert("need 1+ Looksmaxxed NFT");
        jester.stake(lpAmount);
        vm.stopPrank();
    }

    function test_jester_stakeAndUnstakeFreely() public {
        _mintNFTs(alice, 1);
        uint256 lpAmount = _addLiquidity(alice, 10_000 * 1e18, 500 * 1e18);

        vm.startPrank(alice);
        lp.approve(address(jester), lpAmount);
        jester.stake(lpAmount);

        // Unstake immediately — no lock period
        uint256 lpBefore = lp.balanceOf(alice);
        jester.unstake(lpAmount);
        uint256 lpAfter = lp.balanceOf(alice);
        vm.stopPrank();

        assertEq(lpAfter - lpBefore, lpAmount);
        (uint256 staked,,,,) = jester.getStakerInfo(alice);
        assertEq(staked, 0);
    }

    function test_jester_earnedAccumulates() public {
        _mintNFTs(alice, 1);
        uint256 lpAmount = _addLiquidity(alice, 10_000 * 1e18, 500 * 1e18);

        vm.startPrank(alice);
        lp.approve(address(jester), lpAmount);
        jester.stake(lpAmount);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 weeks);

        uint256 earned = jester.earned(alice);
        assertGt(earned, 0, "should earn after 1 week");

        // Week 0 emission for 12M budget
        uint256 expectedApprox = (JESTER_BUDGET * 225 * 225) / 3_822_225;
        assertApproxEqRel(earned, expectedApprox, 0.01e18);
    }

    function test_jester_claimRewards() public {
        _mintNFTs(alice, 1);
        uint256 lpAmount = _addLiquidity(alice, 10_000 * 1e18, 500 * 1e18);

        vm.startPrank(alice);
        lp.approve(address(jester), lpAmount);
        jester.stake(lpAmount);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 weeks);

        uint256 goonerBefore = megagooner.balanceOf(alice);
        vm.prank(alice);
        jester.claimRewards();
        uint256 goonerAfter = megagooner.balanceOf(alice);

        assertGt(goonerAfter - goonerBefore, 0);
    }

    function test_jester_proportionalRewards() public {
        _mintNFTs(alice, 1);
        _mintNFTs(bob, 1);

        // Give bob tokens for LP
        megachad.transfer(bob, 500_000 * 1e18);
        megagooner.transfer(bob, 500_000 * 1e18);

        uint256 aliceLp = _addLiquidity(alice, 30_000 * 1e18, 1500 * 1e18);
        uint256 bobLp = _addLiquidity(bob, 10_000 * 1e18, 500 * 1e18);

        vm.startPrank(alice);
        lp.approve(address(jester), aliceLp);
        jester.stake(aliceLp);
        vm.stopPrank();

        vm.startPrank(bob);
        lp.approve(address(jester), bobLp);
        jester.stake(bobLp);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 weeks);

        uint256 aliceEarned = jester.earned(alice);
        uint256 bobEarned = jester.earned(bob);

        // Alice put in 3x liquidity, so she should get ~3x LP tokens and ~3x rewards
        assertGt(aliceEarned, bobEarned * 2, "alice should earn significantly more than bob");
    }

    // ═══════════════════════════════════════════════════════
    // MegaChadLP Tests
    // ═══════════════════════════════════════════════════════

    function test_lp_addLiquidityMintsTokens() public {
        uint256 liquidity = _addLiquidity(alice, 10_000 * 1e18, 500 * 1e18);
        assertGt(liquidity, 0);
        assertEq(lp.balanceOf(alice), liquidity);

        (uint256 rA, uint256 rB) = lp.getReserves();
        assertEq(rA, 10_000 * 1e18);
        assertEq(rB, 500 * 1e18);
    }

    function test_lp_removeLiquidityReturnsTokens() public {
        uint256 liquidity = _addLiquidity(alice, 10_000 * 1e18, 500 * 1e18);

        uint256 chadBefore = megachad.balanceOf(alice);
        uint256 goonerBefore = megagooner.balanceOf(alice);

        vm.prank(alice);
        lp.removeLiquidity(liquidity, alice);

        uint256 chadAfter = megachad.balanceOf(alice);
        uint256 goonerAfter = megagooner.balanceOf(alice);

        // Should get back approximately what was deposited (minus minimum liquidity lock)
        assertGt(chadAfter - chadBefore, 9999 * 1e18);
        assertGt(goonerAfter - goonerBefore, 499 * 1e18);
    }

    function test_lp_fairShares() public {
        // Alice adds first
        uint256 aliceLp = _addLiquidity(alice, 10_000 * 1e18, 500 * 1e18);

        // Bob adds same proportional amounts
        uint256 bobLp = _addLiquidity(bob, 10_000 * 1e18, 500 * 1e18);

        // Bob should get approximately the same LP amount as Alice
        // (Alice has slightly more due to minimum liquidity lock on first mint)
        assertApproxEqRel(bobLp, aliceLp, 0.01e18);
    }

    // ═══════════════════════════════════════════════════════
    // Integration Test: Full Flow
    // ═══════════════════════════════════════════════════════

    function test_fullFlow() public {
        // Setup: mint NFTs
        _mintNFTs(alice, 5);  // tier 1 (1.0x)
        _mintNFTs(bob, 12);   // tier 2 (1.075x)

        // Alice stakes MEGACHAD in MoggerStaking
        vm.startPrank(alice);
        megachad.approve(address(mogger), 50_000 * 1e18);
        mogger.stake(50_000 * 1e18);
        vm.stopPrank();

        // Bob adds liquidity and stakes LP in JesterGooner
        uint256 bobLp = _addLiquidity(bob, 20_000 * 1e18, 1000 * 1e18);
        vm.startPrank(bob);
        lp.approve(address(jester), bobLp);
        jester.stake(bobLp);
        vm.stopPrank();

        // Verify effective stakes account for multipliers
        (, uint256 aliceEffective,,,) = mogger.getStakerInfo(alice);
        assertEq(aliceEffective, 50_000 * 1e18); // 1.0x

        (, uint256 bobEffective,,,) = jester.getStakerInfo(bob);
        assertEq(bobEffective, bobLp * 10750 / 10000); // 1.075x

        // Warp 2 weeks
        vm.warp(block.timestamp + 2 weeks);

        // Both should have earned rewards
        uint256 aliceMoggerEarned = mogger.earned(alice);
        uint256 bobJesterEarned = jester.earned(bob);
        assertGt(aliceMoggerEarned, 0);
        assertGt(bobJesterEarned, 0);

        // Claim rewards
        uint256 aliceGoonerBefore = megagooner.balanceOf(alice);
        vm.prank(alice);
        mogger.claimRewards();
        assertGt(megagooner.balanceOf(alice) - aliceGoonerBefore, 0);

        uint256 bobGoonerBefore = megagooner.balanceOf(bob);
        vm.prank(bob);
        jester.claimRewards();
        assertGt(megagooner.balanceOf(bob) - bobGoonerBefore, 0);

        // Unstake everything
        vm.prank(alice);
        mogger.unstake(50_000 * 1e18);

        vm.prank(bob);
        jester.unstake(bobLp);

        // Verify clean exit
        (uint256 aliceStaked,,,,) = mogger.getStakerInfo(alice);
        assertEq(aliceStaked, 0);

        (uint256 bobStaked,,,,) = jester.getStakerInfo(bob);
        assertEq(bobStaked, 0);

        // Bob removes liquidity
        uint256 bobChadBefore = megachad.balanceOf(bob);
        vm.prank(bob);
        lp.removeLiquidity(bobLp, bob);
        assertGt(megachad.balanceOf(bob) - bobChadBefore, 0);
    }

    // ═══════════════════════════════════════════════════════
    // Edge Cases
    // ═══════════════════════════════════════════════════════

    function test_mogger_cannotStakeZero() public {
        _mintNFTs(alice, 1);
        vm.prank(alice);
        vm.expectRevert("zero amount");
        mogger.stake(0);
    }

    function test_mogger_cannotUnstakeMoreThanStaked() public {
        _mintNFTs(alice, 1);
        vm.startPrank(alice);
        megachad.approve(address(mogger), 1000 * 1e18);
        mogger.stake(1000 * 1e18);
        vm.expectRevert("invalid amount");
        mogger.unstake(2000 * 1e18);
        vm.stopPrank();
    }

    function test_mogger_cannotClaimWithNoRewards() public {
        _mintNFTs(alice, 1);
        vm.startPrank(alice);
        megachad.approve(address(mogger), 1000 * 1e18);
        mogger.stake(1000 * 1e18);
        vm.expectRevert("no rewards");
        mogger.claimRewards();
        vm.stopPrank();
    }

    function test_mogger_noRewardsAfterWeek225() public {
        _mintNFTs(alice, 1);
        vm.startPrank(alice);
        megachad.approve(address(mogger), 10_000 * 1e18);
        mogger.stake(10_000 * 1e18);
        vm.stopPrank();

        // Warp past week 225
        vm.warp(block.timestamp + 226 weeks);

        uint256 earned = mogger.earned(alice);
        // Should have earned something but emission should have stopped
        assertGt(earned, 0);

        // Warp even further — earned should not increase
        uint256 earnedAt226 = earned;
        vm.warp(block.timestamp + 52 weeks);
        assertEq(mogger.earned(alice), earnedAt226);
    }

    function test_jester_nftMultiplierOnStake() public {
        _mintNFTs(alice, 25); // tier 3 = 1.15x

        uint256 lpAmount = _addLiquidity(alice, 10_000 * 1e18, 500 * 1e18);

        vm.startPrank(alice);
        lp.approve(address(jester), lpAmount);
        jester.stake(lpAmount);
        vm.stopPrank();

        (, uint256 effective,,uint256 mult,) = jester.getStakerInfo(alice);
        assertEq(mult, 11500);
        assertEq(effective, lpAmount * 11500 / 10000);
    }
}
