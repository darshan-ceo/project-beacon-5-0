# Task Automation & Escalation System

## Overview
Complete implementation of Phase 2: Task Automation & Escalation for the GST Litigation Management System.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Automation System Flow                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  System Events → Event Emitter → Rule Engine → Actions      │
│  (case/task     (automationEvent (evaluates    (create      │
│   updates)       Emitter)         conditions)   tasks,      │
│                                                  notify,     │
│                                                  escalate)   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Automation Rule Engine (`src/services/automationRuleEngine.ts`)
**Purpose:** Central orchestrator for all automation logic

**Key Features:**
- CRUD operations for automation rules
- Event-driven rule evaluation
- Action execution (task creation, notifications, escalations)
- Comprehensive logging and audit trails
- Performance statistics

**Key Methods:**
- `createRule()` - Create new automation rule
- `processEvent()` - Evaluate and execute rules based on events
- `getExecutionLogs()` - Retrieve execution history
- `getExecutionStats()` - Get performance metrics

### 2. Event Emitter (`src/services/automationEventEmitter.ts`)
**Purpose:** Broadcast system events to trigger automation

**Supported Events:**
- `case_stage_changed` - When case moves between stages
- `hearing_scheduled` - New hearing created
- `hearing_updated` - Hearing details modified
- `document_uploaded` - Document added to case
- `task_overdue` - Task past due date
- `case_created` - New case created
- `task_created` - New task created
- `task_completed` - Task marked complete

**Usage Example:**
```typescript
import { automationEventEmitter } from '@/services/automationEventEmitter';

// Emit event when case stage changes
await automationEventEmitter.emitCaseStageChanged(
  caseId,
  'Notice Received',
  'Reply Filed',
  caseData
);
```

### 3. Notification Service (`src/services/notificationService.ts`)
**Purpose:** Multi-channel notification delivery

**Features:**
- Multi-channel support (in-app, email, SMS, WhatsApp)
- Template-based notifications
- User preferences management
- Delivery tracking
- Bulk sending support

**Notification Templates:**
- `task_assigned` - Task assignment notifications
- `task_overdue` - Overdue task alerts
- `hearing_reminder` - Hearing reminders
- `escalation_alert` - Escalation notifications
- `stage_changed` - Stage transition updates
- And 5 more...

### 4. SLA Monitor (`src/services/slaMonitor.ts`)
**Purpose:** Monitor task compliance with SLA thresholds

**Features:**
- Configurable SLA thresholds by priority
- Background monitoring (15-minute intervals)
- Automatic overdue detection
- Warning and critical threshold alerts

**Default Thresholds:**
- Critical: 4h warning, 8h critical
- High: 24h warning, 48h critical
- Medium: 72h warning, 120h critical
- Low: 168h warning, 240h critical

### 5. Automation Scheduler (`src/services/automationScheduler.ts`)
**Purpose:** Background job orchestration

**Scheduled Jobs:**
- Overdue task checks (every 15 minutes)
- SLA monitoring (every 15 minutes via SLA Monitor)
- Deadline reminders (every hour)

## User Interface Components

### 1. Automation Rules (`src/components/tasks/AutomationRules.tsx`)
**Location:** Tasks → Task Automation → Automation Rules tab

**Features:**
- Visual rule creation wizard
- Rule list with status indicators
- Enable/disable toggle
- Execution statistics
- Success rate metrics
- Rule editing and deletion

**UI Sections:**
- Header with "New Rule" button
- Stats cards (Total Rules, Active Rules, Executions, Success Rate)
- Active rules list with details
- Inactive rules section
- Create/Edit rule dialog

### 2. Automation Logs (`src/components/tasks/AutomationLogs.tsx`)
**Location:** Tasks → Task Automation → Execution Logs tab

**Features:**
- Real-time execution log viewer
- Expandable log details
- Status filtering (success/partial/failed)
- Search by rule name or event
- Performance metrics
- Action-level results

**UI Sections:**
- Header with refresh button
- Stats cards (Executions, Success Rate, Avg Time, Active Rules)
- Search and filter controls
- Expandable log entries with full details
- Action results with timing data

### 3. Task Automation Integration
**Location:** Tasks → Task Automation

**Tab Structure:**
1. **Task Bundles** - Existing task bundle management
2. **Automation Rules** - New automation rules interface
3. **Execution Logs** - New execution monitoring
4. **Analytics** - Existing analytics dashboard

