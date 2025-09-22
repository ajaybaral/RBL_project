/*
INSTALLATION & RUN INSTRUCTIONS:
1. npm install
2. npm i ethers@^6
3. npm run dev

Replace CONTRACT_ADDRESS below with your deployed contract address
Configure MetaMask to your local/testnet network
*/

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// Replace with your deployed contract address
const CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000';

// Simplified Auction Contract ABI
const ABI = [
  'function auctionsCount() view returns (uint256)',
  'function getAuction(uint256) view returns (address,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool,string,address,uint256)',
  'function createAuction(uint256,uint256,uint256,uint256,uint256,uint256,uint256,string) returns (uint256)',
  'function bid(uint256) external payable',
  'function withdraw(uint256) external returns (bool)',
  'function withdrawProceeds() external returns (bool)',
  'function endAuction(uint256) external',
  'event AuctionCreated(uint256 indexed auctionId, address indexed seller, uint256 startTime, uint256 endTime, uint256 reservePrice, string ipfsCid)',
  'event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount)',
  'event AuctionExtended(uint256 indexed auctionId, uint256 newEndTime)',
  'event BuyItNowTriggered(uint256 indexed auctionId, address indexed buyer, uint256 amount)',
  'event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 amount)',
  'event Withdrawn(address indexed who, uint256 amount)'
];

