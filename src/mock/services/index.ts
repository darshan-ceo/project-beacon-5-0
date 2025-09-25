/**
 * Mock Services Index - Export all DEMO mode services
 */

export { clientService } from './clientService';
export { caseService } from './caseService';
export { taskService } from './taskService';
export { courtService } from './courtService';
export { judgeService } from './judgeService';
export { employeeService } from './employeeService';
export { hearingService } from './hearingService';
export { documentService } from './documentService';
export { taskBundleService } from './taskBundleService';

// Service registry for dynamic access
import { clientService } from './clientService';
import { caseService } from './caseService';
import { taskService } from './taskService';
import { courtService } from './courtService';
import { judgeService } from './judgeService';
import { employeeService } from './employeeService';
import { hearingService } from './hearingService';
import { documentService } from './documentService';
import { taskBundleService } from './taskBundleService';

export const serviceRegistry = {
  client: clientService,
  case: caseService,
  task: taskService,
  court: courtService,
  judge: judgeService,
  employee: employeeService,
  hearing: hearingService,
  document: documentService,
  taskBundle: taskBundleService
} as const;

export type ServiceKey = keyof typeof serviceRegistry;