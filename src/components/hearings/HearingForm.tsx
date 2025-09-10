import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { 
  CalendarIcon, 
  MapPin, 
  Gavel, 
  Users, 
  AlertTriangle, 
  ExternalLink,
  Clock,
  FileText,
  Bell,
  Download,
  Copy,
  Plus
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { useAppState } from '@/contexts/AppStateContext';
import { useRelationships } from '@/hooks/useRelationships';
import { useContextualForms } from '@/hooks/useContextualForms';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { hearingsService } from '@/services/hearingsService';
import { conflictDetector } from '@/utils/conflictDetector';
import { Hearing, HearingFormData, HearingConflict } from '@/types/hearings';

// Form validation schema
const hearingFormSchema = z.object({
  case_id: z.string().min(1, "Case is required"),
  date: z.date({
    required_error: "Date is required",
  }),
  start_time: z.string().min(1, "Time is required"),
  end_time: z.string().optional(),
  purpose: z.enum(['mention', 'final', 'interim', 'compliance', 'admission', 'stay', 'other', 'PH']),
  stage_note: z.string().optional(),
  court_id: z.string().min(1, "Court is required"),
  courtroom: z.string().optional(),
  judge_ids: z.array(z.string()).min(1, "At least one judge is required"),
  client_contact_ids: z.array(z.string()).optional(),
  internal_counsel_ids: z.array(z.string()).optional(),
  reminder: z.object({
    when: z.enum(['1d', '3d', '7d', 'custom']),
    minutes: z.number().optional(),
    channels: z.array(z.enum(['inapp', 'email', 'whatsapp'])),
  }).optional(),
  attachment_ids: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

type HearingFormValues = z.infer<typeof hearingFormSchema>;

interface HearingFormProps {
  hearing?: Hearing;
  mode: 'create' | 'edit' | 'view';
  prefillData?: Partial<HearingFormData>;
  onSubmit: (data: HearingFormValues) => Promise<void>;
  onCancel: () => void;
  className?: string;
}

export const HearingForm: React.FC<HearingFormProps> = ({
  hearing,
  mode,
  prefillData,
  onSubmit,
  onCancel,
  className
}) => {
  const { state } = useAppState();
  const { validateJudgeCourt, getCaseWithClient } = useRelationships();
  const { 
    context, 
    updateContext, 
    getAvailableCases, 
    getAvailableCourts, 
    getAvailableJudges,
    getContextDetails 
  } = useContextualForms({
    caseId: prefillData?.case_id,
  });

  const [conflicts, setConflicts] = useState<HearingConflict[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<HearingFormValues>({
    resolver: zodResolver(hearingFormSchema),
    defaultValues: {
      case_id: prefillData?.case_id || hearing?.case_id || '',
      date: hearing?.date ? new Date(hearing.date) : new Date(),
      start_time: hearing?.start_time || '10:00',
      end_time: hearing?.end_time || '',
      purpose: hearing?.purpose || 'mention',
      stage_note: '',
      court_id: hearing?.court_id || '',
      courtroom: hearing?.courtroom || '',
      judge_ids: hearing?.judge_ids || [],
      client_contact_ids: [],
      internal_counsel_ids: [],
      reminder: {
        when: '1d',
        channels: ['inapp', 'email'],
      },
      attachment_ids: [],
      notes: hearing?.notes || '',
    },
  });

  const watchedValues = form.watch(['case_id', 'date', 'start_time', 'judge_ids', 'court_id']);

  // Check for conflicts when key data changes
  useEffect(() => {
    const [caseId, date, startTime, judgeIds, courtId] = watchedValues;
    if (date && startTime && judgeIds.length > 0) {
      checkConflicts(caseId, date, startTime, judgeIds, courtId);
    }
  }, [watchedValues]);

  const checkConflicts = async (
    caseId: string, 
    date: Date, 
    startTime: string, 
    judgeIds: string[], 
    courtId: string
  ) => {
    try {
      const conflicts = await conflictDetector.checkConflicts({
        case_id: caseId,
        date: format(date, 'yyyy-MM-dd'),
        start_time: startTime,
        judge_ids: judgeIds,
        court_id: courtId,
      });
      setConflicts(conflicts);
    } catch (error) {
      console.error('Failed to check conflicts:', error);
    }
  };

  const handleFormSubmit = async (data: HearingFormValues) => {
    setIsSubmitting(true);
    try {
      // Validate relationships
      const judgeCourtValidation = validateJudgeCourt(data.judge_ids[0], data.court_id);
      if (!judgeCourtValidation.isValid) {
        toast({
          title: "Validation Error",
          description: judgeCourtValidation.errors.join(', '),
          variant: "destructive"
        });
        return;
      }

      const caseWithClient = getCaseWithClient(data.case_id);
      if (!caseWithClient?.case || !caseWithClient?.client) {
        toast({
          title: "Error",
          description: "Could not find case or client information.",
          variant: "destructive"
        });
        return;
      }

      // Calculate end time if not provided
      if (!data.end_time && data.start_time) {
        const [hours, minutes] = data.start_time.split(':').map(Number);
        const endDate = new Date();
        endDate.setHours(hours + 1, minutes);
        data.end_time = endDate.toTimeString().slice(0, 5);
      }

      await onSubmit(data);
    } catch (error) {
      console.error('Error submitting hearing:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextDate = () => {
    if (!hearing) return;
    
    // Pre-fill form with current hearing data but clear the date
    form.reset({
      ...form.getValues(),
      date: new Date(),
      start_time: '10:00',
      notes: `Next date for ${hearing.case_id}`,
    });
  };

  const generateCalendarLink = () => {
    const values = form.getValues();
    if (!values.date || !values.start_time) return;

    const startDateTime = new Date(values.date);
    const [hours, minutes] = values.start_time.split(':').map(Number);
    startDateTime.setHours(hours, minutes);
    
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(hours + 1, minutes);

    const selectedCase = state.cases.find(c => c.id === values.case_id);
    const selectedCourt = state.courts.find(c => c.id === values.court_id);
    
    const title = encodeURIComponent(`Hearing: ${selectedCase?.caseNumber || 'Unknown Case'}`);
    const details = encodeURIComponent(`Court: ${selectedCourt?.name || 'Unknown Court'}\nPurpose: ${values.purpose}`);
    const location = encodeURIComponent(selectedCourt?.address?.toString() || selectedCourt?.name || '');
    
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDateTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${details}&location=${location}`;
    
    navigator.clipboard.writeText(googleUrl);
    toast({
      title: "Calendar Link Copied",
      description: "Google Calendar link copied to clipboard.",
    });
  };

  const downloadICS = () => {
    const values = form.getValues();
    if (!values.date || !values.start_time) return;

    const startDateTime = new Date(values.date);
    const [hours, minutes] = values.start_time.split(':').map(Number);
    startDateTime.setHours(hours, minutes);
    
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(hours + 1, minutes);

    const selectedCase = state.cases.find(c => c.id === values.case_id);
    const selectedCourt = state.courts.find(c => c.id === values.court_id);
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Beacon Essential//Hearing Scheduler//EN
BEGIN:VEVENT
UID:${Date.now()}@beacon-essential.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${startDateTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTEND:${endDateTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:Hearing: ${selectedCase?.caseNumber || 'Unknown Case'}
DESCRIPTION:Court: ${selectedCourt?.name || 'Unknown Court'}\\nPurpose: ${values.purpose}
LOCATION:${selectedCourt?.address?.toString() || selectedCourt?.name || ''}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hearing-${selectedCase?.caseNumber || 'unknown'}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedCase = state.cases.find(c => c.id === form.watch('case_id'));
  const selectedClient = selectedCase ? state.clients.find(c => c.id === selectedCase.clientId) : null;
  const selectedCourt = state.courts.find(c => c.id === form.watch('court_id'));
  const selectedJudges = state.judges.filter(j => form.watch('judge_ids').includes(j.id));

  return (
    <div className={cn("space-y-6", className)}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column - Basic Details */}
            <div className="space-y-6">
              
              {/* Hearing Details Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Hearing Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  <FormField
                    control={form.control}
                    name="case_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Case</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          disabled={mode === 'view' || !!prefillData?.case_id}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select case" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getAvailableCases().map(case_ => (
                              <SelectItem key={case_.id} value={case_.id}>
                                {case_.caseNumber} - {case_.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="purpose"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hearing Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="mention">Mention</SelectItem>
                              <SelectItem value="final">Final Hearing</SelectItem>
                              <SelectItem value="admission">Admission</SelectItem>
                              <SelectItem value="stay">Stay</SelectItem>
                              <SelectItem value="interim">Interim</SelectItem>
                              <SelectItem value="compliance">Compliance</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="stage_note"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purpose/Stage Note</FormLabel>
                          <FormControl>
                            <Input placeholder="Brief purpose" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date(new Date().setHours(0, 0, 0, 0))
                                }
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="start_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time (24hr)</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                </CardContent>
              </Card>

              {/* Court & Judges Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gavel className="h-5 w-5" />
                    Court & Judges
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  <FormField
                    control={form.control}
                    name="court_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Court</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Clear judge selection when court changes
                            form.setValue('judge_ids', []);
                          }} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select court" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getAvailableCourts().map(court => (
                              <SelectItem key={court.id} value={court.id}>
                                {court.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="judge_ids"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Judge</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange([value])}
                            defaultValue={field.value[0]}
                            disabled={!form.watch('court_id')}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select judge" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {getAvailableJudges(form.watch('court_id')).map(judge => (
                                <SelectItem key={judge.id} value={judge.id}>
                                  {judge.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="courtroom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Courtroom/Bench</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Court Room 3" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                </CardContent>
              </Card>

              {/* Reminders & Notifications Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Reminders & Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  <FormField
                    control={form.control}
                    name="reminder.when"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reminder Time</FormLabel>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: '1d', label: '1 Day' },
                            { value: '3d', label: '3 Days' },
                            { value: '7d', label: '7 Days' },
                            { value: 'custom', label: 'Custom' },
                          ].map((option) => (
                            <Button
                              key={option.value}
                              type="button"
                              variant={field.value === option.value ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => field.onChange(option.value)}
                            >
                              {option.label}
                            </Button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reminder.channels"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notification Channels</FormLabel>
                        <div className="flex flex-wrap gap-4">
                          {[
                            { value: 'inapp', label: 'In-App' },
                            { value: 'email', label: 'Email' },
                            { value: 'whatsapp', label: 'WhatsApp' },
                          ].map((channel) => (
                            <div key={channel.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={channel.value}
                                checked={field.value?.includes(channel.value as any)}
                                onCheckedChange={(checked) => {
                                  const currentChannels = field.value || [];
                                  if (checked) {
                                    field.onChange([...currentChannels, channel.value]);
                                  } else {
                                    field.onChange(currentChannels.filter(c => c !== channel.value));
                                  }
                                }}
                              />
                              <Label htmlFor={channel.value}>{channel.label}</Label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </CardContent>
              </Card>

            </div>

            {/* Right Column - Info Panels */}
            <div className="space-y-6">

              {/* Judge Info Panel */}
              {selectedJudges.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Judge Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedJudges.map(judge => (
                      <div key={judge.id} className="space-y-2">
                        <div className="font-medium">{judge.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Court: {selectedCourt?.name || 'Unknown Court'}
                        </div>
                        {judge.designation && (
                          <div className="text-sm text-muted-foreground">
                            Designation: {judge.designation}
                          </div>
                        )}
                        {judge.phone && (
                          <div className="text-sm text-muted-foreground">
                            Phone: {judge.phone}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Court Info Panel */}
              {selectedCourt && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Court Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="font-medium">{selectedCourt.name}</div>
                    {selectedCourt.type && (
                      <Badge variant="outline">{selectedCourt.type}</Badge>
                    )}
                    {selectedCourt.address && (
                      <div className="text-sm text-muted-foreground">
                        {typeof selectedCourt.address === 'string' 
                          ? selectedCourt.address 
                          : JSON.stringify(selectedCourt.address)
                        }
                      </div>
                    )}
                    {selectedCourt.phone && (
                      <div className="text-sm text-muted-foreground">
                        Phone: {selectedCourt.phone}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Client Info Panel */}
              {selectedClient && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Client Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="font-medium">{selectedClient.name}</div>
                    {selectedClient.gstin && (
                      <div className="text-sm text-muted-foreground">
                        GSTIN: {selectedClient.gstin}
                      </div>
                    )}
                    {selectedClient.pan && (
                      <div className="text-sm text-muted-foreground">
                        PAN: {selectedClient.pan}
                      </div>
                    )}
                    {selectedClient.phone && (
                      <div className="text-sm text-muted-foreground">
                        Phone: {selectedClient.phone}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              {mode === 'create' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={generateCalendarLink}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Google Calendar Link
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={downloadICS}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download .ics File
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Next Date Action */}
              {mode === 'view' && hearing && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={handleNextDate}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Set Next Date
                    </Button>
                  </CardContent>
                </Card>
              )}

            </div>

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
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Add hearing notes, agenda, or special instructions..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              {mode === 'view' ? 'Close' : 'Cancel'}
            </Button>
            {mode !== 'view' && (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting 
                  ? (mode === 'create' ? 'Scheduling...' : 'Updating...')
                  : (mode === 'create' ? 'Schedule Hearing' : 'Update Hearing')
                }
              </Button>
            )}
          </div>

        </form>
      </Form>
    </div>
  );
};