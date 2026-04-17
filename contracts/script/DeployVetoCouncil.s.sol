// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/NFTVetoCouncil.sol";

/// @title DeployVetoCouncil — Deploy NFT Veto Council on MegaETH testnet
/// @notice Run: forge script script/DeployVetoCouncil.s.sol --rpc-url megaeth_testnet --broadcast --legacy --gas-limit 300000000 --with-gas-price 100000000
contract DeployVetoCouncil is Script {
    address constant NFT          = 0x8Ba2A1f997FCae0486085E8Df521e28586f42255;
    address constant JESTERMOGGER = 0x78546877Fe4079e5ca36A1c5C27a6F5ec23088c4;

    function run() external {
        vm.startBroadcast();

        NFTVetoCouncil council = new NFTVetoCouncil(NFT, JESTERMOGGER);
        console.log("NFTVetoCouncil:", address(council));

        vm.stopBroadcast();
    }
}
