/**
 * Case Intelligence Service
 * Aggregates case data in parallel and computes analytics, risk scoring, and financial exposure
 */

import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface IntelligenceData {
  case: {
    id: string;
    caseNumber: string;
    title: string;
    client: string;
    clientId: string;
    currentStage: string;
    status: string;
    priority: string;
    createdAt: string;
    description: string | null;
    taxDemand: number | null;
    penaltyAmount: number | null;
    interestAmount: number | null;
    totalDemand: number | null;
    noticeDate: string | null;
    replyDueDate: string | null;
  };
  stageInstances: StageInstanceData[];
  stageTransitions: StageTransitionData[];
  notices: NoticeData[];
  hearings: HearingData[];
  tasks: TaskData[];
  documents: DocumentData[];
  replies: ReplyData[];
  closures: ClosureData[];
  analytics: ComputedAnalytics;
  risk: RiskAssessment;
  financial: FinancialSummary;
  generatedAt: string;
  generatedBy: string;
  generatedByName: string;
}

export interface StageInstanceData {
  id: string;
  stageKey: string;
  cycleNo: number;
  startedAt: string;
  endedAt: string | null;
  status: string;
  durationDays: number;
}

export interface StageTransitionData {
  id: string;
  fromStage: string | null;
  toStage: string;
  transitionType: string;
  comments: string | null;
  createdAt: string;
  actorName: string;
  actorRole: string | null;
  durationInPreviousStage: number | null;
}

export interface NoticeData {
  id: string;
  noticeNo: string | null;
  noticeDate: string | null;
  stageKey: string | null;
  status: string;
  amountDemanded: number | null;
  taxAmount: number | null;
  penaltyAmount: number | null;
  interestAmount: number | null;
}

export interface HearingData {
  id: string;
  hearingDate: string;
  status: string;
  hearingType: string | null;
  outcome: string | null;
  courtName: string | null;
  notes: string | null;
}

export interface TaskData {
  id: string;
  title: string;
  status: string;
  assigneeName: string;
  dueDate: string | null;
  stage: string | null;
  priority: string | null;
}

export interface DocumentData {
  id: string;
  fileName: string;
  category: string | null;
  stage: string | null;
  uploadedAt: string;
  documentStatus: string | null;
}

export interface ReplyData {
  id: string;
  noticeId: string;
  filingMode: string | null;
  filedDate: string | null;
  status: string;
}

export interface ClosureData {
  stageKey: string;
  outcome: string;
  orderNumber: string | null;
  orderDate: string | null;
  totalDemand: number | null;
}

export interface ComputedAnalytics {
  daysInCurrentStage: number;
  totalLifecycleDuration: number;
  totalStageTransitions: number;
  averageStageDuration: number;
  remandCycleCount: number;
  totalCycles: number;
  stageEfficiency: number;
  litigationComplexityScore: number;
  escalationFlag: boolean;
  escalationReason: string | null;
}

export interface RiskAssessment {
  level: 'Low' | 'Medium' | 'High';
  score: number; // 0-100
  factors: RiskFactor[];
}

export interface RiskFactor {
  name: string;
  severity: 'Low' | 'Medium' | 'High';
  impact: string;
  weight: number;
}

export interface FinancialSummary {
  totalDemand: number;
  taxDemand: number;
  penalty: number;
  interest: number;
  contested: number;
}

// ─── SLA Thresholds ──────────────────────────────────────────────────────────

const STAGE_SLA_DAYS: Record<string, number> = {
  'Assessment': 30,
  'Show Cause Notice': 45,
  'Reply': 30,
  'Personal Hearing': 60,
  'Order': 30,
  'Appeal': 90,
  'Tribunal': 120,
  'High Court': 180,
  'Supreme Court': 365,
};

// ─── Service ─────────────────────────────────────────────────────────────────

