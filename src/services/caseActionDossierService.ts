/**
 * Case Action Dossier Service
 * Compiles comprehensive case report for PDF export
 */

import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { CaseActionDossier, EnhancedStageTransition } from '@/types/stageAction';

// @ts-ignore - html2pdf doesn't have proper types
import html2pdf from 'html2pdf.js';

interface DossierOptions {
  includeStageTimeline?: boolean;
  includeHearings?: boolean;
  includeTasks?: boolean;
  includeDocuments?: boolean;
  includeTimeTracking?: boolean;
  includeBilling?: boolean;
}

class CaseActionDossierService {
  async generateDossier(
    caseId: string,
    options: DossierOptions = {}
  ): Promise<CaseActionDossier> {
    const {
      includeStageTimeline = true,
      includeHearings = true,
      includeTasks = true,
      includeDocuments = true,
      includeTimeTracking = false,
      includeBilling = false
    } = options;

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Fetch case data
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select(`
        *,
        clients:client_id (display_name)
      `)
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) {
      throw new Error('Case not found');
    }

    const dossier: CaseActionDossier = {
      case: {
        id: caseData.id,
        caseNumber: caseData.case_number,
        title: caseData.title,
        client: (caseData.clients as any)?.display_name || 'Unknown Client',
        currentStage: caseData.stage_code || 'Assessment',
        status: caseData.status || 'Active',
        createdAt: caseData.created_at
      },
      stageTimeline: [],
      hearings: [],
      tasks: [],
      documents: [],
      generatedAt: new Date().toISOString(),
      generatedBy: user.id
    };

    // Fetch stage transitions
    if (includeStageTimeline) {
      const { data: transitions } = await supabase
        .from('stage_transitions')
        .select(`
          *,
          profiles:created_by (full_name)
        `)
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      if (transitions) {
        dossier.stageTimeline = transitions.map((t: any) => ({
          id: t.id,
          caseId: t.case_id,
          fromStage: t.from_stage,
          toStage: t.to_stage,
          transitionType: t.transition_type,
          comments: t.comments,
          createdBy: t.created_by,
          createdAt: t.created_at,
          validationStatus: t.validation_status || 'passed',
          validationWarnings: t.validation_warnings || [],
          overrideReason: t.override_reason,
          requiresApproval: t.requires_approval || false,
          approvalStatus: t.approval_status,
          approvedBy: t.approved_by,
          approvedAt: t.approved_at,
          approvalComments: t.approval_comments,
          attachments: t.attachments || [],
          actorRole: t.actor_role,
          actorName: t.profiles?.full_name || 'Unknown',
          isConfirmed: t.is_confirmed ?? true
        }));
      }
    }

    // Fetch hearings
    if (includeHearings) {
      const { data: hearings, error: hearingsError } = await supabase
        .from('hearings')
        .select(`
          *,
          courts:court_id (name)
        `)
        .eq('case_id', caseId)
        .order('hearing_date', { ascending: false });

      if (hearingsError) {
        console.error('Failed to fetch hearings:', hearingsError);
      }

      if (hearings) {
        dossier.hearings = hearings.map((h: any) => ({
          date: h.hearing_date,
          type: h.status || 'General',
          status: h.status,
          outcome: h.outcome,
          notes: h.notes,
          courtName: (h.courts as any)?.name
        }));
      }
    }

