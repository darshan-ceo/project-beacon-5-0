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
import { Building2, MapPin, Phone, Mail, Search, Filter, Plus, Edit, Eye, Users, Upload, Download, Scale, Map, Globe, Navigation } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CourtModal } from '@/components/modals/CourtModal';
import { ImportWizard } from '@/components/importExport/ImportWizard';
import { ExportWizard } from '@/components/importExport/ExportWizard';
import { Court, useAppState } from '@/contexts/AppStateContext';
import { courtsService } from '@/services/courtsService';
import { useRBAC } from '@/hooks/useAdvancedRBAC';
import { featureFlagService } from '@/services/featureFlagService';
import { LegalAuthoritiesDashboard } from './LegalAuthoritiesDashboard';
import { AUTHORITY_LEVEL_OPTIONS, AUTHORITY_LEVEL_METADATA } from '@/types/authority-level';
import { MAPPING_SERVICES } from '@/utils/mappingServices';


export const CourtMasters: React.FC = () => {
  const { state, dispatch } = useAppState();
  const { hasPermission } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [courtModal, setCourtModal] = useState<{ isOpen: boolean; mode: 'create' | 'edit' | 'view'; court?: Court | null }>({
    isOpen: false,
    mode: 'create',
    court: null
  });
  const [filterType, setFilterType] = useState<string>('all');
  const [filterJurisdiction, setFilterJurisdiction] = useState<string>('all');
  const [filterAuthorityLevel, setFilterAuthorityLevel] = useState<string>('all');
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const [exportWizardOpen, setExportWizardOpen] = useState(false);

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
    const matchesAuthorityLevel = filterAuthorityLevel === 'all' || court.authorityLevel === filterAuthorityLevel;
    
    return matchesSearch && matchesType && matchesAuthorityLevel;
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
          <h1 className="text-3xl font-bold text-foreground">Legal Authorities</h1>
          <p className="text-muted-foreground mt-2">Manage legal authorities with jurisdiction hierarchy and contact information</p>
        </div>
          <div className="flex flex-wrap gap-2">
            {featureFlagService.isEnabled('data_io_v1') && hasPermission('io.import.court', 'write') && (
              <Button 
                variant="outline" 
                size="sm"
                className="gap-2"
                onClick={() => setImportWizardOpen(true)}
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Import Legal Forums</span>
                <span className="sm:hidden">Import</span>
              </Button>
            )}
            {featureFlagService.isEnabled('data_io_v1') && hasPermission('io.export.court', 'write') && (
              <Button 
                variant="outline" 
                size="sm"
                className="gap-2"
                onClick={() => setExportWizardOpen(true)}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export Legal Forums</span>
                <span className="sm:hidden">Export</span>
              </Button>
            )}
            <Button 
              size="sm"
              className="gap-2"
              onClick={() => setCourtModal({ 
                isOpen: true, 
                mode: 'create', 
                court: null 
              })}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add New Legal Forum</span>
              <span className="sm:hidden">Add Legal Forum</span>
            </Button>
          </div>
      </motion.div>

      {/* Legal Authorities Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <LegalAuthoritiesDashboard />
      </motion.div>

      {/* Visual Divider */}
      <div className="border-t border-border" />

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row flex-wrap gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search legal forums by name, jurisdiction, or location..."
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

        <Select value={filterAuthorityLevel} onValueChange={setFilterAuthorityLevel}>
          <SelectTrigger className="w-full sm:w-60">
            <Scale className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by authority level" />
          </SelectTrigger>
          <SelectContent>
            {AUTHORITY_LEVEL_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
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
            <CardTitle>Legal Authorities Directory</CardTitle>
            <CardDescription>
              Comprehensive list of legal authorities with jurisdiction and contact information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                <TableRow>
                  <TableHead>Legal Forum Details</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Contact Information</TableHead>
                  <TableHead>Pincode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Building2 className="h-12 w-12 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">
                          No legal forums found for the selected filters
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Try adjusting your search criteria or authority level filter
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
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
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-sm">
                          {court.city || 'N/A'}
                        </div>
                        {court.authorityLevel && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${AUTHORITY_LEVEL_METADATA[court.authorityLevel]?.color || 'bg-gray-100'}`}
                          >
                            {AUTHORITY_LEVEL_METADATA[court.authorityLevel]?.label || court.authorityLevel}
                          </Badge>
                        )}
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
                       {typeof court.address === 'object' && court.address.pincode ? (
                         <div className="flex items-center gap-2">
                           <MapPin className="h-4 w-4 text-blue-600 opacity-80" aria-hidden="true" />
                           
                           <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                               <button
                                 className="text-blue-600 hover:underline font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                                 aria-label={`Open mapping service for PIN ${court.address.pincode}`}
                               >
                                 {court.address.pincode}
                               </button>
                             </DropdownMenuTrigger>
                             
                             <DropdownMenuContent 
                               align="start" 
                               className="w-56 bg-popover dark:bg-popover border shadow-lg z-50"
                             >
                               <DropdownMenuLabel className="text-xs text-muted-foreground">
                                 Choose Mapping Service
                               </DropdownMenuLabel>
                               <DropdownMenuSeparator />
                               
                               {MAPPING_SERVICES.map((service) => {
                                 const IconComponent = service.icon === 'Map' ? Map : service.icon === 'Globe' ? Globe : service.icon === 'MapPin' ? MapPin : Navigation;
                                 return (
                                   <DropdownMenuItem key={service.id} asChild>
                                     <a
                                       href={service.urlTemplate(court.address.pincode)}
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       className="flex items-start gap-3 cursor-pointer"
                                     >
                                       <IconComponent className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                       <div className="flex flex-col">
                                         <span className="font-medium">{service.name}</span>
                                         <span className="text-xs text-muted-foreground">
                                           {service.description}
                                         </span>
                                       </div>
                                     </a>
                                   </DropdownMenuItem>
                                 );
                               })}
                             </DropdownMenuContent>
                           </DropdownMenu>
                         </div>
                       ) : (
                         <span className="text-muted-foreground text-sm">N/A</span>
                       )}
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
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <CourtModal
        isOpen={courtModal.isOpen}
        onClose={() => setCourtModal({ isOpen: false, mode: 'create', court: null })}
        court={courtModal.court}
        mode={courtModal.mode}
      />

      <ImportWizard
        isOpen={importWizardOpen}
        onClose={() => setImportWizardOpen(false)}
        entityType="court"
        onImportComplete={(job) => {
          console.log('Court import completed:', job);
          // Refresh data if needed
        }}
      />

      <ExportWizard
        isOpen={exportWizardOpen}
        onClose={() => setExportWizardOpen(false)}
        entityType="court"
      />
    </div>
  );
};