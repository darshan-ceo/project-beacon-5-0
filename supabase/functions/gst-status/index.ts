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
  apiHealth: {
    publicApi: 'healthy' | 'degraded' | 'unavailable' | 'unknown';
    consentApi: 'healthy' | 'degraded' | 'unavailable' | 'unknown' | 'not_subscribed';
  };
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
  apiType?: 'public' | 'consent';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, gstin, gstUsername } = await req.json();

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
        apiHealth: {
          publicApi: isConfigured ? 'unknown' : 'unavailable',
          consentApi: isConfigured ? 'unknown' : 'unavailable',
        },
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
          apiType: 'public',
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
          apiType: 'public',
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
            apiType: 'public',
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
            apiType: 'public',
          };
          return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check for successful response
        if (responseData.data || (responseData.status_cd === '1')) {
          const taxpayerData = responseData.data;
          const response: TestResponse = {
            success: true,
            mode: 'production',
            message: 'Connection successful! MasterGST Public API is responding.',
            latencyMs,
            apiType: 'public',
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
          message: responseData.error?.message || responseData.status_desc || 'Unknown error from MasterGST API',
          latencyMs,
          errorCode: responseData.error?.error_cd || responseData.status_cd || 'API_ERROR',
          errorDetails: JSON.stringify(responseData.error || responseData),
          apiType: 'public',
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
          apiType: 'public',
        };
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Test GSP Consent API specifically
    if (action === 'test_consent_api') {
      if (!isConfigured) {
        return new Response(JSON.stringify({
          success: false,
          mode: 'sandbox',
          message: 'MasterGST credentials not configured.',
          errorCode: 'NOT_CONFIGURED',
          apiType: 'consent',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!gstin || gstin.length !== 15) {
        return new Response(JSON.stringify({
          success: false,
          mode: 'sandbox',
          message: 'Invalid GSTIN. Please provide a valid 15-character GSTIN.',
          errorCode: 'INVALID_GSTIN',
          apiType: 'consent',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!gstUsername) {
        return new Response(JSON.stringify({
          success: false,
          mode: 'sandbox',
          message: 'GST Portal Username is required to test consent API.',
          errorCode: 'MISSING_USERNAME',
          apiType: 'consent',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const startTime = Date.now();
      
      try {
        // Try different possible consent API endpoints
        const possibleEndpoints = [
          'https://api.mastergst.com/api/v1/consent/initiate',
          'https://api.mastergst.com/ewaybill/authenticate',
          'https://api.mastergst.com/gsp/otp/request',
        ];

        let lastError = null;
        let successEndpoint = null;

        for (const endpoint of possibleEndpoints) {
          console.log(`[GST Status] Testing consent endpoint: ${endpoint}`);
          
          try {
            const consentResponse = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'client_id': clientId!,
                'client_secret': clientSecret!,
                'email': email!,
              },
              body: JSON.stringify({
                gstin,
                username: gstUsername,
                email: email,
                user_gstin: gstin,
              }),
            });

            const consentData = await consentResponse.json();
            console.log(`[GST Status] Consent response from ${endpoint}:`, JSON.stringify(consentData));

            // Check for successful OTP initiation
            if (consentData.data?.txnId || consentData.txnId || consentData.transactionId) {
              successEndpoint = endpoint;
              const latencyMs = Date.now() - startTime;
              
              return new Response(JSON.stringify({
                success: true,
                mode: 'production',
                message: 'GSP Consent API is available! OTP can be sent.',
                latencyMs,
                apiType: 'consent',
                consentApiEndpoint: endpoint,
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }

            // Check for "not subscribed" or similar errors
            const errorMsg = consentData.error?.message || consentData.message || '';
            if (errorMsg.toLowerCase().includes('not subscribed') ||
                errorMsg.toLowerCase().includes('not activated') ||
                errorMsg.toLowerCase().includes('not available')) {
              lastError = {
                code: 'NOT_SUBSCRIBED',
                message: 'GSP Consent API is not subscribed/activated for this account.',
                details: errorMsg,
              };
              break;
            }

            // Check for "Invalid request" which likely means wrong endpoint or missing subscription
            if (errorMsg.toLowerCase().includes('invalid request')) {
              lastError = {
                code: 'INVALID_REQUEST',
                message: 'GSP Consent API endpoint returned Invalid Request. This usually means the consent API is not enabled for your account.',
                details: errorMsg,
              };
            } else {
              lastError = {
                code: 'API_ERROR',
                message: errorMsg || 'Unknown error',
                details: JSON.stringify(consentData),
              };
            }
          } catch (endpointError) {
            lastError = {
              code: 'NETWORK_ERROR',
              message: 'Failed to connect to endpoint',
              details: endpointError instanceof Error ? endpointError.message : 'Unknown error',
            };
          }
        }

        const latencyMs = Date.now() - startTime;
        
        return new Response(JSON.stringify({
          success: false,
          mode: 'sandbox',
          message: lastError?.message || 'GSP Consent API test failed',
          latencyMs,
          errorCode: lastError?.code || 'CONSENT_API_ERROR',
          errorDetails: lastError?.details,
          apiType: 'consent',
          recommendation: 'Contact MasterGST support to enable GSP Consent/OTP API access for your credentials.',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (error) {
        const latencyMs = Date.now() - startTime;
        console.error('[GST Status] Consent API test failed:', error);
        
        return new Response(JSON.stringify({
          success: false,
          mode: 'sandbox',
          message: 'Failed to test GSP Consent API',
          latencyMs,
          errorCode: 'NETWORK_ERROR',
          errorDetails: error instanceof Error ? error.message : 'Unknown error',
          apiType: 'consent',
        }), {
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
  const statusDesc = response?.status_desc?.toLowerCase() || '';
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
    errorMessage.includes(indicator) || errorCd.includes(indicator) || statusDesc.includes(indicator)
  );
}
