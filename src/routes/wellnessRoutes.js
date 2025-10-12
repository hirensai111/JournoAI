/**
 * Express API Routes for Wellness Check-In
 * Handles medications, conditions, packing, insurance, and allergies
 */

import express from 'express';
import multer from 'multer';
import { WellnessService } from '../firebaseAdmin.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Middleware to verify authentication
const verifyAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // For development/testing, we'll use a simple approach
    // In production, you'd want to verify the token with Firebase Admin SDK
    if (token === 'test-token' || token === 'demo-token') {
      req.user = { uid: 'demo-user-id' };
      next();
      return;
    }
    
    // Try to parse JWT token
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        req.user = { uid: payload.user_id || payload.sub || payload.uid };
        next();
        return;
      }
    } catch (parseError) {
      // If JWT parsing fails, continue to error
    }
    
    // If we get here, the token is invalid
    res.status(401).json({ error: 'Invalid authorization token' });
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(401).json({ error: 'Invalid authorization token' });
  }
};

// Apply auth middleware to all routes
router.use(verifyAuth);

// Helper function to upload file to Firebase Storage (simplified)
const uploadToStorage = async (file, userId, filename) => {
  // For now, return a placeholder URL
  // In production, you'd implement actual file upload to Firebase Storage
  return `https://storage.googleapis.com/placeholder/${userId}/${filename}`;
};

// ============================================
// MEDICATIONS ROUTES
// ============================================

/**
 * GET /api/user/medications
 * Fetch all user medications
 */
router.get('/medications', async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const result = await WellnessService.getWellnessData(userId, 'medications');
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }
    
    res.json(result.data);
  } catch (error) {
    console.error('Error fetching medications:', error);
    res.status(500).json({ error: 'Failed to fetch medications' });
  }
});

/**
 * POST /api/user/medications
 * Create new medication
 */
router.post('/medications', async (req, res) => {
  try {
    const userId = req.user.uid;
    const medicationData = req.body;
    
    // Validate required fields
    if (!medicationData.name || !medicationData.frequency) {
      return res.status(400).json({ error: 'Name and frequency are required' });
    }
    
    const newMedication = {
      id: Date.now().toString(),
      ...medicationData,
      created_at: new Date().toISOString()
    };
    
    // Get existing medications
    const existingResult = await WellnessService.getWellnessData(userId, 'medications');
    const existingMedications = existingResult.success ? existingResult.data : [];
    
    // Add new medication
    const updatedMedications = [...existingMedications, newMedication];
    
    // Save to Firebase
    const saveResult = await WellnessService.saveWellnessData(userId, 'medications', updatedMedications);
    if (!saveResult.success) {
      return res.status(500).json({ error: saveResult.error });
    }
    
    res.status(201).json(newMedication);
  } catch (error) {
    console.error('Error creating medication:', error);
    res.status(500).json({ error: 'Failed to create medication' });
  }
});

/**
 * PATCH /api/user/medications/:id
 * Update medication
 */
router.patch('/medications/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const medicationId = req.params.id;
    const updateData = req.body;
    
    // Get existing medications
    const existingResult = await WellnessService.getWellnessData(userId, 'medications');
    if (!existingResult.success) {
      return res.status(404).json({ error: 'Medications not found' });
    }
    
    const medications = existingResult.data || [];
    const medicationIndex = medications.findIndex(med => med.id === medicationId);
    
    if (medicationIndex === -1) {
      return res.status(404).json({ error: 'Medication not found' });
    }
    
    medications[medicationIndex] = {
      ...medications[medicationIndex],
      ...updateData,
      updated_at: new Date().toISOString()
    };
    
    // Save updated medications
    const saveResult = await WellnessService.saveWellnessData(userId, 'medications', medications);
    if (!saveResult.success) {
      return res.status(500).json({ error: saveResult.error });
    }
    
    res.json(medications[medicationIndex]);
  } catch (error) {
    console.error('Error updating medication:', error);
    res.status(500).json({ error: 'Failed to update medication' });
  }
});

