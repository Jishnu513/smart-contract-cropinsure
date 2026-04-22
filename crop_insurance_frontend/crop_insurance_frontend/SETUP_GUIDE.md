# Complete Frontend Setup & Execution Guide

## 🎯 Prerequisites Check

Before starting, ensure you have:

- ✅ **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- ✅ **npm** (comes with Node.js)
- ✅ **MetaMask** browser extension - [Install](https://metamask.io/)
- ✅ **Backend Flask server** running at http://127.0.0.1:5000
- ✅ **Code editor** (VS Code recommended)

**Verify Node.js installation:**
```bash
node --version  # Should show v14.0.0 or higher
npm --version   # Should show 6.0.0 or higher
```

---

## 📥 Step-by-Step Setup (10 Minutes)

### STEP 1: Extract Frontend Files (1 minute)

```bash
# Navigate to your project directory
cd /path/to/your/project

# Extract the frontend folder
# You should see: crop_insurance_frontend/
```

**Verify folder structure:**
```
crop_insurance_frontend/
├── package.json
├── README.md
├── public/
└── src/
```

---

### STEP 2: Install Dependencies (2-3 minutes)

```bash
# Navigate to frontend directory
cd crop_insurance_frontend

# Install all packages
npm install
```

**What gets installed:**
- React framework
- React Router for navigation
- Axios for API calls
- Web3 for blockchain
- Recharts for data visualization
- React Icons
- React Toastify for notifications

**Expected output:**
```
added 1472 packages in 2m
```

---

### STEP 3: Configure Environment (30 seconds)

```bash
# Copy environment template
cp .env.example .env

# Open .env file and verify:
cat .env
```

**Expected content:**
```
REACT_APP_API_URL=http://127.0.0.1:5000/api
```

**Note:** This assumes your Flask backend is running on port 5000.

---

### STEP 4: Install & Configure MetaMask (2 minutes)

1. **Install MetaMask:**
   - Go to https://metamask.io/
   - Click "Download" for your browser
   - Add extension
   - Create new wallet or import existing

2. **Add Ganache Network:**
   - Open MetaMask
   - Click Networks dropdown
   - Add Network → Add network manually
   - Fill in:
     ```
     Network Name: Localhost 8545
     New RPC URL: http://127.0.0.1:8545
     Chain ID: 1337
     Currency Symbol: ETH
     ```
   - Save

3. **Import Test Account:**
   - When you start Ganache, it shows private keys
   - In MetaMask: Account → Import Account
   - Paste private key from Ganache
   - You should see test ETH balance

---

### STEP 5: Start Development Server (1 minute)

```bash
# Make sure you're in crop_insurance_frontend/
npm start
```

**Expected output:**
```
Compiled successfully!

You can now view crop-insurance-frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

**Browser automatically opens to:** http://localhost:3000

---

## 🎮 First-Time Usage Guide

### Initial Setup:

1. **Connect Wallet**
   - Click "Connect Wallet" in navbar
   - MetaMask popup appears
   - Select account
   - Click "Connect"
   - Wallet address appears in navbar

2. **Register as Farmer**
   - Click "Register" in navbar
   - Fill form:
     - Name: Your name
     - Farm Location: "28.6139, 77.2090" (Delhi example)
     - Farm Area: 5 (hectares)
     - Crop Type: Select "Rice"
   - Click "Register Farmer"
   - Toast notification: "Farmer registered successfully!"

3. **Create Insurance Policy**
   - Click "Create Policy" in navbar
   - Fill form:
     - Crop Type: Rice
     - Season: Kharif
     - Coverage Amount: 100000 (₹1,00,000)
     - Farm Location: Same as registration
     - Farm Area: 5
   - See premium preview: ₹2,000 (2% of 100000)
   - Click "Create Policy"
   - Note the Policy ID from success message

4. **Pay Premium**
   - Click "Pay Premium" in navbar
   - Enter Policy ID: (from previous step)
   - Enter Premium: 2000
   - Click "Pay Premium"
   - MetaMask opens → Confirm transaction
   - Policy activated!

5. **Submit Claim**
   - Click "Submit Claim" in navbar
   - Enter Policy ID
   - Enter coordinates: 28.6139, 77.2090
   - Click "Submit Claim"
   - Wait 2-3 seconds for verification
   - See results:
     - Weather Trigger: PASSED/FAILED
     - NDVI Trigger: PASSED/FAILED
     - Final Status: APPROVED/REJECTED
     - If approved: See payout amount

6. **View Dashboard**
   - Click "Dashboard" in navbar
   - See your farmer profile
   - View system statistics
   - Check claim approval rates
   - Access quick actions

---

## 🔧 Running with Backend

### Prerequisites:
Backend must be running first!

**Start Backend (separate terminal):**
```bash
cd /path/to/backend
python app.py
```

**Verify backend is running:**
```bash
curl http://127.0.0.1:5000/api/stats
```

**Should return:**
```json
{
  "total_farmers": 0,
  "total_policies": 0,
  "total_claims": 0,
  "approved_claims": 0
}
```

**Then start frontend:**
```bash
cd /path/to/crop_insurance_frontend
npm start
```

---

## 🌐 Port Configuration

### Default Ports:
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:5000
- **Ganache:** http://localhost:8545

### Change Frontend Port:
```bash
# Use different port (e.g., 3001)
PORT=3001 npm start
```

### Change Backend URL:
Edit `.env` file:
```
REACT_APP_API_URL=http://localhost:8080/api
```

---

## 📱 Testing on Mobile

### Access from Phone/Tablet:

1. **Find your computer's IP:**
```bash
# Windows
ipconfig

# Mac/Linux
ifconfig
```

2. **Update Backend CORS:**
In `app.py`, ensure CORS allows your IP:
```python
CORS(app, origins=["http://192.168.x.x:3000"])
```

3. **Access from mobile:**
```
http://192.168.x.x:3000
```

**Note:** Both devices must be on same WiFi network

---

## 🐛 Troubleshooting

### Problem 1: "npm: command not found"
**Solution:**
```bash
# Install Node.js from https://nodejs.org/
# Verify installation
node --version
npm --version
```

### Problem 2: "Port 3000 already in use"
**Solution:**
```bash
# Option 1: Kill process
lsof -ti:3000 | xargs kill -9

# Option 2: Use different port
PORT=3001 npm start
```

### Problem 3: "Module not found" errors
**Solution:**
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Problem 4: Backend connection refused
**Solution:**
```bash
# Check if backend is running
curl http://127.0.0.1:5000/api/stats

# If not, start backend first
cd /path/to/backend
python app.py
```

### Problem 5: MetaMask not connecting
**Solution:**
- Refresh page
- Unlock MetaMask wallet
- Try disconnecting and reconnecting
- Check if on correct network (Localhost 8545)

### Problem 6: Blank page after npm start
**Solution:**
```bash
# Clear browser cache
# Hard reload: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

# Clear React cache
rm -rf node_modules/.cache
npm start
```

### Problem 7: "Cannot read property of undefined"
**Solution:**
- Check browser console (F12)
- Verify backend is returning correct data
- Clear localStorage:
  ```javascript
  // In browser console
  localStorage.clear()
  ```

---

## 🔄 Development Workflow

### Hot Reload:
React auto-reloads on file changes. Just save and see updates!

### Recommended Development Setup:

**Terminal 1 (Backend):**
```bash
cd /path/to/backend
python app.py
```

**Terminal 2 (Frontend):**
```bash
cd /path/to/crop_insurance_frontend
npm start
```

**Terminal 3 (Ganache):**
```bash
ganache-cli
```

**Browser:**
- http://localhost:3000 (Frontend)
- http://localhost:5000 (Backend API)
- DevTools open (F12)

---

## 📊 Testing Scenarios

### Scenario 1: Approved Claim
```
1. Register farmer
2. Create policy (Coverage: ₹100,000)
3. Pay premium (₹2,000 for Kharif)
4. Submit claim with coordinates that trigger BOTH:
   - Weather risk detected
   - NDVI shows crop damage
5. Result: APPROVED + Instant payout ₹100,000
```

### Scenario 2: Rejected Claim (Weather OK)
```
1-3. Same as above
4. Submit claim with coordinates where:
   - Weather is normal (FALSE)
   - NDVI shows damage (TRUE)
5. Result: REJECTED (needs both TRUE)
```

### Scenario 3: Rejected Claim (NDVI OK)
```
1-3. Same as above
4. Submit claim with coordinates where:
   - Weather shows risk (TRUE)
   - NDVI shows healthy crop (FALSE)
5. Result: REJECTED (needs both TRUE)
```

---

## 🎨 Customization

### Change Colors:
Edit `src/styles/*.css` files

**Primary color (green):**
```css
/* Find and replace */
#4CAF50 → Your color
#2E7D32 → Your dark shade
```

### Change Logo:
Edit `src/components/Navbar.js`:
```javascript
// Replace FaLeaf with your icon
import { FaYourIcon } from 'react-icons/fa';
```

### Add New Page:
1. Create `src/pages/YourPage.js`
2. Create `src/styles/YourPage.css`
3. Add route in `src/App.js`:
```javascript
<Route path="/your-path" element={<YourPage />} />
```

---

## 🚀 Production Build

### Build Optimized Version:
```bash
npm run build
```

**Output:** `build/` folder with optimized files

**Test production build locally:**
```bash
# Install serve
npm install -g serve

# Serve build folder
serve -s build -l 3000
```

**Deploy to:**
- Netlify
- Vercel
- GitHub Pages
- AWS S3
- Firebase Hosting

---

## 📚 Learning Resources

### React Basics:
- https://react.dev/learn

### Web3 Integration:
- https://web3js.readthedocs.io/

### MetaMask Developer:
- https://docs.metamask.io/

### React Router:
- https://reactrouter.com/

---

## ✅ Pre-Presentation Checklist

- [ ] Backend running without errors
- [ ] Frontend running at localhost:3000
- [ ] Ganache running with test accounts
- [ ] MetaMask connected to Ganache
- [ ] Test account has ETH balance
- [ ] Can register farmer successfully
- [ ] Can create policy successfully
- [ ] Can pay premium successfully
- [ ] Can submit claim successfully
- [ ] Dashboard displays correctly
- [ ] All pages are responsive
- [ ] No console errors in browser
- [ ] Internet connection (for CDN resources)

---

## 🎓 For Viva/Presentation

### Demo Flow:
1. Show landing page (explain features)
2. Connect MetaMask (show wallet integration)
3. Register farmer (explain form validation)
4. Create policy (show premium calculation)
5. Pay premium (demonstrate blockchain transaction)
6. Show dashboard (explain statistics)
7. Submit claim (highlight double verification)
8. Show verification results (explain ML models)
9. View claim details (show transparency)

### Key Points to Mention:
- Real-time double verification
- Instant payouts (2-3 seconds vs 30-45 days)
- PMFBY guidelines compliance
- ML-based risk assessment (90-93% accuracy)
- Blockchain transparency
- Responsive design
- Production-ready code

---

## 📞 Quick Reference

### Start Everything:
```bash
# Terminal 1: Backend
cd backend && python app.py

# Terminal 2: Ganache
ganache-cli

# Terminal 3: Frontend
cd crop_insurance_frontend && npm start
```

### Stop Everything:
- Press Ctrl+C in each terminal
- Or close terminals

### Reset Everything:
```bash
# Frontend
rm -rf node_modules package-lock.json
npm install

# Backend
# Restart Flask server

# Blockchain
# Restart Ganache (resets accounts)
```

---

**Setup Complete! 🎉**

Your frontend is now ready for testing and presentation.

For any issues, check the Troubleshooting section or console logs.
