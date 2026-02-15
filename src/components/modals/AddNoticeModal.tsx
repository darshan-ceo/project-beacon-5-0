/**
 * Add Notice Modal
 * Enhanced form for adding/editing stage notices with expanded fields
 * Following the Notice Workflow Alignment requirements
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ModalLayout } from '@/components/ui/modal-layout';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody } from '@/components/ui/dialog';
import { FileText, Calendar, IndianRupee, Building2, Scale, Upload, X } from 'lucide-react';
import { StageNotice, CreateStageNoticeInput, NoticeStatus, NoticeWorkflowStep, DemandBreakdown } from '@/types/stageWorkflow';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { uploadDocument, DocumentMetadata } from '@/services/supabaseDocumentService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AddNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateStageNoticeInput) => Promise<void>;
  caseId: string;
  stageInstanceId?: string | null;
  editNotice?: StageNotice | null;
  isLoading?: boolean;
  mode?: 'add' | 'edit' | 'view';
}

const NOTICE_TYPES = [
  { value: 'ASMT-10', label: 'ASMT-10 (Assessment Notice)' },
  { value: 'ASMT-11', label: 'ASMT-11 (Additional Information)' },
  { value: 'DRC-01', label: 'DRC-01 (Demand & Recovery)' },
  { value: 'DRC-07', label: 'DRC-07 (Summary of Order)' },
  { value: 'SCN', label: 'Show Cause Notice' },
  { value: 'APL-01', label: 'APL-01 (Appeal Notice)' },
  { value: 'APL-02', label: 'APL-02 (Appeal Acknowledgment)' },
  { value: 'Other', label: 'Other Notice Type' }
];

const SECTIONS = [
  '73(1)', '73(2)', '74(1)', '74(2)', '75', '76', '77', '78', '79', '83', 'Other'
];

const FINANCIAL_YEARS = (() => {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  for (let i = currentYear; i >= currentYear - 10; i--) {
    years.push(`${i}-${(i + 1).toString().slice(-2)}`);
  }
  return years;
})();

const ISSUING_AUTHORITIES = [
  'Assistant Commissioner',
  'Deputy Commissioner',
  'Joint Commissioner',
  'Additional Commissioner',
  'Commissioner',
  'Principal Commissioner',
  'Chief Commissioner',
  'Superintendent',
  'Other'
];

const DEFAULT_BREAKDOWN: DemandBreakdown = { igst: 0, cgst: 0, sgst: 0, cess: 0 };

interface BreakdownDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  breakdown: DemandBreakdown;
  onSave: (breakdown: DemandBreakdown) => void;
}

const BreakdownDialog: React.FC<BreakdownDialogProps> = ({ open, onClose, title, breakdown, onSave }) => {
  const [local, setLocal] = useState<DemandBreakdown>(breakdown);

  useEffect(() => {
    if (open) setLocal(breakdown);
  }, [open, breakdown]);

  const total = local.igst + local.cgst + local.sgst + local.cess;

  const handleChange = (key: keyof DemandBreakdown, value: string) => {
    setLocal(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-base">{title} Breakdown</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>IGST (₹)</Label>
              <Input
                type="number"
                placeholder="0"
                value={local.igst || ''}
                onChange={(e) => handleChange('igst', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>CGST (₹)</Label>
              <Input
                type="number"
                placeholder="0"
                value={local.cgst || ''}
                onChange={(e) => handleChange('cgst', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>SGST (₹)</Label>
              <Input
                type="number"
                placeholder="0"
                value={local.sgst || ''}
                onChange={(e) => handleChange('sgst', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>CESS (₹)</Label>
              <Input
                type="number"
                placeholder="0"
                value={local.cess || ''}
                onChange={(e) => handleChange('cess', e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
            <span className="font-medium text-sm">Total</span>
            <span className="font-bold">₹{new Intl.NumberFormat('en-IN').format(total)}</span>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={() => { onSave(local); onClose(); }}>Save Breakdown</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const AddNoticeModal: React.FC<AddNoticeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  caseId,
  stageInstanceId,
  editNotice,
  isLoading = false,
  mode = 'add'
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    // Section 1: Identification
    notice_type: '',
    notice_number: '',
    offline_reference_no: '',
    notice_date: '',
    due_date: '',
    // Section 2: Authority
    officer_name: '',
    issuing_authority: '',
    issuing_designation: '',
    // Section 3: Legal & Compliance
    section_invoked: '',
    tax_period_start: '',
    tax_period_end: '',
    financial_year: '',
    // Section 4: Demand Details
    tax_amount: '',
    interest_amount: '',
    penalty_amount: '',
    tax_applicable: true,
    interest_applicable: true,
    penalty_applicable: true,
    // Section 5: Other
    notes: ''
  });

  // Breakdown state
  const [taxBreakdown, setTaxBreakdown] = useState<DemandBreakdown>({ ...DEFAULT_BREAKDOWN });
  const [interestBreakdown, setInterestBreakdown] = useState<DemandBreakdown>({ ...DEFAULT_BREAKDOWN });
  const [penaltyBreakdown, setPenaltyBreakdown] = useState<DemandBreakdown>({ ...DEFAULT_BREAKDOWN });
  const [activeBreakdown, setActiveBreakdown] = useState<'tax' | 'interest' | 'penalty' | null>(null);

  // Document upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEdit = mode === 'edit' || (!!editNotice && mode !== 'view');
  const isViewOnly = mode === 'view';

  // Compute total demand
  const totalDemand = useMemo(() => {
    const tax = formData.tax_applicable ? parseFloat(formData.tax_amount) || 0 : 0;
    const interest = formData.interest_applicable ? parseFloat(formData.interest_amount) || 0 : 0;
    const penalty = formData.penalty_applicable ? parseFloat(formData.penalty_amount) || 0 : 0;
    return tax + interest + penalty;
  }, [formData.tax_amount, formData.interest_amount, formData.penalty_amount, 
      formData.tax_applicable, formData.interest_applicable, formData.penalty_applicable]);

  // Reset form when modal opens/closes or editNotice changes
  useEffect(() => {
    if (isOpen && editNotice) {
      const meta = editNotice.metadata as any || {};
      setFormData({
        notice_type: editNotice.notice_type || '',
        notice_number: editNotice.notice_number || '',
        offline_reference_no: editNotice.offline_reference_no || '',
        notice_date: editNotice.notice_date || '',
        due_date: editNotice.due_date || '',
        officer_name: meta.officer_name || '',
        issuing_authority: editNotice.issuing_authority || '',
        issuing_designation: editNotice.issuing_designation || '',
        section_invoked: editNotice.section_invoked || '',
        tax_period_start: editNotice.tax_period_start || '',
        tax_period_end: editNotice.tax_period_end || '',
        financial_year: editNotice.financial_year || '',
        tax_amount: editNotice.tax_amount?.toString() || '',
        interest_amount: editNotice.interest_amount?.toString() || '',
        penalty_amount: editNotice.penalty_amount?.toString() || '',
        tax_applicable: editNotice.tax_applicable ?? true,
        interest_applicable: editNotice.interest_applicable ?? true,
        penalty_applicable: editNotice.penalty_applicable ?? true,
        notes: meta.notes || ''
      });
      setTaxBreakdown(meta.tax_breakdown || { ...DEFAULT_BREAKDOWN });
      setInterestBreakdown(meta.interest_breakdown || { ...DEFAULT_BREAKDOWN });
      setPenaltyBreakdown(meta.penalty_breakdown || { ...DEFAULT_BREAKDOWN });
      setSelectedFiles([]);
    } else if (isOpen) {
      setFormData({
        notice_type: '',
        notice_number: '',
        offline_reference_no: '',
        notice_date: '',
        due_date: '',
        officer_name: '',
        issuing_authority: '',
        issuing_designation: '',
        section_invoked: '',
        tax_period_start: '',
        tax_period_end: '',
        financial_year: '',
        tax_amount: '',
        interest_amount: '',
        penalty_amount: '',
        tax_applicable: true,
        interest_applicable: true,
        penalty_applicable: true,
        notes: ''
      });
      setTaxBreakdown({ ...DEFAULT_BREAKDOWN });
      setInterestBreakdown({ ...DEFAULT_BREAKDOWN });
      setPenaltyBreakdown({ ...DEFAULT_BREAKDOWN });
      setSelectedFiles([]);
    }
  }, [isOpen, editNotice]);

  // Breakdown save handlers
  const handleBreakdownSave = (type: 'tax' | 'interest' | 'penalty', bd: DemandBreakdown) => {
    const total = bd.igst + bd.cgst + bd.sgst + bd.cess;
    if (type === 'tax') {
      setTaxBreakdown(bd);
      setFormData(prev => ({ ...prev, tax_amount: total > 0 ? total.toString() : '' }));
    } else if (type === 'interest') {
      setInterestBreakdown(bd);
      setFormData(prev => ({ ...prev, interest_amount: total > 0 ? total.toString() : '' }));
    } else {
      setPenaltyBreakdown(bd);
      setFormData(prev => ({ ...prev, penalty_amount: total > 0 ? total.toString() : '' }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsUploading(true);
    let documentIds: string[] = editNotice?.documents || [];

    try {
      // Get tenant_id for document uploads
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      // Upload documents if any selected
      if (selectedFiles.length > 0 && profile?.tenant_id) {
        for (const file of selectedFiles) {
          try {
            const metadata: DocumentMetadata = {
              tenant_id: profile.tenant_id,
              case_id: caseId,
              category: 'Notice',
              remarks: `Notice document: ${formData.notice_type || 'Notice'}`
            };
            
            const doc = await uploadDocument(file, metadata);
            if (doc?.id) {
              documentIds.push(doc.id);
            }
          } catch (uploadError) {
            console.error('[AddNoticeModal] Document upload failed:', uploadError);
            toast({
              title: "Upload Warning",
              description: `Failed to upload ${file.name}`,
              variant: "destructive"
            });
          }
        }
      }

      const input: CreateStageNoticeInput = {
        case_id: caseId,
        stage_instance_id: stageInstanceId || undefined,
        notice_type: formData.notice_type || undefined,
        notice_number: formData.notice_number || undefined,
        notice_date: formData.notice_date || undefined,
        due_date: formData.due_date || undefined,
        section_invoked: formData.section_invoked || undefined,
        metadata: formData.notes ? { notes: formData.notes } : undefined,
        documents: documentIds.length > 0 ? documentIds : undefined,
        // New fields
        offline_reference_no: formData.offline_reference_no || undefined,
        officer_name: formData.officer_name || undefined,
        issuing_authority: formData.issuing_authority || undefined,
        issuing_designation: formData.issuing_designation || undefined,
        tax_period_start: formData.tax_period_start || undefined,
        tax_period_end: formData.tax_period_end || undefined,
        financial_year: formData.financial_year || undefined,
        tax_amount: formData.tax_amount ? parseFloat(formData.tax_amount) : undefined,
        interest_amount: formData.interest_amount ? parseFloat(formData.interest_amount) : undefined,
        penalty_amount: formData.penalty_amount ? parseFloat(formData.penalty_amount) : undefined,
        tax_applicable: formData.tax_applicable,
        interest_applicable: formData.interest_applicable,
        penalty_applicable: formData.penalty_applicable,
        tax_breakdown: taxBreakdown,
        interest_breakdown: interestBreakdown,
        penalty_breakdown: penaltyBreakdown,
        // Compute amount_demanded from breakdown
        amount_demanded: totalDemand > 0 ? totalDemand : undefined,
        workflow_step: 'notice'
      };

      await onSave(input);
      onClose();
    } catch (error) {
      console.error('[AddNoticeModal] Save failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const getTitle = () => {
    if (isViewOnly) return 'View Notice';
    return isEdit ? 'Edit Notice' : 'Add Notice';
  };

  const getDescription = () => {
    if (isViewOnly) return 'Notice details';
    return isEdit ? 'Update the notice details below' : 'Record a new notice for this stage';
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      const date = parseISO(dateStr);
      return isValid(date) ? format(date, 'dd MMM yyyy') : dateStr;
    } catch {
      return dateStr;
    }
  };

  const footerContent = isViewOnly ? (
    <Button type="button" onClick={onClose}>
      Close
    </Button>
  ) : (
    <>
      <Button type="button" variant="outline" onClick={onClose} disabled={isLoading || isUploading}>
        Cancel
      </Button>
      <Button type="submit" form="add-notice-form" disabled={isLoading || isUploading}>
        {isUploading ? 'Uploading...' : isLoading ? 'Saving...' : isEdit ? 'Update Notice' : 'Add Notice'}
      </Button>
    </>
  );

  // Helper to get the active breakdown data
  const getActiveBreakdownData = () => {
    if (activeBreakdown === 'tax') return { title: 'Tax Amount', breakdown: taxBreakdown };
    if (activeBreakdown === 'interest') return { title: 'Interest Amount', breakdown: interestBreakdown };
    if (activeBreakdown === 'penalty') return { title: 'Penalty Amount', breakdown: penaltyBreakdown };
    return { title: '', breakdown: { ...DEFAULT_BREAKDOWN } };
  };

  const activeData = getActiveBreakdownData();

  return (
    <ModalLayout
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={getTitle()}
      description={getDescription()}
      icon={<FileText className="h-5 w-5 text-primary" />}
      footer={footerContent}
      maxWidth="max-w-[600px]"
    >
      <form id="add-notice-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Section 1: Notice Identification */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FileText className="h-4 w-4" />
            Notice Identification
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="notice_type">Notice Type</Label>
              {isViewOnly ? (
                <p className="text-sm font-medium py-2 px-3 bg-muted/50 rounded-md">
                  {NOTICE_TYPES.find(t => t.value === formData.notice_type)?.label || formData.notice_type || '—'}
                </p>
              ) : (
                <Select
                  value={formData.notice_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, notice_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTICE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notice_number">Online Reference No</Label>
              {isViewOnly ? (
                <p className="text-sm font-medium py-2 px-3 bg-muted/50 rounded-md">
                  {formData.notice_number || '—'}
                </p>
              ) : (
                <Input
                  id="notice_number"
                  placeholder="e.g., ASMT-10/2026/001234"
                  value={formData.notice_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, notice_number: e.target.value }))}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="offline_reference_no">Offline Reference No (Optional)</Label>
              {isViewOnly ? (
                <p className="text-sm font-medium py-2 px-3 bg-muted/50 rounded-md">
                  {formData.offline_reference_no || '—'}
                </p>
              ) : (
                <Input
                  id="offline_reference_no"
                  placeholder="Physical file reference"
                  value={formData.offline_reference_no}
                  onChange={(e) => setFormData(prev => ({ ...prev, offline_reference_no: e.target.value }))}
                />
              )}
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="notice_date">Notice Date</Label>
              {isViewOnly ? (
                <p className="text-sm font-medium py-2 px-3 bg-muted/50 rounded-md flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {formatDisplayDate(formData.notice_date)}
                </p>
              ) : (
                <Input
                  id="notice_date"
                  type="date"
                  value={formData.notice_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, notice_date: e.target.value }))}
                />
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="due_date">Reply Due Date</Label>
            {isViewOnly ? (
              <p className="text-sm font-medium py-2 px-3 bg-muted/50 rounded-md flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {formatDisplayDate(formData.due_date)}
              </p>
            ) : (
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              />
            )}
          </div>
        </div>

        <Separator />

        {/* Section 2: Issuing Authority - Reordered: Officer Name, Designation, then Authority dropdown */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Building2 className="h-4 w-4" />
            Issuing Authority
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="officer_name">Officer Name</Label>
              {isViewOnly ? (
                <p className="text-sm font-medium py-2 px-3 bg-muted/50 rounded-md">
                  {formData.officer_name || '—'}
                </p>
              ) : (
                <Input
                  id="officer_name"
                  placeholder="Name of the officer"
                  value={formData.officer_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, officer_name: e.target.value }))}
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="issuing_designation">Officer Designation</Label>
              {isViewOnly ? (
                <p className="text-sm font-medium py-2 px-3 bg-muted/50 rounded-md">
                  {formData.issuing_designation || '—'}
                </p>
              ) : (
                <Input
                  id="issuing_designation"
                  placeholder="e.g., CGST Delhi"
                  value={formData.issuing_designation}
                  onChange={(e) => setFormData(prev => ({ ...prev, issuing_designation: e.target.value }))}
                />
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="issuing_authority">Officer Details / Authority</Label>
            {isViewOnly ? (
              <p className="text-sm font-medium py-2 px-3 bg-muted/50 rounded-md">
                {formData.issuing_authority || '—'}
              </p>
            ) : (
              <Select
                value={formData.issuing_authority}
                onValueChange={(value) => setFormData(prev => ({ ...prev, issuing_authority: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select authority" />
                </SelectTrigger>
                <SelectContent>
                  {ISSUING_AUTHORITIES.map((auth) => (
                    <SelectItem key={auth} value={auth}>
                      {auth}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <Separator />

        {/* Section 3: Legal & Compliance */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Scale className="h-4 w-4" />
            Legal & Compliance
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="section_invoked">Section(s) Invoked</Label>
              {isViewOnly ? (
                <p className="text-sm font-medium py-2 px-3 bg-muted/50 rounded-md">
                  {formData.section_invoked ? `Section ${formData.section_invoked}` : '—'}
                </p>
              ) : (
                <Select
                  value={formData.section_invoked}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, section_invoked: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTIONS.map((section) => (
                      <SelectItem key={section} value={section}>
                        Section {section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="financial_year">Financial Year</Label>
              {isViewOnly ? (
                <p className="text-sm font-medium py-2 px-3 bg-muted/50 rounded-md">
                  {formData.financial_year ? `FY ${formData.financial_year}` : '—'}
                </p>
              ) : (
                <Select
                  value={formData.financial_year}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, financial_year: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select FY" />
                  </SelectTrigger>
                  <SelectContent>
                    {FINANCIAL_YEARS.map((fy) => (
                      <SelectItem key={fy} value={fy}>
                        FY {fy}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tax_period_start">Tax Period From</Label>
              {isViewOnly ? (
                <p className="text-sm font-medium py-2 px-3 bg-muted/50 rounded-md">
                  {formatDisplayDate(formData.tax_period_start)}
                </p>
              ) : (
                <Input
                  id="tax_period_start"
                  type="date"
                  value={formData.tax_period_start}
                  onChange={(e) => setFormData(prev => ({ ...prev, tax_period_start: e.target.value }))}
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tax_period_end">Tax Period To</Label>
              {isViewOnly ? (
                <p className="text-sm font-medium py-2 px-3 bg-muted/50 rounded-md">
                  {formatDisplayDate(formData.tax_period_end)}
                </p>
              ) : (
                <Input
                  id="tax_period_end"
                  type="date"
                  value={formData.tax_period_end}
                  onChange={(e) => setFormData(prev => ({ ...prev, tax_period_end: e.target.value }))}
                />
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Section 4: Demand Details with Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <IndianRupee className="h-4 w-4" />
            Demand Details
          </div>
          
          <div className="space-y-2">
            {/* Tax Amount */}
            <div className="grid grid-cols-[1fr,auto] gap-3 items-center">
              <div className="space-y-1.5">
                <Label>Tax Amount (₹)</Label>
                {isViewOnly ? (
                  <p className="text-sm font-medium py-2 px-3 bg-muted/50 rounded-md">
                    {formData.tax_amount ? `₹${new Intl.NumberFormat('en-IN').format(parseFloat(formData.tax_amount))}` : '—'}
                  </p>
                ) : (
                  <div
                    className={cn(
                      "flex h-10 w-full rounded-beacon-md border border-input bg-background px-3 py-2 text-[14px] cursor-pointer items-center transition-all duration-200 hover:bg-muted/30",
                      !formData.tax_applicable && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => formData.tax_applicable && setActiveBreakdown('tax')}
                  >
                    {formData.tax_amount ? (
                      <span>₹{new Intl.NumberFormat('en-IN').format(parseFloat(formData.tax_amount))}</span>
                    ) : (
                      <span className="text-muted-foreground">Click to enter breakdown</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="tax_applicable"
                  checked={formData.tax_applicable}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, tax_applicable: !!checked }))}
                  disabled={isViewOnly}
                />
                <Label htmlFor="tax_applicable" className="text-xs">Applicable</Label>
              </div>
            </div>

            {/* Interest Amount */}
            <div className="grid grid-cols-[1fr,auto] gap-3 items-center">
              <div className="space-y-1.5">
                <Label>Interest Amount (₹)</Label>
                {isViewOnly ? (
                  <p className="text-sm font-medium py-2 px-3 bg-muted/50 rounded-md">
                    {formData.interest_amount ? `₹${new Intl.NumberFormat('en-IN').format(parseFloat(formData.interest_amount))}` : '—'}
                  </p>
                ) : (
                  <div
                    className={cn(
                      "flex h-10 w-full rounded-beacon-md border border-input bg-background px-3 py-2 text-[14px] cursor-pointer items-center transition-all duration-200 hover:bg-muted/30",
                      !formData.interest_applicable && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => formData.interest_applicable && setActiveBreakdown('interest')}
                  >
                    {formData.interest_amount ? (
                      <span>₹{new Intl.NumberFormat('en-IN').format(parseFloat(formData.interest_amount))}</span>
                    ) : (
                      <span className="text-muted-foreground">Click to enter breakdown</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="interest_applicable"
                  checked={formData.interest_applicable}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, interest_applicable: !!checked }))}
                  disabled={isViewOnly}
                />
                <Label htmlFor="interest_applicable" className="text-xs">Applicable</Label>
              </div>
            </div>

            {/* Penalty Amount */}
            <div className="grid grid-cols-[1fr,auto] gap-3 items-center">
              <div className="space-y-1.5">
                <Label>Penalty Amount (₹)</Label>
                {isViewOnly ? (
                  <p className="text-sm font-medium py-2 px-3 bg-muted/50 rounded-md">
                    {formData.penalty_amount ? `₹${new Intl.NumberFormat('en-IN').format(parseFloat(formData.penalty_amount))}` : '—'}
                  </p>
                ) : (
                  <div
                    className={cn(
                      "flex h-10 w-full rounded-beacon-md border border-input bg-background px-3 py-2 text-[14px] cursor-pointer items-center transition-all duration-200 hover:bg-muted/30",
                      !formData.penalty_applicable && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => formData.penalty_applicable && setActiveBreakdown('penalty')}
                  >
                    {formData.penalty_amount ? (
                      <span>₹{new Intl.NumberFormat('en-IN').format(parseFloat(formData.penalty_amount))}</span>
                    ) : (
                      <span className="text-muted-foreground">Click to enter breakdown</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="penalty_applicable"
                  checked={formData.penalty_applicable}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, penalty_applicable: !!checked }))}
                  disabled={isViewOnly}
                />
                <Label htmlFor="penalty_applicable" className="text-xs">Applicable</Label>
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md mt-2">
              <span className="font-medium">Total Demand</span>
              <span className="font-bold text-lg">
                ₹{new Intl.NumberFormat('en-IN').format(totalDemand)}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Section 5: Documents */}
        {!isViewOnly && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Upload className="h-4 w-4" />
              Attach Documents
            </div>
            
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer",
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              )}
            >
              <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Drop scanned notice files here or click to browse
              </p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                PDF, DOC, DOCX, JPG, PNG
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              className="hidden"
              onChange={handleFileSelect}
            />
            
            {selectedFiles.length > 0 && (
              <div className="space-y-1.5">
                {selectedFiles.map((file, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-2 border rounded-md bg-muted/30"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        ({(file.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <Button 
                      type="button"
                      size="icon" 
                      variant="ghost" 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(idx);
                      }}
                      className="h-6 w-6 flex-shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes (Optional)</Label>
          {isViewOnly ? (
            <p className="text-sm py-2 px-3 bg-muted/50 rounded-md min-h-[60px]">
              {formData.notes || 'No notes'}
            </p>
          ) : (
            <Textarea
              id="notes"
              placeholder="Any additional notes about this notice..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          )}
        </div>
      </form>

      {/* Breakdown Dialog */}
      <BreakdownDialog
        open={activeBreakdown !== null}
        onClose={() => setActiveBreakdown(null)}
        title={activeData.title}
        breakdown={activeData.breakdown}
        onSave={(bd) => activeBreakdown && handleBreakdownSave(activeBreakdown, bd)}
      />
    </ModalLayout>
  );
};
