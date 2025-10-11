import ExperienceRecommender from './src/recommender.js';

async function test() {
  console.log('🚀 Initializing recommender...\n');
  const recommender = new ExperienceRecommender();
  await recommender.initialize();
  
  console.log('📊 Database Stats:', recommender.getStats(), '\n');
  
  // Test 1: Basic semantic search
  console.log('=== Test 1: Jazz music history ===');
  const results1 = await recommender.search({
    query: 'authentic jazz music and history',
    filters: { 
      country: 'United States',
      accessibility_needs: ['wheelchair_accessible']
    },
    limit: 3
  });
  console.log(results1.map(r => ({
    name: r.experience.name,
    city: r.experience.city,
    score: r.score.toFixed(3),
    tags: r.experience.inclusion_tags
  })));
  console.log('\n');
  
  // Test 2: Dietary + inclusion
  console.log('=== Test 2: Kosher food + woman-owned ===');
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
}

test().catch(console.error);

