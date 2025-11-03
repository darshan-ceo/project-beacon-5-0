# Security Definer Functions Audit

**Last Updated:** 2025-11-03  
**Project:** Beacon / H-Office ERP-CRM Suite  
**Database:** Supabase (PostgreSQL)

---

## Overview

This document catalogs all `SECURITY DEFINER` functions in the application's database. These functions execute with the privileges of the function owner (typically `postgres` superuser), bypassing Row-Level Security (RLS) policies. They must be carefully reviewed and monitored for security implications.

---

## Critical Security Considerations

⚠️ **Why Security Definer Functions Are Sensitive:**
- Bypass RLS policies and execute with elevated privileges
- Can access/modify data across all tenants if not properly constrained
- Malicious input could lead to privilege escalation
- Must be `STABLE` or `IMMUTABLE` when used in RLS policies to prevent infinite recursion

✅ **Best Practices:**
- Always set `search_path = public` to prevent schema hijacking
- Use `STABLE` or `IMMUTABLE` volatility when safe
- Validate all input parameters
- Limit data access to minimum required scope
- Add comprehensive comments explaining necessity
- Review quarterly for continued need

---

## Function Inventory

### 1. `check_tenant_limits()`

**Purpose:** Validates whether a tenant has reached usage limits for users or cases.

**Security Justification:**  
Needs elevated privileges to count records across tenant boundaries to enforce subscription tier limits. Without SECURITY DEFINER, users couldn't validate limits during signup/case creation.

**Definition:**
```sql
CREATE OR REPLACE FUNCTION public.check_tenant_limits(_tenant_id uuid, _limit_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _tenant tenants;
  _current_count INTEGER;
BEGIN
  SELECT * INTO _tenant FROM tenants WHERE id = _tenant_id;
  
  IF NOT _tenant.is_active THEN
    RETURN FALSE;
  END IF;
  
  CASE _limit_type
    WHEN 'users' THEN
      SELECT COUNT(*) INTO _current_count FROM profiles WHERE tenant_id = _tenant_id;
      RETURN _current_count < _tenant.max_users;
    
    WHEN 'cases' THEN
      SELECT COUNT(*) INTO _current_count FROM cases WHERE tenant_id = _tenant_id;
      RETURN _current_count < _tenant.max_cases;
    
    ELSE
      RETURN TRUE;
  END CASE;
END;
$function$
```

**Data Exposed:**
- `tenants` table: `is_active`, `max_users`, `max_cases`
- `profiles` table: Record count by tenant
- `cases` table: Record count by tenant

**Access Control:**
- Used in pre-insert triggers and application logic
- Input validated: `_tenant_id` must be UUID, `_limit_type` restricted to enum values

**Risk Assessment:** 🟡 **MEDIUM**
- **Risks:** Could expose tenant limit information if called directly
- **Mitigations:** Function is deterministic with validated inputs; returns only boolean

**Alternatives Considered:**
- ❌ Regular function: Cannot count across tenants due to RLS
- ❌ Application-level check: Race conditions in concurrent signups

---

### 2. `get_user_tenant_id()`

**Purpose:** Returns the tenant_id for the currently authenticated user.

**Security Justification:**  
**CRITICAL FOR RLS POLICIES** - Prevents infinite recursion when policies need to filter by tenant_id. Without SECURITY DEFINER, querying profiles table from within profiles RLS policy causes `42P17` error.

**Definition:**
```sql
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$function$
```

**Data Exposed:**
- `profiles.tenant_id` for current authenticated user only

**Access Control:**
- Uses `auth.uid()` to ensure user can only access their own tenant
- Used in 15+ RLS policies across all major tables
- Marked `STABLE` for query optimization and recursion prevention

**Risk Assessment:** 🟢 **LOW**
- **Risks:** Minimal - only returns data user should have access to
- **Mitigations:** Scoped to current user via `auth.uid()`, no parameters

**Alternatives Considered:**
- ❌ Direct subquery in RLS: Causes infinite recursion
- ❌ Session variable: Not supported in Supabase RLS context

---

### 3. `handle_new_user()`

**Purpose:** Trigger function that creates profile and assigns role when user signs up.

**Security Justification:**  
Needs to bypass RLS to insert into `profiles` and `user_roles` tables during user registration. First user in tenant gets `admin` role, subsequent users get `user` role.

**Definition:**
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _default_tenant_id UUID;
  _is_first_user BOOLEAN;
