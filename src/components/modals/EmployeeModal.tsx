import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/contexts/AppStateContext';
import { employeesService, Employee } from '@/services/employeesService';
import { featureFlagService } from '@/services/featureFlagService';
import { FieldTooltip } from '@/components/ui/field-tooltip';
import { AddressForm } from '@/components/ui/AddressForm';
import { roleMapperService } from '@/services/roleMapperService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Building, 
  MapPin,
  Plus,
  X,
  Eye,
  Users
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: Employee | null;
  mode: 'create' | 'edit' | 'view';
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  employee,
  mode
}) => {
  const { state, dispatch } = useAppState();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [specializationInput, setSpecializationInput] = useState('');
  const [isAddressMasterEnabled, setIsAddressMasterEnabled] = useState(false);

  const [formData, setFormData] = useState<Partial<Employee>>({
    full_name: '',
    role: 'Staff',
    email: '',
    mobile: '',
    status: 'Active',
    date_of_joining: '',
    notes: '',
    department: 'General',
    workloadCapacity: 40,
    specialization: [],
    managerId: undefined
  });

  // Check if address master is enabled
  useEffect(() => {
    setIsAddressMasterEnabled(featureFlagService.isEnabled('address_master_v1'));
  }, []);

  // Initialize form data based on mode and employee
  useEffect(() => {
    if (mode === 'create') {
      setFormData({
        full_name: '',
        role: 'Staff',
        email: '',
        mobile: '',
        status: 'Active',
        date_of_joining: '',
        notes: '',
        department: 'General',
        workloadCapacity: 40,
        specialization: [],
        managerId: undefined
      });
    } else if (employee) {
      setFormData({
        full_name: employee.full_name || '',
        role: employee.role || 'Staff',
        email: employee.email || '',
        mobile: employee.mobile || '',
        status: employee.status || 'Active',
        date_of_joining: employee.date_of_joining || '',
        notes: employee.notes || '',
        department: employee.department || 'General',
        workloadCapacity: employee.workloadCapacity || 40,
        specialization: employee.specialization || [],
        managerId: employee.managerId || undefined
      });
    }
  }, [mode, employee]);

  // Predefined department options
  const departments = [
    'General', 'Legal', 'Finance', 'Operations', 'HR', 'IT', 'Marketing', 'Sales'
  ];

  const handleInputChange = (field: keyof Employee, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddSpecialization = () => {
    if (specializationInput.trim() && !formData.specialization?.includes(specializationInput.trim())) {
      setFormData(prev => ({
        ...prev,
        specialization: [...(prev.specialization || []), specializationInput.trim()]
      }));
      setSpecializationInput('');
    }
  };

  const handleRemoveSpecialization = (spec: string) => {
    setFormData(prev => ({
      ...prev,
      specialization: prev.specialization?.filter(s => s !== spec) || []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.email || !formData.role) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (mode === 'create') {
        await employeesService.create(formData, dispatch, state.employees);
      } else if (mode === 'edit' && employee) {
        await employeesService.update(employee.id, formData, dispatch, state.employees);
      }
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReadOnly = mode === 'view';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-beacon-modal max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {mode === 'create' ? 'Add New Employee' : 
             mode === 'edit' ? 'Edit Employee' : 'Employee Details'}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <form id="employee-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <FieldTooltip formId="create-employee" fieldId="full_name" />
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="full_name"
                    value={formData.full_name || ''}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    placeholder="Enter full name"
                    required
                    disabled={isReadOnly}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="role">Role *</Label>
                  <FieldTooltip formId="create-employee" fieldId="role" />
                </div>
                <Select
                  value={formData.role || ''}
                  onValueChange={(value) => handleInputChange('role', value)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Partner">Partner</SelectItem>
                    <SelectItem value="CA">CA</SelectItem>
                    <SelectItem value="Advocate">Advocate</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Staff">Staff</SelectItem>
                    <SelectItem value="RM">RM</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* RBAC Permission Preview */}
                {formData.role && !isReadOnly && (
                  <Alert className="mt-2">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      <strong>RBAC Permissions:</strong> This role will grant <strong>{roleMapperService.getRBACRoleNamesForEmployee(formData.role).join(', ')}</strong> permissions.
                      <div className="mt-1 text-muted-foreground">
                        {roleMapperService.getRoleDescription(formData.role)}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="email">Email *</Label>
                  <FieldTooltip formId="create-employee" fieldId="email" />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter email address"
                    required
                    disabled={isReadOnly}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="mobile">Mobile</Label>
                  <FieldTooltip formId="create-employee" fieldId="mobile" />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="mobile"
                    type="tel"
                    value={formData.mobile || ''}
                    onChange={(e) => handleInputChange('mobile', e.target.value)}
                    placeholder="Enter mobile number"
                    disabled={isReadOnly}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Work Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Work Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="department">Department</Label>
                  <FieldTooltip formId="create-employee" fieldId="department" />
                </div>
                <Select
                  value={formData.department || ''}
                  onValueChange={(value) => handleInputChange('department', value)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_joining">Date of Joining</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="date_of_joining"
                    type="date"
                    value={formData.date_of_joining || ''}
                    onChange={(e) => handleInputChange('date_of_joining', e.target.value)}
                    disabled={isReadOnly}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="managerId">Reporting To</Label>
                <Select 
                  value={formData.managerId || 'none'} 
                  onValueChange={(value) => handleInputChange('managerId', value === 'none' ? undefined : value)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Manager</SelectItem>
                    {state.employees
                      .filter(emp => emp.status === 'Active' && emp.id !== employee?.id)
                      .sort((a, b) => a.full_name.localeCompare(b.full_name))
                      .map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name} ({emp.role})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="workloadCapacity">Workload Capacity (hours/week)</Label>
                <Input
                  id="workloadCapacity"
                  type="number"
                  min="1"
                  max="80"
                  value={formData.workloadCapacity}
                  onChange={(e) => handleInputChange('workloadCapacity', parseInt(e.target.value) || 40)}
                  disabled={isReadOnly}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.status === 'Active'}
                  onCheckedChange={(checked) => handleInputChange('status', checked ? 'Active' : 'Inactive')}
                  disabled={isReadOnly}
                />
                <span className="text-sm text-muted-foreground">
                  {formData.status === 'Active' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

              {/* Address Information - Remove for now */}
              {/* {isAddressMasterEnabled && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Address Information
                    </h3>
                    <AddressForm 
                      value={formData.address}
                      onChange={(address) => handleInputChange('address', address)}
                      disabled={isReadOnly}
                    />
                  </div>
                </>
              )} */}

          {/* Additional Information */}
          <Separator />
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Additional Information</h3>
            
            <div className="space-y-2">
              <Label>Specializations</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.specialization?.map((spec, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {spec}
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSpecialization(spec)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
              {!isReadOnly && (
                <div className="flex gap-2">
                  <Input
                    value={specializationInput}
                    onChange={(e) => setSpecializationInput(e.target.value)}
                    placeholder="Add specialization"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSpecialization())}
                  />
                  <Button type="button" onClick={handleAddSpecialization} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Additional notes..."
                rows={3}
                disabled={isReadOnly}
              />
            </div>
          </div>

          {/* Dependencies (View Mode Only) */}
          {mode === 'view' && employee && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Dependencies</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Cases</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {state.cases.filter(c => c.assignedToId === employee.id).length}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Tasks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {state.tasks.filter(t => t.assignedToId === employee.id).length}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Hearings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {state.hearings.filter(h => h.case_id === employee.id).length}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
          </form>
        </DialogBody>

        <DialogFooter className="gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            {mode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {mode !== 'view' && (
            <Button type="submit" form="employee-form" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (mode === 'create' ? 'Save Employee' : 'Update Employee')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};