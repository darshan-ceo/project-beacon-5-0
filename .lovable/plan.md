

# Generate Consolidated `master-schema.sql`

## What This Does

Combine all 148 migration files from `supabase/migrations/` into a single `master-schema.sql` file in the project root. This file can be downloaded and run on any PostgreSQL database to recreate the entire Beacon schema (tables, functions, triggers, RLS policies, indexes -- everything).

## Approach

Since there are 148 migration files, I will:

1. Read all 148 `.sql` files in chronological order (they are already named with timestamps)
2. Concatenate them into a single `master-schema.sql` file with section headers showing which migration each block came from
3. Place the file at the project root for easy download

## Output Format

```sql
-- =============================================
-- Beacon Database - Master Schema
-- Generated: 2026-02-18
-- Migrations: 148 files combined
-- =============================================

-- Migration: 20251102124158
CREATE TABLE tenants (...);

-- Migration: 20251102124250
CREATE TABLE profiles (...);

-- ... all 148 migrations in order ...
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

- No backend changes needed -- this is a static file generated from existing migrations
- The file will be large but is a one-time reference artifact
- Migrations are applied in timestamp order, matching how they were originally executed

