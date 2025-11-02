import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// RBAC role mapping
const EMPLOYEE_TO_RBAC_MAPPING: Record<string, string[]> = {
  'Partner': ['admin'],
  'CA': ['admin'],
  'Advocate': ['manager'],
  'Manager': ['manager'],
  'Staff': ['staff'],
  'RM': ['manager'],
  'Finance': ['manager'],
  'Admin': ['admin']
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[sync-employee-roles] Starting request');
    
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create admin client
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

    // Create regular client to verify current user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } }
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('[sync-employee-roles] User authenticated:', user.id);

    // Parse request body
    const body = await req.json();
    const { employeeId, newRole } = body;

    if (!employeeId || !newRole) {
      throw new Error('Missing required fields: employeeId, newRole');
    }

    console.log('[sync-employee-roles] Syncing roles for employee:', employeeId, 'New role:', newRole);

    // Get target RBAC roles based on new employee role
    const targetRoles = EMPLOYEE_TO_RBAC_MAPPING[newRole] || ['staff'];

    // Get current RBAC roles
    const { data: currentRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', employeeId);

    if (rolesError) {
      console.error('[sync-employee-roles] Error fetching current roles:', rolesError);
      throw new Error('Failed to fetch current roles');
    }

    const currentRoleNames = (currentRoles || []).map(r => r.role);
    console.log('[sync-employee-roles] Current roles:', currentRoleNames);

    // Determine roles to add and remove
    const rolesToAdd = targetRoles.filter(r => !currentRoleNames.includes(r));
    const rolesToRemove = currentRoleNames.filter(r => !targetRoles.includes(r) && r !== 'user');

    console.log('[sync-employee-roles] Roles to add:', rolesToAdd);
    console.log('[sync-employee-roles] Roles to remove:', rolesToRemove);

    // Remove old roles
    if (rolesToRemove.length > 0) {
      const { error: removeError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', employeeId)
        .in('role', rolesToRemove);

      if (removeError) {
        console.error('[sync-employee-roles] Error removing roles:', removeError);
      }
    }

    // Add new roles
    for (const role of rolesToAdd) {
      const { error: addError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: employeeId,
          role: role,
          granted_by: user.id,
        });

      if (addError) {
        console.error('[sync-employee-roles] Error adding role:', role, addError);
      }
    }

    console.log('[sync-employee-roles] Roles synced successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Roles synced successfully',
        targetRoles,
        rolesToAdd,
        rolesToRemove
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[sync-employee-roles] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
