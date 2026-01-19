/**
 * User Resolution Service
 * Resolves user UUIDs to human-readable names with roles for audit display
 */

import { supabase } from '@/integrations/supabase/client';

export interface ResolvedUser {
  id: string;
  fullName: string;
  role: string;
  displayText: string; // "Full Name (Role)"
}

// Cache for resolved users to avoid repeated lookups
const userCache = new Map<string, ResolvedUser>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cacheTimestamps = new Map<string, number>();

/**
 * Resolve a single user UUID to a human-readable display text
 */
export async function resolveUserId(userId: string): Promise<ResolvedUser | null> {
  if (!userId) return null;

  // Check cache first
  const cachedUser = userCache.get(userId);
  const cachedTime = cacheTimestamps.get(userId);
  if (cachedUser && cachedTime && Date.now() - cachedTime < CACHE_TTL) {
    return cachedUser;
  }

  try {
    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.warn('Could not resolve user:', userId, profileError);
      return null;
    }

    // Fetch user's highest role
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('is_active', true);

    let roleName = 'User';
    if (!rolesError && roles && roles.length > 0) {
      // Priority order for roles
      const rolePriority = ['admin', 'partner', 'manager', 'ca', 'advocate', 'staff', 'clerk', 'user'];
      const userRoles = roles.map(r => r.role as string);
      for (const priorityRole of rolePriority) {
        if (userRoles.includes(priorityRole)) {
          roleName = formatRoleName(priorityRole);
          break;
        }
      }
    }

    const resolvedUser: ResolvedUser = {
      id: userId,
      fullName: profile.full_name || 'Unknown',
      role: roleName,
      displayText: `${profile.full_name || 'Unknown'} (${roleName})`
    };

    // Cache the result
    userCache.set(userId, resolvedUser);
    cacheTimestamps.set(userId, Date.now());

    return resolvedUser;
  } catch (error) {
    console.error('Error resolving user:', error);
    return null;
  }
}

/**
 * Resolve multiple user UUIDs at once (batch operation)
 */
export async function resolveUserIds(userIds: string[]): Promise<Map<string, ResolvedUser>> {
  const result = new Map<string, ResolvedUser>();
  const uncachedIds: string[] = [];

  // Check cache first
  for (const userId of userIds) {
    if (!userId) continue;
    
    const cachedUser = userCache.get(userId);
    const cachedTime = cacheTimestamps.get(userId);
    if (cachedUser && cachedTime && Date.now() - cachedTime < CACHE_TTL) {
      result.set(userId, cachedUser);
    } else {
      uncachedIds.push(userId);
    }
  }

  // Fetch uncached users
  if (uncachedIds.length > 0) {
    try {
      // Batch fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', uncachedIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Batch fetch roles
      const { data: allRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', uncachedIds)
        .eq('is_active', true);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }

      // Build a map of user_id -> roles
      const rolesMap = new Map<string, string[]>();
      if (allRoles) {
        for (const roleRecord of allRoles) {
          const existing = rolesMap.get(roleRecord.user_id) || [];
          existing.push(roleRecord.role);
          rolesMap.set(roleRecord.user_id, existing);
        }
      }

      // Resolve each profile
      if (profiles) {
        for (const profile of profiles) {
          const userRoles = rolesMap.get(profile.id) || [];
          let roleName = 'User';
          
          const rolePriority = ['admin', 'partner', 'manager', 'ca', 'advocate', 'staff', 'clerk', 'user'];
          for (const priorityRole of rolePriority) {
            if (userRoles.some(r => r === priorityRole)) {
              roleName = formatRoleName(priorityRole);
              break;
            }
          }

          const resolvedUser: ResolvedUser = {
            id: profile.id,
            fullName: profile.full_name || 'Unknown',
            role: roleName,
            displayText: `${profile.full_name || 'Unknown'} (${roleName})`
          };

          // Cache and add to result
          userCache.set(profile.id, resolvedUser);
          cacheTimestamps.set(profile.id, Date.now());
          result.set(profile.id, resolvedUser);
        }
      }
    } catch (error) {
      console.error('Error batch resolving users:', error);
    }
  }

  return result;
}

/**
 * Format role name to Title Case
 */
function formatRoleName(role: string): string {
  const roleNames: Record<string, string> = {
    admin: 'Admin',
    partner: 'Partner',
    manager: 'Manager',
    ca: 'CA',
    advocate: 'Advocate',
    staff: 'Staff',
    clerk: 'Clerk',
    user: 'User'
  };
  return roleNames[role.toLowerCase()] || role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Clear the user cache (useful when user data changes)
 */
export function clearUserCache(): void {
  userCache.clear();
  cacheTimestamps.clear();
}

export const userResolutionService = {
  resolveUserId,
  resolveUserIds,
  clearUserCache
};
