import { supabase } from '@/integrations/supabase/client';
import { normalizePhone } from '@/utils/phoneUtils';

export interface DuplicateMatch {
  entityName: string;
  moduleName: 'Contact' | 'Employee' | 'Client' | 'Court' | 'Judge' | 'Profile';
  entityId: string;
}

export interface DuplicateCheckResult {
  found: boolean;
  matches: DuplicateMatch[];
}

/**
 * Check for duplicate phone numbers across all modules
 */
export const checkPhoneDuplicate = async (
  countryCode: string,
  number: string,
  excludeEntityId?: string
): Promise<DuplicateCheckResult> => {
  const normalizedPhone = normalizePhone(countryCode, number);
  
  if (!normalizedPhone || normalizedPhone.length < 8) {
    return { found: false, matches: [] };
  }

  const matches: DuplicateMatch[] = [];

  try {
    // Check client_contacts (phones is JSONB array)
    const { data: contacts } = await supabase
      .from('client_contacts')
      .select('id, name, phones')
      .not('phones', 'is', null);

    if (contacts) {
      for (const contact of contacts) {
        if (excludeEntityId && contact.id === excludeEntityId) continue;
        
        const phones = contact.phones as Array<{ countryCode: string; number: string }> | null;
        if (phones && Array.isArray(phones)) {
          for (const phone of phones) {
            if (normalizePhone(phone.countryCode || '', phone.number || '') === normalizedPhone) {
              matches.push({
                entityName: contact.name,
                moduleName: 'Contact',
                entityId: contact.id
              });
              break;
            }
          }
        }
      }
    }

    // Check employees (mobile field)
    const { data: employees } = await supabase
      .from('employees')
      .select('id, full_name, mobile')
      .not('mobile', 'is', null);

    if (employees) {
      for (const emp of employees) {
        if (excludeEntityId && emp.id === excludeEntityId) continue;
        
        // Normalize employee mobile (assuming it may or may not have country code)
        const empNormalized = emp.mobile?.startsWith('+') 
          ? emp.mobile.replace(/\D/g, '').replace(/^/, '+')
          : normalizePhone(countryCode, emp.mobile || '');
        
        if (empNormalized === normalizedPhone || 
            normalizePhone('+91', emp.mobile || '') === normalizedPhone) {
          matches.push({
            entityName: emp.full_name,
            moduleName: 'Employee',
            entityId: emp.id
          });
        }
      }
    }

    // Check clients (phone field)
    const { data: clients } = await supabase
      .from('clients')
      .select('id, display_name, phone')
      .not('phone', 'is', null);

    if (clients) {
      for (const client of clients) {
        if (excludeEntityId && client.id === excludeEntityId) continue;
        
        const clientNormalized = client.phone?.startsWith('+')
          ? client.phone.replace(/[^\d+]/g, '')
          : normalizePhone(countryCode, client.phone || '');
        
        if (clientNormalized === normalizedPhone ||
            normalizePhone('+91', client.phone || '') === normalizedPhone) {
          matches.push({
            entityName: client.display_name,
            moduleName: 'Client',
            entityId: client.id
          });
        }
      }
    }

    // Check courts (phone field)
    const { data: courts } = await supabase
      .from('courts')
      .select('id, name, phone')
      .not('phone', 'is', null);

    if (courts) {
      for (const court of courts) {
        if (excludeEntityId && court.id === excludeEntityId) continue;
        
        const courtNormalized = court.phone?.startsWith('+')
          ? court.phone.replace(/[^\d+]/g, '')
          : normalizePhone(countryCode, court.phone || '');
        
        if (courtNormalized === normalizedPhone ||
            normalizePhone('+91', court.phone || '') === normalizedPhone) {
          matches.push({
            entityName: court.name,
            moduleName: 'Court',
            entityId: court.id
          });
        }
      }
    }

    // Limit to first 3 matches for performance
    return {
      found: matches.length > 0,
      matches: matches.slice(0, 3)
    };

  } catch (error) {
    console.error('Error checking phone duplicates:', error);
    return { found: false, matches: [] };
  }
};

/**
 * Debounced version of duplicate check
 */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export const checkPhoneDuplicateDebounced = (
  countryCode: string,
  number: string,
  callback: (result: DuplicateCheckResult) => void,
  excludeEntityId?: string,
  debounceMs: number = 300
): void => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(async () => {
    const result = await checkPhoneDuplicate(countryCode, number, excludeEntityId);
    callback(result);
  }, debounceMs);
};

/**
 * Cancel any pending duplicate check
 */
export const cancelPendingDuplicateCheck = (): void => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
};
