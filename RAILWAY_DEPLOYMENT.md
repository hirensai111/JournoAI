# 🚀 Railway Deployment Guide for Journey AI

## ✅ **FIXED: Railway 502 Error Resolved**

### Root Cause Identified:
The 502 error was caused by the server taking too long to initialize before binding to the port. Railway's health check would timeout because:
1. Server loaded 345 experiences from JSON files
2. Initialized Firebase Client SDK
3. Created all service instances (recommender, flight search, hotels, etc.)
4. **THEN** called `app.listen()` - too late for Railway's health check

### Solution Implemented:
- **Immediate server startup**: `app.listen()` is called immediately on module load
- **Background initialization**: Services initialize asynchronously after server starts
- **Health check compatibility**: `/api/health` responds instantly, reports initialization status
- **Zero downtime**: Static files work immediately, API endpoints work after ~5-10 seconds

---

## 📋 **Files Configured for Railway**

### **1. railway.json** (Railway V2 configuration)
```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "nixpacksConfigPath": "nixpacks.toml"
  },
  "deploy": {
    "runtime": "V2",
    "numReplicas": 1,
    "startCommand": "npm start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### **2. nixpacks.toml**
```toml
[phases.setup]
nixPkgs = ['nodejs_20']

[phases.install]
cmds = ['npm ci --only=production']

[start]
cmd = 'npm start'
```

### **3. package.json**
- `"engines": { "node": "18.x" }` - Specifies Node.js version
- `"start": "node server-production.js"` - Production start command

---

## 🔧 **Railway Environment Variables**

### ⚠️ CRITICAL: DO NOT SET PORT MANUALLY

**Railway automatically provides the `PORT` environment variable.**

❌ **DO NOT** add `PORT=3001` or any PORT variable in Railway dashboard
✅ Railway provides PORT automatically (usually 8080 or 3000)
✅ Your app uses `process.env.PORT || 3001` (fallback for local dev only)

**If you previously set PORT=3001:**
1. Go to Railway Dashboard → Your Service → Variables tab
2. **DELETE the PORT variable**
3. Railway will auto-redeploy with correct PORT

### **Optional Variables (for enhanced features):**
```bash
# Node Environment
NODE_ENV=production

# Firebase (Required for wellness features)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email

# OpenAI (Required for AI features)
OPENAI_API_KEY=your_openai_api_key
```

### **⚠️ IMPORTANT: API Keys for Real Data**

**Without these API keys, the app will use MOCK/DEMO data for flights and hotels!**

#### **Amadeus Flight API (REQUIRED for real flight data)**
```bash
AMADEUS_CLIENT_ID=your_amadeus_client_id
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret
AMADEUS_HOSTNAME=test  # Use 'test' for testing, 'production' for live data
```

**How to get Amadeus API keys:**
1. Sign up at https://developers.amadeus.com/
2. Create a new app in the dashboard
3. Copy your API Key (Client ID) and API Secret (Client Secret)
4. Add them to Railway environment variables

**⚠️ If these are missing, flight searches will return hardcoded mock data instead of real flights!**

#### **Optional API Keys (for enhanced features):**
```bash
# Booking.com API (for hotel search)
BOOKING_API_KEY=your_booking_api_key

# Experiences API
EXPERIENCES_API_KEY=your_experiences_api_key
```

---

## 🚀 **Deployment Steps**

1. **Connect Repository:**
   - Go to Railway dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `AshwinNimmala-21/Mari`

2. **Set Environment Variables:**
   - Go to your project settings
   - Click "Variables" tab
   - Add all required environment variables

3. **Deploy:**
   - Railway will automatically detect the Node.js configuration
   - The app will build and deploy using `npm start`

---

## 📋 **Project Structure**

```
Mari/
├── nixpacks.toml          ← Railway configuration
├── Procfile               ← Process definition
├── package.json           ← Node.js project config
├── server-production.js   ← Main server file
├── src/                   ← Source code
├── public/                ← Static files
└── data/                  ← Experience data
```

---

## 🔍 **Troubleshooting**

### **❗ Flight searches showing hardcoded/mock data instead of real flights:**
**Root Cause:** Amadeus API keys are not set in Railway environment variables

**Solution:**
1. Go to Railway Dashboard → Your Service → Variables tab
2. Add these environment variables:
   ```
   AMADEUS_CLIENT_ID=your_amadeus_client_id
   AMADEUS_CLIENT_SECRET=your_amadeus_client_secret
   AMADEUS_HOSTNAME=test
   ```
3. Get your API keys from https://developers.amadeus.com/
4. Railway will auto-redeploy after adding variables
5. Check logs for: `✅ Amadeus API keys found - using live API`

**How to verify it's fixed:**
- Check Railway logs for: `🎭 DEMO MODE: No Amadeus API keys - using mock data` (means NOT fixed)
- Look for: `✅ Amadeus API keys found - using live API` (means FIXED!)

### **If deployment fails:**
1. Check Railway logs for errors
2. Verify all environment variables are set
3. Ensure `server-production.js` exists and runs locally
4. Check that all dependencies are in `package.json`

### **If app doesn't start:**
1. Verify `PORT` environment variable is NOT manually set (Railway provides it automatically)
2. Check that Firebase credentials are valid
3. Ensure all required API keys are provided

---

## ✅ **Success Indicators**

- Railway shows "Deployed" status
- App URL is accessible
- No build errors in logs
- All API endpoints respond correctly

---

**The configuration is now ready for Railway deployment!** 🚀
