import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaLeaf, FaBars, FaTimes, FaWallet } from 'react-icons/fa';
import '../styles/Navbar.css';

const Navbar = ({ walletAddress, isConnected, backendConnected, connectWallet, disconnectWallet }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const formatAddress = (addr) => addr ? `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}` : '';

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/register', label: 'Register' },
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/claims', label: 'Claims' },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <FaLeaf className="logo-icon" />
          <span className="logo-text">CropInsure</span>
        </Link>

        {/* Desktop Nav Links */}
        <ul className="nav-menu">
          {navLinks.map(({ to, label }) => (
            <li key={to} className="nav-item">
              <Link
                to={to}
                className={`nav-link ${location.pathname === to ? 'active' : ''}`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right Side: Backend Status + Wallet */}
        <div className="navbar-right">
          <div className={`backend-status ${backendConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            <span className="status-text">{backendConnected ? 'Backend connected' : 'Backend offline'}</span>
          </div>

          {isConnected ? (
            <div className="wallet-info" onClick={disconnectWallet} title="Click to disconnect">
              <FaWallet className="wallet-icon" />
              <span>{formatAddress(walletAddress)}</span>
            </div>
          ) : (
            <button className="btn-connect-wallet" onClick={connectWallet}>
              <FaWallet className="wallet-icon-btn" />
              Connect Wallet
            </button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="mobile-menu">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`mobile-nav-link ${location.pathname === to ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
          <div className="mobile-wallet">
            {isConnected ? (
              <button className="btn-disconnect" onClick={() => { disconnectWallet(); setMenuOpen(false); }}>
                Disconnect ({formatAddress(walletAddress)})
              </button>
            ) : (
              <button className="btn-connect-wallet" onClick={() => { connectWallet(); setMenuOpen(false); }}>
                <FaWallet /> Connect Wallet
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
