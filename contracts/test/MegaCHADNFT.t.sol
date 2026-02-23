// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MegaCHADNFT.sol";

contract MegaCHADNFTTest is Test {
    MegaCHADNFT nft;
    address owner = address(this);
    address user = address(0xBEEF);

    function setUp() public {
        nft = new MegaCHADNFT();
    }

    function test_name() public view {
        assertEq(nft.name(), "MegaCHAD Looksmaxx");
        assertEq(nft.symbol(), "MCHADNFT");
    }

    function test_ownerCanMint() public {
        string memory uri = "ipfs://QmTest123";
        uint256 tokenId = nft.mint(user, uri);

        assertEq(tokenId, 0);
        assertEq(nft.ownerOf(tokenId), user);
        assertEq(nft.tokenURI(tokenId), uri);
    }

    function test_mintIncrementsTokenId() public {
        uint256 tokenId1 = nft.mint(user, "ipfs://QmTest1");
        uint256 tokenId2 = nft.mint(user, "ipfs://QmTest2");
        uint256 tokenId3 = nft.mint(user, "ipfs://QmTest3");

        assertEq(tokenId1, 0);
        assertEq(tokenId2, 1);
        assertEq(tokenId3, 2);
    }

    function test_nonOwnerCannotMint() public {
        vm.prank(user);
        vm.expectRevert();
        nft.mint(user, "ipfs://QmTest");
    }

    function test_cannotMintToZeroAddress() public {
        vm.expectRevert("Cannot mint to zero address");
        nft.mint(address(0), "ipfs://QmTest");
    }

    function test_cannotMintWithEmptyURI() public {
        vm.expectRevert("URI cannot be empty");
        nft.mint(user, "");
    }

    function test_ownerIsDeployer() public view {
        assertEq(nft.owner(), owner);
    }
}
