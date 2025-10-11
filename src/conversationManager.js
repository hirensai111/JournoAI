import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import ExperienceRecommender from './recommender.js';
import dotenv from 'dotenv';

dotenv.config();

class ConversationManager {
  constructor(recommender) {
    this.recommender = recommender;
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4-turbo',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY
    });
    
    this.systemPrompt = `You are Journey AI, a friendly and culturally sensitive travel planning assistant. Your role is to help users discover authentic, inclusive travel experiences around the world.

PERSONALITY:
- Warm, helpful, and genuinely excited about travel
- Culturally sensitive and respectful of all backgrounds
- Asks thoughtful clarifying questions
- Explains recommendations with cultural context
- Transparent about why you suggest certain experiences
- Emphasizes inclusion, accessibility, and local authenticity

CONVERSATION FLOW:
1. Greet users warmly and ask about their destination (country, city)
2. Ask about travel dates (optional but helpful for seasonal recommendations)
3. Ask about accessibility needs (wheelchair, mobility aids, sensory, vision, hearing)
4. Ask about dietary restrictions (kosher, halal, vegan, vegetarian, gluten-free, allergies)
5. Ask about interests/preferences (art_culture, history_heritage, nature_outdoors, food_culinary, nightlife_entertainment, adventure_sports, wellness_relaxation, shopping_markets, religious_spiritual, technology_innovation, family_kids, romantic, local_authentic, instagram_worthy, educational, music_performance)
6. Ask about activity level (low, moderate, high)
7. Once you have destination + at least 1 preference, provide recommendations
8. Present recommendations naturally with cultural context
9. Allow follow-up questions and refinements

IMPORTANT GUIDELINES:
- Always prioritize local, authentic experiences over tourist traps
- Highlight cultural significance and why experiences matter
- Be inclusive and welcoming to all travelers
- Explain accessibility features when relevant
- Mention dietary accommodations when applicable
- Keep responses conversational and engaging
- Ask one question at a time to avoid overwhelming users
- When ready to recommend, call the recommender and present results naturally

Remember: You're not just suggesting places to visit - you're helping people connect with cultures, communities, and authentic experiences that will enrich their lives.`;

    this.preferenceKeywords = {
      art_culture: ['art', 'culture', 'museum', 'gallery', 'cultural', 'artistic', 'creative'],
      history_heritage: ['history', 'heritage', 'historical', 'ancient', 'traditional', 'historic'],
      nature_outdoors: ['nature', 'outdoor', 'hiking', 'park', 'garden', 'natural', 'wildlife'],
      food_culinary: ['food', 'restaurant', 'cuisine', 'culinary', 'dining', 'cooking', 'eat'],
      nightlife_entertainment: ['nightlife', 'entertainment', 'music', 'concert', 'bar', 'club', 'show'],
      adventure_sports: ['adventure', 'sport', 'active', 'exciting', 'thrilling', 'extreme'],
      wellness_relaxation: ['wellness', 'spa', 'relaxation', 'peaceful', 'calm', 'meditation'],
      shopping_markets: ['shopping', 'market', 'store', 'buy', 'shop', 'boutique'],
      religious_spiritual: ['religious', 'spiritual', 'temple', 'church', 'mosque', 'sacred'],
      technology_innovation: ['technology', 'innovation', 'tech', 'modern', 'digital'],
      family_kids: ['family', 'kids', 'children', 'family-friendly', 'child'],
      romantic: ['romantic', 'couple', 'date', 'intimate', 'romance'],
      local_authentic: ['local', 'authentic', 'traditional', 'genuine', 'real'],
      instagram_worthy: ['instagram', 'photo', 'picturesque', 'beautiful', 'scenic'],
      educational: ['educational', 'learn', 'educational', 'informative', 'teach'],
      music_performance: ['music', 'performance', 'concert', 'live music', 'musical']
    };
  }

  async sendMessage(userMessage, sessionState = {}) {
    try {
      const { messages = [], preferences = {}, recommendations = [] } = sessionState;
      
      // Build message history
      const messageHistory = [
        new SystemMessage(this.systemPrompt),
        ...messages.slice(-10), // Keep last 10 messages for context
        new HumanMessage(userMessage)
      ];

      // Get AI response
      const response = await this.llm.invoke(messageHistory);
      const aiReply = response.content;

      // Extract preferences from the conversation
      const extractedPreferences = this.extractPreferences([...messages, new HumanMessage(userMessage), new AIMessage(aiReply)]);
      const updatedPreferences = { ...preferences, ...extractedPreferences };

      // Check if we should make recommendations
      let updatedRecommendations = recommendations;
      if (this.shouldRecommend(updatedPreferences)) {
        try {
          const searchResults = await this.recommender.search({
            query: this.buildSearchQuery(updatedPreferences),
            filters: this.buildFilters(updatedPreferences),
            limit: 5
          });

          if (searchResults.length > 0) {
            updatedRecommendations = searchResults;
            const formattedRecommendations = this.formatRecommendations(searchResults);
            const aiReplyWithRecommendations = `${aiReply}\n\n${formattedRecommendations}`;
            
            return {
              reply: aiReplyWithRecommendations,
              updatedState: {
                messages: [...messages, new HumanMessage(userMessage), new AIMessage(aiReplyWithRecommendations)],
                preferences: updatedPreferences,
                recommendations: updatedRecommendations
              }
            };
          }
        } catch (error) {
          console.error('Error getting recommendations:', error);
        }
      }

      return {
        reply: aiReply,
        updatedState: {
          messages: [...messages, new HumanMessage(userMessage), new AIMessage(aiReply)],
          preferences: updatedPreferences,
          recommendations: updatedRecommendations
        }
      };

    } catch (error) {
      console.error('Error in sendMessage:', error);
      return {
        reply: "I'm sorry, I'm having trouble processing your message right now. Please try again.",
        updatedState: sessionState
      };
    }
  }

  extractPreferences(messages) {
    const preferences = {};
    const text = messages.map(msg => msg.content).join(' ').toLowerCase();

    // Extract destination
    const countryMatch = text.match(/(?:going to|visiting|traveling to|trip to)\s+([a-z\s]+)/i);
    if (countryMatch) {
      const country = countryMatch[1].trim();
      if (country.includes('united states') || country.includes('usa') || country.includes('america')) {
        preferences.country = 'United States';
      }
    }

    // Extract city
    const cityMatch = text.match(/(?:in|to)\s+([a-z\s]+)(?:\s|$)/i);
    if (cityMatch) {
      const city = cityMatch[1].trim();
      if (city && city.length > 2) {
        preferences.city = city;
      }
    }

    // Extract accessibility needs
    const accessibilityKeywords = ['wheelchair', 'mobility', 'accessible', 'disability'];
    const hasAccessibility = accessibilityKeywords.some(keyword => text.includes(keyword));
    if (hasAccessibility) {
      preferences.accessibility_needs = ['wheelchair_accessible'];
    }

    // Extract dietary restrictions
    const dietaryKeywords = {
      kosher: ['kosher', 'jewish'],
      halal: ['halal', 'muslim'],
      vegan: ['vegan'],
      vegetarian: ['vegetarian', 'veggie'],
      gluten_free: ['gluten-free', 'gluten free', 'celiac']
    };

    const dietary = [];
    Object.entries(dietaryKeywords).forEach(([diet, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        dietary.push(diet);
      }
    });
    if (dietary.length > 0) {
      preferences.dietary = dietary;
    }

    // Extract activity level
    if (text.includes('low activity') || text.includes('relaxed') || text.includes('easy')) {
      preferences.activity_level = 'low';
    } else if (text.includes('moderate') || text.includes('medium')) {
      preferences.activity_level = 'moderate';
    } else if (text.includes('high activity') || text.includes('active') || text.includes('intense')) {
      preferences.activity_level = 'high';
    }

    // Extract preference tags
    const preferenceTags = [];
    Object.entries(this.preferenceKeywords).forEach(([tag, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        preferenceTags.push(tag);
      }
    });
    if (preferenceTags.length > 0) {
      preferences.preferences = preferenceTags;
    }

    return preferences;
  }

  shouldRecommend(state) {
    const { preferences } = state;
    return preferences.country && (
      preferences.preferences?.length > 0 || 
      preferences.accessibility_needs?.length > 0 || 
      preferences.dietary?.length > 0
    );
  }

  buildSearchQuery(preferences) {
    const parts = [];
    
    if (preferences.preferences?.length > 0) {
      parts.push(preferences.preferences.join(' '));
    }
    
    if (preferences.city) {
      parts.push(`in ${preferences.city}`);
    }
    
    if (preferences.country) {
      parts.push(`in ${preferences.country}`);
    }
    
    return parts.join(' ') || 'travel experiences';
  }

  buildFilters(preferences) {
    const filters = {};
    
    if (preferences.country) {
      filters.country = preferences.country;
    }
    
    if (preferences.city) {
      filters.city = preferences.city;
    }
    
    if (preferences.accessibility_needs?.length > 0) {
      filters.accessibility_needs = preferences.accessibility_needs;
    }
    
    if (preferences.dietary?.length > 0) {
      filters.dietary = preferences.dietary;
    }
    
    if (preferences.preferences?.length > 0) {
      filters.preferences = preferences.preferences;
    }
    
    if (preferences.activity_level) {
      filters.activity_level = preferences.activity_level;
    }
    
    return filters;
  }

  formatRecommendations(results) {
    if (results.length === 0) {
      return "I couldn't find any experiences that match your criteria. Let me know if you'd like to adjust your preferences!";
    }

    let response = "🎯 **Here are some amazing experiences I found for you:**\n\n";
    
    results.forEach((result, index) => {
      const exp = result.experience;
      response += `**${index + 1}. ${exp.name}** (${exp.city}, ${exp.state})\n`;
      response += `📍 ${exp.description}\n`;
      response += `⭐ Cultural significance: ${exp.cultural_significance.substring(0, 150)}...\n`;
      
      if (exp.inclusion_tags.length > 0) {
        response += `🏷️ Tags: ${exp.inclusion_tags.join(', ')}\n`;
      }
      
      if (exp.price_range) {
        response += `💰 Price: ${exp.price_range}\n`;
      }
      
      if (exp.duration_hours) {
        response += `⏱️ Duration: ${exp.duration_hours}\n`;
      }
      
      response += `\n`;
    });
    
    response += "Would you like to know more about any of these experiences, or shall I help you find something different?";
    
    return response;
  }
}

export default ConversationManager;

