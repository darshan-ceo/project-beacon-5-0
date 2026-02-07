/**
 * ConvertToClientModal
 * Guided workflow for onboarding an inquiry as a client
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserCheck,
  Building2,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { leadConversionService } from '@/services/leadConversionService';
import { Lead } from '@/types/lead';
import { toast } from 'sonner';

interface ConvertToClientModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CLIENT_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'company', label: 'Company' },
  { value: 'proprietorship', label: 'Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'llp', label: 'LLP' },
  { value: 'trust', label: 'Trust' },
  { value: 'huf', label: 'HUF' },
];

export const ConvertToClientModal: React.FC<ConvertToClientModalProps> = ({
  lead,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  // Form state
  const [clientName, setClientName] = useState('');
  const [clientType, setClientType] = useState('individual');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [createCase, setCreateCase] = useState(false);
  const [caseTitle, setCaseTitle] = useState('');
  const [caseDescription, setCaseDescription] = useState('');

  // Check eligibility
  const { data: eligibility, isLoading: checkingEligibility } = useQuery({
    queryKey: ['lead-eligibility', lead?.id],
    queryFn: () => leadConversionService.checkConversionEligibility(lead!.id),
    enabled: !!lead?.id && isOpen,
  });

  // Get conversion preview
  const { data: preview } = useQuery({
    queryKey: ['lead-preview', lead?.id],
    queryFn: () => leadConversionService.getConversionPreview(lead!.id),
    enabled: !!lead?.id && isOpen && eligibility?.eligible,
  });

  // Pre-fill form when preview is available
  useEffect(() => {
    if (preview?.success && preview.data) {
      setClientName(preview.data.suggestedClientName || '');
      setEmail(preview.data.suggestedEmail || '');
      setPhone(preview.data.suggestedPhone || '');
    }
  }, [preview]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setClientName('');
      setClientType('individual');
      setGstin('');
      setPan('');
      setEmail('');
      setPhone('');
      setCreateCase(false);
      setCaseTitle('');
      setCaseDescription('');
    }
  }, [isOpen]);

  // Conversion mutation
  const convertMutation = useMutation({
    mutationFn: () =>
      leadConversionService.convertToClient(lead!.id, {
        clientData: {
          display_name: clientName,
          type: clientType,
          gstin: gstin || undefined,
          pan: pan || undefined,
          email: email || undefined,
          phone: phone || undefined,
        },
        createFirstCase: createCase,
        caseData: createCase
          ? {
              title: caseTitle,
              description: caseDescription || undefined,
            }
          : undefined,
      }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Inquiry onboarded as client successfully!');
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['lead-pipeline-stats'] });
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        onSuccess();
      } else {
        toast.error(result.error || 'Failed to onboard inquiry');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to onboard inquiry');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim()) {
      toast.error('Client name is required');
      return;
    }

    if (createCase && !caseTitle.trim()) {
      toast.error('Case title is required when creating a case');
      return;
    }

    convertMutation.mutate();
  };

  if (!lead) return null;

  const isNotEligible = eligibility && !eligibility.eligible;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-green-600" />
            Onboard as Client
          </DialogTitle>
        </DialogHeader>

        {checkingEligibility ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Checking eligibility...</span>
          </div>
        ) : isNotEligible ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This inquiry cannot be converted: {eligibility?.reason}
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Inquiry Info Summary */}
            <Card className="bg-muted/50">
              <CardContent className="py-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Onboarding:</span>
                  <span className="font-medium">{lead.name}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-green-600 font-medium">New Client</span>
                </div>
              </CardContent>
            </Card>

            {/* Client Details Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="h-4 w-4 text-primary" />
                Client Details
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="clientName">
                    Client Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Client display name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientType">Client Type</Label>
                  <Select value={clientType} onValueChange={setClientType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CLIENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pan">PAN</Label>
                  <Input
                    id="pan"
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gstin">GSTIN</Label>
                  <Input
                    id="gstin"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="22AAAAA0000A1Z5"
                    maxLength={15}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@example.com"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
            </div>

            {/* Create First Case Section */}
            <div className="space-y-4 pt-2 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="createCase"
                  checked={createCase}
                  onCheckedChange={(checked) => setCreateCase(checked === true)}
                />
                <Label htmlFor="createCase" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="h-4 w-4 text-primary" />
                  Create first case for this client
                </Label>
              </div>

              {createCase && (
                <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <Label htmlFor="caseTitle">
                      Case Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="caseTitle"
                      value={caseTitle}
                      onChange={(e) => setCaseTitle(e.target.value)}
                      placeholder="e.g., GST Assessment 2024-25"
                      required={createCase}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="caseDescription">Description (optional)</Label>
                    <Textarea
                      id="caseDescription"
                      value={caseDescription}
                      onChange={(e) => setCaseDescription(e.target.value)}
                      placeholder="Brief description of the case..."
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            <Card className="bg-green-50 border-green-200">
              <CardContent className="py-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-green-800">Ready to onboard</p>
                    <ul className="text-green-700 mt-1 space-y-0.5">
                      <li>• Create client: {clientName || lead.name}</li>
                      <li>• Link contact: {lead.name}</li>
                      <li>• Mark inquiry as Converted</li>
                      {createCase && <li>• Create case: {caseTitle}</li>}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={convertMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {convertMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Onboarding...
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Onboard as Client
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ConvertToClientModal;
