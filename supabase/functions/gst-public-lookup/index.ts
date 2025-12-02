import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// MasterGST API base URL
const MASTERGST_API_URL = 'https://api.mastergst.com';

// Helper to detect sandbox mode errors
function detectSandboxError(errorMessage: string): boolean {
  const sandboxIndicators = [
    'devapi.gst.gov.in',
    'sandbox.gst.gov.in',
    'UnknownHostException',
    'Name or service not known',
    'development mode',
    'sandbox mode'
  ];
  return sandboxIndicators.some(indicator => 
    errorMessage.toLowerCase().includes(indicator.toLowerCase())
  );
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gstin } = await req.json();
    
    console.log(`[gst-public-lookup] Received request for GSTIN: ${gstin}`);

    if (!gstin || gstin.length !== 15) {
      console.log(`[gst-public-lookup] Invalid GSTIN format: ${gstin}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid GSTIN format. Must be 15 characters.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientId = Deno.env.get('MASTERGST_CLIENT_ID');
    const clientSecret = Deno.env.get('MASTERGST_CLIENT_SECRET');
    const email = Deno.env.get('MASTERGST_EMAIL');

    console.log(`[gst-public-lookup] Credentials configured: clientId=${!!clientId}, clientSecret=${!!clientSecret}, email=${!!email}`);

    if (!clientId || !clientSecret || !email) {
      console.error('[gst-public-lookup] MasterGST credentials not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'GST service not configured - missing credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[gst-public-lookup] Calling MasterGST API for GSTIN: ${gstin}`);

    // Call MasterGST Public Search API
    const apiUrl = `${MASTERGST_API_URL}/public/search?gstin=${gstin}&email=${encodeURIComponent(email)}`;
    console.log(`[gst-public-lookup] API URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'client_id': clientId,
        'client_secret': clientSecret,
        'Content-Type': 'application/json',
      },
    });

    const apiResponse = await response.json();
    console.log(`[gst-public-lookup] MasterGST API response status: ${response.status}`);
    console.log(`[gst-public-lookup] MasterGST API raw response:`, JSON.stringify(apiResponse).substring(0, 1500));

    // Extract nested data - MasterGST wraps taxpayer data inside 'data' property
    const data = apiResponse.data || apiResponse;
    console.log(`[gst-public-lookup] Extracted taxpayer data:`, JSON.stringify(data).substring(0, 1500));

    // Handle API errors with detailed sandbox detection
    if (!response.ok || apiResponse.error || apiResponse.status_cd === '0') {
      console.error('MasterGST API error:', apiResponse);
      
      const errorMessage = apiResponse.error?.message || apiResponse.message || apiResponse.status_desc || 'Failed to fetch taxpayer data';
      const errorCode = apiResponse.error?.error_cd;
      
      // Detect sandbox mode errors
      const isSandbox = detectSandboxError(errorMessage);
      
      // Detect invalid credentials
      const isInvalidCredentials = errorCode === 'AUT4033' || errorMessage.includes('Invalid Client ID');
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: isSandbox ? 'SANDBOX_MODE_ERROR' : (isInvalidCredentials ? 'INVALID_CREDENTIALS' : errorMessage),
          errorDetails: {
            isSandbox,
            isInvalidCredentials,
            message: isSandbox 
              ? 'MasterGST credentials are configured for sandbox/development mode. Production API access is required to fetch live GST data.'
              : (isInvalidCredentials 
                ? 'MasterGST API credentials are invalid or expired.'
                : errorMessage),
            action: isSandbox 
              ? 'Contact MasterGST support to enable production API access for your client credentials.'
              : (isInvalidCredentials 
                ? 'Verify your MasterGST client ID and secret are correct.'
                : 'Check MasterGST API status or contact support.'),
            originalError: errorMessage
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract address details from nested structure
    const pradr = data.pradr || {};
    const addr = pradr.addr || {};
    
    console.log(`[gst-public-lookup] Address data:`, JSON.stringify(addr));
    console.log(`[gst-public-lookup] Legal Name: ${data.lgnm}, Trade Name: ${data.tradeNam}, Constitution: ${data.ctb}`);
    console.log(`[gst-public-lookup] E-Invoice Status: ${data.einvoiceStatus}, State Jurisdiction: ${data.stj}, Centre Jurisdiction: ${data.ctj}`);

    // Map MasterGST response to our interface with correct field extraction
    const taxpayerInfo = {
      gstin: data.gstin || gstin,
      lgnm: data.lgnm || '',
      tradeNam: data.tradeNam || '',
      sts: data.sts || 'Active',
      rgdt: data.rgdt || '',
      cnldt: data.cnldt || data.cxdt || null,
      lstupdt: data.lstupdt || new Date().toISOString().split('T')[0],
      ctb: data.ctb || '',
      dty: data.dty || 'Regular',
      nba: data.nba || [],
      pradr: {
        addr: {
          bno: addr.bno || '',
          bnm: addr.bnm || '',
          flno: addr.flno || '',
          st: addr.st || '',
          loc: addr.loc || '',
          dst: addr.dst || '',
          stcd: addr.stcd || '',
          pncd: addr.pncd || '',
          landMark: addr.landMark || '',
          locality: addr.locality || '',
        },
        ntr: pradr.ntr || ''
      },
      adadr: data.adadr || [],
      ctj: data.ctj || '',
      ctjCd: data.ctjCd || '',
      stj: data.stj || '',
      stjCd: data.stjCd || '',
      einv: data.einvoiceStatus === 'Yes',
      ewb: data.ewbStatus === 'Yes' || false,
      freq: data.filingFrequency || data.freq || 'Monthly',
      aato: data.aato || null,
    };

    console.log(`[gst-public-lookup] Mapped taxpayer info:`, JSON.stringify(taxpayerInfo));
    console.log(`[gst-public-lookup] Successfully fetched taxpayer data for: ${taxpayerInfo.lgnm}`);

    return new Response(
      JSON.stringify({ success: true, data: taxpayerInfo }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in gst-public-lookup:', error);
    
    const errorMsg = error.message || 'Internal server error';
    const isSandbox = detectSandboxError(errorMsg);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: isSandbox ? 'SANDBOX_MODE_ERROR' : errorMsg,
        errorDetails: isSandbox ? {
          isSandbox: true,
          message: 'MasterGST is routing to sandbox GST server which is unavailable.',
          action: 'Contact MasterGST support to enable production API access.',
          originalError: errorMsg
        } : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