/**
 * DELETE /api/user/medications/:id
 * Delete medication
 */
router.delete('/medications/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const medicationId = req.params.id;
    
    // Get existing medications
    const existingResult = await WellnessService.getWellnessData(userId, 'medications');
    if (!existingResult.success) {
      return res.status(404).json({ error: 'Medications not found' });
    }
    
    const medications = existingResult.data || [];
    const filteredMedications = medications.filter(med => med.id !== medicationId);
    
    // Save updated medications
    const saveResult = await WellnessService.saveWellnessData(userId, 'medications', filteredMedications);
    if (!saveResult.success) {
      return res.status(500).json({ error: saveResult.error });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting medication:', error);
    res.status(500).json({ error: 'Failed to delete medication' });
  }
});

// ============================================
// MEDICAL CONDITIONS ROUTES
// ============================================

/**
 * GET /api/user/conditions
 * Fetch all user medical conditions
 */
router.get('/conditions', async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const result = await WellnessService.getWellnessData(userId, 'conditions');
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }
    
    res.json(result.data);
  } catch (error) {
    console.error('Error fetching conditions:', error);
    res.status(500).json({ error: 'Failed to fetch conditions' });
  }
});

/**
 * POST /api/user/conditions
 * Create new medical condition
 */
router.post('/conditions', async (req, res) => {
  try {
    const userId = req.user.uid;
    const conditionData = req.body;
    
    // Validate required fields
    if (!conditionData.name || !conditionData.severity) {
      return res.status(400).json({ error: 'Name and severity are required' });
    }
    
    const newCondition = {
      id: Date.now().toString(),
      ...conditionData,
      created_at: new Date().toISOString()
    };
    
    // Get existing conditions
    const existingResult = await WellnessService.getWellnessData(userId, 'conditions');
    const existingConditions = existingResult.success ? existingResult.data : [];
    
    // Add new condition
    const updatedConditions = [...existingConditions, newCondition];
    
    // Save to Firebase
    const saveResult = await WellnessService.saveWellnessData(userId, 'conditions', updatedConditions);
    if (!saveResult.success) {
      return res.status(500).json({ error: saveResult.error });
    }
    
    res.status(201).json(newCondition);
  } catch (error) {
    console.error('Error creating condition:', error);
    res.status(500).json({ error: 'Failed to create condition' });
  }
});

/**
 * PATCH /api/user/conditions/:id
 * Update medical condition
 */
router.patch('/conditions/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const conditionId = req.params.id;
    const updateData = req.body;
    
    // Get existing conditions
    const existingResult = await WellnessService.getWellnessData(userId, 'conditions');
    if (!existingResult.success) {
      return res.status(404).json({ error: 'Conditions not found' });
    }
    
    const conditions = existingResult.data || [];
    const conditionIndex = conditions.findIndex(cond => cond.id === conditionId);
    
    if (conditionIndex === -1) {
      return res.status(404).json({ error: 'Condition not found' });
    }
    
    conditions[conditionIndex] = {
      ...conditions[conditionIndex],
      ...updateData,
      updated_at: new Date().toISOString()
    };
    
    // Save updated conditions
    const saveResult = await WellnessService.saveWellnessData(userId, 'conditions', conditions);
    if (!saveResult.success) {
      return res.status(500).json({ error: saveResult.error });
    }
    
    res.json(conditions[conditionIndex]);
  } catch (error) {
    console.error('Error updating condition:', error);
    res.status(500).json({ error: 'Failed to update condition' });
  }
});

/**
 * DELETE /api/user/conditions/:id
 * Delete medical condition
 */
router.delete('/conditions/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const conditionId = req.params.id;
    
    // Get existing conditions
    const existingResult = await WellnessService.getWellnessData(userId, 'conditions');
    if (!existingResult.success) {
      return res.status(404).json({ error: 'Conditions not found' });
    }
    
    const conditions = existingResult.data || [];
    const filteredConditions = conditions.filter(cond => cond.id !== conditionId);
    
    // Save updated conditions
    const saveResult = await WellnessService.saveWellnessData(userId, 'conditions', filteredConditions);
    if (!saveResult.success) {
      return res.status(500).json({ error: saveResult.error });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting condition:', error);
    res.status(500).json({ error: 'Failed to delete condition' });
  }
});

