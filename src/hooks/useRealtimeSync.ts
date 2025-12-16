import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppState } from '@/contexts/AppStateContext';
import { RealtimeChannel } from '@supabase/supabase-js';
import { normalizeStage } from '@/utils/stageUtils';

/**
 * Hook for real-time data synchronization across clients
 * Subscribes to postgres_changes for core tables and updates React context
 */
export const useRealtimeSync = () => {
  const { dispatch, rawDispatch, state } = useAppState();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Get tenant ID from auth session
  useEffect(() => {
    const getTenantId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Get tenant_id from user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', session.user.id)
          .single();
        
        if (profile?.tenant_id) {
          setTenantId(profile.tenant_id);
        }
      }
    };

    getTenantId();
  }, []);

  useEffect(() => {
    if (!tenantId) {
      console.log('[Realtime] No tenant ID, skipping sync');
      return;
    }

    console.log('[Realtime] Initializing real-time sync for tenant:', tenantId);

    // Create a single channel for all table subscriptions
    const channel = supabase
      .channel('data_sync')
      // Cases
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cases',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          console.log('[Realtime] Cases change:', payload.eventType, payload);
          if (payload.eventType === 'INSERT' && payload.new) {
            const caseData = payload.new as any;
            // Derive assignedToName from employees state
            const employee = state.employees.find(e => e.id === caseData.assigned_to);
            rawDispatch({ 
              type: 'ADD_CASE', 
              payload: {
                ...caseData,
                assignedToId: caseData.assigned_to,
                assignedToName: employee?.full_name || '',
                caseNumber: caseData.case_number,
                clientId: caseData.client_id,
                currentStage: normalizeStage(caseData.stage_code || caseData.current_stage || 'Assessment'),
                officeFileNo: caseData.office_file_no || caseData.officeFileNo,
                noticeNo: caseData.notice_no || caseData.noticeNo,
                city: caseData.city,
                authorityId: caseData.authority_id || caseData.authorityId,
                forumId: caseData.forum_id || caseData.forumId,
                caseType: caseData.case_type || caseData.caseType,
                caseYear: caseData.case_year || caseData.caseYear,
                caseSequence: caseData.case_sequence || caseData.caseSequence,
                issueType: caseData.issue_type || caseData.issueType,
                formType: caseData.form_type || caseData.formType,
                sectionInvoked: caseData.section_invoked || caseData.sectionInvoked,
                financialYear: caseData.financial_year || caseData.financialYear,
                noticeDate: caseData.notice_date || caseData.noticeDate,
                noticeType: caseData.notice_type || caseData.noticeType,
                replyDueDate: caseData.reply_due_date || caseData.replyDueDate,
                taxDemand: caseData.tax_demand || caseData.taxDemand,
                interestAmount: caseData.interest_amount || caseData.interestAmount,
                penaltyAmount: caseData.penalty_amount || caseData.penaltyAmount,
                totalDemand: caseData.total_demand || caseData.totalDemand,
                stateBenchState: caseData.state_bench_state || caseData.stateBenchState,
                stateBenchCity: caseData.state_bench_city || caseData.stateBenchCity,
                nextHearingDate: caseData.next_hearing_date || caseData.nextHearingDate
              } as any 
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const caseData = payload.new as any;
            // Derive assignedToName from employees state
            const employee = state.employees.find(e => e.id === caseData.assigned_to);
            
            // Build complete payload with ALL fields mapped consistently
            // This ensures UPDATE doesn't overwrite camelCase fields with undefined
            rawDispatch({ 
              type: 'UPDATE_CASE', 
              payload: {
                id: caseData.id, // Critical for merge pattern
                // Core fields
                caseNumber: caseData.case_number || caseData.caseNumber || '',
                title: caseData.title || '',
                description: caseData.description || '',
                status: caseData.status || 'Active',
                priority: caseData.priority || 'Medium',
                
                // Assignment fields
                assignedToId: caseData.assigned_to || caseData.assignedToId || '',
                assignedToName: employee?.full_name || caseData.assigned_to_name || '',
                clientId: caseData.client_id || caseData.clientId || '',
                
                // Stage
                currentStage: normalizeStage(caseData.stage_code || caseData.current_stage || 'Assessment'),
                
                // Critical fields that were missing - WITH FALLBACKS TO EMPTY STRING
                officeFileNo: caseData.office_file_no || caseData.officeFileNo || '',
                noticeNo: caseData.notice_no || caseData.noticeNo || '',
                city: caseData.city || '',
                
                // Authority and forum
                authorityId: caseData.authority_id || caseData.authorityId || '',
                forumId: caseData.forum_id || caseData.forumId || '',
                
                // Case type and sequence
                caseType: caseData.case_type || caseData.caseType || 'GST',
                caseYear: caseData.case_year || caseData.caseYear || '',
                caseSequence: caseData.case_sequence || caseData.caseSequence || '',
                
                // Issue and form
                issueType: caseData.issue_type || caseData.issueType || '',
                formType: caseData.form_type || caseData.formType || '',
                sectionInvoked: caseData.section_invoked || caseData.sectionInvoked || '',
                financialYear: caseData.financial_year || caseData.financialYear || '',
                
                // Date fields - provide both formats for backward compatibility
                noticeDate: caseData.notice_date || caseData.noticeDate || '',
                notice_date: caseData.notice_date || caseData.noticeDate || '',
                noticeType: caseData.notice_type || caseData.noticeType || '',
                replyDueDate: caseData.reply_due_date || caseData.replyDueDate || '',
                reply_due_date: caseData.reply_due_date || caseData.replyDueDate || '',
                
                // Financial fields - default to 0
                taxDemand: caseData.tax_demand || caseData.taxDemand || 0,
                interestAmount: caseData.interest_amount || caseData.interestAmount || 0,
                interest_amount: caseData.interest_amount || caseData.interestAmount || 0,
                penaltyAmount: caseData.penalty_amount || caseData.penaltyAmount || 0,
                penalty_amount: caseData.penalty_amount || caseData.penaltyAmount || 0,
                totalDemand: caseData.total_demand || caseData.totalDemand || 0,
                total_demand: caseData.total_demand || caseData.totalDemand || 0,
                
                // State bench fields
                stateBenchState: caseData.state_bench_state || caseData.stateBenchState || '',
                stateBenchCity: caseData.state_bench_city || caseData.stateBenchCity || '',
                
                // Next hearing
                nextHearingDate: caseData.next_hearing_date || caseData.nextHearingDate || '',
                
                // Timestamps
                createdDate: caseData.created_at || caseData.createdDate || '',
                lastUpdated: caseData.updated_at || caseData.lastUpdated || ''
              } as any
            });
          } else if (payload.eventType === 'DELETE' && payload.old) {
            rawDispatch({ type: 'DELETE_CASE', payload: (payload.old as any).id });
          }
        }
      )
      // Clients
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          console.log('[Realtime] Clients change:', payload.eventType, payload);
          if (payload.eventType === 'INSERT' && payload.new) {
            // Convert Supabase format to app format - include ALL fields
            const client = {
              id: payload.new.id,
              name: payload.new.display_name,
              type: payload.new.type || 'Individual',
              gstin: payload.new.gstin,
              pan: payload.new.pan,
              email: payload.new.email,
              phone: payload.new.phone,
              status: payload.new.status === 'active' ? 'Active' : 'Inactive',
              // Parse JSONB fields
              signatories: payload.new.signatories 
                ? (typeof payload.new.signatories === 'string' 
                    ? JSON.parse(payload.new.signatories) 
                    : payload.new.signatories) 
                : [],
              address: payload.new.address 
                ? (typeof payload.new.address === 'string' 
                    ? JSON.parse(payload.new.address) 
                    : payload.new.address)
                : { city: payload.new.city, state: payload.new.state },
              jurisdiction: payload.new.jurisdiction 
                ? (typeof payload.new.jurisdiction === 'string' 
                    ? JSON.parse(payload.new.jurisdiction) 
                    : payload.new.jurisdiction)
                : {},
              // ADD MISSING FIELDS
              clientGroupId: payload.new.client_group_id,
              assignedCAId: payload.new.owner_id || '',
              createdAt: payload.new.created_at,
              updatedAt: payload.new.updated_at
            };
            rawDispatch({ type: 'ADD_CLIENT', payload: client as any });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const client = {
              id: payload.new.id,
              name: payload.new.display_name,
              display_name: payload.new.display_name,
              type: payload.new.type || 'Individual',
              gstin: payload.new.gstin,
              pan: payload.new.pan,
              email: payload.new.email,
              phone: payload.new.phone,
              city: payload.new.city,
              state: payload.new.state,
              status: payload.new.status === 'active' ? 'Active' : 'Inactive',
              // Parse JSONB fields
              signatories: payload.new.signatories 
                ? (typeof payload.new.signatories === 'string' 
                    ? JSON.parse(payload.new.signatories) 
                    : payload.new.signatories) 
                : [],
              address: payload.new.address 
                ? (typeof payload.new.address === 'string' 
                    ? JSON.parse(payload.new.address) 
                    : payload.new.address)
                : { city: payload.new.city, state: payload.new.state },
              jurisdiction: payload.new.jurisdiction 
                ? (typeof payload.new.jurisdiction === 'string' 
                    ? JSON.parse(payload.new.jurisdiction) 
                    : payload.new.jurisdiction)
                : {},
              // All additional fields
              clientGroupId: payload.new.client_group_id,
              assignedCAId: payload.new.owner_id || '',
              tenantId: payload.new.tenant_id,
              createdAt: payload.new.created_at,
              updatedAt: payload.new.updated_at
            };
            rawDispatch({ type: 'UPDATE_CLIENT', payload: client as any });
          } else if (payload.eventType === 'DELETE' && payload.old) {
            rawDispatch({ type: 'DELETE_CLIENT', payload: payload.old.id });
          }
        }
      )
      // Hearings
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hearings',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          console.log('[Realtime] Hearings change:', payload.eventType, payload);
          if (payload.eventType === 'INSERT' && payload.new) {
            const hearing = {
              ...payload.new,
              date: payload.new.hearing_date?.split('T')[0],
              start_time: new Date(payload.new.hearing_date).toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit' 
              }),
              time: new Date(payload.new.hearing_date).toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit' 
              })
            };
            rawDispatch({ type: 'ADD_HEARING', payload: hearing as any });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            // Parse time from hearing_date like INSERT handler
            const hearing = {
              ...payload.new,
              date: payload.new.hearing_date?.split('T')[0],
              start_time: payload.new.hearing_date 
                ? new Date(payload.new.hearing_date).toLocaleTimeString('en-US', { 
                    hour12: false, 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })
                : payload.new.start_time,
              time: payload.new.hearing_date 
                ? new Date(payload.new.hearing_date).toLocaleTimeString('en-US', { 
                    hour12: false, 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })
                : payload.new.time
            };
            rawDispatch({ type: 'UPDATE_HEARING', payload: hearing as any });
          } else if (payload.eventType === 'DELETE' && payload.old) {
            rawDispatch({ type: 'DELETE_HEARING', payload: payload.old.id });
          }
        }
      )
      // Tasks
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          console.log('[Realtime] Tasks change:', payload.eventType, payload);
          if (payload.eventType === 'INSERT' && payload.new) {
            const taskData = payload.new as any;
            // Derive assignedToName from employees state
            const employee = state.employees.find(e => e.id === taskData.assigned_to);
            rawDispatch({ 
              type: 'ADD_TASK', 
              payload: {
                ...taskData,
                caseId: taskData.case_id,
                clientId: taskData.client_id,
                assignedToId: taskData.assigned_to,
                assignedToName: employee?.full_name || '',
                assignedById: taskData.assigned_by,
                hearingId: taskData.hearing_id,
                bundleId: taskData.bundle_id,
                dueDate: taskData.due_date,
                completedDate: taskData.completed_date,
                caseNumber: taskData.case_number,
                estimatedHours: taskData.estimated_hours,
                actualHours: taskData.actual_hours,
                isAutoGenerated: taskData.is_auto_generated,
                escalationLevel: taskData.escalation_level,
                dueDateValidated: taskData.due_date_validated,
                createdAt: taskData.created_at,
                updatedAt: taskData.updated_at
              }
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const taskData = payload.new as any;
            // Derive assignedToName from employees state
            const employee = state.employees.find(e => e.id === taskData.assigned_to);
            rawDispatch({ 
              type: 'UPDATE_TASK', 
              payload: {
                ...taskData,
                caseId: taskData.case_id,
                clientId: taskData.client_id,
                assignedToId: taskData.assigned_to,
                assignedToName: employee?.full_name || '',
                assignedById: taskData.assigned_by,
                hearingId: taskData.hearing_id,
                bundleId: taskData.bundle_id,
                dueDate: taskData.due_date,
                completedDate: taskData.completed_date,
                caseNumber: taskData.case_number,
                estimatedHours: taskData.estimated_hours,
                actualHours: taskData.actual_hours,
                isAutoGenerated: taskData.is_auto_generated,
                escalationLevel: taskData.escalation_level,
                dueDateValidated: taskData.due_date_validated,
                createdAt: taskData.created_at,
                updatedAt: taskData.updated_at
              }
            });
          } else if (payload.eventType === 'DELETE' && payload.old) {
            rawDispatch({ type: 'DELETE_TASK', payload: (payload.old as any).id });
          }
        }
      )
      // Documents
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          console.log('[Realtime] Documents change:', payload.eventType, payload);
          if (payload.eventType === 'INSERT' && payload.new) {
            const docData = payload.new as any;
            // Derive uploadedByName from employees state
            const uploader = state.employees.find(e => e.id === docData.uploaded_by);
            rawDispatch({ 
              type: 'ADD_DOCUMENT', 
              payload: {
                id: docData.id,
                name: docData.file_name || 'Unknown',
                type: docData.file_type || 'pdf',
                size: docData.file_size || 0,
                path: docData.file_path || '',
                caseId: docData.case_id || '',
                clientId: docData.client_id || '',
                folderId: docData.folder_id || '',
                category: docData.category,
                uploadedById: docData.uploaded_by,
                uploadedByName: uploader?.full_name || 'Unknown',
                uploadedAt: docData.upload_timestamp || docData.created_at,
                tags: [],
                isShared: false,
              }
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const docData = payload.new as any;
            // Derive uploadedByName from employees state
            const uploader = state.employees.find(e => e.id === docData.uploaded_by);
            rawDispatch({ 
              type: 'UPDATE_DOCUMENT', 
              payload: {
                id: docData.id,
                name: docData.file_name || 'Unknown',
                type: docData.file_type || 'pdf',
                size: docData.file_size || 0,
                path: docData.file_path || '',
                caseId: docData.case_id || '',
                clientId: docData.client_id || '',
                folderId: docData.folder_id || '',
                category: docData.category,
                uploadedById: docData.uploaded_by,
                uploadedByName: uploader?.full_name || 'Unknown',
                uploadedAt: docData.upload_timestamp || docData.created_at,
              }
            });
          } else if (payload.eventType === 'DELETE' && payload.old) {
            rawDispatch({ type: 'DELETE_DOCUMENT', payload: (payload.old as any).id });
          }
        }
      )
      // Employees
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          console.log('[Realtime] Employees change:', payload.eventType, payload);
          if (payload.eventType === 'INSERT' && payload.new) {
            const empData = payload.new as any;
            rawDispatch({ 
              type: 'ADD_EMPLOYEE', 
              payload: {
                ...empData,
                full_name: empData.full_name || empData.name,
                managerId: empData.manager_id || empData.managerId,
                reportingTo: empData.reporting_to || empData.reportingTo,
                workloadCapacity: empData.workload_capacity || empData.workloadCapacity || 40,
                tenantId: empData.tenant_id || empData.tenantId,
              } as any 
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const empData = payload.new as any;
            rawDispatch({ 
              type: 'UPDATE_EMPLOYEE', 
              payload: { 
                id: empData.id, 
                updates: {
                  ...empData,
                  full_name: empData.full_name || empData.name,
                  managerId: empData.manager_id || empData.managerId,
                  reportingTo: empData.reporting_to || empData.reportingTo,
                  workloadCapacity: empData.workload_capacity || empData.workloadCapacity || 40,
                  tenantId: empData.tenant_id || empData.tenantId,
                }
              } as any 
            });
          } else if (payload.eventType === 'DELETE' && payload.old) {
            rawDispatch({ type: 'DELETE_EMPLOYEE', payload: (payload.old as any).id });
          }
        }
      )
      // Courts
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'courts',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          console.log('[Realtime] Courts change:', payload.eventType, payload);
          if (payload.eventType === 'INSERT' && payload.new) {
            rawDispatch({ type: 'ADD_COURT', payload: payload.new as any });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            rawDispatch({ type: 'UPDATE_COURT', payload: payload.new as any });
          } else if (payload.eventType === 'DELETE' && payload.old) {
            rawDispatch({ type: 'DELETE_COURT', payload: (payload.old as any).id });
          }
        }
      )
      // Judges
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'judges',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          console.log('[Realtime] Judges change:', payload.eventType, payload);
          if (payload.eventType === 'INSERT' && payload.new) {
            rawDispatch({ type: 'ADD_JUDGE', payload: payload.new as any });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            rawDispatch({ type: 'UPDATE_JUDGE', payload: payload.new as any });
          } else if (payload.eventType === 'DELETE' && payload.old) {
            rawDispatch({ type: 'DELETE_JUDGE', payload: (payload.old as any).id });
          }
        }
      )
      // Timeline Entries
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timeline_entries',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          console.log('[Realtime] Timeline change:', payload.eventType, payload);
          if (payload.eventType === 'INSERT' && payload.new) {
            // Transform snake_case to camelCase for app state
            const timelineEntry = {
              id: payload.new.id,
              caseId: payload.new.case_id,
              tenantId: payload.new.tenant_id,
              type: payload.new.type,
              title: payload.new.title,
              description: payload.new.description,
              createdBy: payload.new.created_by_name || 'Unknown',
              createdById: payload.new.created_by,
              createdByName: payload.new.created_by_name,
              createdAt: payload.new.created_at,
              metadata: payload.new.metadata || {}
            };
            rawDispatch({ type: 'ADD_TIMELINE_ENTRY', payload: timelineEntry });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const timelineEntry = {
              id: payload.new.id,
              caseId: payload.new.case_id,
              tenantId: payload.new.tenant_id,
              type: payload.new.type,
              title: payload.new.title,
              description: payload.new.description,
              createdBy: payload.new.created_by_name || 'Unknown',
              createdById: payload.new.created_by,
              createdByName: payload.new.created_by_name,
              createdAt: payload.new.created_at,
              metadata: payload.new.metadata || {}
            };
            rawDispatch({ type: 'UPDATE_TIMELINE_ENTRY', payload: timelineEntry });
          } else if (payload.eventType === 'DELETE' && payload.old) {
            rawDispatch({ type: 'DELETE_TIMELINE_ENTRY', payload: (payload.old as any).id });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('[Realtime] Unsubscribing from real-time sync');
      channel.unsubscribe();
    };
  }, [tenantId, rawDispatch, state.employees]);

  return null;
};
