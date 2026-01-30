

# Fix: OCR Fallback and Improved Regex Extraction for DRC-01A Notices

## Problem Summary

### Comparison: Actual Notice vs. Extracted Values

| Field | Actual Value (DRC-01A Notice) | Extracted Value | Issue |
|-------|------------------------------|-----------------|-------|
| Notice Type | FORM GST DRC-01A | ASMT-10 | Wrong type detected |
| GSTIN | 03AAGCB9221K1ZR | 03AUMPS7699K2ZL | WRONG GSTIN (from cache?) |
| Reference No | ZD030925014502R | Not found | Regex not matching "Reference No." |
| Date | 11/09/2025 | Not found | Format DD/MM/YYYY not captured |
| Tax Period | F.Y. 2021-2022 | '" is zero. Further' | Garbage text |
| Amount | ₹93,90,812.00 (IGST) | Not found | Indian format not parsed |
| Taxpayer Name | BENCHMARK MOTORS PRIVATE LIMITED | New Client | Not extracted |

### Root Causes

1. **OpenAI API returns 429 (quota exceeded)** - Falls back to regex
2. **No Lovable AI fallback** - Should use built-in AI when OpenAI fails  
3. **Regex patterns too narrow** for DRC-01A format
4. **Possible caching/state issue** - Wrong GSTIN from previous extraction

---

## Solution

### Part A: Add Lovable AI as Fallback for Vision OCR

**File**: `src/services/noticeExtractionService.ts`

When OpenAI fails (401/429), use Lovable AI via Supabase Edge Function:

```typescript
// After OpenAI failure, before regex fallback:
try {
  // Try Lovable AI as secondary fallback
  const lovableResult = await this.extractWithLovableAI(file);
  if (lovableResult) {
    return lovableResult;
  }
} catch (lovableError) {
  console.log('Lovable AI fallback also failed, using regex:', lovableError);
}
```

Create new edge function for AI extraction using google/gemini-2.5-flash.

### Part B: Improve Regex Patterns for DRC-01A Format

**File**: `src/services/noticeExtractionService.ts`

Update regex patterns:

```typescript
private regexPatterns = {
  // DIN format
  din: /DIN[\s:]*([A-Z0-9]{15,20})/i,
  
  // Notice Number - multiple formats for different notice types
  noticeNo: /(?:Reference\s*No\.?|Notice\s*(?:No\.?|Number)|Ref\.?\s*No\.?|Case\s*ID)[\s.:]*([A-Z0-9\/\-]+)/i,
  
  // GSTIN - more flexible pattern
  gstin: /GSTIN[\s:]*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z])/i,
  
  // Period - support F.Y. format
  period: /(?:F\.?Y\.?\s*(?:From\s*:?)?|Tax\s*Period|Period)[\s:]*(\d{4}[-\s]*(?:to\s*)?[-\s]*\d{2,4}|\d{4}[-\/]\d{2,4})/i,
  
  // Date - support DD/MM/YYYY and DD.MM.YYYY
  issueDate: /(?:Date[\s:]*|Dated[\s:]*|Issue\s*Date[\s:]*)(\d{2}[\/\.\-]\d{2}[\/\.\-]\d{4})/i,
  
  // Due date
  dueDate: /(?:Due\s*Date|Last\s*Date|Response\s*Due|Reply\s*by|Comply\s*by)[\s:]*(\d{2}[\/\.\-]\d{2}[\/\.\-]\d{4})/i,
  
  // Office - more patterns
  office: /(?:CGST|SGST|GST)[\s\-,]*(?:Range|Division|Commissionerate|Commissioner|Circle)[^\n]+/i,
  
  // Amount - Indian lakh format with ₹ and Rs.
  amount: /(?:Total\s*(?:Tax|Amount|Demand)?|Tax[\s:]*Amount|Demand[\s:]*Amount|(?:IGST|CGST|SGST)[\s:]*)(?:Rs\.?|₹)?\s*([\d,]+(?:\.\d{2})?)/i,
  
  // Notice type - all GST notice types  
  noticeType: /((?:FORM\s+)?GST\s+)?(?:ASMT[-\s]?(?:10|11|12)|DRC[-\s]?(?:01A?|03|07)|GSTR[-\s]?[0-9A-Z]+)/i,
  
  // Taxpayer name - look for "Name" label
  taxpayerName: /(?:Name|M\/s\.?)[\s:]+([A-Z][A-Z\s&.,()'-]+(?:PVT\.?|PRIVATE|LTD\.?|LIMITED|ENTERPRISES?|TRADERS?|CO\.?|COMPANY)?[A-Z\s&.,()'-]*)/i
};
```

