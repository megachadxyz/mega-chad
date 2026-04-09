// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockUSDm.sol";
import "../src/MegaChadLP.sol";
import "../src/JesterGoonerV3.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title DeployJesterV3 — Deploy multi-pool LP staking on MegaETH testnet
/// @notice Run: forge script script/DeployJesterV3.s.sol --rpc-url megaeth_testnet --broadcast
contract DeployJesterV3 is Script {
    // Existing testnet addresses
    address constant MEGACHAD    = 0x4Fb3d34e1fd1a7a905689CD841487623cdbc8a90;
    address constant MEGAGOONER  = 0xDa2A1Bb2AE894A381ff1946f115E29335eDCA577;
    address constant NFT         = 0x8Ba2A1f997FCae0486085E8Df521e28586f42255;
    address constant EXISTING_LP = 0xE150698cCcce99e0385146A70E0E150b4A2ebC70; // MEGACHAD/MEGAGOONER LP
    address constant WETH        = 0x4200000000000000000000000000000000000006;

    uint256 constant JESTER_BUDGET = 50_000 * 1e18; // testnet: limited MEGAGOONER supply

    function run() external {
        vm.startBroadcast();

        // 1. Deploy MockUSDm
        MockUSDm usdm = new MockUSDm();
        console.log("MockUSDm:", address(usdm));

        // 2. Deploy MEGACHAD/WETH LP
        MegaChadLP lpEth = new MegaChadLP(MEGACHAD, WETH, "MEGACHAD-WETH LP", "MC-WETH-LP");
        console.log("MEGACHAD-WETH LP:", address(lpEth));

        // 3. Deploy MEGACHAD/USDm LP
        MegaChadLP lpUsdm = new MegaChadLP(MEGACHAD, address(usdm), "MEGACHAD-USDm LP", "MC-USDM-LP");
        console.log("MEGACHAD-USDm LP:", address(lpUsdm));

        // 4. Deploy JesterGoonerV3 with 3 pools
        address[] memory lpTokens = new address[](3);
        lpTokens[0] = EXISTING_LP;       // Pool 0: MEGACHAD/MEGAGOONER (40%)
        lpTokens[1] = address(lpEth);    // Pool 1: MEGACHAD/ETH (35%)
        lpTokens[2] = address(lpUsdm);   // Pool 2: MEGACHAD/USDm (25%)

        uint256[] memory allocPoints = new uint256[](3);
        allocPoints[0] = 4000;
        allocPoints[1] = 3500;
        allocPoints[2] = 2500;

        JesterGoonerV3 jester = new JesterGoonerV3(
            MEGAGOONER, NFT, JESTER_BUDGET, lpTokens, allocPoints
        );
        console.log("JesterGoonerV3:", address(jester));

        // 5. Fund with MEGAGOONER
        uint256 goonerBal = IERC20(MEGAGOONER).balanceOf(msg.sender);
        require(goonerBal >= JESTER_BUDGET, "insufficient MEGAGOONER");
        IERC20(MEGAGOONER).transfer(address(jester), JESTER_BUDGET);

        // 6. Mint testnet USDm for seed liquidity
        usdm.mint(msg.sender, 10_000 * 1e18);

        vm.stopBroadcast();

        console.log("--- JESTER V3 DEPLOYMENT COMPLETE ---");
        console.log("MockUSDm:        ", address(usdm));
        console.log("MEGACHAD-WETH LP: ", address(lpEth));
        console.log("MEGACHAD-USDm LP: ", address(lpUsdm));
        console.log("JesterGoonerV3:  ", address(jester));
        console.log("Alloc: Pool0=40%, Pool1=35%, Pool2=25%");
    }
}