export async function fetchCaseIntelligence(caseId: string): Promise<IntelligenceData> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Parallel data fetching - split to avoid TS2589 deep type inference
  const caseResult = await supabase.from('cases').select('*, clients:client_id (display_name)').eq('id', caseId).single();
  
  const fetchAll = [
    supabase.from('stage_instances').select('*').eq('case_id', caseId).order('started_at', { ascending: true }),
    supabase.from('stage_transitions').select('*, profiles:created_by (full_name)').eq('case_id', caseId).order('created_at', { ascending: true }),
    supabase.from('stage_notices').select('*').eq('case_id', caseId).order('created_at', { ascending: true }),
    supabase.from('hearings').select('*, courts:court_id (name)').eq('case_id', caseId).order('hearing_date', { ascending: false }),
    supabase.from('tasks').select('id, title, status, assigned_to, due_date, stage, priority').eq('case_id', caseId),
    supabase.from('documents').select('id, file_name, category, upload_timestamp, created_at, document_status').eq('case_id', caseId),
    (supabase.from('stage_replies' as any).select('*').eq('case_id', caseId)) as any,
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    (supabase.from('stage_closure_details' as any).select('*, stage_instances!inner(stage_key)').eq('case_id', caseId)) as any,
  ] as const;
  const results = await Promise.all(fetchAll) as any[];
  const [instancesResult, transitionsResult, noticesResult, hearingsResult, tasksResult, documentsResult, repliesResult, profileResult, closuresResult] = results;

  if (caseResult.error || !caseResult.data) throw new Error('Case not found');

  const caseData = caseResult.data as any;
  const instances = (instancesResult.data || []) as any[];
  const transitions = (transitionsResult.data || []) as any[];
  const notices = (noticesResult.data || []) as any[];
  const hearings = (hearingsResult.data || []) as any[];
  const tasks = (tasksResult.data || []) as any[];
  const documents = (documentsResult.data || []) as any[];
  const replies = (repliesResult.data || []) as any[];
  const closuresRaw = (closuresResult?.data || []) as any[];

  // Resolve assignee names for tasks
  const assigneeIds = [...new Set(tasks.map(t => t.assigned_to).filter(Boolean))];
  let userNameMap: Record<string, string> = {};
  if (assigneeIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', assigneeIds);
    if (profiles) {
      userNameMap = profiles.reduce((acc: Record<string, string>, p: any) => {
        acc[p.id] = p.full_name || 'Unknown';
        return acc;
      }, {});
    }
  }

  // Map data
  const mappedCase = {
    id: caseData.id,
    caseNumber: caseData.case_number,
    title: caseData.title,
    client: (caseData.clients as any)?.display_name || 'Unknown Client',
    clientId: caseData.client_id,
    currentStage: caseData.stage_code || 'Assessment',
    status: caseData.status || 'Active',
    priority: caseData.priority || 'Medium',
    createdAt: caseData.created_at,
    description: caseData.description,
    taxDemand: caseData.tax_demand,
    penaltyAmount: caseData.penalty_amount,
    interestAmount: caseData.interest_amount,
    totalDemand: caseData.total_demand,
    noticeDate: caseData.notice_date,
    replyDueDate: caseData.reply_due_date,
  };

  const mappedInstances: StageInstanceData[] = instances.map(i => {
    const start = new Date(i.started_at);
    const end = i.ended_at ? new Date(i.ended_at) : new Date();
    return {
      id: i.id,
      stageKey: i.stage_key,
      cycleNo: i.cycle_no,
      startedAt: i.started_at,
      endedAt: i.ended_at,
      status: i.status,
      durationDays: Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))),
    };
  });

  const mappedTransitions: StageTransitionData[] = transitions.map((t, idx) => {
    let durationInPrev: number | null = null;
    if (idx > 0) {
      const prevDate = new Date(transitions[idx - 1].created_at);
      const currDate = new Date(t.created_at);
      durationInPrev = Math.ceil((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
    }
    return {
      id: t.id,
      fromStage: t.from_stage,
      toStage: t.to_stage,
      transitionType: t.transition_type,
      comments: t.comments,
      createdAt: t.created_at,
      actorName: t.profiles?.full_name || 'System',
      actorRole: t.actor_role,
      durationInPreviousStage: durationInPrev,
    };
  });

  const mappedNotices: NoticeData[] = notices.map(n => {
    // Resolve stageKey from stage_instance_id via the instances array
    const linkedInstance = instances.find((i: any) => i.id === n.stage_instance_id);
    return {
      id: n.id,
      noticeNo: n.notice_number || n.notice_no || null,
      noticeDate: n.notice_date,
      stageKey: linkedInstance?.stage_key || null,
      status: n.status || 'Active',
      amountDemanded: n.amount_demanded,
      taxAmount: n.tax_amount,
      penaltyAmount: n.penalty_amount,
      interestAmount: n.interest_amount,
    };
  });

  const mappedHearings: HearingData[] = hearings.map(h => ({
    id: h.id,
    hearingDate: h.hearing_date,
    status: h.status,
    hearingType: h.hearing_type,
    outcome: h.outcome,
    courtName: (h.courts as any)?.name || null,
    notes: h.notes,
  }));

  const mappedTasks: TaskData[] = tasks.map(t => ({
    id: t.id,
    title: t.title,
    status: t.status,
    assigneeName: userNameMap[t.assigned_to] || 'Unassigned',
    dueDate: t.due_date,
    stage: t.stage,
    priority: t.priority,
  }));

  const mappedDocuments: DocumentData[] = documents.map(d => ({
    id: d.id,
    fileName: d.file_name,
    category: d.category,
    stage: null,
    uploadedAt: d.upload_timestamp || d.created_at,
    documentStatus: d.document_status,
  }));

  const mappedReplies: ReplyData[] = replies.map(r => ({
    id: r.id,
    noticeId: r.notice_id,
    filingMode: r.filing_mode,
    filedDate: r.filed_date || r.reply_date,
    status: r.filing_status || r.status || 'Draft',
  }));

  const mappedClosures: ClosureData[] = closuresRaw.map((c: any) => ({
    stageKey: c.stage_instances?.stage_key || '—',
    outcome: c.closure_status || '—',
    orderNumber: c.closure_ref_no || null,
    orderDate: c.closure_date || null,
    totalDemand: c.final_total_demand || null,
  }));

  // ─── Compute Analytics ───
  const activeInstance = mappedInstances.find(i => i.status === 'Active');
  const daysInCurrentStage = activeInstance?.durationDays || 0;
  const totalLifecycleDuration = caseData.created_at
    ? Math.ceil((Date.now() - new Date(caseData.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const remandCycleCount = mappedTransitions.filter(t => t.transitionType === 'Remand').length;
  const totalCycles = Math.max(1, ...mappedInstances.map(i => i.cycleNo));

  const completedTasks = mappedTasks.filter(t => t.status === 'Completed').length;
  const stageEfficiency = mappedTasks.length > 0 ? Math.round((completedTasks / mappedTasks.length) * 100) : 100;

  const avgDuration = mappedInstances.length > 0
    ? Math.round(mappedInstances.reduce((sum, i) => sum + i.durationDays, 0) / mappedInstances.length)
    : 0;

  const complexityScore = Math.min(100,
    (totalCycles * 10) +
    (mappedHearings.length * 5) +
    (mappedTransitions.length * 3) +
    (remandCycleCount * 15)
  );

  const currentStageSLA = STAGE_SLA_DAYS[mappedCase.currentStage] || 60;
  const escalationFlag = daysInCurrentStage > currentStageSLA;

  const analytics: ComputedAnalytics = {
    daysInCurrentStage,
    totalLifecycleDuration,
    totalStageTransitions: mappedTransitions.length,
    averageStageDuration: avgDuration,
    remandCycleCount,
    totalCycles,
    stageEfficiency,
    litigationComplexityScore: complexityScore,
    escalationFlag,
    escalationReason: escalationFlag
      ? `Stage "${mappedCase.currentStage}" has exceeded SLA of ${currentStageSLA} days (current: ${daysInCurrentStage} days)`
      : null,
  };

  // ─── Risk Scoring ───
  const risk = computeRiskScore(mappedCase, analytics, mappedTasks, mappedReplies, mappedNotices);

  // ─── Financial Summary ───
  const totalNoticesDemand = mappedNotices.reduce((s, n) => s + (n.amountDemanded || 0), 0);
  const totalTax = mappedNotices.reduce((s, n) => s + (n.taxAmount || 0), 0);
  const totalPenalty = mappedNotices.reduce((s, n) => s + (n.penaltyAmount || 0), 0);
  const totalInterest = mappedNotices.reduce((s, n) => s + (n.interestAmount || 0), 0);

  const financial: FinancialSummary = {
    totalDemand: mappedCase.totalDemand || totalNoticesDemand || 0,
    taxDemand: mappedCase.taxDemand || totalTax || 0,
    penalty: mappedCase.penaltyAmount || totalPenalty || 0,
    interest: mappedCase.interestAmount || totalInterest || 0,
    contested: mappedCase.totalDemand || totalNoticesDemand || 0,
  };

  return {
    case: mappedCase,
    stageInstances: mappedInstances,
    stageTransitions: mappedTransitions,
    notices: mappedNotices,
    hearings: mappedHearings,
    tasks: mappedTasks,
    documents: mappedDocuments,
    replies: mappedReplies,
    closures: mappedClosures,
    analytics,
    risk,
    financial,
    generatedAt: new Date().toISOString(),
    generatedBy: user.id,
    generatedByName: profileResult.data?.full_name || 'Unknown',
  };
}

// ─── Risk Scoring Engine ─────────────────────────────────────────────────────

function computeRiskScore(
  caseData: IntelligenceData['case'],
  analytics: ComputedAnalytics,
  tasks: TaskData[],
  replies: ReplyData[],
  notices: NoticeData[]
): RiskAssessment {
  const factors: RiskFactor[] = [];
  let totalScore = 0;

  // Factor 1: Stage Overdue
  if (analytics.escalationFlag) {
    const weight = Math.min(30, analytics.daysInCurrentStage - (STAGE_SLA_DAYS[caseData.currentStage] || 60));
    factors.push({ name: 'Stage Overdue', severity: 'High', impact: analytics.escalationReason || 'SLA exceeded', weight: Math.min(30, weight) });
    totalScore += Math.min(30, weight);
  }

  // Factor 2: Financial Exposure
  const totalDemand = caseData.totalDemand || 0;
  if (totalDemand > 10000000) { // > 1 Cr
    factors.push({ name: 'High Financial Exposure', severity: 'High', impact: `₹${(totalDemand / 10000000).toFixed(2)} Cr demand`, weight: 25 });
    totalScore += 25;
  } else if (totalDemand > 1000000) { // > 10 Lakh
    factors.push({ name: 'Moderate Financial Exposure', severity: 'Medium', impact: `₹${(totalDemand / 100000).toFixed(2)} Lakh demand`, weight: 15 });
    totalScore += 15;
  }

  // Factor 3: Pending Critical Actions
  const overdueTasks = tasks.filter(t => t.status !== 'Completed' && t.dueDate && new Date(t.dueDate) < new Date());
  if (overdueTasks.length > 0) {
    const weight = Math.min(20, overdueTasks.length * 5);
    factors.push({ name: 'Overdue Tasks', severity: overdueTasks.length > 3 ? 'High' : 'Medium', impact: `${overdueTasks.length} overdue task(s)`, weight });
    totalScore += weight;
  }

  const pendingReplies = replies.filter(r => r.status === 'Draft' || r.status === 'Pending');
  if (pendingReplies.length > 0) {
    factors.push({ name: 'Pending Replies', severity: 'Medium', impact: `${pendingReplies.length} reply pending`, weight: 10 });
    totalScore += 10;
  }

  // Factor 4: Remand Cycles
  if (analytics.remandCycleCount > 0) {
    const weight = Math.min(15, analytics.remandCycleCount * 8);
    factors.push({ name: 'Remand Cycles', severity: analytics.remandCycleCount > 1 ? 'High' : 'Medium', impact: `${analytics.remandCycleCount} remand(s)`, weight });
    totalScore += weight;
  }

  const score = Math.min(100, totalScore);
  const level: RiskAssessment['level'] = score >= 50 ? 'High' : score >= 25 ? 'Medium' : 'Low';

  return { level, score, factors };
}

// ─── Snapshot Service ────────────────────────────────────────────────────────

export async function saveIntelligenceSnapshot(
  caseId: string,
  data: IntelligenceData,
  label?: string
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
  if (!profile) throw new Error('Profile not found');

  const insertPayload = {
    case_id: caseId,
    tenant_id: profile.tenant_id,
    snapshot_data: JSON.parse(JSON.stringify(data)),
    risk_score: data.risk.level,
    financial_exposure: data.financial.totalDemand,
    created_by: user.id,
    label: label || `Snapshot - ${format(new Date(), 'dd MMM yyyy HH:mm')}`,
  };

  const { data: snapshot, error } = await supabase
    .from('case_intelligence_snapshots')
    .insert(insertPayload as any)
    .select('id')
    .single();

  if (error) throw error;
  return snapshot!.id;
}

export async function getIntelligenceSnapshots(caseId: string) {
  const { data, error } = await supabase
    .from('case_intelligence_snapshots')
    .select('id, created_at, label, risk_score, financial_exposure, created_by')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getSnapshotData(snapshotId: string): Promise<IntelligenceData> {
  const { data, error } = await supabase
    .from('case_intelligence_snapshots')
    .select('snapshot_data')
    .eq('id', snapshotId)
    .single();

  if (error) throw error;
  return data!.snapshot_data as unknown as IntelligenceData;
}