### Part C: Improve Text Extraction to Normalize Line Breaks

**File**: `src/services/noticeExtractionService.ts`

The PDF text extraction joins words incorrectly. Fix:

```typescript
private async extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 10); pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Improved text joining - add newlines between items with large Y gaps
      let lastY = 0;
      const pageText = textContent.items
        .map((item: any) => {
          const text = item.str;
          const y = item.transform[5]; // Y position
          
          // Add newline if Y position changed significantly
          const prefix = (lastY && Math.abs(y - lastY) > 10) ? '\n' : ' ';
          lastY = y;
          
          return prefix + text;
        })
        .join('');
      
      fullText += pageText + '\n';
    }
    
    // Normalize whitespace but preserve newlines
    return fullText.replace(/[ \t]+/g, ' ').trim();
  } catch (error) {
    console.error('PDF text extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}
```

### Part D: Clear State Between Extractions

**File**: `src/components/notices/NoticeIntakeWizard.tsx`

Ensure extracted data is cleared when a new file is uploaded:

```typescript
const handleFileSelect = (selectedFile: File) => {
  // Clear all previous extraction state
  setExtractedData(null);
  setMappedExtraction({});
  setValidationResult(null);
  setNoticeFilename('');
  
  // Set new file
  setNoticeFile(selectedFile);
  setNoticeFilename(selectedFile.name);
};
```

### Part E: Create Lovable AI Edge Function for OCR Fallback

**New File**: `supabase/functions/notice-ocr/index.ts`

```typescript
import "jsr:@anthropic-ai/sdk"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    
    // Use Lovable AI (google/gemini-2.5-flash) for OCR
    const response = await fetch('https://api.lovable.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Extract GST notice fields: GSTIN, Notice Number, Date, Tax Period, Amount, Taxpayer Name. Return JSON.'
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract all fields from this GST notice:' },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/noticeExtractionService.ts` | Improve regex patterns, add Lovable AI fallback, fix text extraction |
| `src/components/notices/NoticeIntakeWizard.tsx` | Clear state when new file uploaded |
| `supabase/functions/notice-ocr/index.ts` | New edge function for Lovable AI OCR fallback |

---

## Expected Behavior After Fix

| Issue | Before | After |
|-------|--------|-------|
| GSTIN | Wrong GSTIN from cache | Correct: 03AAGCB9221K1ZR |
| Notice Type | ASMT-10 | DRC-01A |
| Reference No | Not found | ZD030925014502R |
| Issue Date | Not found | 11/09/2025 |
| Tax Period | Garbage text | F.Y. 2021-2022 |
| Amount | Not found | 93,90,812.00 |
| Taxpayer Name | New Client | BENCHMARK MOTORS PRIVATE LIMITED |
| OpenAI failure | Falls to poor regex | Falls to Lovable AI, then regex |

---

## Testing Checklist

1. Upload DRC-01A notice with valid GSTIN in header
2. Verify GSTIN extracted correctly (not supplier GSTIN)
3. Verify Reference No. extracted from "Reference No.ZD..." format
4. Verify Date extracted from DD/MM/YYYY format
5. Verify Tax Period extracted from "F.Y. 2021-2022" format
6. Verify Amount extracted with Indian lakh format
7. Verify Taxpayer Name extracted from "Name BENCHMARK..." line
8. Upload new file - verify old data is cleared
9. Test with OpenAI quota exceeded - verify Lovable AI fallback works

