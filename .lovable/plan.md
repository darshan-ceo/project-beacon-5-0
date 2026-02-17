

# Fix Database Dump Download + New Project Creation Guide

## Problem 1: Cannot Download from Private Bucket

The Lovable Cloud storage UI does not yet support downloading files from private buckets. The `import-exports` bucket is private (correct for security), but this blocks you from downloading your dump.

### Solution: Create a Download Endpoint

We will create a new backend function `download-dump` that:
- Authenticates the user (admin only)
- Generates a signed URL for the dump file (valid for 1 hour)
- Returns the URL so you can open it in your browser and download directly

**File to create:** `supabase/functions/download-dump/index.ts`

```text
Flow:
  User (admin) --> calls /download-dump?file=dumps/full-dump-...json
                --> function verifies admin role
                --> generates signed URL from import-exports bucket
                --> returns URL
                --> user opens URL in browser = file downloads
```

After deployment, I will call the function for you and provide the direct download link.

### Alternative (simpler): Make bucket temporarily public

We could temporarily make the `import-exports` bucket public, download the file, then make it private again. However, the signed URL approach is safer and reusable.

## Problem 2: Steps to Create "Beacon SaaS Edition" from GitHub

Once your GitHub repository is connected (you already have it at `darshan-ceo/project-beacon-5-...` based on your browser tab), here are the exact steps:

### Step-by-Step Guide

**Step 1: Verify GitHub Connection (Already Done)**
Your screenshot shows a GitHub tab is open. Confirm the repository has all your code pushed.

**Step 2: Create New Lovable Project**
1. Go to [lovable.dev](https://lovable.dev)
2. Click "New Project"
3. Select "Import from GitHub"
4. Choose your `project-beacon-5-0` repository
5. Name the new project "Beacon SaaS Edition"
6. Click Create

**Step 3: Wait for Build**
Lovable will pull all source code from GitHub and build the frontend. This may take a few minutes for a project this size.

**Step 4: Enable Lovable Cloud on New Project**
The new project gets its own fresh backend (separate database, storage, secrets). Go to Cloud settings in the new project to verify it is enabled.

**Step 5: Replay Database Migrations**
This is the critical step. Your `supabase/migrations/` folder contains 140+ SQL files that define your entire schema. In the new project:

1. Open the Cloud view and go to the SQL editor
2. The migrations should replay automatically when Cloud is enabled (Lovable processes migration files on setup)
3. If they do not auto-apply, you can run them manually in sequence via the SQL editor
4. Verify by checking the Database tab -- all 76 tables should appear

**Step 6: Import Production Data**
1. Upload the dump JSON file (the one we are about to help you download) to the new project's `import-exports` bucket
2. Create or copy the `database-dump` function to the new project (it will already be in the code from GitHub)
3. We will build a `database-restore` function to read the JSON and insert data back into all tables

**Step 7: Re-enter Secrets**
In the new project, go to Cloud > Secrets and add these 11 non-auto-configured keys:

| Secret | Purpose |
|--------|---------|
| OPENAI_API_KEY | AI features |
| MASTERGST_CLIENT_SECRET | GST lookup |
| MASTERGST_CLIENT_ID | GST lookup |
| MASTERGST_EMAIL | GST auth |
| WHATSAPP_INSTANCE_ID | WhatsApp |
| SMS_API_KEY | SMS |
| SMS_DLT_ENTITY_ID | SMS DLT |
| SMS_PROVIDER | SMS provider |
| SMS_SENDER_ID | SMS sender |
| RESEND_API_KEY | Email |
| LOVABLE_API_KEY | Lovable integration |

**Step 8: Verify**
- Check all 76 tables exist with data
- Test login and basic workflows
- Verify edge functions are deployed (they deploy automatically from code)

## Technical Implementation

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/download-dump/index.ts` | Signed URL generator for private bucket files |

### Files to Update

| File | Change |
|------|--------|
| `supabase/config.toml` | Register `download-dump` function with `verify_jwt = true` |

### How the Download Function Works

1. Accepts a `file` query parameter (the path within the bucket)
2. Verifies the caller is an authenticated admin
3. Uses the service role to call `storage.from('import-exports').createSignedUrl()`
4. Returns the signed URL (valid 1 hour)
5. You paste the URL in your browser to download

## Summary

| Action | Status |
|--------|--------|
| Database dump exists | Done |
| GitHub connected | Done (verify) |
| Secrets documented | Done |
| Download dump file | Needs `download-dump` function (this plan) |
| Create new project | Manual steps provided above |
| Replay migrations | Automatic on Cloud setup |
| Import data | Will need `database-restore` function (future step) |
| Re-enter secrets | Manual, list provided |

