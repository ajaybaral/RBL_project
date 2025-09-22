// Helper to access the simplified Auction contract from the browser via MetaMask
import { ethers } from 'ethers'

// Configure contract address here after deployment
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || window.CONTRACT_ADDRESS || ''

export const ABI = [
  // Core auction functions
  'function auctionsCount() view returns (uint256)',
  'function auctions(uint256) view returns (address seller,uint256 startTime,uint256 endTime,uint256 reservePrice,uint256 minIncrement,uint256 buyItNowPrice,uint256 antiSnipingWindow,uint256 antiSnipingExtension,bool ended,string ipfsCid)',
  'function highestBidder(uint256) view returns (address)',
  'function highestBid(uint256) view returns (uint256)',
  'function pendingReturns(uint256,address) view returns (uint256)',
  'function sellerProceeds(address) view returns (uint256)',
  
  // Auction management
  'function createAuction(uint256,uint256,uint256,uint256,uint256,uint256,uint256,string) returns (uint256)',
  'function bid(uint256) external payable',
  'function withdraw(uint256) external returns (bool)',
  'function withdrawProceeds() external returns (bool)',
  'function endAuction(uint256) external',
  'function getAuction(uint256) view returns (address,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool,string,address,uint256)',
  
  // Events
  'event AuctionCreated(uint256 indexed auctionId, address indexed seller, uint256 startTime, uint256 endTime, uint256 reservePrice, string ipfsCid)',
  'event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount)',
  'event AuctionExtended(uint256 indexed auctionId, uint256 newEndTime)',
  'event BuyItNowTriggered(uint256 indexed auctionId, address indexed buyer, uint256 amount)',
  'event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 amount)',
  'event Withdrawn(address indexed who, uint256 amount)'
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

// Utility functions for the simplified contract
export async function getAllAuctions() {
  if (!CONTRACT_ADDRESS) return []
  const { provider } = await getProviderAndSigner(false)
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider)
  
  try {
    const count = await contract.auctionsCount()
    const auctions = []
    
    for (let i = 0; i < count; i++) {
      const auction = await contract.getAuction(i)
      auctions.push({
        id: i,
        seller: auction[0],
        startTime: auction[1],
        endTime: auction[2],
        reservePrice: auction[3],
        minIncrement: auction[4],
        buyItNowPrice: auction[5],
        antiSnipingWindow: auction[6],
        antiSnipingExtension: auction[7],
        ended: auction[8],
        ipfsCid: auction[9],
        currentHighestBidder: auction[10],
        currentHighestBid: auction[11]
      })
    }
    
    return auctions
  } catch (error) {
    console.error('Error fetching auctions:', error)
    return []
  }
}

export async function createAuction(
  startTime,
  endTime,
  reservePrice,
  minIncrement,
  buyItNowPrice,
  antiSnipingWindow,
  antiSnipingExtension,
  ipfsCid
) {
  const contract = await getContract(true)
  const tx = await contract.createAuction(
    startTime,
    endTime,
    reservePrice,
    minIncrement,
    buyItNowPrice,
    antiSnipingWindow,
    antiSnipingExtension,
    ipfsCid
  )
  await tx.wait()
  return tx
}

export async function placeBid(auctionId, bidAmount) {
  const contract = await getContract(true)
  const tx = await contract.bid(auctionId, { value: ethers.parseEther(bidAmount.toString()) })
  await tx.wait()
  return tx
}

export async function withdrawRefund(auctionId) {
  const contract = await getContract(true)
  const tx = await contract.withdraw(auctionId)
  await tx.wait()
  return tx
}

export async function withdrawSellerProceeds() {
  const contract = await getContract(true)
  const tx = await contract.withdrawProceeds()
  await tx.wait()
  return tx
}

export async function endAuction(auctionId) {
  const contract = await getContract(true)
  const tx = await contract.endAuction(auctionId)
  await tx.wait()
  return tx
}

// expose ethers to window for quick usage in App.jsx
if (typeof window !== 'undefined') {
  window.ethers = ethers
}