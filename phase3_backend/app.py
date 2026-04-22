"""
PHASE 3: Flask Backend API - Main Application
Smart Contract-Based Automated Crop Insurance System

This is the main Flask application that connects:
- ML Models (Weather + NDVI)
- Blockchain Smart Contract
- External APIs (Weather, Satellite) - NOW WITH REAL APIs!
- Database
"""

import sys
import io
# Fix Unicode/emoji output on Windows terminals (cp1252 -> utf-8)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from flask import Flask, request, jsonify
from flask_cors import CORS
from web3 import Web3
import pickle
import numpy as np
import pandas as pd
import json
from datetime import datetime, timedelta
import os
import hashlib
import time
import random
import string
import requests  # NEW: For API calls
from dotenv import load_dotenv
load_dotenv()  # Load API keys from .env file

# ==================== FLASK APP INITIALIZATION ====================

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

print("="*70)
print("CROP INSURANCE BACKEND API - WITH REAL API INTEGRATIONS")
print("="*70)

# ==================== CONFIGURATION ====================

# Blockchain configuration - supports Ganache (local) or Sepolia (deployed)
BLOCKCHAIN_URL = os.environ.get("BLOCKCHAIN_RPC_URL", "http://127.0.0.1:8545")
BLOCKCHAIN_ENABLED = True
try:
    w3 = Web3(Web3.HTTPProvider(BLOCKCHAIN_URL))
except Exception:
    BLOCKCHAIN_ENABLED = False
    w3 = None

# ==================== API KEYS ====================
# OpenWeatherMap API Key - loaded from environment variable
OPENWEATHER_API_KEY = os.environ.get("OPENWEATHER_API_KEY", "YOUR_API_KEY_HERE")

# Private key for Sepolia transactions (not needed for Ganache)
PRIVATE_KEY = os.environ.get("PRIVATE_KEY", None)

# NASA POWER - No API key needed! ✅
print("🌦️ OpenWeatherMap API: READY")
print("🛰️ NASA POWER API: READY (No key needed)")

# Load contract ABI and address
contract = None
CONTRACT_ADDRESS = None
CONTRACT_ABI = None
try:
    with open('deployment_info.json', 'r') as f:
        deployment_info = json.load(f)
        CONTRACT_ADDRESS = deployment_info['contract_address']
        CONTRACT_ABI = deployment_info['contract_abi']
    # Create contract instance
    if w3:
        contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
except Exception as e:
    print(f"⚠️  Could not load contract: {e}")
    BLOCKCHAIN_ENABLED = False

# Check blockchain connection (non-fatal)
if w3 and w3.is_connected():
    print(f"✅ Connected to blockchain at {BLOCKCHAIN_URL}")
    if CONTRACT_ADDRESS:
        print(f"📍 Contract Address: {CONTRACT_ADDRESS}")
else:
    print(f"⚠️  Blockchain NOT connected at {BLOCKCHAIN_URL}")
    print(f"   Backend will start but blockchain calls will be simulated.")
    BLOCKCHAIN_ENABLED = False

# ==================== GANACHE ACCOUNT HELPER ====================
# Ganache (both UI and CLI) only allows transactions FROM its own
# pre-loaded unlocked accounts.  The wallet address a user types in
# the frontend is just a MetaMask address — Ganache doesn't know it.
#
# Fix: map each user wallet → a Ganache account (round-robin).
# The user's real wallet is stored in the DB for identification;
# blockchain txs are sent FROM the matching Ganache account.

_wallet_to_ganache = {}   # user_wallet → ganache_account

def get_ganache_sender(user_wallet: str) -> str:
    """
    Returns a Ganache unlocked account to use as `from` for this wallet.
    Creates a stable mapping so the same user always uses the same
    Ganache account (important for the contract's onlyRegisteredFarmer guard).
    """
    user_wallet = user_wallet.lower()
    if user_wallet not in _wallet_to_ganache:
        ganache_accounts = w3.eth.accounts          # list of unlocked accounts
        idx = len(_wallet_to_ganache) % len(ganache_accounts)
        _wallet_to_ganache[user_wallet] = ganache_accounts[idx]
        print(f"   🔑 Mapped {user_wallet[:10]}... → {ganache_accounts[idx]}")
    return _wallet_to_ganache[user_wallet]

# Pre-load any existing wallet→ganache mappings from the database
def _restore_wallet_mappings(db):
    """Safely restore wallet mappings — skips if Ganache is not running."""
    try:
        ganache_accounts = w3.eth.accounts   # This fails if Ganache is offline
        seen = set()
        for entry in db.get('farmers', []):
            wa = entry.get('wallet_address', '').lower()
            if wa and wa not in seen:
                idx = len(seen) % len(ganache_accounts)
                _wallet_to_ganache[wa] = ganache_accounts[idx]
                seen.add(wa)
        print(f"   🔑 Restored {len(seen)} wallet mappings from DB")
    except Exception as e:
        print(f"   ⚠️  Could not restore wallet mappings (Ganache offline): {e}")
        print(f"   Mappings will be created fresh when Ganache connects.")


# ==================== LOAD ML MODELS ====================

print("\n📊 Loading ML Models...")

# ── Resolve model paths: check models/ subfolder first, then root ──────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))          # phase3_backend/
ROOT_DIR   = os.path.dirname(BASE_DIR)                           # pproject/
MODELS_DIR = os.path.join(BASE_DIR, 'models')                    # phase3_backend/models/

def _find_model(filename):
    """Look for model in models/ subfolder first, then root directory."""
    local = os.path.join(MODELS_DIR, filename)
    if os.path.exists(local):
        return local
    return os.path.join(ROOT_DIR, filename)

WEATHER_RF_PATH  = _find_model('weather_random_forest_model.pkl')
WEATHER_XGB_PATH = _find_model('weather_xgboost_model.pkl')
WEATHER_ENC_PATH = _find_model('weather_label_encoder.pkl')
WEATHER_SCL_PATH = _find_model('weather_scaler.pkl')
NDVI_RF_PATH     = _find_model('ndvi_rf_classifier.pkl')
NDVI_IF_PATH     = _find_model('ndvi_isolation_forest_model.pkl')

weather_model  = None
weather_scaler = None
weather_encoder = None
ndvi_rf_model  = None
ndvi_if_model  = None
MODEL_LOADED   = False

try:
    with open(WEATHER_RF_PATH, 'rb') as f:
        weather_model = pickle.load(f)
    print("   ✅ Weather Random Forest loaded")

    with open(WEATHER_SCL_PATH, 'rb') as f:
        weather_scaler = pickle.load(f)
    print("   ✅ Weather Scaler loaded")

    with open(WEATHER_ENC_PATH, 'rb') as f:
        weather_encoder = pickle.load(f)
    print("   ✅ Weather Label Encoder loaded")

    with open(NDVI_RF_PATH, 'rb') as f:
        ndvi_rf_model = pickle.load(f)
    print("   ✅ NDVI Random Forest loaded")

    with open(NDVI_IF_PATH, 'rb') as f:
        ndvi_if_model = pickle.load(f)
    print("   ✅ NDVI Isolation Forest loaded")

    MODEL_LOADED = True
    print("   ✅ All ML models loaded successfully")

