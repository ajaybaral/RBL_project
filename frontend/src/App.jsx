import React, { useEffect, useState } from 'react';
import ConnectWallet from './components/ConnectWallet';
import AuctionCard from './components/AuctionCard';
import MetaMaskSetup from './components/MetaMaskSetup';
import MetaMaskStatus from './components/MetaMaskStatus';
import { auctionAPI } from './services/api';

export default function App() {
  const [account, setAccount] = useState(null);
  const [owner, setOwner] = useState(null);
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('auctions');
  const [showMetaMaskSetup, setShowMetaMaskSetup] = useState(false);

  // Refresh auction data
  const refreshAuctions = async () => {
    try {
      setError(null);
      const response = await auctionAPI.getAuctions();
      setAuctions(response.data.items || []);
    } catch (err) {
      setError('Failed to load auctions. Make sure the backend is running.');
      console.error('Error loading auctions:', err);
    }
  };

  // Get legacy auction state (auction 0)
  const refreshLegacyState = async () => {
    try {
      const response = await auctionAPI.getState();
      const legacyAuction = {
        auctionId: 0,
        auctionType: 0,
        highestBid: response.data.highestBid,
        highestBidder: response.data.highestBidder,
        biddingEndTime: response.data.endTime,
        ended: response.data.ended,
        active: !response.data.ended && response.data.endTime > Math.floor(Date.now() / 1000),
        reservePrice: '0',
        minIncrement: '0',
        buyItNowPrice: '0',
        nftAddress: '0x0000000000000000000000000000000000000000',
        tokenId: '0',
        tokenAmount: '0'
      };
      
      // Update or add legacy auction to the list
      setAuctions(prev => {
        const filtered = prev.filter(a => a.auctionId !== 0);
        return [legacyAuction, ...filtered];
      });
    } catch (err) {
      console.error('Error loading legacy state:', err);
    }
  };

  // Place bid on auction
  const placeBid = async (auctionId, amount) => {
    if (!account) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      setError(null);
      await auctionAPI.placeBid(auctionId, { bidEth: amount });
      await refreshAuctions();
      await refreshLegacyState();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to place bid');
      console.error('Error placing bid:', err);
    } finally {
      setLoading(false);
    }
  };

  // End auction
  const endAuction = async (auctionId) => {
    if (!account) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      setError(null);
      await auctionAPI.endAuction(auctionId);
      await refreshAuctions();
      await refreshLegacyState();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to end auction');
      console.error('Error ending auction:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    refreshAuctions();
    refreshLegacyState();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      refreshAuctions();
      refreshLegacyState();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Get owner address (simplified - in real app, this would come from backend)
  useEffect(() => {
    // For demo purposes, we'll use the first account as owner
    // In a real app, this would be fetched from the contract
    if (account) {
      setOwner(account);
    }
  }, [account]);

  const activeAuctions = auctions.filter(a => a.active);
  const endedAuctions = auctions.filter(a => a.ended);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="header-gradient shadow-2xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-8">
            <div className="fade-in">
              <h1 className="text-4xl font-bold text-white text-shadow-lg animate-float">
                🏆 Advanced E-Auction Platform
              </h1>
              <p className="text-blue-100 mt-2 text-lg font-medium">
                Multi-Strategy Blockchain Auction System
              </p>
            </div>
            <div className="flex items-center space-x-6">
              <div className="glass-effect rounded-xl px-4 py-2">
                <MetaMaskStatus />
              </div>
              <div className="text-sm text-blue-100 bg-white/20 px-3 py-2 rounded-lg">
                Contract: 0x5FbDB...80aa3
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Wallet Connection */}
        <div className="mb-8">
          <ConnectWallet onConnected={setAccount} />
          
          {/* MetaMask Setup Button */}
          {!account && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowMetaMaskSetup(true)}
                className="text-sm text-primary-600 hover:text-primary-800 underline"
              >
                Need help setting up MetaMask?
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="glass-effect rounded-xl p-2">
            <nav className="flex space-x-2">
              <button
                onClick={() => setActiveTab('auctions')}
                className={`nav-tab ${activeTab === 'auctions' ? 'nav-tab-active' : 'nav-tab-inactive'}`}
              >
                All Auctions ({auctions.length})
              </button>
              <button
                onClick={() => setActiveTab('active')}
                className={`nav-tab ${activeTab === 'active' ? 'nav-tab-active' : 'nav-tab-inactive'}`}
              >
                Active ({activeAuctions.length})
              </button>
              <button
                onClick={() => setActiveTab('ended')}
                className={`nav-tab ${activeTab === 'ended' ? 'nav-tab-active' : 'nav-tab-inactive'}`}
              >
                Ended ({endedAuctions.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {activeTab === 'auctions' && 'All Auctions'}
            {activeTab === 'active' && 'Active Auctions'}
            {activeTab === 'ended' && 'Ended Auctions'}
          </h2>
          <button
            onClick={() => {
              refreshAuctions();
              refreshLegacyState();
            }}
            disabled={loading}
            className="btn-secondary flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>

        {/* Auctions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {(() => {
            let displayAuctions = [];
            switch (activeTab) {
              case 'active':
                displayAuctions = activeAuctions;
                break;
              case 'ended':
                displayAuctions = endedAuctions;
                break;
              default:
                displayAuctions = auctions;
            }

            if (displayAuctions.length === 0) {
              return (
                <div className="col-span-full text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No auctions found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {activeTab === 'active' && 'No active auctions at the moment.'}
                    {activeTab === 'ended' && 'No ended auctions yet.'}
                    {activeTab === 'auctions' && 'No auctions have been created yet.'}
                  </p>
                </div>
              );
            }

            return displayAuctions.map((auction) => (
              <AuctionCard
                key={auction.auctionId}
                auction={auction}
                onBid={placeBid}
                onEnd={endAuction}
                loading={loading}
                account={account}
                owner={owner}
              />
            ));
          })()}
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
              <svg className="animate-spin h-5 w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-gray-700">Processing transaction...</span>
            </div>
          </div>
        )}
      </main>

      {/* MetaMask Setup Modal */}
      {showMetaMaskSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">MetaMask Setup Guide</h2>
              <button
                onClick={() => setShowMetaMaskSetup(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <MetaMaskSetup />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500 text-sm">
            <p>Advanced E-Auction Platform - Research-Grade Blockchain Auction System</p>
            <p className="mt-1">Built with React, Tailwind CSS, and Ethereum Smart Contracts</p>
          </div>
        </div>
      </footer>
    </div>
  );
}