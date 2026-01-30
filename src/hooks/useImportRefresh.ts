import { useCallback } from 'react';
import { useAppState, Court, Judge, Client, Employee } from '@/contexts/AppStateContext';
import { supabase } from '@/integrations/supabase/client';

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

      console.log('[useImportRefresh] Courts loaded from DB:', courts?.length);

      // Get existing court IDs to avoid duplicates
      const existingIds = new Set(state.courts.map(c => c.id));

      // Add only new courts
      courts?.forEach(court => {
        if (!existingIds.has(court.id)) {
          console.log('[useImportRefresh] Adding court:', court.name, 'phone:', court.phone, 'email:', court.email, 'city:', court.city, 'state:', court.state);
          dispatch({
            type: 'ADD_COURT',
            payload: {
              id: court.id,
              name: court.name,
              type: court.type || '',
              jurisdiction: court.jurisdiction || '',
              address: '', // Address fields removed from DB
              phone: court.phone || '',
              email: court.email || '',
              benchLocation: court.bench_location || '',
              city: court.city || '',
              state: normalizeStateId(court.state || ''),
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
          console.log('[useImportRefresh] Adding judge:', judge.name, 'phone:', judge.phone, 'email:', judge.email);
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
              state: normalizeStateId(judge.state || ''),
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
              portalAccess: client.portal_access 
                ? (typeof client.portal_access === 'string' ? JSON.parse(client.portal_access) : client.portal_access)
                : { allowLogin: false },
              dataScope: client.data_scope || 'TEAM',
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
