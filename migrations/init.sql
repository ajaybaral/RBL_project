-- Database schema for Simple Auction Platform
-- This file is for reference - tables are created automatically by the backend

-- Auctions table
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

-- Bids table
CREATE TABLE IF NOT EXISTS bids (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  auctionId INTEGER NOT NULL,
  bidder TEXT NOT NULL,
  amount TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (auctionId) REFERENCES auctions (id)
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  auctionId INTEGER NOT NULL,
  data TEXT,
  blockNumber INTEGER,
  timestamp INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_auctions_ended ON auctions(ended);
CREATE INDEX IF NOT EXISTS idx_auctions_seller ON auctions(seller);
CREATE INDEX IF NOT EXISTS idx_bids_auctionId ON bids(auctionId);
CREATE INDEX IF NOT EXISTS idx_bids_bidder ON bids(bidder);
CREATE INDEX IF NOT EXISTS idx_events_auctionId ON events(auctionId);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
