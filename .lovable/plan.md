

# Fix Database Constraint for Inquiry Status Flow

## Problem Identified

The database has a CHECK constraint `chk_lead_status` on the `client_contacts` table that only allows these values:

```sql
CHECK (lead_status IS NULL OR lead_status = ANY (ARRAY['new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost']))
```

Our new 4-status inquiry flow uses different values that the database rejects:

| New Status | Allowed by DB? |
|------------|----------------|
| `new` | Yes |
| `follow_up` | No - causes error |
| `converted` | No - causes error |
| `not_proceeding` | No - causes error |

## Solution

Update the database CHECK constraint to allow the new status values while maintaining backward compatibility with existing data.

### Step 1: Alter Database Constraint

Drop the existing constraint and create a new one that allows both old and new values:

```sql
-- Drop the old constraint
ALTER TABLE client_contacts DROP CONSTRAINT chk_lead_status;

-- Create new constraint with all valid values
ALTER TABLE client_contacts ADD CONSTRAINT chk_lead_status CHECK (
  lead_status IS NULL OR lead_status = ANY (ARRAY[
    -- New 4-status flow
    'new',
    'follow_up', 
    'converted',
    'not_proceeding',
    -- Legacy values (for backward compatibility)
    'contacted',
    'qualified', 
    'proposal_sent',
    'negotiation',
    'won',
    'lost'
  ])
);
```

### Step 2: (Optional) Migrate Existing Data

If there's existing data with old status values, migrate them to new values:

```sql
-- Map old statuses to new ones
UPDATE client_contacts SET lead_status = 'follow_up' WHERE lead_status IN ('contacted', 'qualified', 'proposal_sent', 'negotiation');
UPDATE client_contacts SET lead_status = 'converted' WHERE lead_status = 'won';
UPDATE client_contacts SET lead_status = 'not_proceeding' WHERE lead_status = 'lost';
```

## Files Changed

| File | Change |
|------|--------|
| Database Migration | Update `chk_lead_status` constraint |

## Expected Outcome

After the constraint is updated:
- Clicking "New" status - Works (already works)
- Clicking "Follow-up" status - Will work (currently fails)
- Clicking "Converted" status - Will work (currently fails)
- Clicking "Not Proceeding" status - Will work (currently fails)

