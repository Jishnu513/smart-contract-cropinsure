import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { submitClaim } from '../services/api';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import '../styles/Form.css';

const SubmitClaim = ({ walletAddress }) => {
  const [formData, setFormData] = useState({
    policy_id: '',
    latitude: '',
    longitude: ''
  });
  const [loading, setLoading] = useState(false);
  const [claimResult, setClaimResult] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setClaimResult(null);

    try {
      const data = {
        wallet_address: walletAddress,
        policy_id: parseInt(formData.policy_id),
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude)
      };

      const response = await submitClaim(data);
      setClaimResult(response);

      if (response.is_approved) {
        toast.success(`Claim approved! Payout of ₹${(response.payout_amount ?? 0).toLocaleString()} processed.`);
      } else {
        toast.warning('Claim rejected. Check verification details below.');
      }

      // Reset form
      setFormData({
        policy_id: '',
        latitude: '',
        longitude: ''
      });
    } catch (error) {
      toast.error(error.error || 'Failed to submit claim');
      console.error('Claim submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page">
      <div className="form-container">
        <h1>Submit Insurance Claim</h1>
        <p className="form-description">
          File a claim with double verification (Weather + NDVI)
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
            <label>Policy ID *</label>
            <input
              type="number"
              name="policy_id"
              value={formData.policy_id}
              onChange={handleChange}
              placeholder="Enter your policy ID"
              min="1"
              required
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label>Farm Latitude *</label>
            <input
              type="number"
              name="latitude"
              value={formData.latitude}
              onChange={handleChange}
              placeholder="e.g., 28.6139"
              step="0.0001"
              required
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label>Farm Longitude *</label>
            <input
              type="number"
              name="longitude"
              value={formData.longitude}
              onChange={handleChange}
              placeholder="e.g., 77.2090"
              step="0.0001"
              required
              className="form-control"
            />
          </div>


          <button
            type="submit"
            disabled={loading}
            className={`btn btn-primary btn-block ${loading ? 'loading' : ''}`}
          >
            {loading ? 'Processing Claim...' : 'Submit Claim'}
          </button>
        </form>

        {claimResult && (
          <div className={`claim-result ${claimResult.is_approved ? 'approved' : 'rejected'}`}>
            <h3>
              {claimResult.is_approved ? (
                <>
                  <FaCheckCircle className="result-icon success" />
                  Claim Approved!
                </>
              ) : (
                <>
                  <FaTimesCircle className="result-icon error" />
                  Claim Rejected
                </>
              )}
            </h3>

            <div className="verification-details">
              <h4>Double Verification Results</h4>

              <div className="verification-item">
                <span className="verification-label">Weather Trigger:</span>
                <span className={`verification-status ${claimResult.weather_trigger ? 'pass' : 'fail'}`}>
                  {claimResult.weather_trigger ? (
                    <><FaCheckCircle /> PASSED</>
                  ) : (
                    <><FaTimesCircle /> FAILED</>
                  )}
                </span>
              </div>

              <div className="verification-item">
                <span className="verification-label">NDVI Trigger:</span>
                <span className={`verification-status ${claimResult.ndvi_trigger ? 'pass' : 'fail'}`}>
                  {claimResult.ndvi_trigger ? (
                    <><FaCheckCircle /> PASSED</>
                  ) : (
                    <><FaTimesCircle /> FAILED</>
                  )}
                </span>
              </div>

              <div className="verification-item highlight">
                <span className="verification-label">Final Status:</span>
                <span className={`verification-status ${claimResult.is_approved ? 'pass' : 'fail'}`}>
                  {claimResult.is_approved ? 'APPROVED' : 'REJECTED'}
                </span>
              </div>

              {claimResult.is_approved && (
                <div className="payout-info">
                  <h4>Payout Information</h4>
                  <div className="payout-amount">
                    ₹{(claimResult.payout_amount ?? 0).toLocaleString()}
                  </div>
                  <p>Claim ID: {claimResult.claim_id}</p>
                  <p className="payout-note">
                    Payout has been automatically processed via smart contract
                  </p>
                </div>
              )}

              {!claimResult.is_approved && (
                <div className="rejection-info">
                  <h4>Why was my claim rejected?</h4>
                  <p>
                    Both Weather and NDVI triggers must be TRUE for claim approval.
                    Your claim was rejected because:
                  </p>
                  <ul>
                    {!claimResult.weather_trigger && (
                      <li>Weather conditions do not indicate crop damage</li>
                    )}
                    {!claimResult.ndvi_trigger && (
                      <li>NDVI analysis shows healthy crop condition</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="info-box">
          <h3>ℹ️ Claim Process</h3>
          <ul>
            <li>Claims are verified using ML models (90-93% accuracy)</li>
            <li>Weather trigger checks for adverse weather conditions</li>
            <li>NDVI trigger analyzes crop health via satellite data</li>
            <li>Both triggers must be TRUE for claim approval</li>
            <li>Approved claims receive instant payout (2-3 seconds)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SubmitClaim;
