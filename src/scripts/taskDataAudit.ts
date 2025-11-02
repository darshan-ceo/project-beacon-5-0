/**
 * Task Data Integrity Audit & Migration System
 * Detects orphan tasks, invalid references, date format issues, and performs auto-migration
 */

import { unifiedStore } from '@/persistence/unifiedStore';
import { formatDateForDisplay, formatDateForStorage, parseDateInput } from '@/utils/dateFormatters';
import type { Task, Case, Client, Hearing } from '@/contexts/AppStateContext';

export interface MigrationAction {
  taskId: string;
  taskTitle: string;
  issue: string;
  fix: 'auto' | 'manual';
  details: string;
  severity: 'critical' | 'warning' | 'info';
}

export interface TaskAuditResult {
  totalTasks: number;
  orphanTasks: Task[];           // Tasks with invalid caseId
  invalidCaseRefs: Task[];        // Tasks pointing to deleted cases
  invalidClientRefs: Task[];      // Tasks with wrong clientId
  missingHearingRefs: Task[];     // Invalid hearing_id references
  pastDueTasks: Task[];           // Overdue tasks (informational)
  invalidDateFormats: Task[];     // Tasks with non DD-MM-YYYY dates
  missingSLAData: Task[];         // Tasks missing SLA fields
  missingAuditTrail: Task[];      // Tasks without audit_trail
  migrationPlan: {
    fixable: number;              // Auto-fixable issues
    requiresManualReview: number; // Manual intervention needed
    actions: MigrationAction[];   // Detailed action list
  };
}

export interface MigrationResult {
  success: boolean;
  timestamp: string;
  migratedCount: number;
  fixedClientRefs: number;
  normalizedDates: number;
  placeholderCasesCreated: number;
  cleanedHearingRefs: number;
  initializedAuditTrails: number;
  addedSLAData: number;
  errors: string[];
  actions: MigrationAction[];
}

/**
 * Run comprehensive task data audit
 */
