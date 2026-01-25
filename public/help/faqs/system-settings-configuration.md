# System Settings Configuration FAQ

## General Settings

### Q: What happens if I change the session timeout?
**A:** Session timeout changes take effect for all users on their next page load. Users who are currently active will be logged out after the new timeout period of inactivity. Existing sessions are not immediately terminated.

**Example:** Setting from 60 to 30 minutes means users idle for 30+ minutes will be logged out, even if they previously had 60 minutes.

### Q: Why isn't my email sending?
**A:** Common causes:
1. **Using main password instead of app password** - Most providers require app-specific passwords
2. **App password not generated** - Go to your email provider's security settings
3. **2FA not enabled on email account** - Some providers require 2FA before app passwords work
4. **Incorrect SMTP settings** - Verify host, port, and encryption settings

**Troubleshooting steps:**
1. Enable "Test Mode" in notification settings
2. Send a test email to yourself
3. Check the error message displayed
4. Verify credentials with your email provider

### Q: How do I recover if IP whitelist locks me out?
**A:** This is a critical situation requiring backend access:

1. **If you have backend database access:**
   ```sql
   UPDATE system_settings 
   SET value = NULL 
   WHERE key = 'ip_whitelist' AND tenant_id = 'your-tenant-id';
   ```

2. **If you don't have database access:**
   - Contact Lovable support immediately
   - Provide your tenant ID and verification of ownership
   - Support can reset the whitelist from the backend

**Prevention:** Always include your current IP before saving. Test with a VPN to verify you can still access.

### Q: What's the recommended backup frequency?
**A:** Depends on your data change rate:

| Organization Type | Recommended Frequency |
|-------------------|----------------------|
| Small firm (1-10 users) | Daily |
| Medium firm (10-50 users) | Daily + before major changes |
| Large firm (50+ users) | Hourly during business hours |
| High-activity environments | Hourly |

**Best practice:** Always export a backup before making significant configuration changes.

---

## Security Settings

### Q: Can I undo "Clear All Data"?
**A:** **No.** This action is completely irreversible. The only recovery options are:

1. **External backup** - If you exported data before clearing, you can import it
2. **Database snapshot** - If Lovable/Supabase has a recent snapshot (not guaranteed)

**Always:**
- Export complete backup before clearing
- Verify the backup file opens correctly
- Have written authorization from organization leadership
- Confirm you're in the correct environment

### Q: How do I test notifications without spamming users?
**A:** Use these approaches:

1. **Test Mode:** Enable "Test Mode" in notification settings - all emails go to admin only
2. **Single user test:** Create a test case assigned to yourself
3. **Sandbox email:** Use a service like Mailinator for testing
4. **Staging environment:** Configure a separate test tenant

### Q: What does production readiness check validate?
**A:** The check validates:

| Check | What It Verifies |
|-------|-----------------|
| RLS Policies | All tables have Row Level Security enabled |
| Authentication | Supabase auth properly configured |
| Backup Schedule | Automatic backups are scheduled |
| Security Settings | Session timeout, password policy, 2FA |
| Email Configuration | SMTP settings tested and working |
| Storage | Document storage properly configured |
| Integrations | Connected services are functional |

**Action:** Address all warnings before go-live. Errors must be fixed; warnings should be reviewed.

### Q: How often should I review security settings?
**A:** Recommended schedule:

| Review Type | Frequency | What to Check |
|-------------|-----------|---------------|
| Audit log review | Monthly | Unexpected setting changes |
| Security settings | Quarterly | Session timeout, 2FA enforcement, password policy |
| Access review | Quarterly | User role assignments, admin accounts |
| Integration health | Monthly | Calendar, GST, storage connections |
| Full security audit | Annually | Complete configuration review |

---

## Integration Settings

### Q: How do I switch from sandbox to production GST?
**A:** Follow these steps carefully:

1. **Complete sandbox testing:**
   - Test all GST query types
   - Verify signatory import works
   - Check error handling

2. **Prepare production credentials:**
   - Obtain GSP production credentials from your GSP provider
   - Verify credentials are for production, not sandbox

3. **Switch mode:**
   - Change GST Mode from "Sandbox" to "Production"
   - Enter production credentials
   - Save settings

4. **Verify:**
   - Test with a known GSTIN
   - Confirm data matches portal
   - Monitor for rate limiting

**Warning:** Production mode queries the real GST portal. Excessive queries may result in rate limiting.

### Q: Why isn't calendar sync working?
**A:** Common issues:

1. **OAuth not completed:** 
   - Click "Connect" and complete the OAuth flow
   - Check connection status shows "Connected"

2. **Calendar not selected:**
   - After connecting, select which calendar to sync to
   
3. **Permissions not granted:**
   - Ensure you granted calendar write permissions during OAuth
   
4. **Token expired:**
   - Disconnect and reconnect the calendar

