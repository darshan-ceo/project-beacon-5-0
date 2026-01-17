import { supabase } from '@/integrations/supabase/client';

export interface DuplicateMatch {
  entityName: string;
  moduleName: 'Contact' | 'Employee' | 'Client' | 'Signatory';
  entityId: string;
}

export interface EmailDuplicateCheckResult {
  found: boolean;
  matches: DuplicateMatch[];
}

/**
 * Check for duplicate emails across all modules
 */
export const checkEmailDuplicate = async (
  email: string,
  excludeEntityId?: string
): Promise<EmailDuplicateCheckResult> => {
  const normalizedEmail = email.toLowerCase().trim();
  
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { found: false, matches: [] };
  }

  const matches: DuplicateMatch[] = [];

  try {
    // Check client_contacts (emails is JSONB array)
    const { data: contacts } = await supabase
      .from('client_contacts')
      .select('id, name, emails')
      .not('emails', 'is', null);

    if (contacts) {
      for (const contact of contacts) {
        if (excludeEntityId && contact.id === excludeEntityId) continue;
        
        const emails = contact.emails as Array<{ email: string }> | null;
        if (emails && Array.isArray(emails)) {
          for (const e of emails) {
            if (e.email?.toLowerCase().trim() === normalizedEmail) {
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

    // Check employees (email and official_email fields)
    const { data: employees } = await supabase
      .from('employees')
      .select('id, full_name, email, official_email');

    if (employees) {
      for (const emp of employees) {
        if (excludeEntityId && emp.id === excludeEntityId) continue;
        
        if (emp.email?.toLowerCase().trim() === normalizedEmail ||
            emp.official_email?.toLowerCase().trim() === normalizedEmail) {
          matches.push({
            entityName: emp.full_name,
            moduleName: 'Employee',
            entityId: emp.id
          });
        }
      }
    }

    // Check clients (email field)
    const { data: clients } = await supabase
      .from('clients')
      .select('id, display_name, email')
      .not('email', 'is', null);

    if (clients) {
      for (const client of clients) {
        if (excludeEntityId && client.id === excludeEntityId) continue;
        
        if (client.email?.toLowerCase().trim() === normalizedEmail) {
          matches.push({
            entityName: client.display_name,
            moduleName: 'Client',
            entityId: client.id
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
    console.error('Error checking email duplicates:', error);
    return { found: false, matches: [] };
  }
};

/**
 * Debounced version of duplicate check
 */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export const checkEmailDuplicateDebounced = (
  email: string,
  callback: (result: EmailDuplicateCheckResult) => void,
  excludeEntityId?: string,
  debounceMs: number = 300
): void => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(async () => {
    const result = await checkEmailDuplicate(email, excludeEntityId);
    callback(result);
  }, debounceMs);
};

/**
 * Cancel any pending duplicate check
 */
export const cancelPendingEmailDuplicateCheck = (): void => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
};
