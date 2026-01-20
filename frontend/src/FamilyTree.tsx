import React, { useState } from 'react';
import { api } from './api';

export function FamilyTree() {
  const [treeName, setTreeName] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [gedcom, setGedcom] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.genealogy.createTree(treeName, description);
      setMessage(`Tree created with ID: ${res.id}`);
      // Auto-export to verify GEDCOM
      const gedcomData = await api.genealogy.exportGedcom(res.id);
      setGedcom(gedcomData);
    } catch (err) {
      setMessage('Failed to create tree');
    }
  };

  return (
    <div>
      <h2>Create Family Tree</h2>
      <form onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="Tree Name"
          value={treeName}
          onChange={(e) => setTreeName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit">Create & Export GEDCOM</button>
      </form>
      {message && <p>{message}</p>}
      {gedcom && (
        <div>
          <h3>GEDCOM Export</h3>
          <pre style={{ background: '#f4f4f4', padding: '10px' }}>{gedcom}</pre>
        </div>
      )}
    </div>
  );
}
