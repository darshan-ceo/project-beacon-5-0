import { supabase } from '@/integrations/supabase/client';
import { normalizePhone } from '@/utils/phoneUtils';

export interface DuplicateMatch {
  entityName: string;
  moduleName: 'Contact' | 'Employee' | 'Client' | 'Court' | 'Judge' | 'Profile' | 'Signatory';
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
        
        const phones = contact.phones as Array<{ countryCode?: string; number?: string; phone?: string }> | null;
        if (phones && Array.isArray(phones)) {
          for (const phone of phones) {
            // Handle both old format { phone: "xxx" } and new format { countryCode, number }
            const phoneNumber = phone.number || phone.phone || '';
            const phoneCountryCode = phone.countryCode || countryCode; // Default to input country code
            
            if (phoneNumber && normalizePhone(phoneCountryCode, phoneNumber) === normalizedPhone) {
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
        
        // Clean mobile number - strip any existing formatting and leading zeros
        const cleanMobile = emp.mobile?.replace(/\D/g, '').replace(/^0+/, '') || '';
        if (!cleanMobile) continue;
        
        // Try matching with both: the input country code AND default +91
        const empNormalizedWithInputCode = normalizePhone(countryCode, cleanMobile);
        const empNormalizedWithDefault = normalizePhone('+91', cleanMobile);
        
        if (empNormalizedWithInputCode === normalizedPhone || 
            empNormalizedWithDefault === normalizedPhone) {
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
        
        // Clean phone number - strip any existing formatting and leading zeros
        const cleanPhone = client.phone?.replace(/\D/g, '').replace(/^0+/, '') || '';
        if (!cleanPhone) continue;
        
        // Try matching with both: the input country code AND default +91
        const clientNormalizedWithInputCode = normalizePhone(countryCode, cleanPhone);
        const clientNormalizedWithDefault = normalizePhone('+91', cleanPhone);
        
        if (clientNormalizedWithInputCode === normalizedPhone ||
            clientNormalizedWithDefault === normalizedPhone) {
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
        
        // Clean phone number - strip any existing formatting and leading zeros
        const cleanCourtPhone = court.phone?.replace(/\D/g, '').replace(/^0+/, '') || '';
        if (!cleanCourtPhone) continue;
        
        // Try matching with both: the input country code AND default +91
        const courtNormalizedWithInputCode = normalizePhone(countryCode, cleanCourtPhone);
        const courtNormalizedWithDefault = normalizePhone('+91', cleanCourtPhone);
        
        if (courtNormalizedWithInputCode === normalizedPhone ||
            courtNormalizedWithDefault === normalizedPhone) {
          matches.push({
            entityName: court.name,
            moduleName: 'Court',
            entityId: court.id
          });
        }
      }
    }

    // Check signatories stored in clients.signatories JSONB column
    const { data: clientsWithSignatories } = await supabase
      .from('clients')
      .select('id, display_name, signatories')
      .not('signatories', 'is', null);

    if (clientsWithSignatories) {
      for (const client of clientsWithSignatories) {
        const signatories = client.signatories as Array<{
          id?: string;
          fullName?: string;
          phones?: Array<{ countryCode?: string; number?: string; phone?: string }>;
        }> | null;
        
        if (signatories && Array.isArray(signatories)) {
          for (const sig of signatories) {
            if (excludeEntityId && sig.id === excludeEntityId) continue;
            
            if (sig.phones && Array.isArray(sig.phones)) {
              let foundMatch = false;
              for (const phone of sig.phones) {
                const phoneNumber = phone.number || phone.phone || '';
                const phoneCountryCode = phone.countryCode || countryCode;
                
                if (phoneNumber) {
                  const cleanNumber = phoneNumber.replace(/\D/g, '').replace(/^0+/, '');
                  const sigNormalizedWithInputCode = normalizePhone(phoneCountryCode, cleanNumber);
                  const sigNormalizedWithDefault = normalizePhone('+91', cleanNumber);
                  
                  if (sigNormalizedWithInputCode === normalizedPhone ||
                      sigNormalizedWithDefault === normalizedPhone) {
                    matches.push({
                      entityName: `${sig.fullName || 'Unknown'} (${client.display_name})`,
                      moduleName: 'Signatory',
                      entityId: sig.id || client.id
                    });
                    foundMatch = true;
                    break;
                  }
                }
              }
              if (foundMatch) break;
            }
          }
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
