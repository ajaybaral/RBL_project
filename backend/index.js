// Advanced backend for Auction manager
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { ethers } = require('ethers');
const axios = require('axios');
const Database = require('better-sqlite3');

const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(bodyParser.json());

const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '';
const PINATA_JWT = process.env.PINATA_JWT || '';

// Extended ABI
const ABI = [
  // Legacy
  'function highestBid() view returns (uint256)',
  'function highestBidder() view returns (address)',
  'function auctionEndTime() view returns (uint256)',
  'function ended() view returns (bool)',
  'function bid() external payable',
  'function endAuction() external',
  'function withdraw() external returns (bool)',
  // Manager core
  'function auctionsCount() view returns (uint256)',
  'function auctions(uint256) view returns (uint8 auctionType,uint256 startTime,uint256 biddingEndTime,uint256 revealEndTime,uint256 reservePrice,uint256 minIncrement,uint256 buyItNowPrice,uint256 antiSnipingWindow,uint256 antiSnipingExtension,bool ended,address seller,address nftAddress,uint256 tokenId,uint256 tokenAmount,bool isERC1155,string ipfsCid,bool requireVerification)',
  'function getEnglishState(uint256) view returns (address,uint256)',
  'function getSealedHighest(uint256) view returns (address,uint256)',
  'function createAuction(uint8,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256) returns (uint256)',
  'function bid(uint256) external payable',
  'function commitBid(uint256,bytes32) external',
  'function revealBid(uint256,uint256,bytes32) external payable',
  'function withdraw(uint256) external returns (bool)',
  'function endAuction(uint256) external',
  'function setAuctionNFT(uint256,address,uint256,uint256,bool) external',
  'function setAuctionMetadata(uint256,string,bool) external',
  'function verifyIdentity(uint8,bytes32,bytes32) external',
  'function setDutchPricing(uint256,uint256,uint256,uint256) external',
  'function getCurrentDutchPrice(uint256) view returns (uint256)',
  'function acceptDutch(uint256) external payable',
  // Events
  'event AuctionCreated(uint256 indexed auctionId, uint8 auctionType, uint256 startTime, uint256 biddingEndTime, uint256 revealEndTime, uint256 reservePrice, uint256 minIncrement, uint256 buyItNowPrice)',
  'event BidCommitted(uint256 indexed auctionId, address indexed bidder, bytes32 commitment)',
  'event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount)',
  'event BuyItNowTriggered(uint256 indexed auctionId, address indexed buyer, uint256 amount)',
  'event AuctionExtended(uint256 indexed auctionId, uint256 newEndTime)',
  'event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 amount)'
];

function getProvider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

function getSigner() {
  if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY missing');
  return new ethers.Wallet(PRIVATE_KEY, getProvider());
}

function getContract(readOnly = true) {
  if (!CONTRACT_ADDRESS) throw new Error('CONTRACT_ADDRESS missing');
  const providerOrSigner = readOnly ? getProvider() : getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, ABI, providerOrSigner);
}

// SQLite analytics setup
const db = new Database('analytics.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    auctionId INTEGER,
    bidder TEXT,
    amount TEXT,
    blockNumber INTEGER,
    txHash TEXT
  );
