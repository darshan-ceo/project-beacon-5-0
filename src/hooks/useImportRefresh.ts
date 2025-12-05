import { useCallback } from 'react';
import { useAppState, Court, Judge, Client, Employee } from '@/contexts/AppStateContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to reload entity data from Supabase after import
 * This ensures imported data appears immediately without page refresh
 */
export function useImportRefresh() {
  const { state, dispatch } = useAppState();

  const reloadCourts = useCallback(async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', session.session.user.id)
        .single();

      if (!profile?.tenant_id) return;

      const { data: courts, error } = await supabase
        .from('courts')
        .select('*')
        .eq('tenant_id', profile.tenant_id);

      if (error) throw error;

      // Get existing court IDs to avoid duplicates
      const existingIds = new Set(state.courts.map(c => c.id));

      // Add only new courts
      courts?.forEach(court => {
        if (!existingIds.has(court.id)) {
          dispatch({
            type: 'ADD_COURT',
            payload: {
              id: court.id,
              name: court.name,
              type: court.type || '',
              jurisdiction: court.jurisdiction || '',
              address: court.address || '',
              phone: court.phone || '',
              email: court.email || '',
              benchLocation: court.bench_location || '',
              city: court.city || '',
              state: court.state || '',
              status: court.status || 'Active',
              authorityLevel: court.level || '',
              code: court.code || '',
              establishedYear: court.established_year,
              activeCases: 0,
              avgHearingTime: '',
              digitalFiling: false,
              workingDays: '',
            } as unknown as Court
          });
        }
      });
    } catch (error) {
      console.error('Failed to reload courts:', error);
    }
  }, [dispatch, state.courts]);

  const reloadJudges = useCallback(async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', session.session.user.id)
        .single();

      if (!profile?.tenant_id) return;

      const { data: judges, error } = await supabase
        .from('judges')
        .select('*')
        .eq('tenant_id', profile.tenant_id);

      if (error) throw error;

      const existingIds = new Set(state.judges.map(j => j.id));

      judges?.forEach(judge => {
        if (!existingIds.has(judge.id)) {
          dispatch({
            type: 'ADD_JUDGE',
            payload: {
              id: judge.id,
              name: judge.name,
              courtId: judge.court_id || '',
              designation: judge.designation || '',
              specialization: judge.specialization || [],
              appointmentDate: judge.appointment_date || '',
              retirementDate: judge.retirement_date || '',
              chambers: judge.chambers || '',
              phone: judge.phone || '',
              email: judge.email || '',
              status: judge.status || 'Active',
              notes: judge.notes || '',
              bench: judge.bench || '',
              city: judge.city || '',
              state: judge.state || '',
              jurisdiction: judge.jurisdiction || '',
            } as unknown as Judge
          });
        }
      });
    } catch (error) {
      console.error('Failed to reload judges:', error);
    }
  }, [dispatch, state.judges]);

  const reloadClients = useCallback(async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', session.session.user.id)
        .single();

      if (!profile?.tenant_id) return;

      const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .eq('tenant_id', profile.tenant_id);

      if (error) throw error;

      const existingIds = new Set(state.clients.map(c => c.id));

      clients?.forEach(client => {
        if (!existingIds.has(client.id)) {
          const status = client.status === 'active' ? 'Active' : client.status === 'inactive' ? 'Inactive' : (client.status || 'Active');
          dispatch({
            type: 'ADD_CLIENT',
            payload: {
              id: client.id,
              name: client.display_name,
              type: client.type || 'Other',
              gstin: client.gstin || '',
              pan: client.pan || '',
              email: client.email || '',
              phone: client.phone || '',
              address: typeof client.address === 'object' && client.address !== null && !Array.isArray(client.address) ? client.address : {},
              city: client.city || '',
              state: client.state || '',
              status: status,
              signatories: Array.isArray(client.signatories) ? client.signatories : [],
              jurisdiction: typeof client.jurisdiction === 'object' && client.jurisdiction !== null && !Array.isArray(client.jurisdiction) ? client.jurisdiction : {},
              clientGroupId: client.client_group_id || '',
              assignedCAId: '',
              assignedCAName: '',
            } as unknown as Client
          });
        }
      });
    } catch (error) {
      console.error('Failed to reload clients:', error);
    }
  }, [dispatch, state.clients]);

  const reloadEmployees = useCallback(async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', session.session.user.id)
        .single();

      if (!profile?.tenant_id) return;

      const { data: employees, error } = await supabase
        .from('employees')
        .select('*, profiles!inner(full_name, phone)')
        .eq('tenant_id', profile.tenant_id);

      if (error) throw error;

      const existingIds = new Set(state.employees.map(e => e.id));

      employees?.forEach((emp: any) => {
        if (!existingIds.has(emp.id)) {
          dispatch({
            type: 'ADD_EMPLOYEE',
            payload: {
              id: emp.id,
              employeeCode: emp.employee_code,
              full_name: emp.profiles?.full_name || emp.full_name,
              email: emp.email,
              mobile: emp.mobile || emp.profiles?.phone,
              role: emp.role,
              status: emp.status || 'Active',
              department: emp.department,
              designation: emp.designation,
              date_of_joining: emp.date_of_joining,
              workloadCapacity: emp.workload_capacity || 40,
            } as unknown as Employee
          });
        }
      });
    } catch (error) {
      console.error('Failed to reload employees:', error);
    }
  }, [dispatch, state.employees]);

  return {
    reloadCourts,
    reloadJudges,
    reloadClients,
    reloadEmployees,
  };
}
