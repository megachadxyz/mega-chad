// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract MegaGoonerToken is ERC20, ERC20Burnable {
    constructor() ERC20("Mega Gooner", "MEGAGOONER") {
        _mint(msg.sender, 50_000_000 * 10 ** 18);
    }
}
