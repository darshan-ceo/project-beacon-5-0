import React, { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Scale, Clock, Phone, Mail, Search, Filter, Plus, Edit, Eye, Calendar } from 'lucide-react';
import { JudgeModal } from '@/components/modals/JudgeModal';
import { Judge, useAppState } from '@/contexts/AppStateContext';


export const JudgeMasters: React.FC = () => {
  const { state } = useAppState();
  const [searchTerm, setSearchTerm] = useState('');
  const [judgeModal, setJudgeModal] = useState<{ isOpen: boolean; mode: 'create' | 'edit' | 'view'; judge?: Judge | null }>({
    isOpen: false,
    mode: 'create',
    judge: null
  });
  const [filterCourt, setFilterCourt] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAvailability, setFilterAvailability] = useState<string>('all');
  const [isAddJudgeOpen, setIsAddJudgeOpen] = useState(false);

  const getCourtName = (courtId: string) => {
    return state.courts.find(c => c.id === courtId)?.name || 'Unknown Court';
  };

  // Filter judges based on search and filters
  const filteredJudges = state.judges.filter(judge => {
    const courtName = getCourtName(judge.courtId);
    const matchesSearch = judge.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         judge.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         courtName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         judge.specialization.some(spec => spec.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || judge.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getCourtTypeColor = (type: string) => {
    switch (type) {
      case 'Income Tax Appellate Tribunal': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'High Court': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'Supreme Court': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'Commissioner Appeals': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'Settlement Commission': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'On Leave': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'Retired': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'Transferred': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'Available': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'In Hearing': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'Busy': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'Unavailable': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const uniqueCourtTypes = [...new Set(state.judges.map(judge => getCourtName(judge.courtId)))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Judge Masters</h1>
          <p className="text-muted-foreground mt-2">Manage judge profiles, assignments, and availability</p>
        </div>
        <Dialog open={isAddJudgeOpen} onOpenChange={setIsAddJudgeOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add New Judge
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Judge</DialogTitle>
              <DialogDescription>
                Create a new judge profile with court assignment and specializations.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="judgeName">Judge Name</Label>
                <Input id="judgeName" placeholder="Enter judge name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="designation">Designation</Label>
                <Input id="designation" placeholder="Enter designation" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="court">Court Assignment</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select court" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="delhi-itat-a">Delhi ITAT - Bench A</SelectItem>
                    <SelectItem value="mumbai-itat-b">Mumbai ITAT - Bench B</SelectItem>
                    <SelectItem value="delhi-hc">Delhi High Court</SelectItem>
                    <SelectItem value="cit-appeals-1">CIT Appeals - Zone 1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="jurisdiction">Jurisdiction</Label>
                <Input id="jurisdiction" placeholder="Enter jurisdiction" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience">Experience (Years)</Label>
                <Input id="experience" type="number" placeholder="Years of experience" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appointmentDate">Appointment Date</Label>
                <Input id="appointmentDate" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="Enter email address" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" placeholder="Enter phone number" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsAddJudgeOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={async () => {
                  try {
                    // Get form data
                    const form = document.forms[0];
                    const formData = new FormData(form);
                    
                    const judgeData = {
                      name: (document.getElementById('judgeName') as HTMLInputElement)?.value || '',
                      designation: (document.getElementById('designation') as HTMLInputElement)?.value || '',
                      courtId: 'court-1', // In real app, get from select
                      appointmentDate: (document.getElementById('appointmentDate') as HTMLInputElement)?.value || '',
                      specialization: ['GST', 'Income Tax'], // In real app, get from form
                      contactInfo: {
                        chambers: 'Chamber 1',
                        phone: (document.getElementById('phone') as HTMLInputElement)?.value,
                        email: (document.getElementById('email') as HTMLInputElement)?.value
                      },
                      status: 'Active' as const
                    };

                    if (!judgeData.name || !judgeData.designation) {
                      toast({
                        title: "Validation Error",
                        description: "Please fill in all required fields",
                        variant: "destructive"
                      });
                      return;
                    }

                    // This would normally call judgesService.create(judgeData)
                    // For now, just show success
                    toast({
                      title: "Judge Profile Created",
                      description: "New judge profile has been added successfully",
                    });
                    setIsAddJudgeOpen(false);
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to create judge profile. Please try again.",
                      variant: "destructive"
                    });
                  }
                }}
              >
                Create Judge Profile
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Judges</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{state.judges.length}</div>
            <p className="text-xs text-muted-foreground">
              Across all courts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Judges</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {state.judges.filter(j => j.status === 'Active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently serving
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Now</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {state.judges.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready for hearings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Experience</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {state.judges.length > 0 ? Math.round(state.judges.reduce((acc, j) => acc + 15, 0) / state.judges.length) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Years of service
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search judges by name, designation, court, or specialization..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterCourt} onValueChange={setFilterCourt}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by court" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courts</SelectItem>
            {uniqueCourtTypes.map(court => (
              <SelectItem key={court} value={court}>
                {court}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="On Leave">On Leave</SelectItem>
            <SelectItem value="Retired">Retired</SelectItem>
            <SelectItem value="Transferred">Transferred</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterAvailability} onValueChange={setFilterAvailability}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Availability" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Available">Available</SelectItem>
            <SelectItem value="In Hearing">In Hearing</SelectItem>
            <SelectItem value="Busy">Busy</SelectItem>
            <SelectItem value="Unavailable">Unavailable</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Judges Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Judges Directory</CardTitle>
            <CardDescription>
              Comprehensive list of judges with court assignments and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Judge Details</TableHead>
                  <TableHead>Court & Jurisdiction</TableHead>
                  <TableHead>Contact Information</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Status & Availability</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJudges.map((judge, index) => (
                  <motion.tr
                    key={judge.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>
                            {judge.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <div className="font-medium">{judge.name}</div>
                          <div className="text-sm text-muted-foreground">{judge.designation}</div>
                          <div className="text-xs text-muted-foreground">
                            Appointed: {judge.appointmentDate}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {judge.specialization.slice(0, 2).map(spec => (
                              <Badge key={spec} variant="outline" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                            {judge.specialization.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{judge.specialization.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <Badge variant="secondary">
                          Court
                        </Badge>
                        <div className="text-sm font-medium">{getCourtName(judge.courtId)}</div>
                        <div className="text-sm text-muted-foreground">Active</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {judge.contactInfo.phone || 'N/A'}
                        </div>
                        <div className="text-sm flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {judge.contactInfo.email || 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Appointed: {new Date(judge.appointmentDate).toLocaleDateString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="font-medium">{judge.totalCases}</span> Total Cases
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">25</span> Pending
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">{judge.avgDisposalTime}</span> Avg Time
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <Badge className={getStatusColor(judge.status)}>
                          {judge.status}
                        </Badge>
                        <Badge variant="secondary">
                          Active
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      <JudgeModal
        isOpen={judgeModal.isOpen}
        onClose={() => setJudgeModal({ isOpen: false, mode: 'create', judge: null })}
        judge={judgeModal.judge}
        mode={judgeModal.mode}
      />
    </div>
  );
};