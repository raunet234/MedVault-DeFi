import { useWallet } from '../context/WalletContext';
import { useNavigate } from 'react-router-dom';

// Static wallet options — always show these
const WALLET_OPTIONS = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: '🦊',
    desc: 'Connect via MetaMask browser extension',
    installUrl: 'https://metamask.io/download/',
    color: '#E8831D',
  },
  {
    id: 'hashpack',
    name: 'HashPack',
    icon: '🟣',
    desc: 'Hedera\'s native wallet extension',
    installUrl: 'https://www.hashpack.app/download',
    color: '#8B5CF6',
  },
];

export default function WalletModal() {
  const {
    showWalletModal,
    setShowWalletModal,
    connectWithProvider,
    connecting,
    error,
    pendingRole,
    detectWallets,
  } = useWallet();
  const navigate = useNavigate();

  if (!showWalletModal) return null;

  const installedWallets = detectWallets();

  const handleSelect = async (walletId) => {
    const isInstalled = installedWallets.find(w => w.id === walletId)?.installed;

    if (!isInstalled) {
      // Open install page
      const option = WALLET_OPTIONS.find((w) => w.id === walletId);
      if (option) window.open(option.installUrl, '_blank');
      return;
    }

    const result = await connectWithProvider(walletId, pendingRole);
    if (result) {
      navigate(pendingRole === 'doctor' ? '/doctor' : '/patient');
    }
  };

  const handleClose = () => {
    if (!connecting) setShowWalletModal(false);
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 420 }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0 }}>🔗 Connect Wallet</h2>
          {!connecting && (
            <button
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: 20,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          )}
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
          Select a wallet to connect to <strong style={{ color: 'var(--accent-teal)' }}>Hedera Testnet</strong>
        </p>

        {/* Wallet Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {WALLET_OPTIONS.map((option) => {
            const walletInfo = installedWallets.find(w => w.id === option.id);
            const isInstalled = walletInfo?.installed === true;

            return (
              <button
                key={option.id}
                className="glass-card"
                onClick={() => handleSelect(option.id)}
                disabled={connecting}
                style={{
                  cursor: connecting ? 'wait' : 'pointer',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  textAlign: 'left',
                  width: '100%',
                  border: '1px solid var(--border-glass)',
                  background: 'var(--glass-bg)',
                  color: 'var(--text-primary)',
                  fontFamily: 'Inter, sans-serif',
                  opacity: connecting ? 0.6 : 1,
                }}
              >
                {/* Wallet Icon */}
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-md)',
                  background: `${option.color}22`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  flexShrink: 0,
                }}>
                  {option.icon}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
                    {option.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {option.desc}
                  </div>
                </div>

                {/* Badge — only "Detected" when actually verified, otherwise "Connect →" */}
                <div style={{ flexShrink: 0 }}>
                  {isInstalled ? (
                    <span className="badge badge-verified" style={{ fontSize: 10 }}>
                      Detected
                    </span>
                  ) : (
                    <span className="badge badge-pending" style={{ fontSize: 10 }}>
                      Install →
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Connecting Indicator */}
        {connecting && (
          <div style={{
            marginTop: 16,
            padding: '12px 16px',
            background: 'var(--accent-teal-dim)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(0, 212, 170, 0.3)',
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--accent-teal)',
          }}>
            ⏳ Approve the connection in your wallet popup...
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 16,
            padding: '12px 16px',
            background: 'rgba(232, 85, 90, 0.1)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(232, 85, 90, 0.3)',
            fontSize: 12,
            color: 'var(--accent-coral)',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Footer hint */}
        <div style={{
          marginTop: 20,
          paddingTop: 16,
          borderTop: '1px solid var(--border-subtle)',
          fontSize: 11,
          color: 'var(--text-muted)',
          textAlign: 'center',
          lineHeight: 1.6,
        }}>
          🔒 MedVault DeFi connects directly to your wallet.
          <br />We never store your private keys.
          <br /><span style={{ color: 'var(--accent-teal)' }}>Network: Hedera Testnet (Chain ID 296)</span>
        </div>
      </div>
    </div>
  );
}
