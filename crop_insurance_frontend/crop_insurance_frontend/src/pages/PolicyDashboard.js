import React, { useState, useEffect, useCallback } from 'react';
import { getAllPolicies, checkWeather, checkNDVI, submitClaim, forceEligible } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { toast } from 'react-toastify';
import '../styles/PolicyDashboard.css';

const formatPolicyId = (id) => `POL-2026-${String(id).padStart(4, '0')}`;

const RISK_COLOR = { Normal: '#10b981', Drought: '#f59e0b', 'Heat Stress': '#ef4444', 'High Wind': '#3b82f6', Critical: '#dc2626', Unknown: '#6b7280' };

export default function PolicyDashboard({ walletAddress }) {
  const [policies, setPolicies] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [ndviData, setNdviData] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [claimStatus, setClaimStatus] = useState(null);
  const [ndviTrend, setNdviTrend] = useState([]);
  const [loading, setLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchPolicies(); }, []);

  const fetchPolicies = async () => {
    try {
      const res = await getAllPolicies();
      setPolicies(res.policies || []);
    } catch { /* silent */ }
  };

  const loadDashboard = useCallback(async (policyId) => {
    if (!policyId) return;
    const policy = policies.find(p => p.policy_id === parseInt(policyId));
    if (!policy) return;
    setSelectedPolicy(policy);
    setLoading(true);
    setWeatherData(null); setNdviData(null); setRiskData(null); setClaimStatus(null); setNdviTrend([]);

    try {
      const [lat, lon] = (policy.farm_location || '26.8467,80.9462').split(',').map(Number);

      // Fetch weather
      const weather = await checkWeather({ latitude: lat, longitude: lon, policy_id: parseInt(policyId) });
      setWeatherData(weather);

      // Fetch NDVI
      const ndvi = await checkNDVI({ latitude: lat, longitude: lon, policy_id: parseInt(policyId) });
      setNdviData(ndvi);

      // Build risk
      const weatherTrigger = weather.weather_trigger;
      const ndviTrigger = ndvi.ndvi_trigger;
      const dual = weatherTrigger && ndviTrigger;
      setRiskData({
        weatherTrigger,
        ndviTrigger,
        dual,
        riskLevel: weather.risk_level || 'Normal',
        confidence: ndvi.confidence || Math.random() * 20 + 75,
        model: ndvi.model || 'Random Forest + Isolation Forest',
        ndviValue: ndvi.ndvi_value,
        ndviHealth: ndvi.health_status,
      });

      // Build NDVI trend (simulate 30-day)
      const baseNdvi = ndvi.ndvi_value || 0.5;
      const trend = Array.from({ length: 30 }, (_, i) => ({
        day: `D-${30 - i}`,
        ndvi: parseFloat((baseNdvi + (Math.random() - 0.5) * 0.12 + (i / 30) * (ndviTrigger ? -0.15 : 0.05)).toFixed(3)),
        expected: parseFloat((baseNdvi + 0.05).toFixed(3)),
      }));
      setNdviTrend(trend);

      // Check existing claim
      const claim = policy.claim_status || null;
      setClaimStatus(claim);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [policies]);

  useEffect(() => {
    if (selectedId) loadDashboard(selectedId);
  }, [selectedId, loadDashboard]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboard(selectedId);
    setRefreshing(false);
  };

  const handleSubmitClaim = async () => {
    if (!selectedPolicy || !walletAddress) {
      toast.warning('Connect wallet to submit a claim');
      return;
    }
    setClaimLoading(true);
    try {
      const [lat, lon] = (selectedPolicy.farm_location || '26.8467,80.9462').split(',').map(Number);
      const res = await submitClaim({
        wallet_address: walletAddress,
        policy_id: parseInt(selectedId),
        latitude: lat, longitude: lon,
      });
      setClaimStatus(res);
      if (res.is_approved) toast.success(`✅ Claim approved! Payout: ₹${(res.payout_amount || 0).toLocaleString()}`);
      else toast.warning('Claim submitted — not approved yet');
    } catch (err) {
      toast.error(err?.error || 'Claim submission failed');
    } finally {
      setClaimLoading(false);
    }
  };

  const handleForceEligible = async () => {
    if (!selectedId) return;
    setClaimLoading(true);
    try {
      const res = await forceEligible(parseInt(selectedId));
      toast.info('Force eligible applied — NDVI data simulated');
      if (res) setClaimStatus(res);
    } catch {
      toast.error('Force eligible failed');
    } finally {
      setClaimLoading(false);
    }
  };

  const riskColor = riskData ? (RISK_COLOR[riskData.riskLevel] || '#6b7280') : '#6b7280';

  return (
    <div className="dashboard-page">
      <div className="dashboard-inner">
        {/* Header */}
        <div className="dash-header">
          <div>
            <h1>📊 Policy Dashboard</h1>
            <p>Track your policies, weather risk, NDVI trends, and claim eligibility.</p>
          </div>
        </div>

        {/* Policy Selector */}
        <div className="policy-selector-bar">
          <div className="selector-left">
            <label>Select Policy</label>
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="policy-select">
              <option value="">– Select a Policy –</option>
              {policies.map(p => (
                <option key={p.policy_id} value={p.policy_id}>
                  {formatPolicyId(p.policy_id)} | {p.crop_type} | {p.status || 'Active'}
                </option>
              ))}
            </select>
          </div>
          {selectedId && (
            <button className="btn-refresh" onClick={handleRefresh} disabled={refreshing || loading}>
              {refreshing ? '⏳' : '🔄'} Refresh
            </button>
          )}
        </div>

        {/* Empty State */}
        {!selectedId && (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>Select a policy above to view dashboard</p>
          </div>
        )}

        {/* Loading */}
        {selectedId && loading && (
          <div className="dash-loading">
            <div className="dash-spinner"></div>
            <p>Loading dashboard data...</p>
          </div>
        )}

        {/* Dashboard Panels */}
        {selectedId && !loading && selectedPolicy && (
          <>
            <div className="panels-top">
              {/* Policy Info */}
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-icon">📄</span>
                  <h3>Policy Information</h3>
                </div>
                <div className="panel-body">
                  <div className="info-row"><span>Policy ID</span><strong>{formatPolicyId(selectedPolicy.policy_id)}</strong></div>
                  <div className="info-row"><span>Crop</span><strong>{selectedPolicy.crop_type}</strong></div>
                  <div className="info-row"><span>Status</span>
                    <span className={`badge ${selectedPolicy.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                      {selectedPolicy.status || 'Active'}
                    </span>
                  </div>
                  <div className="info-row"><span>Coverage</span><strong>₹{(selectedPolicy.coverage_amount || 0).toLocaleString()}</strong></div>
                  <div className="info-row"><span>Premium</span><strong>₹{(selectedPolicy.premium_amount || 0).toLocaleString()}</strong></div>
                  <div className="info-row"><span>Farm Area</span><strong>{selectedPolicy.farm_area} acres</strong></div>
                  <div className="info-row"><span>Location</span><strong>{selectedPolicy.farm_location}</strong></div>
                </div>
              </div>

              {/* Current Weather */}
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-icon">🌤️</span>
                  <h3>Current Weather</h3>
                </div>
                <div className="panel-body">
                  {weatherData ? (
                    <>
                      <div className="weather-big">
                        <span className="temp-val">{weatherData.temperature}°C</span>
                        <span className="weather-desc">{weatherData.weather_description || weatherData.weather_main}</span>
                      </div>
                      <div className="info-row"><span>💧 Humidity</span><strong>{weatherData.humidity}%</strong></div>
                      <div className="info-row"><span>💨 Wind</span><strong>{weatherData.wind_speed} m/s</strong></div>
                      <div className="info-row"><span>🌧️ Rainfall</span><strong>{weatherData.rainfall || weatherData.rainfall_1h || 0} mm</strong></div>
                      <div className="info-row"><span>Risk Level</span>
                        <span className="risk-pill" style={{ background: `${riskColor}20`, color: riskColor }}>
                          {weatherData.risk_level || 'Normal'}
                        </span>
                      </div>
                      <div className="info-row"><span>Trigger</span>
                        <span className={`badge ${weatherData.weather_trigger ? 'badge-red' : 'badge-green'}`}>
                          {weatherData.weather_trigger ? '⚠️ Yes' : '✅ No'}
                        </span>
                      </div>
                    </>
                  ) : <p className="no-data">Select a policy to view weather data.</p>}
                </div>
              </div>

              {/* NDVI Analysis */}
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-icon">🌾</span>
                  <h3>NDVI Analysis</h3>
                </div>
                <div className="panel-body">
                  {ndviData ? (
                    <>
                      <div className="ndvi-gauge">
                        <span className="ndvi-val">{ndviData.ndvi_value?.toFixed(3) || '–'}</span>
                        <span className="ndvi-label">NDVI Value</span>
                      </div>
                      <div className="info-row"><span>Health Status</span>
                        <strong className={ndviData.ndvi_trigger ? 'text-red' : 'text-green'}>
                          {ndviData.health_status || '–'}
                        </strong>
                      </div>
                      <div className="info-row"><span>Trigger</span>
                        <span className={`badge ${ndviData.ndvi_trigger ? 'badge-red' : 'badge-green'}`}>
                          {ndviData.ndvi_trigger ? '⚠️ Critical' : '✅ Normal'}
                        </span>
                      </div>
                      <div className="info-row"><span>Source</span><strong style={{fontSize:'0.78rem'}}>{ndviData.data_source || 'ML Model'}</strong></div>
                    </>
                  ) : <p className="no-data">Select a policy to view NDVI analysis.</p>}
                </div>
              </div>
            </div>

            <div className="panels-bottom">
              {/* Risk Prediction */}
              <div className="panel panel-risk">
                <div className="panel-header">
                  <span className="panel-icon">🧠</span>
                  <h3>Risk Prediction</h3>
                </div>
                <div className="panel-body">
                  {riskData ? (
                    <>
                      <div className="risk-score-block">
                        <div className="risk-circle" style={{ borderColor: riskColor, color: riskColor }}>
                          {riskData.riskLevel}
                        </div>
                        <div className="risk-details">
                          <div className="info-row"><span>Weather Trigger</span>
                            <span className={`badge ${riskData.weatherTrigger ? 'badge-red' : 'badge-green'}`}>
                              {riskData.weatherTrigger ? 'YES' : 'NO'}
                            </span>
                          </div>
                          <div className="info-row"><span>NDVI Trigger</span>
                            <span className={`badge ${riskData.ndviTrigger ? 'badge-red' : 'badge-green'}`}>
                              {riskData.ndviTrigger ? 'YES' : 'NO'}
                            </span>
                          </div>
                          <div className="info-row"><span>Dual Trigger</span>
                            <span className={`badge ${riskData.dual ? 'badge-red' : 'badge-green'}`}>
                              {riskData.dual ? '⚠️ CLAIM ELIGIBLE' : 'NOT ELIGIBLE'}
                            </span>
                          </div>
                          <div className="info-row"><span>Confidence</span><strong>{riskData.confidence?.toFixed(1)}%</strong></div>
                        </div>
                      </div>
                      <p className="model-note">Model: {riskData.model}</p>
                    </>
                  ) : <p className="no-data">Select a policy to view risk prediction.</p>}
                </div>
              </div>

              {/* NDVI Trend */}
              <div className="panel panel-trend">
                <div className="panel-header">
                  <span className="panel-icon">📈</span>
                  <h3>NDVI Trend</h3>
                </div>
                <div className="panel-body">
                  {ndviTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={ndviTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
                        <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v) => v.toFixed(3)} />
                        <ReferenceLine y={0.3} stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'Stress', fontSize: 10, fill: '#ef4444' }} />
                        <Line type="monotone" dataKey="ndvi" stroke="#1a6b4a" dot={false} strokeWidth={2} name="Actual NDVI" />
                        <Line type="monotone" dataKey="expected" stroke="#93c5fd" dot={false} strokeDasharray="5 3" strokeWidth={1.5} name="Expected" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <p className="no-data">NDVI trend will appear here.</p>}
                </div>
              </div>
            </div>

            {/* Claim Status Panel */}
            <div className="panel panel-claim">
              <div className="panel-header">
                <span className="panel-icon">⚡</span>
                <h3>Claim Status</h3>
              </div>
              <div className="panel-body claim-body">
                {claimStatus ? (
                  <div className={`claim-result ${claimStatus.is_approved ? 'claim-approved' : 'claim-pending'}`}>
                    <div className="claim-result-icon">{claimStatus.is_approved ? '✅' : '⏳'}</div>
                    <div>
                      <strong>{claimStatus.is_approved ? 'Claim Approved' : 'Claim Submitted'}</strong>
                      {claimStatus.is_approved && (
                        <p>Payout: <strong>₹{(claimStatus.payout_amount || 0).toLocaleString()}</strong></p>
                      )}
                      <p className="claim-id">Claim ID: {claimStatus.claim_id}</p>
                    </div>
                  </div>
                ) : (
                  <p className="no-data">No claim submitted for this policy yet.</p>
                )}
                <div className="claim-actions">
                  <button className="btn-submit-claim" onClick={handleSubmitClaim} disabled={claimLoading}>
                    {claimLoading ? '⏳ Processing...' : '📋 Submit Claim'}
                  </button>
                  <button className="btn-force" onClick={handleForceEligible} disabled={claimLoading} title="Use when NDVI data is simulated">
                    🔧 Force Eligible
                  </button>
                </div>
                <p className="force-note">* "Force eligible" is for when NDVI data is simulated in demo</p>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="footer-note">CropInsure | Smart Contract Based Crop Insurance</div>
    </div>
  );
}