except Exception as e:
    print(f"   ⚠️ ML Models load error: {e}")
    print("   ⚠️ API will use rule-based fallback")
    MODEL_LOADED = False

# ==================== DATABASE (Simple JSON for now) ====================

DATABASE_FILE = 'farmers_db.json'

def load_database():
    """Load farmers database from JSON"""
    if os.path.exists(DATABASE_FILE):
        with open(DATABASE_FILE, 'r') as f:
            return json.load(f)
    return {'farmers': [], 'policies': [], 'claims': []}

def save_database(db):
    """Save farmers database to JSON"""
    with open(DATABASE_FILE, 'w') as f:
        json.dump(db, f, indent=4)

db = load_database()
_restore_wallet_mappings(db)   # Restore wallet→ganache mappings

# ==================== NEW: OPENWEATHERMAP API INTEGRATION ====================

def get_openweather_data(latitude, longitude):
    """
    Fetch REAL current weather from OpenWeatherMap API
    FREE: 1,000 calls/day
    """
    try:
        url = "https://api.openweathermap.org/data/2.5/weather"
        params = {
            'lat': latitude,
            'lon': longitude,
            'appid': OPENWEATHER_API_KEY,
            'units': 'metric'
        }
        
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if response.status_code == 200:
            weather_data = {
                'temperature': data['main']['temp'],
                'humidity': data['main']['humidity'],
                'wind_speed': data['wind']['speed'],
                'rainfall_1h': data.get('rain', {}).get('1h', 0),
                'weather_main': data['weather'][0]['main'],
                'weather_description': data['weather'][0]['description'],
                'location': data['name'],
                'country': data['sys']['country']
            }
            
            print(f"✅ OpenWeatherMap: {weather_data['location']}, {weather_data['country']}")
            print(f"   Temp: {weather_data['temperature']}°C, Rain: {weather_data['rainfall_1h']}mm")
            return weather_data
        else:
            print(f"❌ OpenWeatherMap error: {data.get('message', 'Unknown')}")
            return None
            
    except Exception as e:
        print(f"⚠️ OpenWeatherMap error: {e}")
        return None


def check_weather_triggers_real(weather_data):
    """Check if weather triggers insurance claim (PMFBY guidelines)"""
    if not weather_data:
        return False, "No Data", "Unable to fetch weather"
    
    trigger = False
    risk_level = "Normal"
    reason = "Weather conditions normal"
    
    # PMFBY Weather Triggers (crop-stress standards)
    if weather_data['temperature'] > 35:          # 35°C = heat stress onset for rice/wheat
        trigger = True
        risk_level = "Extreme Heat"
        reason = f"Temperature {weather_data['temperature']}°C > 35°C (heat stress threshold)"
    
    elif weather_data['temperature'] < 10:
        trigger = True
        risk_level = "Cold Stress"
        reason = f"Temperature {weather_data['temperature']}°C < 10°C (frost risk)"
    
    elif weather_data['rainfall_1h'] > 15:        # 15mm/hr = heavy rain (IMD standard)
        trigger = True
        risk_level = "Heavy Rainfall"
        reason = f"Heavy rain: {weather_data['rainfall_1h']}mm/hour"
    
    elif weather_data['weather_main'] in ['Thunderstorm', 'Tornado', 'Hurricane', 'Squall']:
        trigger = True
        risk_level = "Severe Storm"
        reason = f"Severe weather: {weather_data['weather_main']}"
    
    elif weather_data['wind_speed'] > 6:          # 6 m/s = crop lodging threshold
        trigger = True
        risk_level = "High Wind"
        reason = f"Wind: {weather_data['wind_speed']} m/s > 6 m/s (crop lodging threshold)"
    
    elif weather_data['humidity'] < 25:           # <25% = drought stress (Rajasthan desert)
        trigger = True
        risk_level = "Extreme Drought"
        reason = f"Critical humidity: {weather_data['humidity']}% < 25% (drought stress)"
    
    return trigger, risk_level, reason


# ==================== NEW: NASA POWER API INTEGRATION ====================

def get_nasa_power_data(latitude, longitude, days_back=30):
    """
    Fetch agricultural weather from NASA POWER API
    FREE: No API key needed!
    Data: Satellite-derived weather (MODIS, MERRA-2)
    """
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        url = "https://power.larc.nasa.gov/api/temporal/daily/point"
        params = {
            'parameters': 'T2M,PRECTOTCORR',
            'community': 'AG',
            'longitude': longitude,
            'latitude': latitude,
            'start': start_date.strftime('%Y%m%d'),
            'end': end_date.strftime('%Y%m%d'),
            'format': 'JSON'
        }
        
        response = requests.get(url, params=params, timeout=20)
        data = response.json()
        
        if response.status_code == 200:
            params_data = data['properties']['parameter']
            
            # Extract and clean data
            temps = [t for t in params_data['T2M'].values() if t != -999.0]
            precip = [p for p in params_data['PRECTOTCORR'].values() if p > 0]
            
            nasa_data = {
                'avg_temperature': round(sum(temps) / len(temps), 2),
                'total_rainfall_30d': round(sum(precip), 2)
            }
            
            print(f"✅ NASA POWER: {days_back}-day data")
            print(f"   Avg Temp: {nasa_data['avg_temperature']}°C, Total Rain: {nasa_data['total_rainfall_30d']}mm")
            return nasa_data
        else:
            print(f"❌ NASA POWER error")
            return None
            
    except Exception as e:
        print(f"⚠️ NASA POWER error: {e}")
        return None


def _synthesize_ndvi_series(temp, rain, n=120):
    """
    Synthesise a plausible 120-step NDVI time series from temperature
    and rainfall conditions — matches the feature space the retrained
    ndvi_rf_classifier was trained on (ndvi_time_series.npy).
    """
    np.random.seed(int(abs(temp * 10 + rain)) % 1000)

    # Base NDVI determined by growing conditions
    if 20 <= temp <= 32 and rain >= 40:
        base, noise = 0.68, 0.07   # Healthy
    elif 15 <= temp <= 36 and rain >= 20:
        base, noise = 0.52, 0.08   # Moderate
    elif rain < 10:
        base, noise = 0.19, 0.05   # Severe drought
    elif rain < 22:
        base, noise = 0.28, 0.06   # Moderate drought
    elif temp > 40:
        base, noise = 0.22, 0.06   # Heat stress
    elif temp < 8:
        base, noise = 0.24, 0.05   # Cold/frost
    elif rain > 220:
        base, noise = 0.27, 0.07   # Waterlogging
    else:
        base, noise = 0.42, 0.08   # Mild stress

    # Seasonal sine wave + noise
    t     = np.linspace(0, 2 * np.pi, n)
    amplitude = base * 0.15
    series    = base + amplitude * np.sin(t) + np.random.normal(0, noise, n)
    return np.clip(series, 0.05, 0.95)


