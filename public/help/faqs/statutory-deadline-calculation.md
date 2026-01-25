# Statutory Deadline Calculation

## How Project Beacon Calculates Deadlines

Understanding deadline calculation is critical for compliance. Here's how the system works:

### Basic Formula

```
Deadline = Base Date + Statutory Days - Holidays/Weekends (if configured)
```

### Components

| Component | Description | Example |
|-----------|-------------|---------|
| **Base Date** | When the triggering event occurred | Notice received: 15-Jan-2025 |
| **Statutory Days** | Time limit prescribed by law | 30 days for ASMT-10 reply |
| **Holidays** | Court/authority holidays excluded | Republic Day: 26-Jan-2025 |
| **Deadline** | Final due date | 14-Feb-2025 |

---

## Frequently Asked Questions

### How are statutory days determined?

Each **Event Type** has pre-configured statutory limits:

| Event Type | Statutory Days | Authority |
|------------|---------------|-----------|
| ASMT-10 Notice Received | 30 days | Adjudicating |
| DRC-01 Show Cause Notice | 30 days | Adjudicating |
| Assessment Order Passed | 90 days | Tribunal Appeal |
| Tribunal Order | 180 days | High Court Appeal |
| High Court Order | 90 days | Supreme Court SLP |

These are defaults; your admin may have customized them.

### What if the deadline falls on a holiday?

If holiday adjustment is enabled:
- System checks the calculated date against holiday calendar
- If it's a holiday, deadline moves to next working day
- Weekends are only excluded if configured

**Example:**
- Base Date: 10-Jan-2025
- Statutory Days: 30
- Calculated: 9-Feb-2025 (Sunday)
- Adjusted Deadline: 10-Feb-2025 (Monday)

### How do I configure holidays?

1. Go to **System Settings → Statutory Deadlines → Holiday Calendar**
2. Import holidays from file or add manually
3. Select which authority the holidays apply to
4. Enable "Adjust for Holidays" in deadline settings

### Can deadlines differ by authority?

Yes! Some event types have **authority-specific overrides**:

| Event | Default | High Court | Supreme Court |
|-------|---------|------------|---------------|
| Appeal Filing | 60 days | 90 days | 90 days |
| Review Application | 30 days | 30 days | 45 days |

Configure overrides in **Event Type → Authority Rules**.

### How are extensions handled?

When an authority grants an extension:
1. Click **Record Extension** on the deadline
2. Enter the new due date
3. Add reason and approval reference
4. Original deadline remains for audit, new deadline becomes active

### Why does my deadline show a different date than I calculated?

Common reasons:
1. **Holiday adjustment** - System excluded holidays
2. **Authority override** - Different rules for that authority
3. **Weekend exclusion** - Weekends were skipped
4. **Starting point** - "From date of receipt" vs "from date of order"

Check the deadline details for the calculation breakdown.

### Can I override the calculated deadline?

Admins can manually edit deadlines, but this is logged:
- Original calculated date is preserved
- Manual override is flagged
- Audit trail shows who changed it and why

### What triggers deadline alerts?

Alerts are sent based on configured thresholds:
- **7 days before**: First reminder
- **3 days before**: Escalation to manager
- **1 day before**: Urgent alert
- **Overdue**: Critical escalation

Configure thresholds in **Deadline Alert Settings**.

---

## GST-Specific Deadline Reference

| Notice/Event | Time Limit | Section |
|--------------|------------|---------|
| ASMT-10 Reply | 30 days | Section 61 |
| DRC-01 Reply | 30 days | Section 73/74 |
| DRC-07 Payment | 15 days | Section 73/74 |
| Appeal to Appellate Authority | 90 days | Section 107 |
| Appeal to Tribunal | 90 days | Section 112 |
| Review Application | 30 days | Various |

---

**Related Articles:**
- [Statutory Deadlines Configuration](/help/pages/statutory-deadlines)
- [GST Time Limits Reference](/help/articles/gst-time-limits)
- [Managing Deadline Extensions](/help/articles/deadline-extensions)
