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
import { Court, useAppState, getActiveCourtCases } from '@/contexts/AppStateContext';
import { courtsService } from '@/services/courtsService';
import { useRBAC } from '@/hooks/useAdvancedRBAC';
import { featureFlagService } from '@/services/featureFlagService';
import { LegalAuthoritiesDashboard } from './LegalAuthoritiesDashboard';
import { AUTHORITY_LEVEL_OPTIONS, AUTHORITY_LEVEL_METADATA } from '@/types/authority-level';
import { MAPPING_SERVICES } from '@/utils/mappingServices';
import { UnifiedCourtSearch } from '@/components/masters/UnifiedCourtSearch';
import { GlossaryTooltip } from '@/components/help/GlossaryTooltip';
import { extractCityFromAddress } from '@/utils/cityExtractor';
import { authorityHierarchyService } from '@/services/authorityHierarchyService';
import { useImportRefresh } from '@/hooks/useImportRefresh';


export const CourtMasters: React.FC = () => {
  const { state, dispatch } = useAppState();
  const { hasPermission } = useRBAC();
  const { reloadCourts } = useImportRefresh();
  const [searchTerm, setSearchTerm] = useState('');
  const [courtModal, setCourtModal] = useState<{ isOpen: boolean; mode: 'create' | 'edit' | 'view'; court?: Court | null }>({
    isOpen: false,
    mode: 'create',
    court: null
  });
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const [exportWizardOpen, setExportWizardOpen] = useState(false);

  // Filter courts based on search and filters
  const filteredCourts = (state.courts || []).filter(court => {
    // Handle null/undefined and both string and object addresses for search
    const addressText = !court.address 
      ? ''
      : typeof court.address === 'string' 
        ? court.address 
        : `${court.address.line1 || ''} ${court.address.line2 || ''} ${court.address.locality || ''} ${court.address.district || ''}`.trim();
    
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (court.name || '').toLowerCase().includes(searchLower) ||
                         (court.jurisdiction || '').toLowerCase().includes(searchLower) ||
                         addressText.toLowerCase().includes(searchLower);
    
    const matchesType = !activeFilters.type || activeFilters.type === 'all' || court.type === activeFilters.type;
    const matchesAuthorityLevel = !activeFilters.authorityLevel || activeFilters.authorityLevel === 'all' || court.authorityLevel === activeFilters.authorityLevel;
    const matchesStatus = !activeFilters.status || activeFilters.status === 'all' || (court.status || 'Active') === activeFilters.status;
    const matchesJurisdiction = !activeFilters.jurisdiction || activeFilters.jurisdiction === 'all' || court.jurisdiction === activeFilters.jurisdiction;
    const matchesDigitalFiling = !activeFilters.digitalFiling || activeFilters.digitalFiling === 'all' || 
      (activeFilters.digitalFiling === 'true' && court.digitalFiling) ||
      (activeFilters.digitalFiling === 'false' && !court.digitalFiling);
    
    return matchesSearch && matchesType && matchesAuthorityLevel && matchesStatus && matchesJurisdiction && matchesDigitalFiling;
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

  const uniqueJurisdictions = [...new Set((state.courts || []).map(court => court.jurisdiction).filter(Boolean))];

  const migrateCityData = () => {
    let updated = 0;
    const updatedCourts = state.courts.map(court => {
      if (!court.city || court.city === 'N/A' || court.city === '') {
        const extractedCity = extractCityFromAddress(court.address);
        updated++;
        return { ...court, city: extractedCity };
      }
      return court;
    });
    
    // Update courts one by one
    updatedCourts.forEach(court => {
      if (court.id) {
        dispatch({ type: 'UPDATE_COURT', payload: court });
      }
    });
    
    toast({
      title: "City Data Updated",
      description: `Successfully extracted city information for ${updated} legal authorities.`
    });
  };

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
            <Button 
              variant="outline" 
              size="sm"
              className="gap-2"
              onClick={migrateCityData}
            >
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Fix City Data</span>
              <span className="sm:hidden">Fix Cities</span>
            </Button>
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

      {/* Dashboard Cards */}
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
      >
        <UnifiedCourtSearch
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          activeFilters={activeFilters}
          onFiltersChange={setActiveFilters}
          jurisdictions={uniqueJurisdictions}
          states={[]}
          types={['Income Tax Appellate Tribunal', 'High Court', 'Supreme Court', 'Commissioner Appeals', 'Settlement Commission']}
        />
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
                  <TableHead>Active Cases</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
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
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => setCourtModal({ 
                      isOpen: true, 
                      mode: hasPermission('courts', 'write') ? 'edit' : 'view', 
                      court 
                    })}
                  >
                    <TableCell className="max-w-md">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary opacity-70" />
                          <span className="font-medium text-sm">{court.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-start gap-1">
                          <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-1">
                            {typeof court.address === 'string' 
                              ? court.address 
                              : `${court.address.line1}${court.address.line2 ? ', ' + court.address.line2 : ''}`
                            }
                          </span>
                        </div>
                        {court.authorityLevel && (
                          <div className="space-y-1">
                            <GlossaryTooltip 
                              term={AUTHORITY_LEVEL_METADATA[court.authorityLevel]?.label || court.authorityLevel}
                            >
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] px-1.5 py-0 ${AUTHORITY_LEVEL_METADATA[court.authorityLevel]?.color || 'bg-gray-100'}`}
                              >
                                {AUTHORITY_LEVEL_METADATA[court.authorityLevel]?.label || court.authorityLevel}
                              </Badge>
                            </GlossaryTooltip>
                            
                            {/* Display Matter Types if available */}
                            {court.matterTypes && court.matterTypes.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {court.matterTypes.map(mtId => {
                                  const matterType = authorityHierarchyService.findMatterTypeGlobal(mtId);
                                  return matterType ? (
                                    <Badge 
                                      key={mtId} 
                                      variant="secondary" 
                                      className="text-[9px] px-1 py-0"
                                    >
                                      {matterType.matterType.name}
                                    </Badge>
                                  ) : null;
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary opacity-70" />
                        <span className="font-medium text-sm">
                          {court.city || 'N/A'}
                        </span>
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
                        {(() => {
                          // Extract pincode from address - handle both object and string formats
                          let pincode: string | null = null;
                          if (typeof court.address === 'object' && court.address?.pincode) {
                            pincode = court.address.pincode;
                          } else if (typeof court.address === 'string') {
                            // Extract 6-digit pincode from address string
                            const match = court.address.match(/\b\d{6}\b/);
                            pincode = match ? match[0] : null;
                          }
                          
                          if (pincode) {
                            return (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-blue-600 opacity-80" aria-hidden="true" />
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      className="text-blue-600 hover:underline font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                                      aria-label={`Open mapping service for PIN ${pincode}`}
                                    >
                                      {pincode}
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
                                       const addressForService = typeof court.address === 'string' 
                                         ? { line1: court.address, pincode } 
                                         : court.address;
                                       return (
                                         <DropdownMenuItem key={service.id} asChild>
                                           <a
                                             href={service.urlTemplate(addressForService)}
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
                            );
                          }
                          return <span className="text-muted-foreground text-sm">N/A</span>;
                        })()}
                     </TableCell>
                     <TableCell>
                       <Badge 
                         variant={(court.status || 'Active') === 'Active' ? 'default' : 'destructive'}
                         className={(court.status || 'Active') === 'Active'
                           ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                           : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                         }
                       >
                         {court.status || 'Active'}
                       </Badge>
                     </TableCell>
                     <TableCell>
                       <div className="flex items-center gap-2">
                         <Badge variant="secondary" className="font-mono">
                           {getActiveCourtCases(court.id, state.cases)}
                         </Badge>
                         {getActiveCourtCases(court.id, state.cases) > 0 && (
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => {
                               window.location.href = `/cases?courtId=${court.id}`;
                             }}
                             className="h-6 w-6 p-0"
                           >
                             <Eye className="h-3 w-3" />
                           </Button>
                         )}
                       </div>
                     </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
        onImportComplete={async (job) => {
          console.log('Court import completed:', job);
          if (job.counts.processed > 0) {
            await reloadCourts();
            toast({
              title: 'Import Complete',
              description: `${job.counts.processed} legal forums imported successfully`,
            });
          }
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