# Backend API Server for Simple Auction Platform

A Node.js backend that indexes the simplified Auction contract and provides REST APIs with real-time updates via Server-Sent Events.

## Required Environment Variables

```bash
RPC_URL=http://localhost:8545
CONTRACT_ADDRESS=0xYourDeployedContractAddress
PORT=4000
DB_PATH=analytics.db
IPFS_GATEWAY=https://ipfs.io/ipfs
```

## Installation & Setup

```bash
npm install
cp .env.example .env  # Edit with your values
npm run start:backend
```

## Usage

### Start Backend Server
```bash
npm run start:backend
```

### Reindex Database
```bash
npm run reindex
```

## API Endpoints

### Health Check
```bash
curl http://localhost:4000/api/health
```

### Get All Auctions
```bash
curl http://localhost:4000/api/auctions
```

### Get Specific Auction
```bash
curl http://localhost:4000/api/auctions/0
```

### Get Recent Events
```bash
curl http://localhost:4000/api/events
```

### Refresh Auction Data
```bash
curl -X POST http://localhost:4000/api/auctions/0/refresh
```

## Real-time Updates (SSE)

Connect to Server-Sent Events for real-time updates:

```javascript
const eventSource = new EventSource('http://localhost:4000/sse');
eventSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Real-time update:', data);
};
```

## Features

- **Automatic Indexing**: Indexes all auctions on startup
- **Event Listening**: Real-time blockchain event monitoring
- **IPFS Metadata**: Fetches and caches item metadata
- **SQLite Database**: Persistent storage with automatic table creation
- **ETH Conversion**: Converts wei to ETH in API responses
- **CORS Enabled**: Ready for frontend integration
