# Operational Workflows FAQ

Common questions about day-to-day operations in Project Beacon's case management, hearings, tasks, documents, timeline, AI assistant, and communications modules.

---

## Case Management

### How do I find all overdue tasks assigned to my team?

1. Open the **Tasks** module from the sidebar
2. Apply the **Team** filter to see all team members' tasks
3. Click the **Overdue** quick filter or set status filter to show only overdue items
4. Optionally group by Assignee to see distribution

**Tip:** Save this filter combination as a custom view for quick daily access.

---

### What's the difference between advancing a stage and adding a milestone?

| Action | Purpose | Effect |
|--------|---------|--------|
| **Advance Stage** | Move case through legal lifecycle | Changes case stage, triggers stage-specific tasks, updates SLA calculations |
| **Add Milestone** | Record significant event | Adds timeline entry only, no workflow impact |

**When to use:**
- Use **Advance Stage** when the case has genuinely progressed in the legal process (e.g., Assessment → Adjudication)
- Use **Milestone** for important events that don't constitute a stage change (e.g., "Client approved appeal strategy")

---

## Hearings

### How do I reschedule a hearing without losing the original date record?

When you reschedule a hearing, the system automatically:
1. Records the original date in the hearing history
2. Updates the hearing to the new date
3. Creates a timeline entry noting the change

**Steps:**
1. Open the hearing from Calendar or List view
2. Click **Reschedule**
3. Select new date and time
4. Add reason for rescheduling (optional but recommended)
5. Save

**Note:** Rescheduling does NOT automatically notify parties. Send manual notifications via Communications.

---

## Tasks

### Can I bulk-assign tasks to multiple team members?

**Direct bulk assignment:** No, each task has a single assignee.

**Workarounds:**
1. **Task Bundles:** Create a template with multiple tasks, each pre-assigned to different roles
2. **Automation Rules:** Set up rules that auto-assign based on criteria (case type, stage, etc.)
3. **Clone Task:** Create a task, then clone it and reassign each clone

**For workload distribution:**
- Use the Analytics tab to view team workload
- Reassign individual tasks from overloaded to available team members

---

### Why isn't my automation rule firing?

Check these common causes:

1. **Rule Disabled:** Verify the rule status is "Active" in Automation tab
2. **Conditions Not Met:** Review the rule's conditions against the actual case data
3. **Trigger Mismatch:** Ensure the trigger event matches what you're testing (e.g., "Case Created" won't fire for existing cases)
4. **Already Executed:** Some rules have "once per case" settings
5. **Permission Issues:** The rule creator must have permission to create the resulting tasks

**Debugging:**
- Check the Automation Logs tab for execution history and error messages
- Test with a new case that exactly matches your conditions

---

## Documents

### How do I share a document with a client without giving full case access?

You can share individual documents via the Client Portal without granting full case access:

1. Open the document in Document Library or case Documents tab
2. Click **Share** → **Client Portal**
3. Select the specific client (must have portal access enabled)
4. Set permissions:
   - **View Only:** Client can view but not download
   - **Download:** Client can download the file
5. Optionally set expiry date
6. Confirm sharing

**Security Note:** The client will only see this specific document, not other case documents unless explicitly shared.

---

## Timeline

### How do I export a complete case timeline for court submission?

1. Open the case's **Timeline** tab
2. Set date range (or select "All Time" for complete history)
3. Apply filters if needed (e.g., Hearings + Orders only)
4. Click **Export** in the top-right
5. Select format:
   - **PDF (Formal):** Court-ready format with letterhead
   - **PDF (Simple):** Clean list format
   - **Excel:** For data analysis
6. Download and attach to your submission

**Tip:** Export a filtered view showing only Hearings and Orders for a concise litigation history.

---

## Communications

### How do I track which communications were read by the client?

1. Open the case's **Communications** tab or global Communications module
2. Look at the **Status** column:
   - ✉️ **Sent:** Message left our servers
   - ✓ **Delivered:** Reached recipient's mail server
   - ✓✓ **Read:** Recipient opened the email (if read receipts enabled)
   - ❌ **Failed:** Delivery failed

**Limitations:**
- Read receipts depend on recipient's email client settings
- Many clients disable read receipts by default
- SMS delivery confirmation is more reliable than email read receipts

**For important messages:**
- Request explicit confirmation in the message content
- Follow up via phone if no response within expected timeframe

---

## AI Assistant

### Can the AI Assistant access documents outside the current case?

**No.** The AI Assistant operates within a single case context at a time. It can access:
- ✅ All documents linked to the current case
- ✅ Case timeline and hearing history
- ✅ Case metadata and details
- ❌ Documents from other cases
- ❌ Firm-wide document library
- ❌ External databases or websites

**Workaround for cross-case analysis:**
Manually provide relevant information from other cases in your prompt:
> "Compare this case with our previous case ABC/2024 where the order was [paste key details]. What are the differences in approach?"

---

### What happens to tasks when a case is closed?

When a case moves to "Closed" status:

1. **Open Tasks:** Remain active but show warning that case is closed
2. **Pending Tasks:** System prompts to cancel or complete them
3. **Completed Tasks:** No change, preserved for audit
4. **Automation:** No new tasks created from automation rules

**Best Practice:**
Before closing a case:
1. Review all open tasks in the Tasks tab
2. Complete necessary tasks
3. Cancel tasks that are no longer needed (with note)
4. Ensure no follow-ups will be required

---

## General Operations

### What's the recommended daily workflow for case managers?

**Morning Routine (15 min):**
1. Check **Dashboard** for alerts and SLA breaches
2. Review **Task Board** for overdue items
3. Check **Hearings Calendar** for today and tomorrow
4. Review any overnight communications

**Throughout Day:**
- Update task status as work progresses
- Log communications after client calls
- Upload documents immediately when received

**End of Day (10 min):**
1. Update status of in-progress tasks
2. Record any hearing outcomes
3. Send pending client updates
4. Review tomorrow's schedule

---

### How often should I review and update operational data?

| Module | Review Frequency | Focus Areas |
|--------|------------------|-------------|
| Tasks | Daily | Status updates, overdue items |
| Hearings | Daily | Outcome recording, prep status |
| Documents | As received | Categorization, linking |
| Communications | Daily | Failed deliveries, responses |
| Timeline | Weekly | Completeness check |
| AI Assistant | As needed | No maintenance required |

**Pro Tip:** Set up automation rules to reduce manual review burden. Automated alerts catch issues faster than manual checks.

---

*Last updated: 2025-11-03*
