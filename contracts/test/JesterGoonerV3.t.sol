// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MegaChadToken.sol";
import "../src/MegaGoonerToken.sol";
import "../src/MegaCHADNFT.sol";
import "../src/MegaChadLP.sol";
import "../src/MockUSDm.sol";
import "../src/JesterGoonerV3.sol";

contract JesterGoonerV3Test is Test {
    MegaChadToken megachad;
    MegaGoonerToken megagooner;
    MegaCHADNFT nftContract;
    MockUSDm usdm;

    MegaChadLP lp0; // MEGACHAD/MEGAGOONER
    MegaChadLP lp1; // MEGACHAD/WETH (simulated with another ERC20)
    MegaChadLP lp2; // MEGACHAD/USDm

    JesterGoonerV3 jester;

    // Use a mock WETH (just another ERC20 for testing)
    MegaGoonerToken mockWeth;

    address deployer = address(this);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    uint256 constant BUDGET = 12_000_000 * 1e18;

    function setUp() public {
        megachad = new MegaChadToken("MegaCHAD", "MEGACHAD", deployer);
        megagooner = new MegaGoonerToken();
        nftContract = new MegaCHADNFT();
        usdm = new MockUSDm();
        mockWeth = new MegaGoonerToken(); // just need an ERC20

        // Deploy 3 LP pools
        lp0 = new MegaChadLP(address(megachad), address(megagooner), "MC-MG LP", "MC-MG-LP");
        lp1 = new MegaChadLP(address(megachad), address(mockWeth), "MC-WETH LP", "MC-WETH-LP");
        lp2 = new MegaChadLP(address(megachad), address(usdm), "MC-USDm LP", "MC-USDM-LP");

        // Deploy multi-pool staking
        address[] memory lpTokens = new address[](3);
        lpTokens[0] = address(lp0);
        lpTokens[1] = address(lp1);
        lpTokens[2] = address(lp2);

        uint256[] memory allocPoints = new uint256[](3);
        allocPoints[0] = 4000;
        allocPoints[1] = 3500;
        allocPoints[2] = 2500;

        jester = new JesterGoonerV3(
            address(megagooner),
            address(nftContract),
            BUDGET,
            lpTokens,
            allocPoints
        );

        megagooner.transfer(address(jester), BUDGET);

        // Fund alice and bob
        megachad.transfer(alice, 2_000_000 * 1e18);
        megachad.transfer(bob, 2_000_000 * 1e18);
        megagooner.transfer(alice, 500_000 * 1e18);
        megagooner.transfer(bob, 500_000 * 1e18);
        mockWeth.transfer(alice, 500_000 * 1e18);
        mockWeth.transfer(bob, 500_000 * 1e18);
        usdm.mint(alice, 500_000 * 1e18);
        usdm.mint(bob, 500_000 * 1e18);
    }

    function _mintNFTs(address to, uint256 count) internal {
        for (uint256 i = 0; i < count; i++) {
            nftContract.mint(to, "ipfs://test");
        }
    }

    function _addLiquidity(address user, MegaChadLP pool, address tokenB, uint256 amtA, uint256 amtB) internal returns (uint256) {
        vm.startPrank(user);
        megachad.approve(address(pool), amtA);
        IERC20(tokenB).approve(address(pool), amtB);
        uint256 liq = pool.addLiquidity(amtA, amtB, user);
        vm.stopPrank();
        return liq;
    }

    // ═══════════════════════════════════════════════════════
    // Pool Setup
    // ═══════════════════════════════════════════════════════

    function test_poolLength() public view {
        assertEq(jester.poolLength(), 3);
    }

    function test_poolInfoCorrect() public view {
        (address lp, uint256 alloc,,,) = jester.getPoolInfo(0);
        assertEq(lp, address(lp0));
        assertEq(alloc, 4000);

        (lp, alloc,,,) = jester.getPoolInfo(1);
        assertEq(lp, address(lp1));
        assertEq(alloc, 3500);

        (lp, alloc,,,) = jester.getPoolInfo(2);
        assertEq(lp, address(lp2));
        assertEq(alloc, 2500);
    }

    function test_totalAllocPoint() public view {
        assertEq(jester.totalAllocPoint(), 10000);
    }

    // ═══════════════════════════════════════════════════════
    // Stake / Unstake
    // ═══════════════════════════════════════════════════════

    function test_stakeRequiresNFT() public {
        uint256 lpAmt = _addLiquidity(alice, lp0, address(megagooner), 10_000 * 1e18, 500 * 1e18);
        vm.startPrank(alice);
        lp0.approve(address(jester), lpAmt);
        vm.expectRevert("need 1+ Looksmaxxed NFT");
        jester.stake(0, lpAmt);
        vm.stopPrank();
    }

    function test_stakePool0() public {
        _mintNFTs(alice, 1);
        uint256 lpAmt = _addLiquidity(alice, lp0, address(megagooner), 10_000 * 1e18, 500 * 1e18);

        vm.startPrank(alice);
        lp0.approve(address(jester), lpAmt);
        jester.stake(0, lpAmt);
        vm.stopPrank();

        (uint256 staked,,,,) = jester.getUserInfo(0, alice);
        assertEq(staked, lpAmt);
    }

    function test_stakePool1() public {
        _mintNFTs(alice, 1);
        uint256 lpAmt = _addLiquidity(alice, lp1, address(mockWeth), 10_000 * 1e18, 500 * 1e18);

        vm.startPrank(alice);
        lp1.approve(address(jester), lpAmt);
        jester.stake(1, lpAmt);
        vm.stopPrank();

        (uint256 staked,,,,) = jester.getUserInfo(1, alice);
        assertEq(staked, lpAmt);
    }

    function test_unstakeFreely() public {
        _mintNFTs(alice, 1);
        uint256 lpAmt = _addLiquidity(alice, lp0, address(megagooner), 10_000 * 1e18, 500 * 1e18);

        vm.startPrank(alice);
        lp0.approve(address(jester), lpAmt);
        jester.stake(0, lpAmt);

        // Unstake immediately — no lock
        uint256 lpBefore = lp0.balanceOf(alice);
        jester.unstake(0, lpAmt);
        assertEq(lp0.balanceOf(alice) - lpBefore, lpAmt);
        vm.stopPrank();
    }

    function test_invalidPidReverts() public {
        _mintNFTs(alice, 1);
        vm.prank(alice);
        vm.expectRevert("invalid pid");
        jester.stake(5, 100);
    }

    // ═══════════════════════════════════════════════════════
    // Emissions Split
    // ═══════════════════════════════════════════════════════

    function test_emissionsSplitBetweenPools() public {
        _mintNFTs(alice, 1);
        _mintNFTs(bob, 1);

        // Alice stakes in pool 0 (40%), Bob stakes in pool 1 (35%)
        uint256 aliceLp = _addLiquidity(alice, lp0, address(megagooner), 10_000 * 1e18, 500 * 1e18);
        uint256 bobLp = _addLiquidity(bob, lp1, address(mockWeth), 10_000 * 1e18, 500 * 1e18);

        vm.startPrank(alice);
        lp0.approve(address(jester), aliceLp);
        jester.stake(0, aliceLp);
        vm.stopPrank();

        vm.startPrank(bob);
        lp1.approve(address(jester), bobLp);
        jester.stake(1, bobLp);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 weeks);

        uint256 aliceEarned = jester.earned(0, alice);
        uint256 bobEarned = jester.earned(1, bob);

        // Ratio should be 4000:3500 = 8:7
        // Allow 1% tolerance
        assertApproxEqRel(aliceEarned * 3500, bobEarned * 4000, 0.01e18);
    }

    function test_emptyPoolDoesNotAffectOthers() public {
        _mintNFTs(alice, 1);

        // Only stake in pool 0 — pools 1 and 2 are empty
        uint256 aliceLp = _addLiquidity(alice, lp0, address(megagooner), 10_000 * 1e18, 500 * 1e18);

        vm.startPrank(alice);
        lp0.approve(address(jester), aliceLp);
        jester.stake(0, aliceLp);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 weeks);

        uint256 aliceEarned = jester.earned(0, alice);
        // Should get pool 0's 40% share, not 100%
        uint256 totalWeekly = jester.getWeeklyEmission(0);
        uint256 pool0Weekly = (totalWeekly * 4000) / 10000;
        assertApproxEqRel(aliceEarned, pool0Weekly, 0.01e18);
    }

    // ═══════════════════════════════════════════════════════
    // Cross-pool Independence
    // ═══════════════════════════════════════════════════════

    function test_crossPoolIndependence() public {
        _mintNFTs(alice, 1);

        uint256 aliceLp0 = _addLiquidity(alice, lp0, address(megagooner), 10_000 * 1e18, 500 * 1e18);
        uint256 aliceLp1 = _addLiquidity(alice, lp1, address(mockWeth), 10_000 * 1e18, 500 * 1e18);

        vm.startPrank(alice);
        lp0.approve(address(jester), aliceLp0);
        jester.stake(0, aliceLp0);
        lp1.approve(address(jester), aliceLp1);
        jester.stake(1, aliceLp1);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 weeks);

        // Unstake from pool 0 — pool 1 rewards unaffected
        uint256 earnedPool1Before = jester.earned(1, alice);

        vm.prank(alice);
        jester.unstake(0, aliceLp0);

        uint256 earnedPool1After = jester.earned(1, alice);
        assertEq(earnedPool1After, earnedPool1Before);
    }

    // ═══════════════════════════════════════════════════════
    // Claim
    // ═══════════════════════════════════════════════════════

    function test_claimRewardsSinglePool() public {
        _mintNFTs(alice, 1);
        uint256 lpAmt = _addLiquidity(alice, lp0, address(megagooner), 10_000 * 1e18, 500 * 1e18);

        vm.startPrank(alice);
        lp0.approve(address(jester), lpAmt);
        jester.stake(0, lpAmt);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 weeks);

        uint256 goonerBefore = megagooner.balanceOf(alice);
        vm.prank(alice);
        jester.claimRewards(0);
        assertGt(megagooner.balanceOf(alice) - goonerBefore, 0);
    }

    function test_claimAllRewards() public {
        _mintNFTs(alice, 1);

        uint256 lpAmt0 = _addLiquidity(alice, lp0, address(megagooner), 10_000 * 1e18, 500 * 1e18);
        uint256 lpAmt1 = _addLiquidity(alice, lp1, address(mockWeth), 10_000 * 1e18, 500 * 1e18);

        vm.startPrank(alice);
        lp0.approve(address(jester), lpAmt0);
        jester.stake(0, lpAmt0);
        lp1.approve(address(jester), lpAmt1);
        jester.stake(1, lpAmt1);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 weeks);

        uint256 total = jester.earnedAll(alice);
        assertGt(total, 0);

        uint256 goonerBefore = megagooner.balanceOf(alice);
        vm.prank(alice);
        jester.claimAllRewards();
        uint256 received = megagooner.balanceOf(alice) - goonerBefore;

        assertApproxEqRel(received, total, 0.001e18);
    }

    // ═══════════════════════════════════════════════════════
    // setAllocPoint
    // ═══════════════════════════════════════════════════════

    function test_setAllocPoint() public {
        _mintNFTs(alice, 1);
        _mintNFTs(bob, 1);

        uint256 aliceLp = _addLiquidity(alice, lp0, address(megagooner), 10_000 * 1e18, 500 * 1e18);
        uint256 bobLp = _addLiquidity(bob, lp1, address(mockWeth), 10_000 * 1e18, 500 * 1e18);

        vm.startPrank(alice);
        lp0.approve(address(jester), aliceLp);
        jester.stake(0, aliceLp);
        vm.stopPrank();

        vm.startPrank(bob);
        lp1.approve(address(jester), bobLp);
        jester.stake(1, bobLp);
        vm.stopPrank();

        // Wait 1 week, then rebalance: make pool 1 get 70%
        vm.warp(block.timestamp + 1 weeks);

        // Owner rebalances
        jester.setAllocPoint(0, 3000); // 30%
        jester.setAllocPoint(1, 7000); // 70%
        // pool 2 still 2500 → total = 12500

        // Wait another week
        vm.warp(block.timestamp + 1 weeks);

        uint256 aliceWeek2 = jester.earned(0, alice);
        uint256 bobWeek2 = jester.earned(1, bob);

        // Bob should have earned more in week 2 due to higher alloc
        // Both have week 1 rewards + week 2 rewards
        assertGt(bobWeek2, aliceWeek2);
    }

    function test_setAllocPointOnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        jester.setAllocPoint(0, 5000);
    }

    // ═══════════════════════════════════════════════════════
    // NFT Multipliers
    // ═══════════════════════════════════════════════════════

    function test_nftMultiplierAffectsEffectiveStake() public {
        _mintNFTs(alice, 25); // tier 3 = 1.15x

        uint256 lpAmt = _addLiquidity(alice, lp0, address(megagooner), 10_000 * 1e18, 500 * 1e18);

        vm.startPrank(alice);
        lp0.approve(address(jester), lpAmt);
        jester.stake(0, lpAmt);
        vm.stopPrank();

        (, uint256 effective,, uint256 mult,) = jester.getUserInfo(0, alice);
        assertEq(mult, 11500);
        assertEq(effective, lpAmt * 11500 / 10000);
    }

    function test_proportionalWithDifferentMultipliers() public {
        _mintNFTs(alice, 1);  // 1.0x
        _mintNFTs(bob, 25);   // 1.15x

        uint256 aliceLp = _addLiquidity(alice, lp0, address(megagooner), 10_000 * 1e18, 500 * 1e18);
        uint256 bobLp = _addLiquidity(bob, lp0, address(megagooner), 10_000 * 1e18, 500 * 1e18);

        vm.startPrank(alice);
        lp0.approve(address(jester), aliceLp);
        jester.stake(0, aliceLp);
        vm.stopPrank();

        vm.startPrank(bob);
        lp0.approve(address(jester), bobLp);
        jester.stake(0, bobLp);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 weeks);

        uint256 aliceEarned = jester.earned(0, alice);
        uint256 bobEarned = jester.earned(0, bob);

        // Bob has 1.15x effective stake vs Alice 1.0x with same LP
        // So Bob should earn 1.15x more
        assertApproxEqRel(bobEarned * 10000, aliceEarned * 11500, 0.02e18);
    }

    // ═══════════════════════════════════════════════════════
    // Global Stats / Views
    // ═══════════════════════════════════════════════════════

    function test_getGlobalStats() public view {
        (uint256 week, uint256 emission, uint256 remaining, uint256 numPools) = jester.getGlobalStats();
        assertEq(week, 0);
        assertGt(emission, 0);
        assertEq(remaining, BUDGET);
        assertEq(numPools, 3);
    }

    function test_earnedAll() public {
        _mintNFTs(alice, 1);

        uint256 lp0Amt = _addLiquidity(alice, lp0, address(megagooner), 10_000 * 1e18, 500 * 1e18);
        uint256 lp2Amt = _addLiquidity(alice, lp2, address(usdm), 10_000 * 1e18, 500 * 1e18);

        vm.startPrank(alice);
        lp0.approve(address(jester), lp0Amt);
        jester.stake(0, lp0Amt);
        lp2.approve(address(jester), lp2Amt);
        jester.stake(2, lp2Amt);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 weeks);

        uint256 e0 = jester.earned(0, alice);
        uint256 e2 = jester.earned(2, alice);
        uint256 eAll = jester.earnedAll(alice);

        assertEq(eAll, e0 + e2);
    }

    // ═══════════════════════════════════════════════════════
    // Full Integration
    // ═══════════════════════════════════════════════════════

    function test_fullMultiPoolFlow() public {
        _mintNFTs(alice, 5);
        _mintNFTs(bob, 12);

        // Alice in pool 0 + 2, Bob in pool 1
        uint256 aLp0 = _addLiquidity(alice, lp0, address(megagooner), 20_000 * 1e18, 1000 * 1e18);
        uint256 aLp2 = _addLiquidity(alice, lp2, address(usdm), 15_000 * 1e18, 750 * 1e18);
        uint256 bLp1 = _addLiquidity(bob, lp1, address(mockWeth), 25_000 * 1e18, 1250 * 1e18);

        vm.startPrank(alice);
        lp0.approve(address(jester), aLp0);
        jester.stake(0, aLp0);
        lp2.approve(address(jester), aLp2);
        jester.stake(2, aLp2);
        vm.stopPrank();

        vm.startPrank(bob);
        lp1.approve(address(jester), bLp1);
        jester.stake(1, bLp1);
        vm.stopPrank();

        // Warp 3 weeks
        vm.warp(block.timestamp + 3 weeks);

        // Verify everyone earned rewards
        assertGt(jester.earned(0, alice), 0);
        assertGt(jester.earned(2, alice), 0);
        assertGt(jester.earned(1, bob), 0);
        assertEq(jester.earned(1, alice), 0); // alice not in pool 1

        // Alice claims all
        uint256 aliceGoonerBefore = megagooner.balanceOf(alice);
        vm.prank(alice);
        jester.claimAllRewards();
        assertGt(megagooner.balanceOf(alice) - aliceGoonerBefore, 0);

        // Bob claims pool 1
        uint256 bobGoonerBefore = megagooner.balanceOf(bob);
        vm.prank(bob);
        jester.claimRewards(1);
        assertGt(megagooner.balanceOf(bob) - bobGoonerBefore, 0);

        // Unstake everything
        vm.prank(alice);
        jester.unstake(0, aLp0);
        vm.prank(alice);
        jester.unstake(2, aLp2);
        vm.prank(bob);
        jester.unstake(1, bLp1);

        // Clean exit
        (uint256 s0,,,,) = jester.getUserInfo(0, alice);
        (uint256 s2,,,,) = jester.getUserInfo(2, alice);
        (uint256 s1,,,,) = jester.getUserInfo(1, bob);
        assertEq(s0, 0);
        assertEq(s2, 0);
        assertEq(s1, 0);
    }
}
