import React, { useState } from 'react';
import { api } from './api';

export function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.auth.login({ email, password });
      localStorage.setItem('token', res.access_token);
      if (res.refresh_token) {
        localStorage.setItem('refresh_token', res.refresh_token);
      }
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="card container" style={{ maxWidth: '400px' }}>
      <form onSubmit={handleLogin}>
        <h2>Login</h2>
        <div className="form-group">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="form-group">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit">Login</button>
        {error && <p className="error-message">{error}</p>}
      </form>
    </div>
  );
}
