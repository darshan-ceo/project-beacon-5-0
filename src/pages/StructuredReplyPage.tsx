import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { FullPageForm } from '@/components/ui/full-page-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { stageRepliesService } from '@/services/stageRepliesService';
import { structuredReplyService } from '@/services/structuredReplyService';
import { stageNoticesService } from '@/services/stageNoticesService';
import { format, parseISO, isAfter } from 'date-fns';
import {
  FileText, Upload, Plus, Trash2, AlertTriangle, Clock,
  Scale, Shield, BookOpen, PenTool
} from 'lucide-react';
import type { StageNotice, StageReply, FilingMode } from '@/types/stageWorkflow';
import type { AdditionalSubmission } from '@/types/structuredReply';

const StructuredReplyPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const noticeId = searchParams.get('noticeId');
  const replyId = searchParams.get('replyId');
  const stageInstanceId = searchParams.get('stageInstanceId');

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [caseData, setCaseData] = useState<any>(null);
  const [notice, setNotice] = useState<StageNotice | null>(null);
  const [existingReply, setExistingReply] = useState<StageReply | null>(null);

  // Form fields - base reply
  const [replyReference, setReplyReference] = useState('');
  const [replyDate, setReplyDate] = useState('');
  const [filingMode, setFilingMode] = useState<FilingMode | ''>('');
  const [filingStatus, setFilingStatus] = useState<'Draft' | 'Filed'>('Draft');
  const [notes, setNotes] = useState('');

  // Form fields - structured details
  const [preparedBy, setPreparedBy] = useState('');
  const [filedByName, setFiledByName] = useState('');
  const [preDepositPct, setPreDepositPct] = useState('');
  const [preDepositAmount, setPreDepositAmount] = useState('');
  const [preDepositRemarks, setPreDepositRemarks] = useState('');
  const [crossObjRef, setCrossObjRef] = useState('');
  const [crossObjDate, setCrossObjDate] = useState('');
  const [ackReferenceId, setAckReferenceId] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [condonationFiled, setCondonationFiled] = useState(false);
  const [keyArguments, setKeyArguments] = useState('');
  const [strengthWeakness, setStrengthWeakness] = useState('');
  const [expectedOutcome, setExpectedOutcome] = useState('');
  const [additionalSubmissions, setAdditionalSubmissions] = useState<AdditionalSubmission[]>([]);

  // Computed
  const isDelayed = useMemo(() => {
    if (!replyDate || !notice?.due_date) return false;
    try {
      return isAfter(parseISO(replyDate), parseISO(notice.due_date));
    } catch { return false; }
  }, [replyDate, notice?.due_date]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!caseId || !noticeId) return;
      setLoading(true);
      try {
        // Load case, notice, and existing reply in parallel
        const [caseRes, noticeData] = await Promise.all([
          supabase.from('cases').select('id, case_number, title, stage_code').eq('id', caseId).single(),
          stageNoticesService.getNotice(noticeId),
        ]);

        if (caseRes.data) setCaseData(caseRes.data);
        if (noticeData) setNotice(noticeData);

        // Load existing reply if replyId provided
        if (replyId) {
          const reply = await stageRepliesService.getReply(replyId);
          if (reply) {
            setExistingReply(reply);
            setReplyReference(reply.reply_reference || '');
            setReplyDate(reply.reply_date || '');
            setFilingMode(reply.filing_mode || '');
            setFilingStatus(reply.filing_status === 'Filed' ? 'Filed' : 'Draft');
            setNotes(reply.notes || '');

            // Load structured details
            const details = await structuredReplyService.getByReplyId(reply.id);
            if (details) {
              setPreparedBy(details.prepared_by || '');
              setFiledByName(details.filed_by_name || '');
              setPreDepositPct(details.pre_deposit_pct?.toString() || '');
              setPreDepositAmount(details.pre_deposit_amount?.toString() || '');
              setPreDepositRemarks(details.pre_deposit_remarks || '');
              setCrossObjRef(details.cross_obj_ref || '');
              setCrossObjDate(details.cross_obj_date || '');
              setAckReferenceId(details.ack_reference_id || '');
              setDelayReason(details.delay_reason || '');
              setCondonationFiled(details.condonation_filed);
              setKeyArguments(details.key_arguments || '');
              setStrengthWeakness(details.strength_weakness || '');
              setExpectedOutcome(details.expected_outcome || '');
              setAdditionalSubmissions(details.additional_submissions || []);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load structured reply data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [caseId, noticeId, replyId]);

  const handleSave = useCallback(async (status: 'Draft' | 'Filed') => {
    if (!replyReference.trim()) {
      toast({ title: 'Validation Error', description: 'Reply Reference Number is required.', variant: 'destructive' });
      return;
    }
    if (isDelayed && !delayReason.trim() && status === 'Filed') {
      toast({ title: 'Validation Error', description: 'Delay Reason is required when reply is delayed.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      let replyRecord = existingReply;

      // Create or update base reply
      if (replyRecord) {
        replyRecord = await stageRepliesService.updateReply(replyRecord.id, {
          reply_reference: replyReference,
          reply_date: replyDate || null,
          filing_mode: (filingMode as FilingMode) || null,
          filing_status: status,
          notes: notes || null,
        });
      } else {
        replyRecord = await stageRepliesService.createReply({
          notice_id: noticeId!,
          stage_instance_id: stageInstanceId || undefined,
          reply_reference: replyReference,
          reply_date: replyDate || undefined,
          filing_mode: (filingMode as FilingMode) || undefined,
          filing_status: status,
          notes: notes || undefined,
        });
      }

      if (!replyRecord) throw new Error('Failed to save base reply');

      // Save structured details
      await structuredReplyService.save({
        reply_id: replyRecord.id,
        case_id: caseId!,
        prepared_by: preparedBy || undefined,
        filed_by_name: filedByName || undefined,
        pre_deposit_pct: preDepositPct ? parseFloat(preDepositPct) : null,
        pre_deposit_amount: preDepositAmount ? parseFloat(preDepositAmount) : null,
        pre_deposit_remarks: preDepositRemarks || undefined,
        cross_obj_ref: crossObjRef || undefined,
        cross_obj_date: crossObjDate || undefined,
        ack_reference_id: ackReferenceId || undefined,
        delay_reason: delayReason || undefined,
        condonation_filed: condonationFiled,
        key_arguments: keyArguments || undefined,
        strength_weakness: strengthWeakness || undefined,
        expected_outcome: expectedOutcome || undefined,
        additional_submissions: additionalSubmissions,
      });

      setExistingReply(replyRecord);

      toast({
        title: status === 'Filed' ? 'Reply Filed' : 'Draft Saved',
        description: status === 'Filed'
          ? 'Reply has been filed and lifecycle updated.'
          : 'Reply draft has been saved.',
      });

      if (status === 'Filed') {
        navigate(`/cases?caseId=${caseId}&tab=lifecycle`);
      }
    } catch (error) {
      console.error('Failed to save structured reply:', error);
      toast({ title: 'Error', description: 'Failed to save reply.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [
    replyReference, replyDate, filingMode, notes, existingReply,
    noticeId, stageInstanceId, caseId, preparedBy, filedByName,
    preDepositPct, preDepositAmount, preDepositRemarks, crossObjRef, crossObjDate,
    ackReferenceId, delayReason, condonationFiled, keyArguments, strengthWeakness,
    expectedOutcome, additionalSubmissions, isDelayed, navigate, toast,
  ]);

  const addSubmission = () => {
    setAdditionalSubmissions(prev => [...prev, { description: '', doc_id: null }]);
  };

  const removeSubmission = (index: number) => {
    setAdditionalSubmissions(prev => prev.filter((_, i) => i !== index));
  };

  const updateSubmission = (index: number, field: keyof AdditionalSubmission, value: string) => {
    setAdditionalSubmissions(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const stageName = caseData?.stage_code || 'Appeal';

  return (
    <FullPageForm
      isOpen={true}
      onClose={() => navigate(`/cases?caseId=${caseId}&tab=lifecycle`)}
      title="Structured Reply"
      description={`${caseData?.case_number || ''} — ${stageName} Stage`}
      icon={<FileText className="h-5 w-5" />}
      footer={
        <div className="flex items-center justify-between px-6 py-4">
          <Button variant="outline" onClick={() => navigate(`/cases?caseId=${caseId}&tab=lifecycle`)} disabled={saving}>
            Cancel
          </Button>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => handleSave('Draft')} disabled={saving}>
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button onClick={() => handleSave('Filed')} disabled={saving}>
              {saving ? 'Filing...' : 'File Reply'}
            </Button>
          </div>
        </div>
      }
    >
      {/* Section 1: Header Snapshot */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            Case Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Case Number</span>
              <p className="font-medium">{caseData?.case_number || '—'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Stage</span>
              <p className="font-medium">{stageName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Notice Due Date</span>
              <p className="font-medium">
                {notice?.due_date ? format(parseISO(notice.due_date), 'dd-MM-yyyy') : '—'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Reply Status</span>
              <Badge variant={existingReply?.filing_status === 'Filed' ? 'default' : 'secondary'}>
                {existingReply?.filing_status || 'New'}
              </Badge>
              {isDelayed && (
                <Badge variant="destructive" className="ml-2">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Delayed
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Basic Reply Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <PenTool className="h-4 w-4 text-primary" />
            Reply Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="replyRef">Reply Reference Number *</Label>
              <Input id="replyRef" value={replyReference} onChange={e => setReplyReference(e.target.value)} placeholder="Enter reference number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="replyDate">Reply Date</Label>
              <Input id="replyDate" type="date" value={replyDate} onChange={e => setReplyDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Filing Mode</Label>
              <Select value={filingMode} onValueChange={v => setFilingMode(v as FilingMode)}>
                <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Portal">Online / Portal</SelectItem>
                  <SelectItem value="Physical">Physical</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preparedBy">Prepared By</Label>
              <Input id="preparedBy" value={preparedBy} onChange={e => setPreparedBy(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filedByName">Filed By</Label>
              <Input id="filedByName" value={filedByName} onChange={e => setFiledByName(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Pre-Deposit Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Pre-Deposit Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preDepPct">Pre-Deposit %</Label>
              <Input id="preDepPct" type="number" value={preDepositPct} onChange={e => setPreDepositPct(e.target.value)} placeholder="e.g. 10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preDepAmt">Pre-Deposit Amount</Label>
              <Input id="preDepAmt" type="number" value={preDepositAmount} onChange={e => setPreDepositAmount(e.target.value)} placeholder="Amount" />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="preDepRemarks">Remarks</Label>
              <Input id="preDepRemarks" value={preDepositRemarks} onChange={e => setPreDepositRemarks(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Cross-Objection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Cross-Objection (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="crossRef">Cross-Objection Reference No</Label>
              <Input id="crossRef" value={crossObjRef} onChange={e => setCrossObjRef(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="crossDate">Cross-Objection Date</Label>
              <Input id="crossDate" type="date" value={crossObjDate} onChange={e => setCrossObjDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Filing Proof */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            Filing Proof
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ackRef">Acknowledgement / Portal Reference ID</Label>
            <Input id="ackRef" value={ackReferenceId} onChange={e => setAckReferenceId(e.target.value)} placeholder="Portal acknowledgement number" />
          </div>
          <p className="text-xs text-muted-foreground">
            Filing proof documents can be attached via the Document Management system after saving.
          </p>
        </CardContent>
      </Card>

      {/* Section 6: Additional Submissions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Additional Submissions
            </CardTitle>
            <Button variant="outline" size="sm" onClick={addSubmission}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {additionalSubmissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No additional submissions added.</p>
          ) : (
            additionalSubmissions.map((sub, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <Input
                  className="flex-1"
                  placeholder="Submission description"
                  value={sub.description}
                  onChange={e => updateSubmission(idx, 'description', e.target.value)}
                />
                <Button variant="ghost" size="icon" onClick={() => removeSubmission(idx)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Section 7: Delay Handling */}
      {isDelayed && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <Clock className="h-4 w-4" />
              Delay Handling
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delayReason">Delay Reason *</Label>
              <Textarea id="delayReason" value={delayReason} onChange={e => setDelayReason(e.target.value)} placeholder="Explain reason for delayed filing" />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="condonation" checked={condonationFiled} onCheckedChange={v => setCondonationFiled(v === true)} />
              <Label htmlFor="condonation" className="text-sm">Condonation of Delay Filed</Label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 8: Internal Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Internal Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="keyArgs">Key Arguments Summary</Label>
            <Textarea id="keyArgs" value={keyArguments} onChange={e => setKeyArguments(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="swNotes">Strength / Weakness Notes</Label>
            <Textarea id="swNotes" value={strengthWeakness} onChange={e => setStrengthWeakness(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Expected Outcome</Label>
            <Select value={expectedOutcome} onValueChange={setExpectedOutcome}>
              <SelectTrigger><SelectValue placeholder="Select expected outcome" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Favorable">Favorable</SelectItem>
                <SelectItem value="Partially Favorable">Partially Favorable</SelectItem>
                <SelectItem value="Unfavorable">Unfavorable</SelectItem>
                <SelectItem value="Uncertain">Uncertain</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="generalNotes">General Notes</Label>
            <Textarea id="generalNotes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>
    </FullPageForm>
  );
};

export default StructuredReplyPage;
