import React from 'react';
import '../App.css';

function NavBar({ showLogout, onLogout }) {
  return (
    <header className="app-bar">
      <div className="toolbar">
        <h1 className="app-title">Sentiment Analysis</h1>
        {showLogout && (
          <button onClick={onLogout} className="logout-button">
            Logout
          </button>
        )}
      </div>
    </header>
  );
}

export default NavBar;
