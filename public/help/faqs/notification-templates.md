# Notification Templates Guide

## Understanding Notification Templates

Notification templates define the content and format of automated messages sent by Project Beacon via email, SMS, or in-app notifications.

---

## Template Types

| Type | Use Case | Variables Available |
|------|----------|---------------------|
| **Deadline Reminder** | Alert before statutory deadline | {{deadline_date}}, {{event_type}}, {{case_number}} |
| **Hearing Reminder** | Alert before hearing date | {{hearing_date}}, {{court_name}}, {{case_number}} |
| **Task Assignment** | When task is assigned | {{task_title}}, {{assignee}}, {{due_date}} |
| **Case Update** | When case status changes | {{case_number}}, {{old_status}}, {{new_status}} |
| **Escalation Alert** | When task is escalated | {{task_title}}, {{escalation_level}}, {{reason}} |
| **Client Portal** | Notifications to clients | {{client_name}}, {{case_summary}} |

---

## Frequently Asked Questions

### Where do I find notification templates?

1. Go to **System Settings → Notifications**
2. Click **Templates** tab
3. Browse by notification type or search

### How do I edit a template?

1. Find the template in the list
2. Click **Edit**
3. Modify the subject and body
4. Use the variable picker to insert dynamic content
5. **Preview** with sample data
6. **Save** changes

### What are template variables?

Variables are placeholders that get replaced with actual data:

```
Original template:
"Your deadline for {{event_type}} in case {{case_number}} is {{deadline_date}}"

Becomes:
"Your deadline for Appeal Filing in case GST/2025/001 is 15-Feb-2025"
```

### Which variables can I use?

Common variables by category:

**Case Variables:**
- `{{case_number}}` - Case reference number
- `{{case_title}}` - Case title
- `{{client_name}}` - Client display name
- `{{case_stage}}` - Current stage

**Date Variables:**
- `{{deadline_date}}` - Due date
- `{{hearing_date}}` - Hearing date
- `{{today}}` - Current date

**User Variables:**
- `{{assignee}}` - Assigned person's name
- `{{created_by}}` - Who created the item
- `{{recipient_name}}` - Who's receiving notification

**Task Variables:**
- `{{task_title}}` - Task name
- `{{task_status}}` - Current status
- `{{due_date}}` - Task due date

### Can I create custom templates?

Yes!
1. Go to **Templates** tab
2. Click **Create Template**
3. Select the notification type
4. Write your subject and body
5. Insert variables as needed
6. Save with a descriptive name

### How do I preview a template?

1. Click **Preview** in the template editor
2. System shows template with sample data
3. Switch between Email/SMS/In-App views
4. Verify formatting looks correct

### Can I have different templates for different cases?

Yes, using conditions:
1. Create multiple templates for the same type
2. Set conditions (e.g., Case Type = GST)
3. The matching template is used automatically

### What's the character limit for SMS?

SMS templates should stay under 160 characters for single SMS. Longer messages are split and may incur additional charges. Use concise language for SMS.

### Can I include links in templates?

Yes, but platform-specific:
- **Email**: Full HTML links work
- **In-App**: Links work with proper formatting
- **SMS**: Include short URLs only

### How do I disable a template?

1. Find the template
2. Toggle **Active** status to Off
3. Template won't be used for new notifications
4. Can be reactivated anytime

---

## Template Best Practices

1. **Be concise**: Get to the point quickly
2. **Include action**: Tell recipient what to do
3. **Use variables wisely**: Don't overwhelm with data
4. **Test before deploying**: Preview with real case data
5. **Match the channel**: Formal for email, brief for SMS
6. **Include links**: Help users take action quickly

---

## Example Templates

### Deadline Reminder (Email)
```
Subject: ⚠️ Deadline Alert: {{event_type}} due in {{days_remaining}} days

Dear {{recipient_name}},

This is a reminder that the deadline for {{event_type}} in case 
{{case_number}} ({{client_name}}) is approaching.

Due Date: {{deadline_date}}
Days Remaining: {{days_remaining}}
Authority: {{authority_name}}

Please take necessary action before the deadline.

View Case: {{case_url}}
```

### Hearing Reminder (SMS)
```
HEARING ALERT: {{case_number}} on {{hearing_date}} at {{hearing_time}}. 
Court: {{court_name}}. -Project Beacon
```

---

**Related Articles:**
- [Notification Settings Guide](/help/pages/notifications)
- [Escalation Matrix Setup](/help/articles/escalation-setup)
- [SMS/Email Configuration](/help/articles/communication-setup)