def _extract_ndvi_features(series):
    """
    Extract the same 10 features used during training in retrain_all_models.py:
    mean, std, min, max, range, trend, stress_ratio, peak_ndvi, late_mean, drop
    """
    n       = len(series)
    mean_   = series.mean()
    std_    = series.std()
    min_    = series.min()
    max_    = series.max()
    range_  = max_ - min_
    # Trend (linear regression slope)
    x       = np.arange(n)
    xm      = x - x.mean()
    trend   = float(((series - mean_) * xm).sum() / (xm ** 2).sum())
    stress  = float((series < 0.30).mean())          # stress_ratio
    peak    = float(np.percentile(series, 90))        # peak_ndvi
    late    = float(series[-30:].mean())              # late_mean
    early   = float(series[:30].mean())               # early_mean
    drop    = early - late                            # early_late_drop

    return np.array([[mean_, std_, min_, max_, range_,
                      trend, stress, peak, late, drop]])


def estimate_ndvi_from_ml_and_nasa(nasa_data, latitude, longitude):
    """
    FIXED: Estimate NDVI using the retrained ndvi_rf_classifier.pkl (10 features)
    and ndvi_isolation_forest_model.pkl.
    Falls back to enhanced multi-factor rule-based logic if models unavailable.
    """
    if not nasa_data:
        return 0.5, "Unknown", False, "No data"

    temp  = nasa_data['avg_temperature']
    rain  = nasa_data['total_rainfall_30d']

    # ── Try to use the REAL trained NDVI Random Forest ──────────────────
    if ndvi_rf_model is not None:
        try:
            # ── Synthesise 120-step NDVI series from weather conditions ──
            # Extracts the same 10 features the retrained model was trained on
            series      = _synthesize_ndvi_series(temp, rain)
            features    = _extract_ndvi_features(series)          # (1, 10)

            # Predict: 0 = Healthy, 1 = Stressed
            pred        = ndvi_rf_model.predict(features)[0]
            proba       = ndvi_rf_model.predict_proba(features)[0]
            stress_prob = float(max(proba))

            # HARD FALLBACK: If the actual generated NDVI mean is low, the ML is wrong
            if series.mean() < 0.35:
                pred = 1
                stress_prob = max(stress_prob, 0.85)

            # Run Isolation Forest anomaly check (same 10 features)
            anomaly_score = 0.5
            if ndvi_if_model is not None:
                raw_score     = ndvi_if_model.decision_function(features)[0]
                anomaly_score = float(1 / (1 + np.exp(raw_score)))  # sigmoid → 0–1

            # Map prediction to NDVI value range
            if pred == 1:   # Stressed
                ndvi    = round(series[series < 0.30].mean()
                                if (series < 0.30).any()
                                else 0.15 + (1 - stress_prob) * 0.13, 3)
                health  = "Stressed (ML Detected)"
                trigger = True
            else:           # Healthy
                ndvi    = round(series.mean(), 3)
                health  = "Healthy (ML Verified)"
                trigger = False

            # Override: Isolation Forest detects extreme anomaly
            if anomaly_score > 0.75 and not trigger:
                trigger = True
                health  = "Anomaly Detected (Isolation Forest Override)"
                ndvi    = round(min(ndvi, 0.28), 3)

            print(f"   🌾 NDVI pred={pred} prob={stress_prob:.2f} IF={anomaly_score:.2f} → {ndvi}")
            return ndvi, health, trigger, "Retrained NDVI RF + Isolation Forest"

        except Exception as ml_err:
            print(f"   ⚠️ NDVI ML failed: {ml_err} — rule-based fallback")

    # ── Enhanced rule-based fallback (multi-factor, defensible) ─────────
    # VPD proxy: higher temp + lower rain = more stress
    stress_score = 0

    if rain < 10:              stress_score += 3   # severe drought
    elif rain < 25:            stress_score += 2   # moderate drought
    elif rain > 220:           stress_score += 2   # waterlogging

    if temp > 40:              stress_score += 2   # extreme heat
    elif temp > 37:            stress_score += 1
    elif temp < 8:             stress_score += 2   # frost
    elif temp < 12:            stress_score += 1

    # NDVI derived from stress score
    if stress_score >= 4:
        ndvi    = round(0.15 + np.random.uniform(0, 0.08), 3)
        health  = "Severely Stressed"
        trigger = True
    elif stress_score >= 2:
        ndvi    = round(0.25 + np.random.uniform(0, 0.08), 3)
        health  = "Moderately Stressed"
        trigger = True
    elif stress_score == 1:
        ndvi    = round(0.40 + np.random.uniform(0, 0.10), 3)
        health  = "Mild Stress"
        trigger = False
    else:
        ndvi    = round(0.60 + np.random.uniform(0, 0.20), 3)
        health  = "Healthy"
        trigger = False

    return ndvi, health, trigger, "Rule-based (NASA weather proxy)"


# ==================== API ENDPOINTS ====================

@app.route('/', methods=['GET'])
def home():
    """API Home - Health Check"""
    return jsonify({
        'status': 'running',
        'message': 'Crop Insurance Backend API with Real Data Sources',
        'version': '2.0',
        'blockchain_connected': w3.is_connected(),
        'contract_address': CONTRACT_ADDRESS,
        'models_loaded': MODEL_LOADED,
        'apis_active': {
            'openweathermap': True,
            'nasa_power': True
        },
        'endpoints': {
            'POST /api/register_farmer': 'Register new farmer',
            'POST /api/create_policy': 'Create insurance policy',
            'POST /api/pay_premium': 'Pay policy premium',
            'POST /api/submit_claim': 'Submit insurance claim',
            'GET /api/farmer/<address>': 'Get farmer details',
            'GET /api/policy/<policy_id>': 'Get policy details',
            'GET /api/claim/<claim_id>': 'Get claim details',
            'POST /api/check_weather': 'Check weather conditions',
            'POST /api/check_ndvi': 'Check NDVI/crop health',
            'GET /api/stats': 'Get system statistics'
        }
    })

# ==================== FARMER REGISTRATION ====================

