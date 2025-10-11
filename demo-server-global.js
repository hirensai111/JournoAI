import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import ExperienceRecommender from './src/recommender.js';
import ConversationManager from './src/conversationManager.js';
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
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Initialize recommender and conversation manager
let recommender;
let conversationManager;

// In-memory session storage for chatbot
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
    
    res.json(filteredExperiences);
  } catch (error) {
    console.error('Experiences error:', error);
    res.status(500).json({ error: 'Failed to get experiences' });
  }
});

app.get('/api/experiences/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const experience = recommender.experiences.find(exp => exp.id === id);
    
    if (!experience) {
      return res.status(404).json({ error: 'Experience not found' });
    }
    
    res.json(experience);
  } catch (error) {
    console.error('Experience error:', error);
    res.status(500).json({ error: 'Failed to get experience' });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    res.json(recommender.getStats());
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

    let sessionState = sessions.get(session_id) || {
      messages: [],
      preferences: {},
      recommendations: []
    };

    const { reply, updatedState } = await conversationManager.sendMessage(
      message,
      sessionState
    );

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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'An unexpected error occurred',
    details: err.message
  });
});

// Start server
async function startServer() {
  try {
    console.log('🚀 Initializing Experience Recommender in DEMO MODE...');
    recommender = new ExperienceRecommender();
    
    // Demo mode overrides
    recommender.createEmbeddings = async function() {
      console.log('🎭 DEMO MODE: Skipping OpenAI API calls');
      this.embeddings = this.experiences.map(experience => ({
        experience,
        embedding: Array(1536).fill(0).map(() => Math.random() - 0.5) // Mock embedding
      }));
    };

    // Mock search function for demo mode
    const originalSearch = recommender.search;
    recommender.search = async function({ query, filters = {}, limit = 10 }) {
      console.log('🎭 DEMO MODE: Using mock search results');

      const queryLower = query.toLowerCase();
      const queryWords = queryLower.split(' ');

      const results = this.experiences
        .filter(experience => {
          const text = [
            experience.name,
            experience.description,
            experience.cultural_significance
          ].join(' ').toLowerCase();

          const hasTextMatch = queryWords.some(word => text.includes(word));
          const hasPreferenceMatch = experience.preference_tags.some(tag =>
            queryWords.some(word => tag.includes(word) || word.includes(tag.replace('_', ' ')))
          );
          const hasInclusionMatch = experience.inclusion_tags.some(tag =>
            queryWords.some(word => tag.includes(word) || word.includes(tag.replace('_', ' ')))
          );

          return hasTextMatch || hasPreferenceMatch || hasInclusionMatch;
        })
        .filter(experience => this.matchesFilters(experience, filters))
        .slice(0, limit)
        .map(experience => ({
          experience,
          score: Math.random() * 0.5 + 0.5 // Random score between 0.5-1.0
        }))
        .sort((a, b) => b.score - a.score);

      return results;
    };

    await recommender.initialize();

    console.log('🤖 Initializing Conversation Manager in DEMO MODE...');
    conversationManager = new ConversationManager(recommender);

    app.listen(PORT, () => {
      console.log(`🌐 Demo Server listening on http://localhost:${PORT}`);
      console.log(`📊 Available endpoints:`);
      console.log(`   POST /api/recommend - Get recommendations`);
      console.log(`   POST /api/chat - Chat with Journey AI`);
      console.log(`   GET  /api/experiences - List experiences`);
      console.log(`   GET  /api/experiences/:id - Get single experience`);
      console.log(`   GET  /api/stats - Get database statistics`);
      console.log(`   GET  /api/health - Health check`);
    });
  } catch (error) {
    console.error('❌ Failed to start demo server:', error);
    process.exit(1);
  }
}

startServer();
