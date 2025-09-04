/**
 * Context Service for Stage Situational Awareness
 * Provides summary data for Tasks, Hearings, Documents, and Contacts
 */

import { StageContextSummary } from '@/types/lifecycle';

// Global app state access (temporary until proper dependency injection)
declare global {
  interface Window {
    __APP_STATE__: any;
  }
}

class ContextService {
  /**
   * Get app state from global context (fallback until proper DI)
   */
  private getAppState() {
    // In a real app, this would come from proper dependency injection
    // For now, we'll use a global reference or mock data
    if (typeof window !== 'undefined' && window.__APP_STATE__) {
      return window.__APP_STATE__;
    }
    return null;
  }

  /**
   * Get stage context summary for situational awareness
   * Now reads from actual app state instead of static mock data
   */
  async getStageContextSummary(caseId: string, stageInstanceId: string): Promise<StageContextSummary> {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay

    const appState = this.getAppState();
    
    if (appState) {
      // Filter data by case ID from real app state
      const caseTasks = appState.tasks?.filter((task: any) => task.caseId === caseId) || [];
      const caseHearings = appState.hearings?.filter((hearing: any) => hearing.caseId === caseId) || [];
      const caseDocuments = appState.documents?.filter((doc: any) => doc.caseId === caseId) || [];
      const caseInfo = appState.cases?.find((c: any) => c.id === caseId);
      const clientInfo = caseInfo ? appState.clients?.find((client: any) => client.id === caseInfo.clientId) : null;

      // Calculate task statistics
      const openTasks = caseTasks.filter((task: any) => ['Not Started', 'In Progress'].includes(task.status));
      const overdueTasks = caseTasks.filter((task: any) => task.status === 'Overdue');
      const doneTasks = caseTasks.filter((task: any) => task.status === 'Completed');

      // Get top 3 active tasks (priority order)
      const activeTasks = openTasks.concat(overdueTasks)
        .sort((a: any, b: any) => {
          const priorityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
          return (priorityOrder[a.priority as keyof typeof priorityOrder] || 99) - 
                 (priorityOrder[b.priority as keyof typeof priorityOrder] || 99);
        })
        .slice(0, 3);

      // Get next and last hearings
      const scheduledHearings = caseHearings
        .filter((h: any) => h.status === 'Scheduled')
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const completedHearings = caseHearings
        .filter((h: any) => h.status === 'Completed')
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Map current stage documents to required format
      const currentStage = caseInfo?.currentStage || '';
      const stageDocMap: Record<string, Array<{key: string, name: string, type: string}>> = {
        'Scrutiny': [
          { key: 'gst-certificate', name: 'GST Registration Certificate', type: 'Certificate' },
          { key: 'assessment-order', name: 'Assessment Order Copy', type: 'Order' },
          { key: 'client-authorization', name: 'Client Authorization Letter', type: 'Authorization' }
        ],
        'Demand': [
          { key: 'scn-notice', name: 'Show Cause Notice', type: 'Notice' },
          { key: 'scn-response', name: 'Response to SCN', type: 'Response' },
          { key: 'itc-invoices', name: 'ITC Supporting Invoices', type: 'Evidence' }
        ],
        'Adjudication': [
          { key: 'written-submissions', name: 'Written Submissions', type: 'Filing' },
          { key: 'case-law', name: 'Case Law Compilation', type: 'Legal' },
          { key: 'adjudication-order', name: 'Adjudication Order', type: 'Order' }
        ],
        'Appeals': [
          { key: 'appeal-petition', name: 'First Appeal Petition', type: 'Petition' },
          { key: 'appeal-grounds', name: 'Grounds of Appeal', type: 'Legal' },
          { key: 'appeal-bundle', name: 'Appeal Documents Bundle', type: 'Bundle' }
        ],
        'GSTAT': [
          { key: 'gstat-application', name: 'GSTAT Application Form', type: 'Application' },
          { key: 'compliance-certificates', name: 'Compliance Certificates', type: 'Certificate' },
          { key: 'tribunal-order', name: 'Tribunal Order', type: 'Order' }
        ],
        'HC': [
          { key: 'writ-petition', name: 'Writ Petition', type: 'Petition' },
          { key: 'hc-affidavits', name: 'HC Affidavits', type: 'Affidavit' },
          { key: 'hc-judgment', name: 'HC Judgment', type: 'Judgment' }
        ],
        'SC': [
          { key: 'slp-petition', name: 'SLP Petition', type: 'Petition' },
          { key: 'counter-affidavit', name: 'Counter Affidavit', type: 'Affidavit' },
          { key: 'sc-judgment', name: 'SC Final Judgment', type: 'Judgment' }
        ]
      };

      const expectedDocs = stageDocMap[currentStage] || [];
      const stageDocuments = expectedDocs.map(expected => {
        const found = caseDocuments.find((doc: any) => 
          doc.name.toLowerCase().includes(expected.name.toLowerCase().split(' ')[0])
        );
        return {
          key: expected.key,
          name: expected.name,
          type: expected.type,
          status: found ? 'Present' : 'Missing'
        } as const;
      });

      // Get client contacts
      const contacts = [];
      if (clientInfo?.signatories && clientInfo.signatories.length > 0) {
        const primarySignatory = clientInfo.signatories.find((s: any) => s.isPrimary) || clientInfo.signatories[0];
        contacts.push({
          name: primarySignatory.fullName,
          role: 'Primary' as const,
          email: primarySignatory.email,
          phone: primarySignatory.phone
        });
      }

      // Add assigned counsel
      const assignedEmployee = appState.employees?.find((emp: any) => emp.id === caseInfo?.assignedToId);
      if (assignedEmployee) {
        contacts.push({
          name: assignedEmployee.full_name,
          role: 'Counsel' as const,
          email: assignedEmployee.email,
          phone: assignedEmployee.mobile
        });
      }

      const summary: StageContextSummary = {
        tasks: {
          open: openTasks.length,
          overdue: overdueTasks.length,
          done: doneTasks.length,
          top: activeTasks.map((task: any) => ({
            id: task.id,
            title: task.title,
            status: task.status,
            dueDate: task.dueDate,
            priority: task.priority
          }))
        },
        hearings: {
          next: scheduledHearings[0] ? {
            date: scheduledHearings[0].date,
            status: scheduledHearings[0].status,
            type: scheduledHearings[0].type,
            courtName: 'Income Tax Appellate Tribunal' // From court data
          } : undefined,
          last: completedHearings[0] ? {
            date: completedHearings[0].date,
            outcome: completedHearings[0].type,
            notes: completedHearings[0].notes || 'Hearing completed'
          } : undefined
        },
        docs: stageDocuments,
        contacts
      };

      return summary;
    }

    // Fallback to mock data if no app state available
    const mockSummary: StageContextSummary = {
      tasks: {
        open: 2,
        overdue: 1,
        done: 9,
        top: [
          {
            id: 'TSK-010',
            title: 'Draft First Appeal Petition',
            status: 'In Progress',
            dueDate: '2024-03-20',
            priority: 'Critical'
          },
          {
            id: 'TSK-011',
            title: 'Compile Appeal Documents Bundle',
            status: 'Overdue',
            dueDate: '2024-03-18',
            priority: 'High'
          },
          {
            id: 'TSK-012',
            title: 'Prepare Grounds of Appeal',
            status: 'Not Started',
            dueDate: '2024-03-25',
            priority: 'High'
          }
        ]
      },
      hearings: {
        next: {
          date: '2024-03-25',
          status: 'Scheduled',
          type: 'Preliminary',
          courtName: 'Income Tax Appellate Tribunal'
        },
        last: {
          date: '2024-03-07',
          outcome: 'Final',
          notes: 'Order pronounced. ITC disallowance upheld. Appeal rights explained.'
        }
      },
      docs: [
        {
          key: 'appeal-petition',
          status: 'Present',
          name: 'First Appeal Petition',
          type: 'Petition'
        },
        {
          key: 'appeal-grounds',
          status: 'Missing',
          name: 'Grounds of Appeal',
          type: 'Legal'
        },
        {
          key: 'appeal-bundle',
          status: 'Present',
          name: 'Appeal Documents Bundle',
          type: 'Bundle'
        }
      ],
      contacts: [
        {
          name: 'Rajesh Gupta',
          role: 'Primary',
          email: 'rajesh.gupta@techcorp.in',
          phone: '+91-9876543221'
        },
        {
          name: 'Sarah Johnson',
          role: 'Counsel',
          email: 'sarah.johnson@lawfirm.com',
          phone: '+91-9876543211'
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