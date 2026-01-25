import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStateSafe } from '@/contexts/AppStateContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { normalizeStage } from '@/utils/stageUtils';
import { calculateSLAStatus } from '@/services/slaService';
import { parseCaseNumber } from '@/utils/caseNumberGenerator';
import { useSLARecalculation } from '@/hooks/useSLARecalculation';

// State name to code mapping for imported data
const STATE_NAME_TO_CODE: Record<string, string> = {
  'andaman and nicobar islands': 'AN', 'andaman and nicobar': 'AN', 'andaman': 'AN',
  'andhra pradesh': 'AP', 'arunachal pradesh': 'AR', 'assam': 'AS', 'bihar': 'BR',
  'chhattisgarh': 'CG', 'chandigarh': 'CH', 'dadra and nagar haveli': 'DH',
  'daman and diu': 'DH', 'delhi': 'DL', 'goa': 'GA', 'gujarat': 'GJ',
  'haryana': 'HR', 'himachal pradesh': 'HP', 'jammu and kashmir': 'JK', 'jammu': 'JK',
  'jharkhand': 'JH', 'karnataka': 'KA', 'kerala': 'KL', 'ladakh': 'LA',
  'lakshadweep': 'LD', 'madhya pradesh': 'MP', 'maharashtra': 'MH', 'manipur': 'MN',
  'meghalaya': 'ML', 'mizoram': 'MZ', 'nagaland': 'NL', 'odisha': 'OR', 'orissa': 'OR',
  'punjab': 'PB', 'puducherry': 'PY', 'pondicherry': 'PY', 'rajasthan': 'RJ',
  'sikkim': 'SK', 'tamil nadu': 'TN', 'tripura': 'TR', 'telangana': 'TS',
  'uttarakhand': 'UK', 'uttar pradesh': 'UP', 'west bengal': 'WB'
};

// Convert state name or code to standard state code
const normalizeStateId = (stateValue: string): string => {
  if (!stateValue) return '';
  const normalized = stateValue.toLowerCase().trim();
  // If it's already a 2-letter code and in our mapping values, return uppercase
  if (normalized.length === 2 && Object.values(STATE_NAME_TO_CODE).includes(normalized.toUpperCase())) {
    return normalized.toUpperCase();
  }
  // Otherwise, look up by name
  return STATE_NAME_TO_CODE[normalized] || stateValue;
};

// Data schema version - increment this when field mappings change to force fresh reload
// Version 1: Initial schema
// Version 2: Added reportingTo field mapping for employee hierarchy
// Version 3: Force reload to fix stale closure issues with hierarchy building
// Version 4: Fixed assignedCAId mapping and UPDATE_CLIENT merge pattern
// Version 5: Fixed address parsing to preserve city/state/locality fields
// Version 6: Fixed dataScope/data_scope mapping for Team Cases visibility
// Version 7: Fixed manager chain visibility for Team Cases (upward visibility to manager's manager)
// Version 8: Fixed profile/access pages to use actual RLS-filtered state counts
// Version 9: Fixed manager lookup to handle snake_case reporting_to field
// Version 10: Fixed access breakdown to use RLS-filtered cases instead of frontend visibility calculation
// Version 11: Fixed court taxJurisdiction/officerDesignation mapping and address JSON parsing
// Version 12: Fixed realtime sync to parse court address JSON - prevents raw string overwrite
const DATA_SCHEMA_VERSION = 12;

// Global flags to persist data loaded state across component remounts
// This prevents the "Loading your data..." screen from appearing when switching tabs
let globalDataLoaded = false;
let globalLoadedTenantId: string | null = null;
let globalSchemaVersion = 0;

/**
 * DataInitializer Component
 * 
 * Loads all entity data from Supabase into AppStateContext on app startup.
 * Waits for authentication to complete before loading tenant-specific data.
 * Uses global flags to prevent unnecessary reloads on tab switch/remount.
 * Tracks schema version to force reload when field mappings change.
 */
