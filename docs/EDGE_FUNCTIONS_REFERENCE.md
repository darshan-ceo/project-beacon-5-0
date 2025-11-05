# Edge Functions API Reference

---

## Authentication

All Edge Functions require Bearer token authentication:

```typescript
Authorization: Bearer <LOVABLE_API_KEY>
```

---

## Functions

### check-sla-and-overdue

**Endpoint:** `POST /functions/v1/check-sla-and-overdue`

**Purpose:** Detect overdue tasks and SLA violations

**Request Body:**
```json
{
  "executedAt": "2025-01-15T10:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "overdueTasks": 5,
  "slaViolations": 2,
  "executionTime": "2.3s"
}
```

---

### send-hearing-reminders

**Endpoint:** `POST /functions/v1/send-hearing-reminders`

**Purpose:** Send daily hearing reminders

**Response:**
```json
{
  "success": true,
  "hearingsProcessed": 8,
  "notificationsSent": 16
}
```

---

### analytics-snapshot

**Endpoint:** `POST /functions/v1/analytics-snapshot`

**Purpose:** Capture daily metrics

**Response:**
```json
{
  "success": true,
  "metricsCount": 6,
  "anomalyDetected": false
}
```

---

### check-upcoming-deadlines

**Endpoint:** `POST /functions/v1/check-upcoming-deadlines`

**Purpose:** Alert on upcoming deadlines

**Response:**
```json
{
  "success": true,
  "upcomingTasks": 8,
  "upcomingHearings": 3
}
```

---

### automation-health-check

**Endpoint:** `POST /functions/v1/automation-health-check`

**Purpose:** Monitor automation system health

**Response:**
```json
{
  "success": true,
  "totalRules": 12,
  "successRate": 0.95,
  "degradedRules": []
}
```
