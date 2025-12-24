import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { identifier } = await req.json()

    if (!identifier || typeof identifier !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Identifier (username or email) is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const trimmedIdentifier = identifier.trim().toLowerCase()

    // If it looks like an email, return it directly
    if (trimmedIdentifier.includes('@')) {
      console.log(`[portal-lookup] Identifier is email: ${trimmedIdentifier}`)
      return new Response(
        JSON.stringify({ loginEmail: trimmedIdentifier }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Otherwise, look up by username in clients.portal_access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    console.log(`[portal-lookup] Looking up username: ${trimmedIdentifier}`)

    // Query clients where portal_access.username matches
    const { data: clients, error } = await supabase
      .from('clients')
      .select('id, portal_access')
      .not('portal_access', 'is', null)

    if (error) {
      console.error('[portal-lookup] Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find matching client by username (case-insensitive)
    // Handle portal_access stored as object or as JSON string (legacy fix)
    const matchingClient = clients?.find((client) => {
      let portalAccess: { 
        allowLogin?: boolean; 
        username?: string; 
        loginEmail?: string 
      } | null = null
      
      if (client.portal_access) {
        if (typeof client.portal_access === 'string') {
          // Legacy: portal_access stored as stringified JSON
          try {
            portalAccess = JSON.parse(client.portal_access)
          } catch {
            console.warn('[portal-lookup] Failed to parse portal_access string for client', client.id)
            return false
          }
        } else {
          // Expected: portal_access stored as object
          portalAccess = client.portal_access as typeof portalAccess
        }
      }
      
      if (!portalAccess?.allowLogin || !portalAccess?.username) {
        return false
      }
      
      return portalAccess.username.toLowerCase() === trimmedIdentifier
    })

    if (!matchingClient) {
      console.log(`[portal-lookup] No client found for username: ${trimmedIdentifier}`)
      return new Response(
        JSON.stringify({ error: 'Invalid username' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse portal_access again (same logic as above)
    let portalAccess: { loginEmail?: string; username?: string } | null = null
    if (typeof matchingClient.portal_access === 'string') {
      try {
        portalAccess = JSON.parse(matchingClient.portal_access)
      } catch {
        portalAccess = null
      }
    } else {
      portalAccess = matchingClient.portal_access as typeof portalAccess
    }
    
    const loginEmail = portalAccess?.loginEmail

    if (!loginEmail) {
      console.log(`[portal-lookup] No loginEmail found for client: ${matchingClient.id}`)
      return new Response(
        JSON.stringify({ error: 'Portal credentials not provisioned' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[portal-lookup] Found loginEmail for username ${trimmedIdentifier}`)
    
    return new Response(
      JSON.stringify({ loginEmail, clientId: matchingClient.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[portal-lookup] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

