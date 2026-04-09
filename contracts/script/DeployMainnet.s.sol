// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MegaGoonerToken.sol";
import "../src/MegaChadLP.sol";
import "../src/Framemogger.sol";
import "../src/MoggerStakingV2.sol";
import "../src/JesterGoonerV2.sol";
import "../src/Jestermogger.sol";

/// @title DeployMainnet — Full MEGA Protocol mainnet deployment
/// @notice Deploys all protocol contracts in dependency order.
///         Run: forge script script/DeployMainnet.s.sol --rpc-url megaeth_mainnet --broadcast
contract DeployMainnet is Script {
    // ── Existing mainnet addresses ──
    address constant MEGACHAD    = 0x374A17bd16B5cD76aaeFC9EAF76aE07e9aF3d888;
    address constant NFT         = 0x1f1eFd3476b95091B9332b2d36a24bDE12CC6296;
    address constant TREN_FUND   = 0x85bf9272DEA7dff1781F71473187b96c6f2f370C;

    // ── Emission budgets (from 50M MEGAGOONER supply) ──
    uint256 constant TOTAL_STAKING_BUDGET = 20_000_000 * 1e18; // 40% of supply
    uint256 constant MOGGER_BUDGET        =  8_000_000 * 1e18; // 40% of staking budget
    uint256 constant JESTER_BUDGET        = 12_000_000 * 1e18; // 60% of staking budget

    function run() external {
        vm.startBroadcast();

        // 1. Deploy MEGAGOONER token (50M supply to deployer)
        MegaGoonerToken megagooner = new MegaGoonerToken();
        console.log("MegaGoonerToken:", address(megagooner));

        uint256 goonerBalance = megagooner.balanceOf(msg.sender);
        require(goonerBalance == 50_000_000 * 1e18, "unexpected MEGAGOONER supply");

        // 2. Deploy LP pair (MEGACHAD / MEGAGOONER)
        MegaChadLP lp = new MegaChadLP(MEGACHAD, address(megagooner), "MEGACHAD-MEGAGOONER LP", "MC-MG-LP");
        console.log("MegaChadLP:", address(lp));

        // 3. Deploy Framemogger (send MEGACHAD to Tren Fund + burn MEGAGOONER)
        Framemogger framemogger = new Framemogger(
            MEGACHAD,
            address(megagooner),
            NFT,
            TREN_FUND
        );
        console.log("Framemogger:", address(framemogger));

        // 4. Deploy MoggerStakingV2 (stake MEGACHAD -> earn MEGAGOONER)
        MoggerStakingV2 mogger = new MoggerStakingV2(
            MEGACHAD,
            address(megagooner),
            NFT,
            MOGGER_BUDGET
        );
        console.log("MoggerStakingV2:", address(mogger));

        // 5. Deploy JesterGoonerV2 (stake LP -> earn MEGAGOONER)
        JesterGoonerV2 jester = new JesterGoonerV2(
            address(lp),
            address(megagooner),
            NFT,
            JESTER_BUDGET
        );
        console.log("JesterGoonerV2:", address(jester));

        // 6. Deploy Jestermogger (governance)
        Jestermogger governance = new Jestermogger(
            address(megagooner),
            address(framemogger)
        );
        console.log("Jestermogger:", address(governance));

        // 7. Fund staking contracts with MEGAGOONER
        require(MOGGER_BUDGET + JESTER_BUDGET == TOTAL_STAKING_BUDGET, "budget mismatch");
        require(goonerBalance >= TOTAL_STAKING_BUDGET, "insufficient MEGAGOONER for staking");

        megagooner.transfer(address(mogger), MOGGER_BUDGET);
        megagooner.transfer(address(jester), JESTER_BUDGET);

        // 8. Log remaining MEGAGOONER (30M for team/treasury/future)
        uint256 remaining = megagooner.balanceOf(msg.sender);
        console.log("MEGAGOONER remaining with deployer:", remaining / 1e18);

        vm.stopBroadcast();

        // Summary
        console.log("--- MAINNET DEPLOYMENT COMPLETE ---");
        console.log("MegaGoonerToken:", address(megagooner));
        console.log("MegaChadLP:     ", address(lp));
        console.log("Framemogger:    ", address(framemogger));
        console.log("MoggerStakingV2:", address(mogger));
        console.log("JesterGoonerV2: ", address(jester));
        console.log("Jestermogger:   ", address(governance));
    }
}
