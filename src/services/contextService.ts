/**
 * Context Service for Stage Situational Awareness
 * Provides summary data for Tasks, Hearings, Documents, and Contacts
 */

import { StageContextSummary } from '@/types/lifecycle';

class ContextService {
  /**
   * Get stage context summary for situational awareness
   */
  async getStageContextSummary(caseId: string, stageInstanceId: string): Promise<StageContextSummary> {
    // Mock API call - replace with actual REST endpoint
    // GET /api/cases/:caseId/stages/:instanceId/summary
    
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay

    // Mock data filtered by stage instance/cycle
    const mockSummary: StageContextSummary = {
      tasks: {
        open: 3,
        overdue: 1,
        done: 7,
        top: [
          {
            id: 'task-1',
            title: 'Review GST registration documents',
            status: 'In Progress',
            dueDate: '2024-01-15',
            priority: 'High'
          },
          {
            id: 'task-2', 
            title: 'Prepare response to demand notice',
            status: 'Overdue',
            dueDate: '2024-01-10',
            priority: 'Critical'
          },
          {
            id: 'task-3',
            title: 'Schedule client meeting',
            status: 'Open',
            dueDate: '2024-01-20',
            priority: 'Medium'
          }
        ]
      },
      hearings: {
        next: {
          date: '2024-01-25',
          status: 'Scheduled',
          type: 'Assessment Hearing',
          courtName: 'High Court Delhi'
        },
        last: {
          date: '2023-12-15',
          outcome: 'Adjourned',
          notes: 'Additional documents requested by court'
        }
      },
      docs: [
        {
          key: 'gst-certificate',
          status: 'Present',
          name: 'GST Registration Certificate',
          type: 'Certificate'
        },
        {
          key: 'assessment-order',
          status: 'Missing', 
          name: 'Assessment Order Copy',
          type: 'Order'
        },
        {
          key: 'reply-memo',
          status: 'Present',
          name: 'Reply Memorandum',
          type: 'Filing'
        }
      ],
      contacts: [
        {
          name: 'Rajesh Kumar',
          role: 'Primary',
          email: 'rajesh.kumar@company.com',
          phone: '+91-9876543210'
        },
        {
          name: 'Priya Sharma', 
          role: 'Authorized Signatory',
          email: 'priya.sharma@company.com',
          phone: '+91-9876543211'
        },
        {
          name: 'Adv. Vikash Singh',
          role: 'Counsel',
          email: 'vikash.singh@lawfirm.com',
          phone: '+91-9876543212'
        }
      ]
    };

    return mockSummary;
  }

  /**
   * Quick complete task action (behind feature flag)
   */
  async quickCompleteTask(taskId: string): Promise<void> {
    // Mock API call - replace with actual REST endpoint
    // POST /api/tasks/:taskId/complete
    
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Task ${taskId} marked as complete`);
  }
}

export const contextService = new ContextService();