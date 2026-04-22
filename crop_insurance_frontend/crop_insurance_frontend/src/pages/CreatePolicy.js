import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { createPolicy } from '../services/api';
import '../styles/Form.css';

const CreatePolicy = ({ walletAddress }) => {
  const [formData, setFormData] = useState({
    crop_type: '',
    coverage_amount: '',
    season: 'Kharif',
    farm_location: '',
    farm_area: ''
  });
  const [loading, setLoading] = useState(false);
  const [policyPreview, setPolicyPreview] = useState(null);

  const cropTypes = [
    'Rice', 'Wheat', 'Cotton', 'Sugarcane', 'Maize', 'Soybean',
    'Groundnut', 'Jowar', 'Bajra', 'Pulses', 'Tea', 'Coffee'
  ];

  const premiumRates = {
    'Kharif': 0.02,
    'Rabi': 0.015,
    'Commercial': 0.05
  };

  const handleChange = (e) => {
    const newFormData = {
      ...formData,
      [e.target.name]: e.target.value
    };
    setFormData(newFormData);

    // Calculate premium preview
    if (newFormData.coverage_amount && newFormData.season) {
      const coverage = parseFloat(newFormData.coverage_amount);
      const rate = premiumRates[newFormData.season];
      const premium = coverage * rate;
      setPolicyPreview({
        coverage: coverage,
        premium: premium,
        rate: rate * 100
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        wallet_address: walletAddress,
        coverage_amount: parseFloat(formData.coverage_amount),
        farm_area: parseFloat(formData.farm_area),
        auto_pay: true  // Flag to indicate automatic payment
      };

      // Create policy
      const createResponse = await createPolicy(data);
      const policyId = createResponse.policy_id;
      
      // Show premium paid message
      const premiumAmount = policyPreview.premium;
      toast.success(`✅ Premium of ₹${premiumAmount.toLocaleString()} paid successfully!`);
      
      // Small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show policy creation success
      toast.success(`🎉 Policy created and activated! Policy ID: ${policyId}`);
      toast.info('Your policy is now active. You can submit claims when needed.');
      
      // Reset form
      setFormData({
        crop_type: '',
        coverage_amount: '',
        season: 'Kharif',
        farm_location: '',
        farm_area: ''
      });
      setPolicyPreview(null);
      
    } catch (error) {
      toast.error(error.error || 'Failed to create policy');
      console.error('Policy creation error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page">
      <div className="form-container">
        <h1>Create Insurance Policy</h1>
        <p className="form-description">
          Create a new crop insurance policy based on PMFBY guidelines
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
            <label>Crop Type *</label>
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

          <div className="form-group">
            <label>Season *</label>
            <select
              name="season"
              value={formData.season}
              onChange={handleChange}
              required
              className="form-control"
            >
              <option value="Kharif">Kharif (2% premium)</option>
              <option value="Rabi">Rabi (1.5% premium)</option>
              <option value="Commercial">Commercial (5% premium)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Coverage Amount (₹) *</label>
            <input
              type="number"
              name="coverage_amount"
              value={formData.coverage_amount}
              onChange={handleChange}
              placeholder="Enter coverage amount"
              min="10000"
              step="1000"
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
            <small className="form-text">Use Google Maps to find your farm's GPS coordinates</small>
          </div>

          <div className="form-group">
            <label>Farm Area (hectares) *</label>
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

          {policyPreview && (
            <div className="policy-preview">
              <h3>Policy Preview</h3>
              <div className="preview-grid">
                <div className="preview-item">
                  <span className="preview-label">Coverage Amount:</span>
                  <span className="preview-value">₹{policyPreview.coverage.toLocaleString()}</span>
                </div>
                <div className="preview-item">
                  <span className="preview-label">Premium Rate:</span>
                  <span className="preview-value">{policyPreview.rate}%</span>
                </div>
                <div className="preview-item">
                  <span className="preview-label">Premium Amount:</span>
                  <span className="preview-value premium-highlight">
                    ₹{policyPreview.premium.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`btn btn-primary btn-block ${loading ? 'loading' : ''}`}
          >
            {loading ? 'Processing Payment & Creating Policy...' : 'Create Policy'}
          </button>
        </form>

        <div className="info-box">
          <h3>ℹ️ Policy Information</h3>
          <ul>
            <li>Premium rates follow PMFBY guidelines</li>
            <li>Kharif: 2% | Rabi: 1.5% | Commercial: 5%</li>
            <li>Premium will be automatically paid upon policy creation</li>
            <li>Weather and NDVI monitoring starts immediately after activation</li>
            <li>You can submit claims anytime during the policy period</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CreatePolicy;