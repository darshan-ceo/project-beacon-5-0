-- Fix RLS infinite recursion on public.user_roles by removing has_role() from user_roles policies
-- and hardening has_role() to bypass RLS safely.

BEGIN;

-- 1) Harden role-check helpers to bypass RLS (prevents policy recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_partner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::public.app_role, 'partner'::public.app_role)
      AND is_active = TRUE
  );
$$;

-- Ensure ownership remains postgres (table owner) for consistent RLS bypass behavior
ALTER FUNCTION public.has_role(uuid, public.app_role) OWNER TO postgres;
ALTER FUNCTION public.is_admin_or_partner(uuid) OWNER TO postgres;

-- 2) Update user_roles RLS policies (no self-referential checks)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins and partners can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins and partners can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins and partners can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins and partners can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins and partners can delete roles" ON public.user_roles;

-- Users can read their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins/partners can read all roles (needed for admin UI)
CREATE POLICY "Admins and partners can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin_or_partner(auth.uid()));

-- Admins/partners can manage roles (split policies avoids ambiguity)
CREATE POLICY "Admins and partners can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_partner(auth.uid()));

CREATE POLICY "Admins and partners can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_admin_or_partner(auth.uid()))
WITH CHECK (public.is_admin_or_partner(auth.uid()));

CREATE POLICY "Admins and partners can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_admin_or_partner(auth.uid()));

COMMIT;
