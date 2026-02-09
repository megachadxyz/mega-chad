// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MegaChadToken.sol";

contract MegaChadTokenTest is Test {
    MegaChadToken token;
    address deployer = address(this);
    address devWallet = address(0xDEAD1);

    function setUp() public {
        token = new MegaChadToken("Test Token Alpha", "TTA", devWallet);
    }

    function test_name() public view {
        assertEq(token.name(), "Test Token Alpha");
        assertEq(token.symbol(), "TTA");
    }

    function test_totalSupply() public view {
        assertEq(token.totalSupply(), 1_000_000_000 * 10 ** 18);
    }

    function test_devWallet() public view {
        assertEq(token.devWallet(), devWallet);
    }

    function test_deployerGetsAllTokens() public view {
        assertEq(token.balanceOf(deployer), 1_000_000_000 * 10 ** 18);
    }

    function test_burn() public {
        uint256 burnAmount = 1_000 * 10 ** 18;
        uint256 supplyBefore = token.totalSupply();

        token.burn(burnAmount);

        assertEq(token.totalSupply(), supplyBefore - burnAmount);
        assertEq(token.balanceOf(deployer), supplyBefore - burnAmount);
    }

    function test_burnToCreate() public {
        uint256 amount = 1_000 * 10 ** 18;
        uint256 half = amount / 2;
        uint256 supplyBefore = token.totalSupply();
        uint256 balanceBefore = token.balanceOf(deployer);

        token.burnToCreate(amount);

        // 50% burned (removed from supply)
        assertEq(token.totalSupply(), supplyBefore - half);
        // 50% sent to dev wallet
        assertEq(token.balanceOf(devWallet), half);
        // deployer lost the full amount
        assertEq(token.balanceOf(deployer), balanceBefore - amount);
    }

    function test_burnToCreateOddAmount() public {
        // Odd wei amount: dev gets the extra wei if any
        uint256 amount = 1_001 * 10 ** 18 + 1; // odd in wei
        uint256 burnHalf = amount / 2;
        uint256 devHalf = amount - burnHalf;

        token.burnToCreate(amount);

        assertEq(token.balanceOf(devWallet), devHalf);
        assertGe(devHalf, burnHalf); // dev gets >= burn half
    }

    function test_burnToCreateEmitsTransferToZero() public {
        uint256 amount = 1_000 * 10 ** 18;
        uint256 half = amount / 2;

        vm.expectEmit(true, true, false, true);
        emit Transfer(deployer, address(0), half);

        token.burnToCreate(amount);
    }

    function test_burnToCreateEmitsTransferToDev() public {
        uint256 amount = 1_000 * 10 ** 18;
        uint256 half = amount / 2;

        vm.expectEmit(true, true, false, true);
        emit Transfer(deployer, devWallet, half);

        token.burnToCreate(amount);
    }

    function test_burnEmitsTransferToZero() public {
        uint256 burnAmount = 1_000 * 10 ** 18;

        vm.expectEmit(true, true, false, true);
        emit Transfer(deployer, address(0), burnAmount);

        token.burn(burnAmount);
    }

    function test_burnFrom() public {
        address burner = address(0xBEEF);
        uint256 amount = 5_000 * 10 ** 18;

        token.transfer(burner, amount);

        vm.prank(burner);
        token.approve(deployer, amount);

        token.burnFrom(burner, amount);

        assertEq(token.balanceOf(burner), 0);
    }

    function test_cannotBurnMoreThanBalance() public {
        uint256 tooMuch = token.totalSupply() + 1;
        vm.expectRevert();
        token.burn(tooMuch);
    }

    function test_cannotBurnToCreateMoreThanBalance() public {
        uint256 tooMuch = token.totalSupply() + 1;
        vm.expectRevert();
        token.burnToCreate(tooMuch);
    }

    function test_cannotDeployWithZeroDevWallet() public {
        vm.expectRevert("dev wallet cannot be zero");
        new MegaChadToken("Test", "T", address(0));
    }

    event Transfer(address indexed from, address indexed to, uint256 value);
}
