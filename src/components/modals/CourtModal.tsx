import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Court, useAppState } from '@/contexts/AppStateContext';

interface CourtModalProps {
  isOpen: boolean;
  onClose: () => void;
  court?: Court | null;
  mode: 'create' | 'edit' | 'view';
}

const workingDayOptions = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export const CourtModal: React.FC<CourtModalProps> = ({ isOpen, onClose, court: courtData, mode }) => {
  const { state, dispatch } = useAppState();
  const [formData, setFormData] = useState<{
    name: string;
    type: 'Supreme Court' | 'High Court' | 'District Court' | 'Tribunal' | 'Commission';
    jurisdiction: string;
    address: string;
    establishedYear: number;
    totalJudges: number;
    digitalFiling: boolean;
    workingDays: string[];
  }>({
    name: '',
    type: 'District Court',
    jurisdiction: '',
    address: '',
    establishedYear: new Date().getFullYear(),
    totalJudges: 1,
    digitalFiling: false,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  });

  useEffect(() => {
    if (courtData && (mode === 'edit' || mode === 'view')) {
      setFormData({
        name: courtData.name,
        type: courtData.type,
        jurisdiction: courtData.jurisdiction,
        address: courtData.address,
        establishedYear: courtData.establishedYear,
        totalJudges: courtData.totalJudges,
        digitalFiling: courtData.digitalFiling,
        workingDays: courtData.workingDays
      });
    } else if (mode === 'create') {
      setFormData({
        name: '',
        type: 'District Court',
        jurisdiction: '',
        address: '',
        establishedYear: new Date().getFullYear(),
        totalJudges: 1,
        digitalFiling: false,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      });
    }
  }, [courtData, mode]);

  const handleWorkingDayChange = (day: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      workingDays: checked 
        ? [...prev.workingDays, day]
        : prev.workingDays.filter(d => d !== day)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'create') {
      const newCourt: Court = {
        id: Date.now().toString(),
        name: formData.name,
        type: formData.type,
        jurisdiction: formData.jurisdiction,
        address: formData.address,
        establishedYear: formData.establishedYear,
        totalJudges: formData.totalJudges,
        activeCases: 0,
        avgHearingTime: '30 mins',
        digitalFiling: formData.digitalFiling,
        workingDays: formData.workingDays
      };

      dispatch({ type: 'ADD_COURT', payload: newCourt });
      toast({
        title: "Court Added",
        description: `Court "${formData.name}" has been added successfully.`,
      });
    } else if (mode === 'edit' && courtData) {
      const updatedCourt: Court = {
        ...courtData,
        name: formData.name,
        type: formData.type,
        jurisdiction: formData.jurisdiction,
        address: formData.address,
        establishedYear: formData.establishedYear,
        totalJudges: formData.totalJudges,
        digitalFiling: formData.digitalFiling,
        workingDays: formData.workingDays
      };

      dispatch({ type: 'UPDATE_COURT', payload: updatedCourt });
      toast({
        title: "Court Updated",
        description: `Court "${formData.name}" has been updated successfully.`,
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (courtData) {
      dispatch({ type: 'DELETE_COURT', payload: courtData.id });
      toast({
        title: "Court Deleted",
        description: `Court "${courtData.name}" has been deleted.`,
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' && 'Add New Court'}
            {mode === 'edit' && 'Edit Court'}
            {mode === 'view' && 'Court Details'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Court Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              disabled={mode === 'view'}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Court Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}
                disabled={mode === 'view'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Supreme Court">Supreme Court</SelectItem>
                  <SelectItem value="High Court">High Court</SelectItem>
                  <SelectItem value="District Court">District Court</SelectItem>
                  <SelectItem value="Tribunal">Tribunal</SelectItem>
                  <SelectItem value="Commission">Commission</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="jurisdiction">Jurisdiction</Label>
              <Input
                id="jurisdiction"
                value={formData.jurisdiction}
                onChange={(e) => setFormData(prev => ({ ...prev, jurisdiction: e.target.value }))}
                disabled={mode === 'view'}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              disabled={mode === 'view'}
              rows={2}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="establishedYear">Established Year</Label>
              <Input
                id="establishedYear"
                type="number"
                value={formData.establishedYear}
                onChange={(e) => setFormData(prev => ({ ...prev, establishedYear: parseInt(e.target.value) || new Date().getFullYear() }))}
                disabled={mode === 'view'}
                min="1800"
                max={new Date().getFullYear()}
                required
              />
            </div>
            <div>
              <Label htmlFor="totalJudges">Total Judges</Label>
              <Input
                id="totalJudges"
                type="number"
                value={formData.totalJudges}
                onChange={(e) => setFormData(prev => ({ ...prev, totalJudges: parseInt(e.target.value) || 1 }))}
                disabled={mode === 'view'}
                min="1"
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="digitalFiling"
              checked={formData.digitalFiling}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, digitalFiling: checked }))}
              disabled={mode === 'view'}
            />
            <Label htmlFor="digitalFiling">Digital Filing Available</Label>
          </div>

          <div>
            <Label>Working Days</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {workingDayOptions.map((day) => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox
                    id={day}
                    checked={formData.workingDays.includes(day)}
                    onCheckedChange={(checked) => handleWorkingDayChange(day, checked as boolean)}
                    disabled={mode === 'view'}
                  />
                  <Label htmlFor={day} className="text-sm">{day.substring(0, 3)}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {mode === 'view' ? 'Close' : 'Cancel'}
            </Button>
            {mode === 'edit' && (
              <Button type="button" variant="destructive" onClick={handleDelete}>
                Delete Court
              </Button>
            )}
            {mode !== 'view' && (
              <Button type="submit">
                {mode === 'create' ? 'Add Court' : 'Update Court'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};