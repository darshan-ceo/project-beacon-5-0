import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProvisionRequest {
  clientId: string;
  username: string;
  password: string;
  portalRole?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Create user client to verify caller
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the calling user
    const { data: { user: callingUser }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !callingUser) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get caller's tenant
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('id', callingUser.id)
      .single();

    if (profileError || !callerProfile) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tenantId = callerProfile.tenant_id;

    // Parse request body
    const { clientId, username, password, portalRole = 'viewer' } = await req.json() as ProvisionRequest;

    console.log('Provision request:', { clientId, username, portalRole, tenantId });

    // Validate inputs
    if (!clientId || !username || !password) {
      return new Response(
        JSON.stringify({ error: 'Client ID, username, and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (username.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Username must be at least 3 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for weak password patterns
    const isWeakPassword = /^(\d)\1+$/.test(password) || // All same digit
                          /^12345678/.test(password) ||
                          /^password/i.test(password) ||
                          /^qwerty/i.test(password) ||
                          /^abcd/i.test(password);
    
    if (isWeakPassword) {
      return new Response(
        JSON.stringify({ error: 'Password is too weak. Please use a mix of letters, numbers, and special characters.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify client belongs to this tenant
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id, display_name, tenant_id, portal_access')
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .single();

    if (clientError || !client) {
      console.error('Client error:', clientError);
      return new Response(
        JSON.stringify({ error: 'Client not found or access denied' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate login email from username (username@portal.clientid.local)
    const loginEmail = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@portal.${clientId.slice(0, 8)}.local`;
    console.log('Generated login email:', loginEmail);

    // Check if portal user already exists for this client
    const { data: existingPortalUser } = await supabaseAdmin
      .from('client_portal_users')
      .select('id, user_id')
      .eq('client_id', clientId)
      .single();

    let userId: string;

    if (existingPortalUser) {
      // Update existing auth user's password
      console.log('Updating existing portal user:', existingPortalUser.user_id);
      
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingPortalUser.user_id,
        { 
          password,
          email: loginEmail,
          email_confirm: true
        }
      );

      if (updateError) {
        console.error('Update user error:', updateError);
        const errorMessage = updateError.message?.includes('weak') 
          ? 'Password is too weak or commonly used. Please choose a stronger password with letters, numbers, and special characters.'
          : updateError.message;
        return new Response(
          JSON.stringify({ error: errorMessage }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = existingPortalUser.user_id;

      // Update client_portal_users record
      await supabaseAdmin
        .from('client_portal_users')
        .update({
          email: loginEmail,
          portal_role: portalRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPortalUser.id);

    } else {
      // Check if auth user with this email exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === loginEmail.toLowerCase());

      if (existingUser) {
        userId = existingUser.id;
        console.log('Using existing auth user:', userId);
        
        // Update password
        await supabaseAdmin.auth.admin.updateUserById(userId, { 
          password,
          email_confirm: true 
        });
      } else {
        // Create new auth user
        const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
          email: loginEmail,
          password,
          email_confirm: true,
          user_metadata: {
            client_portal_user: true,
            client_id: clientId,
            tenant_id: tenantId,
            display_name: username
          }
        });

        if (createUserError) {
          console.error('Create user error:', createUserError);
          const errorMessage = createUserError.message?.includes('weak') 
            ? 'Password is too weak or commonly used. Please choose a stronger password with letters, numbers, and special characters.'
            : createUserError.message;
          return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        userId = newUser.user.id;
        console.log('Created new auth user:', userId);
      }

      // Create client_portal_users record
      const { error: portalUserError } = await supabaseAdmin
        .from('client_portal_users')
        .insert({
          user_id: userId,
          client_id: clientId,
          tenant_id: tenantId,
          email: loginEmail,
          portal_role: portalRole,
          is_active: true,
          created_by: callingUser.id
        });

      if (portalUserError) {
        console.error('Portal user creation error:', portalUserError);
        return new Response(
          JSON.stringify({ error: `Failed to create portal user: ${portalUserError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update client's portal_access column
    const portalAccess = {
      allowLogin: true,
      username,
      loginEmail,
      userId
    };

    const { error: updateClientError } = await supabaseAdmin
      .from('clients')
      .update({ portal_access: portalAccess })
      .eq('id', clientId);

    if (updateClientError) {
      console.error('Update client portal_access error:', updateClientError);
      // Non-fatal, continue
    }

    console.log('Portal user provisioned successfully:', { clientId, username, userId, loginEmail });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Portal user provisioned successfully',
        userId,
        loginEmail,
        clientName: client.display_name
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Provision error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
