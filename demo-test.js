import ExperienceRecommender from './src/recommender.js';

// Mock the OpenAI calls for demo purposes
const originalCreateEmbeddings = ExperienceRecommender.prototype.createEmbeddings;
ExperienceRecommender.prototype.createEmbeddings = async function() {
  console.log('🎭 DEMO MODE: Skipping OpenAI API calls');
  // Create mock embeddings (random vectors)
  this.embeddings = this.experiences.map(experience => ({
    experience,
    embedding: Array(1536).fill(0).map(() => Math.random() - 0.5)
  }));
};

const originalSearch = ExperienceRecommender.prototype.search;
ExperienceRecommender.prototype.search = async function({ query, filters = {}, limit = 10 }) {
  console.log('🎭 DEMO MODE: Using mock search results');
  
  // Simple text matching for demo
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(' ');
  
  const results = this.experiences
    .filter(experience => {
      // Basic text matching - check if any query word appears in the text
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

async function test() {
  console.log('🚀 Initializing recommender in DEMO MODE...\n');
  const recommender = new ExperienceRecommender();
  await recommender.initialize();
  
  console.log('📊 Database Stats:', recommender.getStats(), '\n');
  
  // Test 1: Basic semantic search
  console.log('=== Test 1: Jazz music history ===');
  console.log('🔍 Looking for experiences with "jazz" in the name or description...');
  const jazzExperiences = recommender.experiences.filter(exp => 
    exp.name.toLowerCase().includes('jazz') || 
    exp.description.toLowerCase().includes('jazz')
  );
  console.log('Found jazz experiences:', jazzExperiences.map(exp => exp.name));
  
  const results1 = await recommender.search({
    query: 'jazz music',
    filters: { 
      country: 'United States',
      accessibility_needs: ['wheelchair_accessible']
    },
    limit: 3
  });
  console.log('Search results:', results1.map(r => ({
    name: r.experience.name,
    city: r.experience.city,
    score: r.score.toFixed(3),
    tags: r.experience.inclusion_tags
  })));
  console.log('\n');
  
  // Test 2: Dietary + inclusion
  console.log('=== Test 2: Kosher food ===');
  const results2 = await recommender.search({
    query: 'traditional local food restaurants',
    filters: {
      country: 'United States',
      dietary: ['kosher_style']
    },
    limit: 3
  });
  console.log(results2.map(r => ({
    name: r.experience.name,
    city: r.experience.city,
    dietary: r.experience.dietary_accommodations,
    score: r.score.toFixed(3)
  })));
  console.log('\n');
  
  // Test 3: Preference matching
  console.log('=== Test 3: Art & culture preferences ===');
  const results3 = await recommender.search({
    query: 'cultural experiences',
    filters: {
      country: 'United States',
      preferences: ['art_culture', 'history_heritage'],
      activity_level: 'low'
    },
    limit: 3
  });
  console.log(results3.map(r => ({
    name: r.experience.name,
    city: r.experience.city,
    preferences: r.experience.preference_tags,
    activity: r.experience.activity_level,
    score: r.score.toFixed(3)
  })));
  
  console.log('\n✅ DEMO COMPLETED SUCCESSFULLY!');
  console.log('💡 To use with real OpenAI API, update your .env file with a valid API key');
}

test().catch(console.error);
