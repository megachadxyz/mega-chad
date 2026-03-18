// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MegaChadReferral.sol";

contract DeployReferral is Script {
    function run() external {
        address megachad = vm.envAddress("MEGACHAD_TOKEN");
        address burnAddr = 0x000000000000000000000000000000000000dEaD;
        address trenFund = vm.envAddress("TREN_FUND_WALLET");
        uint256 burnAmount = 225_000 * 10 ** 18;

        vm.startBroadcast();
        new MegaChadReferral(megachad, burnAddr, trenFund, burnAmount);
        vm.stopBroadcast();
    }
}
