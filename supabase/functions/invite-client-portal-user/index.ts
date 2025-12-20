import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteRequest {
  clientId: string;
  email: string;
  portalRole: string;
}

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
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
    const { clientId, email, portalRole } = await req.json() as InviteRequest;

    console.log('Invite request:', { clientId, email, portalRole, tenantId });

    // Validate inputs
    if (!clientId || !email) {
      return new Response(
        JSON.stringify({ error: 'Client ID and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify client belongs to this tenant
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id, display_name, tenant_id')
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

    // Check if portal user already exists for this email and client
    const { data: existingPortalUser } = await supabaseAdmin
      .from('client_portal_users')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('client_id', clientId)
      .single();

    if (existingPortalUser) {
      return new Response(
        JSON.stringify({ error: 'A portal user with this email already exists for this client' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate temporary password
    const tempPassword = generatePassword();

    // Check if auth user exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      console.log('Using existing auth user:', userId);
    } else {
      // Create new auth user
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          client_portal_user: true,
          client_id: clientId,
          tenant_id: tenantId
        }
      });

      if (createUserError) {
        console.error('Create user error:', createUserError);
        return new Response(
          JSON.stringify({ error: `Failed to create user: ${createUserError.message}` }),
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
        email: email.toLowerCase(),
        portal_role: portalRole || 'viewer',
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

    // Get tenant name for email
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single();

    // Send invitation email
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to the Client Portal</h2>
        <p>Hello,</p>
        <p>You have been granted access to the Client Portal for <strong>${client.display_name}</strong> by ${tenant?.name || 'your legal team'}.</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Your Login Credentials</h3>
          <p><strong>Email:</strong> ${email}</p>
          ${!existingUser ? `<p><strong>Temporary Password:</strong> ${tempPassword}</p>` : '<p><em>Use your existing password to log in.</em></p>'}
        </div>
        
        <p>Through the portal, you can:</p>
        <ul>
          <li>View your case information and status</li>
          <li>Access and download documents</li>
          <li>View upcoming hearing schedules</li>
          <li>Receive important notifications</li>
        </ul>
        
        <p>
          <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/auth/login" 
             style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Access Client Portal
          </a>
        </p>
        
        ${!existingUser ? '<p style="color: #666; font-size: 14px;">Please change your password after your first login.</p>' : ''}
        
        <p>If you have any questions, please contact your legal team.</p>
      </div>
    `;

    try {
      const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          to: email,
          subject: `Your Client Portal Access - ${client.display_name}`,
          html: emailBody
        })
      });

      if (!emailResponse.ok) {
        console.warn('Email send warning:', await emailResponse.text());
      } else {
        console.log('Invitation email sent successfully');
      }
    } catch (emailError) {
      console.error('Email send error:', emailError);
      // Continue even if email fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation sent successfully',
        userId,
        clientName: client.display_name
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Invite error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
