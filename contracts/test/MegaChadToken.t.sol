// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MegaChadToken.sol";

contract MegaChadTokenTest is Test {
    MegaChadToken token;
    address deployer = address(this);

    function setUp() public {
        token = new MegaChadToken("Test Token Alpha", "TTA");
    }

    function test_name() public view {
        assertEq(token.name(), "Test Token Alpha");
        assertEq(token.symbol(), "TTA");
    }

    function test_totalSupply() public view {
        assertEq(token.totalSupply(), 1_000_000_000 * 10 ** 18);
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

    event Transfer(address indexed from, address indexed to, uint256 value);
}
