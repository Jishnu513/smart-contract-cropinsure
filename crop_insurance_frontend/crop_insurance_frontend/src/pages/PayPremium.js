import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { payPremium } from '../services/api';
import '../styles/Form.css';

const PayPremium = ({ walletAddress }) => {
  const [formData, setFormData] = useState({
    policy_id: '',
    premium_amount: ''
  });
  const [loading, setLoading] = useState(false);

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
        policy_id: parseInt(formData.policy_id),
        premium_amount: parseFloat(formData.premium_amount)
      };

      const response = await payPremium(data);
      toast.success('Premium paid successfully! Policy activated.');
      
      // Reset form
      setFormData({
        policy_id: '',
        premium_amount: ''
      });
    } catch (error) {
      toast.error(error.error || 'Failed to pay premium');
      console.error('Premium payment error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page">
      <div className="form-container">
        <h1>Pay Premium</h1>
        <p className="form-description">
          Activate your insurance policy by paying the premium
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
            <small className="form-text">
              You received this ID when creating the policy
            </small>
          </div>

          <div className="form-group">
            <label>Premium Amount (₹) *</label>
            <input
              type="number"
              name="premium_amount"
              value={formData.premium_amount}
              onChange={handleChange}
              placeholder="Enter premium amount"
              min="100"
              step="0.01"
              required
              className="form-control"
            />
            <small className="form-text">
              Enter the exact premium amount from your policy
            </small>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`btn btn-primary btn-block ${loading ? 'loading' : ''}`}
          >
            {loading ? 'Processing Payment...' : 'Pay Premium'}
          </button>
        </form>

        <div className="info-box">
          <h3>ℹ️ Payment Information</h3>
          <ul>
            <li>Premium must match the policy's calculated amount</li>
            <li>Payment activates the policy immediately</li>
            <li>Transaction is recorded on blockchain</li>
            <li>Weather and crop monitoring begins after activation</li>
            <li>Keep your transaction hash for records</li>
          </ul>
        </div>

        <div className="warning-box">
          <h3>⚠️ Important</h3>
          <p>
            Ensure you have sufficient balance in your wallet. 
            The payment will be processed via smart contract and cannot be reversed.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PayPremium;
