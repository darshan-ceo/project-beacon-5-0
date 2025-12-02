import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MasterGSTConfig {
  clientId: string;
  clientSecret: string;
  apiUrl: string;
  email: string;
}

const getConfig = (): MasterGSTConfig | null => {
  const clientId = Deno.env.get('MASTERGST_CLIENT_ID');
  const clientSecret = Deno.env.get('MASTERGST_CLIENT_SECRET');
  const apiUrl = Deno.env.get('MASTERGST_API_URL') || 'https://api.mastergst.com/api/v1';
  const email = Deno.env.get('MASTERGST_EMAIL');

  // If any required secret is missing, return null to trigger sandbox mode
  if (!clientId || !clientSecret || !email) {
    return null;
  }

  return { clientId, clientSecret, apiUrl, email };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, clientId, gstin, txnId, otp, consentId } = await req.json();

    // Get user from JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get tenant_id from user metadata
    const tenantId = user.user_metadata?.tenant_id;
    if (!tenantId) {
      throw new Error('Tenant ID not found in user metadata');
    }

    const config = getConfig();
    const isSandbox = !config;

    console.log(`[gst-auth] Action: ${action}, Sandbox: ${isSandbox}, TenantId: ${tenantId}`);

    // Route actions
    switch (action) {
      case 'initiate': {
        if (!clientId || !gstin) {
          throw new Error('clientId and gstin are required');
        }

        if (isSandbox) {
          // Sandbox mode: return mock response
          const mockResponse = {
            success: true,
            data: {
              txnId: `sandbox_txn_${Date.now()}`,
              maskedDestination: '**98',
              expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
              sandbox: true
            }
          };
          return new Response(JSON.stringify(mockResponse), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Real MasterGST API call
        const initiateResponse = await fetch(`${config.apiUrl}/consent/initiate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'client-id': config.clientId,
            'client-secret': config.clientSecret,
            'email': config.email
          },
          body: JSON.stringify({ gstin })
        });

        if (!initiateResponse.ok) {
          throw new Error(`MasterGST API error: ${initiateResponse.statusText}`);
        }

        const data = await initiateResponse.json();
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'verify': {
        if (!txnId || !otp || !clientId || !gstin) {
          throw new Error('txnId, otp, clientId, and gstin are required');
        }

        if (isSandbox) {
          // Sandbox mode: return mock profile and create credential record
          const mockProfile = {
            gstin,
            registeredEmail: 'sandbox@example.com',
            registeredMobile: '+91-9876543210',
            filingFreq: 'Monthly',
            signatories: [
              { name: 'Test User', email: 'test@example.com', mobile: '+91-9898989898', role: 'Authorized Signatory', signatoryType: 'Primary' }
            ],
            eInvoiceEnabled: true,
            eWayBillEnabled: true,
            aatoBand: '1B'
          };

          // Create/update credential record
          const credentialData = {
            tenant_id: tenantId,
            client_id: clientId,
            gstin,
            consent_id: `sandbox_consent_${Date.now()}`,
            consent_status: 'active',
            consent_granted_at: new Date().toISOString(),
            consent_valid_till: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            access_token: `sandbox_token_${Date.now()}`,
            token_expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            registered_email: mockProfile.registeredEmail,
            registered_mobile: mockProfile.registeredMobile,
            filing_frequency: mockProfile.filingFreq,
            aato_band: mockProfile.aatoBand,
            e_invoice_enabled: mockProfile.eInvoiceEnabled,
            e_waybill_enabled: mockProfile.eWayBillEnabled,
            authorized_signatories: mockProfile.signatories,
            last_sync: new Date().toISOString()
          };

          const { error: upsertError } = await supabase
            .from('gst_credentials')
            .upsert(credentialData, { onConflict: 'tenant_id,gstin' });

          if (upsertError) {
            console.error('[gst-auth] Upsert error:', upsertError);
            throw new Error(`Failed to store credentials: ${upsertError.message}`);
          }

          const verifyResponse = {
            success: true,
            data: {
              consentId: credentialData.consent_id,
              accessToken: credentialData.access_token,
              tokenExpiry: credentialData.token_expiry,
              profilePayload: mockProfile,
              sandbox: true
            }
          };

          return new Response(JSON.stringify(verifyResponse), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Real MasterGST API call
        const verifyResponse = await fetch(`${config.apiUrl}/consent/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'client-id': config.clientId,
            'client-secret': config.clientSecret,
            'email': config.email
          },
          body: JSON.stringify({ txnId, otp })
        });

        if (!verifyResponse.ok) {
          throw new Error(`MasterGST API error: ${verifyResponse.statusText}`);
        }

        const verifyData = await verifyResponse.json();

        // Store credentials in database
        const credentialData = {
          tenant_id: tenantId,
          client_id: clientId,
          gstin,
          consent_id: verifyData.consentId,
          consent_status: 'active',
          consent_granted_at: new Date().toISOString(),
          consent_valid_till: verifyData.tokenExpiry,
          access_token: verifyData.accessToken,
          refresh_token: verifyData.refreshToken,
          token_expiry: verifyData.tokenExpiry,
          registered_email: verifyData.profilePayload?.registeredEmail,
          registered_mobile: verifyData.profilePayload?.registeredMobile,
          filing_frequency: verifyData.profilePayload?.filingFreq,
          aato_band: verifyData.profilePayload?.aatoBand,
          e_invoice_enabled: verifyData.profilePayload?.eInvoiceEnabled || false,
          e_waybill_enabled: verifyData.profilePayload?.eWayBillEnabled || false,
          authorized_signatories: verifyData.profilePayload?.signatories || [],
          last_sync: new Date().toISOString()
        };

        const { error: upsertError } = await supabase
          .from('gst_credentials')
          .upsert(credentialData, { onConflict: 'tenant_id,gstin' });

        if (upsertError) {
          console.error('[gst-auth] Upsert error:', upsertError);
          throw new Error(`Failed to store credentials: ${upsertError.message}`);
        }

        return new Response(JSON.stringify({ success: true, data: verifyData }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'refresh': {
        if (!gstin) {
          throw new Error('gstin is required');
        }

        // Get existing credential
        const { data: credential, error: fetchError } = await supabase
          .from('gst_credentials')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('gstin', gstin)
          .single();

        if (fetchError || !credential) {
          throw new Error('Credential not found');
        }

        if (isSandbox) {
          // Sandbox mode: return mock refresh
          const newToken = `sandbox_token_${Date.now()}`;
          const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

          await supabase
            .from('gst_credentials')
            .update({
              access_token: newToken,
              token_expiry: newExpiry,
              last_sync: new Date().toISOString()
            })
            .eq('id', credential.id);

          return new Response(JSON.stringify({
            success: true,
            data: { accessToken: newToken, tokenExpiry: newExpiry, sandbox: true }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Real MasterGST API call
        const refreshResponse = await fetch(`${config.apiUrl}/token/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'client-id': config.clientId,
            'client-secret': config.clientSecret,
            'email': config.email
          },
          body: JSON.stringify({ refreshToken: credential.refresh_token })
        });

        if (!refreshResponse.ok) {
          throw new Error(`MasterGST API error: ${refreshResponse.statusText}`);
        }

        const refreshData = await refreshResponse.json();

        // Update credential
        await supabase
          .from('gst_credentials')
          .update({
            access_token: refreshData.accessToken,
            token_expiry: refreshData.tokenExpiry,
            last_sync: new Date().toISOString()
          })
          .eq('id', credential.id);

        return new Response(JSON.stringify({ success: true, data: refreshData }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'revoke': {
        if (!gstin) {
          throw new Error('gstin is required');
        }

        // Get existing credential
        const { data: credential, error: fetchError } = await supabase
          .from('gst_credentials')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('gstin', gstin)
          .single();

        if (fetchError || !credential) {
          throw new Error('Credential not found');
        }

        if (!isSandbox) {
          // Real MasterGST API call
          await fetch(`${config.apiUrl}/consent/revoke`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'client-id': config.clientId,
              'client-secret': config.clientSecret,
              'email': config.email
            },
            body: JSON.stringify({ consentId: credential.consent_id })
          });
        }

        // Update credential status
        await supabase
          .from('gst_credentials')
          .update({
            consent_status: 'revoked',
            consent_revoked_at: new Date().toISOString()
          })
          .eq('id', credential.id);

        return new Response(JSON.stringify({ success: true, data: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'status': {
        if (!clientId) {
          throw new Error('clientId is required');
        }

        // Get all credentials for client
        const { data: credentials, error: fetchError } = await supabase
          .from('gst_credentials')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('client_id', clientId);

        if (fetchError) {
          throw new Error(`Failed to fetch credentials: ${fetchError.message}`);
        }

        const statusData = credentials.map(cred => ({
          clientId: cred.client_id,
          gstin: cred.gstin,
          consentId: cred.consent_id,
          grantedAt: cred.consent_granted_at,
          validTill: cred.consent_valid_till,
          revokedAt: cred.consent_revoked_at,
          isActive: cred.consent_status === 'active',
          lastSync: cred.last_sync
        }));

        return new Response(JSON.stringify({ success: true, data: statusData }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('[gst-auth] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
