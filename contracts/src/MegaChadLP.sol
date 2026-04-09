// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title MegaChadLP — Simple MEGACHAD/MEGAGOONER LP token for testnet
/// @notice Minimal constant-product AMM pair with ERC20 LP token.
///         Suitable for testnet staking via JESTERGOONER.
contract MegaChadLP is ERC20, ReentrancyGuard {
    IERC20 public immutable tokenA; // MEGACHAD
    IERC20 public immutable tokenB; // MEGAGOONER

    uint256 public reserveA;
    uint256 public reserveB;

    uint256 private constant MINIMUM_LIQUIDITY = 1000;

    event Mint(address indexed to, uint256 amountA, uint256 amountB, uint256 liquidity);
    event Burn(address indexed to, uint256 amountA, uint256 amountB, uint256 liquidity);
    event Swap(address indexed sender, uint256 amountAIn, uint256 amountBIn, uint256 amountAOut, uint256 amountBOut);

    constructor(address _tokenA, address _tokenB, string memory _name, string memory _symbol) ERC20(_name, _symbol) {
        require(_tokenA != address(0) && _tokenB != address(0), "zero address");
        require(_tokenA != _tokenB, "identical tokens");
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }

    /// @notice Add liquidity — pull tokens, compute LP shares, mint
    function addLiquidity(uint256 amountA, uint256 amountB, address to) external nonReentrant returns (uint256 liquidity) {
        require(amountA > 0 && amountB > 0, "zero amounts");

        // Pull tokens first (will revert if insufficient allowance/balance)
        tokenA.transferFrom(msg.sender, address(this), amountA);
        tokenB.transferFrom(msg.sender, address(this), amountB);

        uint256 _totalSupply = totalSupply();

        if (_totalSupply == 0) {
            liquidity = _sqrt(amountA * amountB) - MINIMUM_LIQUIDITY;
            _mint(address(1), MINIMUM_LIQUIDITY); // lock minimum
        } else {
            uint256 liquidityA = (amountA * _totalSupply) / reserveA;
            uint256 liquidityB = (amountB * _totalSupply) / reserveB;
            liquidity = liquidityA < liquidityB ? liquidityA : liquidityB;
        }

        require(liquidity > 0, "insufficient liquidity minted");
        _mint(to, liquidity);

        reserveA += amountA;
        reserveB += amountB;

        emit Mint(to, amountA, amountB, liquidity);
    }

    /// @notice Remove liquidity — burn LP tokens to receive both tokens back
    function removeLiquidity(uint256 liquidity, address to) external nonReentrant returns (uint256 amountA, uint256 amountB) {
        require(liquidity > 0, "zero liquidity");

        uint256 _totalSupply = totalSupply();
        amountA = (liquidity * reserveA) / _totalSupply;
        amountB = (liquidity * reserveB) / _totalSupply;
        require(amountA > 0 && amountB > 0, "insufficient liquidity burned");

        _burn(msg.sender, liquidity);

        // Update reserves before external calls (checks-effects-interactions)
        reserveA -= amountA;
        reserveB -= amountB;

        // External calls last
        tokenA.transfer(to, amountA);
        tokenB.transfer(to, amountB);

        emit Burn(to, amountA, amountB, liquidity);
    }

    /// @notice Simple constant-product swap (0.3% fee)
    function swap(uint256 amountAIn, uint256 amountBIn, address to) external nonReentrant {
        require(amountAIn > 0 || amountBIn > 0, "zero input");
        require(!(amountAIn > 0 && amountBIn > 0), "one token at a time");

        if (amountAIn > 0) {
            tokenA.transferFrom(msg.sender, address(this), amountAIn);
            uint256 amountAInWithFee = amountAIn * 997;
            uint256 amountBOut = (amountAInWithFee * reserveB) / (reserveA * 1000 + amountAInWithFee);
            require(amountBOut > 0, "insufficient output");
            reserveA += amountAIn;
            reserveB -= amountBOut;
            tokenB.transfer(to, amountBOut);
            emit Swap(msg.sender, amountAIn, 0, 0, amountBOut);
        } else {
            tokenB.transferFrom(msg.sender, address(this), amountBIn);
            uint256 amountBInWithFee = amountBIn * 997;
            uint256 amountAOut = (amountBInWithFee * reserveA) / (reserveB * 1000 + amountBInWithFee);
            require(amountAOut > 0, "insufficient output");
            reserveB += amountBIn;
            reserveA -= amountAOut;
            tokenA.transfer(to, amountAOut);
            emit Swap(msg.sender, 0, amountBIn, amountAOut, 0);
        }
    }

    function getReserves() external view returns (uint256, uint256) {
        return (reserveA, reserveB);
    }

    function _sqrt(uint256 y) private pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) { z = x; x = (y / x + x) / 2; }
        } else if (y != 0) {
            z = 1;
        }
    }
}
