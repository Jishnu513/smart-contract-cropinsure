import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { registerFarmer, createPolicy } from '../services/api';
import '../styles/Register.css';

const DEMO_DATA = {
  name: 'Anvekarprathamesh',
  phone: '9876543210',
  email: 'anvekarprathamesh13@gmail.com',
  wallet_address: '0x75f17Bab3bf4fE4f97dcA1CC627648CD08945c79',
  latitude: '26.8467',
  longitude: '80.9462',
  crop_type: 'Wheat',
  sowing_date: '2025-01-15',
  farm_area: '5',
  expected_yield: '25',
  premium_amount: '5000',
};

const CROP_TYPES = ['Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Maize', 'Soybean', 'Groundnut', 'Jowar', 'Bajra', 'Pulses'];

export default function Register({ walletAddress }) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    wallet_address: walletAddress || '',
    latitude: '', longitude: '',
    crop_type: '', sowing_date: '',
    farm_area: '', expected_yield: '',
    premium_amount: '5000',
  });
  const [loading, setLoading] = useState(false);
  const [weatherPreview, setWeatherPreview] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [createdPolicy, setCreatedPolicy] = useState(null);

  React.useEffect(() => {
    if (walletAddress && !form.wallet_address) {
      setForm(prev => ({ ...prev, wallet_address: walletAddress }));
    }
  }, [walletAddress]);

  const coverageAmount = form.premium_amount ? (parseInt(form.premium_amount) * 10) : '';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const loadDemoData = () => {
    setForm({ ...DEMO_DATA, wallet_address: walletAddress || DEMO_DATA.wallet_address });
    toast.info('Demo data loaded!');
  };

  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setForm(prev => ({
            ...prev,
            latitude: pos.coords.latitude.toFixed(4),
            longitude: pos.coords.longitude.toFixed(4),
          }));
          toast.success('Location detected!');
        },
        () => toast.error('Location access denied')
      );
    }
  };

  const previewWeather = async () => {
    if (!form.latitude || !form.longitude) {
      toast.warning('Enter latitude and longitude first');
      return;
    }
    setLoadingWeather(true);
    try {
      const res = await fetch('http://127.0.0.1:5000/api/check_weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude) }),
      });
      const data = await res.json();
      setWeatherPreview(data);
    } catch {
      toast.error('Could not fetch weather preview');
    } finally {
      setLoadingWeather(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanWallet = form.wallet_address.trim();
    if (!cleanWallet) {
      toast.warning('Please enter a wallet address');
      return;
    }
    if (!cleanWallet.startsWith('0x') || cleanWallet.length !== 42) {
      toast.warning('Invalid wallet address. It must be exactly 42 characters (starting with 0x). Did you accidentally copy a transaction hash?');
      return;
    }
    setLoading(true);
    try {
      // Step 1: Register farmer
      await registerFarmer({
        name: form.name,
        wallet_address: form.wallet_address,
        farm_location: `${form.latitude},${form.longitude}`,
        farm_area: Math.round(parseFloat(form.farm_area) * 100),
        crop_type: form.crop_type,
      });

      // Step 2: Create policy
      const policyRes = await createPolicy({
        wallet_address: form.wallet_address,
        crop_type: form.crop_type,
        coverage_amount: coverageAmount,
        season: 'Kharif',
        farm_location: `${form.latitude},${form.longitude}`,
        farm_area: parseFloat(form.farm_area),
        sowing_date: form.sowing_date,
        expected_yield: parseFloat(form.expected_yield),
        auto_pay: true,
      });

      setCreatedPolicy(policyRes);
      toast.success(`🎉 Policy created! ID: POL-2026-${String(policyRes.policy_id).padStart(4, '0')}`);
    } catch (err) {
      const msg = err?.error || err?.message || 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-header">
          <h1>Register New Policy</h1>
          <p>Create a smart contract-based crop insurance policy with automated verification</p>
        </div>

        {createdPolicy && (
          <div className="success-banner">
            <span className="success-icon">✅</span>
            <div>
              <strong>Policy Created Successfully!</strong>
              <p>Policy ID: <code>POL-2026-{String(createdPolicy.policy_id).padStart(4, '0')}</code> — Go to Dashboard to monitor it.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="register-form">
          {/* ── Personal Details ── */}
          <div className="form-section">
            <div className="section-title">
              <span className="section-icon">👤</span>
              <h2>Personal Details</h2>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name *</label>
                <input name="name" value={form.name} onChange={handleChange} placeholder="Farmer name" required />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone number" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email address" />
              </div>
              <div className="form-group">
                <label>Wallet Address *</label>
                <input name="wallet_address" value={form.wallet_address} onChange={handleChange} placeholder="0x..." required />
              </div>
            </div>
          </div>

          {/* ── Farm Details ── */}
          <div className="form-section">
            <div className="section-title">
              <span className="section-icon">📍</span>
              <h2>Farm Details</h2>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Latitude *</label>
                <input name="latitude" type="number" step="0.0001" value={form.latitude} onChange={handleChange} placeholder="26.8467" required />
              </div>
              <div className="form-group">
                <label>Longitude *</label>
                <input name="longitude" type="number" step="0.0001" value={form.longitude} onChange={handleChange} placeholder="80.9462" required />
              </div>
              <div className="form-group location-btn-group">
                <button type="button" className="btn-location" onClick={useCurrentLocation}>
                  📍 Use Current Location
                </button>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Crop Type *</label>
                <select name="crop_type" value={form.crop_type} onChange={handleChange} required>
                  <option value="">Select Crop</option>
                  {CROP_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Sowing Date *</label>
                <input name="sowing_date" type="date" value={form.sowing_date} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Farm Area (Acres) *</label>
                <input name="farm_area" type="number" step="0.1" min="0.1" value={form.farm_area} onChange={handleChange} placeholder="5" required />
              </div>
              <div className="form-group">
                <label>Expected Yield (Quintals) *</label>
                <input name="expected_yield" type="number" step="1" value={form.expected_yield} onChange={handleChange} placeholder="25" required />
              </div>
            </div>
          </div>

          {/* ── Insurance Details ── */}
          <div className="form-section">
            <div className="section-title">
              <span className="section-icon">🛡️</span>
              <h2>Insurance Details</h2>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Premium Amount (INR) *</label>
                <input name="premium_amount" type="number" value={form.premium_amount} onChange={handleChange} min="1000" step="500" required />
              </div>
              <div className="form-group">
                <label>Coverage Amount (INR)</label>
                <input value={coverageAmount ? coverageAmount.toLocaleString() : 'Auto calculated'} disabled className="auto-calc" />
              </div>
            </div>
          </div>

          {/* Weather Preview */}
          {weatherPreview && (
            <div className="weather-preview-box">
              <h4>🌤️ Current Weather at Location</h4>
              <div className="weather-stats">
                <span>🌡️ {weatherPreview.temperature}°C</span>
                <span>💧 {weatherPreview.humidity}%</span>
                <span>💨 {weatherPreview.wind_speed} m/s</span>
                <span>🌧️ {weatherPreview.rainfall || 0}mm</span>
              </div>
              <p className={`weather-risk ${weatherPreview.weather_trigger ? 'risk-high' : 'risk-low'}`}>
                Risk: {weatherPreview.risk_level || 'Normal'}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="form-actions">
            <button type="button" className="btn-demo" onClick={loadDemoData}>
              ✏️ Load Demo Data
            </button>
            <button type="button" className="btn-weather" onClick={previewWeather} disabled={loadingWeather}>
              {loadingWeather ? '⏳ Fetching...' : '🌤️ Preview Weather'}
            </button>
            <button type="submit" className="btn-create" disabled={loading}>
              {loading ? (
                <><span className="spinner"></span> Creating Policy...</>
              ) : (
                '🌱 Create Policy'
              )}
            </button>
          </div>
        </form>

        <div className="footer-note">CropInsure | Smart Contract Based Crop Insurance</div>
      </div>
    </div>
  );
}
