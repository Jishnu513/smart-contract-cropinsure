import React, { useState, useEffect } from 'react';
import { getFarmer, getStats, getAllClaims } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FaUser, FaFileContract, FaMoneyBillWave, FaChartBar, FaCheckCircle, FaTimesCircle, FaSyncAlt } from 'react-icons/fa';
import '../styles/Dashboard.css';

const Dashboard = ({ walletAddress }) => {
  const [farmerData, setFarmerData] = useState(null);
  const [stats, setStats] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimsLoading, setClaimsLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [walletAddress]);

  const fetchDashboardData = async () => {
    try {
      const [farmer, systemStats] = await Promise.all([
        getFarmer(walletAddress),
        getStats()
      ]);
      setFarmerData(farmer);
      setStats(systemStats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
    fetchClaims();
  };

  const fetchClaims = async () => {
    setClaimsLoading(true);
    try {
      const data = await getAllClaims();
      setClaims(data.claims || []);
    } catch (error) {
      console.error('Error fetching claims:', error);
    } finally {
      setClaimsLoading(false);
    }
  };

  const formatClaimId = (id) => `CLM-${String(id).padStart(4, '0')}`;
  const formatPolicyId = (id) => `POL-${String(id).padStart(4, '0')}`;
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const chartData = stats ? [
    { name: 'Farmers', count: stats.total_farmers },
    { name: 'Policies', count: stats.total_policies },
    { name: 'Claims', count: stats.total_claims },
    { name: 'Approved', count: stats.approved_claims }
  ] : [];

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-spinner">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome to your crop insurance dashboard</p>
      </div>

      {farmerData && (
        <div className="farmer-profile">
          <h2><FaUser /> Farmer Profile</h2>
          <div className="profile-grid">
            <div className="profile-item">
              <span className="profile-label">Name:</span>
              <span className="profile-value">{farmerData.name}</span>
            </div>
            <div className="profile-item">
              <span className="profile-label">Wallet:</span>
              <span className="profile-value">{farmerData.wallet_address}</span>
            </div>
            <div className="profile-item">
              <span className="profile-label">Farm Location:</span>
              <span className="profile-value">{farmerData.farm_location}</span>
            </div>
            <div className="profile-item">
              <span className="profile-label">Farm Area:</span>
              <span className="profile-value">{farmerData.farm_area} hectares</span>
            </div>
            <div className="profile-item">
              <span className="profile-label">Crop Type:</span>
              <span className="profile-value">{farmerData.crop_type}</span>
            </div>
          </div>
        </div>
      )}

      {stats && (
        <>
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-icon"><FaUser /></div>
              <div className="stat-content">
                <h3>{stats.total_farmers}</h3>
                <p>Total Farmers</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><FaFileContract /></div>
              <div className="stat-content">
                <h3>{stats.total_policies}</h3>
                <p>Active Policies</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><FaMoneyBillWave /></div>
              <div className="stat-content">
                <h3>{stats.total_claims}</h3>
                <p>Total Claims</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon success"><FaChartBar /></div>
              <div className="stat-content">
                <h3>{stats.approved_claims}</h3>
                <p>Approved Claims</p>
              </div>
            </div>
          </div>

          <div className="chart-section">
            <h2>System Statistics</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#4CAF50" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="approval-rate">
            <h3>Claim Approval Rate</h3>
            <div className="rate-display">
              {stats.total_claims > 0
                ? ((stats.approved_claims / stats.total_claims) * 100).toFixed(1)
                : 0}%
            </div>
            <p>{stats.approved_claims} out of {stats.total_claims} claims approved</p>
          </div>
        </>
      )}

      {/* ===== CLAIMS HISTORY TABLE ===== */}
      <div className="claims-history-section">
        <div className="claims-history-header">
          <h2>All Claims History</h2>
          <button className="refresh-btn" onClick={fetchClaims} disabled={claimsLoading}>
            <FaSyncAlt className={claimsLoading ? 'spinning' : ''} /> Refresh
          </button>
        </div>

        {claimsLoading ? (
          <div className="loading-spinner">Loading claims...</div>
        ) : claims.length === 0 ? (
          <div className="no-claims">No claims submitted yet.</div>
        ) : (
          <div className="claims-table-wrapper">
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
                {claims.map((claim, idx) => (
                  <tr key={idx}>
                    <td><span className="claim-id">{formatClaimId(claim.claim_id)}</span></td>
                    <td>{formatPolicyId(claim.policy_id)}</td>
                    <td>
                      <span className={`status-badge ${claim.is_approved ? 'approved' : 'rejected'}`}>
                        {claim.is_approved
                          ? <><FaCheckCircle /> APPROVED</>
                          : <><FaTimesCircle /> REJECTED</>}
                      </span>
                    </td>
                    <td>
                      <span className={claim.weather_trigger ? 'trigger-yes' : 'trigger-no'}>
                        {claim.weather_trigger ? '✅ Yes' : '❌ No'}
                      </span>
                    </td>
                    <td>
                      <span className={claim.ndvi_trigger ? 'trigger-yes' : 'trigger-no'}>
                        {claim.ndvi_trigger ? '✅ Yes' : '❌ No'}
                      </span>
                    </td>
                    <td className="payout-cell">
                      {claim.is_approved
                        ? `₹${(claim.payout_amount ?? 0).toLocaleString()}`
                        : <span className="no-payout">INR 0</span>}
                    </td>
                    <td>{formatDate(claim.claim_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <a href="/create-policy" className="action-btn">Create New Policy</a>
          <a href="/pay-premium" className="action-btn">Pay Premium</a>
          <a href="/submit-claim" className="action-btn">Submit Claim</a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