export async function runAudit(): Promise<TaskAuditResult> {
  console.log('🔍 Starting Task Data Integrity Audit...');
  
  await unifiedStore.waitUntilReady();
  
  // Load all data
  const [tasks, cases, clients, hearings] = await Promise.all([
    unifiedStore.tasks.getAll(),
    unifiedStore.cases.getAll(),
    unifiedStore.clients.getAll(),
    unifiedStore.hearings.getAll()
  ]);
  
  console.log(`📊 Auditing ${tasks.length} tasks, ${cases.length} cases, ${clients.length} clients, ${hearings.length} hearings`);
  
  // Build lookup maps for efficient validation
  const caseMap = new Map(cases.map(c => [c.id, c]));
  const clientMap = new Map(clients.map(c => [c.id, c]));
  const hearingMap = new Map(hearings.map(h => [h.id, h]));
  const caseNumberMap = new Map(cases.map(c => [c.caseNumber, c]));
  
  // Initialize result containers
  const orphanTasks: Task[] = [];
  const invalidCaseRefs: Task[] = [];
  const invalidClientRefs: Task[] = [];
  const missingHearingRefs: Task[] = [];
  const pastDueTasks: Task[] = [];
  const invalidDateFormats: Task[] = [];
  const missingSLAData: Task[] = [];
  const missingAuditTrail: Task[] = [];
  const actions: MigrationAction[] = [];
  
  // Current date for overdue checks
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Audit each task
  for (const task of tasks) {
    // Check 1: Orphan tasks (invalid caseId)
    if (!caseMap.has(task.caseId)) {
      orphanTasks.push(task);
      invalidCaseRefs.push(task);
      
      // Check if we can match by caseNumber
      const matchingCase = caseNumberMap.get(task.caseNumber);
      if (matchingCase) {
        actions.push({
          taskId: task.id,
          taskTitle: task.title,
          issue: 'Orphan task - invalid case reference',
          fix: 'auto',
          details: `Task references deleted case. Can match to existing case by caseNumber: ${task.caseNumber} → ${matchingCase.id}`,
          severity: 'critical'
        });
      } else {
        actions.push({
          taskId: task.id,
          taskTitle: task.title,
          issue: 'Orphan task - case not found',
          fix: 'auto',
          details: `Will create placeholder case with caseNumber: ${task.caseNumber || `MIGRATED-${task.id.slice(0, 8)}`}`,
          severity: 'critical'
        });
      }
    } else {
      // Check 2: Invalid client references (clientId doesn't match case's client)
      const taskCase = caseMap.get(task.caseId);
      if (taskCase && task.clientId !== taskCase.clientId) {
        invalidClientRefs.push(task);
        actions.push({
          taskId: task.id,
          taskTitle: task.title,
          issue: 'Invalid client reference',
          fix: 'auto',
          details: `Task clientId (${task.clientId}) doesn't match case clientId (${taskCase.clientId}). Will fix.`,
          severity: 'critical'
        });
      }
    }
    
    // Check 3: Invalid hearing references
    if (task.hearing_id && !hearingMap.has(task.hearing_id)) {
      missingHearingRefs.push(task);
      actions.push({
        taskId: task.id,
        taskTitle: task.title,
        issue: 'Invalid hearing reference',
        fix: 'auto',
        details: `Task references deleted hearing (${task.hearing_id}). Will remove reference.`,
        severity: 'warning'
      });
    }
    
    // Check 4: Date format validation (must be DD-MM-YYYY)
    if (task.dueDate && !/^\d{2}-\d{2}-\d{4}$/.test(task.dueDate)) {
      invalidDateFormats.push(task);
      actions.push({
        taskId: task.id,
        taskTitle: task.title,
        issue: 'Invalid date format',
        fix: 'auto',
        details: `Due date "${task.dueDate}" is not in DD-MM-YYYY format. Will normalize.`,
        severity: 'warning'
      });
    }
    
    // Check 5: Past due tasks (informational)
    if (task.dueDate && task.status !== 'Completed') {
      const dueDate = parseDateInput(task.dueDate);
      if (dueDate && dueDate < today) {
        pastDueTasks.push(task);
      }
    }
    
    // Check 6: Missing SLA data
    if (!task.slaDeadline || !task.slaStatus) {
      missingSLAData.push(task);
      actions.push({
        taskId: task.id,
        taskTitle: task.title,
        issue: 'Missing SLA data',
        fix: 'auto',
        details: 'Task missing slaDeadline or slaStatus. Will initialize.',
        severity: 'info'
      });
    }
    
    // Check 7: Missing audit trail
    if (!task.audit_trail || !task.audit_trail.created_at) {
      missingAuditTrail.push(task);
      actions.push({
        taskId: task.id,
        taskTitle: task.title,
        issue: 'Missing audit trail',
        fix: 'auto',
        details: 'Task missing audit_trail structure. Will initialize.',
        severity: 'info'
      });
    }
  }
  
  // Calculate migration plan
  const fixable = actions.filter(a => a.fix === 'auto').length;
  const requiresManualReview = actions.filter(a => a.fix === 'manual').length;
  
  console.log(`✅ Audit Complete:
    - Total Tasks: ${tasks.length}
    - Orphan Tasks: ${orphanTasks.length}
    - Invalid Client Refs: ${invalidClientRefs.length}
    - Invalid Hearing Refs: ${missingHearingRefs.length}
    - Invalid Date Formats: ${invalidDateFormats.length}
    - Missing SLA Data: ${missingSLAData.length}
    - Missing Audit Trail: ${missingAuditTrail.length}
    - Past Due Tasks: ${pastDueTasks.length}
    - Auto-Fixable: ${fixable}
    - Manual Review: ${requiresManualReview}`
  );
  
  return {
    totalTasks: tasks.length,
    orphanTasks,
    invalidCaseRefs,
    invalidClientRefs,
    missingHearingRefs,
    pastDueTasks,
    invalidDateFormats,
    missingSLAData,
    missingAuditTrail,
    migrationPlan: {
      fixable,
      requiresManualReview,
      actions
    }
  };
}

/**
 * Execute full migration based on audit results
 */
