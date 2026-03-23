import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { initiateConnect, connecting, error, isConnected, wallet } = useWallet();

  // If already connected, navigate to dashboard
  const handleRole = (selectedRole) => {
    if (isConnected) {
      navigate(selectedRole === 'doctor' ? '/doctor' : '/patient');
      return;
    }
    initiateConnect(selectedRole);
  };

  return (
    <div className="landing-page">
      {/* Hero */}
      <section className="hero-section">
        <div className="hero-logo animate-in">
          <span style={{ color: 'var(--accent-gold)' }}>Med</span>
          <span style={{ color: 'var(--accent-coral)' }}>Vault</span>
          <span style={{ color: 'var(--text-primary)' }}> DeFi</span>
        </div>
        <p className="hero-tagline animate-in animate-delay-1">
          Your Health Data, Verified on Chain. Owned by You.
        </p>

        <div className="hero-actions animate-in animate-delay-2">
          <button
            className="btn btn-primary btn-lg"
            onClick={() => handleRole('patient')}
            disabled={connecting}
          >
            {connecting ? '⏳ Connecting...' : '🩺 I\'m a Patient'}
          </button>
          <button
            className="btn btn-secondary btn-lg"
            onClick={() => handleRole('doctor')}
            disabled={connecting}
          >
            {connecting ? '⏳ Connecting...' : '👨‍⚕️ I\'m a Doctor'}
          </button>
        </div>

        {/* Connected indicator */}
        {isConnected && wallet && (
          <div className="animate-in" style={{
            padding: '10px 24px',
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 'var(--radius-pill)',
            color: 'var(--accent-green)',
            fontSize: 13,
            marginBottom: 24,
          }}>
            ✅ Connected: {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)} — {wallet.balance} HBAR
          </div>
        )}

        <div className="hero-stats animate-in animate-delay-3">
          <div className="hero-stat">
            <div className="value">4</div>
            <div className="label">Test Records Anchored</div>
          </div>
          <div className="hero-stat">
            <div className="value">3</div>
            <div className="label">Hedera Services Used</div>
          </div>
          <div className="hero-stat">
            <div className="value">3-5s</div>
            <div className="label">Hedera Finality</div>
          </div>
          <div className="hero-stat">
            <div className="value">$0.001</div>
            <div className="label">Avg. Tx Fee</div>
          </div>
          <span className="badge badge-teal" style={{ marginLeft: 12, alignSelf: 'center' }}>
            🟢 Live on Hedera Testnet
          </span>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <h2 className="animate-in">
          Why <span style={{ color: 'var(--accent-teal)' }}>MedVault</span>?
        </h2>
        <div className="grid-4">
          {[
            {
              icon: '🔐',
              title: 'Upload & Encrypt',
              desc: 'Your medical records are encrypted with AES-256 before leaving your browser. MedVault never sees your raw data.',
            },
            {
              icon: '✅',
              title: 'Doctor Verification',
              desc: 'Verified doctors review and attest to your records on-chain. Every attestation is immutable on Hedera.',
            },
            {
              icon: '💰',
              title: 'Data Marketplace',
              desc: 'Sell your verified records to researchers. You receive 92% of every sale, directly to your wallet.',
            },
            {
              icon: '⚡',
              title: 'Hedera Powered',
              desc: 'Built on Hedera Hashgraph — 3-5s finality, carbon-negative, and predictable fees under $0.01.',
            },
          ].map((f, i) => (
            <div key={i} className={`glass-card feature-card animate-in animate-delay-${i + 1}`}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <h2 className="animate-in">How It Works</h2>
        <div className="steps-flow animate-in animate-delay-1">
          {[
            { num: 1, label: 'Submit Record' },
            { num: 2, label: 'Doctor Reviews' },
            { num: 3, label: 'On-Chain Attestation' },
            { num: 4, label: 'Fee Settlement' },
            { num: 5, label: 'Record Sealed ✓' },
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="step-item">
                <div className="step-number">{step.num}</div>
                <div className="step-label">{step.label}</div>
              </div>
              {i < 4 && <span className="step-arrow">→</span>}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-links">
          <button className="btn btn-sm">📖 Docs</button>
          <button className="btn btn-sm">🌐 About</button>
          <button className="btn btn-sm">🐦 Twitter</button>
          <button className="btn btn-sm">💬 Discord</button>
        </div>
        <div className="footer-text">
          MedVault DeFi — Built for Hedera Hackathon 2025 &nbsp;|&nbsp;
          Trustless Health Data. Verified on Chain. Owned by You.
        </div>
      </footer>
    </div>
  );
}
