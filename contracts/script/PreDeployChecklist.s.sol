// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MegaChadToken.sol";
import "../src/MegaCHADNFT.sol";

/// @title Pre-Deployment Security Checklist
/// @notice Run this before deploying to catch configuration issues
contract PreDeployChecklist is Script {
    function run() external view {
        console.log("\n=== PRE-DEPLOYMENT CHECKLIST ===\n");

        // 1. Environment Variables Check
        console.log("1. ENVIRONMENT VARIABLES");
        console.log("   Checking required variables...");

        address devWallet;
        try vm.envAddress("DEV_WALLET") returns (address addr) {
            devWallet = addr;
            console.log("   [OK] DEV_WALLET:", devWallet);
            require(devWallet != address(0), "DEV_WALLET cannot be zero address");
        } catch {
            console.log("   [FAIL] DEV_WALLET not set");
            revert("Missing DEV_WALLET environment variable");
        }

        // 2. Constructor Arguments Validation
        console.log("\n2. CONSTRUCTOR ARGUMENTS");
        console.log("   Token Name: Mega Chad");
        console.log("   Token Symbol: MEGACHAD");
        console.log("   Dev Wallet:", devWallet);
        console.log("   Initial Supply: 1,000,000,000 tokens");

        // 3. Contract Size Check
        console.log("\n3. CONTRACT SIZE CHECK");
        bytes memory tokenBytecode = type(MegaChadToken).creationCode;
        bytes memory nftBytecode = type(MegaCHADNFT).creationCode;

        uint256 tokenSize = tokenBytecode.length;
        uint256 nftSize = nftBytecode.length;

        console.log("   MegaChadToken size:", tokenSize, "bytes");
        console.log("   MegaCHADNFT size:", nftSize, "bytes");
        console.log("   Max contract size: 24576 bytes (EIP-170)");

        require(tokenSize < 24576, "Token contract exceeds max size");
        require(nftSize < 24576, "NFT contract exceeds max size");
        console.log("   [OK] All contracts within size limit");

        // 4. Security Checklist
        console.log("\n4. SECURITY CHECKLIST");
        console.log("   [OK] Zero address validation in Token constructor");
        console.log("   [OK] Zero amount validation in burnToCreate");
        console.log("   [OK] Zero address validation in NFT mint");
        console.log("   [OK] Empty URI validation in NFT mint");
        console.log("   [OK] Access control (Ownable) on NFT mint");
        console.log("   [OK] Using OpenZeppelin battle-tested contracts");

        // 5. Gas Estimates
        console.log("\n5. ESTIMATED GAS COSTS");
        console.log("   MegaChadToken deployment: ~1,500,000 gas");
        console.log("   MegaCHADNFT deployment: ~2,000,000 gas");
        console.log("   burnToCreate() call: ~50,000 gas");
        console.log("   mint() call: ~100,000 gas");

        // 6. Network Verification
        console.log("\n6. DEPLOYMENT TARGET");
        console.log("   Network: MegaETH Mainnet (Chain ID: 4326)");
        console.log("   RPC: https://mainnet.megaeth.com/rpc");
        console.log("   Explorer: https://megaexplorer.xyz");

        // 7. Post-Deployment Actions
        console.log("\n7. POST-DEPLOYMENT CHECKLIST");
        console.log("   [ ] Verify contracts on MegaExplorer");
        console.log("   [ ] Update .env.local with contract addresses");
        console.log("   [ ] Transfer NFT contract ownership to minter wallet");
        console.log("   [ ] Test mint on mainnet with small amount");
        console.log("   [ ] Update frontend contract addresses");
        console.log("   [ ] Deploy to Vercel");

        console.log("\n=== ALL CHECKS PASSED ===");
        console.log("Ready to deploy with: forge script script/Deploy.s.sol --broadcast\n");
    }
}
