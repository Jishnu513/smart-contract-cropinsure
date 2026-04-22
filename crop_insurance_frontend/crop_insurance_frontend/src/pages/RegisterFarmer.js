import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { registerFarmer } from '../services/api';
import '../styles/Form.css';

const RegisterFarmer = ({ walletAddress }) => {
  const [formData, setFormData] = useState({
    name: '',
    farm_location: '',
    farm_area: '',
    crop_type: ''
  });
  const [loading, setLoading] = useState(false);

  const cropTypes = [
    'Rice', 'Wheat', 'Cotton', 'Sugarcane', 'Maize', 'Soybean',
    'Groundnut', 'Jowar', 'Bajra', 'Pulses', 'Tea', 'Coffee',
    'Rubber', 'Coconut', 'Jute', 'Sunflower', 'Potato', 'Onion',
    'Tomato', 'Chilli'
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        wallet_address: walletAddress,
        farm_area: parseFloat(formData.farm_area)
      };

      const response = await registerFarmer(data);
      toast.success('Farmer registered successfully!');
      
      // Reset form
      setFormData({
        name: '',
        farm_location: '',
        farm_area: '',
        crop_type: ''
      });
    } catch (error) {
      toast.error(error.error || 'Failed to register farmer');
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page">
      <div className="form-container">
        <h1>Register as Farmer</h1>
        <p className="form-description">
          Register your farm details to create insurance policies
        </p>

        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>Wallet Address</label>
            <input
              type="text"
              value={walletAddress}
              disabled
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label>Farm Location (Latitude, Longitude) *</label>
            <input
              type="text"
              name="farm_location"
              value={formData.farm_location}
              onChange={handleChange}
              placeholder="e.g., 28.6139, 77.2090"
              required
              className="form-control"
            />
            <small className="form-text">
              Use Google Maps to find your farm's GPS coordinates
            </small>
          </div>

          <div className="form-group">
            <label>Farm Area (in hectares) *</label>
            <input
              type="number"
              name="farm_area"
              value={formData.farm_area}
              onChange={handleChange}
              placeholder="Enter farm area"
              step="0.01"
              min="0.1"
              required
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label>Primary Crop Type *</label>
            <select
              name="crop_type"
              value={formData.crop_type}
              onChange={handleChange}
              required
              className="form-control"
            >
              <option value="">Select Crop Type</option>
              {cropTypes.map((crop) => (
                <option key={crop} value={crop}>
                  {crop}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`btn btn-primary btn-block ${loading ? 'loading' : ''}`}
          >
            {loading ? 'Registering...' : 'Register Farmer'}
          </button>
        </form>

        <div className="info-box">
          <h3>ℹ️ Registration Information</h3>
          <ul>
            <li>Registration is a one-time process per wallet address</li>
            <li>Ensure GPS coordinates are accurate for weather monitoring</li>
            <li>Farm area determines policy premium calculations</li>
            <li>All transactions are recorded on blockchain</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RegisterFarmer;