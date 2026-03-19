import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const WalletContext = createContext();

// Hedera Testnet network config
const HEDERA_TESTNET = {
  chainId: '0x128', // 296 in hex
  chainName: 'Hedera Testnet',
  nativeCurrency: { name: 'HBAR', symbol: 'HBAR', decimals: 18 },
  rpcUrls: ['https://testnet.hashio.io/api'],
  blockExplorerUrls: ['https://hashscan.io/testnet'],
};

/**
 * Check if HashPack extension is installed
 */
function isHashPackInstalled() {
  if (typeof window.hashpack !== 'undefined') return true;
  if (typeof window.hederaWallets !== 'undefined') return true;

  if (typeof window.ethereum !== 'undefined') {
    const providers = window.ethereum.providers || [];
    for (const p of providers) {
      if (p.isHashPack) return true;
      if (!p.isMetaMask && !p.isPhantom && !p.isBraveWallet && !p.isCoinbaseWallet) return true;
    }
    if (window.ethereum.isHashPack) return true;
  }
  return false;
}

/**
 * Check if MetaMask is installed (excluding Phantom imposters)
 */
function isMetaMaskInstalled() {
  if (typeof window.ethereum === 'undefined') return false;
  const providers = window.ethereum.providers || [];
  if (providers.find((p) => p.isMetaMask && !p.isPhantom)) return true;
  return window.ethereum.isMetaMask && !window.ethereum.isPhantom;
}

/**
 * Find the correct EVM provider — avoids Phantom hijack
 */
function getProvider(preferredWallet) {
  if (typeof window.ethereum === 'undefined') return null;

  const providers = window.ethereum.providers || [];

  if (preferredWallet === 'metamask') {
    const mm = providers.find((p) => p.isMetaMask && !p.isPhantom);
    if (mm) return mm;
    if (window.ethereum.isMetaMask && !window.ethereum.isPhantom) return window.ethereum;
    return null;
  }

  if (preferredWallet === 'hashpack') {
    // Try HashPack-specific provider first
    const hp = providers.find((p) => p.isHashPack);
    if (hp) return hp;
    if (window.ethereum.isHashPack) return window.ethereum;

    // Try any non-MetaMask, non-Phantom provider
    const other = providers.find((p) => !p.isPhantom && !p.isMetaMask && !p.isBraveWallet);
    if (other) return other;

    // If main ethereum isn't MetaMask or Phantom, it might be HashPack
    if (!window.ethereum.isMetaMask && !window.ethereum.isPhantom) return window.ethereum;

    // We do NOT fallback to MetaMask. If the user clicked HashPack, they want HashPack.
    return null;
  }

  // Default: any non-Phantom provider
  const nonPhantom = providers.find((p) => !p.isPhantom);
  if (nonPhantom) return nonPhantom;
  if (!window.ethereum.isPhantom) return window.ethereum;
  return null;
}

/**
 * Detect installed wallets — always show both options for Hedera dApp
 */
