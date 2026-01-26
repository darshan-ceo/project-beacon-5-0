# Master Data Quality FAQ

**Last Updated**: 2025-11-03  
**Audience**: Admin, Partner, Implementor

This FAQ addresses common questions about maintaining high-quality master data across Legal Authorities, Judges, Contacts, Employees, and Statutory Deadlines.

---

## General Master Data

### Q: How often should I audit master data?

**Answer**: Follow this schedule:
- **Daily**: Review new entries for completeness
- **Weekly**: Verify contact info for active clients
- **Monthly**: Run deduplication checks, review "Last Updated" for stale records
- **Quarterly**: Full audit with compliance report, role assignments, statutory rules
- **Annually**: Holiday calendar update, archive old records

### Q: What's the difference between delete and deactivate?

**Answer**: **Never delete** master data with linked records.
- **Delete**: Permanently removes record. Breaks references, loses audit trail.
- **Deactivate**: Marks as inactive. Hides from dropdowns while preserving history.

Always deactivate. The system prevents hard-delete when references exist.

### Q: How do I handle duplicates?

**Answer**: 
1. Use search before creating new entries
2. Run monthly deduplication reports
3. Use Admin merge tool to consolidate duplicates
4. Update all references to point to surviving record
5. Document merge in audit notes

---

## Legal Authorities

### Q: How do I fix duplicate Legal Authorities?

**Answer**:
1. Identify duplicates using search or deduplication report
2. Decide which record to keep (usually the one with more linked cases)
3. Use Admin > Merge Authorities tool
4. System updates all case references automatically
5. Surviving record gets combined history

**Prevention**: Always search by name AND code before creating.

### Q: What happens if I delete a Legal Authority with cases?

**Answer**: You **cannot** delete it. The system prevents deletion of authorities with linked cases, hearings, or judges.

To remove: First reassign all cases to another authority, then delete (or preferably deactivate).

### Q: How do I add a new GSTAT bench?

**Answer**:
1. Create new Legal Authority
2. Set Type = "Tribunal"
3. Set Authority Level = "TRIB"
4. Select the State - bench options auto-populate from GSTAT_STATE_BENCHES
5. Fill remaining details (address, contact info)

---

## Judges

### Q: Why is my judge not appearing in the hearing form?

**Answer**: Common causes:
1. **Status not Active**: Check judge's status field
2. **Wrong court**: Judge's court_id doesn't match hearing's court
3. **Deactivated**: Judge was marked inactive

**Fix**: Verify judge is Active and assigned to the correct Legal Authority.

### Q: How do I transfer a judge to a new court?

**Answer**:
1. Open the judge record
2. Update the court_id to the new court
3. Add a note: "Transferred from [Old Court] on [Date]"
4. Save

Past hearing records remain correctly linked. The judge now appears in the new court's dropdown.

### Q: Should I create a new record when a judge is transferred?

**Answer**: **No**. Update the existing record instead. Creating a new record causes:
- Fragmented case history
- Duplicate in reports
- Lost precedent tracking

Only create new record when the same name is a **different person** (rare).

---

## Contacts

### Q: What's the difference between standalone and client-linked contacts?

**Answer**:
| Type | When to Use | Portal Eligible | Visibility |
|------|-------------|-----------------|------------|
| **Standalone** | Prospects, opposing counsel, government officers | No | Based on data_scope |
| **Client-Linked** | Client employees, authorized representatives | Yes | Inherits from client |

Link to client only when relationship is confirmed.

### Q: How do I safely give portal access?

**Answer**:
1. Verify the person's identity (ID check, video call)
2. Confirm they are authorized by the client
3. Ensure contact is linked to correct client
4. Use portal provisioning workflow
5. Send credentials via secure channel
6. Document consent

**Warning**: Wrong portal access = confidential data breach. Always verify first.

### Q: How do I handle GDPR/data deletion requests?

