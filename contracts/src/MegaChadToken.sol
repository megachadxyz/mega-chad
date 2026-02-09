// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract MegaChadToken is ERC20, ERC20Burnable {
    address public immutable devWallet;

    constructor(
        string memory name_,
        string memory symbol_,
        address devWallet_
    ) ERC20(name_, symbol_) {
        require(devWallet_ != address(0), "dev wallet cannot be zero");
        _mint(msg.sender, 1_000_000_000 * 10 ** 18);
        devWallet = devWallet_;
    }

    /// @notice Burn to create: 50% burned forever, 50% sent to dev wallet
    function burnToCreate(uint256 amount) external {
        uint256 burnHalf = amount / 2;
        uint256 devHalf = amount - burnHalf;
        _burn(msg.sender, burnHalf);
        _transfer(msg.sender, devWallet, devHalf);
    }
}
