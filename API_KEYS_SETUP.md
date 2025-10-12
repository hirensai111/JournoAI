# 🔑 API Keys Setup Guide

## ⚠️ IMPORTANT: Fix Hardcoded Flight Data

If you're seeing **hardcoded/mock flight data** instead of real flights from Amadeus, it's because the API keys are not configured in Railway.

---

## 🛫 Amadeus Flight API (REQUIRED)

**Without these keys, all flight searches will return mock/demo data!**

### Step 1: Get Your API Keys

1. Go to **https://developers.amadeus.com/**
2. Click "Sign Up" and create a free account
3. Verify your email
4. Go to **My Apps** → **Create New App**
5. Name it (e.g., "JournoAI Flights")
6. Copy your **API Key** (this is your Client ID)
7. Copy your **API Secret** (this is your Client Secret)

### Step 2: Add to Railway

1. Go to your **Railway Dashboard**
2. Select your **JournoAI service**
3. Click the **Variables** tab
4. Click **+ New Variable** and add:

```bash
AMADEUS_CLIENT_ID=paste_your_api_key_here
AMADEUS_CLIENT_SECRET=paste_your_api_secret_here
AMADEUS_HOSTNAME=test
```

5. Railway will automatically redeploy your app

### Step 3: Verify It's Working

1. Check Railway **Logs**
2. Look for this message: `✅ Amadeus API keys found - using live API`
3. If you see `🎭 DEMO MODE: No Amadeus API keys - using mock data`, the keys are not set correctly

---

## 🔥 Firebase (REQUIRED for user features)

### Get Firebase Credentials:

1. Go to **Firebase Console**: https://console.firebase.google.com/
2. Select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file

### Add to Railway:

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour full private key here\n-----END PRIVATE KEY-----\n"
```

⚠️ **Important:** For `FIREBASE_PRIVATE_KEY`, wrap the entire key in quotes and keep the `\n` characters.

---

## 🤖 OpenAI API (REQUIRED for AI features)

### Get Your API Key:

1. Go to **https://platform.openai.com/api-keys**
2. Click **Create New Secret Key**
3. Copy the key (starts with `sk-`)

### Add to Railway:

```bash
OPENAI_API_KEY=sk-your-key-here
```

---

## 🏨 Optional: Booking.com (for hotel search)

If not set, hotel search will also use demo data.

```bash
BOOKING_API_KEY=your_booking_api_key
```

---

## ✅ Quick Checklist

- [ ] Amadeus API keys added to Railway
- [ ] Firebase credentials added to Railway
- [ ] OpenAI API key added to Railway
- [ ] Check Railway logs for success messages
- [ ] Test flight search in the app
- [ ] Verify you see real flight data (prices, times, airlines)

---

## 🐛 Still Seeing Mock Data?

1. **Check Railway Variables Tab** - Make sure all keys are there
2. **Check Railway Logs** - Look for "DEMO MODE" warnings
3. **Verify API Keys** - Test them in Amadeus API console
4. **Redeploy** - Sometimes Railway needs a manual redeploy after adding variables

---

**Need help?** Check the main [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md) guide for more details.
