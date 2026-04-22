import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getAllClaims, getAllPolicies, submitClaim } from '../services/api';
import '../styles/Claims.css';

const formatPolicyId = (id) => `POL-2026-${String(id).padStart(4, '0')}`;
const formatClaimId = (id) => `CLM-${String(id).padStart(4, '0')}`;
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '–';

export default function Claims({ walletAddress }) {
  const [claims, setClaims] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimLoading, setClaimLoading] = useState(false);
  const [form, setForm] = useState({ policy_id: '', latitude: '26.8467', longitude: '80.9462' });
  const [claimResult, setClaimResult] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [claimsRes, policiesRes] = await Promise.all([getAllClaims(), getAllPolicies()]);
      setClaims(claimsRes.claims || []);
      setPolicies(policiesRes.policies || []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!walletAddress) {
      toast.warning('Please connect your wallet first');
      return;
    }
    setClaimLoading(true);
    setClaimResult(null);
    try {
      const res = await submitClaim({
        wallet_address: walletAddress,
        policy_id: parseInt(form.policy_id),
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
      });
      setClaimResult(res);
      if (res.is_approved) {
        toast.success(`✅ Claim approved! Payout: ₹${(res.payout_amount || 0).toLocaleString()}`);
      } else {
        toast.warning('Claim submitted — verification did not pass');
      }
      fetchAll();
    } catch (err) {
      toast.error(err?.error || 'Failed to submit claim');
    } finally {
      setClaimLoading(false);
    }
  };

  return (
    <div className="claims-page">
      <div className="claims-inner">
        {/* Header */}
        <div className="claims-header">
          <h1>⚡ Claims</h1>
          <p>Submit and track your crop insurance claims with automated dual verification</p>
        </div>

        <div className="claims-layout">
          {/* Submit Claim Form */}
          <div className="submit-panel">
            <div className="panel-head">
              <h3>Submit New Claim</h3>
            </div>
            <form onSubmit={handleSubmit} className="claim-form">
              <div className="cform-group">
                <label>Policy *</label>
                <select name="policy_id" value={form.policy_id} onChange={handleChange} required>
                  <option value="">Select Policy</option>
                  {policies.map(p => (
                    <option key={p.policy_id} value={p.policy_id}>
                      {formatPolicyId(p.policy_id)} — {p.crop_type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="cform-group">
                <label>Farm Latitude *</label>
                <input name="latitude" type="number" step="0.0001" value={form.latitude} onChange={handleChange} placeholder="26.8467" required />
              </div>
              <div className="cform-group">
                <label>Farm Longitude *</label>
                <input name="longitude" type="number" step="0.0001" value={form.longitude} onChange={handleChange} placeholder="80.9462" required />
              </div>

              <button type="submit" className="btn-submit" disabled={claimLoading}>
                {claimLoading ? <><span className="spinner"></span> Processing...</> : '📋 Submit Claim'}
              </button>
            </form>

            {/* Claim Result */}
            {claimResult && (
              <div className={`claim-result-box ${claimResult.is_approved ? 'approved' : 'rejected'}`}>
                <div className="result-icon">{claimResult.is_approved ? '✅' : '❌'}</div>
                <div className="result-body">
                  <strong>{claimResult.is_approved ? 'Claim Approved!' : 'Claim Rejected'}</strong>
                  <div className="verify-row">
                    <span>Weather Trigger</span>
                    <span className={claimResult.weather_trigger ? 'v-pass' : 'v-fail'}>
                      {claimResult.weather_trigger ? '✅ PASSED' : '❌ FAILED'}
                    </span>
                  </div>
                  <div className="verify-row">
                    <span>NDVI Trigger</span>
                    <span className={claimResult.ndvi_trigger ? 'v-pass' : 'v-fail'}>
                      {claimResult.ndvi_trigger ? '✅ PASSED' : '❌ FAILED'}
                    </span>
                  </div>
                  {claimResult.is_approved && (
                    <div className="payout-display">
                      <span>Payout</span>
                      <strong>₹{(claimResult.payout_amount || 0).toLocaleString()}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Info */}
            <div className="claim-info-box">
              <h4>ℹ️ How it works</h4>
              <ul>
                <li>Claims are verified using ML models (90–93% accuracy)</li>
                <li>Weather trigger checks for adverse conditions</li>
                <li>NDVI trigger analyzes crop health via satellite</li>
                <li><strong>Both triggers must be TRUE</strong> for approval</li>
                <li>Approved claims receive instant payout via smart contract</li>
              </ul>
            </div>
          </div>

          {/* Claims History */}
          <div className="history-panel">
            <div className="panel-head">
              <h3>Claims History</h3>
              <button className="btn-refresh-sm" onClick={fetchAll} disabled={loading}>🔄 Refresh</button>
            </div>

            {loading ? (
              <div className="ch-loading"><div className="spinner-sm"></div><span>Loading...</span></div>
            ) : claims.length === 0 ? (
              <div className="no-claims">No claims submitted yet.</div>
            ) : (
              <div className="claims-table-wrap">
                <table className="claims-table">
                  <thead>
                    <tr>
                      <th>Claim ID</th>
                      <th>Policy ID</th>
                      <th>Status</th>
                      <th>Weather</th>
                      <th>NDVI</th>
                      <th>Payout</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((c, i) => (
                      <tr key={i}>
                        <td><code>{formatClaimId(c.claim_id)}</code></td>
                        <td>{formatPolicyId(c.policy_id)}</td>
                        <td>
                          <span className={`status-badge ${c.is_approved ? 'status-approved' : 'status-rejected'}`}>
                            {c.is_approved ? '✅ APPROVED' : '❌ REJECTED'}
                          </span>
                        </td>
                        <td>
                          <span className={c.weather_trigger ? 'v-pass' : 'v-fail'}>
                            {c.weather_trigger ? '✅ Yes' : '❌ No'}
                          </span>
                        </td>
                        <td>
                          <span className={c.ndvi_trigger ? 'v-pass' : 'v-fail'}>
                            {c.ndvi_trigger ? '✅ Yes' : '❌ No'}
                          </span>
                        </td>
                        <td className="payout-cell">
                          {c.is_approved ? `₹${(c.payout_amount || 0).toLocaleString()}` : <span className="na">₹0</span>}
                        </td>
                        <td className="date-cell">{formatDate(c.claim_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="footer-note">CropInsure | Smart Contract Based Crop Insurance</div>
    </div>
  );
}
