// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20SnapshotUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

/**
 * @title MEGAGOONER
 * @notice Governance token for MEGA Protocol
 * @dev ERC20 with snapshot voting, role-based minting, and 50M cap
 *
 * Token Details:
 * - Name: MEGAGOONER
 * - Symbol: MEGAGOONER
 * - Max Supply: 50,000,000
 * - Emission: 225 weeks via EmissionController
 *
 * Features:
 * - Snapshot-based voting (flash loan protection)
 * - Role-based minting (EmissionController only)
 * - Role-based burning (Framemogger deflation)
 * - 50M hard cap
 * - UUPS upgradeable
 */
contract MEGAGOONER is
    ERC20Upgradeable,
    ERC20SnapshotUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint256 public constant MAX_SUPPLY = 50_000_000 ether;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _admin,
        address _emissionController,
        address _governance
    ) external initializer {
        require(_admin != address(0), "MEGAGOONER: zero admin");
        require(_emissionController != address(0), "MEGAGOONER: zero emission");
        require(_governance != address(0), "MEGAGOONER: zero governance");

        __ERC20_init("MEGAGOONER", "MEGAGOONER");
        __ERC20Snapshot_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MINTER_ROLE, _emissionController);
        _grantRole(SNAPSHOT_ROLE, _governance);
        _grantRole(UPGRADER_ROLE, _admin);
    }

    /**
     * @notice Mint new MEGAGOONER tokens
     * @dev Only callable by MINTER_ROLE (EmissionController)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount)
        external
        onlyRole(MINTER_ROLE)
        nonReentrant
    {
        require(to != address(0), "MEGAGOONER: mint to zero address");
        require(totalSupply() + amount <= MAX_SUPPLY, "MEGAGOONER: exceeds cap");
        _mint(to, amount);
    }

    /**
     * @notice Burn MEGAGOONER tokens (deflation via Framemogger)
     * @dev Only callable by BURNER_ROLE (Framemogger)
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burn(address from, uint256 amount)
        external
        onlyRole(BURNER_ROLE)
        nonReentrant
    {
        require(from != address(0), "MEGAGOONER: burn from zero");
        _burn(from, amount);
    }

    /**
     * @notice Create a new snapshot for voting
     * @dev Only callable by SNAPSHOT_ROLE (Jestermogger governance)
     * @return Snapshot ID
     */
    function snapshot() external onlyRole(SNAPSHOT_ROLE) returns (uint256) {
        return _snapshot();
    }

    /**
     * @notice Grant BURNER_ROLE to Framemogger contract
     * @dev Called after Framemogger deployment
     */
    function grantBurnerRole(address framemogger)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(framemogger != address(0), "MEGAGOONER: zero framemogger");
        _grantRole(BURNER_ROLE, framemogger);
    }

    // ═══════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Get remaining mintable supply
     */
    function remainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }

    /**
     * @notice Check if minting is still possible
     */
    function canMint(uint256 amount) external view returns (bool) {
        return totalSupply() + amount <= MAX_SUPPLY;
    }

    // ═══════════════════════════════════════════════════════════
    // OVERRIDES
    // ═══════════════════════════════════════════════════════════

    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20Upgradeable, ERC20SnapshotUpgradeable)
    {
        super._beforeTokenTransfer(from, to, amount);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}
}
