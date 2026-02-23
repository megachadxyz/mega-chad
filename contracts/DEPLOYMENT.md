# Smart Contract Deployment Guide

## Pre-Deployment Security Checklist

Before deploying to MegaETH mainnet, run the automated security check:

```bash
cd contracts
./deploy-check.sh
```

This script will:
1. ✅ Run all 22 test cases
2. ✅ Verify environment configuration
3. ✅ Check contract size limits
4. ✅ Validate constructor arguments
5. ✅ Build optimized contracts

## Setup

Create a `.env` file in the `contracts/` directory:

```bash
# Required for deployment
DEV_WALLET=0x85bf9272DEA7dff1781F71473187b96c6f2f370C  # Tren fund wallet
PRIVATE_KEY=0x...  # Deployer private key (keep secret!)

# RPC URLs
TESTNET_RPC=https://carrot.megaeth.com/rpc
MAINNET_RPC=https://mainnet.megaeth.com/rpc
```

**⚠️ NEVER commit the `.env` file to git!**

## Deployment Steps

### 1. Deploy to Testnet (Recommended First)

```bash
forge script script/Deploy.s.sol:DeployTestnet \
  --rpc-url $TESTNET_RPC \
  --broadcast \
  --verify
```

### 2. Test on Testnet

- Mint test tokens
- Verify burn-to-create mechanism
- Test NFT minting
- Check explorer verification

### 3. Deploy to Mainnet

```bash
forge script script/Deploy.s.sol:DeployMainnet \
  --rpc-url $MAINNET_RPC \
  --broadcast \
  --verify
```

## Post-Deployment Checklist

- [ ] Verify contracts on [MegaExplorer](https://megaexplorer.xyz)
- [ ] Update `NEXT_PUBLIC_MEGACHAD_CONTRACT` in frontend `.env.local`
- [ ] Update `NEXT_PUBLIC_NFT_CONTRACT` in frontend `.env.local`
- [ ] Transfer NFT contract ownership to minter wallet:
  ```bash
  cast send <NFT_CONTRACT> "transferOwnership(address)" <MINTER_WALLET> \
    --rpc-url $MAINNET_RPC \
    --private-key $PRIVATE_KEY
  ```
- [ ] Test burn-to-create on mainnet with minimum amount
- [ ] Deploy frontend to Vercel
- [ ] Announce deployment

## Security Features

✅ **MegaChadToken.sol**
- Zero address validation in constructor
- Zero amount check in `burnToCreate()`
- Uses OpenZeppelin ERC20 + ERC20Burnable
- 100% test coverage

✅ **MegaCHADNFT.sol**
- Zero address validation in `mint()`
- Empty URI validation in `mint()`
- Access control with `Ownable`
- Uses OpenZeppelin ERC721URIStorage
- 100% test coverage

## Gas Estimates (MegaETH)

| Operation | Estimated Gas |
|-----------|---------------|
| Deploy Token | ~1,500,000 |
| Deploy NFT | ~2,000,000 |
| burnToCreate() | ~50,000 |
| mint() | ~100,000 |

*Note: MegaETH has extremely low gas costs (0.001 gwei base fee)*

## Contract Addresses

### Testnet (Chain ID: 6342)
```
MegaChadToken: TBD
MegaCHADNFT: TBD
```

### Mainnet (Chain ID: 4326)
```
MegaChadToken: 0x... (add after deployment)
MegaCHADNFT: 0x... (add after deployment)
```

## Troubleshooting

**"DEV_WALLET not set"**
- Create a `.env` file in `contracts/` directory
- Add `DEV_WALLET=0x...` with the tren fund address

**"Tests failed"**
- Run `forge test -vvv` to see detailed errors
- Fix any failing tests before deploying

**"Contract size exceeds limit"**
- Enable optimizer: `forge build --optimize --optimizer-runs 200`
- Contract limit is 24,576 bytes (EIP-170)

**"Insufficient funds"**
- Ensure deployer wallet has enough ETH for gas
- Check balance: `cast balance <YOUR_ADDRESS> --rpc-url $MAINNET_RPC`

## Support

- MegaETH Docs: https://docs.megaeth.com
- Explorer: https://megaexplorer.xyz
- GitHub: https://github.com/megachadxyz/mega-chad
