

# Fix Reply Data Leaking Across Stages

## Problem
Replies added under one stage (e.g., Adjudication) also appear under other stages (e.g., Assessment). All other modules (Notices, Hearings, Closures) work correctly because they are filtered by `stage_instance_id`.

## Root Cause
In `useStageWorkflow.ts` (lines 153-163), the `refresh` function loads replies using `getRepliesByNotice(noticeId)` for each notice. This method queries by `notice_id` only and does NOT filter by `stage_instance_id`. If a reply was saved without a proper `stage_instance_id`, or if there is any data linkage issue, replies from other stages leak through.

## Fix (1 file change)

### `src/hooks/useStageWorkflow.ts`

Replace the per-notice reply loading logic (lines 153-163) with a single call to `stageRepliesService.getRepliesByStageInstance(resolvedInstanceId)`, which fetches only replies scoped to the current stage instance. Then group the results by `notice_id` to populate the `noticeReplies` Map.

**Before:**
```typescript
const replyPromises = state.notices.map(n => 
  stageRepliesService.getRepliesByNotice(n.id)
    .then(replies => ({ noticeId: n.id, replies }))
);
const allReplies = await Promise.all(replyPromises);
```

**After:**
```typescript
const stageReplies = await stageRepliesService.getRepliesByStageInstance(resolvedInstanceId);
// Group by notice_id for the Map
const grouped = new Map<string, StageReply[]>();
stageReplies.forEach(r => {
  const list = grouped.get(r.notice_id) || [];
  list.push(r);
  grouped.set(r.notice_id, list);
});
```

This ensures only replies belonging to the current stage instance are shown, matching the behavior of Notices, Hearings, and Closures.

## Why This Works
- `getRepliesByStageInstance` queries `stage_replies` with `.eq('stage_instance_id', stageInstanceId)`, which is the correct stage-scoped filter
- The `noticeReplies` Map and `allRepliesForStage` memo in `CaseLifecycleFlow.tsx` will automatically reflect only stage-scoped data
- No changes needed to the UI components or other files

