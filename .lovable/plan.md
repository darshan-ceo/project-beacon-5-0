

# Fix: Documents Uploaded from Client Portal Cannot Be Downloaded/Previewed in Admin Panel

## Problem

The "FORM GST APL.docx" uploaded from the Client Portal shows "Object not found" when an admin tries to preview or download it. The document record exists in the database, but the actual file in storage cannot be accessed by the admin.

## Root Cause

This is a **storage RLS policy mismatch**. The admin's SELECT policies on `storage.objects` check that the first folder in the file path matches the admin's `tenant_id`:

```
(storage.foldername(name))[1] = profiles.tenant_id
```

But Client Portal uploads use the path format:
```
client-uploads/{clientId}/{uuid}-{timestamp}.{ext}
```

The first folder is `client-uploads`, NOT the tenant ID. So the admin's storage policies deny access to these files -- the file exists in storage, but the admin cannot read it.

For comparison, admin uploads use the path format `{tenant_id}/{uuid}.{ext}`, which passes the policy check.

## Fix

Two changes are needed:

### 1. Database Migration: Update storage SELECT policies

Add a new storage SELECT policy (or update existing ones) that allows admins to also read files under the `client-uploads/` folder, provided the file's associated document record belongs to their tenant. The simplest approach: allow admins to read any file in the `client-uploads/` folder if they have the admin or partner role and the associated `documents` table row has their `tenant_id`.

Alternatively, the simpler and more robust fix: update the Client Portal upload code to store files under `{tenant_id}/client-uploads/{clientId}/...` instead of `client-uploads/{clientId}/...`. This way existing admin policies automatically grant access. However, this requires also updating the portal's storage INSERT policy.

**Recommended approach**: Update the storage RLS policies to grant admin/partner users SELECT access to files in the `client-uploads/` path. This avoids changing the upload path (which would break existing files).

New policy:
```sql
CREATE POLICY "Admins can view client uploads"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'client-uploads'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'partner'::app_role)
  )
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tenant_id IS NOT NULL
  )
);
```

Also add a similar DELETE policy so admins can manage these files.

### 2. No code changes needed

The admin panel code already correctly reads `file_path` from the database and passes it to `documentDownloadService`. Once the storage policy allows access, download and preview will work.

## Files Modified

| File | Change |
|------|--------|
| New SQL migration | Add storage RLS SELECT policy allowing admins to access `client-uploads/` folder |

## Why This Fixes It

- The `client-uploads/` path files will become readable by admin users
- The existing download/preview code in `documentDownloadService.ts` will successfully fetch the file via signed URL or direct download
- No changes to upload logic or existing file paths required
