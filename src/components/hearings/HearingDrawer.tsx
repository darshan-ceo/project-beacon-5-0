import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/contexts/AppStateContext';
import { featureFlagService } from '@/services/featureFlagService';
import { hearingService } from '@/mock/services';
import { Hearing, HearingFormData, HearingConflict } from '@/types/hearings';
import { format } from 'date-fns';
import { CalendarDays, Clock, MapPin, Gavel, FileText, Users, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { toast } from '@/hooks/use-toast';

interface HearingDrawerProps {
  hearing?: Hearing;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  prefillData?: Partial<HearingFormData>;
  mode: 'create' | 'edit' | 'view';
}

export const HearingDrawer: React.FC<HearingDrawerProps> = ({
  hearing,
  isOpen,
  onOpenChange,
  prefillData,
  mode
}) => {
  const navigate = useNavigate();
  const { state, dispatch } = useAppState();
  const [formData, setFormData] = useState<HearingFormData>({
    case_id: '',
    date: '',
    start_time: '',
    end_time: '',
    timezone: 'Asia/Kolkata',
    court_id: '',
    judge_ids: [],
    purpose: 'mention',
    ...prefillData
  });
  
  const [conflicts, setConflicts] = useState<HearingConflict[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [outcome, setOutcome] = useState('');
  const [outcomeText, setOutcomeText] = useState('');
  const [nextHearingDate, setNextHearingDate] = useState('');
  const [orderFile, setOrderFile] = useState<File | null>(null);

  const isEnabled = featureFlagService.isEnabled('hearings_module_v1');

  // Initialize form data
  useEffect(() => {
    if (hearing) {
      setFormData({
        case_id: hearing.case_id,
        stage_instance_id: hearing.stage_instance_id,
        cycle_no: hearing.cycle_no,
        date: hearing.date,
        start_time: hearing.start_time,
        end_time: hearing.end_time,
        timezone: hearing.timezone,
        court_id: hearing.court_id,
        courtroom: hearing.courtroom,
        judge_ids: hearing.judge_ids,
        purpose: hearing.purpose,
        notes: hearing.notes,
        attendance: hearing.attendance
      });
      
      if (hearing.outcome) setOutcome(hearing.outcome);
      if (hearing.outcome_text) setOutcomeText(hearing.outcome_text);
      if (hearing.next_hearing_date) setNextHearingDate(hearing.next_hearing_date);
    }
  }, [hearing]);

  // Check for conflicts when key data changes
  useEffect(() => {
    if (formData.date && formData.start_time && formData.judge_ids.length > 0) {
      checkConflicts();
    }
  }, [formData.date, formData.start_time, formData.judge_ids]);

  const checkConflicts = async () => {
    try {
      // Mock conflict check - in real implementation would call hearingService
      const conflicts: HearingConflict[] = [];
      setConflicts(conflicts);
    } catch (error) {
      console.error('Failed to check conflicts:', error);
    }
  };

  const handleSubmit = async () => {
    if (!isEnabled) return;
    
    setIsLoading(true);
    try {
      if (mode === 'create') {
        await hearingService.create({
          ...formData,
          created_by: 'current-user'
        });
        toast({ title: 'Success', description: 'Hearing scheduled successfully.' });
      } else if (mode === 'edit' && hearing) {
        await hearingService.update(hearing.id, formData);
        toast({ title: 'Success', description: 'Hearing updated successfully.' });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save hearing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordOutcome = async () => {
    if (!hearing || !outcome) return;
    
    setIsLoading(true);
    try {
      // Mock outcomes recording - would call hearingService in real implementation
      toast({ title: 'Success', description: 'Hearing outcome recorded successfully.' });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to record outcome:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadOrder = async () => {
    if (!hearing || !orderFile) return;
    
    setIsLoading(true);
    try {
      // Mock upload - would call hearingService in real implementation
      setOrderFile(null);
    } catch (error) {
      console.error('Failed to upload order:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenStageWorkspace = () => {
    if (!hearing?.stage_instance_id) return;
    navigate(`/cases?caseId=${hearing.case_id}&tab=lifecycle&stageId=${hearing.stage_instance_id}`);
  };

  const handleSendNotifications = async () => {
    if (!hearing) return;
    
    setIsLoading(true);
    try {
      // Mock notifications - would call hearingService in real implementation  
      toast({ 
        title: 'Success', 
        description: 'Notifications sent successfully.',
      });
    } catch (error) {
      console.error('Failed to send notifications:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to send notifications. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSelectedCase = () => {
    return state.cases.find(c => c.id === formData.case_id);
  };

  const getSelectedCourt = () => {
    return state.courts.find(c => c.id === formData.court_id);
  };

  const getSelectedJudges = () => {
    return state.judges.filter(j => formData.judge_ids.includes(j.id));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'concluded': return 'bg-green-100 text-green-800';
      case 'adjourned': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isEnabled) {
    return null;
  }

  const selectedCase = getSelectedCase();
  const selectedCourt = getSelectedCourt();
  const selectedJudges = getSelectedJudges();

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-4xl mx-auto">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="text-xl font-semibold">
                {mode === 'create' ? 'Schedule Hearing' : mode === 'edit' ? 'Edit Hearing' : 'Hearing Details'}
              </DrawerTitle>
              {selectedCase && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-muted-foreground">{selectedCase.caseNumber}</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="text-sm font-medium">{selectedCase.title}</span>
                  {hearing?.stage_instance_id && (
                    <>
                      <Separator orientation="vertical" className="h-4" />
                      <Badge variant="outline">
                        {selectedCase.currentStage} (C{hearing.cycle_no || 1})
                      </Badge>
                    </>
                  )}
                  {hearing && (
                    <>
                      <Separator orientation="vertical" className="h-4" />
                      <Badge className={getStatusColor(hearing.status)}>
                        {hearing.status.toUpperCase()}
                      </Badge>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </DrawerHeader>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Conflicts Alert */}
          {conflicts.length > 0 && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <span className="font-medium">Conflicts Detected:</span>
                <ul className="mt-1 ml-4 list-disc">
                  {conflicts.map((conflict, index) => (
                    <li key={index} className="text-sm">{conflict.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Hearing Details Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Hearing Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mode !== 'view' ? (
                  <>
                    <div>
                      <Label htmlFor="case_id">Case</Label>
                      <Select
                        value={formData.case_id}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, case_id: value }))}
                        disabled={mode === 'edit'}
                        data-tour="hearing-case-selector"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select case" />
                        </SelectTrigger>
                        <SelectContent>
                          {state.cases.map(case_ => (
                            <SelectItem key={case_.id} value={case_.id}>
                              {case_.caseNumber} - {case_.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                          data-tour="hearing-datetime"
                        />
                      </div>
                      <div>
                        <Label htmlFor="start_time">Time</Label>
                        <Input
                          id="start_time"
                          type="time"
                          value={formData.start_time}
                          onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="purpose">Purpose</Label>
                      <Select
                        value={formData.purpose}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, purpose: value as any }))}
                        data-tour="hearing-type"
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PH">Pre-hearing</SelectItem>
                          <SelectItem value="mention">Mention</SelectItem>
                          <SelectItem value="final">Final hearing</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Date:</span>
                      <span className="font-medium">
                        {hearing?.date ? format(new Date(hearing.date), 'PPP') : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Time:</span>
                      <span className="font-medium">{hearing?.start_time || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Purpose:</span>
                      <Badge variant="outline">{hearing?.purpose || 'N/A'}</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Court & Judges */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gavel className="h-5 w-5" />
                  Court & Judges
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mode !== 'view' ? (
                  <>
                    <div>
                      <Label htmlFor="court_id">Court</Label>
                      <Select
                        value={formData.court_id}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, court_id: value }))}
                        data-tour="hearing-court"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select court" />
                        </SelectTrigger>
                        <SelectContent>
                          {state.courts.map(court => (
                            <SelectItem key={court.id} value={court.id}>
                              {court.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="courtroom">Courtroom</Label>
                      <Input
                        id="courtroom"
                        value={formData.courtroom || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, courtroom: e.target.value }))}
                        placeholder="e.g., Court Room 3"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Court:</span>
                      <span className="font-medium">{selectedCourt?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Courtroom:</span>
                      <span className="font-medium">{hearing?.courtroom || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Judges:</span>
                      <div className="text-right">
                        {selectedJudges.map(judge => (
                          <div key={judge.id} className="font-medium">{judge.name}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notes & Comments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mode !== 'view' ? (
                <Textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add hearing notes, agenda, or special instructions..."
                  rows={3}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {hearing?.notes || 'No notes added.'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Actions - Only for concluded hearings */}
          {hearing && hearing.status === 'concluded' && (
            <Card>
              <CardHeader>
                <CardTitle>Hearing Outcome</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="outcome">Outcome</Label>
                    <Select value={outcome} onValueChange={setOutcome}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select outcome" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Adjourned">Adjourned</SelectItem>
                        <SelectItem value="Part-heard">Part-heard</SelectItem>
                        <SelectItem value="Allowed">Allowed</SelectItem>
                        <SelectItem value="Dismissed">Dismissed</SelectItem>
                        <SelectItem value="Withdrawn">Withdrawn</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(outcome === 'Adjourned' || outcome === 'Part-heard') && (
                    <div>
                      <Label htmlFor="next_hearing_date">Next Hearing Date</Label>
                      <Input
                        id="next_hearing_date"
                        type="date"
                        value={nextHearingDate}
                        onChange={(e) => setNextHearingDate(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="outcome_text">Outcome Details</Label>
                  <Textarea
                    id="outcome_text"
                    value={outcomeText}
                    onChange={(e) => setOutcomeText(e.target.value)}
                    placeholder="Describe the outcome, orders passed, next steps..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="order_file">Upload Order (PDF)</Label>
                  <Input
                    id="order_file"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setOrderFile(e.target.files?.[0] || null)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Links */}
          {hearing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Quick Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/cases?caseId=${hearing.case_id}`}>
                      Open Case
                    </a>
                  </Button>
                  {hearing.stage_instance_id && (
                    <Button variant="outline" size="sm" onClick={handleOpenStageWorkspace}>
                      Open Stage Workspace
                    </Button>
                  )}
                  {hearing.order_file_id && (
                    <Button variant="outline" size="sm">
                      View Order
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DrawerFooter className="border-t">
          <div className="flex justify-between">
            <div className="flex gap-2">
              {hearing && mode === 'view' && hearing.status === 'scheduled' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleRecordOutcome()}
                    disabled={isLoading || !outcome}
                  >
                    Record Outcome
                  </Button>
                  <Button variant="outline" onClick={handleSendNotifications} disabled={isLoading}>
                    Send Notifications
                  </Button>
                </>
              )}
            </div>
            
            <div className="flex gap-2">
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
              
              {(mode === 'create' || mode === 'edit') && (
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading || !formData.case_id || !formData.date}
                >
                  {isLoading ? 'Saving...' : mode === 'create' ? 'Schedule Hearing' : 'Update Hearing'}
                </Button>
              )}
              
              {orderFile && (
                <Button
                  onClick={handleUploadOrder}
                  disabled={isLoading}
                >
                  Upload Order
                </Button>
              )}
            </div>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};