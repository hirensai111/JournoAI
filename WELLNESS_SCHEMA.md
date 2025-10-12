# Wellness Check-In Database Schema

## Overview
The wellness feature uses Firebase Firestore with the following structure:

```
users/{userId}/wellness/{collection}/{document}
```

## Collections

### 1. Medications Collection
**Path:** `users/{userId}/wellness/medications`

**Document Structure:**
```json
{
  "items": [
    {
      "id": "string",
      "name": "string",
      "dosage": "string",
      "frequency": "string",
      "time": "string",
      "refrigeration_required": "boolean",
      "notes": "string",
      "created_at": "string (ISO date)",
      "updated_at": "string (ISO date)"
    }
  ]
}
```

**Field Descriptions:**
- `id`: Unique identifier (timestamp-based)
- `name`: Medication name (required)
- `dosage`: Dosage information (e.g., "10 units", "500mg")
- `frequency`: Daily, Twice daily, Three times daily, As needed (required)
- `time`: Morning, Afternoon, Evening, Before meals, After meals
- `refrigeration_required`: Boolean flag for refrigeration needs
- `notes`: Special instructions or notes

### 2. Medical Conditions Collection
**Path:** `users/{userId}/wellness/conditions`

**Document Structure:**
```json
{
  "items": [
    {
      "id": "string",
      "name": "string",
      "severity": "string",
      "doctor_notes": "string",
      "diagnosed_date": "string (ISO date)",
      "created_at": "string (ISO date)",
      "updated_at": "string (ISO date)"
    }
  ]
}
```

**Field Descriptions:**
- `id`: Unique identifier (timestamp-based)
- `name`: Condition name (required, e.g., "Type 1 Diabetes")
- `severity`: Mild, Moderate, Severe (required)
- `doctor_notes`: Doctor's instructions and notes
- `diagnosed_date`: Date when condition was diagnosed

### 3. Allergies Collection
**Path:** `users/{userId}/wellness/allergies`

**Document Structure:**
```json
{
  "items": [
    {
      "id": "string",
      "allergen_name": "string",
      "category": "string",
      "severity": "string",
      "symptoms": "string",
      "epipen_required": "boolean",
      "created_at": "string (ISO date)",
      "updated_at": "string (ISO date)"
    }
  ]
}
```

**Field Descriptions:**
- `id`: Unique identifier (timestamp-based)
- `allergen_name`: Name of allergen (required, e.g., "Shellfish")
- `category`: Food, Medication, Environmental, Other (required)
- `severity`: Mild, Moderate, Severe, Life-threatening (required)
- `symptoms`: Description of reaction symptoms
- `epipen_required`: Boolean flag for EpiPen requirement

### 4. Insurance Collection
**Path:** `users/{userId}/wellness/insurance`

**Document Structure:**
```json
{
  "company_name": "string",
  "policy_number": "string",
  "group_number": "string",
  "emergency_phone": "string",
  "card_front_url": "string",
  "card_back_url": "string",
  "international_coverage": "boolean",
  "travel_policy": "string",
  "created_at": "string (ISO date)",
  "updated_at": "string (ISO date)"
}
```

**Field Descriptions:**
- `company_name`: Insurance company name (required)
- `policy_number`: Policy number (required)
- `group_number`: Group number (optional)
- `emergency_phone`: Emergency contact phone (required)
- `card_front_url`: URL to front of insurance card image
- `card_back_url`: URL to back of insurance card image
- `international_coverage`: Boolean flag for international coverage
- `travel_policy`: Additional travel insurance details

### 5. Packing Checklist Collection
**Path:** `users/{userId}/wellness/packing`

**Document Structure:**
```json
{
  "items": [
    {
      "id": "string",
      "item_name": "string",
      "is_auto_generated": "boolean",
      "is_packed": "boolean",
      "created_at": "string (ISO date)",
      "updated_at": "string (ISO date)"
    }
  ]
}
```

**Field Descriptions:**
- `id`: Unique identifier (timestamp-based)
- `item_name`: Name of packing item
- `is_auto_generated`: Boolean flag indicating if item was auto-generated
- `is_packed`: Boolean flag indicating if item is packed

## Auto-Generated Packing Items Logic

The system automatically generates packing items based on user's health data:

### Based on Medications:
- "60-day supply of [medication name]" for each medication
- "FRIO cooling wallet" if any medication requires refrigeration
- "Hotel fridge confirmation" if any medication requires refrigeration
- "Doctor's letter for customs" if user has any medications

### Based on Medical Conditions:
- **Diabetes**: "Insulin cooling case", "Glucose monitoring kit", "Extra insulin supply"
- **Wheelchair**: "Wheelchair repair kit", "Accessible transport booking"

### Based on Allergies:
- **Severe/Life-threatening allergies**: "EpiPen (2 units)", "Allergy translation cards"

## API Endpoints

### Medications
- `GET /api/user/medications` - Fetch all medications
- `POST /api/user/medications` - Create new medication
- `PATCH /api/user/medications/:id` - Update medication
- `DELETE /api/user/medications/:id` - Delete medication

### Medical Conditions
- `GET /api/user/conditions` - Fetch all conditions
- `POST /api/user/conditions` - Create new condition
- `PATCH /api/user/conditions/:id` - Update condition
- `DELETE /api/user/conditions/:id` - Delete condition

### Allergies
- `GET /api/user/allergies` - Fetch all allergies
- `POST /api/user/allergies` - Create new allergy
- `PATCH /api/user/allergies/:id` - Update allergy
- `DELETE /api/user/allergies/:id` - Delete allergy

### Insurance
- `GET /api/user/insurance` - Fetch insurance information
- `POST /api/user/insurance` - Create/update insurance
- `POST /api/user/insurance/upload-card` - Upload card images
- `DELETE /api/user/insurance` - Delete insurance

### Packing Checklist
- `GET /api/user/packing-checklist` - Fetch packing list (auto + custom)
- `POST /api/user/packing-checklist/custom` - Add custom item
- `PATCH /api/user/packing-checklist/:id` - Mark packed/unpacked
- `DELETE /api/user/packing-checklist/:id` - Delete custom item

## Security Notes

- All endpoints require authentication via Bearer token
- User data is isolated by user ID
- File uploads are limited to 5MB and image files only
- Input validation is performed on both client and server
- No hardcoded data - all content is user-generated

## Future Enhancements

- Multi-language dietary cards
- Emergency contact PDF generation
- Integration with travel booking systems
- Medication reminder notifications
- Health data export functionality
