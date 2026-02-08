

# Fix Notice OCR - PDF Parsing Failure

## Problem Summary

Your OpenAI API key is working correctly. The issue is that **PDF.js fails to parse the uploaded PDF file** before any AI call is made. The file shows "0.00 MB" in the wizard, indicating a corrupted file upload.

---

## Root Cause

| Layer | Status | Evidence |
|-------|--------|----------|
| File Upload | ❌ Broken | File shows 0.00 MB |
| PDF.js Parsing | ❌ Fails | Error at `extractTextFromPDF` |
| OpenAI Vision API | ⬜ Never Called | No network request logged |
| Lovable AI | ⬜ Never Called | Also uses failed PDF parser |

The extraction flow tries to convert PDF → Images BEFORE calling OpenAI, and that conversion is failing.

---

## Fix Plan (3 Parts)

### Part 1: Add File Validation Before Processing

Before attempting extraction, validate the file is properly loaded.

**File:** `src/components/notices/NoticeIntakeWizardV2.tsx`

```typescript
// Add file validation in handleFileUpload
const handleFileUpload = useCallback((file: File) => {
  // Validate file is properly loaded
  if (!file || file.size === 0) {
    toast({
      title: "Invalid file",
      description: "The PDF file appears to be empty or corrupted. Please try uploading again.",
      variant: "destructive",
    });
    return;
  }
  
  // Rest of existing logic...
```

---

### Part 2: Improve PDF.js Error Handling

Add detailed error logging to understand exactly why PDF.js fails.

**File:** `src/services/noticeExtractionService.ts`

Update `extractTextFromPDF` method:

```typescript
private async extractTextFromPDF(file: File): Promise<string> {
  try {
    // Log file details for debugging
    console.log('📄 [PDF.js] Processing file:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });
    
    // Validate file before processing
    if (file.size === 0) {
      throw new Error('PDF file is empty (0 bytes)');
    }
    
    const arrayBuffer = await file.arrayBuffer();
    
    console.log('📄 [PDF.js] ArrayBuffer size:', arrayBuffer.byteLength);
    
    if (arrayBuffer.byteLength === 0) {
      throw new Error('Failed to read PDF file content');
    }
    
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    // ... rest of existing logic
```

Update `pdfToBase64Images` method similarly with validation.

---

### Part 3: Show Actionable Error Messages

Provide specific guidance based on the failure type.

**File:** `src/components/notices/NoticeIntakeWizardV2.tsx`

Update error handling in `handleExtractData`:

```typescript
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  
  let title = 'Extraction failed';
  let description = errorMessage;
  
  if (errorMessage.includes('empty') || errorMessage.includes('0 bytes')) {
    title = 'File upload issue';
    description = 'The PDF file is empty. Please close and re-upload the file.';
  } else if (errorMessage.includes('Failed to extract text')) {
    title = 'PDF parsing failed';
    description = 'Could not read the PDF. It may be password-protected or corrupted. Try a different file.';
  } else if (errorMessage.includes('INVALID_API_KEY')) {
    title = 'Invalid API Key';
    description = 'Your OpenAI API key is invalid or expired. Please update it in the configuration panel.';
  }
  
  toast({ title, description, variant: "destructive" });
}
```

---

## Immediate Workaround

To test if your OpenAI API key works:

1. **Try a different PDF file** - The current "Stage1_Scrutiny_ASMT-10_Sample1.pdf" may be corrupted
2. **Refresh the page** - This clears any cached file state
3. **Re-upload the PDF** - Ensure the file fully loads before clicking extract

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/notices/NoticeIntakeWizardV2.tsx` | Add file size validation, improve error messages |
| `src/services/noticeExtractionService.ts` | Add detailed logging, validate file before parsing |
| `src/components/notices/NoticeIntakeWizard.tsx` | Same fixes for V1 wizard |

---

## Expected Outcome

After implementation:
- **Empty files** (0 bytes) are rejected immediately with clear message
- **PDF parsing errors** show specific guidance (password-protected, corrupted, etc.)
- **API key errors** are clearly distinguished from file errors
- **Debugging logs** help identify future issues

