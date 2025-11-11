-- Phase 2: Storage bucket policies for 'documents'
-- Allow authenticated users to upload documents to their tenant path
create policy "tenant_can_upload_documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'documents'
  and split_part(name, '/', 1) = (get_user_tenant_id())::text
);

-- Allow authenticated users to read documents from their tenant path
create policy "tenant_can_read_documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'documents'
  and split_part(name, '/', 1) = (get_user_tenant_id())::text
);

-- Allow admins to delete documents in their tenant
create policy "admins_can_delete_documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'documents'
  and split_part(name, '/', 1) = (get_user_tenant_id())::text
  and has_role(auth.uid(), 'admin')
);

-- Phase 3: RBAC Management tables
-- Permissions catalog
create table if not exists public.permissions (
  key text primary key,
  module text not null,
  action text not null,
  description text
);

-- Role-permission mapping
create table if not exists public.role_permissions (
  role app_role not null,
  permission_key text not null references public.permissions(key) on delete cascade,
  created_at timestamptz default now(),
  primary key (role, permission_key)
);

-- Enable RLS on RBAC tables
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;

-- Policies: read for all authenticated, mutate only admins
create policy "auth_can_read_permissions"
on public.permissions for select to authenticated using (true);

create policy "admin_manage_permissions"
on public.permissions for all to authenticated
using (has_role(auth.uid(), 'admin'))
with check (has_role(auth.uid(), 'admin'));

create policy "auth_can_read_role_permissions"
on public.role_permissions for select to authenticated using (true);

create policy "admin_manage_role_permissions"
on public.role_permissions for all to authenticated
using (has_role(auth.uid(), 'admin'))
with check (has_role(auth.uid(), 'admin'));