    // Fetch tasks
    if (includeTasks) {
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          profiles:assigned_to (full_name)
        `)
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      if (tasksError) {
        console.error('Failed to fetch tasks:', tasksError);
      }

      if (tasks) {
        dossier.tasks = tasks.map((t: any) => ({
          title: t.title,
          status: t.status,
          assignee: (t.profiles as any)?.full_name,
          dueDate: t.due_date,
          completedAt: t.completed_date
        }));
      }
    }

    // Fetch documents
    if (includeDocuments) {
      const { data: documents } = await supabase
        .from('documents')
        .select(`
          *,
          profiles:uploaded_by (full_name)
        `)
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      if (documents) {
        dossier.documents = documents.map((d: any) => ({
          name: d.file_name,
          category: d.category,
          uploadedAt: d.upload_timestamp || d.created_at,
          uploadedBy: (d.profiles as any)?.full_name
        }));
      }
    }

    return dossier;
  }

  async exportToPDF(dossier: CaseActionDossier): Promise<Blob> {
    const html = this.generateHTML(dossier);
    
    // Create container with fixed positioning and explicit dimensions for reliable rendering
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '794px'; // A4 width at 96dpi
    container.style.minHeight = '1123px'; // A4 height at 96dpi  
    container.style.background = '#ffffff';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-9999';
    document.body.appendChild(container);

    // Preflight check: ensure content exists
    const contentElement = container.querySelector('.dossier-container');
    if (!contentElement) {
      console.error('PDF generation failed: No content container found');
      document.body.removeChild(container);
      throw new Error('PDF content not rendered properly');
    }

    // Debug logging
    console.log('Dossier PDF generation:', {
      hasContent: !!contentElement,
      timelineCount: dossier.stageTimeline.length,
      hearingsCount: dossier.hearings.length,
      tasksCount: dossier.tasks.length,
      documentsCount: dossier.documents.length,
      containerTextLength: container.innerText.length
    });

    const options: any = {
      margin: [15, 15, 15, 15],
      filename: `Case_Dossier_${dossier.case.caseNumber}_${format(new Date(), 'yyyyMMdd')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 794,
        windowHeight: 1123
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    try {
      const pdfBlob = await html2pdf()
        .set(options)
        .from(container)
        .outputPdf('blob');
      
      return pdfBlob;
    } finally {
      document.body.removeChild(container);
    }
  }

  async downloadDossier(caseId: string, options?: DossierOptions): Promise<void> {
    const dossier = await this.generateDossier(caseId, options);
    const pdfBlob = await this.exportToPDF(dossier);
    
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Case_Dossier_${dossier.case.caseNumber}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private generateHTML(dossier: CaseActionDossier): string {
    // Return an HTML fragment (not full document) for reliable rendering inside a div
    const styles = `
      <style>
        .dossier-container { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          font-size: 11px; 
          line-height: 1.5; 
          color: #1a1a1a; 
          background: #ffffff;
          padding: 20px;
          box-sizing: border-box;
        }
        .dossier-container * { box-sizing: border-box; }
        .dossier-header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #1a1a1a; }
        .dossier-header h1 { font-size: 20px; font-weight: 700; margin-bottom: 8px; margin-top: 0; }
        .dossier-header .subtitle { font-size: 12px; color: #666; }
        .dossier-section { margin-bottom: 25px; page-break-inside: avoid; }
        .dossier-section-title { font-size: 14px; font-weight: 600; padding: 8px 12px; background: #f5f5f5; border-left: 4px solid #1a1a1a; margin-bottom: 12px; }
        .dossier-meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .dossier-meta-item { padding: 8px; background: #fafafa; border-radius: 4px; }
        .dossier-meta-label { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; }
        .dossier-meta-value { font-size: 12px; font-weight: 500; margin: 0; }
        .dossier-timeline-item { padding: 12px; margin-bottom: 8px; background: #fafafa; border-radius: 4px; border-left: 3px solid #ddd; }
        .dossier-timeline-item.forward { border-left-color: #22c55e; }
        .dossier-timeline-item.sendback { border-left-color: #f59e0b; }
        .dossier-timeline-item.remand { border-left-color: #3b82f6; }
        .dossier-timeline-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .dossier-timeline-type { font-weight: 600; font-size: 11px; }
        .dossier-timeline-date { font-size: 10px; color: #666; }
        .dossier-timeline-stages { font-size: 12px; margin-bottom: 4px; }
        .dossier-timeline-actor { font-size: 10px; color: #666; }
        .dossier-timeline-notes { font-size: 10px; color: #444; margin-top: 6px; padding: 6px; background: #fff; border-radius: 2px; }
        .dossier-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .dossier-table th { background: #f5f5f5; padding: 8px; text-align: left; font-weight: 600; border-bottom: 2px solid #ddd; }
        .dossier-table td { padding: 8px; border-bottom: 1px solid #eee; }
        .dossier-table tr:nth-child(even) { background: #fafafa; }
        .dossier-status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 500; }
        .dossier-status-completed { background: #dcfce7; color: #166534; }
        .dossier-status-pending { background: #fef3c7; color: #92400e; }
        .dossier-status-scheduled { background: #dbeafe; color: #1e40af; }
        .dossier-footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; text-align: center; font-size: 9px; color: #666; }
        .dossier-confidential { text-align: center; font-size: 10px; color: #dc2626; font-weight: 600; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
        .dossier-empty-state { padding: 16px; background: #f9fafb; border-radius: 4px; text-align: center; color: #6b7280; font-style: italic; }
      </style>
    `;

    const caseSection = `
      <div class="dossier-section">
        <div class="dossier-section-title">Case Summary</div>
        <div class="dossier-meta-grid">
          <div class="dossier-meta-item">
            <div class="dossier-meta-label">Case Number</div>
            <div class="dossier-meta-value">${dossier.case.caseNumber}</div>
          </div>
          <div class="dossier-meta-item">
            <div class="dossier-meta-label">Title</div>
            <div class="dossier-meta-value">${dossier.case.title}</div>
          </div>
          <div class="dossier-meta-item">
            <div class="dossier-meta-label">Client</div>
            <div class="dossier-meta-value">${dossier.case.client}</div>
          </div>
          <div class="dossier-meta-item">
            <div class="dossier-meta-label">Current Stage</div>
            <div class="dossier-meta-value">${dossier.case.currentStage}</div>
          </div>
          <div class="dossier-meta-item">
            <div class="dossier-meta-label">Status</div>
            <div class="dossier-meta-value">${dossier.case.status}</div>
          </div>
          <div class="dossier-meta-item">
            <div class="dossier-meta-label">Created</div>
            <div class="dossier-meta-value">${format(new Date(dossier.case.createdAt), 'dd MMM yyyy')}</div>
          </div>
        </div>
      </div>
    `;

    const timelineSection = dossier.stageTimeline.length > 0 ? `
      <div class="dossier-section">
        <div class="dossier-section-title">Stage Timeline (${dossier.stageTimeline.length} transitions)</div>
        ${dossier.stageTimeline.map(t => `
          <div class="dossier-timeline-item ${t.transitionType.toLowerCase().replace(' ', '')}">
            <div class="dossier-timeline-header">
              <span class="dossier-timeline-type">${t.transitionType}</span>
              <span class="dossier-timeline-date">${format(new Date(t.createdAt), 'dd MMM yyyy HH:mm')}</span>
            </div>
            <div class="dossier-timeline-stages">${t.fromStage || 'Initial'} → ${t.toStage}</div>
            <div class="dossier-timeline-actor">By: ${t.actorName}${t.actorRole ? ` (${t.actorRole})` : ''}</div>
            ${t.validationStatus === 'overridden' ? '<div style="font-size:9px;color:#f59e0b;margin-top:4px;">⚠ Admin Override</div>' : ''}
            ${t.comments ? `<div class="dossier-timeline-notes">${t.comments}</div>` : ''}
          </div>
        `).join('')}
      </div>
    ` : `
      <div class="dossier-section">
        <div class="dossier-section-title">Stage Timeline</div>
        <div class="dossier-empty-state">No stage transitions recorded</div>
      </div>
    `;

    const hearingsSection = dossier.hearings.length > 0 ? `
      <div class="dossier-section">
        <div class="dossier-section-title">Hearings (${dossier.hearings.length})</div>
        <table class="dossier-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Court</th>
              <th>Status</th>
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>
            ${dossier.hearings.map(h => `
              <tr>
                <td>${h.date ? format(new Date(h.date), 'dd MMM yyyy') : '-'}</td>
                <td>${h.type || '-'}</td>
                <td>${h.courtName || '-'}</td>
                <td><span class="dossier-status-badge dossier-status-${h.status?.toLowerCase() || 'pending'}">${h.status || 'Scheduled'}</span></td>
                <td>${h.outcome || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : `
      <div class="dossier-section">
        <div class="dossier-section-title">Hearings</div>
        <div class="dossier-empty-state">No hearings recorded</div>
      </div>
    `;

    const tasksSection = dossier.tasks.length > 0 ? `
      <div class="dossier-section">
        <div class="dossier-section-title">Tasks (${dossier.tasks.length})</div>
        <table class="dossier-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Assignee</th>
              <th>Due Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${dossier.tasks.map(t => `
              <tr>
                <td>${t.title}</td>
                <td>${t.assignee || '-'}</td>
                <td>${t.dueDate ? format(new Date(t.dueDate), 'dd MMM yyyy') : '-'}</td>
                <td><span class="dossier-status-badge dossier-status-${t.status?.toLowerCase() === 'completed' ? 'completed' : 'pending'}">${t.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : `
      <div class="dossier-section">
        <div class="dossier-section-title">Tasks</div>
        <div class="dossier-empty-state">No tasks recorded</div>
      </div>
    `;

    const documentsSection = dossier.documents.length > 0 ? `
      <div class="dossier-section">
        <div class="dossier-section-title">Documents (${dossier.documents.length})</div>
        <table class="dossier-table">
          <thead>
            <tr>
              <th>Document Name</th>
              <th>Category</th>
              <th>Uploaded</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            ${dossier.documents.map(d => `
              <tr>
                <td>${d.name}</td>
                <td>${d.category || '-'}</td>
                <td>${d.uploadedAt ? format(new Date(d.uploadedAt), 'dd MMM yyyy') : '-'}</td>
                <td>${d.uploadedBy || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : `
      <div class="dossier-section">
        <div class="dossier-section-title">Documents</div>
        <div class="dossier-empty-state">No documents recorded</div>
      </div>
    `;

    // Return HTML fragment (not full document) for reliable rendering
    return `
      ${styles}
      <div class="dossier-container">
        <div class="dossier-confidential">Confidential - Legal Privilege</div>
        <div class="dossier-header">
          <h1>Case Action Dossier</h1>
          <div class="subtitle">${dossier.case.caseNumber} | Generated ${format(new Date(dossier.generatedAt), 'dd MMM yyyy HH:mm')}</div>
        </div>
        ${caseSection}
        ${timelineSection}
        ${hearingsSection}
        ${tasksSection}
        ${documentsSection}
        <div class="dossier-footer">
          This document was automatically generated and is a snapshot of the case at the time of export.<br>
          All actions recorded herein are immutable and form part of the legal audit trail.
        </div>
      </div>
    `;
  }
}

export const caseActionDossierService = new CaseActionDossierService();
