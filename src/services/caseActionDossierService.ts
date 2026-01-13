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
    
    const options: any = {
      margin: [15, 15, 15, 15],
      filename: `Case_Dossier_${dossier.case.caseNumber}_${format(new Date(), 'yyyyMMdd')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);

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
    const styles = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; line-height: 1.5; color: #1a1a1a; }
        .container { max-width: 100%; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #1a1a1a; }
        .header h1 { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
        .header .subtitle { font-size: 12px; color: #666; }
        .section { margin-bottom: 25px; page-break-inside: avoid; }
        .section-title { font-size: 14px; font-weight: 600; padding: 8px 12px; background: #f5f5f5; border-left: 4px solid #1a1a1a; margin-bottom: 12px; }
        .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .meta-item { padding: 8px; background: #fafafa; border-radius: 4px; }
        .meta-label { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
        .meta-value { font-size: 12px; font-weight: 500; }
        .timeline-item { padding: 12px; margin-bottom: 8px; background: #fafafa; border-radius: 4px; border-left: 3px solid #ddd; }
        .timeline-item.forward { border-left-color: #22c55e; }
        .timeline-item.sendback { border-left-color: #f59e0b; }
        .timeline-item.remand { border-left-color: #3b82f6; }
        .timeline-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .timeline-type { font-weight: 600; font-size: 11px; }
        .timeline-date { font-size: 10px; color: #666; }
        .timeline-stages { font-size: 12px; margin-bottom: 4px; }
        .timeline-actor { font-size: 10px; color: #666; }
        .timeline-notes { font-size: 10px; color: #444; margin-top: 6px; padding: 6px; background: #fff; border-radius: 2px; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; }
        th { background: #f5f5f5; padding: 8px; text-align: left; font-weight: 600; border-bottom: 2px solid #ddd; }
        td { padding: 8px; border-bottom: 1px solid #eee; }
        tr:nth-child(even) { background: #fafafa; }
        .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 500; }
        .status-completed { background: #dcfce7; color: #166534; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-scheduled { background: #dbeafe; color: #1e40af; }
        .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; text-align: center; font-size: 9px; color: #666; }
        .confidential { text-align: center; font-size: 10px; color: #dc2626; font-weight: 600; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
      </style>
    `;

    const caseSection = `
      <div class="section">
        <div class="section-title">Case Summary</div>
        <div class="meta-grid">
          <div class="meta-item">
            <div class="meta-label">Case Number</div>
            <div class="meta-value">${dossier.case.caseNumber}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Title</div>
            <div class="meta-value">${dossier.case.title}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Client</div>
            <div class="meta-value">${dossier.case.client}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Current Stage</div>
            <div class="meta-value">${dossier.case.currentStage}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Status</div>
            <div class="meta-value">${dossier.case.status}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Created</div>
            <div class="meta-value">${format(new Date(dossier.case.createdAt), 'dd MMM yyyy')}</div>
          </div>
        </div>
      </div>
    `;

    const timelineSection = dossier.stageTimeline.length > 0 ? `
      <div class="section">
        <div class="section-title">Stage Timeline (${dossier.stageTimeline.length} transitions)</div>
        ${dossier.stageTimeline.map(t => `
          <div class="timeline-item ${t.transitionType.toLowerCase().replace(' ', '')}">
            <div class="timeline-header">
              <span class="timeline-type">${t.transitionType}</span>
              <span class="timeline-date">${format(new Date(t.createdAt), 'dd MMM yyyy HH:mm')}</span>
            </div>
            <div class="timeline-stages">${t.fromStage || 'Initial'} → ${t.toStage}</div>
            <div class="timeline-actor">By: ${t.actorName}${t.actorRole ? ` (${t.actorRole})` : ''}</div>
            ${t.validationStatus === 'overridden' ? '<div style="font-size:9px;color:#f59e0b;margin-top:4px;">⚠ Admin Override</div>' : ''}
            ${t.comments ? `<div class="timeline-notes">${t.comments}</div>` : ''}
          </div>
        `).join('')}
      </div>
    ` : '';

    const hearingsSection = dossier.hearings.length > 0 ? `
      <div class="section">
        <div class="section-title">Hearings (${dossier.hearings.length})</div>
        <table>
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
                <td>${format(new Date(h.date), 'dd MMM yyyy')}</td>
                <td>${h.type}</td>
                <td>${h.courtName || '-'}</td>
                <td><span class="status-badge status-${h.status?.toLowerCase() || 'pending'}">${h.status || 'Scheduled'}</span></td>
                <td>${h.outcome || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '';

    const tasksSection = dossier.tasks.length > 0 ? `
      <div class="section">
        <div class="section-title">Tasks (${dossier.tasks.length})</div>
        <table>
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
                <td><span class="status-badge status-${t.status?.toLowerCase() === 'completed' ? 'completed' : 'pending'}">${t.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '';

    const documentsSection = dossier.documents.length > 0 ? `
      <div class="section">
        <div class="section-title">Documents (${dossier.documents.length})</div>
        <table>
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
                <td>${format(new Date(d.uploadedAt), 'dd MMM yyyy')}</td>
                <td>${d.uploadedBy || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          ${styles}
        </head>
        <body>
          <div class="container">
            <div class="confidential">Confidential - Legal Privilege</div>
            <div class="header">
              <h1>Case Action Dossier</h1>
              <div class="subtitle">${dossier.case.caseNumber} | Generated ${format(new Date(dossier.generatedAt), 'dd MMM yyyy HH:mm')}</div>
            </div>
            ${caseSection}
            ${timelineSection}
            ${hearingsSection}
            ${tasksSection}
            ${documentsSection}
            <div class="footer">
              This document was automatically generated and is a snapshot of the case at the time of export.<br>
              All actions recorded herein are immutable and form part of the legal audit trail.
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

export const caseActionDossierService = new CaseActionDossierService();
