# RBAC Troubleshooting Guide

> **Module:** Access & Roles  
> **Audience:** Administrators, Partners, Implementors  
> **Last Updated:** 2025-01-25

---

## Quick Diagnosis Checklist

Before diving into specific issues, run through this checklist:

1. **Is the user active?** Check Employee Master → Status = Active
2. **Do they have a role assigned?** Check Access & Roles → User Assignments
3. **What is their data scope?** Check Employee Master → Data Scope field
4. **Is hierarchy set up?** Check Access & Roles → Team Hierarchy tab
5. **Are permissions correct?** Use the [Eye] icon to preview effective permissions

---

## Common Issues & Solutions

### Issue: "User can't see any cases"

**Symptoms:**
- Case list shows empty
- Dashboard shows 0 cases
- No error message displayed

**Diagnosis Steps:**

| Check | How to Verify | If Problem |
|-------|---------------|------------|
| Role assigned? | Access & Roles → User Assignments → Find user | Assign appropriate role |
| Cases permission? | Click [Eye] → Check 'cases.view' | Add role with cases access |
| Data scope? | Employee Master → Data Scope | See scope-specific solutions below |
| Cases assigned? | Check case's 'Assigned To' field | Assign cases to user |

**Data Scope Solutions:**

- **Own Cases scope:** User can only see cases assigned to them
  - Solution: Assign cases to this user, OR change scope to Team/All

- **Team Cases scope:** User can see cases of their team
  - Verify: Access & Roles → Team Hierarchy → Is user in the tree?
  - Verify: Does user have 'Reports To' set in Employee Master?
  - Verify: Does their manager/team have cases assigned?

- **All Cases scope:** User should see everything
  - If still empty, check if tenant has any cases at all
  - Verify role has 'cases.view' permission

---

### Issue: "User can't see their team's cases"

**Symptoms:**
- User has 'Team Cases' scope but sees only their own cases
- Manager can't see subordinate's work

**Root Causes:**

1. **Missing 'Reports To' relationship**
   - Go to Employee Master → Edit each team member
   - Set 'Reports To' = this user
   - Verify in Team Hierarchy tab

2. **User is at root level with no reports**
   - Check Team Hierarchy → Is user an isolated node?
   - Either: Assign reports to them, OR change scope

3. **User's scope is 'Own Cases' not 'Team Cases'**
   - Employee Master → Data Scope → Change to 'Team Cases'

4. **Circular hierarchy**
   - A reports to B, B reports to A = broken
   - Review and fix in Employee Master

---

### Issue: "User can see cases they shouldn't"

**Symptoms:**
- Staff member sees partner's confidential matters
- User sees competing client's cases

**Diagnosis:**

1. **Check data scope** - Is it set too broadly?
   - Own Cases = Only their cases
   - Team Cases = Their + team's cases
   - All Cases = Everything

2. **Check role permissions** - Do they have admin role?
   - Access & Roles → User Assignments → Review roles

3. **Check case assignment** - Are they inadvertently assigned?
   - Review case's 'Assigned To' and 'Owner' fields

**Remediation:**
- Reduce data scope to 'Own Cases'
- Remove unnecessary role assignments
- Remove from case assignment if inappropriate

---

### Issue: "User can't access a specific module"

**Symptoms:**
- Module not visible in sidebar
- Direct URL access shows 403/blank page

**Diagnosis:**

1. **Check module permission**
   - Access & Roles → User Assignments → Click [Eye]
   - Look for [module].view permission

2. **Check role definition**
   - Access & Roles → Role Definitions
   - Find user's role → Edit Permissions
   - Verify module is enabled

**Solution:**
- Either: Assign additional role with that module access
- Or: Edit current role to include module permissions

---

### Issue: "User can view but not edit"

**Symptoms:**
- User sees data but Edit button is disabled/missing
- Save attempts show permission error

**Diagnosis:**
- User has 'view' permission but not 'edit'
- Access & Roles → User Assignments → [Eye] → Check [module].edit

**Solution:**
- Assign role with edit permission, OR
- Edit current role to add edit permission

---

### Issue: "Portal user can't log in"

**Symptoms:**
- Client reports login failure
- Password reset doesn't help

**Diagnosis:**

| Check | How to Verify |
|-------|---------------|
| Account exists? | Access & Roles → Portal Users → Search |
| Account active? | Check Active status toggle |
| Email correct? | Verify email matches what client uses |
| Client linked? | Check linked Client entity |

**Solutions:**
- If account inactive: Toggle Active = On
- If wrong email: Delete and recreate with correct email
- If no account: Create new portal user invitation

