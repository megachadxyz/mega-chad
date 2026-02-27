// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MEGAGOONER.sol";
import "../src/EmissionController.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @dev Minimal mock that accepts notifyRewardAmount callbacks from EmissionController
contract MockStaking {
    function notifyRewardAmount(uint256) external {}
}

contract MEGATest is Test {
    MEGAGOONER public megagooner;
    EmissionController public emissionController;

    MockStaking public mockMoggerStaking;
    MockStaking public mockJestergonerRewards;

    address public admin = address(0x1);
    address public moggerStaking;
    address public jestergonerRewards;
    address public treasury = address(0x4);
    address public governance = address(0x5);
    address public user = address(0x6);

    function setUp() public {
        // Deploy mock staking contracts (need to accept notifyRewardAmount callbacks)
        mockMoggerStaking = new MockStaking();
        mockJestergonerRewards = new MockStaking();
        moggerStaking = address(mockMoggerStaking);
        jestergonerRewards = address(mockJestergonerRewards);

        vm.startPrank(admin);

        // Deploy MEGAGOONER implementation
        MEGAGOONER megaGoonerImpl = new MEGAGOONER();

        // Deploy EmissionController implementation (needs megagooner address first)
        EmissionController emissionImpl = new EmissionController();

        // Deploy MEGAGOONER proxy
        bytes memory initData = abi.encodeWithSelector(
            MEGAGOONER.initialize.selector,
            admin,
            address(emissionImpl), // Will be updated after emission controller proxy
            governance
        );

        ERC1967Proxy megaGoonerProxy = new ERC1967Proxy(
            address(megaGoonerImpl),
            initData
        );
        megagooner = MEGAGOONER(address(megaGoonerProxy));

        // Deploy EmissionController proxy
        bytes memory emissionInitData = abi.encodeWithSelector(
            EmissionController.initialize.selector,
            address(megagooner),
            moggerStaking,
            jestergonerRewards,
            treasury,
            governance,
            admin // upgrader
        );

        ERC1967Proxy emissionProxy = new ERC1967Proxy(
            address(emissionImpl),
            emissionInitData
        );
        emissionController = EmissionController(address(emissionProxy));

        // Grant EmissionController the MINTER_ROLE on MEGAGOONER
        megagooner.grantRole(megagooner.MINTER_ROLE(), address(emissionController));

        vm.stopPrank();
    }

    function testDeployment() public view {
        assertEq(megagooner.name(), "MEGAGOONER");
        assertEq(megagooner.symbol(), "MEGAGOONER");
        assertEq(megagooner.MAX_SUPPLY(), 50_000_000 ether);
        assertEq(megagooner.totalSupply(), 0);
    }

    function testEmissionConstants() public view {
        assertEq(emissionController.TOTAL_WEEKS(), 225);
        assertEq(emissionController.BASE_WEEKLY_EMISSION(), 662_245 ether);
        assertEq(emissionController.MAX_SUPPLY(), 50_000_000 ether);
    }

    function testWeeklyEmissionCalculation() public view {
        // Week 0 should emit BASE_WEEKLY_EMISSION
        uint256 week0 = emissionController.calculateWeeklyEmission(0);
        assertEq(week0, 662_245 ether);

        // Week 1 should be slightly less
        uint256 week1 = emissionController.calculateWeeklyEmission(1);
        assertLt(week1, week0);

        // Week 224 (last week) should be very small
        uint256 week224 = emissionController.calculateWeeklyEmission(224);
        assertGt(week224, 0);
        assertLt(week224, 100 ether);

        // Week 225 (after end) should be 0
        uint256 week225 = emissionController.calculateWeeklyEmission(225);
        assertEq(week225, 0);
    }

    function testEmissionSplit() public view {
        (uint256 staking, uint256 lp, uint256 treasuryAmt) = emissionController.getCurrentSplit();

        // 45% staking, 40% LP, 15% treasury
        uint256 weeklyEmission = emissionController.calculateWeeklyEmission(0);

        assertApproxEqRel(staking, (weeklyEmission * 45) / 100, 0.01e18); // 1% tolerance
        assertApproxEqRel(lp, (weeklyEmission * 40) / 100, 0.01e18);
        assertApproxEqRel(treasuryAmt, (weeklyEmission * 15) / 100, 0.01e18);
    }

    function testDistributeEmissions() public {
        vm.prank(moggerStaking);
        uint256[3] memory amounts = emissionController.distributeEmissions();

        // Check that emissions were distributed
        assertGt(amounts[0], 0); // staking
        assertGt(amounts[1], 0); // lp
        assertGt(amounts[2], 0); // treasury

        // Check balances
        assertEq(megagooner.balanceOf(moggerStaking), amounts[0]);
        assertEq(megagooner.balanceOf(jestergonerRewards), amounts[1]);
        assertEq(megagooner.balanceOf(treasury), amounts[2]);

        // Check total supply
        assertEq(megagooner.totalSupply(), amounts[0] + amounts[1] + amounts[2]);
    }

    function testCannotDistributeTwiceInSameWeek() public {
        vm.prank(moggerStaking);
        emissionController.distributeEmissions();

        vm.prank(moggerStaking);
        vm.expectRevert(EmissionController.WeekAlreadyClaimed.selector);
        emissionController.distributeEmissions();
    }

    function testOnlyDistributorsCanDistribute() public {
        vm.prank(user);
        vm.expectRevert(EmissionController.Unauthorized.selector);
        emissionController.distributeEmissions();
    }

    function testMEGAGOONERMaxSupply() public {
        vm.prank(address(emissionController));
        vm.expectRevert("MEGAGOONER: exceeds cap");
        megagooner.mint(user, 50_000_001 ether);
    }

    function testSnapshot() public {
        // Mint some tokens first
        vm.prank(moggerStaking);
        emissionController.distributeEmissions();

        // Create snapshot
        vm.prank(governance);
        uint256 snapshotId = megagooner.snapshot();

        assertEq(snapshotId, 1);
    }

    function testOnlyGovernanceCanSnapshot() public {
        vm.prank(user);
        vm.expectRevert();
        megagooner.snapshot();
    }
}