// ============================================
// ALLERGIES ROUTES
// ============================================

/**
 * GET /api/user/allergies
 * Fetch all user allergies
 */
router.get('/allergies', async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const result = await WellnessService.getWellnessData(userId, 'allergies');
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }
    
    res.json(result.data);
  } catch (error) {
    console.error('Error fetching allergies:', error);
    res.status(500).json({ error: 'Failed to fetch allergies' });
  }
});

/**
 * POST /api/user/allergies
 * Create new allergy
 */
router.post('/allergies', async (req, res) => {
  try {
    const userId = req.user.uid;
    const allergyData = req.body;
    
    // Validate required fields
    if (!allergyData.allergen_name || !allergyData.category || !allergyData.severity) {
      return res.status(400).json({ error: 'Allergen name, category, and severity are required' });
    }
    
    const newAllergy = {
      id: Date.now().toString(),
      ...allergyData,
      created_at: new Date().toISOString()
    };
    
    // Get existing allergies
    const existingResult = await WellnessService.getWellnessData(userId, 'allergies');
    const existingAllergies = existingResult.success ? existingResult.data : [];
    
    // Add new allergy
    const updatedAllergies = [...existingAllergies, newAllergy];
    
    // Save to Firebase
    const saveResult = await WellnessService.saveWellnessData(userId, 'allergies', updatedAllergies);
    if (!saveResult.success) {
      return res.status(500).json({ error: saveResult.error });
    }
    
    res.status(201).json(newAllergy);
  } catch (error) {
    console.error('Error creating allergy:', error);
    res.status(500).json({ error: 'Failed to create allergy' });
  }
});

/**
 * PATCH /api/user/allergies/:id
 * Update allergy
 */
router.patch('/allergies/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const allergyId = req.params.id;
    const updateData = req.body;
    
    // Get existing allergies
    const existingResult = await WellnessService.getWellnessData(userId, 'allergies');
    if (!existingResult.success) {
      return res.status(404).json({ error: 'Allergies not found' });
    }
    
    const allergies = existingResult.data || [];
    const allergyIndex = allergies.findIndex(allergy => allergy.id === allergyId);
    
    if (allergyIndex === -1) {
      return res.status(404).json({ error: 'Allergy not found' });
    }
    
    allergies[allergyIndex] = {
      ...allergies[allergyIndex],
      ...updateData,
      updated_at: new Date().toISOString()
    };
    
    // Save updated allergies
    const saveResult = await WellnessService.saveWellnessData(userId, 'allergies', allergies);
    if (!saveResult.success) {
      return res.status(500).json({ error: saveResult.error });
    }
    
    res.json(allergies[allergyIndex]);
  } catch (error) {
    console.error('Error updating allergy:', error);
    res.status(500).json({ error: 'Failed to update allergy' });
  }
});

/**
 * DELETE /api/user/allergies/:id
 * Delete allergy
 */
router.delete('/allergies/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const allergyId = req.params.id;
    
    // Get existing allergies
    const existingResult = await WellnessService.getWellnessData(userId, 'allergies');
    if (!existingResult.success) {
      return res.status(404).json({ error: 'Allergies not found' });
    }
    
    const allergies = existingResult.data || [];
    const filteredAllergies = allergies.filter(allergy => allergy.id !== allergyId);
    
    // Save updated allergies
    const saveResult = await WellnessService.saveWellnessData(userId, 'allergies', filteredAllergies);
    if (!saveResult.success) {
      return res.status(500).json({ error: saveResult.error });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting allergy:', error);
    res.status(500).json({ error: 'Failed to delete allergy' });
  }
});

// ============================================
// INSURANCE ROUTES
// ============================================

/**
 * GET /api/user/insurance
 * Fetch user insurance information
 */