export const DataInitializer = ({ children }: { children: React.ReactNode }) => {
  const { user, tenantId } = useAuth();
  const appStateContext = useAppStateSafe();
  
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // Only show loading if data hasn't been loaded for this tenant yet
  const [isLoading, setIsLoading] = useState(
    !globalDataLoaded || globalLoadedTenantId !== tenantId
  );
  const [error, setError] = useState<string | null>(null);
  
  // Enable periodic SLA recalculation (every 15 min + on window focus)
  useSLARecalculation();
  
  // Get dispatch safely - will be undefined if context is not available
  const dispatch = appStateContext?.dispatch;
  
  // Handle hot reload gracefully - if context is not available, just render children
  if (!appStateContext) {
    console.warn('[DataInitializer] AppState context not available (likely during hot reload)');
    return <>{children}</>;
  }

  useEffect(() => {
    const loadData = async () => {
      // Reset global flags when user logs out to ensure fresh data load on next login
      if (!user || !tenantId) {
        console.log('[DataInitializer] User logged out or not authenticated - resetting global flags', { user: !!user, tenantId });
        globalDataLoaded = false;
        globalLoadedTenantId = null;
        setIsLoading(false);
        return;
      }

      // Check if schema version changed - force reload if field mappings updated
      if (globalSchemaVersion !== DATA_SCHEMA_VERSION) {
        console.log('[DataInitializer] Schema version changed from', globalSchemaVersion, 'to', DATA_SCHEMA_VERSION, '- forcing fresh reload');
        globalDataLoaded = false;
        globalSchemaVersion = DATA_SCHEMA_VERSION;
      }

      // Skip reload if data was already loaded for this tenant AND state has data
      const currentEmployees = appStateContext?.state?.employees || [];
      
      if (globalDataLoaded && globalLoadedTenantId === tenantId) {
        // Additional validation: check if employees have reportingTo field populated correctly
        const employeesWithReportingTo = currentEmployees.filter((e: any) => e.reportingTo);
        
        if (currentEmployees.length > 0) {
          // Check if any employees SHOULD have reportingTo but don't (stale data check)
          console.log('[DataInitializer] Checking data freshness:', {
            totalEmployees: currentEmployees.length,
            withReportingTo: employeesWithReportingTo.length
          });
          
          console.log('[DataInitializer] Data already loaded for tenant, skipping reload');
          setIsLoading(false);
          return;
        } else {
          // Flags say loaded but state is empty - force reload
          console.log('[DataInitializer] Flags indicate loaded but state.employees is empty - forcing reload');
          globalDataLoaded = false;
        }
      }

      console.log('[DataInitializer] Loading data for tenant:', tenantId);
      setIsLoading(true);
      setError(null);

      try {
        // Load all entities in parallel
        const [
          clientsData,
          clientGroupsData,
          casesData,
          tasksData,
          hearingsData,
          documentsData,
          employeesData,
          courtsData,
          judgesData,
          foldersData,
          timelineData,
          taskFollowUpsData
        ] = await Promise.all([
          supabase.from('clients').select('*').eq('tenant_id', tenantId),
          supabase.from('client_groups').select('*').eq('tenant_id', tenantId),
          supabase.from('cases').select('*').eq('tenant_id', tenantId),
          supabase.from('tasks').select('*').eq('tenant_id', tenantId),
          supabase.from('hearings').select('*').eq('tenant_id', tenantId),
          supabase.from('documents').select('*').eq('tenant_id', tenantId),
          supabase.from('employees').select('*').eq('tenant_id', tenantId),
          supabase.from('courts').select('*').eq('tenant_id', tenantId),
          supabase.from('judges').select('*').eq('tenant_id', tenantId),
          supabase.from('document_folders').select('*').eq('tenant_id', tenantId),
          supabase.from('timeline_entries').select('*').eq('tenant_id', tenantId),
          supabase.from('task_followups').select('*').eq('tenant_id', tenantId)
        ]);

        // Check for errors
        const errors = [
          clientsData.error,
          clientGroupsData.error,
          casesData.error,
          tasksData.error,
          hearingsData.error,
          documentsData.error,
          employeesData.error,
          courtsData.error,
          judgesData.error,
          foldersData.error,
          timelineData.error,
          taskFollowUpsData.error
        ].filter(Boolean);

        if (errors.length > 0) {
          throw new Error(`Failed to load data: ${errors.map(e => e?.message).join(', ')}`);
        }

        // Transform data to match AppState interface
        const clients = (clientsData.data || []).map((c: any) => ({
          ...c,
          name: c.display_name, // Map display_name to name for UI compatibility
          display_name: c.display_name,
          status: c.status === 'active' ? 'Active' : 'Inactive', // Convert lowercase to uppercase
          assignedCAId: c.owner_id || c.assigned_ca_id || c.assignedCAId || '',
          assignedCAName: c.assigned_ca_name || c.assignedCAName,
          clientGroupId: c.client_group_id || c.clientGroupId,
          createdAt: c.created_at || c.createdAt,
          updatedAt: c.updated_at || c.updatedAt,
          // Parse signatories from JSON string
          signatories: c.signatories ? (typeof c.signatories === 'string' ? JSON.parse(c.signatories) : c.signatories) : [],
          // Parse address from JSON string with fallback to top-level city/state
          address: c.address 
            ? (() => {
                const parsed = typeof c.address === 'string' ? JSON.parse(c.address) : c.address;
                // Ensure cityName/stateName are populated from top-level if missing
                return {
                  ...parsed,
                  cityName: parsed.cityName || parsed.city || c.city || '',
                  stateName: parsed.stateName || parsed.state || c.state || '',
                };
              })()
            : {
                cityName: c.city || '',
                stateName: c.state || '',
                countryId: 'IN',
                source: 'manual'
              },
          // Parse jurisdiction from JSON with backward compatibility
          jurisdiction: c.jurisdiction ? (typeof c.jurisdiction === 'string' ? JSON.parse(c.jurisdiction) : c.jurisdiction) : {
            // Provide default structure
            jurisdictionType: 'both',
            stateJurisdiction: {},
            centerJurisdiction: {},
            // Backward compatibility for legacy fields
            commissionerate: '',
            division: '',
            range: ''
          },
          // Parse portal_access from JSON
          portalAccess: c.portal_access 
            ? (typeof c.portal_access === 'string' ? JSON.parse(c.portal_access) : c.portal_access)
            : { allowLogin: false },
          dataScope: c.data_scope || 'TEAM',
        }));

        const clientGroups = (clientGroupsData.data || []).map((cg: any) => ({
          ...cg,
          headClientId: cg.head_client_id || cg.headClientId,
          totalClients: cg.total_clients || cg.totalClients,
          createdAt: cg.created_at || cg.createdAt,
          updatedAt: cg.updated_at || cg.updatedAt,
          createdBy: cg.created_by || cg.createdBy,
          updatedBy: cg.updated_by || cg.updatedBy,
        }));

        // Create employees map for quick lookup (used for deriving assignedToName)
        const employeesMap = new Map(
          (employeesData.data || []).map((e: any) => [
            e.id, 
            e.full_name || e.name || 'Unknown'
          ])
        );

        const cases = (casesData.data || []).map((c: any) => {
          // Normalize status: 'open'/'Open' → 'Active'
          const normalizedStatus = ['open', 'Open', 'active', 'Active'].includes(c.status) 
            ? 'Active' 
            : c.status || 'Active';
          
          // Get assigned_to UUID
          const assignedToId = c.assigned_to || c.assigned_to_id || c.assignedToId;
          
          // Derive assignedToName from employees map
          const assignedToName = assignedToId 
            ? (employeesMap.get(assignedToId) || c.assigned_to_name || c.assignedToName || '')
            : '';
          
          // Parse case_number to extract missing component fields as fallback
          const caseNumber = c.case_number || c.caseNumber;
          const parsedComponents = caseNumber ? parseCaseNumber(caseNumber) : null;
          
          // Build case object with proper field mapping
          const caseObj = {
            ...c,
            caseNumber,
            clientId: c.client_id || c.clientId,
            status: normalizedStatus,
            currentStage: normalizeStage(c.stage_code || c.current_stage || c.currentStage || 'Assessment'),
            assignedToId,
            assignedToName,
            createdDate: c.created_date || c.created_at || c.createdDate,
            lastUpdated: c.last_updated || c.updated_at || c.lastUpdated,
            generatedForms: c.generated_forms || c.generatedForms || [],
            amountInDispute: c.amount_in_dispute || c.amountInDispute,
            stateBenchState: c.state_bench_state || c.stateBenchState,
            stateBenchCity: c.state_bench_city || c.stateBenchCity,
            city: c.city || '',
            // New fields from migration - use parsedComponents as fallback for fields that might be NULL in DB
            caseType: c.case_type || c.caseType || parsedComponents?.caseType,
            caseYear: c.case_year || c.caseYear || parsedComponents?.year,
            caseSequence: c.case_sequence || c.caseSequence || parsedComponents?.sequence,
            officeFileNo: c.office_file_no || c.officeFileNo || parsedComponents?.officeFileNo || '',
            issueType: c.issue_type || c.issueType || '',
            formType: c.form_type || c.formType,
            sectionInvoked: c.section_invoked || c.sectionInvoked,
            financialYear: c.financial_year || c.financialYear,
            // Notice and authority fields - default to empty string if null
            noticeNo: c.notice_no || c.noticeNo || parsedComponents?.noticeNo || '',
            noticeDate: c.notice_date || c.noticeDate || '',
            notice_date: c.notice_date || c.noticeDate || '',
            noticeType: c.notice_type || c.noticeType,
            replyDueDate: c.reply_due_date || c.replyDueDate || '',
            reply_due_date: c.reply_due_date || c.replyDueDate || '',
            authorityId: c.authority_id || c.authorityId || '',
            forumId: c.forum_id || c.forumId,
            // Financial fields - default to 0 if null
            taxDemand: c.tax_demand || c.taxDemand || 0,
            interestAmount: c.interest_amount || c.interestAmount || 0,
            interest_amount: c.interest_amount || c.interestAmount || 0,
            penaltyAmount: c.penalty_amount || c.penaltyAmount || 0,
            penalty_amount: c.penalty_amount || c.penaltyAmount || 0,
            totalDemand: c.total_demand || c.totalDemand || 0,
            total_demand: c.total_demand || c.totalDemand || 0,
            // Hearing fields
            nextHearingDate: c.next_hearing_date || c.nextHearingDate,
          };
          
          // Auto-calculate timeline breach status using SLA service
          const timelineBreachStatus = calculateSLAStatus(caseObj as any);
          
          return {
            ...caseObj,
            timelineBreachStatus,
          };
        });

        const tasks = (tasksData.data || []).map((t: any) => {
          const assignedToId = t.assigned_to || t.assigned_to_id || t.assignedToId;
          const assignedToName = assignedToId 
            ? (employeesMap.get(assignedToId) || t.assigned_to_name || t.assignedToName || '')
            : '';
          
          return {
            ...t,
            caseId: t.case_id || t.caseId,
            clientId: t.client_id || t.clientId,
            caseNumber: t.case_number || t.caseNumber,
            assignedToId,
            assignedToName,
            assignedById: t.assigned_by || t.assigned_by_id || t.assignedById,
            assignedByName: t.assigned_by_name || t.assignedByName,
          createdDate: t.created_date || t.created_at || t.createdDate,
          dueDate: t.due_date || t.dueDate,
          completedDate: t.completed_date || t.completedDate,
          followUpDate: t.follow_up_date || t.followUpDate,
          estimatedHours: t.estimated_hours || t.estimatedHours || 0,
          actualHours: t.actual_hours || t.actualHours,
          isAutoGenerated: t.is_auto_generated || t.isAutoGenerated || false,
          bundleId: t.bundle_id || t.bundleId,
          escalationLevel: t.escalation_level || t.escalationLevel || 0,
          timezone: t.timezone || 'Asia/Kolkata',
          dueDateValidated: t.due_date_validated || t.dueDateValidated || true,
          audit_trail: t.audit_trail || { created_by: user.id, created_at: new Date().toISOString(), updated_by: user.id, updated_at: new Date().toISOString(), change_log: [] },
          };
        });


        // UUID validation helper
        const isValidUUID = (str: string) => {
          if (!str) return false;
          return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        };

        const hearings = (hearingsData.data || []).map((h: any) => {
          // Extract date and time from hearing_date timestamp (critical fix!)
          let dateStr = '';
          let timeStr = '10:00';
          
          if (h.hearing_date) {
            const hearingDateTime = new Date(h.hearing_date);
            dateStr = hearingDateTime.toISOString().split('T')[0]; // "2025-11-12"
            // Extract time in UTC to match how it was stored (avoid local timezone conversion)
            timeStr = hearingDateTime.toISOString().split('T')[1].slice(0, 5); // "14:00" stays "14:00"
          }
          
          return {
            ...h,
            // Map hearing_date to date field (critical for HearingModal!)
            date: dateStr || h.date,
            // Map hearing_date time to start_time  
            start_time: timeStr || h.start_time || h.time || '10:00',
            end_time: h.end_time || '11:00',
            // Map court_id with fallback
            case_id: h.case_id || h.caseId,
            court_id: h.court_id || h.courtId,
            // Handle judge_name which can be UUID or name string
            judge_ids: h.judge_ids || (h.judge_name && isValidUUID(h.judge_name) ? [h.judge_name] : []),
            judge_name: h.judge_name,
            // Timezone and audit fields
            timezone: h.timezone || 'Asia/Kolkata',
            created_by: h.created_by || user.id,
            created_at: h.created_at || h.createdDate,
            updated_at: h.updated_at || h.lastUpdated,
          };
        });

        const documents = (documentsData.data || []).map((d: any) => {
          const uploadedById = d.uploaded_by || d.uploaded_by_id || d.uploadedById || '';
          const uploadedByName = uploadedById 
            ? (employeesMap.get(uploadedById) || 'Unknown')
            : 'Unknown';
          
          return {
            // Primary UI display fields (NO spread to avoid snake_case contamination!)
            id: d.id,
            name: d.file_name || 'Unnamed Document',
            type: d.file_type || 'pdf',
            size: d.file_size || 0,
            path: d.file_path || '',
            
            // Backend persistence fields (camelCase for SupabaseAdapter)
            fileName: d.file_name,
            fileType: d.file_type,
            fileSize: d.file_size,
            filePath: d.file_path,
            mimeType: d.mime_type,
            storageUrl: d.storage_url,
            
            // Association fields - MUST use camelCase for UI
            caseId: d.case_id || '',
            clientId: d.client_id || '',
            folderId: d.folder_id || '',
            hearingId: d.hearing_id || '',
            taskId: d.task_id || '',
            
            // Metadata fields
            category: d.category,
            uploadedById,
            uploadedByName,
            uploadedAt: d.upload_timestamp || d.created_at || '',
            uploadTimestamp: d.upload_timestamp || d.created_at,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
            
            // UI state fields
            tags: [],
            isShared: false,
          };
        });
        
        console.log('[DataInitializer] Documents loaded:', {
          count: documents.length,
          sample: documents[0] ? {
            id: documents[0].id,
            name: documents[0].name,
            caseId: documents[0].caseId,
            size: documents[0].size,
            uploadedByName: documents[0].uploadedByName
          } : null
        });

        const employees = (employeesData.data || []).map((e: any) => ({
          ...e,
          full_name: e.full_name || e.name,
          date_of_joining: e.date_of_joining || e.dateOfJoining,
          workloadCapacity: e.workload_capacity || e.workloadCapacity || 40,
          managerId: e.manager_id || e.managerId,
          reportingTo: e.reporting_to || e.reportingTo, // Critical for hierarchy display
          tenantId: e.tenant_id || e.tenantId,
          addressId: e.address_id || e.addressId,
          status: e.status || 'Active', // Ensure status is always set
          // Access & Visibility fields
          dataScope: e.data_scope || e.dataScope || 'Own Cases',
          moduleAccess: e.module_access || e.moduleAccess,
          aiAccess: e.ai_access ?? e.aiAccess ?? true,
          whatsappAccess: e.whatsapp_access ?? e.whatsappAccess ?? false,
          // Employment fields
          designation: e.designation,
          employmentType: e.employment_type || e.employmentType,
          confirmationDate: e.confirmation_date || e.confirmationDate,
          weeklyOff: e.weekly_off || e.weeklyOff,
          weeklyOffDays: e.weekly_off_days || e.weeklyOffDays || [],
          workShift: e.work_shift || e.workShift,
          employeeCode: e.employee_code || e.employeeCode,
          // Billing fields
          billingRate: e.billing_rate || e.billingRate,
          billable: e.billable ?? true,
          incentiveEligible: e.incentive_eligible ?? e.incentiveEligible,
          defaultTaskCategory: e.default_task_category || e.defaultTaskCategory,
        }));
        
        // Data integrity verification for hierarchy
        const employeesWithReportingTo = employees.filter((e: any) => e.reportingTo);
        const employeeIds = new Set(employees.map((e: any) => e.id));
        const managersReferenced = new Set(employeesWithReportingTo.map((e: any) => e.reportingTo));
        const missingManagers = [...managersReferenced].filter(id => !employeeIds.has(id));
        
        console.log('[DataInitializer] Employees loaded with COMPLETE hierarchy verification:', {
          totalCount: employees.length,
          activeCount: employees.filter((e: any) => e.status?.toLowerCase() === 'active').length,
          withReportingTo: employeesWithReportingTo.length,
          uniqueManagersReferenced: managersReferenced.size,
          missingManagers: missingManagers.length > 0 ? missingManagers : 'None - all managers present',
          hierarchyRelationships: employeesWithReportingTo.map((e: any) => {
            const manager = employees.find((m: any) => m.id === e.reportingTo);
            return {
              employee: e.full_name,
              reportsTo: manager?.full_name || `MISSING MANAGER: ${e.reportingTo}`,
              managerId: e.reportingTo
            };
          })
        });

        const courts = (courtsData.data || []).map((c: any) => {
          // Parse address if stored as JSON string
          let parsedAddress = c.address;
          if (typeof c.address === 'string' && c.address.trim().startsWith('{')) {
            try {
              parsedAddress = JSON.parse(c.address);
            } catch {
              // Keep as string if not valid JSON
            }
          }
          
          return {
            ...c,
            activeCases: c.active_cases || c.activeCases || 0,
            avgHearingTime: c.avg_hearing_time || c.avgHearingTime || 'N/A',
            digitalFiling: c.digital_filing || c.digitalFiling || false,
            digitalFilingPortal: c.digital_filing_portal || c.digitalFilingPortal,
            digitalFilingPortalUrl: c.digital_filing_portal_url || c.digitalFilingPortalUrl,
            digitalFilingInstructions: c.digital_filing_instructions || c.digitalFilingInstructions,
            workingDays: c.working_days || c.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            addressId: c.address_id || c.addressId,
            benchLocation: c.bench_location || c.benchLocation,
            authorityLevel: c.level || c.authority_level || c.authorityLevel,
            // Tax jurisdiction and officer designation mapping
            taxJurisdiction: c.tax_jurisdiction || c.taxJurisdiction,
            officerDesignation: c.officer_designation || c.officerDesignation,
            // Parsed address (handles JSON string format)
            address: parsedAddress,
            // Additional fields for complete mapping
            phone: c.phone || '',
            email: c.email || '',
            city: c.city || '',
            state: normalizeStateId(c.state || ''),
            jurisdiction: c.jurisdiction || '',
            status: c.status || 'Active',
            code: c.code || '',
            establishedYear: c.established_year || c.establishedYear,
          };
        });

        const judges = (judgesData.data || []).map((j: any) => ({
          ...j,
          courtId: j.court_id || j.courtId,
          appointmentDate: j.appointment_date || j.appointmentDate,
          retirementDate: j.retirement_date || j.retirementDate,
          yearsOfService: j.years_of_service || j.yearsOfService,
          specialization: j.specialization || [],
          photoUrl: j.photo_url || j.photoUrl,
          addressId: j.address_id || j.addressId,
          memberType: j.member_type || j.memberType,
          authorityLevel: j.authority_level || j.authorityLevel,
          createdAt: j.created_at || j.createdAt,
          updatedAt: j.updated_at || j.updatedAt,
          createdBy: j.created_by || j.createdBy,
          updatedBy: j.updated_by || j.updatedBy,
          // Additional fields for complete mapping
          phone: j.phone || '',
          email: j.email || '',
          city: j.city || '',
          state: normalizeStateId(j.state || ''),
          jurisdiction: j.jurisdiction || '',
          chambers: j.chambers || '',
          bench: j.bench || '',
          status: j.status || 'Active',
          notes: j.notes || '',
        }));

        // Compute document counts per folder from loaded documents
        const documentCountByFolder = new Map<string, number>();
        const folderSizeMap = new Map<string, number>();
        documents.forEach(doc => {
          if (doc.folderId) {
            documentCountByFolder.set(doc.folderId, (documentCountByFolder.get(doc.folderId) || 0) + 1);
            folderSizeMap.set(doc.folderId, (folderSizeMap.get(doc.folderId) || 0) + (doc.size || 0));
          }
        });

        // Transform folders data with computed document counts
        const folders = (foldersData.data || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          description: f.description || '',
          path: f.path,
          parentId: f.parent_id,
          isDefault: f.is_default,
          caseId: f.case_id,
          createdAt: f.created_at,
          updatedAt: f.updated_at,
          lastAccess: f.updated_at || f.created_at,
          documentCount: documentCountByFolder.get(f.id) || 0,
          size: folderSizeMap.get(f.id) || 0
        }));

        // Transform timeline entries data
        const timelineEntries = (timelineData.data || []).map((t: any) => ({
          id: t.id,
          caseId: t.case_id,
          tenantId: t.tenant_id,
          type: t.type,
          title: t.title,
          description: t.description,
          createdBy: t.created_by_name || 'Unknown', // For UI backwards compatibility
          createdById: t.created_by,
          createdByName: t.created_by_name,
          createdAt: t.created_at,
          metadata: t.metadata || {}
        }));

        // Transform task follow-ups data
        const taskFollowUps = (taskFollowUpsData.data || []).map((f: any) => ({
          id: f.id,
          taskId: f.task_id || f.taskId,
          remarks: f.remarks || '',
          outcome: f.outcome,
          status: f.status,
          hoursLogged: f.hours_logged || f.hoursLogged,
          workDate: f.work_date || f.workDate,
          nextFollowUpDate: f.next_follow_up_date || f.nextFollowUpDate,
          nextActions: f.next_actions || f.nextActions,
          blockers: f.blockers,
          supportNeeded: f.support_needed || f.supportNeeded,
          escalationRequested: f.escalation_requested || f.escalationRequested,
          attachments: f.attachments,
          createdBy: f.created_by || f.createdBy,
          createdByName: f.created_by_name || f.createdByName || '',
          createdAt: f.created_at || f.createdAt,
          clientInteraction: f.client_interaction || f.clientInteraction,
          internalReview: f.internal_review || f.internalReview,
        }));

        // Dispatch RESTORE_STATE action
        dispatch({
          type: 'RESTORE_STATE',
          payload: {
            clients,
            clientGroups,
            cases,
            tasks,
            taskNotes: [],
            taskFollowUps,
            hearings,
            documents,
            employees,
            courts,
            judges,
            folders,
            timelineEntries
          },
        });

        // Mark data as loaded for this tenant
        globalDataLoaded = true;
        globalLoadedTenantId = tenantId;

        console.log('[DataInitializer] ✅ Data loaded successfully:', {
          clients: clients.length,
          clientGroups: clientGroups.length,
          cases: cases.length,
          tasks: tasks.length,
          hearings: hearings.length,
          documents: documents.length,
          employees: employees.length,
          courts: courts.length,
          judges: judges.length,
          folders: folders.length,
          timelineEntries: timelineEntries.length
        });

        toast.success('Data loaded successfully');
      } catch (err: any) {
        console.error('[DataInitializer] ❌ Error loading data:', err);
        setError(err.message);
        toast.error('Failed to load data', {
          description: err.message,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, tenantId, dispatch]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-destructive">Failed to load data</p>
          <p className="text-xs text-muted-foreground">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-primary underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
