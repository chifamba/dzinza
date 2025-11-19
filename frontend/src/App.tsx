import React, { useState, useEffect } from 'react';
import { Login } from './Login';
import { Register } from './Register';
import { FamilyTree } from './FamilyTree';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('token')) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Dzinza Family Tree</h1>
      {isLoggedIn ? (
        <div>
          <button onClick={handleLogout}>Logout</button>
          <hr />
          <FamilyTree />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '2rem' }}>
          <Login onLogin={() => setIsLoggedIn(true)} />
          <div style={{ borderLeft: '1px solid #ccc' }}></div>
          <Register />
        </div>
      )}
    </div>
  );
}

export default App;
