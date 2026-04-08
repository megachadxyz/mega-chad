// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/JesterGoonerV2.sol";

contract DeployJesterV2 is Script {
    function run() external {
        address megagooner = 0xDa2A1Bb2AE894A381ff1946f115E29335eDCA577;
        address nftContract = 0x8Ba2A1f997FCae0486085E8Df521e28586f42255;
        address lpToken = 0xE150698cCcce99e0385146A70E0E150b4A2ebC70;

        uint256 jesterBudget = 1_800_000 * 1e18;

        vm.startBroadcast();

        JesterGoonerV2 jester = new JesterGoonerV2(
            lpToken, megagooner, nftContract, jesterBudget
        );

        IERC20(megagooner).transfer(address(jester), jesterBudget);

        vm.stopBroadcast();

        console.log("JesterGoonerV2:", address(jester));
    }
}
