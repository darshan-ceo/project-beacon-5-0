import React, { useState, useEffect } from 'react';
import { ModalLayout } from '@/components/ui/modal-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppState } from '@/contexts/AppStateContext';
import { employeesService, Employee } from '@/services/employeesService';
import { roleMapperService } from '@/services/roleMapperService';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { EmployeeDocumentUpload } from '@/components/employees/EmployeeDocumentUpload';
import {
  User,
  Phone,
  Briefcase,
  ShieldCheck,
  IndianRupee,
  KeyRound,
  Paperclip,
  History,
  Save,
  Info,
} from 'lucide-react';

interface EmployeeModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  employee?: Employee | null;
  mode: 'create' | 'edit' | 'view';
}

const designations = [
  'Sr. Partner',
  'Associate',
  'CA',
  'Advocate',
  'Paralegal',
  'Research Analyst',
  'Clerk',
  'Intern',
  'IT/Support',
];

const departments = ['Legal', 'Accounts', 'IT', 'Admin', 'Operations'];

const branches = ['Mumbai HO', 'Ahmedabad', 'Pune', 'Nagpur', 'Delhi'];

const states = [
  'Maharashtra',
  'Gujarat',
  'Rajasthan',
  'Delhi',
  'Karnataka',
  'Tamil Nadu',
  'West Bengal',
];

const areasOfPracticeOptions = [
  'Litigation',
  'Advisory',
  'Audit',
  'Compliance',
  'Representation',
];

const specializationsOptions = [
  'DRC Proceedings',
  'ASMT-10/DRC-01',
  'Appeals-CIT(A)',
  'ITAT',
  'High Court',
  'Supreme Court',
  'Refunds',
  'Registration/Cancel',
  'E-way Bill Issues',
  'Assessment & Scrutiny',
];

const moduleAccessOptions = [
  'Dashboard',
  'Case Management',
  'Hearings',
  'Task Mgmt',
  'DMS',
  'Reports',
  'Billing',
];

const taskCategoryOptions = [
  'Drafting',
  'Research',
  'Filing',
  'Hearing Prep',
  'Client Meeting',
];

