// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title MegaChadRelayer — Gasless burn relay for $MEGACHAD
/// @notice Users approve this contract once, then sign EIP-712 messages to burn
///         without paying gas. The relayer wallet submits transactions on their behalf.
contract MegaChadRelayer is EIP712, Ownable {
    using ECDSA for bytes32;

    IERC20 public immutable megachad;
    address public immutable burnAddress;
    address public immutable trenFundWallet;
    uint256 public immutable burnAmount;

    mapping(address => uint256) public nonces;

    bytes32 private constant BURN_REQUEST_TYPEHASH =
        keccak256("BurnRequest(address burner,uint256 nonce,uint256 deadline)");

    event GaslessBurn(address indexed burner, uint256 nonce, uint256 burnAmount);

    constructor(
        address megachad_,
        address burnAddress_,
        address trenFundWallet_,
        uint256 burnAmount_
    ) EIP712("MegaChadRelayer", "1") {
        require(megachad_ != address(0), "zero token");
        require(trenFundWallet_ != address(0), "zero tren");
        megachad = IERC20(megachad_);
        burnAddress = burnAddress_;
        trenFundWallet = trenFundWallet_;
        burnAmount = burnAmount_;
    }

    /// @notice Relay a gasless burn on behalf of `burner`
    /// @param burner  The token holder who signed the request
    /// @param deadline  Unix timestamp after which the signature expires
    /// @param v  Signature component
    /// @param r  Signature component
    /// @param s  Signature component
    function relayBurn(
        address burner,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(block.timestamp <= deadline, "Signature expired");

        uint256 currentNonce = nonces[burner];

        bytes32 structHash = keccak256(
            abi.encode(BURN_REQUEST_TYPEHASH, burner, currentNonce, deadline)
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(v, r, s);
        require(signer == burner, "Invalid signature");

        nonces[burner] = currentNonce + 1;

        uint256 half = burnAmount / 2;
        uint256 otherHalf = burnAmount - half;

        require(
            megachad.transferFrom(burner, burnAddress, half),
            "Burn transfer failed"
        );
        require(
            megachad.transferFrom(burner, trenFundWallet, otherHalf),
            "Tren fund transfer failed"
        );

        emit GaslessBurn(burner, currentNonce, burnAmount);
    }

    /// @notice Returns the current nonce for a burner (use in EIP-712 signing)
    function getNonce(address burner) external view returns (uint256) {
        return nonces[burner];
    }

    /// @notice Fund the relayer with ETH for gas
    receive() external payable {}

    /// @notice Owner can withdraw gas ETH
    function withdrawGas(address payable to) external onlyOwner {
        (bool ok, ) = to.call{value: address(this).balance}("");
        require(ok, "Withdraw failed");
    }
}