function detectWallets() {
  return [
    { id: 'metamask', name: 'MetaMask', icon: '🦊', installed: isMetaMaskInstalled() },
    { id: 'hashpack', name: 'HashPack', icon: '🟣', installed: isHashPackInstalled() },
  ];
}

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(() => {
    const saved = localStorage.getItem('medvault_wallet');
    return saved ? JSON.parse(saved) : null;
  });
  const [role, setRole] = useState(() => localStorage.getItem('medvault_role') || 'patient');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [pendingRole, setPendingRole] = useState(null);

  // Persist
  useEffect(() => {
    if (wallet) {
      localStorage.setItem('medvault_wallet', JSON.stringify(wallet));
    } else {
      localStorage.removeItem('medvault_wallet');
    }
  }, [wallet]);

  useEffect(() => {
    localStorage.setItem('medvault_role', role);
  }, [role]);

  // Listen for account/chain changes
  useEffect(() => {
    const provider = getProvider();
    if (!provider) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (wallet) {
        updateBalance(accounts[0], provider);
      }
    };

    const handleChainChanged = () => window.location.reload();

    provider.on('accountsChanged', handleAccountsChanged);
    provider.on('chainChanged', handleChainChanged);

    return () => {
      provider.removeListener('accountsChanged', handleAccountsChanged);
      provider.removeListener('chainChanged', handleChainChanged);
    };
  }, [wallet]);

  const updateBalance = async (address, provider) => {
    try {
      const p = provider || getProvider();
      if (!p) return;
      const balance = await p.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      const hbarBalance = (parseInt(balance, 16) / 1e18).toFixed(4);
      setWallet((prev) => ({ ...prev, address, balance: hbarBalance }));
    } catch (err) {
      console.error('Balance fetch failed:', err);
    }
  };

  /**
   * Open wallet selector modal
   */
  const initiateConnect = useCallback((selectedRole) => {
    setError(null);
    setConnecting(false);
    setPendingRole(selectedRole || null);

    // Always show wallet picker modal — let the user choose
    setShowWalletModal(true);
  }, []);

  /**
   * Connect with a specific wallet provider
   */
  const connectWithProvider = async (walletId, selectedRole) => {
    setConnecting(true);
    setError(null);
    // Keep modal open during connection — don't close it yet

    const provider = getProvider(walletId);

    if (!provider) {
      // Wallet not installed — show install links
      setError(
        walletId === 'metamask'
          ? 'MetaMask not detected. Please install MetaMask and refresh.'
          : walletId === 'hashpack'
          ? 'HashPack not detected. Please install HashPack and refresh.'
          : 'No compatible wallet found. Install MetaMask or HashPack.'
      );
      setConnecting(false);
      return null;
    }

    try {
      // Step 1: Request accounts FIRST — this triggers the wallet popup
      // (doing this before chain switch avoids the "request pending" error)
      const accounts = await provider.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned. Unlock your wallet and try again.');
      }

      // Step 2: Now switch to or add Hedera Testnet
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: HEDERA_TESTNET.chainId }],
        });
      } catch (switchError) {
        if (switchError.code === 4902 || switchError.code === -32603) {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [HEDERA_TESTNET],
          });
        } else if (switchError.code === 4001) {
          throw new Error('You rejected switching to Hedera Testnet.');
        }
        // Other errors: ignore and continue (wallet may already be on correct chain)
      }

      const address = accounts[0];

      // Step 3: Get balance
      let hbarBalance = '0.0000';
      try {
        const balance = await provider.request({
          method: 'eth_getBalance',
          params: [address, 'latest'],
        });
        hbarBalance = (parseInt(balance, 16) / 1e18).toFixed(4);
      } catch (e) {
        console.warn('Could not fetch balance:', e);
      }

      // Step 4: Get chain ID
      const chainId = await provider.request({ method: 'eth_chainId' });
      const isHederaTestnet = chainId === HEDERA_TESTNET.chainId;

      const walletData = {
        address,
        balance: hbarBalance,
        chainId,
        walletType: walletId,
        network: isHederaTestnet ? 'Hedera Testnet' : `Chain ${parseInt(chainId, 16)}`,
        isHederaTestnet,
        connectedAt: new Date().toISOString(),
      };

      if (selectedRole || pendingRole) {
        setRole(selectedRole || pendingRole);
      }

      setWallet(walletData);
      setConnecting(false);
      setShowWalletModal(false);
      setPendingRole(null);
      return walletData;

    } catch (err) {
      console.error('Connection failed:', err);
      if (err.code === 4001) {
        setError('Connection rejected. Approve the request in your wallet.');
      } else if (err.code === -32002) {
        setError('Request pending. Check your wallet popup.');
      } else {
        setError(err.message || 'Connection failed.');
      }
      setConnecting(false);
      return null;
    }
  };

  const disconnectWallet = () => {
    setWallet(null);
    setError(null);
    setConnecting(false);
    localStorage.removeItem('medvault_token');
    localStorage.removeItem('medvault_wallet');
  };

  const signMessage = async (message) => {
    if (!wallet) throw new Error('Wallet not connected');
    const provider = getProvider(wallet.walletType);
    if (!provider) throw new Error('Wallet provider not found');

    const signature = await provider.request({
      method: 'personal_sign',
      params: [message, wallet.address],
    });
    return signature;
  };

  const shortenAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <WalletContext.Provider value={{
      wallet,
      role,
      setRole,
      connecting,
      error,
      showWalletModal,
      setShowWalletModal,
      pendingRole,
      initiateConnect,
      connectWithProvider,
      disconnectWallet,
      signMessage,
      shortenAddress,
      updateBalance,
      detectWallets,
      isConnected: !!wallet,
      isHederaTestnet: wallet?.isHederaTestnet || false,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
