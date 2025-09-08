# Client GSTIN Autofill FAQ

## What is GSTIN Autofill?
The GSTIN Autofill feature automatically populates client information from the GST database when you enter a valid GSTIN number.

## How does it work?
1. Navigate to Client Master or Case Creation
2. Enter a valid 15-digit GSTIN number
3. Click the "Fetch Details" button or press Tab
4. The system will automatically fill in:
   - Business Name
   - Business Address
   - Business Type
   - Registration Date
   - Business Status

## Common Issues and Solutions

### GSTIN Not Found
- **Issue**: "GSTIN not found in database"
- **Solution**: Verify the GSTIN number is correct and active
- **Note**: Recently registered GST numbers may take 24-48 hours to appear in the database

### Network Timeout
- **Issue**: "Request timeout while fetching GST details"
- **Solution**: Check your internet connection and try again
- **Note**: The GST portal may experience high traffic during peak hours

### Invalid Format
- **Issue**: "Invalid GSTIN format"
- **Solution**: Ensure GSTIN is exactly 15 characters in the format: 99XXXXX9999X9X9

### Cancelled/Suspended GST
- **Issue**: GST details show status as "Cancelled" or "Suspended"
- **Action**: Verify with client about current GST status
- **Note**: You can still proceed with case creation but mark for review

## Best Practices
- Always verify autofilled information with client documents
- Update any incorrect details manually after autofill
- Use the "Verify Address" feature for complete address validation
- Save frequently to avoid data loss during long forms

## Manual Override
If autofill fails or provides incorrect information:
1. Disable the "Auto-fetch" toggle
2. Enter client details manually
3. Use the "Save as Template" feature for frequent clients

## Related Features
- [Address Verification](address-verification.md)
- [Client Master Management](client-master-guide.md)
- [Case Creation Workflow](case-creation-tutorial.md)

---
*Last updated: January 2024*
*For technical support, contact the system administrator*