import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { useWallet } from '../context/WalletContext';
import { getPatientRecords, registerPatient } from '../services/api';
import { fetchTopicMessages } from '../services/mirrorNode';

export default function PatientDashboard() {
  const { wallet, isConnected } = useWallet();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hcsTopicInput, setHcsTopicInput] = useState('');
  const [hcsMessages, setHcsMessages] = useState([]);
  const [hcsLoading, setHcsLoading] = useState(false);
  const [hcsError, setHcsError] = useState('');

  useEffect(() => {
    if (!isConnected) { navigate('/'); return; }
    loadData();
  }, [isConnected]);

  const loadData = async () => {
    try {
      // Try to register first (idempotent)
      try {
        await registerPatient({
          walletAddress: wallet.address,
          name: 'Patient User',
          country: 'Global',
        });
      } catch (e) { /* already registered */ }

      const res = await getPatientRecords(wallet.address);
      setRecords(res.data.records || []);
      setProfile(res.data.patient || {});
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  };

  const verified = records.filter((r) => r.verificationStatus === 'verified').length;
  const pending = records.filter((r) => r.verificationStatus === 'pending').length;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Patient Dashboard" />

        {/* Welcome Card */}
        <div className="glass-card-static animate-in" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                Welcome back, {profile?.name || 'Patient'}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                DID: {profile?.did || `did:hedera:testnet:${wallet?.address?.slice(0, 12)}...`}
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/patient/upload')}>
              📤 Upload New Record
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          {[
            { value: records.length, label: 'Total Records', icon: '📄' },
            { value: verified, label: 'Verified', icon: '✅' },
            { value: pending, label: 'Pending', icon: '⏳' },
            { value: `${profile?.earnings || 0} HBAR`, label: 'Earned', icon: '💎' },
          ].map((stat, i) => (
            <div key={i} className={`glass-card stat-card animate-in animate-delay-${i + 1}`}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>{stat.icon}</div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Records Table */}
        <div className="glass-card-static animate-in animate-delay-2">
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>📋 My Records</h3>
          {records.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📂</div>
              <p>No records yet. Upload your first medical record!</p>
              <button
                className="btn btn-primary"
                style={{ marginTop: 16 }}
                onClick={() => navigate('/patient/upload')}
              >
                Upload Record
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>IPFS CID</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {record.fileName}
                      </td>
                      <td>
                        <span className="badge badge-teal">{record.documentType}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${record.verificationStatus}`}>
                          {record.verificationStatus === 'verified' && '✓ '}
                          {record.verificationStatus === 'pending' && '⏳ '}
                          {record.verificationStatus}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {record.ipfsCid?.slice(0, 12)}...
                      </td>
                      <td>{new Date(record.uploadedAt).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {record.verificationStatus === 'unverified' && (
                            <button className="btn btn-sm btn-primary">Verify</button>
                          )}
                          {record.verificationStatus === 'verified' && !record.isListed && (
                            <button className="btn btn-sm">List on Market</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* HCS Explorer */}
        <div className="glass-card-static animate-in animate-delay-3" style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>🔗 HCS Explorer</h3>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <input
              type="text"
              className="input"
              placeholder="Enter HCS Topic ID (e.g. 0.0.12345)"
              value={hcsTopicInput}
              onChange={(e) => setHcsTopicInput(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary"
              disabled={hcsLoading || !hcsTopicInput.trim()}
              onClick={async () => {
                setHcsLoading(true);
                setHcsError('');
                setHcsMessages([]);
                try {
                  const msgs = await fetchTopicMessages(hcsTopicInput.trim());
                  setHcsMessages(msgs);
                  if (msgs.length === 0) setHcsError('No messages found for this topic.');
                } catch (err) {
                  setHcsError(err.message || 'Failed to fetch topic messages');
                }
                setHcsLoading(false);
              }}
            >
              {hcsLoading ? '⏳ Loading...' : '🔍 Fetch Messages'}
            </button>
          </div>

          {/* Auto-fill with patient's topic */}
          {profile?.hcsTopicId && (
            <div style={{ marginBottom: 12 }}>
              <button
                className="btn btn-sm"
                onClick={() => setHcsTopicInput(profile.hcsTopicId)}
                style={{ fontSize: 11 }}
              >
                📋 Use my topic: {profile.hcsTopicId}
              </button>
            </div>
          )}

          {hcsError && (
            <div style={{
              padding: 12,
              background: 'rgba(232, 85, 90, 0.1)',
              border: '1px solid rgba(232, 85, 90, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--accent-coral)',
              fontSize: 13,
              marginBottom: 12,
            }}>
              ⚠️ {hcsError}
            </div>
          )}

          {hcsMessages.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {hcsMessages.map((msg, i) => (
                <div key={i} className="glass-card" style={{ padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="badge badge-teal" style={{ fontSize: 10 }}>
                      Seq #{msg.sequenceNumber}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(parseFloat(msg.consensusTimestamp) * 1000).toLocaleString()}
                    </span>
                  </div>
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    wordBreak: 'break-all',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.message}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!hcsLoading && hcsMessages.length === 0 && !hcsError && (
            <div className="empty-state" style={{ padding: 24 }}>
              <div className="icon">🔗</div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Enter an HCS Topic ID to view real consensus messages from the Hedera Mirror Node
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