export async function runFullMigration(auditResult: TaskAuditResult): Promise<MigrationResult> {
  console.log('🚀 Starting Task Data Migration...');
  
  await unifiedStore.waitUntilReady();
  
  const result: MigrationResult = {
    success: false,
    timestamp: new Date().toISOString(),
    migratedCount: 0,
    fixedClientRefs: 0,
    normalizedDates: 0,
    placeholderCasesCreated: 0,
    cleanedHearingRefs: 0,
    initializedAuditTrails: 0,
    addedSLAData: 0,
    errors: [],
    actions: []
  };
  
  try {
    // Step 1: Migrate orphan tasks
    const orphanResult = await migrateOrphanTasks(auditResult.orphanTasks);
    result.migratedCount += orphanResult.migrated;
    result.placeholderCasesCreated += orphanResult.placeholders;
    result.errors.push(...orphanResult.errors);
    
    // Step 2: Fix invalid client references
    const clientResult = await fixInvalidClientRefs(auditResult.invalidClientRefs);
    result.fixedClientRefs = clientResult.fixed;
    result.errors.push(...clientResult.errors);
    
    // Step 3: Normalize date formats
    const dateResult = await normalizeDateFormats(auditResult.invalidDateFormats);
    result.normalizedDates = dateResult.normalized;
    result.errors.push(...dateResult.errors);
    
    // Step 4: Clean invalid hearing references
    const hearingResult = await removeInvalidHearingRefs(auditResult.missingHearingRefs);
    result.cleanedHearingRefs = hearingResult.cleaned;
    result.errors.push(...hearingResult.errors);
    
    // Step 5: Initialize audit trails
    const auditResult2 = await initializeAuditTrails(auditResult.missingAuditTrail);
    result.initializedAuditTrails = auditResult2.initialized;
    result.errors.push(...auditResult2.errors);
    
    // Step 6: Add SLA data
    const slaResult = await addMissingSLAData(auditResult.missingSLAData);
    result.addedSLAData = slaResult.added;
    result.errors.push(...slaResult.errors);
    
    result.success = result.errors.length === 0;
    
    console.log(`✅ Migration Complete:
      - Migrated Orphans: ${result.migratedCount}
      - Fixed Client Refs: ${result.fixedClientRefs}
      - Normalized Dates: ${result.normalizedDates}
      - Placeholder Cases: ${result.placeholderCasesCreated}
      - Cleaned Hearing Refs: ${result.cleanedHearingRefs}
      - Initialized Audit Trails: ${result.initializedAuditTrails}
      - Added SLA Data: ${result.addedSLAData}
      - Errors: ${result.errors.length}`
    );
    
    return result;
  } catch (error) {
    result.success = false;
    result.errors.push(`Migration failed: ${error}`);
    console.error('❌ Migration failed:', error);
    return result;
  }
}

/**
 * Migrate orphan tasks by matching to existing cases or creating placeholders
 */