**Test:** Create a test hearing and verify it appears in your connected calendar within 5 minutes.

### Q: Can implementors access settings after go-live?
**A:** Limited access:

| Section | Implementor Access Post Go-Live |
|---------|--------------------------------|
| General | View only |
| Security | No access |
| Notifications | Full (support) |
| Integrations | Full (support) |
| Data Management | No access |

**Rationale:** Post go-live, security-sensitive settings should only be modified by organization admins who have ongoing responsibility for the system.

---

## Legal Configuration

### Q: What happens if I change the case number format?
**A:** Format changes affect only **new cases**:

- Existing case numbers are preserved exactly as created
- New cases use the new format
- Reports may show mixed formats if changed mid-year

**Best practice:** Finalize format before go-live. If you must change:
1. Document the change date
2. Update any external references
3. Consider year boundary for natural transition

### Q: How do I set up the legal hierarchy correctly?
**A:** Follow this process:

1. **Identify jurisdiction:**
   - Which courts/tribunals does your practice cover?
   - What is the appeal path?

2. **Configure authority levels:**
   - Standard: Assessment → Adjudication → Tribunal → High Court → Supreme Court
   - Customize names to match your jurisdiction terminology

3. **Add matter types:**
   - For levels with sub-categories (e.g., Tribunal → State Bench, Principal Bench)
   - Enable "Allows Matter Types" for applicable levels

4. **Set location requirements:**
   - Enable "Requires Location" for geographically distributed authorities

5. **Validate:**
   - Create test cases at each level
   - Verify appeal workflow suggests correct next level

---

## Data Management

### Q: How do I safely import data?
**A:** Follow this process:

1. **Prepare environment:**
   - Use staging/test tenant first, never production directly
   - Ensure you have recent backup of target environment

2. **Validate import file:**
   - Open JSON file to verify structure
   - Check record counts match expectations

3. **Test import:**
   - Import to staging environment
   - Verify data integrity
   - Check for duplicate handling

4. **Production import:**
   - Export production backup first
   - Import during low-activity period
   - Verify immediately after import

**Important:** Import MERGES data, it doesn't replace. Plan for duplicate handling.

### Q: What's included in data export?
**A:** Standard export includes:

| Included | Not Included |
|----------|--------------|
| Cases | Document files (large) |
| Clients | System logs |
| Tasks | Session data |
| Hearings | Cache data |
| Documents (metadata) | Audit logs (separate export) |
| Settings | Credentials/passwords |
| User assignments | |

**For complete backup:** Also export document files separately from storage.

### Q: How do I handle sample data in production?
**A:** If sample data was accidentally generated in production:

1. **Enable Production Mode** - Prevents future sample data generation
2. **Identify sample records:**
   - Look for "Sample" or "Test" prefixes
   - Check creation timestamps
   - Review creator user ID

3. **Clean up:**
   - Use Client Cleanup Manager
   - Manually delete identifiable sample records
   - Audit remaining data

**Prevention:** Always enable Production Mode before any real data entry.

---

## Troubleshooting

### Q: Settings aren't saving - what's wrong?
**A:** Check these:

1. **Validation errors:** Look for red error messages on fields
2. **Required fields:** Ensure all required fields have values
3. **Format issues:** Check format requirements (e.g., comma-separated lists)
4. **Permissions:** Verify you have admin access to this section
5. **Network issues:** Check browser console for API errors

### Q: Changes aren't taking effect - why?
**A:** Depending on the setting:

1. **Immediate effect:** Security settings, production mode
2. **Next page load:** General settings, UI preferences
3. **Next session:** Session timeout (for new sessions)
4. **Manual refresh:** Some cached data

**Try:** Clear browser cache, log out and back in, or wait 5 minutes for cache expiry.

### Q: I'm getting "Permission Denied" errors
**A:** Check your role permissions:

1. **Verify your role:** Check Access & Roles for your assigned roles
2. **Check section access:** Not all roles can access all sections
3. **View vs Edit:** Some roles have view-only access
4. **Admin verification:** Data Management requires admin role

**Contact:** If you believe you should have access, contact your organization admin.

---

## Best Practices Summary

### Before Go-Live Checklist
- [ ] All security settings configured and tested
- [ ] Email notifications verified working
- [ ] Production Mode enabled
- [ ] Backup schedule configured
- [ ] Production readiness check passed
- [ ] All integrations connected and tested
- [ ] Legal hierarchy validated
- [ ] Case number format finalized

### Monthly Maintenance
- [ ] Review audit log for unusual changes
- [ ] Verify backup execution
- [ ] Check integration connection status
- [ ] Monitor email delivery rates
- [ ] Review and cleanup orphaned records

### Quarterly Security Review
- [ ] Validate session timeout compliance
- [ ] Review 2FA enforcement
- [ ] Check password policy adequacy
- [ ] Audit admin user list
- [ ] Update IP whitelist if needed
- [ ] Export security audit report
