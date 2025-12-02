import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MASTERGST_API_URL = 'https://api.mastergst.com';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gstin } = await req.json();

    if (!gstin || gstin.length !== 15) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid GSTIN format. Must be 15 characters.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientId = Deno.env.get('MASTERGST_CLIENT_ID');
    const clientSecret = Deno.env.get('MASTERGST_CLIENT_SECRET');
    const email = Deno.env.get('MASTERGST_EMAIL');

    if (!clientId || !clientSecret || !email) {
      console.error('MasterGST credentials not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'GST service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching taxpayer data for GSTIN: ${gstin}`);

    // Call MasterGST Public Search API
    const response = await fetch(`${MASTERGST_API_URL}/public/search?gstin=${gstin}&email=${email}`, {
      method: 'GET',
      headers: {
        'client_id': clientId,
        'client_secret': clientSecret,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('MasterGST API response status:', response.status);

    if (!response.ok || data.error) {
      console.error('MasterGST API error:', data);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.error?.message || data.message || 'Failed to fetch taxpayer data' 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
