import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from './api';
import { FamilyTree } from './types';

export const Dashboard = () => {
  const [trees, setTrees] = useState<FamilyTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Create tree state
  const [showCreate, setShowCreate] = useState(false);
  const [newTreeName, setNewTreeName] = useState('');
  const [newTreeDesc, setNewTreeDesc] = useState('');
  const [newTreePrivacy, setNewTreePrivacy] = useState<'PUBLIC' | 'FAMILY_TREE_ONLY' | 'PRIVATE'>('PRIVATE');

  useEffect(() => {
    loadTrees();
  }, []);

  const loadTrees = async () => {
    try {
      setLoading(true);
      const data = await api.genealogy.getTrees();
      setTrees(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTree = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.genealogy.createTree({
        name: newTreeName,
        description: newTreeDesc,
        privacy_level: newTreePrivacy
      });
      setShowCreate(false);
      setNewTreeName('');
      setNewTreeDesc('');
      loadTrees();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container">
      <h1>Dashboard</h1>
      {error && <div className="error-message">{error}</div>}
      
      <div className="actions">
        <button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : 'Create New Tree'}
        </button>
      </div>

      {showCreate && (
        <div className="card" style={{ marginTop: '1rem', maxWidth: '500px' }}>
          <h3>Create New Tree</h3>
          <form onSubmit={handleCreateTree}>
            <div className="form-group">
              <label>Name</label>
              <input 
                type="text"
                value={newTreeName} 
                onChange={e => setNewTreeName(e.target.value)} 
                required 
                style={{ width: '100%', padding: '0.5rem' }}
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea 
                value={newTreeDesc} 
                onChange={e => setNewTreeDesc(e.target.value)} 
                style={{ width: '100%', padding: '0.5rem' }}
              />
            </div>
            <div className="form-group">
              <label>Privacy</label>
              <select 
                value={newTreePrivacy} 
                onChange={e => setNewTreePrivacy(e.target.value as any)}
                style={{ width: '100%', padding: '0.5rem' }}
              >
                <option value="PRIVATE">Private</option>
                <option value="FAMILY_TREE_ONLY">Family Tree Only</option>
                <option value="PUBLIC">Public</option>
              </select>
            </div>
            <button type="submit">Create</button>
          </form>
        </div>
      )}

      <div className="tree-list" style={{ marginTop: '2rem' }}>
        <h2>My Family Trees</h2>
        {trees.length === 0 ? (
          <p>No trees found. Create one to get started.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {trees.map(tree => (
              <div key={tree.id} className="card">
                <h3><Link to={`/trees/${tree.id}`}>{tree.name}</Link></h3>
                <p>{tree.description || 'No description'}</p>
                <span className="badge" style={{ 
                  background: '#eee', 
                  padding: '0.25rem 0.5rem', 
                  borderRadius: '4px',
                  fontSize: '0.8rem'
                }}>{tree.privacy_level}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