router.get('/insurance', async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const result = await WellnessService.getInsuranceData(userId);
    if (!result.success) {
      if (result.error === 'Insurance data not found') {
        return res.status(404).json({ error: 'Insurance information not found' });
      }
      return res.status(500).json({ error: result.error });
    }
    
    res.json(result.data);
  } catch (error) {
    console.error('Error fetching insurance:', error);
    res.status(500).json({ error: 'Failed to fetch insurance' });
  }
});

/**
 * POST /api/user/insurance
 * Create or update insurance information
 */
router.post('/insurance', async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Validate required fields
    if (!req.body.company_name || !req.body.policy_number || !req.body.emergency_phone) {
      return res.status(400).json({ error: 'Company name, policy number, and emergency phone are required' });
    }
    
    const insuranceData = {
      ...req.body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const saveResult = await WellnessService.saveInsuranceData(userId, insuranceData);
    if (!saveResult.success) {
      return res.status(500).json({ error: saveResult.error });
    }
    
    res.status(201).json(insuranceData);
  } catch (error) {
    console.error('Error saving insurance:', error);
    res.status(500).json({ error: 'Failed to save insurance' });
  }
});

/**
 * POST /api/user/insurance/upload-card
 * Upload insurance card images
 */
router.post('/insurance/upload-card', upload.single('file'), async (req, res) => {
  try {
    const userId = req.user.uid;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const filename = `${Date.now()}-${req.file.originalname}`;
    const url = await uploadToStorage(req.file, userId, filename);
    
    res.json({ url });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

/**
 * DELETE /api/user/insurance
 * Delete insurance information
 */
router.delete('/insurance', async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // For now, we'll just return success since WellnessService doesn't have delete
    // In production, you'd implement actual deletion
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting insurance:', error);
    res.status(500).json({ error: 'Failed to delete insurance' });
  }
});

// ============================================
// PACKING CHECKLIST ROUTES
// ============================================

/**
 * GET /api/user/packing-checklist
 * Fetch user packing checklist (auto-generated + custom items)
 */
router.get('/packing-checklist', async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const result = await WellnessService.getWellnessData(userId, 'packing');
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }
    
    res.json(result.data);
  } catch (error) {
    console.error('Error fetching packing checklist:', error);
    res.status(500).json({ error: 'Failed to fetch packing checklist' });
  }
});

/**
 * POST /api/user/packing-checklist/custom
 * Add custom packing item
 */
router.post('/packing-checklist/custom', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { item_name } = req.body;
    
    if (!item_name) {
      return res.status(400).json({ error: 'Item name is required' });
    }
    
    // Get existing packing items
    const existingResult = await WellnessService.getWellnessData(userId, 'packing');
    const items = existingResult.success ? existingResult.data : [];
    
    const newItem = {
      id: Date.now().toString(),
      item_name,
      is_auto_generated: false,
      is_packed: false,
      created_at: new Date().toISOString()
    };
    
    items.push(newItem);
    
    // Save updated packing items
    const saveResult = await WellnessService.saveWellnessData(userId, 'packing', items);
    if (!saveResult.success) {
      return res.status(500).json({ error: saveResult.error });
    }
    
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error adding custom item:', error);
    res.status(500).json({ error: 'Failed to add custom item' });
  }
});

/**
 * PATCH /api/user/packing-checklist/:id
 * Mark item as packed/unpacked
 */
router.patch('/packing-checklist/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const itemId = req.params.id;
    const { is_packed } = req.body;
    
    // Get existing packing items
    const existingResult = await WellnessService.getWellnessData(userId, 'packing');
    if (!existingResult.success) {
      return res.status(404).json({ error: 'Packing list not found' });
    }
    
    const items = existingResult.data || [];
    const itemIndex = items.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    items[itemIndex].is_packed = is_packed;
    items[itemIndex].updated_at = new Date().toISOString();
    
    // Save updated packing items
    const saveResult = await WellnessService.saveWellnessData(userId, 'packing', items);
    if (!saveResult.success) {
      return res.status(500).json({ error: saveResult.error });
    }
    
    res.json(items[itemIndex]);
  } catch (error) {
    console.error('Error updating packing item:', error);
    res.status(500).json({ error: 'Failed to update packing item' });
  }
});

