// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MoggerStakingV2.sol";
import "../src/JesterGoonerV2.sol";

contract DeployStakingV2 is Script {
    function run() external {
        // Testnet addresses
        address megachad = 0x4Fb3d34e1fd1a7a905689CD841487623cdbc8a90;
        address megagooner = 0xDa2A1Bb2AE894A381ff1946f115E29335eDCA577;
        address nftContract = 0x8Ba2A1f997FCae0486085E8Df521e28586f42255;
        address lpToken = 0xE150698cCcce99e0385146A70E0E150b4A2ebC70;

        // Budgets: 60/40 split of 20M MEGAGOONER
        uint256 moggerBudget = 12_000_000 * 1e18;
        uint256 jesterBudget = 8_000_000 * 1e18;

        vm.startBroadcast();

        MoggerStakingV2 mogger = new MoggerStakingV2(
            megachad, megagooner, nftContract, moggerBudget
        );

        JesterGoonerV2 jester = new JesterGoonerV2(
            lpToken, megagooner, nftContract, jesterBudget
        );

        // Fund contracts with MEGAGOONER
        IERC20(megagooner).transfer(address(mogger), moggerBudget);
        IERC20(megagooner).transfer(address(jester), jesterBudget);

        vm.stopBroadcast();

        console.log("MoggerStakingV2:", address(mogger));
        console.log("JesterGoonerV2:", address(jester));
    }
}
