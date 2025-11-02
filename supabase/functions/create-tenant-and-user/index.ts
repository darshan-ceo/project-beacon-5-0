import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received signup request');
    
    const { email, password, fullName, phone, organizationName } = await req.json();
    
    // Input validation
    if (!email || !password || !fullName || !organizationName) {
      console.error('Missing required fields');
      throw new Error('Missing required fields');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email address');
    }

    // Validate password strength
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      throw new Error('Password must contain at least one number');
    }

    console.log('Input validation passed');

    // Create Supabase admin client with SERVICE ROLE key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Creating tenant:', organizationName);

    // 1. Create tenant (bypasses RLS with service role)
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        name: organizationName,
        license_tier: 'trial',
        license_key: `trial-${Date.now()}`,
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Tenant creation error:', tenantError);
      throw new Error(`Failed to create organization: ${tenantError.message}`);
    }

    console.log('Tenant created successfully:', tenant.id);

    // 2. Create user with tenant_id in metadata
    console.log('Creating user account for:', email);
    
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        phone: phone || '',
        tenant_id: tenant.id,
      }
    });

    if (userError) {
      console.error('User creation error:', userError);
      // Cleanup: Delete tenant if user creation fails
      await supabaseAdmin.from('tenants').delete().eq('id', tenant.id);
      throw new Error(`Failed to create user account: ${userError.message}`);
    }

    console.log('User created successfully:', userData.user.id);

    // 3. The handle_new_user() trigger will automatically:
    //    - Create profile record
    //    - Assign 'admin' role (since this is the first user in the tenant)

    console.log('Signup completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Account created successfully. Please log in.',
        userId: userData.user.id,
        tenantId: tenant.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Signup error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred during signup'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
