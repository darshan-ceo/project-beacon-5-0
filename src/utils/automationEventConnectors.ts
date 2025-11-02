/**
 * Helper utilities to connect automation event emitters to existing services
 * These can be called from service methods to trigger automation rules
 */

import { automationEventEmitter } from '@/services/automationEventEmitter';
import { GSTStage } from '../../config/appConfig';

/**
 * Call this when a case's stage changes
 * Example: await emitCaseStageChange(caseId, 'Notice', 'Reply Filed', caseData);
 */
export async function emitCaseStageChange(
  caseId: string,
  from: GSTStage,
  to: GSTStage,
  caseData?: any
): Promise<void> {
  await automationEventEmitter.emitCaseStageChanged(caseId, from, to, caseData);
}

/**
 * Call this when a hearing is scheduled
 * Example: await emitHearingSchedule(hearingId, caseId, hearingData);
 */
export async function emitHearingSchedule(
  hearingId: string,
  caseId: string,
  hearingData?: any
): Promise<void> {
  await automationEventEmitter.emitHearingScheduled(hearingId, caseId, hearingData);
}

/**
 * Call this when a hearing is updated
 * Example: await emitHearingUpdate(hearingId, caseId, hearingData);
 */
export async function emitHearingUpdate(
  hearingId: string,
  caseId: string,
  hearingData?: any
): Promise<void> {
  await automationEventEmitter.emitHearingUpdated(hearingId, caseId, hearingData);
}

/**
 * Call this when a document is uploaded
 * Example: await emitDocumentUpload(documentId, caseId, 'Order', documentData);
 */
export async function emitDocumentUpload(
  documentId: string,
  caseId: string,
  documentType?: string,
  documentData?: any
): Promise<void> {
  await automationEventEmitter.emitDocumentUploaded(documentId, caseId, documentType, documentData);
}

/**
 * Call this when a new case is created
 * Example: await emitCaseCreation(caseId, caseData);
 */
export async function emitCaseCreation(
  caseId: string,
  caseData?: any
): Promise<void> {
  await automationEventEmitter.emitCaseCreated(caseId, caseData);
}

/**
 * Call this when a task is created
 * Example: await emitTaskCreation(taskId, caseId, taskData);
 */
export async function emitTaskCreation(
  taskId: string,
  caseId: string,
  taskData?: any
): Promise<void> {
  await automationEventEmitter.emitTaskCreated(taskId, caseId, taskData);
}

/**
 * Call this when a task is completed
 * Example: await emitTaskCompletion(taskId, caseId, taskData);
 */
export async function emitTaskCompletion(
  taskId: string,
  caseId: string,
  taskData?: any
): Promise<void> {
  await automationEventEmitter.emitTaskCompleted(taskId, caseId, taskData);
}

// Example usage in a case service:
// 
// async updateCase(id: string, updates: Partial<Case>): Promise<Case> {
//   const existingCase = await this.getById(id);
//   const updatedCase = await this.storage.update('cases', id, updates);
//   
//   // Trigger automation if stage changed
//   if (updates.currentStage && existingCase.currentStage !== updates.currentStage) {
//     await emitCaseStageChange(
//       id,
//       existingCase.currentStage,
//       updates.currentStage,
//       updatedCase
//     );
//   }
//   
//   return updatedCase;
// }
