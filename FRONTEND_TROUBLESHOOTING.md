# Frontend Troubleshooting Guide

## Common Issues and Solutions

### 1. "Connect Wallet" appears as text instead of button
**Problem:** The ConnectWallet component is not rendering properly
**Solution:** 
- Check browser console for JavaScript errors
- Ensure MetaMask is installed and unlocked
- Try refreshing the page

### 2. "Highest bid: 0 ETH" and "Ends in: 0m 0s"
**Problem:** Contract address not configured or contract not deployed
**Solution:**
```bash
# 1. Deploy contract first
npx hardhat run scripts/deploy.js --network localhost

# 2. Copy contract address from output
# 3. Configure frontend
node setup-frontend.js <CONTRACT_ADDRESS>

# 4. Start frontend
cd frontend
npm run dev
```

### 3. "MetaMask not found" error
**Problem:** MetaMask extension not installed or not detected
**Solution:**
- Install MetaMask browser extension
- Refresh the page
- Check if MetaMask is unlocked

### 4. "Set VITE_CONTRACT_ADDRESS" error
**Problem:** Contract address not set in environment
**Solution:**
```bash
# Quick setup
node setup-frontend.js <CONTRACT_ADDRESS>

# Or manual setup
echo "VITE_CONTRACT_ADDRESS=<CONTRACT_ADDRESS>" > frontend/.env
```

### 5. Transaction fails or "insufficient funds"
**Problem:** Not enough ETH in MetaMask account
**Solution:**
- Add ETH to your MetaMask account
- Use Hardhat test accounts (they have 10,000 ETH)
- Import Hardhat account private key to MetaMask

### 6. "Contract not deployed" error
**Problem:** Contract not deployed to local network
**Solution:**
```bash
# 1. Start Hardhat node
npx hardhat node

# 2. Deploy contract
npx hardhat run scripts/deploy.js --network localhost

# 3. Configure frontend with contract address
```

### 7. Frontend shows "localhost:5174" but no content
**Problem:** Vite dev server not running or has errors
**Solution:**
```bash
cd frontend
npm install
npm run dev
```

### 8. "Cannot read properties of undefined" errors
**Problem:** Contract ABI mismatch or contract not found
**Solution:**
- Ensure contract is deployed
- Check contract address is correct
- Verify Hardhat node is running

## Quick Setup Commands

```bash
# 1. Start Hardhat node (in terminal 1)
npx hardhat node

# 2. Deploy contract (in terminal 2)
npx hardhat run scripts/deploy.js --network localhost

# 3. Configure frontend (in terminal 2)
node setup-frontend.js <CONTRACT_ADDRESS_FROM_STEP_2>

# 4. Start frontend (in terminal 3)
cd frontend
npm install
npm run dev
```

## MetaMask Setup

1. Install MetaMask browser extension
2. Create new account or import existing
3. Add local network:
   - Network Name: Hardhat Local
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 31337
   - Currency Symbol: ETH
4. Import Hardhat test account (private key from `npx hardhat node` output)

## Testing the System

1. Connect MetaMask wallet
2. Place a bid (start with 0.01 ETH)
3. Switch to another account and place higher bid
4. Check if auction state updates
5. As owner, end the auction

## Advanced Features

The frontend now supports the advanced contract features:
- Multiple auction types (English, Sealed-Bid, Dutch, Vickrey)
- NFT integration
- Anti-sniping protection
- Buy-it-now functionality
- Identity verification

Use the backend API endpoints for advanced features:
- `/create-auction` - Create new auctions
- `/auctions` - List all auctions
- `/bid/:auctionId` - Place bids on specific auctions
