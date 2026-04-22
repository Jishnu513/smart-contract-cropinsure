# 🌾 CropInsure — Smart Contract Based Automated Crop Insurance System

> A blockchain-powered crop insurance platform that uses real-time weather data, satellite NDVI analysis, and AI models to automatically verify and process farmer claims — eliminating middlemen and reducing payout time from 45 days to under 3 seconds.

![Python](https://img.shields.io/badge/Python-3.10+-blue?style=flat-square&logo=python)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Solidity](https://img.shields.io/badge/Solidity-Smart%20Contract-363636?style=flat-square&logo=solidity)
![Flask](https://img.shields.io/badge/Flask-REST%20API-black?style=flat-square&logo=flask)
![Blockchain](https://img.shields.io/badge/Blockchain-Ethereum%20%7C%20Ganache-orange?style=flat-square&logo=ethereum)

---

## 📌 Problem Statement

India's 140 million+ farmers face a broken insurance system:
- Manual inspections take **30–45 days**
- Corrupt field agents cause **fraudulent rejections**
- Farmers fall into **debt traps** while waiting for payouts

**CropInsure** solves this using AI + Blockchain — fully automated, tamper-proof, instant.

---

## 🏗️ System Architecture

```
[React Frontend] → [Flask Backend] → [ML Models + External APIs] → [Ganache Blockchain]
```

### 4-Layer Stack:
| Layer | Technology |
|---|---|
| Frontend | React.js |
| Backend API | Python + Flask |
| AI & Data | Scikit-learn, XGBoost, NumPy (LSTM) |
| Blockchain | Solidity, Web3.py, Ganache (Ethereum) |

---

## ⚙️ Key Features

- 🌦️ **Real-Time Weather Verification** via OpenWeatherMap API
- 🛰️ **Satellite Crop Health Monitoring** via NASA POWER API
- 🤖 **AI-Based Risk Analysis** — Random Forest + Isolation Forest
- 🛡️ **Double Verification Gate** — claim approved only when BOTH weather AND NDVI triggers are met
- ⛓️ **Blockchain Payout** — smart contract executes ETH transfer in 2–3 seconds
- 📍 **GPS Location Validation** — prevents false location-based claims
- 📊 **Live Dashboard** — real-time weather, NDVI charts, and claim status

---

## 🤖 ML Models

| Model | Algorithm | Purpose | Accuracy |
|---|---|---|---|
| Weather Risk | Random Forest | Detect drought/flood/heat stress | ~91.1% |
| Crop Damage | RF Classifier | Detect abnormal NDVI drops | ~96.9% |
| Anomaly Detection | Isolation Forest | Unsupervised NDVI anomaly detection | — |
| NDVI Forecast | NumPy LSTM | Time-series crop health prediction | ~95% |

---

## 📊 Datasets Used

| Dataset | Source | Size |
|---|---|---|
| Historical Weather | Kaggle + NASA POWER | 50,031 records |
| Satellite NDVI | Google Earth Engine (Sentinel-2) | 120-day crop cycles |
| Crop Reference | Kaggle Crop Recommendation | 22,200 samples |
| Insurance Claims | PMFBY Government Records | 5,050 verified claims |
| District Rainfall | India Meteorological Dept (IMD) | All Indian districts, 1901–2015 |

---

## 🚀 How to Run Locally

### Prerequisites
- Python 3.10+
- Node.js 18+
- Ganache (local Ethereum blockchain)

### 1. Start Ganache
Download and open [Ganache](https://trufflesuite.com/ganache/) → Start a new workspace on port `8545`

### 2. Start Flask Backend
```bash
cd phase3_backend
pip install -r requirements.txt
# Create a .env file with your API key:
# OPENWEATHER_API_KEY=your_key_here
python app.py
```
Backend runs on: `http://localhost:5000`

### 3. Start React Frontend
```bash
cd crop_insurance_frontend/crop_insurance_frontend
npm install
npm start
```
Frontend runs on: `http://localhost:3000`

---

## 🔄 Demo Flow

1. **Register** a farmer with GPS coordinates and MetaMask wallet
2. **Dashboard** shows live weather + NDVI + risk score
3. **Submit Claim** → Double verification runs automatically
4. **If approved** → Smart contract transfers ETH payout instantly
5. View the transaction on **Ganache ledger**

> 🧪 Use **"Force Eligible (Demo Mode)"** button to simulate extreme conditions for guaranteed approval demo.

---

## 📁 Project Structure

```
smart-contract-cropinsure/
├── phase2_blockchain/          # Solidity smart contract
│   ├── CropInsurancePolicy.sol
│   ├── compile_contract.py
│   └── deploy_contract.py
├── phase3_backend/             # Flask REST API
│   └── app.py
├── crop_insurance_frontend/    # React.js UI
│   └── src/
│       ├── pages/
│       └── components/
├── *.pkl                       # Trained ML models
├── *.ipynb                     # Jupyter training notebooks
└── retrain_all_models.py       # Model retraining script
```

---

## 👨‍💻 Tech Stack

`Python` `Flask` `React.js` `Solidity` `Web3.py` `Ganache` `Scikit-learn` `XGBoost` `NumPy` `Pandas` `OpenWeatherMap API` `NASA POWER API` `Recharts`

---

## 📄 License

This project was developed as a Final Year Engineering Project.
