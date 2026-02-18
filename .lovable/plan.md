

# Create `export-sql-dump` Edge Function

## Purpose

Generate a complete `.sql` file with INSERT statements for all production data, so you can download it and run it on any local PostgreSQL database to get a full working copy.

## What It Does

The function will:

1. Authenticate the caller (admin/partner only -- same as existing `database-dump`)
2. Fetch all rows from all 76 tables using paginated queries
3. Convert each row into a proper SQL `INSERT INTO ... VALUES (...)` statement
4. Handle all PostgreSQL data types correctly (strings, NULLs, UUIDs, JSONB, arrays, booleans, timestamps)
5. Order tables by foreign key dependencies (tenants first, then profiles, then cases, etc.)
6. Wrap everything in a transaction with triggers disabled for clean import
7. Upload the `.sql` file to the `import-exports` bucket
8. Automatically generate a signed download URL (valid 1 hour) in the response

## Output File Format

```sql
-- Beacon Database Data Export
-- Generated: 2026-02-18T...
-- Tables: 76 | Total Rows: XXXX

BEGIN;
SET session_replication_role = 'replica'; -- Disable triggers during import

-- Table: tenants (X rows)
INSERT INTO public.tenants (id, name, ...) VALUES ('uuid-...', 'Tenant Name', ...);

-- Table: profiles (X rows)
INSERT INTO public.profiles (id, tenant_id, ...) VALUES ('uuid-...', 'uuid-...', ...);

-- ... all 76 tables in dependency order ...

SET session_replication_role = 'origin'; -- Re-enable triggers
COMMIT;
```

## How to Use Locally

After downloading the file:

```bash
# If you already have the schema set up (from migrations):
psql -U postgres -d beacon_local -f data-dump-2026-02-18.sql

# That's it - all your production data is now in your local database
```

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/export-sql-dump/index.ts` | Create | New function that generates SQL INSERT dump |
| `supabase/config.toml` | Update | Register function with `verify_jwt = true` |

## Technical Details

### Table Dependency Order

Tables are ordered so parent tables are inserted before child tables:

1. `tenants` -- no dependencies
2. `profiles`, `employees` -- depend on tenants
3. `clients`, `courts`, `matter_types`, `issue_types` -- depend on tenants
4. `cases` -- depends on clients, employees
5. `tasks`, `hearings`, `documents` -- depend on cases
6. All remaining tables

### SQL Value Escaping

- **Strings**: Single quotes escaped (`O'Brien` becomes `'O''Brien'`)
- **NULL**: Literal `NULL`
- **Booleans**: `TRUE` / `FALSE`
- **Numbers**: Raw numeric values
- **UUIDs**: Quoted strings `'550e8400-...'`
- **JSONB/Objects**: `'{"key":"value"}'::jsonb`
- **Arrays**: `ARRAY['a','b']` or `'{a,b}'`
- **Timestamps**: `'2026-02-18T10:30:00.000Z'`

### Auth Pattern

Identical to existing `database-dump` function:
- Verifies JWT via user client
- Checks `user_roles` table for `admin` or `partner` role
- Uses service role client for data access

### Response

```json
{
  "success": true,
  "signedUrl": "https://...signed-url-valid-1-hour...",
  "file_path": "dumps/sql-dump-2026-02-18T...",
  "total_tables": 76,
  "total_rows": 1234,
  "tables_summary": { "tenants": { "rows": 2 }, "cases": { "rows": 150 }, ... }
}
```

After deployment, I will call the function and give you the direct download link.

