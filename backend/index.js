// Simple backend for simplified Auction contract
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { ethers } = require('ethers');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 4000;
const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const DB_PATH = process.env.DB_PATH || 'analytics.db';
const IPFS_GATEWAY = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs';

if (!CONTRACT_ADDRESS) {
  console.error('❌ CONTRACT_ADDRESS environment variable is required');
  process.exit(1);
}

// Initialize database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database:', DB_PATH);
  initializeDatabase();
});

// Initialize database tables
function initializeDatabase() {
  const createTables = `
    CREATE TABLE IF NOT EXISTS auctions (
      id INTEGER PRIMARY KEY,
      seller TEXT NOT NULL,
      startTime INTEGER NOT NULL,
      endTime INTEGER NOT NULL,
      reservePrice TEXT NOT NULL,
      minIncrement TEXT NOT NULL,
      buyItNowPrice TEXT NOT NULL,
      antiSnipingWindow INTEGER NOT NULL,
      antiSnipingExtension INTEGER NOT NULL,
      ended BOOLEAN NOT NULL,
      ipfsCid TEXT,
      currentHighestBidder TEXT,
      currentHighestBid TEXT,
      title TEXT,
      image TEXT,
      createdAt INTEGER DEFAULT (strftime('%s', 'now')),
      updatedAt INTEGER DEFAULT (strftime('%s', 'now'))
    );
    
    CREATE TABLE IF NOT EXISTS bids (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      auctionId INTEGER NOT NULL,
      bidder TEXT NOT NULL,
      amount TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (auctionId) REFERENCES auctions (id)
    );
    
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      auctionId INTEGER NOT NULL,
      data TEXT,
      blockNumber INTEGER,
      timestamp INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `;

  db.exec(createTables, (err) => {
    if (err) {
      console.error('❌ Failed to create tables:', err);
      process.exit(1);
    }
    console.log('✅ Database tables initialized');
    startIndexing();
  });
}

// Initialize contract connection
let provider, contract;
const ABI = [
  'function auctionsCount() view returns (uint256)',
  'function getAuction(uint256) view returns (address,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool,string,address,uint256)',
  'event AuctionCreated(uint256 indexed auctionId, address indexed seller, uint256 startTime, uint256 endTime, uint256 reservePrice, string ipfsCid)',
  'event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount)',
  'event AuctionExtended(uint256 indexed auctionId, uint256 newEndTime)',
  'event BuyItNowTriggered(uint256 indexed auctionId, address indexed buyer, uint256 amount)',
  'event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 amount)',
  'event Withdrawn(address indexed who, uint256 amount)'
];

async function initializeContract() {
  try {
    provider = new ethers.JsonRpcProvider(RPC_URL);
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    
    // Test connection
    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ Connected to blockchain at block ${blockNumber}`);
    console.log(`✅ Contract address: ${CONTRACT_ADDRESS}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to blockchain:', error);
    return false;
  }
}

// IPFS metadata cache
const ipfsCache = new Map();

async function fetchIPFSMetadata(cid) {
  if (!cid || cid === '') return null;
  
  if (ipfsCache.has(cid)) {
    return ipfsCache.get(cid);
  }

  try {
    const response = await fetch(`${IPFS_GATEWAY}/${cid}`, {
      timeout: 5000
    });
    
    if (!response.ok) {
      console.warn(`⚠️ Failed to fetch IPFS metadata for ${cid}: ${response.status}`);
      return null;
    }

    const metadata = await response.json();
    const result = {
      title: metadata.name || metadata.title || 'Untitled',
      image: metadata.image || metadata.image_url || null
    };

    ipfsCache.set(cid, result);
    console.log(`✅ Fetched IPFS metadata for ${cid}: ${result.title}`);
    return result;
  } catch (error) {
    console.warn(`⚠️ Error fetching IPFS metadata for ${cid}:`, error.message);
    return null;
  }
}