export default function App() {
  const [account, setAccount] = useState(null);
  const [network, setNetwork] = useState(null);
  const [contract, setContract] = useState(null);
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [bidAmounts, setBidAmounts] = useState({});
  
  // Create Auction Form State
  const [createForm, setCreateForm] = useState({
    ipfsCid: '',
    startDelay: '60',
    duration: '1800',
    reserve: '0.01',
    minIncrement: '0.001',
    buyItNow: '0'
  });

  // Connect to MetaMask
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        showMessage('MetaMask not installed!', 'error');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      
      setAccount(address);
      setNetwork(network.name);
      
      const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      setContract(contractInstance);
      
      showMessage('Wallet connected successfully!', 'success');
      await loadAuctions();
    } catch (error) {
      showMessage('Failed to connect wallet: ' + error.message, 'error');
    }
  };

  // Load all auctions
  const loadAuctions = async () => {
    if (!contract) return;
    
    try {
      setLoading(true);
      const count = await contract.auctionsCount();
      const auctionList = [];
      
      for (let i = 0; i < count; i++) {
        const auction = await contract.getAuction(i);
        auctionList.push({
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
        });
      }
      
      setAuctions(auctionList);
    } catch (error) {
      showMessage('Failed to load auctions: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Create new auction
  const createAuction = async (e) => {
    e.preventDefault();
    if (!contract) {
      showMessage('Please connect wallet first', 'error');
      return;
    }

    try {
      setLoading(true);
      const now = Math.floor(Date.now() / 1000);
      const startTime = now + parseInt(createForm.startDelay);
      const endTime = startTime + parseInt(createForm.duration);

      const tx = await contract.createAuction(
        startTime,
        endTime,
        ethers.parseEther(createForm.reserve),
        ethers.parseEther(createForm.minIncrement),
        ethers.parseEther(createForm.buyItNow),
        30, // antiSnipingWindow
        60, // antiSnipingExtension
        createForm.ipfsCid
      );
      
      await tx.wait();
      showMessage('Auction created successfully!', 'success');
      
      // Reset form
      setCreateForm({
        ipfsCid: '',
        startDelay: '60',
        duration: '1800',
        reserve: '0.01',
        minIncrement: '0.001',
        buyItNow: '0'
      });
      
      await loadAuctions();
    } catch (error) {
      showMessage('Failed to create auction: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Place bid
  const placeBid = async (auctionId) => {
    const bidAmount = bidAmounts[auctionId];
    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      showMessage('Please enter a valid bid amount', 'error');
      return;
    }

    try {
      setLoading(true);
      const tx = await contract.bid(auctionId, { value: ethers.parseEther(bidAmount) });
      await tx.wait();
      showMessage('Bid placed successfully!', 'success');
      setBidAmounts({ ...bidAmounts, [auctionId]: '' });
      await loadAuctions();
    } catch (error) {
      showMessage('Failed to place bid: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // End auction
  const endAuction = async (auctionId) => {
    try {
      setLoading(true);
      const tx = await contract.endAuction(auctionId);
      await tx.wait();
      showMessage('Auction ended successfully!', 'success');
      await loadAuctions();
    } catch (error) {
      showMessage('Failed to end auction: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Withdraw refund
  const withdrawRefund = async (auctionId) => {
    try {
      setLoading(true);
      const tx = await contract.withdraw(auctionId);
      await tx.wait();
      showMessage('Refund withdrawn successfully!', 'success');
      await loadAuctions();
    } catch (error) {
      showMessage('Failed to withdraw refund: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Withdraw proceeds
  const withdrawProceeds = async () => {
    try {
      setLoading(true);
      const tx = await contract.withdrawProceeds();
      await tx.wait();
      showMessage('Proceeds withdrawn successfully!', 'success');
      await loadAuctions();
    } catch (error) {
      showMessage('Failed to withdraw proceeds: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Show message
  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(''), 3000);
  };

  // Format time
  const formatTime = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Get time remaining
  const getTimeRemaining = (endTime) => {
    const now = Math.floor(Date.now() / 1000);
    const remain = Math.max(0, endTime - now);
    const hours = Math.floor(remain / 3600);
    const minutes = Math.floor((remain % 3600) / 60);
    const seconds = remain % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  // Check if auction can be ended
  const canEndAuction = (auction) => {
    const now = Math.floor(Date.now() / 1000);
    return !auction.ended && now >= auction.endTime;
  };

  // Check if user is seller
  const isSeller = (auction) => {
    return account && auction.seller.toLowerCase() === account.toLowerCase();
  };

  // Setup event listeners
  useEffect(() => {
    if (!contract) return;

    const handleAuctionCreated = () => {
      showMessage('New auction created!', 'info');
      loadAuctions();
    };

    const handleBidPlaced = () => {
      showMessage('New bid placed!', 'info');
      loadAuctions();
    };

    const handleAuctionEnded = () => {
      showMessage('Auction ended!', 'info');
      loadAuctions();
    };

    contract.on('AuctionCreated', handleAuctionCreated);
    contract.on('BidPlaced', handleBidPlaced);
    contract.on('AuctionEnded', handleAuctionEnded);

    return () => {
      contract.off('AuctionCreated', handleAuctionCreated);
      contract.off('BidPlaced', handleBidPlaced);
      contract.off('AuctionEnded', handleAuctionEnded);
    };
  }, [contract]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold">🏆 Simple Web3 Auction Platform</h1>
          <p className="mt-2">MetaMask Authentication • IPFS Metadata • English Auctions</p>
          
          {/* Wallet Status */}
          <div className="mt-4 flex items-center gap-4">
            {!account ? (
              <button 
                onClick={connectWallet}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100"
              >
                Connect MetaMask
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <span>Connected: {account.slice(0, 6)}...{account.slice(-4)}</span>
                <span>Network: {network}</span>
                <span>Contract: {CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`max-w-6xl mx-auto mt-4 p-4 rounded-lg ${
          message.type === 'error' ? 'bg-red-100 text-red-700 border border-red-200' :
          message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' :
          'bg-blue-100 text-blue-700 border border-blue-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="max-w-6xl mx-auto p-6">
        {/* Create Auction Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Create New Auction</h2>
          <form onSubmit={createAuction} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IPFS CID</label>
              <input
                type="text"
                value={createForm.ipfsCid}
                onChange={(e) => setCreateForm({...createForm, ipfsCid: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg"
                placeholder="QmYourIpfsCidHere"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Delay (seconds)</label>
              <input
                type="number"
                value={createForm.startDelay}
                onChange={(e) => setCreateForm({...createForm, startDelay: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (seconds)</label>
              <input
                type="number"
                value={createForm.duration}
                onChange={(e) => setCreateForm({...createForm, duration: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reserve Price (ETH)</label>
              <input
                type="number"
                value={createForm.reserve}
                onChange={(e) => setCreateForm({...createForm, reserve: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg"
                step="0.001"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Increment (ETH)</label>
              <input
                type="number"
                value={createForm.minIncrement}
                onChange={(e) => setCreateForm({...createForm, minIncrement: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg"
                step="0.001"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buy It Now (ETH) - 0 to disable</label>
              <input
                type="number"
                value={createForm.buyItNow}
                onChange={(e) => setCreateForm({...createForm, buyItNow: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg"
                step="0.001"
                min="0"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <button
                type="submit"
                disabled={loading || !account}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Creating...' : 'Create Auction'}
              </button>
            </div>
          </form>
        </div>

        {/* Auctions List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Auctions ({auctions.length})</h2>
            <button
              onClick={loadAuctions}
              disabled={loading}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 disabled:bg-gray-400"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {auctions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No auctions found. Create one to get started!
            </div>
          ) : (
            <div className="grid gap-6">
              {auctions.map((auction) => (
                <div key={auction.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Auction #{auction.id}</h3>
                      <p className="text-sm text-gray-600">
                        Seller: {auction.seller.slice(0, 6)}...{auction.seller.slice(-4)}
                      </p>
                      {auction.ipfsCid && (
                        <a
                          href={`https://ipfs.io/ipfs/${auction.ipfsCid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          View Item Details (IPFS)
                        </a>
                      )}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      auction.ended ? 'bg-red-100 text-red-800' : 
                      'bg-green-100 text-green-800'
                    }`}>
                      {auction.ended ? 'Ended' : 'Active'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-600">Current Bid</div>
                      <div className="font-semibold text-blue-600">
                        {(Number(auction.currentHighestBid || 0) / 1e18).toFixed(4)} ETH
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Reserve Price</div>
                      <div className="font-semibold">
                        {(Number(auction.reservePrice || 0) / 1e18).toFixed(4)} ETH
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Ends</div>
                      <div className="font-semibold text-orange-600">
                        {auction.ended ? 'Ended' : getTimeRemaining(auction.endTime)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Min Increment</div>
                      <div className="font-semibold">
                        {(Number(auction.minIncrement || 0) / 1e18).toFixed(4)} ETH
                      </div>
                    </div>
                  </div>

                  {auction.currentHighestBidder !== '0x0000000000000000000000000000000000000000' && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600">
                        Highest Bidder: {auction.currentHighestBidder.slice(0, 6)}...{auction.currentHighestBidder.slice(-4)}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {/* Place Bid */}
                    {!auction.ended && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={bidAmounts[auction.id] || ''}
                          onChange={(e) => setBidAmounts({...bidAmounts, [auction.id]: e.target.value})}
                          className="p-2 border border-gray-300 rounded-lg w-32"
                          placeholder="ETH"
                          step="0.001"
                          min="0"
                        />
                        <button
                          onClick={() => placeBid(auction.id)}
                          disabled={loading || !account}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400"
                        >
                          Place Bid
                        </button>
                      </div>
                    )}

                    {/* End Auction */}
                    {canEndAuction(auction) && (
                      <button
                        onClick={() => endAuction(auction.id)}
                        disabled={loading}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-400"
                      >
                        End Auction
                      </button>
                    )}

                    {/* Withdraw Refund */}
                    <button
                      onClick={() => withdrawRefund(auction.id)}
                      disabled={loading}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 disabled:bg-gray-400"
                    >
                      Withdraw Refund
                    </button>

                    {/* Withdraw Proceeds (Seller Only) */}
                    {isSeller(auction) && (
                      <button
                        onClick={withdrawProceeds}
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        Withdraw Proceeds
                      </button>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                    <div>Start: {formatTime(auction.startTime)}</div>
                    <div>End: {formatTime(auction.endTime)}</div>
                    {auction.buyItNowPrice > 0 && (
                      <div>Buy It Now: {(Number(auction.buyItNowPrice) / 1e18).toFixed(4)} ETH</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}