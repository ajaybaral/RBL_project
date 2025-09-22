# Simple Web3 Auction Platform - Demo Script

## Quick Setup Commands (Run these first)

### 1. Install Dependencies & Compile
```powershell
cd "RBL_project"
npm install
npx hardhat compile
```

### 2. Start Local Blockchain
```powershell
# In Terminal 1 - Keep this running
npx hardhat node
```

### 3. Deploy Contract
```powershell
# In Terminal 2 - Run this after starting the node
npx hardhat run scripts/deploy_simple.js --network localhost
```

### 4. Start Frontend
```powershell
# In Terminal 3
cd frontend
npm install
npm run dev
```

---

## Demo Presentation Script

### Introduction (30 seconds)
"Today I'll demonstrate a simplified Web3 auction platform that allows anyone to create and participate in English auctions using MetaMask authentication and IPFS metadata storage."

### Demo Flow (5-7 minutes)

#### Step 1: Setup (1 minute)
1. **Open browser** → Navigate to `http://localhost:5173`
2. **Show contract deployment** → Point to contract address in header
3. **Connect MetaMask** → Click "Connect Wallet" button
4. **Import test account** → Use one of the Hardhat test accounts

#### Step 2: Create Auction (2 minutes)
1. **Click "Create Auction" tab**
2. **Fill form**:
   - Start Time: 1 minute from now
   - End Time: 30 minutes from now  
   - Reserve Price: 0.01 ETH
   - Min Increment: 0.001 ETH
   - Buy It Now: 0.1 ETH (optional)
   - IPFS CID: "QmDemo123..." (fake for demo)
3. **Click "Create Auction"**
4. **Show transaction in MetaMask** → Confirm transaction
5. **Switch to "Auctions" tab** → Show new auction appears

#### Step 3: Place Bids (2 minutes)
1. **Switch to different MetaMask account** (import another Hardhat account)
2. **Place bid**: Enter 0.02 ETH, click "Place Bid"
3. **Show transaction confirmation**
4. **Switch to third account**
5. **Place higher bid**: Enter 0.03 ETH
6. **Show previous bidder can withdraw refund**

#### Step 4: End Auction (1 minute)
1. **Wait for end time OR manually end** (if demo time is limited)
2. **Click "End Auction"** (anyone can call this after end time)
3. **Show seller withdraws proceeds**
4. **Show winner gets the item**

### Key Features to Highlight (1 minute)
- ✅ **MetaMask Authentication** - No signup required
- ✅ **IPFS Metadata** - Images/titles stored off-chain
- ✅ **Anyone Can Sell** - No owner restrictions
- ✅ **English Auctions** - Live bidding with anti-sniping
- ✅ **Safe Withdrawals** - Withdraw pattern for refunds
- ✅ **Buy It Now** - Optional instant purchase

---

## Demo Checklist

### Pre-Demo Setup
- [ ] Hardhat node running (`npx hardhat node`)
- [ ] Contract deployed (`npx hardhat run scripts/deploy_simple.js --network localhost`)
- [ ] Frontend running (`cd frontend && npm run dev`)
- [ ] MetaMask configured for localhost:8545
- [ ] 3-4 test accounts imported in MetaMask

### Demo Items
- [ ] Show contract address in header
- [ ] Connect wallet successfully
- [ ] Create auction with realistic parameters
- [ ] Place multiple bids from different accounts
- [ ] Show anti-sniping extension (if bid placed in last 30 seconds)
- [ ] End auction and show withdrawals
- [ ] Demonstrate IPFS metadata link (even if fake)

### Backup Plans
- If MetaMask issues: Show contract interaction via browser console
- If network issues: Use pre-deployed contract on testnet
- If time runs short: Focus on auction creation and one bid placement

---

## Technical Notes for Q&A

### Architecture
- **Smart Contract**: Simplified English auction with withdraw pattern
- **Frontend**: React + Vite + Tailwind CSS
- **Blockchain**: Local Hardhat network (can deploy to testnets)
- **Authentication**: MetaMask wallet connection
- **Metadata**: IPFS for off-chain storage

### Security Features
- **Withdraw Pattern**: Safe refunds prevent reentrancy
- **Time Validation**: Start/end time checks
- **Reserve Price**: Minimum bid enforcement
- **Anti-Sniping**: Automatic extension for late bids

### Scalability
- **Multiple Auctions**: Contract supports unlimited concurrent auctions
- **Gas Optimization**: Minimal storage and computation
- **IPFS Integration**: Metadata doesn't bloat blockchain

---

## Commands Reference

### Development Commands
```powershell
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Start local node
npx hardhat node

# Deploy to localhost
npx hardhat run scripts/deploy_simple.js --network localhost

# Start frontend
cd frontend && npm run dev
```

### MetaMask Setup
1. Install MetaMask browser extension
2. Add local network: http://localhost:8545
3. Import test accounts from Hardhat node output
4. Each account starts with 10,000 ETH for testing

### IPFS Demo (Optional)
1. Upload image to https://web3.storage or https://pinata.cloud
2. Copy IPFS CID (starts with "Qm...")
3. Use in auction creation form
4. Click link to view metadata in browser

---

## Troubleshooting

### Common Issues
- **"Contract not deployed"**: Run deployment script
- **"MetaMask not connected"**: Check network is localhost:8545
- **"Transaction failed"**: Check account has enough ETH
- **"Frontend not loading"**: Ensure npm run dev is running

### Quick Fixes
- Restart Hardhat node if transactions hang
- Clear browser cache if UI issues persist
- Check console for JavaScript errors
- Verify contract address is set correctly
