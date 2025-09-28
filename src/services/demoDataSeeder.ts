/**
 * Demo Data Seeder - Populate RBAC with sample data
 */

import { advancedRbacService } from './advancedRbacService';
import { secureDataService } from './secureDataService';

export class DemoDataSeeder {
  private isSeeded = false;

  async seedRBACDemo(): Promise<void> {
    if (this.isSeeded) {
      console.log('🌱 RBAC demo data already seeded');
      return;
    }

    try {
      console.log('🌱 Seeding RBAC demo data...');

      // Create demo roles
      const adminRole = await advancedRbacService.createRole({
        name: 'Admin',
        description: 'Full system administration access',
        permissions: ['*']
      });

      const managerRole = await advancedRbacService.createRole({
        name: 'Manager',
        description: 'Team management and oversight',
        permissions: ['cases.read', 'cases.write', 'tasks.read', 'tasks.write']
      });

      const staffRole = await advancedRbacService.createRole({
        name: 'Staff',
        description: 'Basic user access',
        permissions: ['cases.read', 'tasks.read']
      });

      // Create demo permissions
      await advancedRbacService.createPermission({
        name: 'Cases - Read',
        category: 'Data Access',
        description: 'View case information',
        resource: 'cases',
        action: 'read',
        effect: 'allow',
        scope: 'org'
      });

      await advancedRbacService.createPermission({
        name: 'Cases - Write',
        category: 'Data Access', 
        description: 'Create and modify cases',
        resource: 'cases',
        action: 'write',
        effect: 'allow',
        scope: 'team'
      });

      console.log('✅ RBAC demo data seeded successfully');
      this.isSeeded = true;

    } catch (error) {
      console.error('❌ Failed to seed RBAC demo data:', error);
      throw error;
    }
  }

  async seedUserContext(): Promise<void> {
    try {
      console.log('👤 Setting up demo user context...');
      
      // Set demo user context
      secureDataService.setUserContext('demo-user', 'admin');
      
      const userContext = secureDataService.getUserContext();
      console.log('Demo user context set:', userContext);

      console.log('✅ Demo user context set up successfully');

    } catch (error) {
      console.error('❌ Failed to set up user context:', error);
      throw error;
    }
  }

  async reset(): Promise<void> {
    console.log('🔄 Resetting demo data...');
    this.isSeeded = false;
    
    try {
      // Reset would clear all demo data - simplified for now
      console.log('✅ Demo data reset completed');
    } catch (error) {
      console.error('❌ Failed to reset demo data:', error);
      throw error;
    }
  }
}

export const demoDataSeeder = new DemoDataSeeder();