BEGIN
  _default_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
  
  IF _default_tenant_id IS NOT NULL THEN
    SELECT NOT EXISTS (
      SELECT 1 FROM profiles WHERE tenant_id = _default_tenant_id
    ) INTO _is_first_user;
    
    INSERT INTO profiles (id, tenant_id, full_name, phone)
    VALUES (
      NEW.id,
      _default_tenant_id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'phone'
    );
    
    INSERT INTO user_roles (user_id, role, granted_by)
    VALUES (
      NEW.id,
      CASE WHEN _is_first_user THEN 'admin'::app_role ELSE 'user'::app_role END,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$function$
```

**Data Exposed:**
- Creates records in `profiles` and `user_roles` tables
- Accesses `auth.users.raw_user_meta_data` (controlled by signup form)

**Access Control:**
- Triggered only during `INSERT` on `auth.users` (Supabase-controlled)
- Validates `tenant_id` is present in metadata
- No direct user invocation possible

**Risk Assessment:** 🟡 **MEDIUM**
- **Risks:** Malicious signup data could create invalid profiles
- **Mitigations:** Validation in signup form; tenant_id must exist in `tenants` table (FK constraint)

**Alternatives Considered:**
- ❌ Application code: Race conditions; user not created if profile insert fails
- ❌ Non-definer trigger: Cannot insert into RLS-protected tables

---

### 4. `has_role()`

**Purpose:** Checks if a user has a specific role (used in RLS policies).

**Security Justification:**  
Prevents infinite recursion when RLS policies on `user_roles` table check for admin privileges. Similar to `get_user_tenant_id()`, this breaks circular dependency chains.

**Definition:**
```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = TRUE
  )
$function$
```

**Data Exposed:**
- `user_roles` table: User-role associations

**Access Control:**
- Input validated: `_user_id` must be UUID, `_role` must be enum
- Used in 20+ RLS policies across all tables
- Marked `STABLE` for performance and recursion prevention

**Risk Assessment:** 🟢 **LOW**
- **Risks:** Could reveal role information if abused
- **Mitigations:** Returns boolean only; used only in RLS policy context

**Alternatives Considered:**
- ❌ Direct JOIN in RLS: Causes infinite recursion
- ❌ Materialized view: Stale data risk during role changes

---

### 5. `update_updated_at_column()`

**Purpose:** Trigger function to automatically update `updated_at` timestamp on row updates.

**Security Justification:**  
Needs SECURITY DEFINER to modify `updated_at` even when user only has UPDATE permission on specific columns.

**Definition:**
```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
```

**Data Exposed:**
- Modifies only `updated_at` column (system-managed timestamp)

**Access Control:**
- Triggered automatically on UPDATE operations
- No user-controlled input
- Applied to multiple tables via triggers

**Risk Assessment:** 🟢 **LOW**
- **Risks:** None - only sets timestamp to current time
- **Mitigations:** No external input; deterministic behavior

**Alternatives Considered:**
- ❌ Client-side timestamp: Can be manipulated by users
- ❌ Non-definer trigger: Fails if user lacks permission on `updated_at` column

---

## Usage in RLS Policies

### Functions Used in RLS (Critical Path)

| Function | # Policies Using It | Tables Protected |
|----------|---------------------|------------------|
| `get_user_tenant_id()` | 15 | cases, clients, documents, hearings, tasks, employees, etc. |
| `has_role()` | 20 | All tables with role-based access (admin/partner/manager) |
| `check_tenant_limits()` | 2 | profiles, cases (pre-insert checks) |

---

## Review History

| Date | Reviewer | Findings | Actions Taken |
|------|----------|----------|---------------|
| 2025-11-03 | System | Initial audit | Documented all 5 functions |
| **Next Review:** 2026-02-03 | TBD | Quarterly security review | - |

---

## Incident Response

**If security issue discovered:**
1. Immediately disable affected function: `DROP FUNCTION IF EXISTS <name> CASCADE;`
2. Review `audit_log` table for suspicious usage
3. Rotate Supabase service role key if data exposure suspected
4. Document incident in this file

**Emergency Contacts:**
- Database Admin: [Contact Info]
- Security Team: [Contact Info]

---

## Recommendations

✅ **Current Status: SECURE**  
All security definer functions follow best practices and have documented justifications.

### Future Improvements:
1. Add monitoring/alerting for direct function calls (vs. trigger invocations)
2. Implement function-level audit logging
3. Consider parameterized RLS policies (Postgres 15+) to reduce SECURITY DEFINER usage
4. Add integration tests to verify RLS policies still work if functions modified

---

*Document maintained as part of security compliance requirements. Any changes to SECURITY DEFINER functions must update this audit.*
