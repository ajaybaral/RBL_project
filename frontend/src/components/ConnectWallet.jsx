import React, { useEffect, useState } from 'react';
import { 
  isMetaMaskInstalled, 
  getCurrentAccount, 
  getCurrentNetwork, 
  getBalance, 
  switchToLocalhost,
  getNetworkName 
} from '../utils/metaMask';

// Global guard to prevent parallel MetaMask prompts across components/tabs in the app
if (typeof window !== 'undefined' && window.__ethRequestPending === undefined) {
  window.__ethRequestPending = false;
}

export default function ConnectWallet({ onConnected }) {
  const [account, setAccount] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [network, setNetwork] = useState(null);
  const [balance, setBalance] = useState(null);

  // Get network information
  const getNetworkInfo = async () => {
    if (!isMetaMaskInstalled()) return;
    
    try {
      const chainId = await getCurrentNetwork();
      const networkName = getNetworkName(chainId);
      setNetwork({ chainId, name: networkName });
    } catch (err) {
      console.error('Error getting network info:', err);
    }
  };

  // Get account balance
  const getAccountBalance = async (address) => {
    if (!address) return;
    
    try {
      const balanceInEth = await getBalance(address);
      setBalance(balanceInEth);
    } catch (err) {
      console.error('Error getting balance:', err);
    }
  };

  async function connect() {
    if (window.__ethRequestPending || isConnecting) {
      // Prevent spamming requests while a prompt is open
      setError('MetaMask is already processing a connection request. Please complete it in the extension.');
      return;
    }

    setIsConnecting(true);
    window.__ethRequestPending = true;
    setError(null);
    
    try {
      if (!isMetaMaskInstalled()) {
        setError('MetaMask not detected. Please install the MetaMask extension and refresh.');
        window.open('https://metamask.io/download/', '_blank', 'noopener');
        return;
      }

      // If an account is already connected, short-circuit
      const existing = await window.ethereum.request({ method: 'eth_accounts' });
      if (existing && existing[0]) {
        setAccount(existing[0]);
        onConnected && onConnected(existing[0]);
        await getNetworkInfo();
        await getAccountBalance(existing[0]);
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts && accounts[0]) {
        setAccount(accounts[0]);
        onConnected && onConnected(accounts[0]);
        await getNetworkInfo();
        await getAccountBalance(accounts[0]);
      }
    } catch (err) {
      // Handle MetaMask "request already pending" error more clearly
      // -32002 per EIP-1474 (resource unavailable / request already pending)
      if (err && (err.code === -32002 || String(err.message || '').toLowerCase().includes('already processing'))) {
        setError('A MetaMask connection request is already open. Open the MetaMask extension and approve/deny it, then try again.');
      } else {
        setError(err?.message || 'Failed to connect wallet');
      }
      console.error('Wallet connection error:', err);
    } finally {
      setIsConnecting(false);
      window.__ethRequestPending = false;
    }
  }

  useEffect(() => {
    if (!isMetaMaskInstalled()) return;
    
    // Check if already connected
    window.ethereum.request({ method: 'eth_accounts' }).then(async (accs) => {
      if (accs && accs[0]) {
        setAccount(accs[0]);
        onConnected && onConnected(accs[0]);
        await getNetworkInfo();
        await getAccountBalance(accs[0]);
      }
    });

    // Listen for account changes
    const handleAccountsChanged = async (accs) => {
      setAccount(accs[0] || null);
      onConnected && onConnected(accs[0] || null);
      if (accs[0]) {
        await getAccountBalance(accs[0]);
      } else {
        setBalance(null);
      }
    };
    
    // Listen for network changes
    const handleChainChanged = (chainId) => {
      const networkName = getNetworkName(chainId);
      setNetwork({ chainId, name: networkName });
    };
    
    window.ethereum.on && window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on && window.ethereum.on('chainChanged', handleChainChanged);
    
    return () => {
      window.ethereum.removeListener && window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener && window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [onConnected]);

  if (account) {
    return (
      <div className="space-y-4">
        {/* Connected Status */}
        <div className="glass-effect rounded-xl p-6 border-2 border-green-200">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="w-4 h-4 bg-green-400 rounded-full animate-pulse shadow-lg"></div>
            </div>
            <div className="flex-1">
              <p className="text-lg font-bold text-green-800">Wallet Connected</p>
              <p className="text-sm text-green-600 font-mono bg-green-100 px-3 py-1 rounded-lg">{account.slice(0, 6)}...{account.slice(-4)}</p>
              {balance && (
                <p className="text-sm text-green-600 font-semibold mt-1">Balance: {balance} ETH</p>
              )}
            </div>
            <button
              onClick={() => { setAccount(null); setBalance(null); onConnected && onConnected(null); }}
              className="btn-secondary text-sm"
              type="button"
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* Network Status */}
        {network && (
          <div className={`p-3 rounded-lg border ${
            network.chainId === '0x7a69' || network.chainId === '0x539' ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  network.chainId === '0x7a69' || network.chainId === '0x539' ? 'text-blue-800' : 'text-yellow-800'
                }`}>Network: {network.name}</p>
                <p className={`text-xs ${
                  network.chainId === '0x7a69' || network.chainId === '0x539' ? 'text-blue-600' : 'text-yellow-600'
                }`}>Chain ID: {network.chainId}</p>
              </div>
              {(network.chainId !== '0x7a69' && network.chainId !== '0x539') && (
                <button onClick={switchToLocalhost} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded" type="button">Switch to Localhost</button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {!isMetaMaskInstalled() && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">MetaMask not detected. Please install MetaMask extension.</p>
              <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="text-sm text-yellow-600 hover:text-yellow-800 underline">Download MetaMask</a>
            </div>
          </div>
        </div>
      )}
      
      <button
        onClick={connect}
        disabled={isConnecting || window.__ethRequestPending}
        className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        type="button"
      >
        {isConnecting || window.__ethRequestPending ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Waiting for MetaMask...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Connect MetaMask
          </>
        )}
      </button>
    </div>
  );
}