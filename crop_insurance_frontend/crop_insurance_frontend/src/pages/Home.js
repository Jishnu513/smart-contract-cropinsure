import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Home.css';

const FEATURES = [
  {
    icon: '🌾',
    title: 'Smart Registration',
    desc: 'Register your farm with GPS coordinates, crop type, and sowing date. Blockchain-secured policy creation in seconds.',
  },
  {
    icon: '🌤️',
    title: 'Real-time Weather',
    desc: 'Live weather data via OpenWeatherMap API. Automated risk detection using trained ML models with 90%+ accuracy.',
  },
  {
    icon: '🛰️',
    title: 'Satellite NDVI',
    desc: 'NASA POWER satellite data feeds our NDVI analysis model to detect Critical Crop Damage automatically.',
  },
  {
    icon: '⛓️',
    title: 'Blockchain Payouts',
    desc: 'Smart contract on Ethereum (Ganache). Approved claims trigger instant automatic payout — no human intervention.',
  },
  {
    icon: '🧠',
    title: 'Dual Verification',
    desc: 'Both Weather AND NDVI triggers must fire for claim approval. Prevents fraud using two independent AI models.',
  },
  {
    icon: '📊',
    title: 'Live Dashboard',
    desc: 'Policy dashboard shows real-time risk level, NDVI trend charts, claim eligibility, and payout status.',
  },
];

const STATS = [
  { value: '90%+', label: 'ML Model Accuracy' },
  { value: '2-3s', label: 'Payout Speed' },
  { value: '2x', label: 'Verification Layers' },
  { value: '100%', label: 'Automated' },
];

export default function Home() {
  return (
    <div className="home-page">
      {/* Hero */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">🌿 Smart Contract Based System</div>
          <h1 className="hero-title">
            CropInsure
            <span className="hero-subtitle"> Automated Crop Insurance</span>
          </h1>
          <p className="hero-desc">
            Smart contract-based automated crop insurance using real-time weather data and
            satellite NDVI verification. Zero manual intervention — fair, fast, and fraud-proof.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn-primary-hero">
              🌱 Register a Policy
            </Link>
            <Link to="/dashboard" className="btn-secondary-hero">
              📊 View Dashboard
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-card">
            <div className="hc-header">
              <span className="hc-dot green"></span>
              <span className="hc-label">POL-2026-0003 · Wheat · Active</span>
            </div>
            <div className="hc-metrics">
              <div className="hc-metric">
                <span className="hc-val">0.24</span>
                <span className="hc-key">NDVI Value</span>
              </div>
              <div className="hc-metric">
                <span className="hc-val red">Drought</span>
                <span className="hc-key">Risk Level</span>
              </div>
              <div className="hc-metric">
                <span className="hc-val">₹40,000</span>
                <span className="hc-key">Auto Payout</span>
              </div>
            </div>
            <div className="hc-footer">
              <span className="hc-badge approved">✅ Claim Approved</span>
              <span className="hc-time">2 seconds ago</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-section">
        <div className="stats-inner">
          {STATS.map((s, i) => (
            <div key={i} className="stat-block">
              <span className="stat-val">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="features-inner">
          <div className="section-head">
            <h2>How CropInsure Works</h2>
            <p>End-to-end automated pipeline from registration to payout</p>
          </div>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2>Ready to protect your crops?</h2>
          <p>Register in under a minute — your policy goes live instantly on the blockchain.</p>
          <div className="cta-actions">
            <Link to="/register" className="btn-primary-hero">🌱 Get Started</Link>
            <Link to="/claims" className="btn-secondary-hero">⚡ View Claims</Link>
          </div>
        </div>
      </section>

      <div className="footer-note">CropInsure | Smart Contract Based Crop Insurance</div>
    </div>
  );
}
