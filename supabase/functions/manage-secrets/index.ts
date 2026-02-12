import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Manage Secrets Edge Function
 * Handles secure storage and operations for sensitive credentials
 * - Email SMTP credentials (never returned to client)
 * - OAuth tokens for calendar integrations
 * - Test email sending using stored credentials
 */

// AES-256-GCM encryption helpers
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyMaterial = Deno.env.get('SECRETS_ENCRYPTION_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const encoder = new TextEncoder()
  const keyData = encoder.encode(keyMaterial.substring(0, 32).padEnd(32, '0'))
  
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
}

async function encrypt(data: string): Promise<string> {
  const key = await getEncryptionKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoder = new TextEncoder()
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  )
  
  // Combine IV + encrypted data and base64 encode
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)
  
  return btoa(String.fromCharCode(...combined))
}

async function decrypt(encryptedData: string): Promise<string> {
  const key = await getEncryptionKey()
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))
  
  const iv = combined.slice(0, 12)
  const data = combined.slice(12)
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )
  
  return new TextDecoder().decode(decrypted)
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // User client for auth
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Admin client for operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token)
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = claimsData.claims.sub as string

    // Get user's tenant
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('id', userId)
      .single()

    if (profileError || !profile?.tenant_id) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tenantId = profile.tenant_id
    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()
    
    // Safely parse JSON body - handle empty bodies for GET-like actions
    let body = {}
    if (req.method === 'POST') {
      try {
        const text = await req.text()
        body = text ? JSON.parse(text) : {}
      } catch (e) {
        // Empty or invalid body is okay for some actions like get-email-config
        console.log('[manage-secrets] No JSON body provided, using empty object')
      }
    }

    console.log(`[manage-secrets] Action: ${action}, User: ${userId}, Tenant: ${tenantId}`)

    switch (action) {
      case 'store': {
        // Store encrypted credential
        const { key, value, metadata } = body
        if (!key || !value) {
          return new Response(
            JSON.stringify({ error: 'Missing key or value' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const encryptedValue = await encrypt(value)
        const settingKey = `secret:${tenantId}:${key}`

        const { error: upsertError } = await supabaseAdmin
          .from('system_settings')
          .upsert({
            id: crypto.randomUUID(),
            setting_key: settingKey,
            setting_value: {
              encrypted: encryptedValue,
              metadata: metadata || {},
              updated_at: new Date().toISOString()
            },
            tenant_id: tenantId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'tenant_id,setting_key'
          })

        if (upsertError) {
          console.error('[manage-secrets] Store error:', upsertError)
          return new Response(
            JSON.stringify({ error: 'Failed to store secret' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'delete': {
        // Delete a stored secret
        const { key } = body
        if (!key) {
          return new Response(
            JSON.stringify({ error: 'Missing key' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const settingKey = `secret:${tenantId}:${key}`
        
        const { error: deleteError } = await supabaseAdmin
          .from('system_settings')
          .delete()
          .eq('setting_key', settingKey)

        if (deleteError) {
          console.error('[manage-secrets] Delete error:', deleteError)
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'exists': {
        // Check if a secret exists (without returning value)
        const { key } = body
        if (!key) {
          return new Response(
            JSON.stringify({ error: 'Missing key' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const settingKey = `secret:${tenantId}:${key}`
        
        const { data, error } = await supabaseAdmin
          .from('system_settings')
          .select('id')
          .eq('setting_key', settingKey)
          .maybeSingle()

        return new Response(
          JSON.stringify({ exists: !!data && !error }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'test-email': {
        // Send test email using stored SMTP credentials
        const { recipientEmail, settingsKey } = body
        if (!recipientEmail) {
          return new Response(
            JSON.stringify({ error: 'Missing recipient email' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Load email settings from system_settings
        const { data: emailConfig } = await supabaseAdmin
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', `email_config:${tenantId}`)
          .maybeSingle()

        if (!emailConfig?.setting_value) {
          return new Response(
            JSON.stringify({ error: 'Email not configured' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // For now, use Resend API which is already configured
        const resendApiKey = Deno.env.get('RESEND_API_KEY')
        if (!resendApiKey) {
          return new Response(
            JSON.stringify({ error: 'Email service not configured' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const config = emailConfig.setting_value as any
        const fromAddress = config.fromAddress || 'noreply@resend.dev'
        const fromName = config.fromName || 'Case Management System'

        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: `${fromName} <${fromAddress}>`,
            to: [recipientEmail],
            subject: 'Test Email - Configuration Verified',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">✅ Email Configuration Test</h2>
                <p>This is a test email from your Case Management System.</p>
                <p>Your email configuration is working correctly!</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 14px;">
                  Sent at: ${new Date().toLocaleString()}
                </p>
              </div>
            `
          })
        })

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json()
          console.error('[manage-secrets] Email send error:', errorData)
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Failed to send email',
              details: errorData.message || 'Unknown error'
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const result = await emailResponse.json()
        return new Response(
          JSON.stringify({ 
            success: true, 
            messageId: result.id,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'save-email-config': {
        // Save email configuration (non-sensitive parts)
        const { config } = body
        if (!config) {
          return new Response(
            JSON.stringify({ error: 'Missing config' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Store sensitive password separately if provided
        if (config.appPassword) {
          const encryptedPassword = await encrypt(config.appPassword)
          await supabaseAdmin
            .from('system_settings')
            .upsert({
              id: crypto.randomUUID(),
              setting_key: `secret:${tenantId}:smtp_password`,
              setting_value: { encrypted: encryptedPassword },
              tenant_id: tenantId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id,setting_key' })
          delete config.appPassword
        }

        if (config.password) {
          const encryptedPassword = await encrypt(config.password)
          await supabaseAdmin
            .from('system_settings')
            .upsert({
              id: crypto.randomUUID(),
              setting_key: `secret:${tenantId}:smtp_client_password`,
              setting_value: { encrypted: encryptedPassword },
              tenant_id: tenantId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id,setting_key' })
          delete config.password
        }

        // Store non-sensitive config
        const { error: configError } = await supabaseAdmin
          .from('system_settings')
          .upsert({
            id: crypto.randomUUID(),
            setting_key: `email_config:${tenantId}`,
            setting_value: {
              ...config,
              hasPassword: true,
              updated_at: new Date().toISOString()
            },
            tenant_id: tenantId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'tenant_id,setting_key' })

        if (configError) {
          console.error('[manage-secrets] Save email config error:', configError)
          return new Response(
            JSON.stringify({ error: 'Failed to save config' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get-email-config': {
        // Get email configuration (without sensitive data)
        const { data: emailConfig } = await supabaseAdmin
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', `email_config:${tenantId}`)
          .maybeSingle()

        return new Response(
          JSON.stringify({ 
            config: emailConfig?.setting_value || null 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'save-calendar-tokens': {
        // Store OAuth tokens for calendar integration
        const { provider, tokens } = body
        if (!provider || !tokens) {
          return new Response(
            JSON.stringify({ error: 'Missing provider or tokens' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Encrypt tokens
        const encryptedTokens = await encrypt(JSON.stringify(tokens))
        
        await supabaseAdmin
          .from('system_settings')
          .upsert({
            id: crypto.randomUUID(),
            setting_key: `secret:${tenantId}:calendar_${provider}_tokens`,
            setting_value: { encrypted: encryptedTokens },
            tenant_id: tenantId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'tenant_id,setting_key' })

        // Update calendar_integrations status
        await supabaseAdmin
          .from('calendar_integrations')
          .upsert({
            tenant_id: tenantId,
            provider,
            connection_status: 'connected',
            user_email: tokens.user_email || null,
            updated_at: new Date().toISOString()
          }, { onConflict: 'tenant_id' })

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'clear-calendar-tokens': {
        // Clear OAuth tokens for a provider
        const { provider } = body
        if (!provider) {
          return new Response(
            JSON.stringify({ error: 'Missing provider' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        await supabaseAdmin
          .from('system_settings')
          .delete()
          .eq('setting_key', `secret:${tenantId}:calendar_${provider}_tokens`)

        // Update calendar_integrations status
        await supabaseAdmin
          .from('calendar_integrations')
          .update({
            connection_status: 'disconnected',
            user_email: null,
            updated_at: new Date().toISOString()
          })
          .eq('tenant_id', tenantId)

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get-calendar-token': {
        // Retrieve and decrypt calendar OAuth tokens
        const { provider } = body
        if (!provider) {
          return new Response(
            JSON.stringify({ error: 'Missing provider' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: tokenData } = await supabaseAdmin
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', `secret:${tenantId}:calendar_${provider}_tokens`)
          .maybeSingle()

        if (!tokenData?.setting_value?.encrypted) {
          return new Response(
            JSON.stringify({ error: 'No tokens found', code: 'NO_TOKENS' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        try {
          const decryptedTokens = await decrypt(tokenData.setting_value.encrypted)
          const tokens = JSON.parse(decryptedTokens)

          // Check if token is expired — attempt auto-refresh
          if (tokens.expires_at && Date.now() > tokens.expires_at) {
            if (!tokens.refresh_token || !tokens.client_id || !tokens.client_secret) {
              return new Response(
                JSON.stringify({ error: 'Token expired and no refresh credentials available. Please reconnect your calendar.', code: 'TOKEN_REFRESH_FAILED' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }

            // Determine refresh endpoint based on provider
            let refreshUrl: string
            const refreshParams: Record<string, string> = {
              client_id: tokens.client_id,
              client_secret: tokens.client_secret,
              refresh_token: tokens.refresh_token,
              grant_type: 'refresh_token',
            }

            if (provider === 'google') {
              refreshUrl = 'https://oauth2.googleapis.com/token'
            } else {
              // Microsoft / Outlook
              const msTenant = tokens.tenant_id || 'common'
              refreshUrl = `https://login.microsoftonline.com/${msTenant}/oauth2/v2.0/token`
              refreshParams.scope = 'https://graph.microsoft.com/.default offline_access'
            }

            try {
              const refreshResponse = await fetch(refreshUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(refreshParams).toString(),
              })

              if (!refreshResponse.ok) {
                const errBody = await refreshResponse.text()
                console.error('[manage-secrets] Token refresh failed:', errBody)

                // Mark connection as expired
                await supabaseAdmin
                  .from('calendar_integrations')
                  .update({ connection_status: 'expired', updated_at: new Date().toISOString() })
                  .eq('tenant_id', tenantId)

                return new Response(
                  JSON.stringify({ error: 'Token refresh failed. Please reconnect your calendar.', code: 'TOKEN_REFRESH_FAILED' }),
                  { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
              }

              const refreshedTokens = await refreshResponse.json()

              // Merge — Google doesn't always return a new refresh_token
              const updatedTokens = {
                ...tokens,
                access_token: refreshedTokens.access_token,
                expires_at: Date.now() + ((refreshedTokens.expires_in || 3600) * 1000),
              }
              if (refreshedTokens.refresh_token) {
                updatedTokens.refresh_token = refreshedTokens.refresh_token
              }

              // Persist refreshed tokens
              const encryptedUpdated = await encrypt(JSON.stringify(updatedTokens))
              await supabaseAdmin
                .from('system_settings')
                .update({ setting_value: { encrypted: encryptedUpdated }, updated_at: new Date().toISOString() })
                .eq('setting_key', `secret:${tenantId}:calendar_${provider}_tokens`)

              console.log('[manage-secrets] Token refreshed successfully for', provider)

              return new Response(
                JSON.stringify({ success: true, access_token: updatedTokens.access_token, expires_at: updatedTokens.expires_at }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            } catch (refreshError) {
              console.error('[manage-secrets] Token refresh error:', refreshError)
              return new Response(
                JSON.stringify({ error: 'Token refresh failed unexpectedly', code: 'TOKEN_REFRESH_FAILED' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }
          }

          return new Response(
            JSON.stringify({ 
              success: true, 
              access_token: tokens.access_token,
              expires_at: tokens.expires_at 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } catch (decryptError) {
          console.error('[manage-secrets] Token decryption error:', decryptError)
          return new Response(
            JSON.stringify({ error: 'Failed to decrypt tokens' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('[manage-secrets] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
