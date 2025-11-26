import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, Check, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { hearingsService } from '@/services/hearingsService';
import { useAppState } from '@/contexts/AppStateContext';
import { cn } from '@/lib/utils';

interface QuickEditHearingProps {
  hearingId: string;
  currentDate: string;
  currentTime: string;
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export const QuickEditHearing: React.FC<QuickEditHearingProps> = ({
  hearingId,
  currentDate,
  currentTime,
  trigger,
  onSuccess
}) => {
  const { state, dispatch } = useAppState();
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date(currentDate));
  const [time, setTime] = useState(currentTime);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    setIsSubmitting(true);
    
    try {
      // Validate date is not in the past
      const selectedLocalDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const todayLocalDate = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
      
      if (selectedLocalDate < todayLocalDate) {
        toast({
          title: "Validation Error",
          description: "Hearing date cannot be in the past",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Normalize and validate time format
      let normalizedTime = time.trim();
      const time12hMatch = normalizedTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (time12hMatch) {
        let hours = parseInt(time12hMatch[1]);
        const minutes = time12hMatch[2];
        const meridiem = time12hMatch[3].toUpperCase();
        if (meridiem === 'PM' && hours !== 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;
        normalizedTime = `${hours.toString().padStart(2, '0')}:${minutes}`;
      }
      
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(normalizedTime)) {
        toast({
          title: "Validation Error",
          description: "Time must be in valid format (HH:mm or HH:mm AM/PM)",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Calculate end time (1 hour later)
      const [hours, minutes] = normalizedTime.split(':').map(Number);
      const endDate = new Date();
      endDate.setHours(hours + 1, minutes);
      const endTime = endDate.toTimeString().slice(0, 5);

      // Get current hearing to include case_id in update
      const currentHearing = state.hearings.find(h => h.id === hearingId);
      if (!currentHearing) {
        toast({
          title: "Error",
          description: "Hearing not found",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      await hearingsService.updateHearing(
        hearingId,
        {
          case_id: currentHearing.case_id || currentHearing.caseId,
          date: format(date, 'yyyy-MM-dd'),
          start_time: normalizedTime,
          end_time: endTime
        },
        dispatch
      );

      toast({
        title: "Hearing Updated",
        description: "Time and date updated successfully",
      });

      setIsOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating hearing:', error);
      // Error toast is handled by the service
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setDate(new Date(currentDate));
    setTime(currentTime);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Quick Edit Hearing</h4>
            <p className="text-xs text-muted-foreground">
              Adjust date and time without opening the full form
            </p>
          </div>

          <div className="space-y-3">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label className="text-xs">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Input */}
            <div className="space-y-2">
              <Label htmlFor="quick-edit-time" className="text-xs">Time</Label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="quick-edit-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-3 w-3" />
                  Save
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              <X className="mr-2 h-3 w-3" />
              Cancel
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
