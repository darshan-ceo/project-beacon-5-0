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

    // Always look up by username in clients.portal_access (never shortcut for emails)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    console.log(`[portal-lookup] Looking up identifier: ${trimmedIdentifier}`)

    // Query clients where portal_access exists
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

    // Helper to parse portal_access (handles string or object)
    const parsePortalAccess = (pa: unknown): { allowLogin?: boolean; username?: string; loginEmail?: string } | null => {
      if (!pa) return null
      if (typeof pa === 'string') {
        try { return JSON.parse(pa) } catch { return null }
      }
      return pa as { allowLogin?: boolean; username?: string; loginEmail?: string }
    }

    // First: match by username (case-insensitive)
    let matchingClient = clients?.find((client) => {
      const portalAccess = parsePortalAccess(client.portal_access)
      if (!portalAccess?.allowLogin || !portalAccess?.username) return false
      return portalAccess.username.toLowerCase() === trimmedIdentifier
    })

    // Fallback: if identifier contains '@' and no username match, try matching by loginEmail
    if (!matchingClient && trimmedIdentifier.includes('@')) {
      console.log(`[portal-lookup] No username match, trying loginEmail fallback for: ${trimmedIdentifier}`)
      matchingClient = clients?.find((client) => {
        const portalAccess = parsePortalAccess(client.portal_access)
        if (!portalAccess?.allowLogin || !portalAccess?.loginEmail) return false
        return portalAccess.loginEmail.toLowerCase() === trimmedIdentifier
      })
    }

    if (!matchingClient) {
      console.log(`[portal-lookup] No client found for identifier: ${trimmedIdentifier}`)
      return new Response(
        JSON.stringify({ error: 'Invalid username' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const portalAccess = parsePortalAccess(matchingClient.portal_access)
    
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

