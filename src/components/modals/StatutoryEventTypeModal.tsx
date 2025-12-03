import React, { useState, useEffect } from 'react';
import { ModalLayout } from '@/components/ui/modal-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, FileText, Info } from 'lucide-react';
import { StatutoryEventType, StatutoryEventTypeFormData, StatutoryAct, BASE_DATE_TYPES, DEADLINE_TYPES } from '@/types/statutory';
import { statutoryEventTypesService } from '@/services/statutoryEventTypesService';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StatutoryEventTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventType: StatutoryEventType) => void;
  mode: 'add' | 'edit' | 'view';
  eventType: StatutoryEventType | null;
  acts: StatutoryAct[];
}

export const StatutoryEventTypeModal: React.FC<StatutoryEventTypeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  mode,
  eventType,
  acts
}) => {
  const [formData, setFormData] = useState<StatutoryEventTypeFormData>({
    actId: '',
    code: '',
    name: '',
    baseDateType: 'notice_date',
    deadlineType: 'days',
    deadlineCount: 30,
    extensionAllowed: false,
    maxExtensionCount: 0,
    extensionDays: 0,
    legalReference: '',
    description: '',
    isActive: true
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (eventType && (mode === 'edit' || mode === 'view')) {
      setFormData({
        actId: eventType.actId,
        code: eventType.code,
        name: eventType.name,
        baseDateType: eventType.baseDateType,
        deadlineType: eventType.deadlineType,
        deadlineCount: eventType.deadlineCount,
        extensionAllowed: eventType.extensionAllowed,
        maxExtensionCount: eventType.maxExtensionCount,
        extensionDays: eventType.extensionDays,
        legalReference: eventType.legalReference || '',
        description: eventType.description || '',
        isActive: eventType.isActive
      });
    } else {
      setFormData({
        actId: '',
        code: '',
        name: '',
        baseDateType: 'notice_date',
        deadlineType: 'days',
        deadlineCount: 30,
        extensionAllowed: false,
        maxExtensionCount: 0,
        extensionDays: 0,
        legalReference: '',
        description: '',
        isActive: true
      });
    }
  }, [eventType, mode, isOpen]);

  const handleSubmit = async () => {
    if (mode === 'view') return;
    
    setIsSaving(true);
    try {
      let result: StatutoryEventType | null = null;
      
      if (mode === 'add') {
        result = await statutoryEventTypesService.create(formData);
      } else if (mode === 'edit' && eventType) {
        result = await statutoryEventTypesService.update(eventType.id, formData);
      }
      
      if (result) {
        onSave(result);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const isReadOnly = mode === 'view';
  const activeActs = acts.filter(a => a.isActive);

  const title = mode === 'add' ? 'Add Event Type' : mode === 'edit' ? 'Edit Event Type' : 'View Event Type';

  return (
    <ModalLayout
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={title}
      icon={<FileText className="h-5 w-5" />}
      maxWidth="max-w-2xl"
      footer={
        mode !== 'view' && (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving || !formData.actId || !formData.code || !formData.name}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === 'add' ? 'Create' : 'Save Changes'}
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-4">
        {/* Act Selection */}
        <div className="space-y-2">
          <Label htmlFor="actId">Statutory Act *</Label>
          <Select
            value={formData.actId}
            onValueChange={(value) => setFormData(prev => ({ ...prev, actId: value }))}
            disabled={isReadOnly}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select act..." />
            </SelectTrigger>
            <SelectContent>
              {activeActs.map(act => (
                <SelectItem key={act.id} value={act.id}>{act.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Code and Name Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="code">Code *</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="e.g., SCN_REPLY"
              disabled={isReadOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Reply to Show Cause Notice"
              disabled={isReadOnly}
            />
          </div>
        </div>

        {/* Deadline Configuration */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="baseDateType">Base Date Type</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>The reference date from which the deadline is calculated.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select
              value={formData.baseDateType}
              onValueChange={(value: 'notice_date' | 'order_date' | 'receipt_date') => 
                setFormData(prev => ({ ...prev, baseDateType: value }))
              }
              disabled={isReadOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BASE_DATE_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="deadlineType">Deadline Type</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>How the deadline is calculated: Calendar days, months, or working days (excluding weekends/holidays).</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select
              value={formData.deadlineType}
              onValueChange={(value: 'days' | 'months' | 'working_days') => 
                setFormData(prev => ({ ...prev, deadlineType: value }))
              }
              disabled={isReadOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEADLINE_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadlineCount">Count *</Label>
            <Input
              id="deadlineCount"
              type="number"
              min={1}
              value={formData.deadlineCount}
              onChange={(e) => setFormData(prev => ({ ...prev, deadlineCount: parseInt(e.target.value) || 0 }))}
              disabled={isReadOnly}
            />
          </div>
        </div>

        {/* Extension Settings */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label>Extension Allowed</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Whether this event type allows deadline extensions.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Switch
              checked={formData.extensionAllowed}
              onCheckedChange={(checked) => setFormData(prev => ({ 
                ...prev, 
                extensionAllowed: checked,
                maxExtensionCount: checked ? 1 : 0,
                extensionDays: checked ? 30 : 0
              }))}
              disabled={isReadOnly}
            />
          </div>
          
          {formData.extensionAllowed && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxExtensionCount">Max Extensions</Label>
                <Input
                  id="maxExtensionCount"
                  type="number"
                  min={1}
                  max={5}
                  value={formData.maxExtensionCount}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxExtensionCount: parseInt(e.target.value) || 0 }))}
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="extensionDays">Days per Extension</Label>
                <Input
                  id="extensionDays"
                  type="number"
                  min={1}
                  value={formData.extensionDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, extensionDays: parseInt(e.target.value) || 0 }))}
                  disabled={isReadOnly}
                />
              </div>
            </div>
          )}
        </div>

        {/* Legal Reference */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <Label htmlFor="legalReference">Legal Reference</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Section/Rule reference explaining why this deadline exists (shown in tooltips).</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            id="legalReference"
            value={formData.legalReference}
            onChange={(e) => setFormData(prev => ({ ...prev, legalReference: e.target.value }))}
            placeholder="e.g., Section 73(10) of CGST Act"
            disabled={isReadOnly}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Additional details about this event type..."
            rows={3}
            disabled={isReadOnly}
          />
        </div>

        {/* Active Status */}
        <div className="flex items-center justify-between">
          <Label>Active</Label>
          <Switch
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
            disabled={isReadOnly}
          />
        </div>
      </div>
    </ModalLayout>
  );
};
