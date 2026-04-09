// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDm — Testnet-only faucet stablecoin
contract MockUSDm is ERC20 {
    constructor() ERC20("Mock USDm", "USDm") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