**Answer**:
1. Use soft-delete (deactivate, don't hard delete)
2. Document the deletion request in audit log
3. Remove from active communications
4. Retain minimal record for legal compliance period
5. Provide deletion confirmation to requester

System maintains audit trail while honoring privacy rights.

---

## Employees

### Q: How do I correctly onboard a new employee?

**Answer**: Follow this checklist:

1. **Basic Info**: Name, email (verified), phone, join date
2. **Role**: Select appropriate role (Admin/Partner/Manager/Advocate/Staff)
3. **Manager**: Set reporting_to (required for TEAM visibility)
4. **Data Scope**: Set based on role (OWN/TEAM/ALL)
5. **Module Access**: Configure sidebar visibility
6. **Auth**: Create Supabase auth user, set password policy
7. **Verify**: Have employee test login and confirm setup

### Q: What's the recommended data scope by role?

**Answer**:
| Role | Recommended Scope | Reason |
|------|-------------------|--------|
| Admin | ALL | Needs firm-wide oversight |
| Partner | ALL | Senior practitioners need full view |
| Manager | TEAM | Oversee their team's work |
| Advocate | OWN | Work on assigned matters |
| Staff | OWN | Support specific assignments |

### Q: How do I fix a broken hierarchy?

**Answer**:
1. Go to Admin > Hierarchy Visualization
2. Identify orphaned employees (showing as root nodes unexpectedly)
3. For each orphan, set appropriate reporting_to
4. Check for circular references (A→B→A) - break by changing one
5. Re-run visualization to confirm fix

**Symptom of broken hierarchy**: TEAM scope shows nothing extra.

### Q: What happens when an employee leaves?

**Answer**: Follow offboarding checklist:
1. **Reassign work**: Transfer cases and tasks to active employees
2. **Deactivate**: Set is_active = false (don't delete!)
3. **Revoke auth**: Disable Supabase auth account
4. **Update hierarchy**: Reassign anyone reporting to them
5. **Document**: Add note with exit date

**Never delete** - breaks audit trail.

---

## Statutory Deadlines

### Q: How do I add a new type of deadline?

**Answer**:
1. Create new Event Type
2. Fill required fields:
   - **Name**: Descriptive name (e.g., "ASMT-10 Reply")
   - **base_date_type**: Which date triggers it (notice_date, order_date, receipt_date)
   - **deadline_type**: days, working_days, or months
   - **deadline_count**: Number from statute (e.g., 30)
   - **authority_level**: Which forum this applies to
   - **legal_reference**: Section citation (e.g., "Section 73(10) CGST Act")
3. Test with sample dates using Calculate Deadline tool
4. Save

### Q: When and how should I update the holiday calendar?

**Answer**:
- **When**: December/January each year, plus ad-hoc for newly declared holidays
- **How**:
  1. Download official holiday list from government source
  2. Go to Admin > Statutory Deadlines > Holidays
  3. Import new year calendar
  4. Add state-specific and court-specific holidays
  5. Verify against gazette notification

**Symptoms of stale calendar**: Working day deadlines fall on holidays.

### Q: What if a deadline calculation is wrong on a case?

**Answer**:
1. **Check event type first**: Is the rule configured correctly?
   - Verify deadline_count matches statute
   - Verify base_date_type is correct
2. **If rule is wrong**: Fix event type, then recalculate affected cases
3. **If case-specific issue**: You can manually override the calculated date
   - Always document the reason for override
   - System logs manual overrides for audit

### Q: What's the difference between days and working_days?

**Answer**:
| Type | Includes | Use When |
|------|----------|----------|
| **days** | All calendar days (weekends included) | Statute says "days" or "calendar days" |
| **working_days** | Excludes holidays from calendar | Statute says "working days" or "excluding holidays" |
| **months** | Calendar months | Statute specifies months |

**Note**: working_days requires current holiday calendar to be accurate.

---

## Data Quality Best Practices

### Q: How do I prevent data quality issues?

**Answer**: Follow these principles:

1. **Search before create**: Always check for existing entries
2. **Complete all required fields**: Don't leave blanks
3. **Verify against authoritative sources**: Court directories, Bar Council, gazette
4. **Regular audits**: Follow the maintenance schedule
5. **Document changes**: Use notes field for audit trail
6. **Train team**: Ensure everyone knows data quality importance

### Q: Who is responsible for master data quality?

**Answer**:
| Master | Primary Owner | Secondary |
|--------|---------------|-----------|
| Legal Authorities | Admin | Implementor (setup) |
| Judges | Admin/Partner | Advocates (their courts) |
| Contacts | Partner (their clients) | Staff (data entry) |
| Employees | Admin | HR Admin |
| Statutory Deadlines | Admin | Legal team (rule verification) |

### Q: What reports help monitor data quality?

**Answer**:
1. **Duplicate Report**: Identifies potential duplicates
2. **Stale Records**: Entries not updated in 90+ days
3. **Orphaned Records**: Contacts without clients, etc.
4. **Incomplete Records**: Missing required fields
5. **Hierarchy Gaps**: Employees without managers

Run these monthly as part of data hygiene routine.

---

## Related Documentation

- [Master Data Governance](../masters/master-data-governance.json)
- [Legal Authorities Help](../masters/legal-authorities-comprehensive.json)
- [Judges Help](../masters/judges-comprehensive.json)
- [Contacts Help](../masters/contacts-comprehensive.json)
- [Employees Help](../masters/employees-comprehensive.json)
- [Statutory Deadlines Help](../masters/statutory-deadlines-comprehensive.json)

---

*This FAQ is maintained by the Project Beacon documentation team. For additional questions, contact your system administrator.*
