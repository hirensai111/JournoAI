import ExperienceRecommender from './src/recommender.js';

async function testGlobalSearch() {
  console.log('🌍 TESTING GLOBAL RECOMMENDATIONS\n');
  
  const recommender = new ExperienceRecommender();
  await recommender.initialize();
  
  console.log('═══════════════════════════════════════════\n');
  
  // Test 1: Maria in Tokyo
  console.log('🗾 TEST 1: Maria in Tokyo (wheelchair, kosher)');
  const tokyo = await recommender.search({
    query: 'cultural museums and traditional experiences',
    filters: {
      country: 'Japan',
      city: 'Tokyo',
      accessibility_needs: ['wheelchair_accessible'],
      dietary: ['kosher']
    },
    limit: 3
  });
  
  console.log('Results:');
  tokyo.forEach((r, i) => {
    console.log(`${i+1}. ${r.experience.name} (${r.experience.city})`);
    console.log(`   Score: ${r.score.toFixed(3)} | ${r.experience.inclusion_tags.join(', ')}`);
  });
  console.log('\n');
  
  // Test 2: Maria in Paris
  console.log('🇫🇷 TEST 2: Maria in Paris (wheelchair, kosher)');
  const paris = await recommender.search({
    query: 'art galleries and authentic French cuisine',
    filters: {
      country: 'France',
      city: 'Paris',
      accessibility_needs: ['wheelchair_accessible'],
      dietary: ['kosher']
    },
    limit: 3
  });
  
  console.log('Results:');
  paris.forEach((r, i) => {
    console.log(`${i+1}. ${r.experience.name} (${r.experience.city})`);
    console.log(`   Score: ${r.score.toFixed(3)} | ${r.experience.preference_tags.slice(0,3).join(', ')}`);
  });
  console.log('\n');
  
  // Test 3: Cross-country jazz search
  console.log('🎵 TEST 3: Jazz music experiences (any country)');
  const jazz = await recommender.search({
    query: 'authentic jazz music and live performances',
    filters: {
      accessibility_needs: ['wheelchair_accessible'],
      preferences: ['music_performance']
    },
    limit: 5
  });
  
  console.log('Results:');
  jazz.forEach((r, i) => {
    console.log(`${i+1}. ${r.experience.name} (${r.experience.city}, ${r.experience.country})`);
    console.log(`   Score: ${r.score.toFixed(3)}`);
  });
  console.log('\n');
  
  // Test 4: Family-friendly experiences
  console.log('👨‍👩‍👧 TEST 4: Family-friendly cultural experiences');
  const family = await recommender.search({
    query: 'family activities and cultural learning',
    filters: {
      preferences: ['family_kids', 'educational'],
      activity_level: 'low'
    },
    limit: 5
  });
  
  console.log('Results (across all countries):');
  family.forEach((r, i) => {
    console.log(`${i+1}. ${r.experience.name} (${r.experience.country})`);
    console.log(`   Activity: ${r.experience.activity_level} | Duration: ${r.experience.duration_hours}`);
  });
  console.log('\n');
  
  // Test 5: Stats
  console.log('📊 GLOBAL STATISTICS:');
  const stats = recommender.getStats();
  console.log(stats);
}

testGlobalSearch().catch(console.error);
