// Migration utility to run once when the Employee Master is implemented
import { Employee } from '@/services/employeesService';

interface MigrationReport {
  timestamp: string;
  totalCases: number;
  totalTasks: number;
  totalHearings: number;
  mappedCases: number;
  mappedTasks: number;
  mappedHearings: number;
  unmappedCases: Array<{ caseId: string; assignedToName: string }>;
  unmappedTasks: Array<{ taskId: string; assignedToName?: string; assignedByName?: string }>;
  unmappedHearings: Array<{ hearingId: string; responsibleName?: string }>;
  summary: string;
}

export const runEmployeeMigration = (
  cases: any[], 
  tasks: any[], 
  hearings: any[], 
  employees: Employee[]
): { migratedCases: any[], migratedTasks: any[], migratedHearings: any[], report: MigrationReport } => {
  
  console.log('🔄 Starting Employee Master Migration...');
  
  // Create name mapping from employees
  const nameMapping: Record<string, string> = {};
  
  employees.forEach(emp => {
    // Full name mapping
    nameMapping[emp.full_name.toLowerCase()] = emp.id;
    
    // First name mapping
    const firstName = emp.full_name.split(' ')[0].toLowerCase();
    if (!nameMapping[firstName]) {
      nameMapping[firstName] = emp.id;
    }
    
    // Last name mapping
    const nameParts = emp.full_name.split(' ');
    if (nameParts.length > 1) {
      const lastName = nameParts[nameParts.length - 1].toLowerCase();
      if (!nameMapping[lastName]) {
        nameMapping[lastName] = emp.id;
      }
    }
    
    // Common name patterns
    nameMapping[emp.full_name.toLowerCase().replace(/\s+/g, '')] = emp.id;
  });

  const report: MigrationReport = {
    timestamp: new Date().toISOString(),
    totalCases: cases.length,
    totalTasks: tasks.length,
    totalHearings: hearings.length,
    mappedCases: 0,
    mappedTasks: 0,
    mappedHearings: 0,
    unmappedCases: [],
    unmappedTasks: [],
    unmappedHearings: [],
    summary: ''
  };

  // Migrate cases
  const migratedCases = cases.map(case_ => {
    const assignedName = case_.assignedToName?.toLowerCase();
    const mappedId = assignedName ? nameMapping[assignedName] : null;
    
    if (mappedId) {
      report.mappedCases++;
      console.log(`✅ Mapped case ${case_.caseNumber}: ${case_.assignedToName} -> ${employees.find(e => e.id === mappedId)?.full_name}`);
      return { ...case_, assignedToId: mappedId };
    } else if (case_.assignedToName) {
      report.unmappedCases.push({ caseId: case_.id, assignedToName: case_.assignedToName });
      console.log(`❌ Could not map case ${case_.caseNumber}: ${case_.assignedToName}`);
    }
    
    return case_;
  });

  // Migrate tasks
  const migratedTasks = tasks.map(task => {
    let updated = { ...task };
    let wasMapped = false;
    
    // Map assignedTo
    const assignedName = task.assignedToName?.toLowerCase();
    const mappedAssignedToId = assignedName ? nameMapping[assignedName] : null;
    
    if (mappedAssignedToId) {
      updated.assignedToId = mappedAssignedToId;
      wasMapped = true;
      console.log(`✅ Mapped task ${task.title}: assigned to ${task.assignedToName} -> ${employees.find(e => e.id === mappedAssignedToId)?.full_name}`);
    }
    
    // Map assignedBy
    const assignedByName = task.assignedByName?.toLowerCase();
    const mappedAssignedById = assignedByName ? nameMapping[assignedByName] : null;
    
    if (mappedAssignedById) {
      updated.assignedById = mappedAssignedById;
      wasMapped = true;
      console.log(`✅ Mapped task ${task.title}: assigned by ${task.assignedByName} -> ${employees.find(e => e.id === mappedAssignedById)?.full_name}`);
    }
    
    if (wasMapped) {
      report.mappedTasks++;
    } else if (task.assignedToName || task.assignedByName) {
      report.unmappedTasks.push({ 
        taskId: task.id, 
        assignedToName: task.assignedToName,
        assignedByName: task.assignedByName 
      });
      console.log(`❌ Could not map task ${task.title}: ${task.assignedToName || ''} / ${task.assignedByName || ''}`);
    }
    
    return updated;
  });

  // Migrate hearings (if they have responsible person)
  const migratedHearings = hearings.map(hearing => {
    if (hearing.responsibleName) {
      const responsibleName = hearing.responsibleName.toLowerCase();
      const mappedId = nameMapping[responsibleName];
      
      if (mappedId) {
        report.mappedHearings++;
        console.log(`✅ Mapped hearing ${hearing.id}: ${hearing.responsibleName} -> ${employees.find(e => e.id === mappedId)?.full_name}`);
        return { ...hearing, responsibleId: mappedId };
      } else {
        report.unmappedHearings.push({ hearingId: hearing.id, responsibleName: hearing.responsibleName });
        console.log(`❌ Could not map hearing ${hearing.id}: ${hearing.responsibleName}`);
      }
    }
    
    return hearing;
  });

  // Generate summary
  const totalMapped = report.mappedCases + report.mappedTasks + report.mappedHearings;
  const totalRecords = report.totalCases + report.totalTasks + report.totalHearings;
  const successRate = totalRecords > 0 ? ((totalMapped / totalRecords) * 100).toFixed(1) : '0';
  
  report.summary = `Migration completed with ${successRate}% success rate. ` +
    `Mapped: ${report.mappedCases}/${report.totalCases} cases, ` +
    `${report.mappedTasks}/${report.totalTasks} tasks, ` +
    `${report.mappedHearings}/${report.totalHearings} hearings.`;

  console.log('✅ Migration Summary:', report.summary);

  // Save report to localStorage for admin review
  localStorage.setItem('employee_migration_report', JSON.stringify(report, null, 2));
  
  return {
    migratedCases,
    migratedTasks,
    migratedHearings,
    report
  };
};

export const getMigrationReport = (): MigrationReport | null => {
  try {
    const stored = localStorage.getItem('employee_migration_report');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const clearMigrationReport = (): void => {
  localStorage.removeItem('employee_migration_report');
};