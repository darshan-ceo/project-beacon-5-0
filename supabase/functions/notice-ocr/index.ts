const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { images } = await req.json();
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No images provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[notice-ocr] Processing ${images.length} page(s)`);

    // Build image content array for multimodal request
    const imageContent = images.map((img: string) => ({
      type: 'image_url' as const,
      image_url: {
        url: `data:image/png;base64,${img}`
      }
    }));

    // Use Lovable AI (google/gemini-2.5-flash) for OCR extraction
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
            content: `You are an expert at extracting structured data from Indian GST notices (ASMT-10, ASMT-11, DRC-01, DRC-01A, DRC-03, DRC-07, etc.). Extract all fields with confidence scores.

DOCUMENT TYPE DETECTION:
- Identify if this is a main notice or an annexure
- Return documentType: "main_notice" or "annexure"

REQUIRED FIELDS:
- DIN (Document Identification Number): 15-20 character alphanumeric
- Notice Number/Reference: The reference number (look for "Reference No.", "Ref No.", "Notice No.")
- GSTIN: 15 character format (2 digits + 5 letters + 4 digits + 1 letter + 1 alphanumeric + Z + 1 alphanumeric)
- Notice Type: Type of notice (FORM GST DRC-01A, ASMT-10, DRC-01, etc.)
- Issue Date: When the notice was issued (DD/MM/YYYY or DD.MM.YYYY format)
- Due Date: Response deadline (DD/MM/YYYY or DD.MM.YYYY format)
- Tax Period: Period covered (e.g., "F.Y. 2021-2022", "April 2021 - March 2022")

IMPORTANT GSTIN RULES:
- The TAXPAYER's GSTIN appears in the notice header or "To:" section
- Do NOT use supplier GSTINs from discrepancy/ITC tables
- If taxpayer GSTIN is not visible, return empty string

TAXPAYER DETAILS:
- Taxpayer Name: Legal name from notice header (look for "Name", "M/s." - NOT supplier names)
- Trade Name: Business trade name if different

NOTICE CONTENT:
- Subject: The full subject line of the notice
- Legal Section: GST Act section invoked (e.g., "Section 73(1)", "Section 74")
- Office: Issuing GST office/authority name

AMOUNT EXTRACTION (Indian format):
- Handle lakh format: "93,90,812" = 9390812
- Handle "/-" suffix: "₹97,06,154/-" = 9706154
- Look for "Total Tax", "Demand", "IGST", "CGST", "SGST" amounts

Return JSON:
{
  "fields": {
    "documentType": { "value": "main_notice", "confidence": 90 },
    "documentTypeLabel": { "value": "DRC-01A", "confidence": 85 },
    "din": { "value": "...", "confidence": 95 },
    "noticeNo": { "value": "...", "confidence": 90 },
    "gstin": { "value": "...", "confidence": 95 },
    "noticeType": { "value": "DRC-01A", "confidence": 95 },
    "issueDate": { "value": "DD/MM/YYYY", "confidence": 85 },
    "dueDate": { "value": "DD/MM/YYYY", "confidence": 90 },
    "period": { "value": "F.Y. 2021-2022", "confidence": 85 },
    "taxpayerName": { "value": "...", "confidence": 90 },
    "tradeName": { "value": "...", "confidence": 85 },
    "subject": { "value": "...", "confidence": 85 },
    "legalSection": { "value": "Section 73(1)", "confidence": 80 },
    "office": { "value": "...", "confidence": 80 },
    "amount": { "value": "9390812", "confidence": 85 }
  },
  "rawText": "full extracted text..."
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all information from this GST notice with confidence scores. This may be a multi-page document - analyze all pages provided:'
              },
              ...imageContent
            ]
          }
        ],
        max_tokens: 3000,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[notice-ocr] Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded, please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Payment required, please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: `AI service error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('[notice-ocr] No content in response');
      return new Response(
        JSON.stringify({ success: false, error: 'No extraction result' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[notice-ocr] Failed to parse JSON from response');
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse extraction result', rawText: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('[notice-ocr] Extraction successful:', Object.keys(parsed.fields || {}));
      
      return new Response(
        JSON.stringify({ success: true, ...parsed }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (parseError) {
      console.error('[notice-ocr] JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse extraction JSON', rawText: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('[notice-ocr] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