@app.route('/api/register_farmer', methods=['POST'])
def register_farmer():
    """
    Register a new farmer
    
    Request Body:
    {
        "name": "Ramesh Kumar",
        "wallet_address": "0x...",
        "farm_location": "28.6139,77.2090",
        "farm_area": 250,  // in hectares * 100
        "crop_type": "Rice"
    }
    """
    try:
        data = request.json
        
        # Validate input
        required_fields = ['name', 'wallet_address', 'farm_location', 'farm_area', 'crop_type']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing field: {field}'}), 400

        # Validate wallet address format (must be 0x + 40 hex chars = 42 total)
        raw_wallet = data['wallet_address'].strip()
        if not raw_wallet.startswith('0x') or len(raw_wallet) != 42:
            return jsonify({
                'error': f'Invalid wallet address: "{raw_wallet[:20]}..." — must be 42 characters (0x + 40 hex). You may have entered a transaction hash by mistake.',
                'hint': 'A wallet address looks like: 0x75f17Bab3bf4fE4f97dcA1CC627648CD08945c79'
            }), 400

        # Convert to checksum address
        wallet = w3.to_checksum_address(raw_wallet)
        # Get the Ganache unlocked account that maps to this user's wallet
        ganache_sender = get_ganache_sender(wallet)
        
        # Check if already registered (check using ganache_sender on-chain)
        if contract.functions.farmers(ganache_sender).call()[4]:  # isRegistered
            return jsonify({'error': 'Farmer already registered'}), 400
        
        # Register on blockchain using mapped Ganache account
        tx_hash = contract.functions.registerFarmer(
            data['name'],
            data['farm_location'],
            int(data['farm_area']),
            data['crop_type']
        ).transact({'from': ganache_sender})
        
        # Wait for transaction
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        if receipt.status == 1:
            # Save to local database
            farmer_data = {
                'wallet_address': wallet,
                'name': data['name'],
                'farm_location': data['farm_location'],
                'farm_area': data['farm_area'],
                'crop_type': data['crop_type'],
                'registration_date': datetime.now().isoformat(),
                'transaction_hash': tx_hash.hex()
            }
            db['farmers'].append(farmer_data)
            save_database(db)
            
            return jsonify({
                'success': True,
                'message': 'Farmer registered successfully',
                'farmer_address': wallet,
                'transaction_hash': tx_hash.hex(),
                'block_number': receipt.blockNumber
            }), 201
        else:
            return jsonify({'error': 'Blockchain transaction failed'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== POLICY CREATION WITH AUTO-PAY ====================

@app.route('/api/create_policy', methods=['POST'])
def create_policy():
    """
    Create insurance policy with optional auto-payment
    
    Request Body:
    {
        "wallet_address": "0x...",
        "crop_type": "Rice",
        "coverage_amount": 100000,
        "season": "Kharif",
        "farm_location": "28.6139,77.2090",
        "farm_area": 2.5,
        "auto_pay": true  // Optional: auto-pay premium
    }
    """
    try:
        data = request.json
        
        # Convert to checksum address
        wallet = w3.to_checksum_address(data['wallet_address'])
        
        # Calculate premium based on season
        coverage_amount = float(data['coverage_amount'])
        season = data.get('season', 'Kharif')
        
        premium_rates = {
            'Kharif': 0.02,
            'Rabi': 0.015,
            'Commercial': 0.05
        }
        
        premium_rate = premium_rates.get(season, 0.02)
        premium_amount = int(coverage_amount * premium_rate)
        
        # Convert to Wei (for blockchain)
        # Using a simple conversion: 1 Rupee = 0.00001 ETH (for demo purposes)
        premium_wei = w3.to_wei(premium_amount * 0.00001, 'ether')
        coverage_wei = w3.to_wei(coverage_amount * 0.00001, 'ether')
        
        # Duration in days (default 120 days)
        duration_days = data.get('duration_days', 120)
        
        # Create policy on blockchain using mapped Ganache account
        ganache_sender = get_ganache_sender(wallet)
        tx_hash = contract.functions.createPolicy(
            data['crop_type'],
            int(premium_wei),
            int(coverage_wei),
            int(duration_days)
        ).transact({'from': ganache_sender})
        
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        if receipt.status == 1:
            # Get policy ID
            policy_id = contract.functions.policyCounter().call()
            
            # Check if auto-pay is requested
            auto_pay = data.get('auto_pay', False)
            
            if auto_pay:
                # Automatically pay premium
                try:
                    pay_tx_hash = contract.functions.payPremium(policy_id).transact({
                        'from': ganache_sender,
                        'value': int(premium_wei)
                    })
                    
                    pay_receipt = w3.eth.wait_for_transaction_receipt(pay_tx_hash)
                    
                    if pay_receipt.status == 1:
                        # Save to database with premium paid status
                        policy_data = {
                            'policy_id': policy_id,
                            'farmer_address': wallet,
                            'crop_type': data['crop_type'],
                            'season': season,
                            'premium_amount': premium_amount,
                            'coverage_amount': coverage_amount,
                            'duration_days': duration_days,
                            'farm_location': data.get('farm_location', ''),
                            'farm_area': data.get('farm_area', 0),
                            'creation_date': datetime.now().isoformat(),
                            'transaction_hash': tx_hash.hex(),
                            'premium_paid': True,
                            'premium_paid_date': datetime.now().isoformat(),
                            'payment_transaction_hash': pay_tx_hash.hex(),
                            'status': 'active'
                        }
                        db['policies'].append(policy_data)
                        save_database(db)
                        
                        return jsonify({
                            'success': True,
                            'message': 'Policy created and premium paid successfully',
                            'policy_id': policy_id,
                            'premium_paid': True,
                            'premium_amount': premium_amount,
                            'transaction_hash': tx_hash.hex(),
                            'payment_transaction_hash': pay_tx_hash.hex(),
                            'status': 'active'
                        }), 201
                    else:
                        # Policy created but payment failed
                        return jsonify({
                            'success': True,
                            'message': 'Policy created but premium payment failed',
                            'policy_id': policy_id,
                            'premium_paid': False,
                            'note': 'Please pay premium manually'
                        }), 201
                        
                except Exception as pay_error:
                    print(f"Auto-payment error: {pay_error}")
                    # Policy created but payment failed
                    return jsonify({
                        'success': True,
                        'message': 'Policy created but auto-payment failed',
                        'policy_id': policy_id,
                        'premium_paid': False,
                        'error': str(pay_error)
                    }), 201
            
            else:
                # Normal policy creation without auto-pay
                policy_data = {
                    'policy_id': policy_id,
                    'farmer_address': wallet,
                    'crop_type': data['crop_type'],
                    'season': season,
                    'premium_amount': premium_amount,
                    'coverage_amount': coverage_amount,
                    'duration_days': duration_days,
                    'farm_location': data.get('farm_location', ''),
                    'farm_area': data.get('farm_area', 0),
                    'creation_date': datetime.now().isoformat(),
                    'transaction_hash': tx_hash.hex(),
                    'premium_paid': False,
                    'status': 'created'
                }
                db['policies'].append(policy_data)
                save_database(db)
                
                return jsonify({
                    'success': True,
                    'message': 'Policy created successfully',
                    'policy_id': policy_id,
                    'premium_paid': False,
                    'transaction_hash': tx_hash.hex()
                }), 201
        else:
            return jsonify({'error': 'Blockchain transaction failed'}), 500
            
    except Exception as e:
        print(f"Error in create_policy: {e}")
        return jsonify({'error': str(e)}), 500

# ==================== PREMIUM PAYMENT ====================

@app.route('/api/pay_premium', methods=['POST'])
def pay_premium():
    """
    Pay premium to activate policy
    
    Request Body:
    {
        "wallet_address": "0x...",
        "policy_id": 1
    }
    """
    try:
        data = request.json
        
        # FIXED: Convert to checksum address
        wallet = w3.to_checksum_address(data['wallet_address'])
        policy_id = int(data['policy_id'])
        ganache_sender = get_ganache_sender(wallet)
        
        # Get premium amount from contract
        policy = contract.functions.getPolicy(policy_id).call()
        premium_amount = policy[2]  # premiumAmount
        
        # Pay premium using mapped Ganache account
        tx_hash = contract.functions.payPremium(policy_id).transact({
            'from': ganache_sender,
            'value': premium_amount
        })
        
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        if receipt.status == 1:
            # Update database
            for p in db['policies']:
                if p['policy_id'] == policy_id:
                    p['status'] = 'active'
                    p['premium_paid_date'] = datetime.now().isoformat()
                    break
            save_database(db)
            
            return jsonify({
                'success': True,
                'message': 'Premium paid successfully',
                'policy_id': policy_id,
                'amount_paid': premium_amount,
                'transaction_hash': tx_hash.hex()
            }), 200
        else:
            return jsonify({'error': 'Payment failed'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== WEATHER CHECK (NOW WITH REAL API!) ====================

@app.route('/api/check_weather', methods=['POST'])
def check_weather():
    """
    Check weather conditions - NOW USES REAL OpenWeatherMap API!
    
    Request Body:
    {
        "latitude": 28.6139,
        "longitude": 77.2090,
        "policy_id": 1
    }
    
    Returns:
    {
        "weather_trigger": true/false,
        "rainfall": 2.5,
        "temperature": 42.3,
        "risk_level": "High Risk",
        "source": "OpenWeatherMap (Real)"
    }
    """
    try:
        data = request.json
        latitude = float(data.get('latitude', 28.6139))
        longitude = float(data.get('longitude', 77.2090))
        
        print(f"\n🌍 Checking weather for GPS: {latitude}, {longitude}")
        
        # Try to get REAL weather from OpenWeatherMap
        weather_data = get_openweather_data(latitude, longitude)
        
        if weather_data:
            # Use REAL weather data
            trigger, risk_level, reason = check_weather_triggers_real(weather_data)
            
            return jsonify({
                'weather_trigger': trigger,
                'rainfall': weather_data['rainfall_1h'],
                'temperature': weather_data['temperature'],
                'humidity': weather_data['humidity'],
                'wind_speed': weather_data['wind_speed'],
                'risk_level': risk_level,
                'reason': reason,
                'location': weather_data['location'],
                'source': 'OpenWeatherMap API (Real GPS Data)',
                'timestamp': datetime.now().isoformat()
            }), 200
        
        # Fallback to simulation if API fails
        print("⚠️ Using simulated weather (API unavailable)")
        
        if MODEL_LOADED and weather_model is not None:
            rainfall = np.random.uniform(0, 300)
            temperature = np.random.uniform(20, 45)
            humidity = np.random.uniform(30, 90)
            wind_speed = np.random.uniform(0, 20)
            
            features = np.array([[rainfall, temperature, humidity, wind_speed]])
            # Scale features (retrained model expects scaled input)
            if weather_scaler is not None:
                features = weather_scaler.transform(features)
            pred_encoded = weather_model.predict(features)[0]
            # Decode label back to string
            if weather_encoder is not None:
                risk_prediction = weather_encoder.inverse_transform([pred_encoded])[0]
            else:
                risk_prediction = str(pred_encoded)
            weather_trigger = risk_prediction in ['High Risk', 'Extreme Risk']
            
        else:
            rainfall = np.random.uniform(0, 300)
            temperature = np.random.uniform(20, 45)
            risk_prediction = "Normal"
            weather_trigger = np.random.random() < 0.8
            if weather_trigger:
                risk_prediction = "High Risk"
        
        return jsonify({
            'weather_trigger': bool(weather_trigger),
            'rainfall': round(float(rainfall), 2),
            'temperature': round(float(temperature), 2),
            'risk_level': risk_prediction,
            'source': 'Simulation (API unavailable)',
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== NDVI CHECK (NOW WITH NASA API!) ====================

@app.route('/api/check_ndvi', methods=['POST'])
def check_ndvi():
    """
    Check NDVI/crop health - NOW USES NASA POWER API!
    
    Request Body:
    {
        "latitude": 28.6139,
        "longitude": 77.2090,
        "policy_id": 1
    }
    
    Returns:
    {
        "ndvi_trigger": true/false,
        "ndvi_value": 0.25,
        "crop_health": "Stressed",
        "source": "NASA POWER"
    }
    """
    try:
        data = request.json
        latitude  = float(data.get('latitude',  28.6139))
        longitude = float(data.get('longitude', 77.2090))

        print(f"\n🛰️  Checking NDVI for GPS: {latitude}, {longitude}")

        # ── Primary: NASA POWER + Trained NDVI ML Models ────────────────
        nasa_data = get_nasa_power_data(latitude, longitude)

        if nasa_data:
            ndvi_value, crop_health, ndvi_trigger, source = \
                estimate_ndvi_from_ml_and_nasa(nasa_data, latitude, longitude)

            print(f"🌾 NDVI: {ndvi_value} | Health: {crop_health} | Source: {source}")

            return jsonify({
                'ndvi_trigger'  : ndvi_trigger,
                'ndvi_value'    : ndvi_value,
                'crop_health'   : crop_health,
                'threshold'     : 0.30,
                'ml_model_used' : MODEL_LOADED,
                'weather_summary': {
                    'avg_temperature'  : nasa_data['avg_temperature'],
                    'total_rainfall_30d': nasa_data['total_rainfall_30d']
                },
                'source'    : source,
                'timestamp' : datetime.now().isoformat()
            }), 200

        # ── Fallback: pure ML model from stored NDVI time-series ─────────
        print("⚠️  NASA unavailable — using ML model direct inference")

        if ndvi_rf_model is not None:
            # Simple feature: lat/lon + dummy weather (no NASA)
            features    = np.array([[latitude, longitude, 25.0, 30.0, 1.0, 0, 0, 0]])
            pred        = ndvi_rf_model.predict(features)[0]
            proba       = float(max(ndvi_rf_model.predict_proba(features)[0]))
            ndvi_value  = round(0.20 + (1 - proba) * 0.15, 3) if pred == 1 \
                          else round(0.55 + proba * 0.25, 3)
            ndvi_trigger = (pred == 1)
            crop_health  = "Stressed (ML only)" if ndvi_trigger else "Healthy (ML only)"
            source       = "NDVI RF Model (NASA unavailable)"
        else:
            # Last resort: random simulation with bias toward realistic values
            ndvi_value   = round(np.random.uniform(0.20, 0.75), 3)
            ndvi_trigger = ndvi_value < 0.30
            crop_health  = "Stressed" if ndvi_trigger else \
                           ("Moderate" if ndvi_value < 0.50 else "Healthy")
            source       = "Simulation (all sources unavailable)"

        return jsonify({
            'ndvi_trigger'  : bool(ndvi_trigger),
            'ndvi_value'    : ndvi_value,
            'crop_health'   : crop_health,
            'threshold'     : 0.30,
            'ml_model_used' : MODEL_LOADED,
            'source'        : source,
            'timestamp'     : datetime.now().isoformat()
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== CLAIM SUBMISSION ====================

@app.route('/api/submit_claim', methods=['POST'])
def submit_claim():
    """
    Submit insurance claim with double verification
    
    Request Body:
    {
        "wallet_address": "0x...",
        "policy_id": 1,
        "latitude": 28.6139,
        "longitude": 77.2090
    }
    """
    try:
        data      = request.json
        wallet    = w3.to_checksum_address(data['wallet_address'])
        policy_id = int(data['policy_id'])
        latitude  = float(data.get('latitude',  28.6139))
        longitude = float(data.get('longitude', 77.2090))

        print(f"\n📋 Claim submitted by {wallet} for policy #{policy_id}")

        # ── VALIDATION 1: Does this policy exist on the current blockchain? ──
        total_policies = contract.functions.policyCounter().call()
        if policy_id < 1 or policy_id > total_policies:
            return jsonify({
                'error': f'Policy #{policy_id} does not exist on the blockchain.',
                'hint': (
                    f'The blockchain currently has {total_policies} policies. '
                    'This happens when Ganache was restarted (blockchain reset). '
                    'Please create a new policy first using Register → Create Policy → Pay Premium.'
                ),
                'blockchain_policy_count': total_policies
            }), 404

        # ── VALIDATION 2: Which Ganache account owns this policy? ──
        # The policy was created by a Ganache account (not user's wallet directly).
        # We must use the SAME Ganache account that created the policy to submit.
        on_chain_policy  = contract.functions.getPolicy(policy_id).call()
        policy_owner     = on_chain_policy[0]   # farmerAddress on blockchain
        ganache_sender   = get_ganache_sender(wallet)

        # If the policy owner doesn't match, try to use the on-chain owner directly
        if policy_owner.lower() != ganache_sender.lower():
            # Check if policy_owner is in our known Ganache accounts
            if policy_owner in [a.lower() for a in w3.eth.accounts] or \
               policy_owner in w3.eth.accounts:
                ganache_sender = w3.to_checksum_address(policy_owner)
                print(f"   ℹ️ Using on-chain policy owner: {ganache_sender}")
            else:
                return jsonify({
                    'error': f'Policy #{policy_id} belongs to a different account.',
                    'policy_owner': policy_owner,
                    'your_mapped_account': ganache_sender,
                    'hint': 'Create a new policy with your current wallet address.'
                }), 403

        # ── VALIDATION 3: Is the policy active (premium paid)? ──
        is_premium_paid = on_chain_policy[6]
        is_active       = on_chain_policy[7]
        if not is_premium_paid:
            return jsonify({
                'error': f'Policy #{policy_id} premium has not been paid yet.',
                'hint': 'Go to Pay Premium page and pay the premium first.'
            }), 400
        if not is_active:
            return jsonify({
                'error': f'Policy #{policy_id} is not active.',
                'hint': 'Policy may have expired or already been claimed.'
            }), 400

        print(f"   ✅ Policy #{policy_id} verified on blockchain — owner: {ganache_sender}")

        # ── DEMO MODE ────────────────────────────────────────────────────────
        # Pass demo_approve=true in request body to force APPROVED (for demo)
        # Pass demo_reject=true to force REJECTED (shows the reject flow)
        demo_approve = str(data.get('demo_approve', '')).lower() in ('true', '1', 'yes')
        demo_reject  = str(data.get('demo_reject',  '')).lower() in ('true', '1', 'yes')

        if demo_approve:
            print("   🎯 DEMO MODE: Forcing APPROVED (extreme drought simulation)")
            weather_trigger = True
            ndvi_trigger    = True
            weather_data = {
                'weather_trigger' : True,
                'rainfall'        : 0.0,
                'temperature'     : 42.3,
                'humidity'        : 14,
                'wind_speed'      : 7.2,
                'risk_level'      : 'Extreme Heat + Drought',
                'reason'          : 'Temperature 42.3°C > 35°C + Humidity 14% < 25% (Jaisalmer Desert)',
                'location'        : 'Jaisalmer, Rajasthan',
                'source'          : 'Demo Mode (Real API + Simulated Extreme)',
                'timestamp'       : datetime.now().isoformat()
            }
            ndvi_data = {
                'ndvi_trigger'  : True,
                'ndvi_value'    : 0.17,
                'crop_health'   : 'Severely Stressed (Demo - Drought)',
                'threshold'     : 0.30,
                'ml_model_used' : MODEL_LOADED,
                'source'        : 'Retrained NDVI RF + Isolation Forest (Demo)',
                'timestamp'     : datetime.now().isoformat()
            }
        elif demo_reject:
            print("   🎯 DEMO MODE: Forcing REJECTED (normal conditions simulation)")
            weather_trigger = False
            ndvi_trigger    = False
            weather_data = {
                'weather_trigger' : False,
                'rainfall'        : 2.1,
                'temperature'     : 28.5,
                'humidity'        : 72,
                'wind_speed'      : 3.1,
                'risk_level'      : 'Normal',
                'reason'          : 'Weather conditions within safe range',
                'location'        : 'Thrissur, Kerala',
                'source'          : 'Demo Mode (Normal Conditions)',
                'timestamp'       : datetime.now().isoformat()
            }
            ndvi_data = {
                'ndvi_trigger'  : False,
                'ndvi_value'    : 0.68,
                'crop_health'   : 'Healthy (Demo)',
                'threshold'     : 0.30,
                'ml_model_used' : MODEL_LOADED,
                'source'        : 'Retrained NDVI RF (Demo)',
                'timestamp'     : datetime.now().isoformat()
            }
        else:
            # ── REAL MODE: Call actual APIs ───────────────────────────────────
            # Weather check
            weather_api_data = get_openweather_data(latitude, longitude)
            if weather_api_data:
                weather_trigger, risk_level, reason = check_weather_triggers_real(weather_api_data)
                weather_data = {
                    'weather_trigger': weather_trigger,
                    'rainfall'       : weather_api_data['rainfall_1h'],
                    'temperature'    : weather_api_data['temperature'],
                    'humidity'       : weather_api_data['humidity'],
                    'wind_speed'     : weather_api_data['wind_speed'],
                    'risk_level'     : risk_level,
                    'reason'         : reason,
                    'location'       : weather_api_data.get('location', ''),
                    'source'         : 'OpenWeatherMap API (Real GPS Data)',
                    'timestamp'      : datetime.now().isoformat()
                }
            else:
                # Fallback
                weather_trigger = False
                weather_data    = {'weather_trigger': False, 'source': 'Unavailable',
                                   'timestamp': datetime.now().isoformat()}

            # NDVI check
            nasa_data = get_nasa_power_data(latitude, longitude)
            if nasa_data:
                ndvi_value, crop_health, ndvi_trigger, ndvi_source = \
                    estimate_ndvi_from_ml_and_nasa(nasa_data, latitude, longitude)
                ndvi_data = {
                    'ndvi_trigger'   : ndvi_trigger,
                    'ndvi_value'     : ndvi_value,
                    'crop_health'    : crop_health,
                    'threshold'      : 0.30,
                    'ml_model_used'  : MODEL_LOADED,
                    'source'         : ndvi_source,
                    'timestamp'      : datetime.now().isoformat()
                }
            else:
                ndvi_trigger = False
                ndvi_data    = {'ndvi_trigger': False, 'source': 'Unavailable',
                                'timestamp': datetime.now().isoformat()}
        
        # Create verification hash (IPFS hash simulation) - FIXED for int32 overflow
        verification_data = {
            'weather': weather_data,
            'ndvi': ndvi_data,
            'timestamp': datetime.now().isoformat()
        }
        # FIXED: Use random string instead of large int
        random_string = ''.join(random.choices(string.ascii_lowercase + string.digits, k=46))
        verification_hash = f"Qm{random_string}"
        
        # Submit claim using the validated Ganache account (resolved in validation block above)
        tx_hash = contract.functions.submitClaim(
            policy_id,
            weather_trigger,
            ndvi_trigger,
            verification_hash
        ).transact({'from': ganache_sender, 'gas': 500000})
        
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        if receipt.status == 1:
            claim_id = contract.functions.claimCounter().call()
            
            # Double verification result
            is_approved = weather_trigger and ndvi_trigger
            
            # Fetch coverage amount from local DB for this policy (= payout amount)
            payout_amount = 0
            try:
                policy_record = next(
                    (p for p in db.get('policies', []) if p['policy_id'] == policy_id),
                    None
                )
                if policy_record:
                    payout_amount = int(policy_record.get('coverage_amount', 0))
                else:
                    # Fallback: read from blockchain (returns Wei, convert to INR equiv)
                    on_chain = contract.functions.getPolicy(policy_id).call()
                    coverage_wei = on_chain[3]  # coverageAmount in Wei
                    # Reverse the conversion: 1 INR = 0.00001 ETH
                    payout_amount = int(w3.from_wei(coverage_wei, 'ether') / 0.00001)
            except Exception as pe:
                print(f"Could not fetch payout amount: {pe}")
            
            # Save to database
            claim_data = {
                'claim_id': claim_id,
                'policy_id': policy_id,
                'farmer_address': wallet,
                'weather_trigger': weather_trigger,
                'ndvi_trigger': ndvi_trigger,
                'is_approved': is_approved,
                'payout_amount': payout_amount if is_approved else 0,
                'verification_data': verification_data,
                'claim_date': datetime.now().isoformat(),
                'transaction_hash': tx_hash.hex()
            }
            db['claims'].append(claim_data)
            save_database(db)
            
            return jsonify({
                'success': True,
                'message': 'Claim submitted and processed',
                'claim_id': claim_id,
                'weather_trigger': weather_trigger,
                'ndvi_trigger': ndvi_trigger,
                'is_approved': is_approved,
                'payout_amount': payout_amount if is_approved else 0,
                'verification': 'Double verification: BOTH triggers must be TRUE',
                'transaction_hash': tx_hash.hex(),
                'verification_data': verification_data
            }), 201
        else:
            return jsonify({'error': 'Claim submission failed'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== VIEW FUNCTIONS ====================

@app.route('/api/farmer/<address>', methods=['GET'])
def get_farmer(address):
    """Get farmer details"""
    try:
        farmer = contract.functions.getFarmer(address).call()
        return jsonify({
            'name': farmer[0],
            'farm_location': farmer[1],
            'farm_area': farmer[2],
            'crop_type': farmer[3],
            'is_registered': farmer[4],
            'registration_date': farmer[5]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@app.route('/api/policy/<int:policy_id>', methods=['GET'])
def get_policy(policy_id):
    """Get policy details"""
    try:
        policy = contract.functions.getPolicy(policy_id).call()
        return jsonify({
            'policy_id': policy_id,
            'farmer_address': policy[0],
            'crop_type': policy[1],
            'premium_amount': policy[2],
            'coverage_amount': policy[3],
            'policy_start_date': policy[4],
            'policy_end_date': policy[5],
            'is_premium_paid': policy[6],
            'is_active': policy[7]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@app.route('/api/claim/<int:claim_id>', methods=['GET'])
def get_claim(claim_id):
    """Get claim details"""
    try:
        claim = contract.functions.getClaim(claim_id).call()
        return jsonify({
            'claim_id': claim_id,
            'policy_id': claim[0],
            'farmer_address': claim[1],
            'weather_trigger': claim[2],
            'ndvi_trigger': claim[3],
            'is_approved': claim[4],
            'is_paid': claim[5],
            'payout_amount': claim[6],
            'claim_date': claim[7],
            'verification_hash': claim[8]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 404

# ==================== STATISTICS ====================

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get system statistics"""
    try:
        total_policies = contract.functions.policyCounter().call()
        total_claims = contract.functions.claimCounter().call()
        contract_balance = w3.eth.get_balance(CONTRACT_ADDRESS)
        
        # FIXED: Safely count approved claims
        approved_claims = 0
        if 'claims' in db and isinstance(db['claims'], list):
            approved_claims = sum(1 for c in db['claims'] if c.get('is_approved', False))
        
        return jsonify({
            'total_farmers': len(db.get('farmers', [])),
            'total_policies': total_policies,
            'total_claims': total_claims,
            'approved_claims': approved_claims,
            'contract_balance': str(contract_balance),
            'contract_balance_eth': float(w3.from_wei(contract_balance, 'ether'))
        }), 200
    except Exception as e:
        print(f"Error in get_stats: {e}")
        return jsonify({
            'total_farmers': 0,
            'total_policies': 0,
            'total_claims': 0,
            'approved_claims': 0
        }), 200

# ==================== ALL CLAIMS LIST ====================

@app.route('/api/claims', methods=['GET'])
def get_all_claims():
    """Get all claims from database"""
    try:
        claims = db.get('claims', [])
        return jsonify({
            'success': True,
            'claims': claims,
            'total': len(claims)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== ALL POLICIES LIST ====================

@app.route('/api/policies', methods=['GET'])
def get_all_policies():
    """Get all policies from database (for dashboard dropdown)"""
    try:
        policies = db.get('policies', [])
        return jsonify({
            'success': True,
            'policies': policies,
            'total': len(policies)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== POLICY DASHBOARD DATA ====================

@app.route('/api/policy/<int:policy_id>/dashboard', methods=['GET'])
def get_policy_dashboard(policy_id):
    """Get full dashboard data for a policy (weather + NDVI + risk)"""
    try:
        # Find policy in DB
        policy = next((p for p in db.get('policies', []) if p['policy_id'] == policy_id), None)
        if not policy:
            return jsonify({'error': 'Policy not found'}), 404

        lat, lon = 26.8467, 80.9462
        if policy.get('farm_location'):
            parts = policy['farm_location'].split(',')
            if len(parts) == 2:
                lat, lon = float(parts[0]), float(parts[1])

        # Weather
        weather_data = get_openweather_data(lat, lon)
        weather_trigger, risk_level, reason = (False, 'Normal', 'OK')
        if weather_data:
            weather_trigger, risk_level, reason = check_weather_triggers_real(weather_data)

        # NDVI
        nasa_data = get_nasa_power_data(lat, lon)
        ndvi_value, crop_health, ndvi_trigger, ndvi_source = 0.5, 'Unknown', False, 'Simulation'
        if nasa_data:
            ndvi_value, crop_health, ndvi_trigger, ndvi_source = estimate_ndvi_from_ml_and_nasa(nasa_data, lat, lon)

        # Claim status
        claim_status = next((c for c in db.get('claims', []) if c.get('policy_id') == policy_id), None)

        return jsonify({
            'policy': policy,
            'weather': {
                'temperature': weather_data['temperature'] if weather_data else None,
                'humidity': weather_data['humidity'] if weather_data else None,
                'wind_speed': weather_data['wind_speed'] if weather_data else None,
                'rainfall': weather_data['rainfall_1h'] if weather_data else 0,
                'weather_main': weather_data['weather_main'] if weather_data else 'Unknown',
                'weather_description': weather_data['weather_description'] if weather_data else 'Unknown',
                'weather_trigger': weather_trigger,
                'risk_level': risk_level,
                'reason': reason,
            },
            'ndvi': {
                'ndvi_value': ndvi_value,
                'health_status': crop_health,
                'ndvi_trigger': ndvi_trigger,
                'data_source': ndvi_source,
            },
            'claim_status': claim_status,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== FORCE ELIGIBLE (DEMO MODE) ====================

@app.route('/api/policy/<int:policy_id>/force_eligible', methods=['POST'])
def force_eligible(policy_id):
    """
    Force a policy to be claim-eligible using simulated NDVI data.
    Used when GEE/NASA satellite API limits are hit during demo.
    """
    try:
        policy = next((p for p in db.get('policies', []) if p['policy_id'] == policy_id), None)
        if not policy:
            return jsonify({'error': 'Policy not found'}), 404

        wallet = policy.get('farmer_address', '')
        if not wallet:
            return jsonify({'error': 'No wallet address on policy'}), 400

        lat, lon = 26.8467, 80.9462
        if policy.get('farm_location'):
            parts = policy['farm_location'].split(',')
            if len(parts) == 2:
                lat, lon = float(parts[0]), float(parts[1])

        # Simulate stressed NDVI & drought weather for demo
        ndvi_value = round(0.18 + random.uniform(0, 0.06), 3)
        crop_health = 'Critical Crop Damage (Simulated)'
        ndvi_trigger = True
        weather_trigger = True

        # Get/create ganache sender
        ganache_sender = get_ganache_sender(w3.to_checksum_address(wallet))

        # Submit claim on blockchain
        rainfall_scaled = int(25 * 100)
        temperature_scaled = int(38 * 100)
        ndvi_scaled = int(ndvi_value * 1000)
        verification_hash = w3.keccak(text=f"{policy_id}{datetime.now().isoformat()}")

        tx_hash = contract.functions.submitClaim(
            policy_id, weather_trigger, ndvi_trigger,
            rainfall_scaled, temperature_scaled, ndvi_scaled,
            verification_hash
        ).transact({'from': ganache_sender})

        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        claim_id = contract.functions.claimCounter().call()
        is_approved = weather_trigger and ndvi_trigger
        payout_amount = int(policy.get('coverage_amount', 0) * 0.8) if is_approved else 0

        claim_record = {
            'claim_id': claim_id,
            'policy_id': policy_id,
            'farmer_address': wallet,
            'weather_trigger': weather_trigger,
            'ndvi_trigger': ndvi_trigger,
            'is_approved': is_approved,
            'payout_amount': payout_amount,
            'claim_date': datetime.now().isoformat(),
            'transaction_hash': tx_hash.hex(),
            'note': 'Force eligible — NDVI simulated for demo'
        }

        if 'claims' not in db:
            db['claims'] = []
        db['claims'].append(claim_record)
        save_database(db)

        return jsonify({
            'success': True,
            'message': 'Force eligible applied — simulated NDVI used',
            'claim_id': claim_id,
            'is_approved': is_approved,
            'payout_amount': payout_amount,
            'ndvi_value': ndvi_value,
            'weather_trigger': weather_trigger,
            'ndvi_trigger': ndvi_trigger,
        }), 200

    except Exception as e:
        print(f"Force eligible error: {e}")
        return jsonify({'error': str(e)}), 500


# ==================== RUN SERVER ====================

if __name__ == '__main__':

    print("\n" + "="*70)
    print("🚀 STARTING BACKEND API SERVER WITH REAL DATA SOURCES")
    print("="*70)
    print(f"📍 Contract: {CONTRACT_ADDRESS}")
    print(f"🌐 Server: http://127.0.0.1:5000")
    print(f"\n🌦️ APIs Active:")
    print(f"   ✅ OpenWeatherMap (Real-time weather)")
    print(f"   ✅ NASA POWER (Satellite weather data)")
    print(f"📊 ML Models: {'Loaded' if MODEL_LOADED else 'Using API predictions'}")
    print("\n💡 API Endpoints available at: http://127.0.0.1:5000/")
    print("="*70 + "\n")
    
    
    app.run(debug=True, host='127.0.0.1', port=5000)