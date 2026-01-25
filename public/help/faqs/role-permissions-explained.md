# Role Permissions Explained

## Frequently Asked Questions

### What is the difference between RBAC roles and operational roles?

**RBAC (Role-Based Access Control) roles** are security roles that control what actions a user can perform and what modules they can access. These are configured in Access & Roles and include:
- Admin
- Partner/CA
- Manager
- Advocate
- Staff

**Operational roles** are job titles stored in Employee Master that describe the employee's function (e.g., Tax Manager, Senior Advocate). While operational roles inform recommended access levels, RBAC roles are what actually enforce permissions.

### What permissions does each role have by default?

| Role | Module Access | Data Scope | Special Permissions |
|------|--------------|------------|---------------------|
| **Admin** | All modules | All Cases | Full system configuration, user management |
| **Partner/CA** | All modules | All Cases | Firm-wide reporting, billing access |
| **Manager** | Most modules (excl. System Settings) | Team Cases | Team management, case assignment |
| **Advocate** | Case-related modules | Own Cases | Case work, document management |
| **Staff** | Limited modules | Own Cases | Data entry, basic case updates |

### Can I create custom roles?

Yes! Navigate to **Access & Roles → Roles tab → Create Role**. You can:
- Clone an existing role as a starting point
- Define custom module access
- Set specific permissions per module
- Choose data scope visibility

### What happens if a user has multiple roles?

The system applies the **most permissive** access. If a user is assigned both "Advocate" and "Manager" roles, they get Manager-level access. We recommend assigning only one role per user for clarity.

### How do I restrict someone from seeing certain modules?

1. Go to **Access & Roles**
2. Select the user's role
3. In **Module Access**, uncheck modules to hide
4. Save changes

The user will no longer see those modules in their sidebar, and direct URL access is also blocked.

### Why can't I change my own role?

Users cannot modify their own role assignments - this is a security feature. Only Admins can assign or change roles. Contact your administrator if you need different access.

### How do I audit who has access to what?

Use the **Permission Matrix** button in Access & Roles. This shows a grid of all roles vs. all permissions. You can export this matrix for audit documentation.

---

**Related Articles:**
- [Data Scope Visibility Guide](/help/faqs/data-scope-visibility)
- [Module Access Configuration](/help/articles/module-access-config)
- [Security Best Practices](/help/articles/security-best-practices)
