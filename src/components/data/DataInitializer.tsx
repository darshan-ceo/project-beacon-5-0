import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppState } from '@/contexts/AppStateContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { normalizeStage } from '@/utils/stageUtils';
import { calculateSLAStatus } from '@/services/slaService';

// Global flags to persist data loaded state across component remounts
// This prevents the "Loading your data..." screen from appearing when switching tabs
let globalDataLoaded = false;
let globalLoadedTenantId: string | null = null;

/**
 * DataInitializer Component
 * 
 * Loads all entity data from Supabase into AppStateContext on app startup.
 * Waits for authentication to complete before loading tenant-specific data.
 * Uses global flags to prevent unnecessary reloads on tab switch/remount.
 */
export const DataInitializer = ({ children }: { children: React.ReactNode }) => {
  const { user, tenantId } = useAuth();
  const { dispatch } = useAppState();
  
  // Only show loading if data hasn't been loaded for this tenant yet
  const [isLoading, setIsLoading] = useState(
    !globalDataLoaded || globalLoadedTenantId !== tenantId
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!user || !tenantId) {
        console.log('[DataInitializer] Waiting for authentication...', { user: !!user, tenantId });
        setIsLoading(false);
        return;
      }

      // Skip reload if data was already loaded for this tenant
      if (globalDataLoaded && globalLoadedTenantId === tenantId) {
        console.log('[DataInitializer] Data already loaded for tenant, skipping reload');
        setIsLoading(false);
        return;
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
          timelineData
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
          supabase.from('timeline_entries').select('*').eq('tenant_id', tenantId)
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
          timelineData.error
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
          assignedCAId: c.assigned_ca_id || c.assignedCAId,
          assignedCAName: c.assigned_ca_name || c.assignedCAName,
          clientGroupId: c.client_group_id || c.clientGroupId,
          createdAt: c.created_at || c.createdAt,
          updatedAt: c.updated_at || c.updatedAt,
          // Parse signatories from JSON string
          signatories: c.signatories ? (typeof c.signatories === 'string' ? JSON.parse(c.signatories) : c.signatories) : [],
          // Parse address from JSON string
          address: c.address ? (typeof c.address === 'string' ? JSON.parse(c.address) : c.address) : undefined,
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

        const cases = (casesData.data || []).map((c: any) => {
          // Normalize status: 'open'/'Open' → 'Active'
          const normalizedStatus = ['open', 'Open', 'active', 'Active'].includes(c.status) 
            ? 'Active' 
            : c.status || 'Active';
          
          // Build case object with proper field mapping
          const caseObj = {
            ...c,
            caseNumber: c.case_number || c.caseNumber,
            clientId: c.client_id || c.clientId,
            status: normalizedStatus,
            currentStage: normalizeStage(c.stage_code || c.current_stage || c.currentStage || 'Assessment'),
            assignedToId: c.assigned_to || c.assigned_to_id || c.assignedToId,
            assignedToName: c.assigned_to_name || c.assignedToName,
            createdDate: c.created_date || c.created_at || c.createdDate,
            lastUpdated: c.last_updated || c.updated_at || c.lastUpdated,
            generatedForms: c.generated_forms || c.generatedForms || [],
            amountInDispute: c.amount_in_dispute || c.amountInDispute,
            stateBenchState: c.state_bench_state || c.stateBenchState,
            stateBenchCity: c.state_bench_city || c.stateBenchCity,
            // New fields from migration
            caseType: c.case_type || c.caseType,
            caseYear: c.case_year || c.caseYear,
            caseSequence: c.case_sequence || c.caseSequence,
            officeFileNo: c.office_file_no || c.officeFileNo,
            issueType: c.issue_type || c.issueType,
            formType: c.form_type || c.formType,
            sectionInvoked: c.section_invoked || c.sectionInvoked,
            financialYear: c.financial_year || c.financialYear,
          };
          
          // Auto-calculate timeline breach status using SLA service
          const timelineBreachStatus = calculateSLAStatus(caseObj as any);
          
          return {
            ...caseObj,
            timelineBreachStatus,
          };
        });

        const tasks = (tasksData.data || []).map((t: any) => ({
          ...t,
          caseId: t.case_id || t.caseId,
          clientId: t.client_id || t.clientId,
          caseNumber: t.case_number || t.caseNumber,
          assignedToId: t.assigned_to || t.assigned_to_id || t.assignedToId,
          assignedToName: t.assigned_to_name || t.assignedToName,
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
        }));


        const hearings = (hearingsData.data || []).map((h: any) => ({
          ...h,
          case_id: h.case_id || h.caseId,
          court_id: h.court_id || h.courtId,
          judge_ids: h.judge_ids || (h.judgeId ? [h.judgeId] : []),
          start_time: h.start_time || h.time || '10:00',
          end_time: h.end_time || '11:00',
          timezone: h.timezone || 'Asia/Kolkata',
          created_by: h.created_by || user.id,
          created_at: h.created_at || h.createdDate,
          updated_at: h.updated_at || h.lastUpdated,
        }));

        const documents = (documentsData.data || []).map((d: any) => ({
          ...d,
          // Primary UI display fields
          id: d.id,
          name: d.file_name || d.name || 'Unnamed Document',
          type: d.file_type || d.type || 'pdf',
          size: d.file_size || d.size || 0,
          path: d.file_path || d.path || '',
          
          // Backend persistence fields (camelCase for SupabaseAdapter)
          fileName: d.file_name,
          fileType: d.file_type,
          fileSize: d.file_size,
          filePath: d.file_path,
          mimeType: d.mime_type,
          storageUrl: d.storage_url,
          
          // Association fields
          caseId: d.case_id || d.caseId,
          clientId: d.client_id || d.clientId,
          folderId: d.folder_id || d.folderId,
          hearingId: d.hearing_id || d.hearingId,
          taskId: d.task_id || d.taskId,
          
          // Metadata fields
          category: d.category,
          uploadedById: d.uploaded_by || d.uploaded_by_id || d.uploadedById,
          uploadedByName: d.uploaded_by_name || d.uploadedByName || 'Unknown',
          uploadedAt: d.upload_timestamp || d.uploaded_at || d.uploadedAt || d.created_at,
          uploadTimestamp: d.upload_timestamp || d.uploaded_at || d.created_at,
          createdAt: d.created_at || d.createdAt,
          updatedAt: d.updated_at || d.updatedAt,
          
          // UI state fields
          tags: d.tags || [],
          isShared: d.is_shared || d.isShared || false,
        }));

        const employees = (employeesData.data || []).map((e: any) => ({
          ...e,
          full_name: e.full_name || e.name,
          date_of_joining: e.date_of_joining || e.dateOfJoining,
          workloadCapacity: e.workload_capacity || e.workloadCapacity || 40,
          managerId: e.manager_id || e.managerId,
          tenantId: e.tenant_id || e.tenantId,
          addressId: e.address_id || e.addressId,
        }));

        const courts = (courtsData.data || []).map((c: any) => ({
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
        }));

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
        }));

        // Transform folders data
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
          lastAccess: f.updated_at || f.created_at, // Use updated_at as lastAccess
          documentCount: 0, // Will be computed client-side from documents
          size: 0 // Will be computed client-side from documents
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

        // Dispatch RESTORE_STATE action
        dispatch({
          type: 'RESTORE_STATE',
          payload: {
            clients,
            clientGroups,
            cases,
            tasks,
            taskNotes: [],
            taskFollowUps: [],
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
