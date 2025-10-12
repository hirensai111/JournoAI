# 🚀 Railway Deployment Guide for Journey AI

## ✅ **FIXED: Railway Configuration Added**

The following files have been added to fix the Railway deployment:

### **1. nixpacks.toml**
```toml
[phases.setup]
nixPkgs = ['nodejs_20']

[phases.install]
cmds = ['npm install']

[start]
cmd = 'npm start'
```

### **2. Procfile**
```
web: npm start
```

### **3. Updated package.json**
- Added `engines` field specifying Node.js 18.x
- Updated `start` script to use `server-production.js`

---

## 🔧 **Required Environment Variables**

Set these in your Railway dashboard under **Variables**:

### **Essential Variables:**
```bash
# Server Configuration
PORT=3001
NODE_ENV=production

# Firebase (Required for wellness features)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email

# OpenAI (Required for AI features)
OPENAI_API_KEY=your_openai_api_key
```

### **Optional API Keys:**
```bash
# Amadeus Flight API (for flight search)
AMADEUS_CLIENT_ID=your_amadeus_client_id
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret
AMADEUS_HOSTNAME=test

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

### **If deployment fails:**
1. Check Railway logs for errors
2. Verify all environment variables are set
3. Ensure `server-production.js` exists and runs locally
4. Check that all dependencies are in `package.json`

### **If app doesn't start:**
1. Verify `PORT` environment variable is set
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
