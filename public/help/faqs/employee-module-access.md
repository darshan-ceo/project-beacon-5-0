# Employee Module Access Configuration

## Understanding Module Access Control

Module access determines which sections of Project Beacon an employee can see and use. This is configured per-employee and enforces strict access control.

---

## How Module Access Works

### What Gets Controlled

| Component | Affected |
|-----------|----------|
| **Sidebar Navigation** | Modules not in access list are hidden |
| **Direct URL Access** | Blocked even if URL is known |
| **Search Results** | Items from restricted modules excluded |
| **Dashboard Widgets** | Widgets for restricted modules hidden |
| **Reports** | Data from restricted modules excluded |

### Default Module Access by Role

| Module | Admin | Partner/CA | Manager | Advocate | Staff |
|--------|-------|-----------|---------|----------|-------|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Cases | ✓ | ✓ | ✓ | ✓ | ✓ |
| Clients | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tasks | ✓ | ✓ | ✓ | ✓ | ✓ |
| Documents | ✓ | ✓ | ✓ | ✓ | ✓ |
| Hearings | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reports | ✓ | ✓ | ✓ | - | - |
| System Settings | ✓ | ✓ | - | - | - |
| Access & Roles | ✓ | - | - | - | - |

---

## Frequently Asked Questions

### How do I configure module access for an employee?

1. Go to **Employee Master**
2. Click on the employee
3. Navigate to **Access Settings** section
4. Check/uncheck modules in **Module Access**
5. Save changes

Changes take effect on the employee's next login.

### Can I give someone access to just one module?

Yes! Uncheck all modules except the one needed. However, ensure:
- Dashboard is usually kept accessible (landing page)
- Dependencies are considered (Documents module needs Cases for context)

### Why can't some employees see certain modules?

Check:
1. **Module Access setting** in Employee Master
2. **Role-based defaults** (Staff doesn't see Reports by default)
3. **Admin override** (Admins may have restricted access)

### What if I need temporary access to a module?

Contact your administrator to temporarily add the module to your access list. Changes can be reverted after the temporary need is fulfilled.

### Can module access override data scope?

No. These are independent controls:
- **Module Access**: What areas of the app you can enter
- **Data Scope**: What data you can see within those areas

Example: You might have access to the Cases module but only see "Own Cases" within it.

### How do I check what modules someone can access?

1. Go to **Employee Master**
2. Click on the employee
3. View the **Module Access** checklist
4. Or use the **Permission Matrix** in Access & Roles

### Do Admin/Partner roles bypass module access restrictions?

Yes. Admin and Partner/CA roles always have access to all modules regardless of explicit module access settings. This is a fail-safe to prevent lockout.

### Can I create module access templates?

Not directly, but you can:
1. Clone an existing employee's configuration
2. Use the role-based defaults as starting points
3. Create custom roles with specific module access presets

---

## Module Dependencies

Some modules depend on others for full functionality:

| Module | Depends On |
|--------|------------|
| Documents | Cases (for case documents) |
| Hearings | Cases (for case hearings) |
| Tasks | Cases (for case tasks) |
| Reports | Data access to modules being reported |
| Compliance Dashboard | Cases, Tasks, Deadlines |

---

**Related Articles:**
- [Role Permissions Explained](/help/faqs/role-permissions-explained)
- [Data Scope Visibility](/help/faqs/data-scope-visibility)
- [Employee Management](/help/pages/employees)
