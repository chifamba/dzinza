import React, { useState } from 'react';
import { api } from './api';

export function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [step, setStep] = useState<'login' | 'mfa'>('login');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.auth.login({ email, password });
      if (res.mfa_required) {
        setStep('mfa');
      } else {
        localStorage.setItem('token', res.access_token);
        onLogin();
      }
    } catch (err) {
      setError('Login failed');
    }
  };

  const handleMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.auth.verifyMfa({ email, mfa_code: mfaToken });
      localStorage.setItem('token', res.access_token);
      onLogin();
    } catch (err) {
      setError('Invalid MFA code');
    }
  };

  if (step === 'mfa') {
    return (
      <form onSubmit={handleMfa}>
        <h2>Enter MFA Code</h2>
        <input
          type="text"
          placeholder="MFA Code"
          value={mfaToken}
          onChange={(e) => setMfaToken(e.target.value)}
        />
        <button type="submit">Verify</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
    );
  }

  return (
    <form onSubmit={handleLogin}>
      <h2>Login</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Login</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  );
}