// Database operations
async function upsertAuction(auctionData) {
  const metadata = auctionData.ipfsCid ? await fetchIPFSMetadata(auctionData.ipfsCid) : null;
  
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT OR REPLACE INTO auctions (
        id, seller, startTime, endTime, reservePrice, minIncrement, 
        buyItNowPrice, antiSnipingWindow, antiSnipingExtension, ended,
        ipfsCid, currentHighestBidder, currentHighestBid, title, image,
        updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      auctionData.id,
      auctionData.seller,
      auctionData.startTime,
      auctionData.endTime,
      auctionData.reservePrice,
      auctionData.minIncrement,
      auctionData.buyItNowPrice,
      auctionData.antiSnipingWindow,
      auctionData.antiSnipingExtension,
      auctionData.ended ? 1 : 0,
      auctionData.ipfsCid || null,
      auctionData.currentHighestBidder || null,
      auctionData.currentHighestBid || null,
      metadata?.title || null,
      metadata?.image || null,
      Math.floor(Date.now() / 1000)
    ];

    db.run(sql, params, function(err) {
      if (err) {
        console.error('❌ Failed to upsert auction:', err);
        reject(err);
      } else {
        console.log(`✅ Upserted auction ${auctionData.id}`);
        resolve(this.changes);
      }
    });
  });
}

function insertEvent(eventType, auctionId, data, blockNumber) {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO events (type, auctionId, data, blockNumber) VALUES (?, ?, ?, ?)`;
    db.run(sql, [eventType, auctionId, JSON.stringify(data), blockNumber], function(err) {
      if (err) {
        console.error('❌ Failed to insert event:', err);
        reject(err);
      } else {
        console.log(`✅ Inserted event: ${eventType} for auction ${auctionId}`);
        resolve(this.lastID);
      }
    });
  });
}

function insertBid(auctionId, bidder, amount, timestamp) {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO bids (auctionId, bidder, amount, timestamp) VALUES (?, ?, ?, ?)`;
    db.run(sql, [auctionId, bidder, amount, timestamp], function(err) {
      if (err) {
        console.error('❌ Failed to insert bid:', err);
        reject(err);
      } else {
        console.log(`✅ Inserted bid: ${ethers.formatEther(amount)} ETH by ${bidder}`);
        resolve(this.lastID);
      }
    });
  });
}

// Initial indexing
async function startIndexing() {
  const connected = await initializeContract();
  if (!connected) {
    console.error('❌ Cannot start indexing without blockchain connection');
    return;
  }

  console.log('🔄 Starting initial indexing...');
  
  try {
    const auctionsCount = await contract.auctionsCount();
    console.log(`📊 Found ${auctionsCount} auctions to index`);

    for (let i = 0; i < auctionsCount; i++) {
      const auction = await contract.getAuction(i);
      const auctionData = {
        id: i,
        seller: auction[0],
        startTime: auction[1],
        endTime: auction[2],
        reservePrice: auction[3].toString(),
        minIncrement: auction[4].toString(),
        buyItNowPrice: auction[5].toString(),
        antiSnipingWindow: auction[6],
        antiSnipingExtension: auction[7],
        ended: auction[8],
        ipfsCid: auction[9],
        currentHighestBidder: auction[10],
        currentHighestBid: auction[11].toString()
      };

      await upsertAuction(auctionData);
    }

    console.log('✅ Initial indexing completed');
    setupEventListeners();
  } catch (error) {
    console.error('❌ Initial indexing failed:', error);
  }
}

