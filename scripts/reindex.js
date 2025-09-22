// Reindex script for simplified Auction contract
require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { ethers } = require('ethers');
const fetch = require('node-fetch');

const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const DB_PATH = process.env.DB_PATH || 'analytics.db';
const IPFS_GATEWAY = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs';

if (!CONTRACT_ADDRESS) {
  console.error('❌ CONTRACT_ADDRESS environment variable is required');
  process.exit(1);
}

// Contract ABI
const ABI = [
  'function auctionsCount() view returns (uint256)',
  'function getAuction(uint256) view returns (address,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool,string,address,uint256)'
];

// Initialize database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database:', DB_PATH);
  reindex();
});

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

// Upsert auction data
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

// Main reindex function
async function reindex() {
  try {
    console.log('🔄 Starting reindexing process...');
    
    // Initialize contract connection
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    
    // Test connection
    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ Connected to blockchain at block ${blockNumber}`);
    console.log(`✅ Contract address: ${CONTRACT_ADDRESS}`);
    
    // Get auction count
    const auctionsCount = await contract.auctionsCount();
    console.log(`📊 Found ${auctionsCount} auctions to reindex`);

    if (auctionsCount === 0) {
      console.log('ℹ️ No auctions found to reindex');
      db.close();
      return;
    }

    // Process each auction
    for (let i = 0; i < auctionsCount; i++) {
      try {
        console.log(`🔄 Processing auction ${i}...`);
        
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
        
        // Small delay to avoid overwhelming the network
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Error processing auction ${i}:`, error.message);
        // Continue with next auction
      }
    }

    console.log('✅ Reindexing completed successfully');
    
    // Show summary
    db.get('SELECT COUNT(*) as count FROM auctions', (err, row) => {
      if (err) {
        console.error('❌ Error getting count:', err);
      } else {
        console.log(`📊 Total auctions in database: ${row.count}`);
      }
      db.close();
    });
    
  } catch (error) {
    console.error('❌ Reindexing failed:', error);
    db.close();
    process.exit(1);
  }
}
