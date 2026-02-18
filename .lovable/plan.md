

# Generate Consolidated `master-schema.sql`

## What This Does

Combine all 148 migration files from `supabase/migrations/` into a single `master-schema.sql` file at the project root. This was previously approved but not yet created.

## Action

1. Read all 148 migration `.sql` files in chronological order (already done in previous messages)
2. Concatenate them with section headers into one file
3. Write `master-schema.sql` to the project root

## Output Format

```sql
-- =============================================
-- Beacon Database - Master Schema
-- Generated: 2026-02-18
-- Migrations: 148 files combined
-- =============================================

-- Migration: 20251102124158_create_tenants
[contents]

-- Migration: 20251102124250_create_profiles
[contents]

-- ... all 148 migrations ...
```

## How to Use

```bash
createdb beacon_local
psql -U postgres -d beacon_local -f master-schema.sql
psql -U postgres -d beacon_local -f sql-dump-2026-02-18.sql
# Full production replica ready
```

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `master-schema.sql` | Create | Single consolidated schema file from all 148 migrations |

## Notes

- No backend or frontend changes -- this is a static reference file
- All migration contents were already read in the previous session
- File will be large but is essential for local database restoration