`);

async function indexPastEvents() {
  const c = getContract(true);
  const provider = getProvider();
  
  try {
    // Get current block number
    const currentBlock = await provider.getBlockNumber();
    
    // For Alchemy free tier, limit to last 10 blocks or from deployment block
    const startBlock = Math.max(0, currentBlock - 10);
    const endBlock = currentBlock;
    
    console.log(`Indexing events from block ${startBlock} to ${endBlock}`);
    
    const names = [
      'AuctionCreated','BidCommitted','BidPlaced','BuyItNowTriggered','AuctionExtended','AuctionEnded'
    ];
    
    for (const name of names) {
      const filter = c.filters[name] ? c.filters[name]() : null;
      if (!filter) continue;
      
      try {
        const logs = await provider.getLogs({ 
          ...filter, 
          address: CONTRACT_ADDRESS, 
          fromBlock: startBlock, 
          toBlock: endBlock 
        });
        
        for (const l of logs) {
          const parsed = c.interface.parseLog(l);
          const args = Object.fromEntries(Object.entries(parsed.args).filter(([k]) => isNaN(Number(k))));
          const auctionId = args.auctionId ? Number(args.auctionId) : null;
          const bidder = args.bidder || args.buyer || args.winner || null;
          const amount = args.amount ? args.amount.toString() : null;
          db.prepare('INSERT INTO events (name, auctionId, bidder, amount, blockNumber, txHash) VALUES (?,?,?,?,?,?)')
            .run(name, auctionId, bidder, amount, l.blockNumber, l.transactionHash);
        }
      } catch (logError) {
        console.log(`Warning: Could not fetch ${name} events:`, logError.message);
      }
    }
  } catch (error) {
    console.log('Warning: Could not index past events:', error.message);
    // Continue without failing - the app can still work without historical events
  }
}

function subscribeLiveEvents() {
  const c = getContract(true);
  const provider = getProvider();
  provider.on({ address: CONTRACT_ADDRESS }, (log) => {
    try {
      const parsed = c.interface.parseLog(log);
      const args = Object.fromEntries(Object.entries(parsed.args).filter(([k]) => isNaN(Number(k))));
      const auctionId = args.auctionId ? Number(args.auctionId) : null;
      const bidder = args.bidder || args.buyer || args.winner || null;
      const amount = args.amount ? args.amount.toString() : null;
      db.prepare('INSERT INTO events (name, auctionId, bidder, amount, blockNumber, txHash) VALUES (?,?,?,?,?,?)')
        .run(parsed.name, auctionId, bidder, amount, log.blockNumber, log.transactionHash);
    } catch (e) {}
  });
}

// Health/state of legacy auction 0
app.get('/state', async (req, res) => {
  try {
    const c = getContract(true);
    const [highestBid, highestBidder, endTime, ended] = await Promise.all([
      c.highestBid(), c.highestBidder(), c.auctionEndTime(), c.ended()
    ]);
    res.json({ highestBid: highestBid.toString(), highestBidder, endTime: Number(endTime), ended });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create auction (supports Dutch/Vickrey via auctionType)
app.post('/create-auction', async (req, res) => {
  try {
    const {
      auctionType, // 0 English, 1 SealedBid, 2 Dutch, 3 Vickrey
      durationSec,
      reservePriceWei = '0',
      minIncrementWei = '0',
      buyItNowWei = '0',
      antiSnipingWindowSec = 0,
      antiSnipingExtensionSec = 0,
      revealDurationSec = 0,
      // optional NFT
      nftAddress,
      tokenId,
      tokenAmount = 0,
      isERC1155 = false,
      // metadata
      ipfsCid,
      requireVerification = false,
      // dutch pricing
      dutchStartPriceWei,
      dutchEndPriceWei,
      dutchDecrementPerSecWei
    } = req.body || {};

    if (![0,1,2,3].includes(auctionType)) return res.status(400).json({ error: 'auctionType must be 0..3' });
    if (!durationSec || durationSec <= 0) return res.status(400).json({ error: 'durationSec required' });

    const now = Math.floor(Date.now() / 1000);
    const startTime = now + 5; // small buffer
    const biddingEndTime = startTime + Number(durationSec);
    const revealEndTime = (auctionType === 1 || auctionType === 3) ? biddingEndTime + Number(revealDurationSec || 60) : 0;

    const c = getContract(false);
    const tx = await c.createAuction(
      auctionType,
      startTime,
      biddingEndTime,
      revealEndTime,
      reservePriceWei,
      minIncrementWei,
      buyItNowWei,
      antiSnipingWindowSec,
      antiSnipingExtensionSec
    );
    const rc = await tx.wait();

    const createdEvt = rc.logs
      .map(l => { try { return c.interface.parseLog(l); } catch { return null; } })
      .find(ev => ev && ev.name === 'AuctionCreated');
    const auctionId = createdEvt ? Number(createdEvt.args.auctionId) : null;

    // optional NFT custody
    if (nftAddress && tokenId !== undefined) {
      const txN = await c.setAuctionNFT(auctionId, nftAddress, tokenId, tokenAmount || 0, Boolean(isERC1155));
      await txN.wait();
    }
    // optional metadata + identity requirement
    if (ipfsCid || requireVerification) {
      const txM = await c.setAuctionMetadata(auctionId, ipfsCid || '', Boolean(requireVerification));
      await txM.wait();
    }
    // optional Dutch pricing
    if (auctionType === 2 && dutchStartPriceWei && dutchEndPriceWei && dutchDecrementPerSecWei) {
      const txD = await c.setDutchPricing(auctionId, dutchStartPriceWei, dutchEndPriceWei, dutchDecrementPerSecWei);
      await txD.wait();
    }

    res.json({ txHash: rc.hash, blockNumber: rc.blockNumber, auctionId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List active auctions with details
app.get('/auctions', async (req, res) => {
  try {
    const c = getContract(true);
    const count = Number(await c.auctionsCount());
    const now = Math.floor(Date.now() / 1000);
    const items = [];
    for (let i = 0; i < count; i++) {
      const cfg = await c.auctions(i);
      let state;
      if (cfg.auctionType === 0) state = await c.getEnglishState(i);
      else state = await c.getSealedHighest(i);
      const active = !cfg.ended && now < Number(cfg.biddingEndTime);
      const dutchPrice = cfg.auctionType === 2 ? (await c.getCurrentDutchPrice(i)).toString() : null;
      items.push({
        auctionId: i,
        auctionType: Number(cfg.auctionType),
        startTime: Number(cfg.startTime),
        biddingEndTime: Number(cfg.biddingEndTime),
        revealEndTime: Number(cfg.revealEndTime),
        reservePrice: cfg.reservePrice.toString(),
        minIncrement: cfg.minIncrement.toString(),
        buyItNowPrice: cfg.buyItNowPrice.toString(),
        antiSnipingWindow: Number(cfg.antiSnipingWindow),
        antiSnipingExtension: Number(cfg.antiSnipingExtension),
        ended: cfg.ended,
        seller: cfg.seller,
        highestBidder: state[0],
        highestBid: state[1].toString(),
        active,
        nftAddress: cfg.nftAddress,
        tokenId: cfg.tokenId.toString(),
        tokenAmount: cfg.tokenAmount.toString(),
        isERC1155: cfg.isERC1155,
        ipfsCid: cfg.ipfsCid,
        requireVerification: cfg.requireVerification,
        dutchPrice
      });
    }
    res.json({ count, items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Verification (off-chain signed message -> on-chain mark verified)
app.post('/verify', async (req, res) => {
  try {
    const { v, r, s } = req.body || {};
    if (v === undefined || !r || !s) return res.status(400).json({ error: 'v,r,s required' });
    const c = getContract(false);
    const tx = await c.verifyIdentity(v, r, s);
    const rc = await tx.wait();
    res.json({ txHash: rc.hash });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Place bid on a specific auction (English)
app.post('/bid/:auctionId', async (req, res) => {
  try {
    const auctionId = Number(req.params.auctionId);
    if (!Number.isInteger(auctionId)) return res.status(400).json({ error: 'invalid auctionId' });
    const { bidEth } = req.body || {};
    if (bidEth === undefined) return res.status(400).json({ error: 'bidEth required' });
    const c = getContract(false);
    const tx = await c["bid(uint256)"](auctionId, { value: ethers.parseEther(String(bidEth)) });
    const rc = await tx.wait();
    res.json({ txHash: rc.hash, blockNumber: rc.blockNumber });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Sealed-bid commit
app.post('/commit/:auctionId', async (req, res) => {
  try {
    const auctionId = Number(req.params.auctionId);
    const { commitment } = req.body || {};
    if (!commitment) return res.status(400).json({ error: 'commitment required' });
    const c = getContract(false);
    const tx = await c.commitBid(auctionId, commitment);
    const rc = await tx.wait();
    res.json({ txHash: rc.hash });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Sealed-bid reveal
app.post('/reveal/:auctionId', async (req, res) => {
  try {
    const auctionId = Number(req.params.auctionId);
    const { amountEth, secretHex } = req.body || {};
    if (!amountEth || !secretHex) return res.status(400).json({ error: 'amountEth, secretHex required' });
    const c = getContract(false);
    const amountWei = ethers.parseEther(String(amountEth));
    const tx = await c.revealBid(auctionId, amountWei, secretHex, { value: amountWei });
    const rc = await tx.wait();
    res.json({ txHash: rc.hash });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Accept Dutch auction at current price
app.post('/accept-dutch/:auctionId', async (req, res) => {
  try {
    const auctionId = Number(req.params.auctionId);
    const c = getContract(false);
    const price = await c.getCurrentDutchPrice(auctionId);
    const tx = await c.acceptDutch(auctionId, { value: price });
    const rc = await tx.wait();
    res.json({ txHash: rc.hash });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// End a specific auction
app.post('/end/:auctionId', async (req, res) => {
  try {
    const auctionId = Number(req.params.auctionId);
    if (!Number.isInteger(auctionId)) return res.status(400).json({ error: 'invalid auctionId' });
    const c = getContract(false);
    const tx = await c["endAuction(uint256)"](auctionId);
    const rc = await tx.wait();
    res.json({ txHash: rc.hash, blockNumber: rc.blockNumber });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Set NFT for auction (owner-only)
app.post('/set-nft/:auctionId', async (req, res) => {
  try {
    const auctionId = Number(req.params.auctionId);
    const { nftAddress, tokenId, tokenAmount = 0, isERC1155 = false } = req.body || {};
    const c = getContract(false);
    const tx = await c.setAuctionNFT(auctionId, nftAddress, tokenId, tokenAmount, Boolean(isERC1155));
    const rc = await tx.wait();
    res.json({ txHash: rc.hash });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Set metadata & identity gating (owner-only)
app.post('/set-meta/:auctionId', async (req, res) => {
  try {
    const auctionId = Number(req.params.auctionId);
    const { ipfsCid = '', requireVerification = false } = req.body || {};
    const c = getContract(false);
    const tx = await c.setAuctionMetadata(auctionId, ipfsCid, Boolean(requireVerification));
    const rc = await tx.wait();
    res.json({ txHash: rc.hash });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// IPFS pin via Pinata
app.post('/pin', async (req, res) => {
  try {
    if (!PINATA_JWT) return res.status(500).json({ error: 'PINATA_JWT not configured' });
    const metadata = req.body || {};
    const resp = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', metadata, {
      headers: { Authorization: `Bearer ${PINATA_JWT}` }
    });
    res.json(resp.data);
  } catch (e) {
    res.status(500).json({ error: e.response?.data || e.message });
  }
});

// IPFS unpin via Pinata
app.post('/unpin', async (req, res) => {
  try {
    if (!PINATA_JWT) return res.status(500).json({ error: 'PINATA_JWT not configured' });
    const { cid } = req.body || {};
    if (!cid) return res.status(400).json({ error: 'cid required' });
    const resp = await axios.delete(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
      headers: { Authorization: `Bearer ${PINATA_JWT}` }
    });
    res.json(resp.data || { ok: true });
  } catch (e) {
    res.status(500).json({ error: e.response?.data || e.message });
  }
});

// Get event history for an auction
app.get('/history/:auctionId', async (req, res) => {
  try {
    const auctionId = Number(req.params.auctionId);
    if (!Number.isInteger(auctionId)) return res.status(400).json({ error: 'invalid auctionId' });
    const rows = db.prepare('SELECT * FROM events WHERE auctionId = ? ORDER BY blockNumber, id').all(auctionId);
    res.json({ events: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Analytics endpoint
app.get('/analytics', async (req, res) => {
  try {
    const c = getContract(true);
    const totalAuctions = Number(await c.auctionsCount());
    const rows = db.prepare('SELECT name, COUNT(*) as cnt FROM events GROUP BY name').all();
    const bidsPerAuction = db.prepare('SELECT auctionId, COUNT(*) as bids FROM events WHERE name = ? GROUP BY auctionId').all('BidPlaced');
    const avgBids = bidsPerAuction.length ? bidsPerAuction.reduce((a,b)=>a+Number(b.bids),0)/bidsPerAuction.length : 0;
    // simplistic gas metrics placeholder (would require tracing/receipts with gasUsed stored)
    const distribution = db.prepare('SELECT auctionId, COUNT(*) cnt FROM events WHERE name = ? GROUP BY auctionId').all('AuctionCreated');
    res.json({ totalAuctions, eventsByType: rows, averageBidsPerAuction: avgBids, distribution });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
  try {
    await indexPastEvents();
    subscribeLiveEvents();
    console.log('Analytics: events indexed and live subscription active');
  } catch (e) {
    console.log('Analytics init failed:', e.message);
    console.log('Backend will continue to work without analytics features');
  }
});


