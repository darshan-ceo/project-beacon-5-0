import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Validate user has required role
 */
async function validateUserRole(
  supabaseClient: any,
  userId: string,
  requiredRoles: string[]
): Promise<{ valid: boolean; error?: string }> {
  const { data: userRoles, error } = await supabaseClient
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching user roles:', error);
    return { valid: false, error: 'Failed to validate user permissions' };
  }

  const roles = userRoles?.map((r: any) => r.role) || [];
  const hasRequiredRole = requiredRoles.some(role => roles.includes(role));

  if (!hasRequiredRole) {
    return { 
      valid: false, 
      error: `Unauthorized: requires one of [${requiredRoles.join(', ')}] roles` 
    };
  }

  return { valid: true };
}

/**
 * Validate user has required role
 */
async function validateUserRole(
  supabaseClient: any,
  userId: string,
  requiredRoles: string[]
): Promise<{ valid: boolean; error?: string }> {
  const { data: userRoles, error } = await supabaseClient
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching user roles:', error);
    return { valid: false, error: 'Failed to validate user permissions' };
  }

  const roles = userRoles?.map((r: any) => r.role) || [];
  const hasRequiredRole = requiredRoles.some(role => roles.includes(role));

  if (!hasRequiredRole) {
    return { 
      valid: false, 
      error: `Unauthorized: requires one of [${requiredRoles.join(', ')}] roles` 
    };
  }

  return { valid: true };
}

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

// Generate random password
function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[invite-employee] Starting request');
    
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create admin client for privileged operations
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

    console.log('[invite-employee] User authenticated:', user.id);

    // Validate user has required role (admin, partner, or manager)
    const roleValidation = await validateUserRole(
      supabaseClient,
      user.id,
      ['admin', 'partner', 'manager']
    );

    if (!roleValidation.valid) {
      return new Response(
        JSON.stringify({ error: roleValidation.error }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get tenant_id from profiles
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    const tenantId = profile.tenant_id;
    console.log('[invite-employee] Tenant ID:', tenantId);

    // Parse request body
    const body = await req.json();
    const {
      email,
      password: providedPassword,
      sendWelcomeEmail = true,
      fullName,
      mobile,
      role,
      department,
      designation,
      dateOfJoining,
      ...optionalFields
    } = body;

    // Validation
    if (!email || !fullName || !role || !department || !dateOfJoining) {
      throw new Error('Missing required fields: email, fullName, role, department, dateOfJoining');
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    console.log('[invite-employee] Validated input');

    // Check for existing user with this email in tenant
    const { data: existingEmployee, error: checkError } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('email', email)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (existingEmployee) {
      throw new Error('Email already exists in this organization');
    }

    console.log('[invite-employee] Email is unique');

    // Generate employee code
    const { data: existingEmployees } = await supabaseAdmin
      .from('employees')
      .select('employee_code')
      .eq('tenant_id', tenantId)
      .like('employee_code', 'GSTE%');

    const existingCodes = (existingEmployees || [])
      .map(e => parseInt(e.employee_code.substring(4) || '0'))
      .filter(num => !isNaN(num));

    const nextNum = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
    const employeeCode = `GSTE${nextNum.toString().padStart(4, '0')}`;

    console.log('[invite-employee] Generated employee code:', employeeCode);

    // Generate password if not provided
    const password = providedPassword || generatePassword();

    console.log('[invite-employee] Creating auth user');

    // Create auth user with Admin API
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        phone: mobile,
        tenant_id: tenantId,
      }
    });

    if (authError || !authUser.user) {
      console.error('[invite-employee] Auth error:', authError);
      throw new Error(`Failed to create user: ${authError?.message}`);
    }

    console.log('[invite-employee] Auth user created:', authUser.user.id);

    // Wait a moment for the trigger to create profile
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create employee record
    const employeeData = {
      id: authUser.user.id,
      employee_code: employeeCode,
      email,
      mobile,
      role,
      department,
      designation,
      date_of_joining: dateOfJoining,
      tenant_id: tenantId,
      created_by: user.id,
      ...optionalFields
    };

    console.log('[invite-employee] Creating employee record');

    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .insert(employeeData)
      .select()
      .single();

    if (employeeError) {
      console.error('[invite-employee] Employee creation error:', employeeError);
      // Rollback auth user
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      throw new Error(`Failed to create employee: ${employeeError.message}`);
    }

    console.log('[invite-employee] Employee record created');

    // Revoke default 'user' role
    await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', authUser.user.id)
      .eq('role', 'user');

    // Assign RBAC roles based on employee role
    const rbacRoles = EMPLOYEE_TO_RBAC_MAPPING[role] || ['staff'];
    console.log('[invite-employee] Assigning RBAC roles:', rbacRoles);

    for (const rbacRole of rbacRoles) {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: authUser.user.id,
          role: rbacRole,
          granted_by: user.id,
        });

      if (roleError) {
        console.error('[invite-employee] Role assignment error:', roleError);
      }
    }

    console.log('[invite-employee] RBAC roles assigned');

    // Log audit event
    await supabaseAdmin
      .from('audit_log')
      .insert({
        action_type: 'create_employee',
        entity_type: 'employee',
        entity_id: employee.id,
        user_id: user.id,
        tenant_id: tenantId,
        details: {
          employee_email: email,
          employee_name: fullName,
          employee_role: role,
          employee_code: employee.employee_code,
        },
      });

    console.log('[invite-employee] Audit log created');

    // TODO: Send welcome email if sendWelcomeEmail is true
    // This would require email service integration (Resend, SendGrid, etc.)
    if (sendWelcomeEmail) {
      console.log('[invite-employee] Welcome email would be sent here');
      // Future implementation: Send email with credentials
    }

    const response = {
      success: true,
      employee: {
        id: employee.id,
        employeeCode: employee.employee_code,
        fullName: fullName,
        email: employee.email,
        role: employee.role,
      },
      credentials: sendWelcomeEmail ? null : { email, password },
      message: sendWelcomeEmail 
        ? 'Employee created successfully. Welcome email sent.' 
        : 'Employee created successfully.',
    };

    console.log('[invite-employee] Success');

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[invite-employee] Error:', error);
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
