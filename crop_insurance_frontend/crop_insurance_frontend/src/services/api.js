import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api';
const BASE_URL = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace('/api', '')
  : 'http://127.0.0.1:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Health Check
export const checkBackendHealth = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Farmer APIs
export const registerFarmer = async (farmerData) => {
  try {
    const response = await api.post('/register_farmer', farmerData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getFarmer = async (walletAddress) => {
  try {
    const response = await api.get(`/farmer/${walletAddress}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Policy APIs
export const createPolicy = async (policyData) => {
  try {
    const response = await api.post('/create_policy', policyData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getAllPolicies = async () => {
  try {
    const response = await api.get('/policies');
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getPolicyDashboard = async (policyId) => {
  try {
    const response = await api.get(`/policy/${policyId}/dashboard`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const forceEligible = async (policyId) => {
  try {
    const response = await api.post(`/policy/${policyId}/force_eligible`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const payPremium = async (premiumData) => {
  try {
    const response = await api.post('/pay_premium', premiumData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getPolicy = async (policyId) => {
  try {
    const response = await api.get(`/policy/${policyId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Claim APIs
export const submitClaim = async (claimData) => {
  try {
    const response = await api.post('/submit_claim', claimData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getClaim = async (claimId) => {
  try {
    const response = await api.get(`/claim/${claimId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getAllClaims = async () => {
  try {
    const response = await api.get('/claims');
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Weather and NDVI APIs
export const checkWeather = async (weatherData) => {
  try {
    const response = await api.post('/check_weather', weatherData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const checkNDVI = async (ndviData) => {
  try {
    const response = await api.post('/check_ndvi', ndviData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Statistics API
export const getStats = async () => {
  try {
    const response = await api.get('/stats');
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export default api;
