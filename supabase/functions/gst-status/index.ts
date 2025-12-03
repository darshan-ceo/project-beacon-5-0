import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StatusResponse {
  isConfigured: boolean;
  mode: 'production' | 'sandbox' | 'not_configured';
  credentialStatus: {
    clientId: boolean;
    clientSecret: boolean;
    email: boolean;
  };
  apiHealth: 'healthy' | 'degraded' | 'unavailable' | 'unknown';
  lastApiCall?: {
    endpoint: string;
    timestamp: string;
    success: boolean;
    latencyMs: number;
  };
}

interface TestResponse {
  success: boolean;
  mode: 'production' | 'sandbox';
  message: string;
  latencyMs?: number;
  taxpayerPreview?: {
    tradeName: string;
    legalName: string;
    status: string;
    state: string;
  };
  errorCode?: string;
  errorDetails?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, gstin } = await req.json();

    console.log(`[GST Status] Action: ${action}, GSTIN: ${gstin || 'N/A'}`);

    // Check configured secrets
    const clientId = Deno.env.get('MASTERGST_CLIENT_ID');
    const clientSecret = Deno.env.get('MASTERGST_CLIENT_SECRET');
    const email = Deno.env.get('MASTERGST_EMAIL');

    const credentialStatus = {
      clientId: !!clientId && clientId.length > 0,
      clientSecret: !!clientSecret && clientSecret.length > 0,
      email: !!email && email.length > 0,
    };

    const isConfigured = credentialStatus.clientId && credentialStatus.clientSecret && credentialStatus.email;

    if (action === 'check_status') {
      const response: StatusResponse = {
        isConfigured,
        mode: isConfigured ? 'production' : 'not_configured',
        credentialStatus,
        apiHealth: isConfigured ? 'unknown' : 'unavailable',
      };

      console.log('[GST Status] Status check result:', JSON.stringify(response));

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'test_connection') {
      if (!isConfigured) {
        const response: TestResponse = {
          success: false,
          mode: 'sandbox',
          message: 'MasterGST credentials not configured. Please configure MASTERGST_CLIENT_ID, MASTERGST_CLIENT_SECRET, and MASTERGST_EMAIL secrets.',
          errorCode: 'NOT_CONFIGURED',
        };
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!gstin || gstin.length !== 15) {
        const response: TestResponse = {
          success: false,
          mode: 'sandbox',
          message: 'Invalid GSTIN. Please provide a valid 15-character GSTIN.',
          errorCode: 'INVALID_GSTIN',
        };
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Call MasterGST Public Search API to test connection
      const startTime = Date.now();
      
      try {
        const apiUrl = `https://api.mastergst.com/public/search?email=${encodeURIComponent(email!)}&gstin=${gstin}`;
        
        console.log('[GST Status] Testing connection with MasterGST API...');

        const apiResponse = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'client_id': clientId!,
            'client_secret': clientSecret!,
            'Content-Type': 'application/json',
          },
        });

        const latencyMs = Date.now() - startTime;
        const responseData = await apiResponse.json();

        console.log('[GST Status] API Response:', JSON.stringify(responseData));

        // Check for sandbox/testing mode errors
        const isSandboxError = detectSandboxError(responseData);
        
        if (isSandboxError) {
          const response: TestResponse = {
            success: false,
            mode: 'sandbox',
            message: 'MasterGST account is in sandbox/testing mode. Contact MasterGST to activate production access.',
            latencyMs,
            errorCode: 'SANDBOX_MODE',
            errorDetails: responseData.error?.message || 'Account not activated for production',
          };
          return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check for invalid credentials
        if (responseData.error?.message?.toLowerCase().includes('invalid') || 
            responseData.error?.message?.toLowerCase().includes('unauthorized')) {
          const response: TestResponse = {
            success: false,
            mode: 'sandbox',
            message: 'Invalid MasterGST credentials. Please verify your Client ID and Client Secret.',
            latencyMs,
            errorCode: 'INVALID_CREDENTIALS',
            errorDetails: responseData.error?.message,
          };
          return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check for successful response
        if (responseData.data || (responseData.error?.error_cd === '0')) {
          const taxpayerData = responseData.data;
          const response: TestResponse = {
            success: true,
            mode: 'production',
            message: 'Connection successful! MasterGST API is responding.',
            latencyMs,
            taxpayerPreview: taxpayerData ? {
              tradeName: taxpayerData.tradeNam || taxpayerData.tradeName || 'N/A',
              legalName: taxpayerData.lgnm || taxpayerData.legalName || 'N/A',
              status: taxpayerData.sts || taxpayerData.status || 'N/A',
              state: taxpayerData.pradr?.addr?.stcd || taxpayerData.stateCode || 'N/A',
            } : undefined,
          };
          return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Handle other errors
        const response: TestResponse = {
          success: false,
          mode: 'sandbox',
          message: responseData.error?.message || 'Unknown error from MasterGST API',
          latencyMs,
          errorCode: responseData.error?.error_cd || 'API_ERROR',
          errorDetails: JSON.stringify(responseData.error),
        };
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (apiError) {
        const latencyMs = Date.now() - startTime;
        console.error('[GST Status] API call failed:', apiError);
        
        const response: TestResponse = {
          success: false,
          mode: 'sandbox',
          message: 'Failed to connect to MasterGST API. Please check network connectivity.',
          latencyMs,
          errorCode: 'NETWORK_ERROR',
          errorDetails: apiError instanceof Error ? apiError.message : 'Unknown network error',
        };
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Unknown action
    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[GST Status] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function detectSandboxError(response: any): boolean {
  const errorMessage = response?.error?.message?.toLowerCase() || '';
  const errorCd = response?.error?.error_cd || '';
  
  const sandboxIndicators = [
    'sandbox',
    'testing',
    'demo',
    'not activated',
    'trial',
    'development mode',
    'test environment'
  ];

  return sandboxIndicators.some(indicator => 
    errorMessage.includes(indicator) || errorCd.includes(indicator)
  );
}
