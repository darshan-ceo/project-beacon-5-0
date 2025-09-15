# Notice Intake Wizard - Complete Testing Guide

## Overview
The Notice Intake Wizard automates the process of creating cases from PDF notices (specifically ASMT-10 forms) using AI/OCR extraction with regex fallback.

## How to Access

### Method 1: From Case Management
1. Navigate to **Case Management**
2. Click the **"New +" dropdown** button
3. Select **"From Notice"** option
4. The Notice Intake Wizard will open

### Method 2: From Document Management (if enabled)
1. Navigate to **Document Management**
2. Find a PDF document row
3. Click the **row action menu**
4. Select **"Create Case from Notice"**

## Step-by-Step Testing Guide

### Step 1: Upload PDF Notice
- **What to do**: Drag and drop or select a PDF file (preferably ASMT-10 notice)
- **Expected**: File upload with progress indicator
- **Validation**: Only PDF files are accepted
- **Next**: Automatic extraction process begins

### Step 2: Extract Notice Details
- **What happens**: AI/OCR extraction attempts first, falls back to regex patterns
- **Expected data extracted**:
  - DIN (Document Identification Number)
  - GSTIN (15-digit tax ID)
  - Notice period (from/to dates)
  - Due date
  - Amount/demand
  - Office/jurisdiction
  - Notice type
- **Confidence score**: Shows extraction reliability (0-100%)
- **Manual editing**: You can correct any extracted fields

### Step 3: Client Matching/Creation
- **Auto-matching**: System searches for existing clients by GSTIN
- **New client creation**: If no match found, creates new client
- **Data populated**:
  - Client name (from extracted data)
  - GSTIN
  - PAN (auto-derived from GSTIN)
- **Manual selection**: Option to select different existing client

### Step 4: Case Creation
- **Pre-filled data**:
  - Case title: "ASMT-10 Notice - [DIN]"
  - Description: Includes all extracted notice details
  - Amount: From extracted demand amount
  - Client: Linked to matched/created client
- **Case type**: Automatically set to "Scrutiny"
- **Stage**: Set to initial stage

### Step 5: Document Association
- **PDF linking**: Original notice PDF gets linked to the created case
- **Document tagging**: Tagged with case ID and notice type
- **Duplicate handling**: If document already exists, creates reference

### Step 6: Task Generation
- **Automated tasks**: Creates 3 ASMT-10 specific tasks:
  1. "Review ASMT-10 Notice"
  2. "Prepare Response Documentation" 
  3. "File Reply within Due Date"
- **Task assignment**: Based on case owner or default assignment rules
- **Due dates**: Calculated based on notice due date

## Expected Outcomes

### Successful Completion
- ✅ Client created/matched with GSTIN and PAN
- ✅ Case created with pre-filled notice details
- ✅ PDF document linked to case
- ✅ 3 automated tasks generated and assigned
- ✅ Success message with case reference

### Data Verification Checklist
1. **Client Record**: Check if client exists with correct GSTIN/PAN
2. **Case Details**: Verify title, description, amount are populated
3. **Document Link**: Confirm PDF is accessible from case documents
4. **Task Creation**: Check if 3 tasks appear in task management
5. **Case Timeline**: Verify intake event is logged

## Troubleshooting Common Issues

### Client Not Created
- **Check**: GSTIN format validation (15 digits)
- **Solution**: Ensure PAN derivation logic works (first 10 chars + PAN suffix)

### Case Missing Pre-filled Data
- **Check**: Extraction confidence score
- **Solution**: Review extracted data in Step 2, manually correct if needed

### Document Not Associated
- **Check**: File upload completion
- **Solution**: Verify PDF file is valid and upload succeeded

### Tasks Not Generated
- **Check**: Task bundle service configuration
- **Solution**: Verify ASMT-10 task templates exist in system

## API Configuration

### AI/OCR Services (Optional)
- Configure OpenAI or Google Vision API keys for better extraction
- Fallback to regex patterns if no API keys configured
- Check API key status in extraction service

### Feature Flags
- `notice_intake_v1`: Must be enabled for wizard access
- `ai_extraction`: Enables AI/OCR capabilities
- `auto_task_generation`: Enables automated task creation

## Test Data Requirements

### Sample ASMT-10 PDF
- Should contain clear text with DIN, GSTIN, amounts
- Preferably machine-readable (not scanned images)
- Include all standard ASMT-10 fields

### Expected Field Formats
- **DIN**: Alphanumeric, typically 15-20 characters
- **GSTIN**: Exactly 15 digits/characters
- **Amount**: Numeric with currency symbols
- **Dates**: DD/MM/YYYY or DD-MM-YYYY format

## Performance Notes
- Initial extraction may take 10-30 seconds for AI/OCR
- Regex fallback is instantaneous
- Large PDF files (>10MB) may take longer to process
- Client matching queries are cached for performance

## Support and Debugging
- Check browser console for detailed error messages
- Network tab shows API calls for extraction services
- QA mode provides additional debugging information
- Contact support if extraction consistently fails