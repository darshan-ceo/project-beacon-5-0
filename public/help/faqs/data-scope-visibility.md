# Data Scope Visibility Guide

## Understanding Data Scope

Data scope controls what cases and data an employee can see in Project Beacon. There are three levels:

### Own Cases
- See only cases where you are explicitly assigned
- Assigned as: Lead Attorney, Team Member, or Case Owner
- Strictest visibility - ideal for junior staff
- **Recommended for:** Staff, Junior Advocates

### Team Cases
- See your own cases PLUS cases of all your direct reports
- Based on "Reports To" hierarchy in Employee Master
- If you manage 3 people, you see all their cases too
- Cascades down: You see your reports' reports' cases
- **Recommended for:** Managers, Team Leads

### All Cases
- Organization-wide visibility
- See every case regardless of assignment
- Full access to all clients and related data
- **Recommended for:** Partners, Admins, Senior CAs

---

## Frequently Asked Questions

### How is Team Cases visibility calculated?

Team Cases uses the "Reports To" field in Employee Master:

```
Partner (All Cases)
├── Manager A (Team Cases) → sees cases for Advocate 1, Advocate 2
│   ├── Advocate 1 (Own Cases)
│   └── Advocate 2 (Own Cases)
└── Manager B (Team Cases) → sees cases for Advocate 3
    └── Advocate 3 (Own Cases)
```

Manager A sees their own cases + Advocate 1's cases + Advocate 2's cases.

### Why is my Data Scope option grayed out?

Some data scope options are disabled based on role:
- **Partner/Admin**: Cannot select "Own Cases" (would be too restrictive)
- **Manager**: Cannot select "Own Cases" (need to see team)
- **Staff**: All options available

### I set "Team Cases" but see zero cases. Why?

Common causes:
1. **No reports assigned**: Check Employee Master - do employees have you set in "Reports To"?
2. **Reports have no cases**: Your reports may not have any cases assigned
3. **Newly configured**: Changes take effect on next login

### Can I see cases for a specific team member only?

Data scope doesn't allow picking specific users. Use **filters** in Case Management:
- Filter by "Assigned To" to see specific person's cases
- Create saved filters for quick access

### Does Data Scope affect reports and analytics?

Yes. Reports only include data you can see:
- **Own Cases**: Reports show only your cases
- **Team Cases**: Reports aggregate you + your team
- **All Cases**: Firm-wide reports

### How do I check what someone can see?

1. Go to **Employee Master**
2. Click on the employee
3. Check their **Data Scope** setting
4. Check their **Reports To** to understand hierarchy

### Can data scope be overridden for specific cases?

No. Data scope is a blanket setting. If you need temporary access to a specific case, the case owner should add you as a team member.

---

**Related Articles:**
- [Role Permissions Explained](/help/faqs/role-permissions-explained)
- [Team Hierarchy Configuration](/help/articles/team-hierarchy)
- [Employee Management Guide](/help/pages/employees)
