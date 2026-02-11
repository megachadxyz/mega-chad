// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MegaCHADNFT.sol";

contract DeployNFT is Script {
    function run() external {
        vm.startBroadcast();
        MegaCHADNFT nft = new MegaCHADNFT();
        vm.stopBroadcast();
        console.log("MegaCHADNFT deployed at:", address(nft));
    }
}
