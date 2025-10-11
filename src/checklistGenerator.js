import { ChatOpenAI } from '@langchain/openai';
import dotenv from 'dotenv';

dotenv.config();

class ChecklistGenerator {
  constructor() {
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4-turbo',
      temperature: 0.3, // Lower temperature for more consistent, reliable checklists
      openAIApiKey: process.env.OPENAI_API_KEY
    });

    // Predefined checklist templates for common conditions
    this.templates = {
      wheelchair_user: {
        categories: ['Mobility Equipment', 'Accessibility Documentation', 'Medical Safety', 'Transportation'],
        critical_items: [
          'Wheelchair repair kit and tire pump',
          'Pre-book wheelchair assistance at airports',
          'Verify hotel accessibility features',
          'Download offline accessibility maps for destination'
        ]
      },
      type_1_diabetes: {
        categories: ['Insulin Management', 'Blood Sugar Monitoring', 'Medical Documentation', 'Emergency Supplies'],
        critical_items: [
          'Insulin supply (2x what needed)',
          'Insulin cooling case for travel',
          'Doctor\'s letter for traveling with medical supplies',
          'Glucose tablets and emergency snacks',
          'Travel insurance covering diabetic emergencies'
        ]
      },
      food_allergies: {
        categories: ['Medical Documentation', 'Communication Tools', 'Emergency Medication'],
        critical_items: [
          'Allergy translation cards in destination language',
          'EpiPen and backup medication',
          'List of safe restaurants pre-verified',
          'Emergency contact for local hospitals'
        ]
      },
      hearing_impaired: {
        categories: ['Communication Aids', 'Technology', 'Safety'],
        critical_items: [
          'Backup hearing aid batteries',
          'Visual alert devices for hotel room',
          'Translation app with text-based communication',
          'Emergency contact cards in local language'
        ]
      },
      visual_impairment: {
        categories: ['Navigation Aids', 'Safety', 'Documentation'],
        critical_items: [
          'White cane or mobility aid',
          'Audio description apps for destination',
          'Pre-book assistance at all venues',
          'Braille or large print maps'
        ]
      }
    };
  }

  /**
   * Generate a personalized travel checklist based on user's health conditions
   */
  async generateChecklist({
    conditions = [],
    destination = '',
    tripDuration = 7,
    travelDate = null,
    soloTravel = false
  }) {
    try {
      console.log(`🔧 Generating checklist for: ${conditions.join(', ')}`);

      // Start with template-based checklist
      const baseChecklist = this.buildBaseChecklist(conditions, destination, tripDuration, travelDate);

      // Use AI to enhance and personalize the checklist
      const enhancedChecklist = await this.enhanceWithAI(baseChecklist, {
        conditions,
        destination,
        tripDuration,
        travelDate,
        soloTravel
      });

      console.log(`✅ Generated ${enhancedChecklist.categories.length} categories with ${this.countTotalItems(enhancedChecklist)} total items`);

      return enhancedChecklist;

    } catch (error) {
      console.error('Error generating checklist:', error);
      // Fallback to template-based checklist
      return this.buildBaseChecklist(conditions, destination, tripDuration, travelDate);
    }
  }

  /**
   * Build base checklist from templates
   */
  buildBaseChecklist(conditions, destination, tripDuration, travelDate) {
    const checklist = {
      traveler_profile: {
        conditions: conditions,
        destination: destination,
        trip_duration: tripDuration,
        travel_date: travelDate
      },
      categories: [],
      critical_count: 0,
      high_priority_count: 0,
      generated_at: new Date().toISOString()
    };

    // Medical Preparation (Always first, most critical)
    const medicalPrep = {
      name: 'Medical Preparation',
      description: `Complete ${this.getTimeframeText(14)} before travel`,
      priority: 'CRITICAL',
      timeframe: '2 weeks before travel',
      items: []
    };

    // Condition-specific medical items
    if (conditions.includes('type_1_diabetes') || conditions.includes('type_2_diabetes')) {
      medicalPrep.items.push(
        {
          task: `Refill insulin prescription (${tripDuration * 2}-day supply for ${tripDuration}-day trip + buffer)`,
          priority: 'CRITICAL',
          action_button: 'Schedule Pharmacy Refill',
          reminder: this.calculateReminderDate(travelDate, 14),
          notes: 'Always bring double the insulin you think you\'ll need'
        },
        {
          task: 'Get doctor\'s letter for traveling with insulin pump & syringes',
          priority: 'CRITICAL',
          action_button: 'Download Template Letter',
          reminder: this.calculateReminderDate(travelDate, 14),
          template_available: true
        },
        {
          task: 'Request prescription for anti-nausea medication (travel sickness)',
          priority: 'HIGH',
          notes: 'Important for managing blood sugar if you can\'t eat',
          reminder: this.calculateReminderDate(travelDate, 14)
        },
        {
          task: `Verify travel insurance covers diabetic emergencies in ${destination || 'destination'}`,
          priority: 'CRITICAL',
          action_button: 'Compare Travel Insurance Plans',
          recommendation: 'World Nomads or Allianz - both cover pre-existing conditions'
        },
        {
          task: 'Schedule pre-trip telehealth consultation',
          priority: 'HIGH',
          topics: ['Time zone insulin adjustment', 'Local food carb counting', 'Emergency protocols'],
          action_button: 'Book Appointment',
          reminder: this.calculateReminderDate(travelDate, 10)
        }
      );
    }

    if (conditions.includes('wheelchair_user')) {
      medicalPrep.items.push(
        {
          task: 'Get medical documentation for wheelchair travel',
          priority: 'CRITICAL',
          action_button: 'Download Wheelchair Travel Form',
          notes: 'Required by most airlines'
        },
        {
          task: 'Schedule wheelchair maintenance check',
          priority: 'HIGH',
          action_button: 'Find Local Wheelchair Repair Shop',
          reminder: this.calculateReminderDate(travelDate, 10)
        }
      );
    }

    checklist.categories.push(medicalPrep);

    // Packing Checklist
    const packing = {
      name: 'Packing Checklist',
      description: 'Complete 3 days before travel',
      priority: 'HIGH',
      timeframe: '3 days before travel',
      items: []
    };

    if (conditions.includes('type_1_diabetes') || conditions.includes('type_2_diabetes')) {
      packing.items.push(
        {
          task: `Insulin cooling case (for ${destination || 'destination'} weather)`,
          priority: 'CRITICAL',
          recommendation: 'FRIO insulin cooling wallet (no ice required)',
          action_button: 'Buy on Amazon'
        },
        {
          task: 'Backup insulin supplies (double what you need)',
          priority: 'CRITICAL',
          checklist: [`${tripDuration * 2} days of insulin`, 'Extra syringes/pens', 'Alcohol wipes', 'Sharps container'],
          action_button: 'Take verification photo before packing'
        },
        {
          task: 'Glucose tablets & emergency snacks',
          priority: 'CRITICAL',
          recommended_items: ['3 packs glucose tablets', 'Protein bars', 'Crackers', 'Juice boxes']
        },
        {
          task: 'Blood glucose monitor & extra strips',
          priority: 'CRITICAL',
          checklist: ['Monitor', `${tripDuration * 6} test strips`, 'Extra lancets', 'Backup batteries']
        },
        {
          task: 'Medical alert bracelet or necklace',
          priority: 'HIGH',
          notes: 'Should say "Type 1 Diabetes" in English and local language'
        }
      );
    }

    if (conditions.includes('wheelchair_user')) {
      packing.items.push(
        {
          task: 'Wheelchair repair kit & pump',
          priority: 'CRITICAL',
          checklist: ['Allen wrench set', 'Tire pump', 'Spare inner tube', 'Duct tape', 'Zip ties'],
          recommendation: 'Compact multi-tool specifically for wheelchairs'
        },
        {
          task: 'Wheelchair cushion and positioning aids',
          priority: 'HIGH',
          notes: 'Don\'t forget your custom cushion for long flights'
        },
        {
          task: 'Portable wheelchair ramp (if needed)',
          priority: 'MEDIUM',
          notes: 'Lightweight folding ramp for small steps'
        }
      );
    }

    checklist.categories.push(packing);

    // Documentation
    const documentation = {
      name: 'Documentation',
      description: 'Complete 1 week before travel',
      priority: 'HIGH',
      timeframe: '1 week before travel',
      items: []
    };

    if (destination) {
      documentation.items.push(
        {
          task: `Download offline ${destination} accessibility maps`,
          priority: 'CRITICAL',
          action_button: 'Download Now',
          notes: 'Includes accessible routes, ramps, elevators'
        },
        {
          task: 'Save hospital locations near hotel',
          priority: 'CRITICAL',
          action_button: 'Find Nearby Hospitals',
          info_needed: ['Phone number', 'Directions', 'English-speaking staff confirmation']
        }
      );
    }

    if (conditions.includes('type_1_diabetes') || conditions.includes('type_2_diabetes')) {
      documentation.items.push(
        {
          task: `${destination || 'Local'} medical translation cards`,
          priority: 'HIGH',
          phrases: [
            'I am diabetic. I need sugar.',
            'I need medical help.',
            'Where is the nearest hospital?',
            'I take insulin.'
          ],
          action_button: 'Download & Print Translation Cards'
        }
      );
    }

    if (conditions.includes('wheelchair_user')) {
      documentation.items.push(
        {
          task: 'Pre-book wheelchair-accessible airport assistance (both ways)',
          priority: 'CRITICAL',
          action_button: 'Request with Airline',
          reminder: this.calculateReminderDate(travelDate, 7)
        },
        {
          task: 'Confirm hotel accessibility features',
          priority: 'CRITICAL',
          checklist: ['Roll-in shower', 'Grab bars', 'Accessible bathroom', 'Doorway widths', 'Elevator access'],
          action_button: 'Call Hotel to Verify'
        }
      );
    }

    checklist.categories.push(documentation);

    // Emergency Preparation
    const emergency = {
      name: 'Emergency Preparation',
      description: 'Review before departure',
      priority: 'CRITICAL',
      timeframe: '1 day before travel',
      items: [
        {
          task: 'Save emergency contacts in phone',
          priority: 'CRITICAL',
          contacts: [
            `${destination || 'Local'} emergency number`,
            'US Embassy/Consulate',
            'Travel insurance emergency line',
            'Personal emergency contact'
          ]
        },
        {
          task: 'Share itinerary with emergency contact',
          priority: 'HIGH',
          info_to_share: ['Flight details', 'Hotel info', 'Daily schedule', 'Medical conditions']
        }
      ]
    };

    if (conditions.includes('type_1_diabetes') || conditions.includes('type_2_diabetes')) {
      emergency.items.push(
        {
          task: 'Locate 24/7 pharmacies near hotel',
          priority: 'HIGH',
          action_button: 'Find Pharmacies',
          save_info: ['Address', 'Phone number', 'Hours']
        }
      );
    }

    checklist.categories.push(emergency);

    // Count priority items
    checklist.critical_count = this.countItemsByPriority(checklist, 'CRITICAL');
    checklist.high_priority_count = this.countItemsByPriority(checklist, 'HIGH');

    return checklist;
  }

  /**
   * Enhance checklist with AI-generated personalized recommendations
   */
  async enhanceWithAI(baseChecklist, userContext) {
    // If no API key, return base checklist
    if (!process.env.OPENAI_API_KEY) {
      console.log('🎭 No OpenAI API key - using template-based checklist');
      return baseChecklist;
    }

    try {
      const prompt = `You are a travel planning assistant specializing in accessible travel for people with disabilities and health conditions.

User Profile:
- Health Conditions: ${userContext.conditions.join(', ')}
- Destination: ${userContext.destination}
- Trip Duration: ${userContext.tripDuration} days
- Solo Travel: ${userContext.soloTravel ? 'Yes' : 'No'}
- Travel Date: ${userContext.travelDate || 'Not specified'}

I have a base checklist. Please suggest 2-3 additional personalized items for each category that would be specifically helpful for this traveler's unique situation.

Base Checklist Categories:
${baseChecklist.categories.map(cat => `- ${cat.name}: ${cat.items.length} items`).join('\n')}

Focus on:
1. Destination-specific considerations (weather, local healthcare, accessibility infrastructure)
2. Condition-specific needs that might be overlooked
3. Solo travel safety concerns
4. Cultural/language barriers related to their health conditions

Provide suggestions in JSON format:
{
  "category_name": [
    {
      "task": "specific task description",
      "priority": "HIGH or MEDIUM",
      "notes": "why this is important for this traveler"
    }
  ]
}`;

      const response = await this.llm.invoke(prompt);
      const suggestions = this.parseAISuggestions(response.content);

      // Merge AI suggestions with base checklist
      return this.mergeAISuggestions(baseChecklist, suggestions);

    } catch (error) {
      console.error('Error enhancing checklist with AI:', error);
      return baseChecklist;
    }
  }

  /**
   * Parse AI response into structured suggestions
   */
  parseAISuggestions(aiResponse) {
    try {
      // Extract JSON from AI response (it might be wrapped in markdown code blocks)
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) || aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      }
      return {};
    } catch (error) {
      console.error('Error parsing AI suggestions:', error);
      return {};
    }
  }

  /**
   * Merge AI suggestions into base checklist
   */
  mergeAISuggestions(baseChecklist, suggestions) {
    for (const [categoryName, items] of Object.entries(suggestions)) {
      const category = baseChecklist.categories.find(cat =>
        cat.name.toLowerCase().includes(categoryName.toLowerCase())
      );

      if (category && Array.isArray(items)) {
        category.items.push(...items);
      }
    }

    return baseChecklist;
  }

  /**
   * Calculate reminder date (X days before travel)
   */
  calculateReminderDate(travelDate, daysBefore) {
    if (!travelDate) return null;

    const travel = new Date(travelDate);
    const reminder = new Date(travel);
    reminder.setDate(travel.getDate() - daysBefore);

    return reminder.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  }

  /**
   * Count items by priority level
   */
  countItemsByPriority(checklist, priority) {
    let count = 0;
    checklist.categories.forEach(category => {
      count += category.items.filter(item => item.priority === priority).length;
    });
    return count;
  }

  /**
   * Count total items in checklist
   */
  countTotalItems(checklist) {
    return checklist.categories.reduce((sum, cat) => sum + cat.items.length, 0);
  }

  /**
   * Get timeframe text
   */
  getTimeframeText(days) {
    if (days >= 14) return '2 weeks';
    if (days >= 7) return '1 week';
    if (days >= 3) return '3 days';
    return `${days} days`;
  }
}

export default ChecklistGenerator;
