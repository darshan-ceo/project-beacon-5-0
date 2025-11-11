-- Phase 4: Storage bucket policies for 'documents' bucket
-- Ensure documents bucket exists (idempotent)
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- DROP existing policies if they exist (clean slate)
drop policy if exists "tenant_can_upload_documents" on storage.objects;
drop policy if exists "tenant_can_read_documents" on storage.objects;
drop policy if exists "admins_can_delete_documents" on storage.objects;

-- Policy: Users can upload documents to their tenant folder
create policy "tenant_can_upload_documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'documents'
  and split_part(name, '/', 1) = (
    select tenant_id::text
    from public.profiles
    where id = auth.uid()
  )
);

-- Policy: Users can read documents from their tenant folder
create policy "tenant_can_read_documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'documents'
  and split_part(name, '/', 1) = (
    select tenant_id::text
    from public.profiles
    where id = auth.uid()
  )
);

-- Policy: Admins can delete documents from their tenant folder
create policy "admins_can_delete_documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'documents'
  and split_part(name, '/', 1) = (
    select tenant_id::text
    from public.profiles
    where id = auth.uid()
  )
  and has_role(auth.uid(), 'admin')
);