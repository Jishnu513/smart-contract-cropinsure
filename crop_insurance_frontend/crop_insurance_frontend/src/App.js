import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Navbar from './components/Navbar';
import Home from './pages/Home';
import Register from './pages/Register';
import PolicyDashboard from './pages/PolicyDashboard';
import Claims from './pages/Claims';
import './styles/App.css';

function App() {
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);

  useEffect(() => {
    checkWalletConnection();
    checkBackend();
  }, []);

  const checkBackend = async () => {
    try {
      const res = await fetch('http://127.0.0.1:5000/');
      if (res.ok) setBackendConnected(true);
    } catch {
      setBackendConnected(false);
    }
  };

  const checkWalletConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsConnected(true);
        }
      } catch (error) {
        console.error('Wallet check error:', error);
      }
    }
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWalletAddress(accounts[0]);
        setIsConnected(true);
      } catch (error) {
        console.error('Wallet connect error:', error);
      }
    } else {
      alert('Please install MetaMask to use this application!');
    }
  };

  const disconnectWallet = () => {
    setWalletAddress('');
    setIsConnected(false);
  };

  return (
    <Router>
      <div className="App">
        <Navbar
          walletAddress={walletAddress}
          isConnected={isConnected}
          backendConnected={backendConnected}
          connectWallet={connectWallet}
          disconnectWallet={disconnectWallet}
        />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register walletAddress={walletAddress} />} />
            <Route path="/dashboard" element={<PolicyDashboard walletAddress={walletAddress} />} />
            <Route path="/claims" element={<Claims walletAddress={walletAddress} />} />
          </Routes>
        </main>
        <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover />
      </div>
    </Router>
  );
}

export default App;