// Event listeners
function setupEventListeners() {
  console.log('🎧 Setting up event listeners...');

  contract.on('AuctionCreated', async (auctionId, seller, startTime, endTime, reservePrice, ipfsCid, event) => {
    try {
      const blockNumber = event.blockNumber;
      await insertEvent('AuctionCreated', auctionId, {
        seller,
        startTime,
        endTime,
        reservePrice: reservePrice.toString(),
        ipfsCid
      }, blockNumber);

      // Fetch and upsert auction data
      const auction = await contract.getAuction(auctionId);
      const auctionData = {
        id: auctionId,
        seller: auction[0],
        startTime: auction[1],
        endTime: auction[2],
        reservePrice: auction[3].toString(),
        minIncrement: auction[4].toString(),
        buyItNowPrice: auction[5].toString(),
        antiSnipingWindow: auction[6],
        antiSnipingExtension: auction[7],
        ended: auction[8],
        ipfsCid: auction[9],
        currentHighestBidder: auction[10],
        currentHighestBid: auction[11].toString()
      };

      await upsertAuction(auctionData);
      broadcastSSE('AuctionCreated', auctionId, auctionData);
    } catch (error) {
      console.error('❌ Error handling AuctionCreated event:', error);
    }
  });

  contract.on('BidPlaced', async (auctionId, bidder, amount, event) => {
    try {
      const blockNumber = event.blockNumber;
      const timestamp = Math.floor(Date.now() / 1000);
      
      await insertEvent('BidPlaced', auctionId, {
        bidder,
        amount: amount.toString()
      }, blockNumber);

      await insertBid(auctionId, bidder, amount.toString(), timestamp);

      // Update auction data
      const auction = await contract.getAuction(auctionId);
      const auctionData = {
        id: auctionId,
        seller: auction[0],
        startTime: auction[1],
        endTime: auction[2],
        reservePrice: auction[3].toString(),
        minIncrement: auction[4].toString(),
        buyItNowPrice: auction[5].toString(),
        antiSnipingWindow: auction[6],
        antiSnipingExtension: auction[7],
        ended: auction[8],
        ipfsCid: auction[9],
        currentHighestBidder: auction[10],
        currentHighestBid: auction[11].toString()
      };

      await upsertAuction(auctionData);
      broadcastSSE('BidPlaced', auctionId, { bidder, amount: amount.toString(), auctionData });
    } catch (error) {
      console.error('❌ Error handling BidPlaced event:', error);
    }
  });

  contract.on('AuctionExtended', async (auctionId, newEndTime, event) => {
    try {
      const blockNumber = event.blockNumber;
      await insertEvent('AuctionExtended', auctionId, {
        newEndTime
      }, blockNumber);

      // Update auction data
      const auction = await contract.getAuction(auctionId);
      const auctionData = {
        id: auctionId,
        seller: auction[0],
        startTime: auction[1],
        endTime: auction[2],
        reservePrice: auction[3].toString(),
        minIncrement: auction[4].toString(),
        buyItNowPrice: auction[5].toString(),
        antiSnipingWindow: auction[6],
        antiSnipingExtension: auction[7],
        ended: auction[8],
        ipfsCid: auction[9],
        currentHighestBidder: auction[10],
        currentHighestBid: auction[11].toString()
      };

      await upsertAuction(auctionData);
      broadcastSSE('AuctionExtended', auctionId, { newEndTime, auctionData });
    } catch (error) {
      console.error('❌ Error handling AuctionExtended event:', error);
    }
  });

  contract.on('AuctionEnded', async (auctionId, winner, amount, event) => {
    try {
      const blockNumber = event.blockNumber;
      await insertEvent('AuctionEnded', auctionId, {
        winner,
        amount: amount.toString()
      }, blockNumber);

      // Update auction data
      const auction = await contract.getAuction(auctionId);
      const auctionData = {
        id: auctionId,
        seller: auction[0],
        startTime: auction[1],
        endTime: auction[2],
        reservePrice: auction[3].toString(),
        minIncrement: auction[4].toString(),
        buyItNowPrice: auction[5].toString(),
        antiSnipingWindow: auction[6],
        antiSnipingExtension: auction[7],
        ended: auction[8],
        ipfsCid: auction[9],
        currentHighestBidder: auction[10],
        currentHighestBid: auction[11].toString()
      };

      await upsertAuction(auctionData);
      broadcastSSE('AuctionEnded', auctionId, { winner, amount: amount.toString(), auctionData });
    } catch (error) {
      console.error('❌ Error handling AuctionEnded event:', error);
    }
  });

  contract.on('BuyItNowTriggered', async (auctionId, buyer, amount, event) => {
    try {
      const blockNumber = event.blockNumber;
      await insertEvent('BuyItNowTriggered', auctionId, {
        buyer,
        amount: amount.toString()
      }, blockNumber);

      // Update auction data
      const auction = await contract.getAuction(auctionId);
      const auctionData = {
        id: auctionId,
        seller: auction[0],
        startTime: auction[1],
        endTime: auction[2],
        reservePrice: auction[3].toString(),
        minIncrement: auction[4].toString(),
        buyItNowPrice: auction[5].toString(),
        antiSnipingWindow: auction[6],
        antiSnipingExtension: auction[7],
        ended: auction[8],
        ipfsCid: auction[9],
        currentHighestBidder: auction[10],
        currentHighestBid: auction[11].toString()
      };

      await upsertAuction(auctionData);
      broadcastSSE('BuyItNowTriggered', auctionId, { buyer, amount: amount.toString(), auctionData });
    } catch (error) {
      console.error('❌ Error handling BuyItNowTriggered event:', error);
    }
  });

  console.log('✅ Event listeners setup complete');
}

// Server-Sent Events
const sseClients = new Set();

function broadcastSSE(type, auctionId, data) {
  const message = JSON.stringify({ type, auctionId, data, timestamp: Date.now() });
  sseClients.forEach(client => {
    try {
      client.write(`data: ${message}\n\n`);
    } catch (error) {
      console.error('❌ Error sending SSE message:', error);
      sseClients.delete(client);
    }
  });
}

