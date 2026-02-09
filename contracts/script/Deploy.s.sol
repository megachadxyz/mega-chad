// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MegaChadToken.sol";

contract DeployTestnet is Script {
    function run() external {
        address devWallet = vm.envAddress("DEV_WALLET");
        vm.startBroadcast();
        // Stealth name for testnet — swap for real name on mainnet
        new MegaChadToken("Test Token Alpha", "TTA", devWallet);
        vm.stopBroadcast();
    }
}

contract DeployMainnet is Script {
    function run() external {
        address devWallet = vm.envAddress("DEV_WALLET");
        vm.startBroadcast();
        new MegaChadToken("Mega Chad", "MEGACHAD", devWallet);
        vm.stopBroadcast();
    }
}
