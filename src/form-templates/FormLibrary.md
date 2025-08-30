# Form Templates Library

## Overview

The Form Templates Library provides a standardized way to create, validate, and render legal forms for GST litigation workflows. Each form is defined as a JSON schema with prefill mappings, field validations, and output rules.

## Schema Structure

Each form template follows this structure:

```json
{
  "code": "FORM_CODE",           // Unique identifier
  "title": "Human-readable title",
  "stage": "Case stage name",     // Links to case lifecycle
  "version": "1.0",              // Template version
  "prefill": {                   // Auto-populate from case/client data
    "field_name": "dot.notation.path"
  },
  "fields": [                    // Form field definitions
    {
      "key": "field_name",
      "label": "Display Label",
      "type": "field_type",
      "required": boolean,
      "minLength": number,       // For text fields
      "minimum": number,         // For numeric fields
      "items": { "type": "..." } // For arrays
    }
  ],
  "output": {                    // Generation rules
    "filename": "pattern_with_variables",
    "dms_folder_by_stage": true,
    "timeline_event": "Event description"
  }
}
```

## Field Types

### Basic Types
- **string**: Single-line text input
- **textarea**: Multi-line text with optional minLength validation
- **date**: Date picker with validation
- **number**: Numeric input with min/max validation
- **boolean**: Checkbox with optional default value

### Complex Types
- **array**: Dynamic lists with item type specification
- **group**: Nested field groups for structured data

### Field Properties
- `required`: Boolean indicating if field is mandatory
- `minLength`: Minimum character count for text fields
- `minimum`/`maximum`: Range validation for numbers
- `default`: Default value for the field
- `items`: Type specification for array elements
- `fields`: Nested fields for group type

## Prefill Mappings

Prefill values use dot notation to reference case and client data:

```json
{
  "prefill": {
    "client_name": "case.client.name",
    "gstin": "case.client.gstin",
    "pan": "case.client.pan",
    "case_id": "case.id",
    "case_title": "case.title",
    "stage": "case.currentStage",
    "authorized_signatory": "case.signatory.fullName"
  }
}
```

### Available Data Paths

**Case Data:**
- `case.id` - Case identifier
- `case.title` - Case title
- `case.currentStage` - Current case stage
- `case.notice.number` - Notice number
- `case.notice.date` - Notice date
- `case.demand.amount` - Demand amount (if applicable)
- `case.demand.section` - Applicable section

**Client Data:**
- `case.client.name` - Client name
- `case.client.gstin` - GST identification number
- `case.client.pan` - PAN number
- `case.client.address` - Client address
- `case.signatory.fullName` - Authorized signatory name

## Available Forms

### Scrutiny Stage
- **ASMT10_REPLY**: Reply to ASMT-10 notices
- **ASMT11_REPRESENTATION**: Representation against orders

### Adjudication Stage
- **ASMT12_REPLY**: Reply to ASMT-12 with hearing options

### Demand Stage
- **DRC01_REPLY**: Reply to demand notices
- **DRC07_OBJECTION**: Objection to recovery proceedings

### Appeals Stage
- **APPEAL_FIRST**: First appeal applications

### Tribunal Stage
- **GSTAT**: General Tribunal applications

### High Court Stage
- **HC_PETITION**: High Court petition filing

### Supreme Court Stage
- **SC_SLP**: Special Leave Petition

## Service Integration

### Loading Templates

```typescript
import { formTemplatesService } from '../services/formTemplatesService';

// Load a specific template
const template = await formTemplatesService.loadFormTemplate('GSTAT');

// Get forms available for a stage
const forms = formTemplatesService.getFormsByStage('Tribunal');

// Get all templates
const allTemplates = await formTemplatesService.getAllTemplates();
```

### Validation

```typescript
// Validate form data against template
const errors = formTemplatesService.validateFormData(template, formData);

if (errors.length > 0) {
  // Handle validation errors
  errors.forEach(error => {
    console.log(`${error.field}: ${error.message}`);
  });
}
```

### Prefill Data

```typescript
// Apply prefill mappings
const prefillData = formTemplatesService.applyPrefillMappings(
  template, 
  caseData, 
  clientData
);
```

### PDF Generation

```typescript
import { renderFormPDF } from '../services/reportsService';

// Render form to PDF
const result = await renderFormPDF('GSTAT', caseId, formData);

// result.blob contains the PDF content
// result.suggestedFilename contains the generated filename
```

## PDF Generation

The `renderFormPDF` function processes form templates and user data to generate PDF documents:

```typescript
const { blob, suggestedFilename } = await renderFormPDF(
  'GSTAT',           // Form code
  'case-123',        // Case ID
  {                  // User form data
    jurisdiction: 'Mumbai',
    order_no: 'ORDER/2024/001',
    grounds: 'Detailed grounds...',
    // ... other fields
  }
);

// Upload to DMS or trigger download
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = suggestedFilename;
link.click();
```

## Output Configuration

The output section defines how generated documents are named and organized:

```json
{
  "output": {
    "filename": "GSTAT_${case.id}_${now:YYYYMMDD}.pdf",
    "dms_folder_by_stage": true,
    "timeline_event": "GSTAT submitted"
  }
}
```

### Filename Variables
- `${case.id}`: Replaced with actual case ID
- `${now:YYYYMMDD}`: Current date in YYYYMMDD format

### DMS Integration
- `dms_folder_by_stage`: Organizes files by case stage
- `timeline_event`: Adds entry to case timeline

## Error Handling

The library provides comprehensive error handling:

- **Template Loading**: Handles missing or invalid templates
- **Validation**: Field-level and form-level validation
- **PDF Generation**: Handles rendering failures
- **Data Resolution**: Graceful handling of missing prefill data

All errors are logged to console and displayed via toast notifications.

## Extending the Library

To add new form templates:

1. Create a new JSON file in `/src/form-templates/`
2. Follow the standard schema structure
3. Add the form code to `formTemplatesService.getAllTemplates()`
4. Update the stage mapping in `getFormsByStage()`

## Best Practices

- Use descriptive field labels and keys
- Set appropriate validation rules for data integrity
- Include required fields for legal compliance
- Use prefill mappings to reduce user input
- Test templates with various data scenarios
- Document any custom field types or validations
