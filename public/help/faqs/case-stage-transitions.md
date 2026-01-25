# Case Stage Transitions Guide

## Understanding Case Lifecycle

Cases in Project Beacon move through stages as they progress through the litigation process. The Lifecycle tab tracks every transition with full audit history.

---

## Transition Types

### Forward Transition
Moving a case to the next level in the hierarchy.
- **Example**: Adjudicating Authority → Appellate Authority → Tribunal
- **Trigger**: Appeal filed, order passed, escalation required
- **Creates**: New stage instance with cycle number

### Send Back
Case returned to a previous level for reconsideration.
- **Example**: Tribunal sends case back to Appellate Authority
- **Trigger**: Remand order, procedural issues, additional evidence needed
- **Creates**: New cycle at the lower stage

### Remand
Similar to send back but with specific remand order.
- **Example**: High Court remands to Tribunal with directions
- **Trigger**: Remand order issued
- **Creates**: New cycle with remand marker

---

## Frequently Asked Questions

### What is a "cycle" in case lifecycle?

A cycle represents each time a case enters a particular stage. If a case goes to Tribunal, then to High Court, then back to Tribunal, that's:
- Tribunal (Cycle 1)
- High Court (Cycle 1)
- Tribunal (Cycle 2) ← after remand

### How do I record a stage transition?

1. Open the case
2. Go to **Lifecycle** tab
3. Click **Add Transition**
4. Select: From Stage, To Stage, Transition Type
5. Add transition date and remarks
6. Attach any relevant order/notice
7. Save

### What gets tracked in each stage instance?

| Data Point | Description |
|------------|-------------|
| **Stage Key** | The authority level (e.g., Tribunal) |
| **Cycle Number** | Which time at this stage |
| **Started At** | When case entered this stage |
| **Ended At** | When case left this stage (null if active) |
| **Duration** | Days spent in this stage |
| **Tasks** | Tasks created during this stage |
| **Hearings** | Hearings held during this stage |
| **Documents** | Documents filed during this stage |

### Can I edit a past transition?

Only the remarks can be edited after saving. The transition date, stages, and type are locked for audit integrity. If there's an error, contact an admin who can add a corrective entry with explanation.

### How do I handle writ petitions (direct to High Court)?

Cases don't need to start from the bottom:
1. Create case normally
2. Set initial stage directly to High Court
3. System tracks from that starting point

### What if a case is disposed at a particular stage?

If a case concludes (e.g., appeal dismissed, settled):
1. Record the final outcome in the transition
2. Mark the case status as "Disposed" or "Closed"
3. The stage instance will show as completed
4. No further transitions needed

### How do I see the complete history?

The **Lifecycle** tab shows:
- **Stage History & Cycles**: Visual timeline of all stages
- **Transition History**: Granular log of every movement

Click on any stage in the timeline to see associated tasks, hearings, and documents.

### Why are there multiple cycles at the same stage?

This happens when:
- Case was remanded back from a higher authority
- Case was sent back for reconsideration
- Appeal was filed after fresh assessment

Each return creates a new cycle, preserving the complete history.

---

## Best Practices

1. **Record transitions promptly**: Don't wait; log transitions as they happen
2. **Attach supporting documents**: Link the order/notice that triggered the transition
3. **Add detailed remarks**: Future you will thank present you
4. **Use correct transition type**: Forward vs. Remand vs. Send Back matters for reporting
5. **Verify before saving**: Transition details can't be edited after save

---

**Related Articles:**
- [Case Lifecycle Tab Guide](/help/pages/case-management)
- [Stage Instance Tracking](/help/articles/stage-instances)
- [Case Completion Workflow](/help/articles/case-completion)
