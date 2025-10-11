import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import ExperienceRecommender from './recommender.js';
import ConversationManager from './conversationManager.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Initialize recommender and conversation manager
let recommender;
let conversationManager;

// In-memory session storage
const sessions = new Map();

// Routes
app.post('/api/recommend', async (req, res) => {
  try {
    const { query, filters = {}, limit = 10 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const startTime = Date.now();
    const results = await recommender.search({ query, filters, limit });
    const queryTime = Date.now() - startTime;

    res.json({
      recommendations: results,
      query_time_ms: queryTime,
      total_results: results.length
    });
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

app.get('/api/experiences', async (req, res) => {
  try {
    const { country, city, type } = req.query;
    
    let filteredExperiences = recommender.experiences;
    
    if (country) {
      filteredExperiences = filteredExperiences.filter(exp => exp.country === country);
    }
    
    if (city) {
      filteredExperiences = filteredExperiences.filter(exp => exp.city === city);
    }
    
    if (type) {
      filteredExperiences = filteredExperiences.filter(exp => exp.type === type);
    }
    
    res.json({
      experiences: filteredExperiences,
      total: filteredExperiences.length,
      filters: { country, city, type }
    });
  } catch (error) {
    console.error('Experiences filter error:', error);
    res.status(500).json({ error: 'Failed to filter experiences' });
  }
});

app.get('/api/experiences/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const experience = recommender.experiences.find(exp => exp.id === id);
    
    if (!experience) {
      return res.status(404).json({ error: 'Experience not found' });
    }
    
    res.json({ experience });
  } catch (error) {
    console.error('Experience lookup error:', error);
    res.status(500).json({ error: 'Failed to get experience' });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const stats = recommender.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, session_id = 'default' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Get or create session
    let sessionState = sessions.get(session_id) || {
      messages: [],
      preferences: {},
      recommendations: []
    };
    
    // Send message to conversation manager
    const { reply, updatedState } = await conversationManager.sendMessage(
      message,
      sessionState
    );
    
    // Update session
    sessions.set(session_id, updatedState);
    
    res.json({
      reply,
      session_id,
      preferences: updatedState.preferences,
      has_recommendations: updatedState.recommendations.length > 0
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
async function startServer() {
  try {
    console.log('🚀 Initializing Experience Recommender...');
    recommender = new ExperienceRecommender();
    await recommender.initialize();
    
    console.log('🤖 Initializing Conversation Manager...');
    conversationManager = new ConversationManager(recommender);
    
    app.listen(PORT, () => {
      console.log(`🌐 Server listening on http://localhost:${PORT}`);
      console.log(`📊 Available endpoints:`);
      console.log(`   POST /api/recommend - Get recommendations`);
      console.log(`   POST /api/chat - Chat with Journey AI`);
      console.log(`   GET  /api/experiences - List experiences`);
      console.log(`   GET  /api/experiences/:id - Get single experience`);
      console.log(`   GET  /api/stats - Get database statistics`);
      console.log(`   GET  /api/health - Health check`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
