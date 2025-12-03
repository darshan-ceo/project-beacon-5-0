# Statutory Deadline Automation Module

## Overview

The Statutory Deadline Automation Module provides comprehensive deadline tracking and management for legal cases, ensuring compliance with statutory timelines and reducing the risk of missed deadlines.

## Features

### Phase 1: Database & Core Infrastructure
- **Statutory Acts**: Master data for legal acts (GST, Income Tax, Customs, etc.)
- **Event Types**: Configurable deadline rules per act with days/months/working days calculation
- **Holidays**: State-wise and national holiday management for working day calculations
- **Case Deadlines**: Automatic deadline tracking linked to cases

### Phase 2: Auto-Calculation Integration
- Auto-calculates `reply_due_date` when `notice_date` is entered in CaseModal
- Displays "Statutory" badge for auto-calculated deadlines
- DeadlineStatusBadge shows color-coded urgency (green/amber/red)
- Working day calculations exclude weekends and holidays

### Phase 3: Notifications & Calendar
- Multi-channel notifications (in-app, email)
- Configurable reminder schedule (30/15/7/3/1/0 days before deadline)
- Calendar integration for deadline visibility
- Automatic notification processing

### Phase 4: Dashboard Widgets
- **Statutory Deadlines Widget**: Shows upcoming deadlines with urgency indicators
- **Deadline Breaches Widget**: Tracks breach counts and trends
- **Deadline Calendar Widget**: Compact calendar view of deadlines

### Phase 5: Reporting
- Comprehensive statutory deadline reports
- Filterable by client, status, date range, owner
- RAG status summary statistics
- Excel and PDF export capabilities

### Phase 6: Testing
- Integration tests for deadline calculations
- Component tests for UI elements
- Validation tests for data integrity

## Database Schema

### Tables
- `statutory_acts` - Legal acts master data
- `statutory_event_types` - Deadline rules per event type
- `holidays` - Holiday calendar for working day calculations
- `case_statutory_deadlines` - Case-specific deadline tracking

### Key Fields
| Table | Field | Description |
|-------|-------|-------------|
| statutory_event_types | deadline_days | Number of days for deadline |
| statutory_event_types | deadline_months | Number of months for deadline |
| statutory_event_types | is_working_days | Whether to calculate working days only |
| case_statutory_deadlines | calculated_deadline | The computed deadline date |
| case_statutory_deadlines | status | pending/completed/overdue/extended |

## Configuration

### Environment Variables
No additional environment variables required. Module uses existing Supabase configuration.

### Feature Flags
The module is enabled by default. No feature flags required.

### Master Data Setup
1. Navigate to **Settings > Statutory Acts** to configure acts
2. Navigate to **Settings > Statutory Deadlines** to configure event types
3. Navigate to **Settings > Holidays** to configure holiday calendar

## Usage

### Auto-Deadline Calculation
1. Create or edit a case
2. Enter the **Notice Date**
3. Select the **Issue Type** (must match a statutory event type)
4. The **Reply Due Date** is automatically calculated
5. A "Statutory" badge indicates auto-calculation

### Manual Deadline Management
1. Navigate to case details
2. Use the Deadlines tab to view/manage deadlines
3. Apply extensions when needed with remarks

### Dashboard Monitoring
1. Add statutory deadline widgets to your dashboard
2. Monitor upcoming deadlines and breaches
3. Click on deadlines to navigate to case details

### Reporting
1. Navigate to **Reports > Statutory Deadlines**
2. Apply filters as needed
3. Export to Excel or PDF

## RAG Status Colors

| Status | Days Remaining | Color |
|--------|----------------|-------|
| Safe | > 15 days | Green |
| Warning | 1-15 days | Amber/Orange |
| Critical | 0 days (today) | Red |
| Overdue | < 0 days | Red (with overdue indicator) |

## API Reference

### Services
- `statutoryDeadlineService` - Core deadline calculations
- `deadlineNotificationService` - Notification processing
- `holidayService` - Holiday management

### Key Methods
```typescript
// Calculate deadline
const result = await statutoryDeadlineService.calculateDeadline(
  baseDate,
  eventType,
  state
);

// Get upcoming deadlines
const deadlines = await statutoryDeadlineService.getUpcomingDeadlines(30);

// Process notifications
await deadlineNotificationService.processDeadlineNotifications(tenantId, userId);
```

## Troubleshooting

### Deadline Not Auto-Calculating
1. Verify the Issue Type matches a configured statutory event type
2. Check that the Statutory Act is active
3. Ensure the event type has valid deadline_days or deadline_months

### Incorrect Working Day Calculation
1. Verify holidays are configured for the relevant state
2. Check that national holidays are marked correctly
3. Ensure the event type has `is_working_days: true`

### Notifications Not Sending
1. Check notification configuration in settings
2. Verify email service is configured (Resend)
3. Check edge function logs for errors

## Support

For issues or questions:
- Check the troubleshooting guide above
- Review console logs for errors
- Contact the development team
