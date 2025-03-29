import React, { useState } from 'react';
import axios from 'axios';
import NavBar from '../components/NavBar';
import '../App.css';

const LoginForm = ({ onLogin }) => {
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/login`, loginData);
      const token = res.data.token;
      if (token) onLogin(token);
      else throw new Error('Token missing');
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid credentials or server error');
    }
  };

  return (
    <>
      <NavBar showLogout={false} />
      <div className="card-container">
        <div className="card auth-card">
          <h2 className="card-title">Login</h2>
          {error && <div className="alert error-alert">{error}</div>}
          <form onSubmit={handleSubmit} className="card-form">
            <input
              type="text"
              placeholder="Username"
              className="text-input"
              value={loginData.username}
              onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="text-input"
              value={loginData.password}
              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              required
            />
            <button type="submit" className="card-button">Login</button>
          </form>
          <p className="card-footer">
            Don't have an account? <a href="/register">Register</a>
          </p>
        </div>
      </div>
    </>
  );
};

export default LoginForm;