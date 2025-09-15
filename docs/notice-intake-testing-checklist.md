# Notice Intake Wizard - QA Testing Checklist

## Pre-Testing Setup
- [ ] Feature flag `notice_intake_v1` is enabled
- [ ] User has access to Case Management module  
- [ ] Sample ASMT-10 PDF files are available
- [ ] Test GSTIN numbers are prepared (15-digit format)

## Functional Testing

### Access Points
- [ ] "From Notice" option appears in Case Management "New +" dropdown
- [ ] Wizard opens correctly when selected
- [ ] Modal/drawer interface loads properly

### Step 1: File Upload
- [ ] Drag & drop functionality works
- [ ] File selector opens on click
- [ ] Only PDF files are accepted
- [ ] File size validation (reasonable limits)
- [ ] Progress indicator shows during upload
- [ ] Error handling for invalid files

### Step 2: Data Extraction
- [ ] Extraction process starts automatically after upload
- [ ] Loading indicator shows during processing
- [ ] Extracted data appears in form fields
- [ ] Confidence score is displayed
- [ ] Manual editing of extracted fields works
- [ ] Validation errors for invalid formats

### Step 3: Client Handling
- [ ] GSTIN format validation (15 characters)
- [ ] Existing client search by GSTIN works
- [ ] New client creation when no match found
- [ ] PAN auto-derivation from GSTIN
- [ ] Client name population from extracted data
- [ ] Manual client selection option

### Step 4: Case Creation
- [ ] Case form pre-fills with extracted data
- [ ] Case title format: "ASMT-10 Notice - [DIN]"
- [ ] Description includes all notice details
- [ ] Amount field populated correctly
- [ ] Client linked to case
- [ ] Case type set to "Scrutiny"

### Step 5: Document Linking
- [ ] PDF uploads to document management
- [ ] Document associates with created case
- [ ] Document metadata includes case reference
- [ ] Duplicate handling works correctly

### Step 6: Task Generation
- [ ] 3 ASMT-10 tasks are created automatically
- [ ] Task names match expected templates
- [ ] Tasks linked to created case
- [ ] Due dates calculated from notice dates
- [ ] Task assignment follows rules

## Data Validation Testing

### Required Data Extraction
- [ ] DIN (Document ID) extracted correctly
- [ ] GSTIN (15-digit) extracted and validated
- [ ] Notice period dates (from/to) extracted
- [ ] Due date extracted and formatted
- [ ] Demand amount extracted with currency
- [ ] Office/jurisdiction information captured
- [ ] Notice type identified correctly

### Edge Cases
- [ ] Scanned/image PDFs (lower quality OCR)
- [ ] Partially filled forms
- [ ] Multiple page notices
- [ ] Non-standard formats
- [ ] Missing critical fields
- [ ] Invalid GSTIN formats

## Error Handling Testing

### File Upload Errors
- [ ] Non-PDF file rejection
- [ ] Oversized file handling
- [ ] Corrupted file handling
- [ ] Network interruption during upload

### Extraction Errors
- [ ] Unreadable PDF content
- [ ] No extractable text
- [ ] Malformed data patterns
- [ ] API service failures (if configured)

### Client/Case Creation Errors
- [ ] Duplicate GSTIN handling
- [ ] Required field validation
- [ ] Database connection issues
- [ ] Permission/access errors

## Performance Testing
- [ ] Small PDF files (<1MB) process quickly
- [ ] Medium PDF files (1-5MB) process within 30 seconds
- [ ] Large PDF files (5-10MB) process within 60 seconds
- [ ] Multiple concurrent extractions don't block UI
- [ ] Memory usage remains reasonable

## User Experience Testing
- [ ] Clear progress indicators at each step
- [ ] Helpful error messages with guidance
- [ ] Ability to go back and correct data
- [ ] Confirmation of successful completion
- [ ] Proper navigation after completion

## Integration Testing
- [ ] Created cases appear in Case Management
- [ ] Linked documents accessible from case view
- [ ] Generated tasks appear in Task Management
- [ ] Client records searchable and complete
- [ ] Timeline events logged correctly

## Regression Testing
- [ ] Existing case creation still works
- [ ] Document upload from other modules unaffected
- [ ] Client management functionality intact
- [ ] Task creation from other sources working

## Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (responsive design)

## Sign-off Criteria
- [ ] All critical path tests pass
- [ ] No blocking bugs identified
- [ ] Performance meets acceptable standards
- [ ] Error handling is user-friendly
- [ ] Documentation is complete and accurate

## Known Limitations (Document)
- [ ] AI/OCR requires API key configuration
- [ ] Regex fallback has limited accuracy for poor quality scans
- [ ] Currently optimized for ASMT-10 format only
- [ ] File size limits based on server configuration