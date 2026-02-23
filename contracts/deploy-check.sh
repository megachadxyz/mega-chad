#!/bin/bash
set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║       MEGA CHAD - PRE-DEPLOYMENT SECURITY CHECK               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Run all tests
echo -e "${YELLOW}[1/4] Running test suite...${NC}"
if forge test; then
    echo -e "${GREEN}✓ All tests passed${NC}\n"
else
    echo -e "${RED}✗ Tests failed. Fix errors before deploying.${NC}"
    exit 1
fi

# Step 2: Check for .env file
echo -e "${YELLOW}[2/4] Checking environment configuration...${NC}"
if [ ! -f .env ]; then
    echo -e "${RED}✗ .env file not found${NC}"
    echo "Create a .env file with:"
    echo "  DEV_WALLET=0x..."
    echo "  PRIVATE_KEY=0x..."
    exit 1
fi

source .env

if [ -z "$DEV_WALLET" ]; then
    echo -e "${RED}✗ DEV_WALLET not set in .env${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Environment configured${NC}\n"

# Step 3: Run pre-deployment checklist
echo -e "${YELLOW}[3/4] Running pre-deployment checklist...${NC}"
if forge script script/PreDeployChecklist.s.sol; then
    echo -e "${GREEN}✓ Pre-deployment checks passed${NC}\n"
else
    echo -e "${RED}✗ Pre-deployment checks failed${NC}"
    exit 1
fi

# Step 4: Build contracts
echo -e "${YELLOW}[4/4] Building optimized contracts...${NC}"
if forge build --optimize --optimizer-runs 200; then
    echo -e "${GREEN}✓ Build successful${NC}\n"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi

# Summary
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                   ✓ READY TO DEPLOY                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Deploy to testnet:"
echo "  forge script script/Deploy.s.sol:DeployTestnet --rpc-url \$TESTNET_RPC --broadcast --verify"
echo ""
echo "Deploy to mainnet:"
echo "  forge script script/Deploy.s.sol:DeployMainnet --rpc-url \$MAINNET_RPC --broadcast --verify"
echo ""
echo -e "${YELLOW}⚠️  Remember to:${NC}"
echo "  1. Double-check DEV_WALLET address"
echo "  2. Ensure sufficient ETH for gas"
echo "  3. Verify contracts on explorer after deployment"
echo ""
