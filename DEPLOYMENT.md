# 🚀 DEPLOYMENT CHECKLIST

## ✅ Pre-Deployment Verification

### 1. Test Local Functionality
```bash
# Verify global data loading
node test-global-demo.js

# Test API endpoints
curl http://localhost:3001/api/stats
curl -X POST http://localhost:3001/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"query": "jazz music", "filters": {"country": "United States"}, "limit": 3}'

# Test chatbot
node test-maria-global.js
```

### 2. Environment Variables
Create `.env` file:
```
OPENAI_API_KEY=your_openai_api_key_here
PORT=3001
```

### 3. File Structure Check
```
journey-ai/
├── data/
│   ├── experiences/ (18 countries, 325+ experiences)
│   └── metadata.json
├── src/
│   ├── recommender.js ✅
│   ├── server.js ✅
│   └── conversationManager.js ✅
├── server-production.js ✅
├── package.json ✅
└── README.md ✅
```

## 🌐 Deployment Options

### Option A: Railway (RECOMMENDED - Easiest)

1. **Go to** https://railway.app
2. **Sign up** with GitHub
3. **Create new project** → "Deploy from GitHub repo"
4. **Connect your repository**
5. **Set environment variables:**
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3001
   ```
6. **Deploy** - Railway auto-detects Node.js
7. **Get public URL:** `https://journey-ai-production.up.railway.app`

### Option B: Render

1. **Go to** https://render.com
2. **Sign up** with GitHub
3. **New Web Service** → Connect repository
4. **Build command:** `npm install`
5. **Start command:** `node server-production.js`
6. **Environment variables:** Same as above
7. **Deploy** - get public URL

### Option C: Vercel (Serverless)

Good for frontend, but requires serverless functions for backend.
**Skip for hackathon - use Railway.**

## 🧪 Post-Deployment Testing

### 1. Health Check
```bash
curl https://your-app-url.up.railway.app/api/health
```

### 2. Stats Endpoint
```bash
curl https://your-app-url.up.railway.app/api/stats
```

### 3. Recommendation Test
```bash
curl -X POST https://your-app-url.up.railway.app/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"query": "jazz music", "filters": {"country": "United States"}, "limit": 3}'
```

### 4. Chat Test
```bash
curl -X POST https://your-app-url.up.railway.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hi, I need help planning a trip to Tokyo", "session_id": "test-123"}'
```

## 🎯 Frontend Integration

### API Base URL
```javascript
const API_BASE_URL = 'https://your-app-url.up.railway.app';

// Example usage
const response = await fetch(`${API_BASE_URL}/api/recommend`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: 'authentic local food',
    filters: {
      country: 'Japan',
      accessibility_needs: ['wheelchair_accessible']
    },
    limit: 5
  })
});
```

### Available Endpoints
- `POST /api/recommend` - Get recommendations
- `POST /api/chat` - Chat with Journey AI
- `GET /api/experiences` - List experiences
- `GET /api/experiences/:id` - Get single experience
- `GET /api/stats` - Get database statistics
- `GET /api/health` - Health check

## 🚨 Troubleshooting

### Common Issues

1. **Port conflicts:** Make sure PORT=3001 is set
2. **API quota exceeded:** Use demo mode in server-production.js
3. **Build failures:** Check package.json dependencies
4. **Environment variables:** Ensure they're set in deployment platform

### Debug Commands
```bash
# Check if server is running
curl http://localhost:3001/api/health

# Check logs
node server-production.js

# Test specific endpoint
curl -X POST http://localhost:3001/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "limit": 1}'
```

## 🏆 Success Criteria

✅ **Server deployed and accessible**  
✅ **All API endpoints responding**  
✅ **Global data loading (18 countries)**  
✅ **Search functionality working**  
✅ **Chatbot responding**  
✅ **Frontend can connect to API**  

## 📞 Support

If you encounter issues:
1. Check the logs in your deployment platform
2. Verify environment variables are set
3. Test locally first with `node server-production.js`
4. Check Railway/Render documentation

---

**Ready to deploy! 🚀**
