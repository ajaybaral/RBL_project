import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const auctionAPI = {
  // Get legacy auction state (auction 0)
  getState: () => api.get('/state'),
  
  // Get all auctions
  getAuctions: () => api.get('/auctions'),
  
  // Get auction history
  getHistory: (auctionId) => api.get(`/history/${auctionId}`),
  
  // Get analytics
  getAnalytics: () => api.get('/analytics'),
  
  // Create new auction
  createAuction: (auctionData) => api.post('/create-auction', auctionData),
  
  // Place bid on specific auction
  placeBid: (auctionId, bidData) => api.post(`/bid/${auctionId}`, bidData),
  
  // End auction
  endAuction: (auctionId) => api.post(`/end/${auctionId}`),
  
  // Commit sealed bid
  commitBid: (auctionId, commitment) => api.post(`/commit/${auctionId}`, { commitment }),
  
  // Reveal sealed bid
  revealBid: (auctionId, revealData) => api.post(`/reveal/${auctionId}`, revealData),
  
  // Accept Dutch auction
  acceptDutch: (auctionId) => api.post(`/accept-dutch/${auctionId}`),
  
  // Set NFT for auction
  setNFT: (auctionId, nftData) => api.post(`/set-nft/${auctionId}`, nftData),
  
  // Set auction metadata
  setMetadata: (auctionId, metadata) => api.post(`/set-meta/${auctionId}`, metadata),
  
  // Verify identity
  verifyIdentity: (signature) => api.post('/verify', signature),
  
  // IPFS operations
  pinToIPFS: (metadata) => api.post('/pin', metadata),
  unpinFromIPFS: (cid) => api.post('/unpin', { cid }),
};

export default api;
