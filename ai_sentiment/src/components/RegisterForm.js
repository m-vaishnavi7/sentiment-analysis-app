import React, { useState } from 'react';
import axios from 'axios';
import NavBar from '../components/NavBar';
import '../App.css';

const RegisterForm = () => {
  const [registerData, setRegisterData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/register`, registerData);
      setSuccessMsg('User registered successfully. You can now login.');
    } catch (err) {
      console.error('Registration error:', err);
      const msg = err.response?.data?.error || 'Internal server error';
      setError(msg);
    }
  };

  return (
    <>
      <NavBar showLogout={false} />
      <div className="card-container">
        <div className="card auth-card">
          <h2 className="card-title">Register</h2>
          {error && <div className="alert error-alert">{error}</div>}
          {successMsg && <div className="alert success-alert">{successMsg}</div>}
          <form onSubmit={handleSubmit} className="card-form">
            <input
              type="text"
              placeholder="Username"
              className="text-input"
              value={registerData.username}
              onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="text-input"
              value={registerData.password}
              onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
              required
            />
            <button type="submit" className="card-button">Register</button>
          </form>
          <p className="card-footer">
            Already have an account? <a href="/login">Login</a>
          </p>
        </div>
      </div>
    </>
  );
};

export default RegisterForm;