# Calendar Integration Guide

## Connecting Your Calendar

Project Beacon integrates with Google Calendar and Outlook to sync hearings and deadlines with your personal calendar.

---

## Supported Platforms

| Platform | Sync Type | Features |
|----------|-----------|----------|
| **Google Calendar** | Two-way | Full sync, reminders, attendees |
| **Microsoft Outlook** | Two-way | Full sync, reminders, attendees |
| **iCal/Apple Calendar** | Export only | ICS file download |

---

## Frequently Asked Questions

### How do I connect my calendar?

1. Go to **Profile → Integrations** or **System Settings → Calendar Integration**
2. Click **Connect Google Calendar** or **Connect Outlook**
3. Sign in to your Google/Microsoft account
4. Grant permission to access your calendar
5. Select which calendar to sync to
6. Done! Hearings will sync automatically

### What gets synced to my calendar?

| From Beacon | To Calendar |
|-------------|-------------|
| Hearing date/time | Event date/time |
| Case name | Event title |
| Court/Authority | Event location |
| Hearing type | Event description |
| Attendees | Invitees (optional) |
| Reminders | Calendar reminders |

### Are changes in my calendar synced back?

With two-way sync enabled:
- **Time changes**: If you reschedule in calendar, Beacon updates
- **Cancellations**: Deleting in calendar marks as cancelled in Beacon
- **New events**: Events created in calendar do NOT create hearings in Beacon

⚠️ We recommend making changes in Project Beacon for accurate tracking.

### Can I choose which hearings to sync?

Yes! In integration settings:
- **All hearings**: Everything syncs
- **My hearings only**: Only hearings where you're assigned
- **Specific cases**: Select cases to sync
- **Manual only**: No auto-sync; use "Add to Calendar" per hearing

### How do I set up reminders?

Calendar integration uses your calendar's default reminder settings, plus:
1. Go to **Calendar Integration → Reminder Settings**
2. Set Beacon-side reminders (e.g., email 1 day before)
3. These work even without calendar integration

### What if my calendar shows duplicate events?

This can happen if:
1. You synced twice with different settings
2. Multiple users are syncing the same hearing

To fix:
1. Disconnect the integration
2. Delete duplicate events from calendar
3. Reconnect with correct settings

### Can team members see each other's hearings?

Only if:
- They have access to the case (data scope allows)
- They're invited as attendees
- They're using a shared team calendar

Individual calendar sync is personal by default.

### How do I export for iCal/Apple Calendar?

For platforms without direct integration:
1. Go to **Hearings** or open a specific hearing
2. Click **Export to Calendar** (or ICS icon)
3. Download the .ics file
4. Import into your calendar application

### What happens if I disconnect?

- Future sync stops immediately
- Existing calendar events remain (you can delete manually)
- Beacon data is unaffected
- You can reconnect anytime

---

## Troubleshooting

### Events not syncing?
1. Check integration status in Settings (should show "Connected")
2. Verify the correct calendar is selected
3. Try disconnecting and reconnecting
4. Check if you have access to the hearings

### Wrong time zone?
1. Verify Beacon time zone in Profile settings
2. Check calendar application time zone
3. They should match for correct sync

### Permission errors?
1. The calendar permission may have expired
2. Disconnect and reconnect the integration
3. Ensure you're signing in with the correct account

---

**Related Articles:**
- [Hearing Management Guide](/help/pages/hearings)
- [Notification Preferences](/help/articles/notification-preferences)
- [Profile Settings](/help/pages/profile)
