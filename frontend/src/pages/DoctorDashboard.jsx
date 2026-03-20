import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { useWallet } from '../context/WalletContext';
import { getDoctorProfile, getDoctorPending, registerDoctor, submitAttestation } from '../services/api';

export default function DoctorDashboard() {
  const { wallet, isConnected } = useWallet();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConnected) { navigate('/'); return; }
    loadData();
  }, [isConnected]);

  const loadData = async () => {
    try {
      try {
        await registerDoctor({
          walletAddress: wallet.address,
          name: 'Dr. Demo User',
          licenceNumber: 'MED-2025-001',
          specialty: 'General Medicine',
          jurisdiction: 'Global',
        });
      } catch (e) { /* already registered */ }

      const profileRes = await getDoctorProfile(wallet.address);
      setProfile(profileRes.data);

      const pendingRes = await getDoctorPending(wallet.address);
      setPending(pendingRes.data.pendingRequests || []);
    } catch (error) {
      console.error('Failed to load:', error);
      // Demo profile
      setProfile({
        name: 'Dr. Demo User',
        specialty: 'General Medicine',
        trustScore: 85,
        totalVerifications: 142,
        earnings: 1245,
        verificationFee: 15,
        isApproved: true,
        credentialNftId: 'MVDC-12345',
      });
    }
    setLoading(false);
  };

  const handleAttest = async (requestId) => {
    try {
      await submitAttestation({
        requestId,
        doctorWallet: wallet.address,
        result: 'authentic',
        notes: 'Document verified and authentic.',
      });
      loadData();
    } catch (error) {
      console.error('Attestation failed:', error);
    }
  };

  const trustScore = profile?.trustScore || 0;
  const circumference = 2 * Math.PI * 50;
  const offset = circumference - (trustScore / 100) * circumference;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Doctor Dashboard" />

        <div className="grid-3" style={{ marginBottom: 24 }}>
          {/* Profile Card */}
          <div className="glass-card-static animate-in" style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              {/* Trust Score Ring */}
              <div className="trust-score-ring">
                <svg width="120" height="120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    stroke="url(#tealGrad)" strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                  />
                  <defs>
                    <linearGradient id="tealGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#00D4AA" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="score-text">{trustScore}</div>
              </div>

              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                  {profile?.name || 'Doctor'}
                </h2>
                <span className="badge badge-teal" style={{ marginBottom: 8, display: 'inline-flex' }}>
                  {profile?.specialty || 'General'}
                </span>
                <div style={{ display: 'flex', gap: 24, marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <div>Trust Score: <strong style={{ color: 'var(--accent-teal)' }}>{trustScore}/100</strong></div>
                  <div>Verifications: <strong>{profile?.totalVerifications || 0}</strong></div>
                  <div>Fee: <strong>{profile?.verificationFee || 0} HBAR</strong></div>
                </div>
                {profile?.credentialNftId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    <span style={{ fontSize: 16 }}>🏅</span>
                    <span style={{ fontSize: 11, color: 'var(--accent-gold)', fontWeight: 600 }}>
                      Soulbound NFT: {profile.credentialNftId}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Earnings Summary */}
          <div className="glass-card stat-card animate-in animate-delay-1">
            <div style={{ fontSize: 28, marginBottom: 8 }}>💎</div>
            <div className="stat-value">{profile?.earnings || 0}</div>
            <div className="stat-label">Total HBAR Earned</div>
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
              This Month: ~{Math.floor((profile?.earnings || 0) * 0.15)} HBAR
            </div>
          </div>
        </div>

        {/* Pending Verification Requests */}
        <div className="glass-card-static animate-in animate-delay-2" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
            ⏳ Pending Verification Requests
          </h3>
          {pending.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📋</div>
              <p>No pending verification requests</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pending.map((req) => (
                <div key={req.id} className="glass-card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>Patient: {req.patientWallet?.slice(0, 8)}...</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Record: {req.recordId} · Escrow: {req.escrowAmount} HBAR
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Submitted: {new Date(req.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => handleAttest(req.id)}>
                      ✅ Review & Attest
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid-4">
          {[
            { icon: '📊', value: profile?.totalVerifications || 0, label: 'Total Verifications' },
            { icon: '⭐', value: `${trustScore}/100`, label: 'Trust Score' },
            { icon: '💰', value: `${profile?.verificationFee || 0} HBAR`, label: 'Your Fee' },
            { icon: '🔒', value: profile?.isApproved ? 'Active' : 'Pending', label: 'Account Status' },
          ].map((stat, i) => (
            <div key={i} className={`glass-card stat-card animate-in animate-delay-${i + 1}`}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{stat.icon}</div>
              <div className="stat-value" style={{ fontSize: 22 }}>{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
