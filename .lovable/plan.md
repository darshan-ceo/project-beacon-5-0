
# Fix: "Generate Tasks" Creates 0 Tasks in Notice Intake Wizard

## Problem

Step 9 ("Stage & Task Generation") shows a list of tasks like "Draft Reply", "Collect Supporting Documents", etc. These are **hardcoded in `StageAwarenessStep.tsx`** based on the selected notice classification (SCN, Reminder, Hearing, Order). They are purely cosmetic previews.

When "Generate Tasks" is clicked, `handleGenerateTasks` in `NoticeIntakeWizardV2.tsx` calls `taskBundleTriggerService.triggerTaskBundles()`, which searches for **configured task bundles in the database**. Since no bundles have been configured for the trigger/stage combination, 0 tasks are returned and 0 tasks are created.

**The displayed tasks and the generated tasks are completely disconnected.**

## Root Cause

- `StageAwarenessStep.tsx` has a `STAGE_OPTIONS` array with hardcoded task names per classification
- `handleGenerateTasks` ignores these entirely and delegates to `taskBundleTriggerService`
- The `tasksToGenerate` prop is passed as `[]` and never used
- `taskBundleTriggerService.getFootprints()` is stubbed (returns `[]`) so idempotency is broken too

## Fix

Modify `handleGenerateTasks` in `NoticeIntakeWizardV2.tsx` to:

1. **First**, attempt task bundle trigger (existing behavior -- for users who have configured bundles)
2. **If 0 tasks created from bundles**, fall back to creating tasks from the hardcoded `STAGE_OPTIONS` task list based on the current `stageTag`
3. Use `tasksService.create()` directly (consistent with the centralized service pattern) to persist each task to the database and dispatch to state

### Implementation Details

**File: `src/components/notices/NoticeIntakeWizardV2.tsx`**

Import the `STAGE_OPTIONS` task definitions (or duplicate them inline) and update `handleGenerateTasks`:

```typescript
// Hardcoded fallback tasks matching StageAwarenessStep.tsx STAGE_OPTIONS
const STAGE_TASK_DEFINITIONS: Record<string, Array<{ title: string; priority: string }>> = {
  SCN: [
    { title: 'Draft Reply', priority: 'High' },
    { title: 'Collect Supporting Documents', priority: 'Medium' },
    { title: 'Review & Approval', priority: 'High' },
    { title: 'File Response', priority: 'Critical' }
  ],
  Reminder: [
    { title: 'Review Requirements', priority: 'Medium' },
    { title: 'Prepare Response', priority: 'High' },
    { title: 'Submit Compliance', priority: 'High' }
  ],
  Hearing: [
    { title: 'Prepare Hearing Brief', priority: 'High' },
    { title: 'Organize Documents', priority: 'Medium' },
    { title: 'Hearing Attendance', priority: 'Critical' },
    { title: 'Record Proceedings', priority: 'Medium' }
  ],
  Order: [
    { title: 'Analyze Order', priority: 'High' },
    { title: 'Calculate Appeal Timeline', priority: 'Critical' },
    { title: 'Draft Appeal (if applicable)', priority: 'High' },
    { title: 'Compliance Action', priority: 'Medium' }
  ]
};
```

Update `handleGenerateTasks`:

```typescript
const handleGenerateTasks = async () => {
  if (!createdCaseId) return;

  setIsLoading(true);
  try {
    const caseData = selectedCase || (state.cases || []).find(c => c.id === createdCaseId);
    const currentStage = caseData?.currentStage || 'Assessment';

    // 1. Try task bundles first (for configured bundles)
    let totalCreated = 0;
    try {
      const result = await taskBundleTriggerService.triggerTaskBundles(
        { id: createdCaseId, currentStage, clientId, caseNumber: caseData?.caseNumber || '', assignedToId: assignedToId || '', assignedToName: 'Assigned User' },
        mode === 'new_case' ? 'case_created' : 'notice_added',
        currentStage,
        dispatch
      );
      totalCreated = result.totalTasksCreated;
    } catch (e) {
      console.warn('[Wizard] Bundle trigger failed, falling back to stage tasks', e);
    }

    // 2. If no bundle tasks, create from hardcoded stage definitions
    if (totalCreated === 0) {
      const fallbackTasks = STAGE_TASK_DEFINITIONS[stageTag] || [];
      for (const taskDef of fallbackTasks) {
        await tasksService.create({
          title: taskDef.title,
          description: `[Auto-created from Notice Intake Wizard - ${stageTag}]`,
          caseId: createdCaseId,
          clientId,
          caseNumber: caseData?.caseNumber || '',
          stage: currentStage,
          priority: taskDef.priority,
          status: 'Not Started',
          assignedToId: assignedToId || '',
          assignedToName: 'Assigned User',
          dueDate: calculateDueDate(extractedData.due_date),
          estimatedHours: 8
        }, dispatch);
        totalCreated++;
      }
    }

    setTasksCreated(totalCreated);
    toast({ title: "Tasks generated", description: `${totalCreated} task(s) created.` });
    setCurrentStep('completion');
  } catch (error) {
    console.error('Task generation error:', error);
    toast({ title: "Task generation warning", description: "Could not auto-generate tasks. You can add them manually.", variant: "destructive" });
    setCurrentStep('completion');
  } finally {
    setIsLoading(false);
  }
};
```

Add a helper to calculate due date from the notice reply due date:

```typescript
const calculateDueDate = (replyDueDate?: string): string => {
  if (replyDueDate) return replyDueDate;
  // Fallback: 7 business days from today
  const date = new Date();
  let added = 0;
  while (added < 7) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) added++;
  }
  return date.toISOString().split('T')[0];
};
```

Also import `tasksService` (already imported via `taskBundleTriggerService` dependency, but add explicit import for clarity).

## Files to Modify

| File | Change |
|------|--------|
| `src/components/notices/NoticeIntakeWizardV2.tsx` | Add `STAGE_TASK_DEFINITIONS` constant, update `handleGenerateTasks` with fallback logic, add `calculateDueDate` helper, import `tasksService` |

## What This Fixes

- Tasks displayed on Step 9 will now actually be created when "Generate Tasks" is clicked
- Created tasks will appear in Task Management module (persisted via `tasksService.create` which writes to the database)
- If task bundles are configured in the system, those take priority (preserves existing bundle automation)
- Task due dates are derived from the notice reply due date when available