-- Phase 4: Utility function to ensure user has a role
create or replace function public.ensure_user_role(_user_id uuid, _role app_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into user_roles (user_id, role, granted_by, is_active)
  values (_user_id, _role, _user_id, true)
  on conflict (user_id, role) do nothing;
end;
$$;

-- Seed minimal permissions
insert into public.permissions (key, module, action, description) values
  ('clients.read', 'clients', 'read', 'View client information'),
  ('clients.create', 'clients', 'create', 'Create new clients'),
  ('clients.update', 'clients', 'update', 'Update client information'),
  ('clients.delete', 'clients', 'delete', 'Delete clients'),
  ('cases.read', 'cases', 'read', 'View case information'),
  ('cases.create', 'cases', 'create', 'Create new cases'),
  ('cases.update', 'cases', 'update', 'Update case information'),
  ('cases.delete', 'cases', 'delete', 'Delete cases'),
  ('tasks.read', 'tasks', 'read', 'View tasks'),
  ('tasks.create', 'tasks', 'create', 'Create new tasks'),
  ('tasks.update', 'tasks', 'update', 'Update tasks'),
  ('tasks.delete', 'tasks', 'delete', 'Delete tasks'),
  ('documents.read', 'documents', 'read', 'View documents'),
  ('documents.create', 'documents', 'create', 'Upload documents'),
  ('documents.update', 'documents', 'update', 'Update document metadata'),
  ('documents.delete', 'documents', 'delete', 'Delete documents'),
  ('hearings.read', 'hearings', 'read', 'View hearing information'),
  ('hearings.create', 'hearings', 'create', 'Schedule hearings'),
  ('hearings.update', 'hearings', 'update', 'Update hearing details'),
  ('hearings.delete', 'hearings', 'delete', 'Delete hearings'),
  ('employees.read', 'employees', 'read', 'View employee information'),
  ('employees.create', 'employees', 'create', 'Create employee records'),
  ('employees.update', 'employees', 'update', 'Update employee information'),
  ('employees.delete', 'employees', 'delete', 'Delete employee records'),
  ('courts.read', 'courts', 'read', 'View court information'),
  ('courts.create', 'courts', 'create', 'Create court records'),
  ('courts.update', 'courts', 'update', 'Update court information'),
  ('courts.delete', 'courts', 'delete', 'Delete court records'),
  ('judges.read', 'judges', 'read', 'View judge information'),
  ('judges.create', 'judges', 'create', 'Create judge records'),
  ('judges.update', 'judges', 'update', 'Update judge information'),
  ('judges.delete', 'judges', 'delete', 'Delete judge records'),
  ('rbac.read', 'rbac', 'read', 'View roles and permissions'),
  ('rbac.manage', 'rbac', 'manage', 'Manage roles and permissions')
on conflict (key) do nothing;

-- Seed default role_permissions
insert into public.role_permissions (role, permission_key) values
  -- Admin: all permissions
  ('admin', 'clients.read'), ('admin', 'clients.create'), ('admin', 'clients.update'), ('admin', 'clients.delete'),
  ('admin', 'cases.read'), ('admin', 'cases.create'), ('admin', 'cases.update'), ('admin', 'cases.delete'),
  ('admin', 'tasks.read'), ('admin', 'tasks.create'), ('admin', 'tasks.update'), ('admin', 'tasks.delete'),
  ('admin', 'documents.read'), ('admin', 'documents.create'), ('admin', 'documents.update'), ('admin', 'documents.delete'),
  ('admin', 'hearings.read'), ('admin', 'hearings.create'), ('admin', 'hearings.update'), ('admin', 'hearings.delete'),
  ('admin', 'employees.read'), ('admin', 'employees.create'), ('admin', 'employees.update'), ('admin', 'employees.delete'),
  ('admin', 'courts.read'), ('admin', 'courts.create'), ('admin', 'courts.update'), ('admin', 'courts.delete'),
  ('admin', 'judges.read'), ('admin', 'judges.create'), ('admin', 'judges.update'), ('admin', 'judges.delete'),
  ('admin', 'rbac.read'), ('admin', 'rbac.manage'),
  -- Manager: read/create/update on primary modules
  ('manager', 'clients.read'), ('manager', 'clients.create'), ('manager', 'clients.update'),
  ('manager', 'cases.read'), ('manager', 'cases.create'), ('manager', 'cases.update'),
  ('manager', 'tasks.read'), ('manager', 'tasks.create'), ('manager', 'tasks.update'),
  ('manager', 'documents.read'), ('manager', 'documents.create'), ('manager', 'documents.update'),
  ('manager', 'hearings.read'), ('manager', 'hearings.create'), ('manager', 'hearings.update'),
  ('manager', 'employees.read'),
  ('manager', 'courts.read'), ('manager', 'judges.read'),
  -- Partner: similar to manager
  ('partner', 'clients.read'), ('partner', 'clients.create'), ('partner', 'clients.update'),
  ('partner', 'cases.read'), ('partner', 'cases.create'), ('partner', 'cases.update'),
  ('partner', 'tasks.read'), ('partner', 'tasks.create'), ('partner', 'tasks.update'),
  ('partner', 'documents.read'), ('partner', 'documents.create'), ('partner', 'documents.update'),
  ('partner', 'hearings.read'), ('partner', 'hearings.create'), ('partner', 'hearings.update'),
  ('partner', 'employees.read'),
  ('partner', 'courts.read'), ('partner', 'judges.read'),
  -- CA/Advocate: read clients/cases/documents, upload documents
  ('ca', 'clients.read'), ('ca', 'cases.read'), ('ca', 'tasks.read'),
  ('ca', 'documents.read'), ('ca', 'documents.create'),
  ('ca', 'hearings.read'), ('ca', 'courts.read'), ('ca', 'judges.read'),
  ('advocate', 'clients.read'), ('advocate', 'cases.read'), ('advocate', 'tasks.read'),
  ('advocate', 'documents.read'), ('advocate', 'documents.create'),
  ('advocate', 'hearings.read'), ('advocate', 'courts.read'), ('advocate', 'judges.read'),
  -- User/Staff: read + create on tasks/documents, read on clients/cases
  ('user', 'clients.read'), ('user', 'cases.read'),
  ('user', 'tasks.read'), ('user', 'tasks.create'),
  ('user', 'documents.read'), ('user', 'documents.create'),
  ('user', 'hearings.read'), ('user', 'courts.read'), ('user', 'judges.read'),
  ('staff', 'clients.read'), ('staff', 'cases.read'),
  ('staff', 'tasks.read'), ('staff', 'tasks.create'),
  ('staff', 'documents.read'), ('staff', 'documents.create'),
  ('staff', 'hearings.read'), ('staff', 'courts.read'), ('staff', 'judges.read'),
  -- Clerk: minimal read + document upload
  ('clerk', 'documents.read'), ('clerk', 'documents.create'),
  ('clerk', 'tasks.read'), ('clerk', 'cases.read')
on conflict (role, permission_key) do nothing;