// Express middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', async (req, res) => {
  try {
    const blockNumber = await provider.getBlockNumber();
    res.json({ ok: true, blockNumber, contractAddress: CONTRACT_ADDRESS });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/auctions', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 100);
  
  db.all(`
    SELECT *, 
           (SELECT COUNT(*) FROM bids WHERE auctionId = auctions.id) as bidCount
    FROM auctions 
    ORDER BY id DESC 
    LIMIT ?
  `, [limit], (err, rows) => {
    if (err) {
      console.error('❌ Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const auctions = rows.map(row => ({
      id: row.id,
      seller: row.seller,
      startTime: row.startTime,
      endTime: row.endTime,
      reservePrice: ethers.formatEther(row.reservePrice),
      minIncrement: ethers.formatEther(row.minIncrement),
      buyItNowPrice: ethers.formatEther(row.buyItNowPrice),
      antiSnipingWindow: row.antiSnipingWindow,
      antiSnipingExtension: row.antiSnipingExtension,
      ended: Boolean(row.ended),
      ipfsCid: row.ipfsCid,
      currentHighestBidder: row.currentHighestBidder,
      currentHighestBid: row.currentHighestBid ? ethers.formatEther(row.currentHighestBid) : '0',
      title: row.title,
      image: row.image,
      bidCount: row.bidCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));

    res.json(auctions);
  });
});

app.get('/api/auctions/:id', (req, res) => {
  const auctionId = parseInt(req.params.id);
  
  db.get('SELECT * FROM auctions WHERE id = ?', [auctionId], (err, auction) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Get recent bids
    db.all(`
      SELECT * FROM bids 
      WHERE auctionId = ? 
      ORDER BY timestamp DESC 
      LIMIT 10
    `, [auctionId], (err, bids) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        id: auction.id,
        seller: auction.seller,
        startTime: auction.startTime,
        endTime: auction.endTime,
        reservePrice: ethers.formatEther(auction.reservePrice),
        minIncrement: ethers.formatEther(auction.minIncrement),
        buyItNowPrice: ethers.formatEther(auction.buyItNowPrice),
        antiSnipingWindow: auction.antiSnipingWindow,
        antiSnipingExtension: auction.antiSnipingExtension,
        ended: Boolean(auction.ended),
        ipfsCid: auction.ipfsCid,
        currentHighestBidder: auction.currentHighestBidder,
        currentHighestBid: auction.currentHighestBid ? ethers.formatEther(auction.currentHighestBid) : '0',
        title: auction.title,
        image: auction.image,
        recentBids: bids.map(bid => ({
          bidder: bid.bidder,
          amount: ethers.formatEther(bid.amount),
          timestamp: bid.timestamp
        })),
        createdAt: auction.createdAt,
        updatedAt: auction.updatedAt
      });
    });
  });
});

app.get('/api/events', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  
  db.all(`
    SELECT * FROM events 
    ORDER BY timestamp DESC 
    LIMIT ?
  `, [limit], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const events = rows.map(row => ({
      id: row.id,
      type: row.type,
      auctionId: row.auctionId,
      data: JSON.parse(row.data || '{}'),
      blockNumber: row.blockNumber,
      timestamp: row.timestamp
    }));

    res.json(events);
  });
});

app.post('/api/auctions/:id/refresh', async (req, res) => {
  const auctionId = parseInt(req.params.id);
  
  try {
    const auction = await contract.getAuction(auctionId);
    const auctionData = {
      id: auctionId,
      seller: auction[0],
      startTime: auction[1],
      endTime: auction[2],
      reservePrice: auction[3].toString(),
      minIncrement: auction[4].toString(),
      buyItNowPrice: auction[5].toString(),
      antiSnipingWindow: auction[6],
      antiSnipingExtension: auction[7],
      ended: auction[8],
      ipfsCid: auction[9],
      currentHighestBidder: auction[10],
      currentHighestBid: auction[11].toString()
    };

    await upsertAuction(auctionData);
    res.json({ success: true, auctionId });
  } catch (error) {
    console.error('❌ Refresh failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Server-Sent Events endpoint
app.get('/sse', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  sseClients.add(res);
  
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📡 SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`🔗 API endpoints:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/auctions`);
  console.log(`   GET  /api/auctions/:id`);
  console.log(`   GET  /api/events`);
  console.log(`   POST /api/auctions/:id/refresh`);
});
