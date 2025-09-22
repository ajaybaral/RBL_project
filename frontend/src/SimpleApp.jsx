import React, { useEffect, useState } from 'react';
import ConnectWallet from './components/ConnectWallet';
import SimpleAuctionDashboard from './components/SimpleAuctionDashboard';
import CreateAuction from './components/CreateAuction';
import MetaMaskSetup from './components/MetaMaskSetup';
import MetaMaskStatus from './components/MetaMaskStatus';

export default function SimpleApp() {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('auctions');
  const [showMetaMaskSetup, setShowMetaMaskSetup] = useState(false);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleAuctionCreated = () => {
    // This will trigger a refresh in the dashboard
    console.log('Auction created successfully');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="header-gradient bg-blue-600 shadow-2xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="fade-in">
              <h1 className="text-3xl font-bold text-white text-shadow-lg">
                🏆 Simple Web3 Auction Platform
              </h1>
              <p className="text-blue-100 mt-1 text-base">
                MetaMask Authentication • IPFS Metadata • English Auctions
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="glass-effect rounded-xl px-4 py-2">
                <MetaMaskStatus />
              </div>
              <div className="text-sm text-blue-100 bg-white/20 px-3 py-2 rounded-lg">
                Contract: {window.CONTRACT_ADDRESS ? `${window.CONTRACT_ADDRESS.slice(0, 6)}...${window.CONTRACT_ADDRESS.slice(-4)}` : 'Not Deployed'}
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
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Need help setting up MetaMask?
              </button>
            </div>
          )}
        </div>

        {/* Contract Address Setup */}
        {!window.CONTRACT_ADDRESS && (
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Contract Not Deployed</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Please deploy the contract first:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Run: <code className="bg-yellow-100 px-1 rounded">npx hardhat node</code></li>
                    <li>Run: <code className="bg-yellow-100 px-1 rounded">npx hardhat run scripts/deploy_simple.js --network localhost</code></li>
                    <li>Copy the contract address and set it in the browser console: <code className="bg-yellow-100 px-1 rounded">window.CONTRACT_ADDRESS = 'YOUR_ADDRESS'</code></li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8">
          <div className="glass-effect rounded-xl p-2">
            <nav className="flex space-x-2">
              <button
                onClick={() => setActiveTab('auctions')}
                className={`nav-tab ${activeTab === 'auctions' ? 'nav-tab-active' : 'nav-tab-inactive'}`}
              >
                Auctions
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`nav-tab ${activeTab === 'create' ? 'nav-tab-active' : 'nav-tab-inactive'}`}
              >
                Create Auction
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'auctions' && (
          <SimpleAuctionDashboard 
            account={account} 
            onRefresh={() => console.log('Refresh requested')}
          />
        )}

        {activeTab === 'create' && (
          <CreateAuction 
            account={account} 
            onAuctionCreated={handleAuctionCreated}
          />
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
              <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
            <p>Simple Web3 Auction Platform - Demo Version</p>
            <p className="mt-1">Built with React, Tailwind CSS, and Ethereum Smart Contracts</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
