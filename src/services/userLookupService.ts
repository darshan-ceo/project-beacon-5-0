/**
 * User Lookup Service
 * Resolves email addresses to user IDs for task assignments
 */

import { storageManager } from '@/data/StorageManager';
import type { Employee } from '@/data/db';

export interface UserLookupResult {
  email: string;
  userId: string | null;
  found: boolean;
  userName?: string;
  role?: string;
}

export interface BatchLookupResult {
  results: UserLookupResult[];
  foundCount: number;
  notFoundCount: number;
  notFoundEmails: string[];
}

class UserLookupService {
  /**
   * Look up a single user by email
   */
  async lookupByEmail(email: string): Promise<UserLookupResult> {
    if (!email || !email.trim()) {
      return {
        email,
        userId: null,
        found: false,
      };
    }

    try {
      // Ensure storage is initialized
      await storageManager.initialize();

      // Get all employees via storage port
      const storage = storageManager.getStorage();
      const employees = await storage.getAll<Employee>('employees');

      // Find by email (case-insensitive)
      const normalizedEmail = email.toLowerCase().trim();
      const employee = employees.find(
        (emp) => emp.email?.toLowerCase().trim() === normalizedEmail
      );

      if (employee) {
        return {
          email,
          userId: employee.id,
          found: true,
          userName: employee.name,
          role: employee.department || 'Unknown',
        };
      }

      return {
        email,
        userId: null,
        found: false,
      };
    } catch (error) {
      console.error('Failed to lookup user by email:', error);
      return {
        email,
        userId: null,
        found: false,
      };
    }
  }

  /**
   * Look up multiple users by email in batch
   */
  async lookupBatch(emails: string[]): Promise<BatchLookupResult> {
    const uniqueEmails = Array.from(new Set(emails.filter(Boolean)));
    
    const results = await Promise.all(
      uniqueEmails.map((email) => this.lookupByEmail(email))
    );

    const foundCount = results.filter((r) => r.found).length;
    const notFoundCount = results.filter((r) => !r.found).length;
    const notFoundEmails = results
      .filter((r) => !r.found)
      .map((r) => r.email);

    return {
      results,
      foundCount,
      notFoundCount,
      notFoundEmails,
    };
  }

  /**
   * Get all available users with their emails
   */
  async getAllUsers(): Promise<Array<{ id: string; email: string; name: string; role: string }>> {
    try {
      await storageManager.initialize();
      const storage = storageManager.getStorage();
      const employees = await storage.getAll<Employee>('employees');

      return employees
        .filter((emp) => emp.email)
        .map((emp) => ({
          id: emp.id,
          email: emp.email!,
          name: emp.name,
          role: emp.department || 'Unknown',
        }));
    } catch (error) {
      console.error('Failed to get all users:', error);
      return [];
    }
  }

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get suggestions for a partial email
   */
  async getSuggestions(partialEmail: string): Promise<Array<{ id: string; email: string; name: string }>> {
    if (!partialEmail || partialEmail.length < 2) {
      return [];
    }

    try {
      await storageManager.initialize();
      const storage = storageManager.getStorage();
      const employees = await storage.getAll<Employee>('employees');

      const normalizedPartial = partialEmail.toLowerCase().trim();
      return employees
        .filter(
          (emp) =>
            emp.email &&
            (emp.email.toLowerCase().includes(normalizedPartial) ||
             emp.name.toLowerCase().includes(normalizedPartial))
        )
        .slice(0, 10) // Limit to 10 suggestions
        .map((emp) => ({
          id: emp.id,
          email: emp.email!,
          name: emp.name,
        }));
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      return [];
    }
  }

  /**
   * Create a lookup map for quick access
   */
  async createLookupMap(): Promise<Map<string, string>> {
    try {
      await storageManager.initialize();
      const storage = storageManager.getStorage();
      const employees = await storage.getAll<Employee>('employees');

      const map = new Map<string, string>();
      employees.forEach((emp) => {
        if (emp.email) {
          map.set(emp.email.toLowerCase().trim(), emp.id);
        }
      });

      return map;
    } catch (error) {
      console.error('Failed to create lookup map:', error);
      return new Map();
    }
  }

  /**
   * Resolve email to ID with fallback strategies
   */
  async resolveEmailToId(
    email: string,
    options: {
      createIfNotFound?: boolean;
      defaultRole?: string;
      fallbackToEmail?: boolean;
    } = {}
  ): Promise<string | null> {
    const result = await this.lookupByEmail(email);

    if (result.found && result.userId) {
      return result.userId;
    }

    // Fallback strategies
    if (options.fallbackToEmail) {
      // Use email as ID if not found (useful for temporary assignments)
      return email;
    }

    if (options.createIfNotFound) {
      // Future: Could create a pending user assignment
      console.warn(`User not found for email: ${email}. Consider creating user.`);
    }

    return null;
  }

  /**
   * Validate and resolve multiple email assignments
   */
  async validateAssignments(
    assignments: Array<{ taskTitle: string; email: string }>
  ): Promise<{
    valid: Array<{ taskTitle: string; email: string; userId: string; userName: string }>;
    invalid: Array<{ taskTitle: string; email: string; reason: string }>;
  }> {
    const valid: Array<{ taskTitle: string; email: string; userId: string; userName: string }> = [];
    const invalid: Array<{ taskTitle: string; email: string; reason: string }> = [];

    for (const assignment of assignments) {
      if (!assignment.email) {
        continue; // Skip empty assignments
      }

      if (!this.isValidEmail(assignment.email)) {
        invalid.push({
          taskTitle: assignment.taskTitle,
          email: assignment.email,
          reason: 'Invalid email format',
        });
        continue;
      }

      const result = await this.lookupByEmail(assignment.email);

      if (result.found && result.userId) {
        valid.push({
          taskTitle: assignment.taskTitle,
          email: assignment.email,
          userId: result.userId,
          userName: result.userName || 'Unknown',
        });
      } else {
        invalid.push({
          taskTitle: assignment.taskTitle,
          email: assignment.email,
          reason: 'User not found in system',
        });
      }
    }

    return { valid, invalid };
  }
}

export const userLookupService = new UserLookupService();
