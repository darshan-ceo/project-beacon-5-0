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
import { Textarea } from '@/components/ui/textarea';
import { Building2, MapPin, Phone, Mail, Search, Filter, Plus, Edit, Eye, Users } from 'lucide-react';
import { CourtModal } from '@/components/modals/CourtModal';
import { Court, useAppState } from '@/contexts/AppStateContext';
import { courtsService } from '@/services/courtsService';


export const CourtMasters: React.FC = () => {
  const { state, dispatch } = useAppState();
  const [searchTerm, setSearchTerm] = useState('');
  const [courtModal, setCourtModal] = useState<{ isOpen: boolean; mode: 'create' | 'edit' | 'view'; court?: Court | null }>({
    isOpen: false,
    mode: 'create',
    court: null
  });
  const [filterType, setFilterType] = useState<string>('all');
  const [filterJurisdiction, setFilterJurisdiction] = useState<string>('all');

  // Filter courts based on search and filters
  const filteredCourts = (state.courts || []).filter(court => {
    // Handle both string and object addresses for search
    const addressText = typeof court.address === 'string' 
      ? court.address 
      : `${court.address.line1} ${court.address.line2} ${court.address.locality} ${court.address.district}`.trim();
    
    const matchesSearch = court.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         court.jurisdiction.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         addressText.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || court.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Income Tax Appellate Tribunal': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'High Court': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'Supreme Court': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'Commissioner Appeals': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'Settlement Commission': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const uniqueJurisdictions = [...new Set((state.courts || []).map(court => court.jurisdiction))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Court Masters</h1>
          <p className="text-muted-foreground mt-2">Manage court information and jurisdictions</p>
        </div>
        <Button 
          className="gap-2"
          onClick={() => setCourtModal({ 
            isOpen: true, 
            mode: 'create', 
            court: null 
          })}
        >
          <Plus className="h-4 w-4" />
          Add New Court
        </Button>
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
            <CardTitle className="text-sm font-medium">Total Courts</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(state.courts || []).length}</div>
            <p className="text-xs text-muted-foreground">
              Across all jurisdictions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ITAT Benches</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(state.courts || []).filter(c => c.type === 'Tribunal').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Primary jurisdiction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Courts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(state.courts || []).filter(c => c.type === 'High Court').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Appeal jurisdiction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Courts</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(state.courts || []).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Operational courts
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
            placeholder="Search courts by name, jurisdiction, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Income Tax Appellate Tribunal">ITAT</SelectItem>
            <SelectItem value="High Court">High Court</SelectItem>
            <SelectItem value="Commissioner Appeals">Commissioner Appeals</SelectItem>
            <SelectItem value="Settlement Commission">Settlement Commission</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterJurisdiction} onValueChange={setFilterJurisdiction}>
          <SelectTrigger className="w-full sm:w-48">
            <MapPin className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by jurisdiction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jurisdictions</SelectItem>
            {uniqueJurisdictions.map(jurisdiction => (
              <SelectItem key={jurisdiction} value={jurisdiction}>
                {jurisdiction}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Courts Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Courts Directory</CardTitle>
            <CardDescription>
              Comprehensive list of courts with jurisdiction and contact information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Court Details</TableHead>
                  <TableHead>Type & Jurisdiction</TableHead>
                  <TableHead>Contact Information</TableHead>
                  <TableHead>Bench Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourts.map((court, index) => (
                  <motion.tr
                    key={court.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{court.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {typeof court.address === 'string' 
                            ? court.address 
                            : `${court.address.line1}${court.address.line2 ? ', ' + court.address.line2 : ''}${court.address.locality ? ', ' + court.address.locality : ''}${court.address.district ? ', ' + court.address.district : ''}`
                          }
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Est. {court.establishedYear}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <Badge className={getTypeColor(court.type)}>
                          {court.type}
                        </Badge>
                        <div className="text-sm font-medium">{court.jurisdiction}</div>
                        <div className="flex flex-wrap gap-1">
                          {(court.workingDays || []).slice(0, 2).map(day => (
                            <Badge key={day} variant="outline" className="text-xs">
                              {day}
                            </Badge>
                          ))}
                          {(court.workingDays || []).length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{(court.workingDays || []).length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                     <TableCell>
                       <div className="space-y-1">
                         <div className="text-sm flex items-center gap-1">
                           <Phone className="h-3 w-3" />
                           {court.phone || 'N/A'}
                         </div>
                         <div className="text-sm flex items-center gap-1">
                           <Mail className="h-3 w-3" />
                           {court.email || 'N/A'}
                         </div>
                         <div className="text-xs text-muted-foreground">
                           {court.benchLocation || 'N/A'}
                         </div>
                       </div>
                     </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="font-medium">{court.totalJudges}</span> Judges
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">{court.activeCases}</span> Active Cases
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setCourtModal({ 
                            isOpen: true, 
                            mode: 'view', 
                            court: court 
                          })}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setCourtModal({ 
                            isOpen: true, 
                            mode: 'edit', 
                            court: court 
                          })}
                        >
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

      <CourtModal
        isOpen={courtModal.isOpen}
        onClose={() => setCourtModal({ isOpen: false, mode: 'create', court: null })}
        court={courtModal.court}
        mode={courtModal.mode}
      />
    </div>
  );
};