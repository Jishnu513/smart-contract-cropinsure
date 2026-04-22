import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPolicy } from '../services/api';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import '../styles/ViewDetails.css';

const ViewPolicy = () => {
  const { policyId } = useParams();
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPolicy();
  }, [policyId]);

  const fetchPolicy = async () => {
    try {
      const data = await getPolicy(policyId);
      setPolicy(data);
    } catch (err) {
      setError(err.error || 'Failed to fetch policy details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading policy details...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="error-container">
        <h2>Policy Not Found</h2>
        <p>Policy ID {policyId} does not exist.</p>
      </div>
    );
  }

  return (
    <div className="view-details">
      <div className="details-container">
        <h1>Policy Details</h1>
        <div className="detail-card">
          <div className="detail-header">
            <h2>Policy #{policy.policy_id}</h2>
            <span className={`status-badge ${policy.is_active ? 'active' : 'inactive'}`}>
              {policy.is_active ? (
                <><FaCheckCircle /> Active</>
              ) : (
                <><FaTimesCircle /> Inactive</>
              )}
            </span>
          </div>

          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Farmer Address:</span>
              <span className="detail-value">{policy.farmer_address}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Crop Type:</span>
              <span className="detail-value">{policy.crop_type}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Season:</span>
              <span className="detail-value">{policy.season}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Coverage Amount:</span>
              <span className="detail-value">₹{policy.coverage_amount?.toLocaleString()}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Premium Amount:</span>
              <span className="detail-value">₹{policy.premium_amount?.toLocaleString()}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Farm Location:</span>
              <span className="detail-value">{policy.farm_location}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Farm Area:</span>
              <span className="detail-value">{policy.farm_area} hectares</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Weather Threshold:</span>
              <span className="detail-value">{policy.weather_threshold}%</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">NDVI Threshold:</span>
              <span className="detail-value">{policy.ndvi_threshold}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Premium Paid:</span>
              <span className="detail-value">
                {policy.premium_paid ? (
                  <span className="badge-success">Yes</span>
                ) : (
                  <span className="badge-warning">No</span>
                )}
              </span>
            </div>

            {policy.smart_contract_address && (
              <div className="detail-item full-width">
                <span className="detail-label">Smart Contract:</span>
                <span className="detail-value contract-address">
                  {policy.smart_contract_address}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="info-box">
          <h3>Policy Information</h3>
          <ul>
            <li>This policy is managed by smart contract on blockchain</li>
            <li>Weather and NDVI monitoring is active for this policy</li>
            <li>Claims can be submitted at any time during active period</li>
            <li>Double verification ensures accurate claim processing</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ViewPolicy;
