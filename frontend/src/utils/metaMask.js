// MetaMask utility functions for transaction handling

export const isMetaMaskInstalled = () => {
  return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
};

export const getCurrentAccount = async () => {
  if (!isMetaMaskInstalled()) return null;
  
  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    return accounts[0] || null;
  } catch (error) {
    console.error('Error getting current account:', error);
    return null;
  }
};

export const getCurrentNetwork = async () => {
  if (!isMetaMaskInstalled()) return null;
  
  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    return chainId;
  } catch (error) {
    console.error('Error getting current network:', error);
    return null;
  }
};

export const switchToLocalhost = async () => {
  if (!isMetaMaskInstalled()) return false;
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x7a69' }],
    });
    return true;
  } catch (switchError) {
    // If the network doesn't exist, add it
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x7a69',
            chainName: 'Localhost',
            rpcUrls: ['http://localhost:8545'],
            nativeCurrency: {
              name: 'Ethereum',
              symbol: 'ETH',
              decimals: 18
            }
          }]
        });
        return true;
      } catch (addError) {
        console.error('Error adding localhost network:', addError);
        return false;
      }
    }
    return false;
  }
};

export const getBalance = async (address) => {
  if (!isMetaMaskInstalled() || !address) return null;
  
  try {
    const balance = await window.ethereum.request({
      method: 'eth_getBalance',
      params: [address, 'latest']
    });
    return (parseInt(balance, 16) / 1e18).toFixed(4);
  } catch (error) {
    console.error('Error getting balance:', error);
    return null;
  }
};

export const sendTransaction = async (transaction) => {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask not installed');
  }
  
  try {
    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [transaction]
    });
    return txHash;
  } catch (error) {
    console.error('Error sending transaction:', error);
    throw error;
  }
};

export const signMessage = async (message, account) => {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask not installed');
  }
  
  try {
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, account]
    });
    return signature;
  } catch (error) {
    console.error('Error signing message:', error);
    throw error;
  }
};

export const formatAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatBalance = (balance) => {
  if (!balance) return '0.0000';
  return parseFloat(balance).toFixed(4);
};

export const getNetworkName = (chainId) => {
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

export const isLocalhost = (chainId) => {
  return chainId === '0x7a69' || chainId === '0x539';
};

export const waitForTransaction = async (txHash) => {
  if (!isMetaMaskInstalled()) return null;
  
  try {
    const receipt = await window.ethereum.request({
      method: 'eth_getTransactionReceipt',
      params: [txHash]
    });
    return receipt;
  } catch (error) {
    console.error('Error waiting for transaction:', error);
    return null;
  }
};

export const estimateGas = async (transaction) => {
  if (!isMetaMaskInstalled()) return null;
  
  try {
    const gasEstimate = await window.ethereum.request({
      method: 'eth_estimateGas',
      params: [transaction]
    });
    return gasEstimate;
  } catch (error) {
    console.error('Error estimating gas:', error);
    return null;
  }
};

export const getGasPrice = async () => {
  if (!isMetaMaskInstalled()) return null;
  
  try {
    const gasPrice = await window.ethereum.request({
      method: 'eth_gasPrice'
    });
    return gasPrice;
  } catch (error) {
    console.error('Error getting gas price:', error);
    return null;
  }
};
