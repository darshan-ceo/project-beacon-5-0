

# Fix: Employee List in Task Assignment + Notification Issues

## Two Issues Identified

### Issue 1: "Assign To" dropdown shows only team members for Staff role

**Root Cause:** The `employees` table has an RLS policy called **"Staff view employees based on hierarchy"** that restricts Staff users to only see:
- Their own record
- Employees in the same team (same manager)
- Their direct reports

When Mahesh (Staff, under Prashakha) opens the task creation form, the `EmployeeSelector` component fetches from `state.employees` which was loaded via `DataInitializer.tsx` querying `from('employees')`. Due to the RLS policy, Mahesh only sees himself and Devyanshi (same team under Prashakha).

**Your requirement is correct:** Task assignment should allow any employee to assign tasks to any other employee in the company, regardless of hierarchy.

**Fix:** Add a new permissive RLS policy on the `employees` table that allows all authenticated users in the same tenant to see basic employee information for task assignment purposes. Since `DataInitializer` loads all employees into app state, and employee visibility is needed for dropdowns across the app, the simplest fix is to allow all authenticated tenant users to SELECT from the employees table.

### Issue 2: Task creation and follow-up notifications not appearing

**Root Cause:** The notification creation code in `tasksService.ts` and `taskMessagesService.ts` uses `notificationSystemService.createNotification()` which calls the `create_notification` RPC function. This RPC function uses `auth.uid()` to look up the caller's tenant. If there's any session issue or the call fails silently, no notification gets created.

Looking at the existing code, the notification flow is:
1. `tasksService.ts` line 138: Creates notification when task is assigned to someone other than creator
2. `taskMessagesService.ts` line 180: Creates notification on follow-up messages

The notification RPC and service code look correct. The issue may be that the `create_notification` function is failing silently. We need to add better error logging and verify the flow works end-to-end.

**Fix:** Add diagnostic logging in the task service notification calls and verify the database function works correctly. Also check if there are any recent errors in the notification creation flow.

## Plan

### Step 1: Database Migration - Fix Employee Visibility for Task Assignment

Add a new permissive SELECT policy on the `employees` table that allows all authenticated users within the same tenant to view all employees. This enables the "Assign To" dropdown to show the full company directory.

```sql
-- Allow all authenticated tenant users to view employees for assignment dropdowns
CREATE POLICY "All tenant users can view employees for assignment"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id());
```

This is safe because:
- It's still tenant-scoped (users can only see employees in their own organization)
- Employee data (name, role, department) is not sensitive within the same organization
- The existing hierarchy-based policies were too restrictive for task assignment needs

### Step 2: Verify and Fix Task Notification Flow

Review `tasksService.ts` and `taskMessagesService.ts` to ensure the notification calls are executing properly:

1. In `tasksService.ts`: Verify the `createNotification` call after task creation includes proper error handling and logging
2. In `taskMessagesService.ts`: Verify the follow-up notification call is reached and not short-circuited
3. Add console logging to trace notification creation failures

### Files to Modify

| File / Area | Change |
|-------------|--------|
| SQL Migration | New permissive SELECT policy on `employees` table for all tenant users |
| `src/services/tasksService.ts` | Verify and improve notification error handling |
| `src/services/taskMessagesService.ts` | Verify and improve follow-up notification error handling |

