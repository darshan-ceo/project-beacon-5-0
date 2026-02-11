

# Fix: Remove Non-Existent `judge_ids` from Hearing Fields Whitelist

## Problem

The error message is: **"Could not find the 'judge_ids' column of 'hearings' in the schema cache"**

The `judge_ids` column does not exist in the `hearings` database table. It was incorrectly added to the `validHearingFields` whitelist in the previous fix. When a hearing is saved, the adapter includes `judge_ids` in the payload, causing the database to reject the entire INSERT.

## Actual Database Columns

The `hearings` table has these columns:
`id`, `tenant_id`, `case_id`, `hearing_date`, `court_name`, `judge_name`, `status`, `notes`, `outcome`, `next_hearing_date`, `created_at`, `updated_at`, `forum_id`, `authority_id`, `court_id`, `order_file_path`, `order_file_url`, `outcome_text`, `is_demo`, `demo_batch_id`, `stage_instance_id`, `notice_id`, `hearing_purpose`, `hearing_outcome`, `hearing_type`

## Fix

**File**: `src/data/adapters/SupabaseAdapter.ts` (line 1766)

Update the whitelist to match actual database columns exactly:

- **Remove**: `judge_ids` (does not exist in the table)
- **Add missing**: `notice_id`, `order_file_path`, `order_file_url`, `demo_batch_id`

```typescript
const validHearingFields = [
  'id', 'case_id', 'hearing_date', 'next_hearing_date', 'status', 'notes', 
  'outcome', 'outcome_text', 'forum_id', 'authority_id', 'court_id', 
  'court_name', 'judge_name', 'hearing_type', 'hearing_purpose', 
  'hearing_outcome', 'stage_instance_id', 'notice_id', 'order_file_path', 
  'order_file_url', 'is_demo', 'demo_batch_id', 
  'created_at', 'updated_at', 'tenant_id'
];
```

## Impact

- Single line change in `src/data/adapters/SupabaseAdapter.ts`
- No database migration needed
- Hearings will save successfully with all valid fields including `hearing_type`
