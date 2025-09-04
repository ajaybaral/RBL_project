import React, { useState, useEffect } from 'react';

export default function MetaMaskStatus() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [network, setNetwork] = useState(null);
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    checkMetaMaskStatus();
    
    if (window.ethereum) {
      // Listen for account changes
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      // Listen for network changes
      window.ethereum.on('chainChanged', handleChainChanged);
      
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  const checkMetaMaskStatus = async () => {
    if (typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask) {
      setIsInstalled(true);
      
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts && accounts[0]) {
          setIsConnected(true);
          setAccount(accounts[0]);
          await getNetworkInfo();
          await getBalance(accounts[0]);
        }
      } catch (error) {
        console.error('Error checking MetaMask status:', error);
      }
    } else {
      setIsInstalled(false);
    }
  };

  const handleAccountsChanged = async (accounts) => {
    if (accounts && accounts[0]) {
      setIsConnected(true);
      setAccount(accounts[0]);
      await getBalance(accounts[0]);
    } else {
      setIsConnected(false);
      setAccount(null);
      setBalance(null);
    }
  };

  const handleChainChanged = async (chainId) => {
    await getNetworkInfo();
  };

  const getNetworkInfo = async () => {
    if (!window.ethereum) return;
    
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const networkName = getNetworkName(chainId);
      setNetwork({ chainId, name: networkName });
    } catch (error) {
      console.error('Error getting network info:', error);
    }
  };

  const getBalance = async (address) => {
    if (!window.ethereum || !address) return;
    
    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      });
      const balanceInEth = (parseInt(balance, 16) / 1e18).toFixed(4);
      setBalance(balanceInEth);
    } catch (error) {
      console.error('Error getting balance:', error);
    }
  };

  const getNetworkName = (chainId) => {
    const networks = {
      '0x1': 'Ethereum Mainnet',
      '0x3': 'Ropsten Testnet',
      '0x4': 'Rinkeby Testnet',
      '0x5': 'Goerli Testnet',
      '0xaa36a7': 'Sepolia Testnet',
      '0x7a69': 'Localhost (Hardhat)',
      '0x539': 'Localhost (Ganache)'
    };
    return networks[chainId] || `Unknown Network (${chainId})`;
  };

  if (!isInstalled) {
    return (
      <div className="flex items-center space-x-2 text-red-600">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span className="text-sm font-medium">MetaMask not installed</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex items-center space-x-2 text-yellow-600">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span className="text-sm font-medium">MetaMask not connected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-green-600">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="flex items-center space-x-1">
        <span className="text-sm font-medium">MetaMask connected</span>
        {account && (
          <span className="text-xs text-gray-500">
            ({account.slice(0, 6)}...{account.slice(-4)})
          </span>
        )}
        {balance && (
          <span className="text-xs text-gray-500">
            - {balance} ETH
          </span>
        )}
      </div>
    </div>
  );
}