## Default Automation Rules

Seven GST-specific automation rules are seeded automatically:

1. **GST Appeal Deadline Tracker**
   - Trigger: Stage → Appeal Order
   - Action: Create appeal filing task bundle

2. **Hearing Preparation Automation**
   - Trigger: Hearing scheduled
   - Action: Create hearing prep tasks + notifications

3. **Assessment Response Automation**
   - Trigger: Stage → Assessment Notice Received
   - Action: Create response tasks

4. **Overdue Task Escalation**
   - Trigger: Task overdue > 24h, High/Critical priority
   - Action: Escalate to manager + notify

5. **Document Upload Follow-up**
   - Trigger: Document uploaded (Order type)
   - Action: Send notifications

6. **Notice Response Automation**
   - Trigger: Stage → Notice Received
   - Action: Create response task bundle

7. **Case Created - Initial Setup**
   - Trigger: New case created
   - Action: Create initial assessment tasks

## Database Schema

### Automation Tables (IndexedDB)
```typescript
automation_rules: 'id, isActive, trigger.event, createdAt'
automation_logs: 'id, ruleId, timestamp, status'
```

### Rule Structure
```typescript
interface AutomationRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  trigger: {
    event: AutomationTriggerEvent;
    conditions?: {
      stageTo?: GSTStage;
      stageFrom?: GSTStage;
      priority?: string[];
      daysOverdue?: number;
      documentType?: string;
    };
  };
  actions: {
    createTaskBundle?: { bundleId: string };
    sendNotification?: {
      channels: NotificationChannel[];
      recipients: RecipientType[];
      template: string;
    };
    escalate?: {
      toRole: string;
      slaThreshold: number;
    };
  };
  executionCount: number;
  successCount: number;
  failureCount: number;
}
```

## Integration Points

### Connecting Event Emitters to Services

Use the helper utilities in `src/utils/automationEventConnectors.ts`:

```typescript
import { emitCaseStageChange } from '@/utils/automationEventConnectors';

// In your case service update method:
async updateCase(id: string, updates: Partial<Case>) {
  const existing = await this.getById(id);
  const updated = await this.storage.update('cases', id, updates);
  
  // Trigger automation if stage changed
  if (updates.currentStage && existing.currentStage !== updates.currentStage) {
    await emitCaseStageChange(
      id,
      existing.currentStage,
      updates.currentStage,
      updated
    );
  }
  
  return updated;
}
```

### Available Helper Functions
- `emitCaseStageChange(caseId, from, to, caseData)`
- `emitHearingSchedule(hearingId, caseId, hearingData)`
- `emitHearingUpdate(hearingId, caseId, hearingData)`
- `emitDocumentUpload(documentId, caseId, type, data)`
- `emitCaseCreation(caseId, caseData)`
- `emitTaskCreation(taskId, caseId, taskData)`
- `emitTaskCompletion(taskId, caseId, taskData)`

## Initialization

The automation system is automatically initialized via the `useAutomation` hook in `App.tsx`:

```typescript
// Initializes:
// 1. Automation rule engine
// 2. Event listener connections
// 3. Background scheduler (SLA monitor, overdue checks)
useAutomation();
```

## Testing the System

### Manual Testing Steps

1. **Navigate to Task Automation**
   - Go to Tasks → Task Automation
   - Check "Automation Rules" tab loads
   - Verify 7 default rules are present

2. **Test Rule Creation**
   - Click "New Rule" button
   - Fill in rule details
   - Select trigger (e.g., "Case Stage Changed")
   - Add actions (task bundle, notifications)
   - Save and verify rule appears in list

3. **Test Rule Execution**
   - Create or update a case to trigger a rule
   - Check "Execution Logs" tab for new log entry
   - Verify tasks were created (if configured)
   - Check notifications were sent

4. **Test Rule Toggle**
   - Disable a rule via switch
   - Verify rule no longer executes
   - Re-enable and verify it works again

5. **Monitor Performance**
   - Check stats cards for execution counts
   - Review success rates
   - Examine average execution times

### Programmatic Testing

