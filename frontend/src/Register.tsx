import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from './api';

export function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [message, setMessage] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      await api.auth.register({ email, password, name: fullName });
      setMessage('Registration successful! Please login.');
    } catch (err: any) {
      setMessage(err.message || 'Registration failed.');
    }
  };

  return (
    <div className="card container" style={{ maxWidth: '400px' }}>
      <form onSubmit={handleRegister}>
        <h2>Register</h2>
        <div className="form-group">
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
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
        <button type="submit">Register</button>
        {message && <p className="success-message">{message}</p>}
        <p style={{ marginTop: '1rem' }}>
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </form>
    </div>
  );
}
