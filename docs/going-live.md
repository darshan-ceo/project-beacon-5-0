# Going Live Checklist - Project Beacon

## Pre-Production Checklist

### 1. Environment Configuration
- [ ] Set `VITE_API_BASE_URL` to production API endpoint
- [ ] Ensure `VITE_GST_MOCK=off` (remove or set to false)
- [ ] Set `VITE_QA_MODE=off` (remove or set to false) 
- [ ] Verify `VITE_FEATURE_GST_CLIENT_AUTOFILL=on` if GST integration is ready
- [ ] Remove any dev-only URL parameters (`?gst=`, `?mock=`, `?qa=`, `?api=`)

### 2. Statutory Deadline Module
- [ ] Statutory Acts master data populated
- [ ] Statutory Event Types configured with correct deadline rules
- [ ] Holiday calendar populated for current and next year
- [ ] State-wise holidays configured for relevant states
- [ ] Notification schedules configured (30/15/7/3/1/0 days)
- [ ] Dashboard widgets added for deadline monitoring
- [ ] Reports tab accessible and functional

### 2. API Readiness
- [ ] Production API endpoints are live and accessible
- [ ] GST Public API integration tested with real credentials
- [ ] Authentication/authorization working properly
- [ ] Database migrations completed
- [ ] SSL certificates configured

### 3. Data Migration
- [ ] Employee master data populated with correct roles hierarchy
- [ ] Court master data synchronized
- [ ] Address configuration updated for production
- [ ] Task templates reviewed and approved
- [ ] Escalation rules configured for live operations

### 4. Security & Access
- [ ] RBAC permissions configured correctly
- [ ] User accounts created for all staff
- [ ] Client portal access tested
- [ ] Production credentials secured (not hardcoded)
- [ ] OAuth integrations (Google Calendar, Outlook) configured

### 5. Integrations
- [ ] Calendar integration tested with real accounts
- [ ] GST API credentials configured in production
- [ ] Email notifications working
- [ ] SMS/WhatsApp providers configured (if enabled)
- [ ] Document management system connected

### 6. Final Testing
- [ ] Complete user acceptance testing performed
- [ ] Stage transition automation tested
- [ ] Task creation and escalation flows verified
- [ ] Reports generation working
- [ ] Performance testing completed
- [ ] Backup and recovery procedures tested

### 7. Go-Live
- [ ] DNS pointed to production
- [ ] Users trained on production system
- [ ] Support procedures documented
- [ ] Monitoring and alerting configured
- [ ] Dev mode completely disabled

## Post Go-Live
- [ ] Monitor system performance for 24 hours
- [ ] Verify all integrations working
- [ ] Check data consistency
- [ ] Address any immediate issues
- [ ] Schedule regular backup verification

## Emergency Rollback Plan
1. Point DNS back to staging/dev environment
2. Re-enable dev mode if needed for debugging
3. Restore database from last known good backup
4. Notify all users of the rollback
5. Document issues and resolution plan

## Support Contacts
- **Technical Issues**: [Development Team]
- **GST API Issues**: [GST Provider Support]
- **User Training**: [Training Team]
- **Business Critical**: [Management Escalation]