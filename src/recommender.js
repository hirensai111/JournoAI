import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

class ExperienceRecommender {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.experiences = [];
    this.embeddings = [];
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Experience Recommender...');
      
      // Load experiences from all regions
      await this.loadExperiences();
      
      console.log(`✅ Loaded ${this.experiences.length} experiences`);
      
      // Create embeddings for each experience
      await this.createEmbeddings();
      
      console.log(`✅ Created embeddings for ${this.embeddings.length} experiences`);
    } catch (error) {
      console.error('❌ Error initializing recommender:', error);
      throw error;
    }
  }

  async loadExperiences() {
    console.log('📂 Loading experiences from all regions...');
    
    const regions = [
      'north-america',
      'south-america', 
      'europe',
      'asia',
      'oceania',
      'africa',      // For future expansion
      'middle-east'  // For future expansion
    ];
    
    const allExperiences = [];
    const countriesLoaded = new Set();
    
    for (const region of regions) {
      const regionPath = `./data/experiences/${region}`;
      try {
        const files = await fs.readdir(regionPath);
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(regionPath, file);
            const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
            
            // Handle both formats: {experiences: [...]} or [...]
            const experiences = data.experiences || data;
            
            if (Array.isArray(experiences)) {
              allExperiences.push(...experiences);
              
              // Track countries
              if (experiences.length > 0) {
                countriesLoaded.add(experiences[0].country);
              }
            }
          }
        }
      } catch (err) {
        // Region folder doesn't exist yet, skip silently
        continue;
      }
    }
    
    this.experiences = allExperiences;
    
    console.log(`✅ Loaded ${this.experiences.length} experiences`);
    console.log(`🌍 Countries: ${Array.from(countriesLoaded).sort().join(', ')}`);
    console.log(`📍 ${countriesLoaded.size} countries total\n`);
  }

  async createEmbeddings() {
    const embeddingPromises = this.experiences.map(async (experience) => {
      // Combine text fields for embedding
      const textToEmbed = [
        experience.name,
        experience.description,
        experience.cultural_significance,
        experience.why_authentic
      ].join(' ');

      try {
        const response = await this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: textToEmbed
        });

        return {
          experience,
          embedding: response.data[0].embedding
        };
      } catch (error) {
        console.error(`Error creating embedding for ${experience.name}:`, error);
        return null;
      }
    });

    const results = await Promise.all(embeddingPromises);
    this.embeddings = results.filter(result => result !== null);
  }

  async search({ query, filters = {}, limit = 10 }) {
    try {
      // Create embedding for the query
      const queryResponse = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query
      });
      
      const queryEmbedding = queryResponse.data[0].embedding;
      
      // Calculate similarities and apply filters
      const results = this.embeddings
        .map(({ experience, embedding }) => {
          const similarity = this.cosineSimilarity(queryEmbedding, embedding);
          return { experience, embedding, similarity };
        })
        .filter(({ experience }) => this.matchesFilters(experience, filters))
        .map(({ experience, similarity }) => {
          let score = similarity;
          
          // Apply boosts
          score += this.calculateBoosts(experience, filters);
          
          return { experience, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return results;
    } catch (error) {
      console.error('Error in search:', error);
      throw error;
    }
  }

  matchesFilters(experience, filters) {
    // Country filter
    if (filters.country && experience.country !== filters.country) {
      return false;
    }

    // City filter
    if (filters.city && experience.city !== filters.city) {
      return false;
    }

    // Accessibility needs filter
    if (filters.accessibility_needs && filters.accessibility_needs.length > 0) {
      const hasAllAccessibility = filters.accessibility_needs.every(need => 
        experience.inclusion_tags.includes(need)
      );
      if (!hasAllAccessibility) return false;
    }

    // Dietary accommodations filter
    if (filters.dietary && filters.dietary.length > 0) {
      if (!experience.dietary_accommodations) return false;
      const hasAllDietary = filters.dietary.every(diet => 
        experience.dietary_accommodations.includes(diet)
      );
      if (!hasAllDietary) return false;
    }

    // Activity level filter
    if (filters.activity_level) {
      const activityLevels = ['sedentary', 'low', 'moderate', 'high', 'extreme'];
      const userLevelIndex = activityLevels.indexOf(filters.activity_level);
      const experienceLevelIndex = activityLevels.indexOf(experience.activity_level);
      
      if (filters.activity_level === 'low' && experienceLevelIndex > 1) {
        return false;
      }
      if (filters.activity_level === 'moderate' && experienceLevelIndex > 2) {
        return false;
      }
    }

    return true;
  }

  calculateBoosts(experience, filters) {
    let boost = 0;

    // Preference tag boosts
    if (filters.preferences && filters.preferences.length > 0) {
      const matchingPreferences = filters.preferences.filter(pref => 
        experience.preference_tags.includes(pref)
      );
      boost += matchingPreferences.length * 0.15;
    }

    // Local authentic boost
    if (experience.preference_tags.includes('local_authentic')) {
      boost += 0.10;
    }

    // Inclusion tag boosts
    const inclusionBoosts = ['woman_owned', 'bipoc_owned', 'lgbtq_friendly', 'local_minority_owned'];
    const matchingInclusions = inclusionBoosts.filter(tag => 
      experience.inclusion_tags.includes(tag)
    );
    boost += matchingInclusions.length * 0.05;

    return boost;
  }

  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  getStats() {
    const countries = [...new Set(this.experiences.map(exp => exp.country))];
    const cities = [...new Set(this.experiences.map(exp => exp.city))];
    const types = [...new Set(this.experiences.map(exp => exp.type))];
    
    return {
      total_experiences: this.experiences.length,
      countries: countries.length,
      cities: cities.length,
      types: types.length,
      countries_list: countries,
      cities_list: cities,
      types_list: types
    };
  }
}

export default ExperienceRecommender;