---

### Issue: "Changes to roles aren't taking effect"

**Symptoms:**
- Role permissions updated but user still has old access
- New role assigned but user doesn't see new modules

**Causes & Solutions:**

1. **Browser cache**
   - User should: Ctrl+Shift+R (hard refresh)
   - Or: Clear browser cache

2. **Still on old session**
   - Changes apply on next page load
   - User should navigate away and back

3. **Multiple conflicting roles**
   - Permissions combine additively
   - User may have another role granting the permission

4. **Editing wrong role**
   - Verify you edited the role actually assigned to user
   - Check User Assignments for correct role name

---

### Issue: "Audit log shows unexpected permission changes"

**Symptoms:**
- ASSIGN_ROLE events you didn't make
- Permission changes at odd times

**Investigation Steps:**

1. **Check who made the change**
   - Audit log shows 'performed_by' user ID
   - Cross-reference with User Assignments

2. **Check for shared admin accounts**
   - Multiple people using same admin account
   - Solution: Create individual admin accounts

3. **Check for automation**
   - Some systems auto-assign roles on employee creation
   - Review automation rules

4. **Potential security incident**
   - If changes can't be explained, investigate immediately
   - See Security Warnings for incident response

---

### Issue: "Hierarchy shows employees as orphans"

**Symptoms:**
- Team Hierarchy shows employees at root level
- Access Chain Inspector shows no manager

**Causes:**

1. **Missing 'Reports To' in Employee Master**
   - Edit employee → Set 'Reports To' field

2. **Bulk import without hierarchy data**
   - Update Employee Master with reporting relationships

3. **Manager was deleted**
   - Former manager was deactivated/deleted
   - Reassign 'Reports To' for orphaned employees

---

### Issue: "Sync All Roles button doesn't fix problems"

**Symptoms:**
- Clicked Sync All Roles but issues persist

**Understanding:**
- Sync copies roles from Employee Master to RBAC
- It doesn't fix:
  - Missing hierarchy
  - Incorrect data scope
  - Permission issues in role definitions

**What to do instead:**
- For hierarchy: Fix in Employee Master
- For scope: Fix in Employee Master
- For permissions: Fix in Role Definitions

---

## Role-Specific Troubleshooting

### For Admins

**"I can't access Access & Roles anymore"**
- Your admin role may have been revoked
- Contact another admin to restore
- If no other admins: Contact Lovable support

**"I accidentally removed all admin access"**
- Contact Lovable support immediately
- Provide organization verification
- Keep 2+ admins to prevent this

### For Partners

**"I can't see my team's work"**
- Verify your data scope is 'Team Cases' or 'All Cases'
- Verify team members have you as 'Reports To'
- Check Team Hierarchy for visualization

**"I can't manage portal users for my clients"**
- Portal user management may require admin role
- Request admin assistance or appropriate permissions

### For Implementors

**"Role structure from staging didn't transfer to production"**
- Roles are environment-specific
- Recreate role structure in production
- Use JSON export/import if available

**"Client wants a role I can't create"**
- Ensure you have admin access for role creation
- Document requirements before handoff
- Train client admin on role management

---

## Emergency Procedures

### Complete Lockout (No Admin Access)

1. **Don't panic** - Data is safe, just inaccessible
2. Contact Lovable support: [support link]
3. Prepare proof of organization ownership
4. Support will restore admin access
5. Immediately create backup admin account

### Suspected Security Breach

1. **Preserve evidence** - Don't make changes yet
2. Export audit log for investigation period
3. Identify affected data and users
4. Disable suspect accounts
5. Notify compliance/legal if required
6. Document incident timeline
7. Implement corrective measures

---

## Preventive Measures

### Daily
- None required for stable configurations

### Weekly
- Review audit log for unexpected admin grants

### Monthly
- Verify no former employees have active access
- Check portal user list for inactive clients

### Quarterly
- Full access review: Compare users with HR records
- Role definition review: Are they still appropriate?
- Portal access audit: Disable completed client access
- Export audit log for compliance archive

---

## Getting Help

### Self-Service
- This troubleshooting guide
- Inline help: Click [?] icons in Access & Roles
- Guided tour: Access & Roles → Help → Take Tour

### Escalation Path
1. **Tier 1:** Check this troubleshooting guide
2. **Tier 2:** Consult with organization's admin
3. **Tier 3:** Contact Lovable support

---

*If your issue isn't covered here, document the symptoms, affected users, and any error messages before contacting support.*
