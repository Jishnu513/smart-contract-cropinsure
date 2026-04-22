import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getClaim } from '../services/api';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import '../styles/ViewDetails.css';

const ViewClaim = () => {
  const { claimId } = useParams();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchClaim();
  }, [claimId]);

  const fetchClaim = async () => {
    try {
      const data = await getClaim(claimId);
      setClaim(data);
    } catch (err) {
      setError(err.error || 'Failed to fetch claim details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading claim details...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="error-container">
        <h2>Claim Not Found</h2>
        <p>Claim ID {claimId} does not exist.</p>
      </div>
    );
  }

  return (
    <div className="view-details">
      <div className="details-container">
        <h1>Claim Details</h1>
        <div className="detail-card">
          <div className="detail-header">
            <h2>Claim #{claim.claim_id}</h2>
            <span className={`status-badge ${claim.is_approved ? 'approved' : 'rejected'}`}>
              {claim.is_approved ? (
                <><FaCheckCircle /> Approved</>
              ) : (
                <><FaTimesCircle /> Rejected</>
              )}
            </span>
          </div>

          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Policy ID:</span>
              <span className="detail-value">{claim.policy_id}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Farmer Address:</span>
              <span className="detail-value">{claim.farmer_address}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Claim Amount:</span>
              <span className="detail-value">₹{claim.claim_amount?.toLocaleString()}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Location:</span>
              <span className="detail-value">
                {claim.latitude}, {claim.longitude}
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Submission Date:</span>
              <span className="detail-value">{claim.submission_date || 'N/A'}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Processing Time:</span>
              <span className="detail-value">{claim.processing_time || '2-3 seconds'}</span>
            </div>
          </div>

          <div className="verification-section">
            <h3>Double Verification Results</h3>
            
            <div className="verification-grid">
              <div className="verification-card">
                <h4>Weather Trigger</h4>
                <div className={`verification-result ${claim.weather_trigger ? 'pass' : 'fail'}`}>
                  {claim.weather_trigger ? (
                    <>
                      <FaCheckCircle className="result-icon" />
                      <span>PASSED</span>
                    </>
                  ) : (
                    <>
                      <FaTimesCircle className="result-icon" />
                      <span>FAILED</span>
                    </>
                  )}
                </div>
                <p className="verification-desc">
                  {claim.weather_trigger
                    ? 'Weather conditions indicate crop damage'
                    : 'Weather conditions normal'}
                </p>
              </div>

              <div className="verification-card">
                <h4>NDVI Trigger</h4>
                <div className={`verification-result ${claim.ndvi_trigger ? 'pass' : 'fail'}`}>
                  {claim.ndvi_trigger ? (
                    <>
                      <FaCheckCircle className="result-icon" />
                      <span>PASSED</span>
                    </>
                  ) : (
                    <>
                      <FaTimesCircle className="result-icon" />
                      <span>FAILED</span>
                    </>
                  )}
                </div>
                <p className="verification-desc">
                  {claim.ndvi_trigger
                    ? 'Crop health shows damage'
                    : 'Crop health appears normal'}
                </p>
              </div>
            </div>
          </div>

          {claim.is_approved && (
            <div className="payout-section success">
              <h3>✓ Payout Processed</h3>
              <div className="payout-amount-large">
                ₹{claim.payout_amount?.toLocaleString()}
              </div>
              <p>Payout automatically transferred via smart contract</p>
              {claim.transaction_hash && (
                <div className="transaction-info">
                  <span className="detail-label">Transaction Hash:</span>
                  <span className="detail-value">{claim.transaction_hash}</span>
                </div>
              )}
            </div>
          )}

          {!claim.is_approved && (
            <div className="rejection-section warning">
              <h3>Claim Rejection Reason</h3>
              <p>
                Your claim was rejected because both verification triggers must be TRUE for approval.
              </p>
              <ul>
                {!claim.weather_trigger && (
                  <li>Weather verification failed - conditions do not indicate crop damage</li>
                )}
                {!claim.ndvi_trigger && (
                  <li>NDVI verification failed - satellite data shows healthy crop condition</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="info-box">
          <h3>Claim Process Information</h3>
          <ul>
            <li>Claims use ML models with 90-93% accuracy</li>
            <li>Both weather and NDVI triggers must pass for approval</li>
            <li>Approved claims receive instant blockchain payout</li>
            <li>All decisions are transparent and auditable</li>
            <li>You can submit new claims if conditions change</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ViewClaim;
