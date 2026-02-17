
# Full Database Dump to Storage Bucket

## What This Does
Creates a backend function that exports all 76 tables as a single JSON file and saves it to the existing `import-exports` storage bucket.

## Approach

### Step 1: Create Edge Function `database-dump`

A new backend function at `supabase/functions/database-dump/index.ts` that:

1. Connects to the database using the service role key (bypasses RLS to get all tenant data)
2. Iterates through all public schema tables
3. Queries each table with pagination (handling the 1000-row limit)
4. Builds a JSON object: `{ table_name: [rows...], ... }`
5. Includes metadata: timestamp, row counts per table, total rows
6. Uploads the resulting JSON file to the `import-exports` bucket with path `dumps/full-dump-{timestamp}.json`
7. Returns the file path and summary statistics

### Step 2: Security

- The function will require authentication (valid JWT)
- Only users with `admin` role can trigger a dump
- The dump file is stored in the private `import-exports` bucket (not publicly accessible)

### Output Format

```json
{
  "metadata": {
    "exported_at": "2026-02-16T20:30:00Z",
    "environment": "production",
    "total_tables": 76,
    "total_rows": 2800,
    "tables_summary": {
      "audit_log": { "rows": 1290, "columns": 11 },
      "cases": { "rows": 13, "columns": 48 }
    }
  },
  "data": {
    "tenants": [...],
    "profiles": [...],
    "employees": [...],
    "clients": [...],
    "cases": [...],
    "tasks": [...],
    "documents": [...],
    "hearings": [...]
  }
}
```

### Step 3: Trigger and Download

After the function is deployed, you can:
1. Call it from the app (or I can add a button in Settings/Admin)
2. Download the JSON file from the `import-exports` bucket

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/database-dump/index.ts` | Create -- edge function that queries all tables and uploads JSON to storage |

## No Database Changes
No migrations needed. Uses existing `import-exports` bucket and existing service role key secret.

## Important Notes
- The dump runs with service role privileges so it captures ALL tenant data across all tables
- The 1000-row Supabase query limit is handled by paginating through larger tables (audit_log has ~1,290 rows)
- Sensitive auth data (passwords, tokens) from `auth.users` is NOT included -- only `public` schema tables
- File size estimate: ~2-5 MB for current data volume