async function migrateOrphanTasks(orphanTasks: Task[]): Promise<{ migrated: number; placeholders: number; errors: string[] }> {
  const result = { migrated: 0, placeholders: 0, errors: [] as string[] };
  
  if (orphanTasks.length === 0) return result;
  
  console.log(`🔄 Migrating ${orphanTasks.length} orphan tasks...`);
  
  const cases = await unifiedStore.cases.getAll();
  const caseNumberMap = new Map(cases.map(c => [c.caseNumber, c]));
  
  for (const task of orphanTasks) {
    try {
      // Try to match by caseNumber
      const matchingCase = caseNumberMap.get(task.caseNumber);
      
      if (matchingCase) {
        // Found matching case - update task
        await unifiedStore.tasks.update(task.id, {
          caseId: matchingCase.id,
          clientId: matchingCase.clientId,
          audit_trail: {
            ...task.audit_trail,
            updated_by: 'system_migration',
            updated_at: new Date().toISOString(),
            change_log: [
              ...(task.audit_trail?.change_log || []),
              {
                field: 'caseId',
                old_value: task.caseId,
                new_value: matchingCase.id,
                changed_by: 'system_migration',
                changed_at: new Date().toISOString()
              }
            ]
          }
        });
        result.migrated++;
      } else {
        // No match - create placeholder case
        const placeholderCase: Case = {
          id: `case-migration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          caseNumber: task.caseNumber || `MIGRATED-${task.id.slice(0, 8)}`,
          title: `Auto-created for Task: ${task.title}`,
          clientId: task.clientId || 'unknown',
          currentStage: (task.stage as any) || 'Assessment',
          priority: task.priority === 'Critical' || task.priority === 'High' ? 'High' : 'Medium',
          timelineBreachStatus: 'Green',
          status: 'Active',
          assignedToId: task.assignedToId,
          assignedToName: task.assignedToName,
          createdDate: task.createdDate || new Date().toISOString().split('T')[0],
          lastUpdated: new Date().toISOString().split('T')[0],
          documents: 0,
          progress: 0,
          generatedForms: [],
          description: `Placeholder case created during task migration on ${new Date().toLocaleDateString('en-GB')}`
        };
        
        await unifiedStore.cases.create(placeholderCase);
        
        await unifiedStore.tasks.update(task.id, {
          caseId: placeholderCase.id,
          clientId: placeholderCase.clientId
        });
        
        result.placeholders++;
        result.migrated++;
      }
    } catch (error) {
      result.errors.push(`Failed to migrate task ${task.id}: ${error}`);
    }
  }
  
  console.log(`✅ Migrated ${result.migrated} orphan tasks (${result.placeholders} placeholder cases created)`);
  return result;
}

/**
 * Fix invalid client references by deriving from case
 */
async function fixInvalidClientRefs(invalidTasks: Task[]): Promise<{ fixed: number; errors: string[] }> {
  const result = { fixed: 0, errors: [] as string[] };
  
  if (invalidTasks.length === 0) return result;
  
  console.log(`🔄 Fixing ${invalidTasks.length} invalid client references...`);
  
  for (const task of invalidTasks) {
    try {
      const taskCase = await unifiedStore.cases.getById(task.caseId);
      if (taskCase) {
        await unifiedStore.tasks.update(task.id, {
          clientId: taskCase.clientId
        });
        result.fixed++;
      }
    } catch (error) {
      result.errors.push(`Failed to fix client ref for task ${task.id}: ${error}`);
    }
  }
  
  console.log(`✅ Fixed ${result.fixed} client references`);
  return result;
}

/**
 * Normalize date formats to DD-MM-YYYY
 */
async function normalizeDateFormats(invalidTasks: Task[]): Promise<{ normalized: number; errors: string[] }> {
  const result = { normalized: 0, errors: [] as string[] };
  
  if (invalidTasks.length === 0) return result;
  
  console.log(`🔄 Normalizing ${invalidTasks.length} date formats...`);
  
  for (const task of invalidTasks) {
    try {
      let normalizedDate: string;
      
      // Format 1: YYYY-MM-DD → DD-MM-YYYY
      if (/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)) {
        const [y, m, d] = task.dueDate.split('-');
        normalizedDate = `${d}-${m}-${y}`;
      }
      // Format 2: DD/MM/YYYY → DD-MM-YYYY
      else if (/^\d{2}\/\d{2}\/\d{4}$/.test(task.dueDate)) {
        normalizedDate = task.dueDate.replace(/\//g, '-');
      }
      // Format 3: ISO 8601 → DD-MM-YYYY
      else {
        const parsed = new Date(task.dueDate);
        if (!isNaN(parsed.getTime())) {
          normalizedDate = formatDateForDisplay(task.dueDate);
        } else {
          throw new Error('Unparseable date');
        }
      }
      
      await unifiedStore.tasks.update(task.id, {
        dueDate: normalizedDate,
        dueDateValidated: true
      });
      
      result.normalized++;
    } catch (error) {
      result.errors.push(`Failed to normalize date for task ${task.id}: ${error}`);
    }
  }
  
  console.log(`✅ Normalized ${result.normalized} date formats`);
  return result;
}

/**
 * Remove invalid hearing references
 */
async function removeInvalidHearingRefs(invalidTasks: Task[]): Promise<{ cleaned: number; errors: string[] }> {
  const result = { cleaned: 0, errors: [] as string[] };
  
  if (invalidTasks.length === 0) return result;
  
  console.log(`🔄 Cleaning ${invalidTasks.length} invalid hearing references...`);
  
  for (const task of invalidTasks) {
    try {
      await unifiedStore.tasks.update(task.id, {
        hearing_id: undefined,
        hearingDate: undefined
      });
      result.cleaned++;
    } catch (error) {
      result.errors.push(`Failed to clean hearing ref for task ${task.id}: ${error}`);
    }
  }
  
  console.log(`✅ Cleaned ${result.cleaned} hearing references`);
  return result;
}

/**
 * Initialize audit trails for legacy tasks
 */
async function initializeAuditTrails(tasksWithoutTrail: Task[]): Promise<{ initialized: number; errors: string[] }> {
  const result = { initialized: 0, errors: [] as string[] };
  
  if (tasksWithoutTrail.length === 0) return result;
  
  console.log(`🔄 Initializing ${tasksWithoutTrail.length} audit trails...`);
  
  for (const task of tasksWithoutTrail) {
    try {
      await unifiedStore.tasks.update(task.id, {
        audit_trail: {
          created_by: task.assignedById || 'unknown',
          created_at: task.createdDate || new Date().toISOString(),
          updated_by: 'system_migration',
          updated_at: new Date().toISOString(),
          change_log: []
        }
      });
      result.initialized++;
    } catch (error) {
      result.errors.push(`Failed to initialize audit trail for task ${task.id}: ${error}`);
    }
  }
  
  console.log(`✅ Initialized ${result.initialized} audit trails`);
  return result;
}

/**
 * Add missing SLA data to tasks
 */
async function addMissingSLAData(tasksWithoutSLA: Task[]): Promise<{ added: number; errors: string[] }> {
  const result = { added: 0, errors: [] as string[] };
  
  if (tasksWithoutSLA.length === 0) return result;
  
  console.log(`🔄 Adding SLA data to ${tasksWithoutSLA.length} tasks...`);
  
  for (const task of tasksWithoutSLA) {
    try {
      // Calculate SLA deadline from due date (same as due date by default)
      const slaDeadline = task.dueDate ? formatDateForStorage(task.dueDate) : undefined;
      
      // Determine SLA status
      let slaStatus: 'on_track' | 'at_risk' | 'breached' = 'on_track';
      if (task.status === 'Completed') {
        slaStatus = 'on_track';
      } else if (task.status === 'Overdue') {
        slaStatus = 'breached';
      }
      
      await unifiedStore.tasks.update(task.id, {
        slaDeadline,
        slaBuffer: 24, // 24 hours default buffer
        slaStatus
      });
      
      result.added++;
    } catch (error) {
      result.errors.push(`Failed to add SLA data for task ${task.id}: ${error}`);
    }
  }
  
  console.log(`✅ Added SLA data to ${result.added} tasks`);
  return result;
}

/**
 * Export audit report as JSON
 */
export function exportAuditReport(auditResult: TaskAuditResult): void {
  const report = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    audit: {
      total_tasks: auditResult.totalTasks,
      critical_issues: auditResult.orphanTasks.length + auditResult.invalidClientRefs.length,
      auto_fixable: auditResult.migrationPlan.fixable,
      manual_review: auditResult.migrationPlan.requiresManualReview
    },
    issues: {
      orphan_tasks: auditResult.orphanTasks.map(t => ({
        task_id: t.id,
        title: t.title,
        case_number: t.caseNumber,
        issue: 'Invalid caseId reference',
        fix_type: 'auto'
      })),
      invalid_client_refs: auditResult.invalidClientRefs.map(t => ({
        task_id: t.id,
        title: t.title,
        issue: 'Client ID mismatch',
        fix_type: 'auto'
      })),
      invalid_dates: auditResult.invalidDateFormats.map(t => ({
        task_id: t.id,
        title: t.title,
        current_format: t.dueDate,
        issue: 'Non DD-MM-YYYY format',
        fix_type: 'auto'
      })),
      invalid_hearing_refs: auditResult.missingHearingRefs.map(t => ({
        task_id: t.id,
        title: t.title,
        issue: 'Invalid hearing reference',
        fix_type: 'auto'
      }))
    },
    migration_plan: {
      steps: auditResult.migrationPlan.actions,
      estimated_duration_ms: auditResult.migrationPlan.fixable * 100
    }
  };
  
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `task-audit-report-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  console.log('📥 Audit report exported');
}

/**
 * Generate text report for human readability
 */
export function generateTextReport(auditResult: TaskAuditResult): string {
  const timestamp = new Date().toLocaleString('en-GB', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Kolkata'
  });
  
  let report = `
=================================================================
                TASK DATA INTEGRITY AUDIT REPORT
=================================================================
Generated: ${timestamp}
Database: hoffice_dev_local (IndexedDB)

EXECUTIVE SUMMARY
-----------------------------------------------------------------
Total Tasks Scanned:              ${auditResult.totalTasks}
Critical Issues Found:             ${auditResult.orphanTasks.length + auditResult.invalidClientRefs.length}
Auto-Fixable Issues:               ${auditResult.migrationPlan.fixable}
Requires Manual Review:            ${auditResult.migrationPlan.requiresManualReview}
Migration Status:            ${auditResult.migrationPlan.fixable > 0 ? 'REQUIRED' : 'CLEAN'}

ISSUE BREAKDOWN
-----------------------------------------------------------------
Category                    Count    Severity    Auto-Fix
-----------------------------------------------------------------
Orphan Tasks                  ${auditResult.orphanTasks.length.toString().padStart(2)}      CRITICAL       ✓
Invalid Client References     ${auditResult.invalidClientRefs.length.toString().padStart(2)}      CRITICAL       ✓
Invalid Hearing References    ${auditResult.missingHearingRefs.length.toString().padStart(2)}      HIGH           ✓
Invalid Date Formats          ${auditResult.invalidDateFormats.length.toString().padStart(2)}      HIGH           ✓
Missing SLA Data              ${auditResult.missingSLAData.length.toString().padStart(2)}      MEDIUM         ✓
Missing Audit Trail           ${auditResult.missingAuditTrail.length.toString().padStart(2)}      MEDIUM         ✓
Past Due Tasks                ${auditResult.pastDueTasks.length.toString().padStart(2)}      INFO           -
-----------------------------------------------------------------

DETAILED FINDINGS
-----------------------------------------------------------------
`;

  if (auditResult.orphanTasks.length > 0) {
    report += `\n[1] ORPHAN TASKS (${auditResult.orphanTasks.length} found)\n`;
    auditResult.orphanTasks.slice(0, 5).forEach(task => {
      report += `  ├─ ${task.id}: "${task.title}"\n`;
      report += `  │  Issue: Invalid caseId reference (${task.caseId})\n`;
      report += `  │  Fix: Match by caseNumber ${task.caseNumber}\n  │\n`;
    });
    if (auditResult.orphanTasks.length > 5) {
      report += `  └─ ... and ${auditResult.orphanTasks.length - 5} more\n`;
    }
  }

  if (auditResult.invalidDateFormats.length > 0) {
    report += `\n[2] INVALID DATE FORMATS (${auditResult.invalidDateFormats.length} found)\n`;
    auditResult.invalidDateFormats.slice(0, 5).forEach(task => {
      report += `  ├─ ${task.id}: "${task.title}"\n`;
      report += `  │  Current: ${task.dueDate}\n`;
      report += `  │  Fix: Normalize to DD-MM-YYYY format\n  │\n`;
    });
    if (auditResult.invalidDateFormats.length > 5) {
      report += `  └─ ... and ${auditResult.invalidDateFormats.length - 5} more\n`;
    }
  }

  report += `
MIGRATION PLAN
-----------------------------------------------------------------
Step 1: Migrate ${auditResult.orphanTasks.length} orphan tasks               [AUTO]
Step 2: Fix ${auditResult.invalidClientRefs.length} client references               [AUTO]
Step 3: Remove ${auditResult.missingHearingRefs.length} invalid hearing refs         [AUTO]
Step 4: Normalize ${auditResult.invalidDateFormats.length} date formats              [AUTO]
Step 5: Calculate SLA data for ${auditResult.missingSLAData.length} tasks        [AUTO]

Estimated Duration: ~${Math.ceil(auditResult.migrationPlan.fixable / 10)} seconds
Risk Level: LOW (reversible via backup)

RECOMMENDATIONS
-----------------------------------------------------------------
1. Review migration plan before execution
2. Export current data as backup
3. Run migration during low-usage period
4. Verify results in UI after migration

=================================================================
`;

  return report;
}