/**
 * DELETE /api/user/packing-checklist/:id
 * Delete custom packing item
 */
router.delete('/packing-checklist/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const itemId = req.params.id;
    
    // Get existing packing items
    const existingResult = await WellnessService.getWellnessData(userId, 'packing');
    if (!existingResult.success) {
      return res.status(404).json({ error: 'Packing list not found' });
    }
    
    const items = existingResult.data || [];
    const filteredItems = items.filter(item => item.id !== itemId);
    
    // Save updated packing items
    const saveResult = await WellnessService.saveWellnessData(userId, 'packing', filteredItems);
    if (!saveResult.success) {
      return res.status(500).json({ error: saveResult.error });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting packing item:', error);
    res.status(500).json({ error: 'Failed to delete packing item' });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate auto-packing items based on medications, conditions, and allergies
 */
function generateAutoPackingItems(medications, conditions, allergies) {
  const autoItems = [];
  
  // Items based on medications
  medications.forEach(med => {
    autoItems.push({
      id: `med-${med.id}`,
      item_name: `60-day supply of ${med.name}`,
      is_auto_generated: true,
      is_packed: false,
      created_at: new Date().toISOString()
    });
    
    if (med.refrigeration_required) {
      autoItems.push({
        id: `refrigerate-${med.id}`,
        item_name: 'FRIO cooling wallet',
        is_auto_generated: true,
        is_packed: false,
        created_at: new Date().toISOString()
      });
      
      autoItems.push({
        id: `hotel-fridge-${med.id}`,
        item_name: 'Hotel fridge confirmation',
        is_auto_generated: true,
        is_packed: false,
        created_at: new Date().toISOString()
      });
    }
  });
  
  // Items based on conditions
  conditions.forEach(condition => {
    if (condition.name.toLowerCase().includes('diabetes')) {
      autoItems.push({
        id: `diabetes-${condition.id}`,
        item_name: 'Insulin cooling case',
        is_auto_generated: true,
        is_packed: false,
        created_at: new Date().toISOString()
      });
      
      autoItems.push({
        id: `glucose-${condition.id}`,
        item_name: 'Glucose monitoring kit',
        is_auto_generated: true,
        is_packed: false,
        created_at: new Date().toISOString()
      });
      
      autoItems.push({
        id: `extra-insulin-${condition.id}`,
        item_name: 'Extra insulin supply',
        is_auto_generated: true,
        is_packed: false,
        created_at: new Date().toISOString()
      });
    }
    
    if (condition.name.toLowerCase().includes('wheelchair')) {
      autoItems.push({
        id: `wheelchair-repair-${condition.id}`,
        item_name: 'Wheelchair repair kit',
        is_auto_generated: true,
        is_packed: false,
        created_at: new Date().toISOString()
      });
      
      autoItems.push({
        id: `accessible-transport-${condition.id}`,
        item_name: 'Accessible transport booking',
        is_auto_generated: true,
        is_packed: false,
        created_at: new Date().toISOString()
      });
    }
  });
  
  // Items based on allergies
  const severeAllergies = allergies.filter(allergy => 
    allergy.severity === 'severe' || allergy.severity === 'life-threatening'
  );
  
  if (severeAllergies.length > 0) {
    autoItems.push({
      id: 'epipen',
      item_name: 'EpiPen (2 units)',
      is_auto_generated: true,
      is_packed: false,
      created_at: new Date().toISOString()
    });
    
    autoItems.push({
      id: 'allergy-cards',
      item_name: 'Allergy translation cards',
      is_auto_generated: true,
      is_packed: false,
      created_at: new Date().toISOString()
    });
  }
  
  // General items if user has any medications
  if (medications.length > 0) {
    autoItems.push({
      id: 'doctors-letter',
      item_name: 'Doctor\'s letter for customs',
      is_auto_generated: true,
      is_packed: false,
      created_at: new Date().toISOString()
    });
  }
  
  return autoItems;
}

export default router;
