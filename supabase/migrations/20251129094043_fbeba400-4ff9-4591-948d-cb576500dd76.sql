-- Clean duplicate task bundles and enforce uniqueness

-- 1) Delete duplicate task_bundles, keeping the oldest per (tenant_id, name, trigger_event)
WITH ranked AS (
  SELECT
    id,
    tenant_id,
    name,
    trigger_event,
    ROW_NUMBER() OVER (
      PARTITION BY tenant_id, name, trigger_event
      ORDER BY created_at NULLS LAST, id
    ) AS rn
  FROM task_bundles
),
duplicates AS (
  SELECT id
  FROM ranked
  WHERE rn > 1
)
DELETE FROM task_bundles tb
USING duplicates d
WHERE tb.id = d.id;

-- 2) Add unique index to prevent future duplicates for the same tenant/name/trigger_event
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_bundles_unique_tenant_name_trigger 
  ON task_bundles (tenant_id, name, trigger_event);