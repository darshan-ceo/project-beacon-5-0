# Task Automation Rules Guide

## Understanding Task Automation

Task automation in Project Beacon creates tasks automatically based on triggers and conditions. This ensures consistent workflows and prevents tasks from being forgotten.

---

## Automation Components

### Triggers
Events that start the automation:
- **Case Created**: When a new case is registered
- **Stage Changed**: When case moves to new stage
- **Hearing Scheduled**: When a hearing is added
- **Hearing Updated**: When hearing date/outcome changes
- **Document Uploaded**: When new document is added
- **Deadline Approaching**: When deadline is within X days
- **Task Completed**: When a specific task is finished

### Conditions
Filters that determine if automation should run:
- Case type matches (e.g., only GST cases)
- Authority level matches (e.g., only Tribunal)
- Priority matches (e.g., only High priority)
- Assigned to matches (e.g., specific team member)
- Stage matches (e.g., only Assessment stage)

### Actions
What happens when automation fires:
- Create task(s) with specified details
- Send notification to user(s)
- Update case status
- Assign to team member
- Log activity

---

## Frequently Asked Questions

### How do I create an automation rule?

1. Go to **Task Management → Automation** tab
2. Click **New Rule**
3. Name your rule (e.g., "Hearing Prep Tasks")
4. Select a **Trigger** (e.g., Hearing Scheduled)
5. Add **Conditions** (e.g., Case Type = GST)
6. Define **Actions** (e.g., Create preparation tasks)
7. **Test** with sample data
8. **Enable** the rule

### Can one trigger create multiple tasks?

Yes! In the Actions section:
1. Click **Add Task**
2. Configure the first task
3. Click **Add Another Task**
4. Configure additional tasks
5. All tasks are created when the rule fires

Example: "Hearing Scheduled" creates:
- Task 1: Review case file (Due: H-5 days)
- Task 2: Prepare arguments (Due: H-3 days)
- Task 3: Confirm attendance (Due: H-1 day)

### What does "H-5 days" mean in due dates?

Relative due dates based on the trigger event:
- **H-5**: 5 days before hearing date
- **H+3**: 3 days after hearing date
- **T-7**: 7 days before task due date
- **D-3**: 3 days before deadline

### How do I prevent duplicate tasks?

Add conditions to check existing tasks:
1. Condition: "Task with title [X] does not exist for this case"
2. Or use: "Only run once per case"

### Can I assign tasks to different people?

Yes! For each task in the action:
- **Specific user**: Always assign to John
- **Case owner**: Assign to whoever owns the case
- **Round robin**: Rotate among team members
- **Manager**: Assign to case owner's manager

### How do I disable a rule temporarily?

1. Go to **Automation** tab
2. Find the rule
3. Toggle the **Enable/Disable** switch
4. Rule is paused but not deleted

### Can I run a rule manually for existing cases?

Yes! Use **Backfill**:
1. Click on the rule
2. Select **Run Backfill**
3. Choose date range or case selection
4. Preview affected cases
5. Execute to create tasks retroactively

### What if my rule creates tasks incorrectly?

1. **Disable** the rule immediately
2. Review the rule configuration
3. Delete incorrectly created tasks (if needed)
4. Fix the conditions or actions
5. **Test** with sample data
6. Re-enable only when confirmed correct

---

## Example Rules

### Hearing Preparation
```
Trigger: Hearing Scheduled
Conditions: 
  - Case Type = GST Litigation
  - Hearing Type = Main Hearing
Actions:
  - Create Task: "Review Case File" (Due: H-5 days)
  - Create Task: "Prepare Written Submissions" (Due: H-3 days)
  - Create Task: "Brief Senior Counsel" (Due: H-2 days)
```

### Deadline Reminders
```
Trigger: Deadline Approaching (7 days)
Conditions:
  - Event Type = Appeal Filing
Actions:
  - Create Task: "Prepare Appeal Papers" (Due: D-5 days)
  - Notify: Case Owner, Manager
```

### New Case Onboarding
```
Trigger: Case Created
Conditions:
  - Stage = Initial Assessment
Actions:
  - Create Task: "Review Notice/Order" (Due: T+1 day)
  - Create Task: "Client Information Gathering" (Due: T+2 days)
  - Create Task: "Preliminary Analysis" (Due: T+3 days)
```

---

**Related Articles:**
- [Task Management Overview](/help/pages/task-automation)
- [Task Templates Guide](/help/articles/task-templates)
- [Escalation Matrix Setup](/help/articles/escalation-setup)