export const EmployeeModalV2: React.FC<EmployeeModalV2Props> = ({
  isOpen,
  onClose,
  employee,
  mode,
}) => {
  const { state, dispatch } = useAppState();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [activeTab, setActiveTab] = useState('personal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<Employee>>({
    status: 'Active',
    billable: true,
    workloadCapacity: 40,
    dataScope: 'Team Cases',
    aiAccess: true,
    whatsappAccess: false,
    weeklyOff: 'Sunday',
    workShift: 'Regular',
    employmentType: 'Permanent',
  });

  const isReadOnly = mode === 'view';

  // Initialize form data
  useEffect(() => {
    if (employee && (mode === 'edit' || mode === 'view')) {
      setFormData(employee);
    } else if (mode === 'create') {
      // Auto-generate employee code
      const autoCode = `GSTE${(state.employees.length + 1).toString().padStart(4, '0')}`;
      setFormData((prev) => ({ ...prev, employeeCode: autoCode }));
    }
  }, [employee, mode, state.employees.length]);

  const handleInputChange = (field: keyof Employee, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleMultiSelectChange = (field: keyof Employee, value: string) => {
    const currentValues = (formData[field] as string[]) || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    setFormData((prev) => ({ ...prev, [field]: newValues }));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Basic validation
      if (!formData.full_name?.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Full name is required',
          variant: 'destructive',
        });
        return;
      }

      if (!formData.role) {
        toast({
          title: 'Validation Error',
          description: 'Role is required',
          variant: 'destructive',
        });
        return;
      }

      if (!formData.department) {
        toast({
          title: 'Validation Error',
          description: 'Department is required',
          variant: 'destructive',
        });
        return;
      }

      if (!formData.date_of_joining) {
        toast({
          title: 'Validation Error',
          description: 'Joining date is required',
          variant: 'destructive',
        });
        return;
      }

      if (!formData.officialEmail && !formData.email) {
        toast({
          title: 'Validation Error',
          description: 'Official email is required',
          variant: 'destructive',
        });
        return;
      }

      if (!formData.mobile) {
        toast({
          title: 'Validation Error',
          description: 'Mobile is required',
          variant: 'destructive',
        });
        return;
      }

      if (mode === 'create') {
        await employeesService.create(formData, dispatch, state.employees);
      } else if (mode === 'edit' && employee) {
        await employeesService.update(employee.id, formData, dispatch, state.employees);
      }

      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save employee',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const showConditionalField = (designation: string | undefined, allowedDesignations: string[]) => {
    return allowedDesignations.some((d) => designation?.includes(d));
  };

  // Get RBAC preview
  const rbacRoles = formData.role
    ? roleMapperService.getRBACRoleNamesForEmployee(formData.role)
    : [];

  // Get active employees for reporting
  const activeEmployees = state.employees.filter((emp) => emp.status === 'Active');

  // Dependencies count
  const dependencies = employee
    ? employeesService.checkDependencies(employee.id, state.cases, state.tasks, state.hearings)
    : [];

  const footer = !isReadOnly ? (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button onClick={handleSubmit} disabled={isSubmitting}>
        <Save className="h-4 w-4 mr-2" />
        {mode === 'create' ? 'Save Employee' : 'Update Employee'}
      </Button>
    </div>
  ) : (
    <div className="flex justify-end">
      <Button onClick={onClose}>Close</Button>
    </div>
  );

  const renderPersonalTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="employeeCode">
          Employee Code {!isReadOnly && <span className="text-destructive">*</span>}
        </Label>
        <div className="flex gap-2">
          <Input
            id="employeeCode"
            value={formData.employeeCode || ''}
            onChange={(e) => handleInputChange('employeeCode', e.target.value)}
            placeholder="e.g., GSTE001"
            disabled={isReadOnly}
          />
          {!isReadOnly && (
            <Badge variant="secondary" className="self-center">
              Auto
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Auto-generate if left blank</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fullName">
          Full Name {!isReadOnly && <span className="text-destructive">*</span>}
        </Label>
        <Input
          id="fullName"
          value={formData.full_name || ''}
          onChange={(e) => handleInputChange('full_name', e.target.value)}
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gender">Gender</Label>
        <Select
          value={formData.gender || ''}
          onValueChange={(value) => handleInputChange('gender', value)}
          disabled={isReadOnly}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Male">Male</SelectItem>
            <SelectItem value="Female">Female</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dob">Date of Birth</Label>
        <Input
          id="dob"
          type="date"
          value={formData.dob || ''}
          onChange={(e) => handleInputChange('dob', e.target.value)}
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pan">PAN</Label>
        <Input
          id="pan"
          value={formData.pan || ''}
          onChange={(e) => handleInputChange('pan', e.target.value.toUpperCase())}
          placeholder="AAAAA9999A"
          maxLength={10}
          disabled={isReadOnly}
        />
        <p className="text-xs text-muted-foreground">Format: AAAAA9999A</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="aadhaar">Aadhaar (optional)</Label>
        <Input
          id="aadhaar"
          value={formData.aadhaar || ''}
          onChange={(e) => {
            // Format as #### #### ####
            const value = e.target.value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
            handleInputChange('aadhaar', value);
          }}
          placeholder="1234 5678 9012"
          maxLength={14}
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bloodGroup">Blood Group</Label>
        <Select
          value={formData.bloodGroup || ''}
          onValueChange={(value) => handleInputChange('bloodGroup', value)}
          disabled={isReadOnly}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select blood group" />
          </SelectTrigger>
          <SelectContent>
            {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
              <SelectItem key={bg} value={bg}>
                {bg}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderContactTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="officialEmail">
          Official Email {!isReadOnly && <span className="text-destructive">*</span>}
        </Label>
        <Input
          id="officialEmail"
          type="email"
          value={formData.officialEmail || formData.email || ''}
          onChange={(e) => handleInputChange('officialEmail', e.target.value)}
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="personalEmail">Personal Email</Label>
        <Input
          id="personalEmail"
          type="email"
          value={formData.personalEmail || ''}
          onChange={(e) => handleInputChange('personalEmail', e.target.value)}
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mobile">
          Mobile {!isReadOnly && <span className="text-destructive">*</span>}
        </Label>
        <Input
          id="mobile"
          type="tel"
          value={formData.mobile || ''}
          onChange={(e) => handleInputChange('mobile', e.target.value)}
          placeholder="+91 9876543210"
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="alternateContact">Alternate Contact</Label>
        <Input
          id="alternateContact"
          type="tel"
          value={formData.alternateContact || ''}
          onChange={(e) => handleInputChange('alternateContact', e.target.value)}
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="currentAddress">Current Address</Label>
        <Textarea
          id="currentAddress"
          value={formData.currentAddress || ''}
          onChange={(e) => handleInputChange('currentAddress', e.target.value)}
          rows={2}
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="permanentAddress">Permanent Address</Label>
        <Textarea
          id="permanentAddress"
          value={formData.permanentAddress || ''}
          onChange={(e) => handleInputChange('permanentAddress', e.target.value)}
          rows={2}
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">City</Label>
        <Input
          id="city"
          value={formData.city || ''}
          onChange={(e) => handleInputChange('city', e.target.value)}
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="state">State</Label>
        <Select
          value={formData.state || ''}
          onValueChange={(value) => handleInputChange('state', value)}
          disabled={isReadOnly}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent>
            {states.map((state) => (
              <SelectItem key={state} value={state}>
                {state}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pincode">Pincode</Label>
        <Input
          id="pincode"
          value={formData.pincode || ''}
          onChange={(e) => handleInputChange('pincode', e.target.value)}
          maxLength={6}
          placeholder="400001"
          disabled={isReadOnly}
        />
      </div>
    </div>
  );

  const renderEmploymentTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="role">
          Role (RBAC) {!isReadOnly && <span className="text-destructive">*</span>}
        </Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Select
                  value={formData.role || ''}
                  onValueChange={(value) => handleInputChange('role', value as Employee['role'])}
                  disabled={isReadOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
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
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>RBAC role controls permissions across modules</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {rbacRoles.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {rbacRoles.map((role) => (
              <Badge key={role} variant="secondary" className="text-xs">
                {role}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="designation">Designation</Label>
        <Select
          value={formData.designation || ''}
          onValueChange={(value) => handleInputChange('designation', value)}
          disabled={isReadOnly}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select designation" />
          </SelectTrigger>
          <SelectContent>
            {designations.map((des) => (
              <SelectItem key={des} value={des}>
                {des}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="department">
          Department {!isReadOnly && <span className="text-destructive">*</span>}
        </Label>
        <Select
          value={formData.department || ''}
          onValueChange={(value) => handleInputChange('department', value)}
          disabled={isReadOnly}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reportingTo">Reporting To</Label>
        <Select
          value={formData.reportingTo || ''}
          onValueChange={(value) => handleInputChange('reportingTo', value)}
          disabled={isReadOnly}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select manager" />
          </SelectTrigger>
          <SelectContent>
            {activeEmployees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.full_name} ({emp.role})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="branch">Branch/Office</Label>
        <Select
          value={formData.branch || ''}
          onValueChange={(value) => handleInputChange('branch', value)}
          disabled={isReadOnly}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select branch" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((branch) => (
              <SelectItem key={branch} value={branch}>
                {branch}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="employmentType">Employment Type</Label>
        <Select
          value={formData.employmentType || ''}
          onValueChange={(value) =>
            handleInputChange('employmentType', value as Employee['employmentType'])
          }
          disabled={isReadOnly}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Permanent">Permanent</SelectItem>
            <SelectItem value="Contract">Contract</SelectItem>
            <SelectItem value="Intern">Intern</SelectItem>
            <SelectItem value="Consultant">Consultant</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="joiningDate">
          Date of Joining {!isReadOnly && <span className="text-destructive">*</span>}
        </Label>
        <Input
          id="joiningDate"
          type="date"
          value={formData.date_of_joining || ''}
          onChange={(e) => handleInputChange('date_of_joining', e.target.value)}
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmationDate">Confirmation Date</Label>
        <Input
          id="confirmationDate"
          type="date"
          value={formData.confirmationDate || ''}
          onChange={(e) => handleInputChange('confirmationDate', e.target.value)}
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="weeklyOff">Weekly Off</Label>
        <Select
          value={formData.weeklyOff || ''}
          onValueChange={(value) =>
            handleInputChange('weeklyOff', value as Employee['weeklyOff'])
          }
          disabled={isReadOnly}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select weekly off" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Sunday">Sunday</SelectItem>
            <SelectItem value="Alternate Saturday">Alternate Saturday</SelectItem>
            <SelectItem value="Custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="workShift">Work Shift</Label>
        <Select
          value={formData.workShift || ''}
          onValueChange={(value) =>
            handleInputChange('workShift', value as Employee['workShift'])
          }
          disabled={isReadOnly}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select shift" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Regular">Regular</SelectItem>
            <SelectItem value="Remote">Remote</SelectItem>
            <SelectItem value="Flexible">Flexible</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="workloadCapacity">Workload Capacity (hrs/week)</Label>
        <Input
          id="workloadCapacity"
          type="number"
          min={0}
          max={80}
          value={formData.workloadCapacity || 40}
          onChange={(e) => handleInputChange('workloadCapacity', parseInt(e.target.value))}
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={formData.status || ''}
          onValueChange={(value) =>
            handleInputChange('status', value as Employee['status'])
          }
          disabled={isReadOnly}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
            <SelectItem value="Suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="notes">Internal Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes || ''}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          rows={3}
          disabled={isReadOnly}
        />
      </div>
    </div>
  );

  const renderCredentialsTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {showConditionalField(formData.designation, ['Advocate', 'Sr. Partner']) && (
        <div className="space-y-2">
          <Label htmlFor="barCouncilNo">Bar Council Registration No.</Label>
          <Input
            id="barCouncilNo"
            value={formData.barCouncilNo || ''}
            onChange={(e) => handleInputChange('barCouncilNo', e.target.value)}
            placeholder="MAH/2010/12345"
            disabled={isReadOnly}
          />
        </div>
      )}

      {showConditionalField(formData.designation, ['CA', 'Sr. Partner', 'Associate']) && (
        <div className="space-y-2">
          <Label htmlFor="icaiNo">ICAI Membership No.</Label>
          <Input
            id="icaiNo"
            value={formData.icaiNo || ''}
            onChange={(e) => handleInputChange('icaiNo', e.target.value)}
            disabled={isReadOnly}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="gstPractitionerId">GST Practitioner ID</Label>
        <Input
          id="gstPractitionerId"
          value={formData.gstPractitionerId || ''}
          onChange={(e) => handleInputChange('gstPractitionerId', e.target.value)}
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="qualification">Qualification</Label>
        <Input
          id="qualification"
          value={formData.qualification || ''}
          onChange={(e) => handleInputChange('qualification', e.target.value)}
          placeholder="LL.B, CA, CS, LLM etc."
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="experienceYears">Experience (Years)</Label>
        <Input
          id="experienceYears"
          type="number"
          min={0}
          max={50}
          value={formData.experienceYears || ''}
          onChange={(e) => handleInputChange('experienceYears', parseInt(e.target.value))}
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label>Areas of Practice</Label>
        <div className="flex flex-wrap gap-2">
          {areasOfPracticeOptions.map((area) => (
            <Badge
              key={area}
              variant={(formData.areasOfPractice || []).includes(area) ? 'default' : 'outline'}
              className={`cursor-pointer ${isReadOnly ? 'cursor-not-allowed' : ''}`}
              onClick={() => !isReadOnly && handleMultiSelectChange('areasOfPractice', area)}
            >
              {area}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label>Specializations</Label>
        <div className="flex flex-wrap gap-2">
          {specializationsOptions.map((spec) => (
            <Badge
              key={spec}
              variant={(formData.specialization || []).includes(spec) ? 'default' : 'outline'}
              className={`cursor-pointer ${isReadOnly ? 'cursor-not-allowed' : ''}`}
              onClick={() => !isReadOnly && handleMultiSelectChange('specialization', spec)}
            >
              {spec}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="university">University/College</Label>
        <Input
          id="university"
          value={formData.university || ''}
          onChange={(e) => handleInputChange('university', e.target.value)}
          disabled={isReadOnly}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="graduationYear">Year of Graduation</Label>
        <Input
          id="graduationYear"
          type="number"
          min={1970}
          max={2100}
          value={formData.graduationYear || ''}
          onChange={(e) => handleInputChange('graduationYear', parseInt(e.target.value))}
          disabled={isReadOnly}
        />
      </div>
    </div>
  );

  const renderBillingTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="billingRate">
          Billing Rate (₹/hour) {!isReadOnly && <span className="text-destructive">*</span>}
        </Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Input
                id="billingRate"
                type="number"
                min={0}
                step={50}
                value={formData.billingRate || 0}
                onChange={(e) => handleInputChange('billingRate', parseFloat(e.target.value))}
                disabled={isReadOnly}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Used in time tracking → billing reports</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="space-y-2">
        <Label htmlFor="billable">Billable</Label>
        <div className="flex items-center space-x-2 h-10">
          <Switch
            id="billable"
            checked={formData.billable || false}
            onCheckedChange={(checked) => handleInputChange('billable', checked)}
            disabled={isReadOnly}
          />
          <span className="text-sm text-muted-foreground">
            {formData.billable ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="defaultTaskCategory">Default Task Category</Label>
        <Select
          value={formData.defaultTaskCategory || ''}
          onValueChange={(value) => handleInputChange('defaultTaskCategory', value)}
          disabled={isReadOnly}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {taskCategoryOptions.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="incentiveEligible">Incentive Eligibility</Label>
        <div className="flex items-center space-x-2 h-10">
          <Switch
            id="incentiveEligible"
            checked={formData.incentiveEligible || false}
            onCheckedChange={(checked) => handleInputChange('incentiveEligible', checked)}
            disabled={isReadOnly}
          />
          <span className="text-sm text-muted-foreground">
            {formData.incentiveEligible ? 'Yes' : 'No'}
          </span>
        </div>
      </div>
    </div>
  );

  const renderAccessTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2 md:col-span-2">
        <Label>Module Access</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-wrap gap-2">
                {moduleAccessOptions.map((module) => (
                  <Badge
                    key={module}
                    variant={(formData.moduleAccess || []).includes(module) ? 'default' : 'outline'}
                    className={`cursor-pointer ${isReadOnly ? 'cursor-not-allowed' : ''}`}
                    onClick={() => !isReadOnly && handleMultiSelectChange('moduleAccess', module)}
                  >
                    {module}
                  </Badge>
                ))}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Optional per-user override of role's default permissions</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dataScope">Data Visibility Scope</Label>
        <Select
          value={formData.dataScope || ''}
          onValueChange={(value) =>
            handleInputChange('dataScope', value as Employee['dataScope'])
          }
          disabled={isReadOnly}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select scope" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Own Cases">Own Cases</SelectItem>
            <SelectItem value="Team Cases">Team Cases</SelectItem>
            <SelectItem value="All Cases">All Cases</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="aiAccess">AI Assistant Access</Label>
        <div className="flex items-center space-x-2 h-10">
          <Switch
            id="aiAccess"
            checked={formData.aiAccess || false}
            onCheckedChange={(checked) => handleInputChange('aiAccess', checked)}
            disabled={isReadOnly}
          />
          <span className="text-sm text-muted-foreground">
            {formData.aiAccess ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsappAccess">WhatsApp API Access</Label>
        <div className="flex items-center space-x-2 h-10">
          <Switch
            id="whatsappAccess"
            checked={formData.whatsappAccess || false}
            onCheckedChange={(checked) => handleInputChange('whatsappAccess', checked)}
            disabled={isReadOnly}
          />
          <span className="text-sm text-muted-foreground">
            {formData.whatsappAccess ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>
    </div>
  );

  const handleDocumentUpload = (category: keyof Employee['documents'], documentId: string) => {
    setFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [category]: documentId
      }
    }));
  };

  const handleDocumentDelete = (category: keyof Employee['documents']) => {
    setFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [category]: undefined
      }
    }));
  };

  const renderDocumentsTab = () => (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-4 bg-muted/50 rounded-lg">
        <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
        <p className="text-sm text-muted-foreground">
          All uploads go to DMS folder: Employees/{formData.employeeCode || 'PENDING'}/
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EmployeeDocumentUpload
          label="Resume / CV"
          category="resume"
          employeeCode={formData.employeeCode || ''}
          existingDocumentId={formData.documents?.resume}
          onUploadComplete={(docId) => handleDocumentUpload('resume', docId)}
          onDelete={() => handleDocumentDelete('resume')}
          disabled={!formData.employeeCode || isReadOnly}
        />

        <EmployeeDocumentUpload
          label="ID Proof (PAN/Aadhaar)"
          category="idProof"
          employeeCode={formData.employeeCode || ''}
          existingDocumentId={formData.documents?.idProof}
          onUploadComplete={(docId) => handleDocumentUpload('idProof', docId)}
          onDelete={() => handleDocumentDelete('idProof')}
          disabled={!formData.employeeCode || isReadOnly}
        />

        <EmployeeDocumentUpload
          label="Address Proof"
          category="addressProof"
          employeeCode={formData.employeeCode || ''}
          existingDocumentId={formData.documents?.addressProof}
          onUploadComplete={(docId) => handleDocumentUpload('addressProof', docId)}
          onDelete={() => handleDocumentDelete('addressProof')}
          disabled={!formData.employeeCode || isReadOnly}
        />

        <EmployeeDocumentUpload
          label="Bar Council / ICAI Certificate"
          category="barOrIcaiCert"
          employeeCode={formData.employeeCode || ''}
          existingDocumentId={formData.documents?.barOrIcaiCert}
          onUploadComplete={(docId) => handleDocumentUpload('barOrIcaiCert', docId)}
          onDelete={() => handleDocumentDelete('barOrIcaiCert')}
          disabled={!formData.employeeCode || isReadOnly}
        />

        <EmployeeDocumentUpload
          label="NDA / Confidentiality"
          category="nda"
          employeeCode={formData.employeeCode || ''}
          existingDocumentId={formData.documents?.nda}
          onUploadComplete={(docId) => handleDocumentUpload('nda', docId)}
          onDelete={() => handleDocumentDelete('nda')}
          disabled={!formData.employeeCode || isReadOnly}
        />

        <EmployeeDocumentUpload
          label="Offer Letter"
          category="offerLetter"
          employeeCode={formData.employeeCode || ''}
          existingDocumentId={formData.documents?.offerLetter}
          onUploadComplete={(docId) => handleDocumentUpload('offerLetter', docId)}
          onDelete={() => handleDocumentDelete('offerLetter')}
          disabled={!formData.employeeCode || isReadOnly}
        />
      </div>
    </div>
  );

  const renderAuditTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Created By</Label>
        <Input value={formData.createdBy || 'N/A'} disabled />
      </div>

      <div className="space-y-2">
        <Label>Created At</Label>
        <Input
          value={
            formData.createdAt
              ? format(new Date(formData.createdAt), 'dd/MM/yyyy HH:mm')
              : 'N/A'
          }
          disabled
        />
      </div>

      <div className="space-y-2">
        <Label>Last Modified By</Label>
        <Input value={formData.updatedBy || 'N/A'} disabled />
      </div>

      <div className="space-y-2">
        <Label>Last Modified At</Label>
        <Input
          value={
            formData.updatedAt
              ? format(new Date(formData.updatedAt), 'dd/MM/yyyy HH:mm')
              : 'N/A'
          }
          disabled
        />
      </div>

      {mode === 'view' && dependencies.length > 0 && (
        <div className="space-y-2 md:col-span-2">
          <Label>Dependencies</Label>
          <div className="p-4 border rounded-lg">
            <p className="text-sm text-muted-foreground">
              This employee has {dependencies.join(', ')}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const tabs = [
    { id: 'personal', label: 'Personal', icon: User, content: renderPersonalTab() },
    { id: 'contact', label: 'Contact', icon: Phone, content: renderContactTab() },
    { id: 'employment', label: 'Employment', icon: Briefcase, content: renderEmploymentTab() },
    { id: 'credentials', label: 'Credentials', icon: ShieldCheck, content: renderCredentialsTab() },
    { id: 'billing', label: 'Billing', icon: IndianRupee, content: renderBillingTab() },
    { id: 'access', label: 'Access', icon: KeyRound, content: renderAccessTab() },
    { id: 'documents', label: 'Documents', icon: Paperclip, content: renderDocumentsTab() },
    { id: 'audit', label: 'Audit', icon: History, content: renderAuditTab() },
  ];

  return (
    <ModalLayout
      open={isOpen}
      onOpenChange={onClose}
      title={
        mode === 'create'
          ? 'Add New Employee'
          : mode === 'edit'
          ? 'Edit Employee'
          : 'View Employee'
      }
      description={
        mode === 'view' && formData.employeeCode
          ? `Employee Code: ${formData.employeeCode}`
          : undefined
      }
      maxWidth="max-w-[900px]"
      footer={footer}
    >
      {isMobile ? (
        <Accordion type="single" collapsible className="space-y-2">
          {tabs.map((tab) => (
            <AccordionItem key={tab.id} value={tab.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">{tab.content}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-8 w-full">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="flex flex-col gap-1 py-2">
                <tab.icon className="h-4 w-4" />
                <span className="text-xs">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-6">
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </ModalLayout>
  );
};
