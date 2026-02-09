/**
 * Notice OCR PDF Edge Function
 * 
 * Accepts raw PDF bytes (base64) and sends directly to Gemini 2.5 Flash
 * for OCR extraction. This bypasses browser-side canvas rendering which
 * fails for scanned PDFs.
 * 
 * Key difference from notice-ocr:
 * - notice-ocr: Accepts images (base64 PNGs from browser canvas)
 * - notice-ocr-pdf: Accepts raw PDF base64 (no browser rendering needed)
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Robust JSON extraction that handles truncated responses and unescaped chars
 */
function extractJsonFromText(text: string): Record<string, any> | null {
  // Try direct parse first
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
  } catch {
    // Continue to fallback
  }

  // Find the fields object and extract what we can
  const fieldsMatch = text.match(/"fields"\s*:\s*\{/);
  if (!fieldsMatch) return null;

  const startIdx = text.indexOf('{');
  if (startIdx === -1) return null;

  // Find balanced braces for fields object
  let braceCount = 0;
  let fieldsEnd = -1;
  const fieldsStart = text.indexOf('"fields"');
  
  for (let i = fieldsStart; i < text.length; i++) {
    if (text[i] === '{') braceCount++;
    if (text[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        fieldsEnd = i + 1;
        break;
      }
    }
  }

  if (fieldsEnd === -1) {
    // Truncated - try to extract individual fields
    return extractFieldsManually(text);
  }

  // Try to parse just the fields portion
  try {
    const fieldsJson = text.slice(text.indexOf('{', fieldsStart), fieldsEnd);
    const fields = JSON.parse(fieldsJson);
    return { fields, rawText: '' };
  } catch {
    return extractFieldsManually(text);
  }
}

/**
 * Manual field extraction when JSON is malformed
 */
