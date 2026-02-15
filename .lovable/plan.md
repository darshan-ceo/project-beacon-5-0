

# Enhance Case Card Row 2: Start Level, Current Level, and Demand

## What Changes

The stage progress row (Row 2) on each case card currently shows only the current stage name with a progress bar. After this change, it will display:

```text
Before:  [Scale icon] Adjudication  ===progress bar===  2/6

After:   [Scale icon] Assessment → Adjudication  ===progress bar===  2/6  |  ₹56.8L
```

- **Start Level**: The stage where the case originally began (e.g., Assessment)
- **Current Level**: Where the case is now (e.g., Adjudication)
- **Demand**: The total demand amount for the current stage, shown inline

## How Start Level is Determined

Since there is no `start_stage` column on the cases table today, the start level will be derived from the `stage_instances` table (the earliest stage_instance per case, sorted by `started_at ASC`). This data will be fetched once when the case list loads, using a single bulk query for all visible cases, and cached in a local map.

## Technical Plan

### Step 1: Add a helper hook or function in `CaseManagement.tsx`

Fetch the earliest stage_instance per case (start level) for all cases in the current filtered list:

```typescript
// Bulk fetch: SELECT DISTINCT ON (case_id) case_id, stage_key 
// FROM stage_instances ORDER BY case_id, started_at ASC
```

This returns a `Map<caseId, startStageKey>` that is used when rendering each case card.

### Step 2: Modify Row 2 in `CaseManagement.tsx` (around lines 1208-1214)

Update the stage progress row to show:

| Element | Source |
|---------|--------|
| Start Level | From stage_instances bulk query (fallback: same as currentStage) |
| Arrow separator | Static " → " text (only shown if start differs from current) |
| Current Level | `caseItem.currentStage` (existing) |
| Progress bar | Existing `getStageProgress()` (unchanged) |
| Fraction | Existing `getStageIndex()` (unchanged) |
| Demand | `caseItem.totalDemand` or `caseItem.taxDemand` formatted as currency |

### Step 3: Demand formatting

Reuse the existing currency formatting pattern already used in the KPI badge (₹XL / ₹XCr format) to show total demand inline after the progress fraction.

### Files to Modify

| File | Change |
|------|--------|
| `src/components/cases/CaseManagement.tsx` | Add bulk start-stage fetch, update Row 2 rendering |

### No Database Changes

Pure frontend enhancement. The `stage_instances` table already has all necessary data.

