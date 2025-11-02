import { AutomationEvent, AutomationTriggerEvent } from '@/types/automation';
import { GSTStage } from '../../config/appConfig';

type EventHandler = (event: AutomationEvent) => void | Promise<void>;

class AutomationEventEmitter {
  private listeners: Map<AutomationTriggerEvent, EventHandler[]> = new Map();

  on(eventType: AutomationTriggerEvent, handler: EventHandler): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(handler);
  }

  off(eventType: AutomationTriggerEvent, handler: EventHandler): void {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  async emit(eventType: AutomationTriggerEvent, payload: any): Promise<void> {
    const event: AutomationEvent = {
      type: eventType,
      timestamp: new Date().toISOString(),
      payload
    };

    console.log('[AutomationEventEmitter] Emitting event:', eventType, payload);

    const handlers = this.listeners.get(eventType);
    if (handlers && handlers.length > 0) {
      // Execute all handlers in parallel
      await Promise.allSettled(
        handlers.map(handler => {
          try {
            return Promise.resolve(handler(event));
          } catch (error) {
            console.error(`[AutomationEventEmitter] Handler error for ${eventType}:`, error);
            return Promise.resolve();
          }
        })
      );
    }
  }

  // Convenience methods for common events
  async emitCaseStageChanged(
    caseId: string,
    from: GSTStage,
    to: GSTStage,
    caseData?: any
  ): Promise<void> {
    await this.emit('case_stage_changed', {
      caseId,
      stageFrom: from,
      stageTo: to,
      caseData
    });
  }

  async emitHearingScheduled(
    hearingId: string,
    caseId: string,
    hearingData?: any
  ): Promise<void> {
    await this.emit('hearing_scheduled', {
      hearingId,
      caseId,
      hearingData
    });
  }

  async emitHearingUpdated(
    hearingId: string,
    caseId: string,
    hearingData?: any
  ): Promise<void> {
    await this.emit('hearing_updated', {
      hearingId,
      caseId,
      hearingData
    });
  }

  async emitTaskOverdue(
    taskId: string,
    caseId: string,
    daysOverdue: number,
    taskData?: any
  ): Promise<void> {
    await this.emit('task_overdue', {
      taskId,
      caseId,
      daysOverdue,
      taskData
    });
  }

  async emitDocumentUploaded(
    documentId: string,
    caseId: string,
    documentType?: string,
    documentData?: any
  ): Promise<void> {
    await this.emit('document_uploaded', {
      documentId,
      caseId,
      documentType,
      documentData
    });
  }

  async emitCaseCreated(caseId: string, caseData?: any): Promise<void> {
    await this.emit('case_created', {
      caseId,
      caseData
    });
  }

  async emitTaskCreated(taskId: string, caseId: string, taskData?: any): Promise<void> {
    await this.emit('task_created', {
      taskId,
      caseId,
      taskData
    });
  }

  async emitTaskCompleted(taskId: string, caseId: string, taskData?: any): Promise<void> {
    await this.emit('task_completed', {
      taskId,
      caseId,
      taskData
    });
  }

  clearAllListeners(): void {
    this.listeners.clear();
  }

  getListenerCount(eventType?: AutomationTriggerEvent): number {
    if (eventType) {
      return this.listeners.get(eventType)?.length || 0;
    }
    return Array.from(this.listeners.values()).reduce((sum, handlers) => sum + handlers.length, 0);
  }
}

// Export singleton instance
export const automationEventEmitter = new AutomationEventEmitter();