function extractFieldsManually(text: string): Record<string, any> | null {
  const fields: Record<string, { value: string; confidence: number }> = {};
  
  const fieldPatterns = [
    { key: 'documentType', pattern: /"documentType"\s*:\s*\{\s*"value"\s*:\s*"([^"]*)"/ },
    { key: 'documentTypeLabel', pattern: /"documentTypeLabel"\s*:\s*\{\s*"value"\s*:\s*"([^"]*)"/ },
    { key: 'din', pattern: /"din"\s*:\s*\{\s*"value"\s*:\s*"([^"]*)"/ },
    { key: 'noticeNo', pattern: /"noticeNo"\s*:\s*\{\s*"value"\s*:\s*"([^"]*)"/ },
    { key: 'gstin', pattern: /"gstin"\s*:\s*\{\s*"value"\s*:\s*"([^"]*)"/ },
    { key: 'noticeType', pattern: /"noticeType"\s*:\s*\{\s*"value"\s*:\s*"([^"]*)"/ },
    { key: 'issueDate', pattern: /"issueDate"\s*:\s*\{\s*"value"\s*:\s*"([^"]*)"/ },
    { key: 'dueDate', pattern: /"dueDate"\s*:\s*\{\s*"value"\s*:\s*"([^"]*)"/ },
    { key: 'period', pattern: /"period"\s*:\s*\{\s*"value"\s*:\s*"([^"]*)"/ },
    { key: 'taxpayerName', pattern: /"taxpayerName"\s*:\s*\{\s*"value"\s*:\s*"([^"]*)"/ },
    { key: 'tradeName', pattern: /"tradeName"\s*:\s*\{\s*"value"\s*:\s*"([^"]*)"/ },
    { key: 'subject', pattern: /"subject"\s*:\s*\{\s*"value"\s*:\s*"([^"]*)"/ },
    { key: 'legalSection', pattern: /"legalSection"\s*:\s*\{\s*"value"\s*:\s*"([^"]*)"/ },
    { key: 'office', pattern: /"office"\s*:\s*\{\s*"value"\s*:\s*"([^"]*)"/ },
    { key: 'amount', pattern: /"amount"\s*:\s*\{\s*"value"\s*:\s*"([^"]*)"/ },
  ];

  let foundAny = false;
  for (const { key, pattern } of fieldPatterns) {
    const match = text.match(pattern);
    if (match) {
      fields[key] = { value: match[1], confidence: 70 }; // Lower confidence for manual extraction
      foundAny = true;
    }
  }

  if (!foundAny) return null;

  console.log('[notice-ocr-pdf] Used manual field extraction, found:', Object.keys(fields));
  return { fields, rawText: '' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, filename } = await req.json();
    
    if (!pdfBase64 || typeof pdfBase64 !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'No PDF data provided. Expected pdfBase64 string.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate base64 is not empty
    if (pdfBase64.length < 100) {
      return new Response(
        JSON.stringify({ success: false, error: 'PDF data too small. File may be empty or corrupted.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    console.log(`[notice-ocr-pdf] Processing PDF: ${filename || 'unnamed'}, base64 length: ${pdfBase64.length}`);

    // ------------------------------------------------------------
    // Path A (preferred when available): OpenAI Responses API
    // Uses input_file with a PDF (no canvas, no image-only endpoints)
    // Requires OPENAI_API_KEY to be configured as a backend secret.
    // ------------------------------------------------------------
    if (OPENAI_API_KEY) {
      console.log('[notice-ocr-pdf] Using OpenAI Responses API (direct PDF input)');

      const oaiResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: `You are an expert at extracting structured data from Indian GST notices. Extract all fields with confidence scores.

REQUIRED FIELDS:
- DIN (Document Identification Number): 15-20 character alphanumeric
- Notice Number/Reference: The reference number
- GSTIN: 15 character format (taxpayer's GSTIN from header, NOT supplier GSTINs)
- Notice Type: FORM GST DRC-01A, ASMT-10, DRC-01, etc.
- Issue Date: DD/MM/YYYY format
- Due Date: Response deadline DD/MM/YYYY format
- Tax Period: e.g., "F.Y. 2021-2022"
- Taxpayer Name: Legal name from notice header
- Trade Name: Business trade name if different
- Subject: The full subject line
- Legal Section: GST Act section (e.g., "Section 73(1)")
- Office: Issuing GST office/authority
- Amount: Total demand amount (numeric only, no commas)

AMOUNT EXTRACTION: Handle lakh format "93,90,812" = 9390812

CRITICAL: Return ONLY valid JSON. Keep rawText to first 500 chars max.

{
  "fields": {
    "documentType": { "value": "main_notice", "confidence": 90 },
    "documentTypeLabel": { "value": "DRC-01", "confidence": 85 },
    "din": { "value": "", "confidence": 50 },
    "noticeNo": { "value": "", "confidence": 90 },
    "gstin": { "value": "", "confidence": 95 },
    "noticeType": { "value": "", "confidence": 95 },
    "issueDate": { "value": "", "confidence": 85 },
    "dueDate": { "value": "", "confidence": 90 },
    "period": { "value": "", "confidence": 85 },
    "taxpayerName": { "value": "", "confidence": 90 },
    "tradeName": { "value": "", "confidence": 85 },
    "subject": { "value": "", "confidence": 85 },
    "legalSection": { "value": "", "confidence": 80 },
    "office": { "value": "", "confidence": 80 },
    "amount": { "value": "", "confidence": 85 }
  },
  "rawText": "first 500 chars of text..."
}`,
                },
                {
                  type: 'input_file',
                  filename: filename || 'notice.pdf',
                  file_data: `data:application/pdf;base64,${pdfBase64}`,
                },
              ],
            },
          ],
          max_output_tokens: 2000,
          temperature: 0.1,
        }),
      });

      if (!oaiResponse.ok) {
        const t = await oaiResponse.text();
        console.error('[notice-ocr-pdf] OpenAI error:', oaiResponse.status, t);

        if (oaiResponse.status === 401) {
          return new Response(
            JSON.stringify({ success: false, error: 'AI service authentication failed.', errorCode: 'AUTH_FAILED' }),
            { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        if (oaiResponse.status === 429) {
          return new Response(
            JSON.stringify({ success: false, error: 'Rate limit exceeded, please try again later.', errorCode: 'RATE_LIMIT' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        if (oaiResponse.status === 402) {
          return new Response(
            JSON.stringify({ success: false, error: 'Payment required, please add credits to your workspace.', errorCode: 'PAYMENT_REQUIRED' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        return new Response(
          JSON.stringify({ success: false, error: `AI service error: ${oaiResponse.status}`, errorCode: 'AI_ERROR' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const oaiData = await oaiResponse.json();

      const oaiText = (() => {
        if (typeof oaiData?.output_text === 'string' && oaiData.output_text) return oaiData.output_text;

        const parts: string[] = [];
        for (const item of oaiData?.output || []) {
          const contentArr = item?.content || [];
          for (const c of contentArr) {
            if (typeof c?.text === 'string') parts.push(c.text);
            if (typeof c?.output_text === 'string') parts.push(c.output_text);
          }
        }
        return parts.join('\n');
      })();

      // Robust JSON extraction - find balanced braces
      const parsed = extractJsonFromText(oaiText);
      if (!parsed) {
        console.error('[notice-ocr-pdf] OpenAI returned non-JSON output');
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to parse extraction result', rawText: oaiText.slice(0, 500) }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      console.log('[notice-ocr-pdf] OpenAI extraction successful:', Object.keys(parsed.fields || {}));
      return new Response(
        JSON.stringify({ success: true, ...parsed }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ------------------------------------------------------------
    // Path B: Lovable AI Gateway (Gemini)
    // ------------------------------------------------------------
    if (!LOVABLE_API_KEY) {
      console.error('[notice-ocr-pdf] LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!LOVABLE_API_KEY.startsWith('sk_')) {
      console.error('[notice-ocr-pdf] LOVABLE_API_KEY has invalid format - needs re-provisioning');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'AI service configuration issue. Please contact support.',
          errorCode: 'API_KEY_INVALID',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Send PDF directly to Gemini 2.5 Flash using data URI
    // Gemini natively supports PDF input - it handles rasterization, DPI, page sizing internally
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting structured data from Indian GST notices. Extract all fields with confidence scores.

REQUIRED FIELDS:
- DIN (Document Identification Number): 15-20 character alphanumeric
- Notice Number/Reference: The reference number
- GSTIN: 15 character format (taxpayer's GSTIN from header, NOT supplier GSTINs)
- Notice Type: FORM GST DRC-01A, ASMT-10, DRC-01, etc.
- Issue Date: DD/MM/YYYY format
- Due Date: Response deadline DD/MM/YYYY format
- Tax Period: e.g., "F.Y. 2021-2022"
- Taxpayer Name: Legal name from notice header
- Trade Name: Business trade name if different
- Subject: The full subject line
- Legal Section: GST Act section (e.g., "Section 73(1)")
- Office: Issuing GST office/authority
- Amount: Total demand amount (numeric only, no commas)

AMOUNT EXTRACTION: Handle lakh format "93,90,812" = 9390812

CRITICAL: Return ONLY valid JSON. Keep rawText to first 500 chars max.

{
  "fields": {
    "documentType": { "value": "main_notice", "confidence": 90 },
    "documentTypeLabel": { "value": "DRC-01", "confidence": 85 },
    "din": { "value": "", "confidence": 50 },
    "noticeNo": { "value": "", "confidence": 90 },
    "gstin": { "value": "", "confidence": 95 },
    "noticeType": { "value": "", "confidence": 95 },
    "issueDate": { "value": "", "confidence": 85 },
    "dueDate": { "value": "", "confidence": 90 },
    "period": { "value": "", "confidence": 85 },
    "taxpayerName": { "value": "", "confidence": 90 },
    "tradeName": { "value": "", "confidence": 85 },
    "subject": { "value": "", "confidence": 85 },
    "legalSection": { "value": "", "confidence": 80 },
    "office": { "value": "", "confidence": 80 },
    "amount": { "value": "", "confidence": 85 }
  },
  "rawText": "first 500 chars..."
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all information from this GST notice PDF. Return ONLY valid JSON:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[notice-ocr-pdf] Lovable AI error:', response.status, errorText);
      
      // Check for API key format error
      if (response.status === 401 && errorText.toLowerCase().includes('invalid')) {
        console.error('[notice-ocr-pdf] LOVABLE_API_KEY has invalid format - needs re-provisioning');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'AI service configuration issue. Please contact support.',
            errorCode: 'API_KEY_INVALID'
          }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'AI service authentication failed.',
            errorCode: 'AUTH_FAILED'
          }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded, please try again later.', errorCode: 'RATE_LIMIT' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Payment required, please add credits to your workspace.', errorCode: 'PAYMENT_REQUIRED' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: `AI service error: ${response.status}`, errorCode: 'AI_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('[notice-ocr-pdf] No content in response');
      return new Response(
        JSON.stringify({ success: false, error: 'No extraction result from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Robust JSON extraction - handles truncated responses
    const parsed = extractJsonFromText(content);
    if (!parsed) {
      console.error('[notice-ocr-pdf] Failed to parse JSON from response');
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse extraction result', rawText: content.slice(0, 500) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[notice-ocr-pdf] Extraction successful:', Object.keys(parsed.fields || {}));
    return new Response(
      JSON.stringify({ success: true, ...parsed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[notice-ocr-pdf] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
