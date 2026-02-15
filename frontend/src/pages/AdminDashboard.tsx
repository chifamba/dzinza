import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { FlaggedContent, UserBan } from '../types';

const AdminDashboard = () => {
  const [flaggedItems, setFlaggedItems] = useState<FlaggedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [banUserId, setBanUserId] = useState('');
  const [banReason, setBanReason] = useState('');

  useEffect(() => {
    loadFlaggedContent();
  }, []);

  const loadFlaggedContent = async () => {
    try {
      setLoading(true);
      const data = await api.moderation.getFlaggedContent();
      setFlaggedItems(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.moderation.banUser({
        user_id: banUserId,
        reason: banReason
      });
      setBanUserId('');
      setBanReason('');
      alert('User banned successfully');
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <h1>Admin Dashboard</h1>
      {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

      <section className="card">
        <h2>Ban User</h2>
        <form onSubmit={handleBanUser}>
          <div className="form-group">
            <label>User ID</label>
            <input 
              type="text" 
              value={banUserId} 
              onChange={e => setBanUserId(e.target.value)} 
              placeholder="Enter user UUID"
              required 
            />
          </div>
          <div className="form-group">
            <label>Reason</label>
            <input 
              type="text" 
              value={banReason} 
              onChange={e => setBanReason(e.target.value)} 
              placeholder="Reason for ban"
              required 
            />
          </div>
          <button type="submit">Ban User</button>
        </form>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Flagged Content</h2>
        {flaggedItems.length === 0 ? (
          <p>No flagged content at this time.</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {flaggedItems.map(item => (
              <div key={item.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span className="badge" style={{ 
                      background: '#fee2e2', 
                      color: '#991b1b',
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      textTransform: 'uppercase'
                    }}>{item.content_type}</span>
                    <h3 style={{ marginTop: '0.5rem' }}>{item.reason}</h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                      Content ID: {item.content_id}
                    </p>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                      Reported by: {item.reporter_id}
                    </p>
                  </div>
                  <span className="badge" style={{ 
                    background: item.status === 'PENDING' ? '#fef3c7' : '#dcfce7',
                    color: item.status === 'PENDING' ? '#92400e' : '#166534',
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '4px',
                    fontSize: '0.75rem'
                  }}>{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminDashboard;