```typescript
// Test rule creation
import { automationRuleEngine } from '@/services/automationRuleEngine';

await automationRuleEngine.initialize();
const rule = await automationRuleEngine.createRule({
  name: 'Test Rule',
  description: 'Testing automation',
  isActive: true,
  trigger: { event: 'case_created' },
  actions: {
    sendNotification: {
      channels: ['in_app'],
      recipients: ['assignee'],
      template: 'task_assigned'
    }
  },
  createdBy: 'test'
});

// Test event emission
import { automationEventEmitter } from '@/services/automationEventEmitter';

await automationEventEmitter.emitCaseCreated('test-case-id', { /* case data */ });

// Check logs
const logs = await automationRuleEngine.getExecutionLogs();
console.log('Execution logs:', logs);
```

## Performance Considerations

### Optimization Strategies
1. **Rule Caching** - Active rules cached in memory
2. **Batch Notifications** - Multiple notifications grouped
3. **Indexed Queries** - Database indexes on ruleId, timestamp
4. **Debounced Events** - Prevent event storms (future enhancement)

### Current Performance
- Rule evaluation: <50ms per rule
- Action execution: 100-500ms depending on complexity
- Background jobs: Minimal impact on UI performance

## Future Enhancements

### Planned Features
1. **Advanced Conditions**
   - Multi-field condition matching
   - Conditional branching
   - Cross-case automation

2. **Workflow Builder**
   - Visual workflow designer
   - Multi-step automation
   - Approval workflows

3. **AI Integration**
   - Intelligent rule suggestions
   - Predictive task creation
   - Workload optimization

4. **Real-time Updates**
   - WebSocket integration
   - Live log streaming
   - Push notifications

5. **Advanced Analytics**
   - Rule performance dashboards
   - Trend analysis
   - ROI metrics

## Troubleshooting

### Common Issues

**Issue:** Rules not triggering
**Solution:** 
1. Check rule is active (toggle switch)
2. Verify event emitter is connected to service
3. Check execution logs for errors
4. Confirm conditions match event payload

**Issue:** Notifications not delivered
**Solution:**
1. Check user preferences (channels enabled)
2. Verify template exists
3. Check console for notification errors
4. Confirm recipients exist

**Issue:** Tasks not created from automation
**Solution:**
1. Verify task bundle ID exists
2. Check case data is complete
3. Review execution log for errors
4. Confirm task bundle trigger service is initialized

### Debug Mode

Enable detailed logging:
```typescript
// In browser console
localStorage.setItem('automation_debug', 'true');

// Refresh page, automation will log detailed info
```

## API Reference

### Automation Rule Engine

```typescript
class AutomationRuleEngine {
  initialize(): Promise<void>
  createRule(rule: Omit<AutomationRule, 'id' | ...>): Promise<AutomationRule>
  updateRule(id: string, updates: Partial<AutomationRule>): Promise<void>
  deleteRule(id: string): Promise<void>
  getActiveRules(): Promise<AutomationRule[]>
  getAllRules(): Promise<AutomationRule[]>
  getRule(id: string): Promise<AutomationRule | null>
  processEvent(event: AutomationEvent): Promise<AutomationResult>
  getExecutionLogs(ruleId?: string, limit?: number): Promise<AutomationLog[]>
  getExecutionStats(): Promise<AutomationStats>
}
```

### Event Emitter

```typescript
class AutomationEventEmitter {
  on(eventType: AutomationTriggerEvent, handler: (event) => void): void
  off(eventType: AutomationTriggerEvent, handler: (event) => void): void
  emit(eventType: AutomationTriggerEvent, payload: any): Promise<void>
  
  // Convenience methods
  emitCaseStageChanged(caseId, from, to, data?): Promise<void>
  emitHearingScheduled(hearingId, caseId, data?): Promise<void>
  emitTaskOverdue(taskId, caseId, daysOverdue, data?): Promise<void>
  // ... and more
}
```

### Notification Service

```typescript
class NotificationService {
  send(config: NotificationConfig): Promise<void>
  sendBulk(notifications: Notification[]): Promise<void>
  getUserPreferences(userId: string): Promise<NotificationPreferences>
  updatePreferences(userId, prefs): Promise<void>
  getDeliveryStatus(notificationId: string): Promise<Notification | null>
  getRecentNotifications(userId?, limit?): Notification[]
}
```

## Support

For questions or issues:
1. Check execution logs in UI
2. Review browser console for errors
3. Refer to this documentation
4. Check code comments in source files

## License

Part of the GST Litigation Management System - Internal Use Only
