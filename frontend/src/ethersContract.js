// Helper to access the Auction contract from the browser via MetaMask
import { ethers } from 'ethers'

// Configure contract address here after deployment
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || window.CONTRACT_ADDRESS || ''

export const ABI = [
  // Legacy compatibility functions (for auction 0)
  'function owner() view returns (address)',
  'function highestBid() view returns (uint256)',
  'function highestBidder() view returns (address)',
  'function auctionEndTime() view returns (uint256)',
  'function ended() view returns (bool)',
  'function bid() external payable',
  'function endAuction() external',
  'function withdraw() external returns (bool)',
  // New advanced functions
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
]

export async function getProviderAndSigner(requestAccess = false) {
  if (!window.ethereum) throw new Error('MetaMask is required')
  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = requestAccess ? await provider.getSigner() : (await provider.listAccounts()).length ? await provider.getSigner() : null
  return { provider, signer }
}

export async function getContract(requestAccess = false) {
  if (!CONTRACT_ADDRESS) throw new Error('Set VITE_CONTRACT_ADDRESS in frontend or paste at window.CONTRACT_ADDRESS')
  const { provider, signer } = await getProviderAndSigner(true)
  const connected = signer || (await provider.getSigner())
  return new ethers.Contract(CONTRACT_ADDRESS, ABI, connected)
}

export async function getOwner() {
  if (!CONTRACT_ADDRESS) return null
  const { provider } = await getProviderAndSigner(false)
  const c = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider)
  return await c.owner()
}

// expose ethers to window for quick usage in App.jsx
if (typeof window !== 'undefined') {
  window.ethers = ethers
}


