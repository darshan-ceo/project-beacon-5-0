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

    const data = await response.json();
    console.log(`[gst-public-lookup] MasterGST API response status: ${response.status}`);
    console.log(`[gst-public-lookup] MasterGST API response:`, JSON.stringify(data).substring(0, 1000));

    // Handle API errors with detailed sandbox detection
    if (!response.ok || data.error || data.status_cd === '0') {
      console.error('MasterGST API error:', data);
      
      const errorMessage = data.error?.message || data.message || data.status_desc || 'Failed to fetch taxpayer data';
      const errorCode = data.error?.error_cd;
      
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

    // Map MasterGST response to our interface
    const taxpayerInfo = {
      gstin: data.gstin || gstin,
      lgnm: data.lgnm || data.legal_name || '',
      tradeNam: data.tradeNam || data.trade_name || '',
      sts: data.sts || data.status || 'Active',
      rgdt: data.rgdt || data.registration_date || '',
      cnldt: data.cnldt || data.cancellation_date || null,
      lstupdt: data.lstupdt || data.last_updated || new Date().toISOString().split('T')[0],
      ctb: data.ctb || data.constitution || '',
      dty: data.dty || data.dealer_type || 'Regular',
      nba: data.nba || data.nature_of_business || [],
      pradr: data.pradr || {
        addr: {
          bno: data.principal_address?.building_number || '',
          bnm: data.principal_address?.building_name || '',
          st: data.principal_address?.street || '',
          loc: data.principal_address?.location || '',
          dst: data.principal_address?.district || '',
          stcd: data.principal_address?.state_code || gstin.substring(0, 2),
          pncd: data.principal_address?.pincode || '',
        }
      },
      adadr: data.adadr || data.additional_addresses || [],
      ctj: data.ctj || data.centre_jurisdiction || '',
      ctjCd: data.ctjCd || data.centre_jurisdiction_code || '',
      stj: data.stj || data.state_jurisdiction || '',
      stjCd: data.stjCd || data.state_jurisdiction_code || '',
      einv: data.einvoiceStatus === 'Yes' || data.einv || false,
      ewb: data.ewbStatus === 'Yes' || data.ewb || false,
      freq: data.filingFrequency || data.freq || 'Monthly',
      aato: data.aato || data.aggregate_turnover || null,
    };

    console.log('Successfully fetched taxpayer data for:', taxpayerInfo.lgnm);

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
