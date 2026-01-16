import { supabase } from '@/integrations/supabase/client';
import { TaskContextData, TaskActivityEvent } from '@/types/taskContext';

class TaskContextService {
  /**
   * Fetch comprehensive task context for the Task Open View
   */
  async getTaskContext(taskId: string): Promise<TaskContextData | null> {
    try {
      // Fetch task with all related data
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select(`
          *,
          cases:case_id (
            id,
            case_number,
            title,
            stage_code,
            priority,
            status,
            case_type,
            issue_type,
            client_id,
            forum_id,
            authority_id
          )
        `)
        .eq('id', taskId)
        .maybeSingle();

      if (taskError || !taskData) {
        console.error('Error fetching task context:', taskError);
        return null;
      }

      // Fetch client data (from task directly or via case)
      const clientId = taskData.client_id || (taskData.cases as any)?.client_id;
      let clientData = null;
      
      if (clientId) {
        const { data: client } = await supabase
          .from('clients')
          .select('id, display_name, pan, gstin, email, phone')
          .eq('id', clientId)
          .maybeSingle();
        clientData = client;
      }

      // Fetch bundle data if task has bundleId
      let bundleData = null;
      if (taskData.bundle_id) {
        // Get sibling tasks from same bundle
        const { data: siblingTasks } = await supabase
          .from('tasks')
          .select('id, title, status, due_date')
          .eq('bundle_id', taskData.bundle_id)
          .neq('id', taskId)
          .order('due_date', { ascending: true });

        const completedCount = siblingTasks?.filter(t => t.status === 'Completed').length || 0;
        
        bundleData = {
          id: taskData.bundle_id,
          name: `Bundle ${taskData.bundle_id.slice(0, 8)}`, // Will be enhanced with actual bundle name if stored
          totalTasks: (siblingTasks?.length || 0) + 1,
          completedTasks: completedCount + (taskData.status === 'Completed' ? 1 : 0),
          siblingTasks: (siblingTasks || []).map(t => ({
            id: t.id,
            title: t.title,
            status: t.status,
            dueDate: t.due_date
          }))
        };
      }

      // Fetch linked documents
      const { data: documents } = await supabase
        .from('documents')
        .select('id, file_name, file_type, file_size, category, created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      // If no direct task documents, try case documents
      let linkedDocuments = documents || [];
      if (linkedDocuments.length === 0 && taskData.case_id) {
        const { data: caseDocuments } = await supabase
          .from('documents')
          .select('id, file_name, file_type, file_size, category, created_at')
          .eq('case_id', taskData.case_id)
          .order('created_at', { ascending: false })
          .limit(10);
        linkedDocuments = caseDocuments || [];
      }

      // Fetch related hearings
      let relatedHearings: any[] = [];
      if (taskData.case_id) {
        const { data: hearings } = await supabase
          .from('hearings')
          .select('id, hearing_date, court_name, status, notes')
          .eq('case_id', taskData.case_id)
          .order('hearing_date', { ascending: false })
          .limit(5);
        relatedHearings = hearings || [];
      }

      // Fetch task messages and build activity events
      const { data: messages } = await supabase
        .from('task_messages')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      const activityEvents = this.buildActivityEvents(messages || []);

      // Calculate computed properties
      const dueDate = new Date(taskData.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = diffDays < 0 && taskData.status !== 'Completed';
      const daysOverdue = isOverdue ? Math.abs(diffDays) : 0;

      // Determine origin label
      let originLabel = 'Manual';
      if (taskData.is_auto_generated) {
        if (taskData.creation_reason === 'stage_transition') {
          originLabel = 'Stage Trigger';
        } else if (taskData.creation_reason === 'auto_bundle') {
          originLabel = 'Auto Bundle';
        } else if (taskData.creation_reason === 'hearing_scheduled') {
          originLabel = 'Hearing';
        } else if (taskData.creation_reason === 'template') {
          originLabel = 'Template';
        } else {
          originLabel = 'Auto-generated';
        }
      }

      // Fetch forum/authority names if IDs exist
      let forumName = undefined;
      let authorityName = undefined;
      const caseRecord = taskData.cases as any;
      
      if (caseRecord?.forum_id) {
        const { data: forum } = await supabase
          .from('courts')
          .select('name')
          .eq('id', caseRecord.forum_id)
          .maybeSingle();
        forumName = forum?.name;
      }
      
      if (caseRecord?.authority_id) {
        const { data: authority } = await supabase
          .from('courts')
          .select('name')
          .eq('id', caseRecord.authority_id)
          .maybeSingle();
        authorityName = authority?.name;
      }

      return {
        task: {
          id: taskData.id,
          title: taskData.title,
          description: taskData.description || '',
          status: taskData.status || 'Not Started',
          priority: taskData.priority || 'Medium',
          dueDate: taskData.due_date,
          createdDate: taskData.created_at,
          estimatedHours: taskData.estimated_hours,
          actualHours: taskData.actual_hours,
          isAutoGenerated: taskData.is_auto_generated || false,
          bundleId: taskData.bundle_id,
          assignedToId: taskData.assigned_to,
          assignedToName: (taskData as any).assigned_to_name || '',
          assignedById: taskData.assigned_by,
          assignedByName: (taskData as any).assigned_by_name,
          creationStageCode: taskData.creation_stage_code,
          creationReason: taskData.creation_reason,
          taskCategory: taskData.task_category,
          slaHours: taskData.sla_hours,
          createdBy: taskData.created_by,
          tags: taskData.tags || []
        },
        client: clientData ? {
          id: clientData.id,
          displayName: clientData.display_name,
          pan: clientData.pan,
          gstin: clientData.gstin,
          email: clientData.email,
          phone: clientData.phone
        } : null,
        case: caseRecord ? {
          id: caseRecord.id,
          caseNumber: caseRecord.case_number,
          title: caseRecord.title,
          currentStage: caseRecord.stage_code || '',
          stageAtTaskCreation: taskData.creation_stage_code,
          priority: caseRecord.priority,
          status: caseRecord.status,
          caseType: caseRecord.case_type,
          issueType: caseRecord.issue_type,
          forumName,
          authorityName
        } : null,
        bundle: bundleData,
        linkedDocuments: linkedDocuments.map(d => ({
          id: d.id,
          fileName: d.file_name,
          fileType: d.file_type,
          fileSize: d.file_size,
          category: d.category,
          createdAt: d.created_at
        })),
        relatedHearings: relatedHearings.map(h => ({
          id: h.id,
          hearingDate: h.hearing_date,
          courtName: h.court_name,
          status: h.status,
          notes: h.notes
        })),
        activityEvents,
        isOverdue,
        daysOverdue,
        originLabel,
        slaDeadline: taskData.sla_hours 
          ? this.calculateSlaDeadline(taskData.created_at, taskData.sla_hours)
          : undefined,
        slaStatus: this.calculateSlaStatus(
          taskData.created_at, 
          taskData.sla_hours, 
          taskData.status === 'Completed'
        )
      };
    } catch (error) {
      console.error('Error in getTaskContext:', error);
      return null;
    }
  }

  private buildActivityEvents(messages: any[]): TaskActivityEvent[] {
    return messages.map(msg => {
      let type: TaskActivityEvent['type'] = 'message';
      
      if (msg.is_system_message) {
        if (msg.status_update) {
          type = 'status_change';
        } else if (msg.message?.includes('reassigned')) {
          type = 'assignment';
        } else if (msg.message?.includes('bundle')) {
          type = 'bundle_creation';
        } else if (msg.message?.includes('stage')) {
          type = 'stage_trigger';
        } else {
          type = 'system';
        }
      } else if (msg.is_client_visible) {
        type = 'client_visible';
      }

      return {
        id: msg.id,
        type,
        timestamp: msg.created_at,
        userId: msg.created_by,
        userName: msg.created_by_name,
        content: msg.message,
        metadata: {
          newStatus: msg.status_update,
          isClientVisible: msg.is_client_visible,
          attachments: msg.attachments
        }
      };
    });
  }

  private calculateSlaDeadline(createdAt: string, slaHours: number): string {
    const created = new Date(createdAt);
    created.setHours(created.getHours() + slaHours);
    return created.toISOString();
  }

  private calculateSlaStatus(
    createdAt: string, 
    slaHours?: number, 
    isCompleted?: boolean
  ): 'on_track' | 'at_risk' | 'breached' | undefined {
    if (!slaHours || isCompleted) return undefined;
    
    const deadline = new Date(createdAt);
    deadline.setHours(deadline.getHours() + slaHours);
    
    const now = new Date();
    const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursRemaining < 0) return 'breached';
    if (hoursRemaining < 24) return 'at_risk';
    return 'on_track';
  }

  /**
   * Update client visibility for a task message
   */
  async updateClientVisibility(
    messageId: string, 
    isClientVisible: boolean,
    userId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('task_messages')
        .update({
          is_client_visible: isClientVisible,
          approved_at: isClientVisible ? new Date().toISOString() : null,
          approved_by: isClientVisible ? userId : null
        })
        .eq('id', messageId);

      if (error) {
        console.error('Error updating client visibility:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error in updateClientVisibility:', error);
      return false;
    }
  }

  /**
   * Get only client-visible messages for a task (for client portal)
   */
  async getClientVisibleMessages(taskId: string): Promise<TaskActivityEvent[]> {
    const { data, error } = await supabase
      .from('task_messages')
      .select('*')
      .eq('task_id', taskId)
      .eq('is_client_visible', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching client visible messages:', error);
      return [];
    }

    return this.buildActivityEvents(data || []);
  }
}

export const taskContextService = new TaskContextService();
