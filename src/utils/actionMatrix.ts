import { toast } from '@/hooks/use-toast';

export interface ActionMatrixEntry {
  screen: string;
  element: string;
  component: string;
  service: string;
  payload_keys: string[];
  expected_result: string;
  ui_refresh: string;
  status: 'OK' | 'MISSING_HANDLER' | 'TOAST_ONLY' | 'BROKEN_SERVICE' | 'VALIDATION_ONLY';
  notes: string;
}

export const actionMatrix: ActionMatrixEntry[] = [
  // Client Masters Actions
  {
    screen: "Client > List",
    element: "View Details",
    component: "ClientMasters.tsx#DropdownMenuItem[View Details]",
    service: "setClientModal(view mode)",
    payload_keys: ["client"],
    expected_result: "Open ClientModal in view mode",
    ui_refresh: "Modal opens with client details",
    status: "TOAST_ONLY",
    notes: "Currently shows dummy toast, needs to wire to modal"
  },
  {
    screen: "Client > List",
    element: "Edit Client",
    component: "ClientMasters.tsx#DropdownMenuItem[Edit Client]",
    service: "setClientModal(edit mode)",
    payload_keys: ["client"],
    expected_result: "Open ClientModal in edit mode",
    ui_refresh: "Modal opens with editable form",
    status: "TOAST_ONLY",
    notes: "Currently shows dummy toast, needs to wire to modal"
  },
  {
    screen: "Client > List",
    element: "Delete Client",
    component: "ClientMasters.tsx#DropdownMenuItem[Delete]",
    service: "DELETE_CLIENT action",
    payload_keys: ["clientId"],
    expected_result: "Client removed from list",
    ui_refresh: "List refreshes, stats update",
    status: "TOAST_ONLY",
    notes: "Currently shows dummy toast, needs confirmation + delete action"
  },
  {
    screen: "Client > List",
    element: "Export Button",
    component: "ClientMasters.tsx#Button[Export]",
    service: "reportsService.exportCaseList",
    payload_keys: ["clients", "format"],
    expected_result: "Download client list file",
    ui_refresh: "File download triggered",
    status: "TOAST_ONLY",
    notes: "Currently shows dummy toast, needs actual file export"
  },

  // Dashboard Quick Actions
  {
    screen: "Dashboard > Overview",
    element: "Add New Client Quick Action",
    component: "EnhancedDashboard.tsx#QuickAction",
    service: "Navigation + modal",
    payload_keys: [],
    expected_result: "Navigate to clients page and open creation modal",
    ui_refresh: "Page navigation + modal",
    status: "MISSING_HANDLER",
    notes: "Quick action not implemented"
  },
  {
    screen: "Dashboard > Overview", 
    element: "Upload Document Quick Action",
    component: "EnhancedDashboard.tsx#QuickAction",
    service: "DocumentModal(create)",
    payload_keys: [],
    expected_result: "Open document upload modal",
    ui_refresh: "Modal opens",
    status: "MISSING_HANDLER",
    notes: "Quick action not implemented"
  },

  // Task Management Actions
  {
    screen: "Tasks > Management",
    element: "Filter Status Button",
    component: "TaskManagement.tsx#Button[Status]",
    service: "setFilterStatus",
    payload_keys: ["status"],
    expected_result: "Filter tasks by status",
    ui_refresh: "Task list filtered",
    status: "TOAST_ONLY",
    notes: "Currently shows dummy toast, needs dropdown with filtering"
  },
  {
    screen: "Tasks > Management",
    element: "Filter Priority Button", 
    component: "TaskManagement.tsx#Button[Priority]",
    service: "setFilterPriority",
    payload_keys: ["priority"],
    expected_result: "Filter tasks by priority",
    ui_refresh: "Task list filtered",
    status: "TOAST_ONLY",
    notes: "Currently shows dummy toast, needs dropdown with filtering"
  },
  {
    screen: "Tasks > Management",
    element: "Due Date Filter",
    component: "TaskManagement.tsx#Button[Due Date]",
    service: "setDateRange filter",
    payload_keys: ["startDate", "endDate"],
    expected_result: "Filter tasks by due date range",
    ui_refresh: "Task list filtered",
    status: "TOAST_ONLY",
    notes: "Currently shows dummy toast, needs date picker"
  },
  {
    screen: "Tasks > Management",
    element: "Escalations Button",
    component: "TaskManagement.tsx#Button[Escalations]",
    service: "setActiveTab(escalation)",
    payload_keys: [],
    expected_result: "Switch to escalation tab",
    ui_refresh: "Tab changes to escalation view",
    status: "TOAST_ONLY",
    notes: "Currently shows dummy toast, should switch tabs"
  },

  // Document Management Actions
  {
    screen: "Documents > All Documents",
    element: "View Document",
    component: "DocumentManagement.tsx#Button[View]",
    service: "window.open or modal viewer",
    payload_keys: ["documentPath"],
    expected_result: "Open document in viewer",
    ui_refresh: "Document opens in new tab/modal",
    status: "TOAST_ONLY",
    notes: "Currently shows dummy toast, needs document viewer"
  },
  {
    screen: "Documents > All Documents",
    element: "Download Document",
    component: "DocumentManagement.tsx#Button[Download]",
    service: "Download file",
    payload_keys: ["documentPath", "fileName"],
    expected_result: "File download initiated",
    ui_refresh: "Browser download triggered",
    status: "TOAST_ONLY",
    notes: "Currently shows dummy toast, needs actual download"
  },
  {
    screen: "Documents > All Documents",
    element: "Edit Document",
    component: "DocumentManagement.tsx#DropdownMenuItem[Edit]",
    service: "DocumentModal(edit)",
    payload_keys: ["document"],
    expected_result: "Open document edit modal",
    ui_refresh: "Modal opens with document details",
    status: "TOAST_ONLY",
    notes: "Currently shows dummy toast, needs DocumentModal integration"
  },
  {
    screen: "Documents > All Documents",
    element: "Delete Document",
    component: "DocumentManagement.tsx#DropdownMenuItem[Delete]",
    service: "dmsService.deleteDocument",
    payload_keys: ["documentId"],
    expected_result: "Document removed from list",
    ui_refresh: "List refreshes, stats update",
    status: "TOAST_ONLY",
    notes: "Currently shows dummy toast, needs delete confirmation + action"
  },
  {
    screen: "Documents > Overview",
    element: "New Folder Button",
    component: "DocumentManagement.tsx#Button[New Folder]",
    service: "Create folder modal/action",
    payload_keys: ["folderName", "description"],
    expected_result: "New folder created",
    ui_refresh: "Folder list refreshes",
    status: "TOAST_ONLY",
    notes: "Currently shows dummy toast, needs folder creation"
  },
  {
    screen: "Documents > Overview",
    element: "Upload Documents",
    component: "DocumentManagement.tsx#Button[Upload Documents]",
    service: "DocumentModal(upload)",
    payload_keys: [],
    expected_result: "Open upload modal",
    ui_refresh: "Upload modal opens",
    status: "TOAST_ONLY",
    notes: "Currently shows dummy toast, needs upload modal"
  },
  {
    screen: "Documents > Overview",
    element: "Filter Documents",
    component: "DocumentManagement.tsx#Button[Filter]",
    service: "Filter state management",
    payload_keys: ["filterType", "filterValue"],
    expected_result: "Documents filtered",
    ui_refresh: "Document list filtered",
    status: "TOAST_ONLY",
    notes: "Currently shows dummy toast, needs filter dropdown"
  },
  {
    screen: "Documents > Overview",
    element: "Manage Tags",
    component: "DocumentManagement.tsx#Button[Tags]",
    service: "Tag management modal",
    payload_keys: [],
    expected_result: "Open tag management",
    ui_refresh: "Tag modal opens",
    status: "TOAST_ONLY",
    notes: "Currently shows dummy toast, needs tag management interface"
  },

  // Case Management Actions
  {
    screen: "Cases > Overview",
    element: "Filter Button",
    component: "CaseManagement.tsx#Button[Filter]",
    service: "Filter dropdown with state",
    payload_keys: ["filterType", "filterValue"],
    expected_result: "Cases filtered by criteria",
    ui_refresh: "Case list filtered",
    status: "TOAST_ONLY",
    notes: "Currently shows dummy toast, needs filter dropdown"
  },

  // Court Masters (missing entirely)
  {
    screen: "Courts > List",
    element: "View Court Details",
    component: "CourtMasters.tsx#DropdownMenuItem[View]",
    service: "setCourtModal(view mode)",
    payload_keys: ["court"],
    expected_result: "Open CourtModal in view mode",
    ui_refresh: "Modal opens with court details",
    status: "MISSING_HANDLER",
    notes: "Court Masters component exists but actions need wiring"
  },
  {
    screen: "Courts > List",
    element: "Edit Court",
    component: "CourtMasters.tsx#DropdownMenuItem[Edit]",
    service: "setCourtModal(edit mode)",
    payload_keys: ["court"],
    expected_result: "Open CourtModal in edit mode",
    ui_refresh: "Modal opens with editable form",
    status: "MISSING_HANDLER",
    notes: "Court Masters component exists but actions need wiring"
  },

  // Judge Masters (missing entirely)
  {
    screen: "Judges > List",
    element: "View Judge Details",
    component: "JudgeMasters.tsx#DropdownMenuItem[View]",
    service: "setJudgeModal(view mode)",
    payload_keys: ["judge"],
    expected_result: "Open JudgeModal in view mode",
    ui_refresh: "Modal opens with judge details",
    status: "MISSING_HANDLER",
    notes: "Judge Masters component exists but actions need wiring"
  }
];

// Action Matrix utilities
export const generateActionMatrixReport = (): string => {
  const totalActions = actionMatrix.length;
  const statusCounts = actionMatrix.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const report = `
# Action Matrix Report
Generated: ${new Date().toLocaleString()}

## Summary
- Total Actions Audited: ${totalActions}
- OK: ${statusCounts.OK || 0}
- Toast Only: ${statusCounts.TOAST_ONLY || 0}
- Missing Handler: ${statusCounts.MISSING_HANDLER || 0}
- Broken Service: ${statusCounts.BROKEN_SERVICE || 0}
- Validation Only: ${statusCounts.VALIDATION_ONLY || 0}

## Issues to Fix
${actionMatrix
  .filter(item => item.status !== 'OK')
  .map(item => `- **${item.screen}** > ${item.element}: ${item.status} - ${item.notes}`)
  .join('\n')}

## Priority Order
1. TOAST_ONLY (${statusCounts.TOAST_ONLY || 0} items) - Replace dummy toasts with real actions
2. MISSING_HANDLER (${statusCounts.MISSING_HANDLER || 0} items) - Implement missing functionality
3. BROKEN_SERVICE (${statusCounts.BROKEN_SERVICE || 0} items) - Fix broken integrations
4. VALIDATION_ONLY (${statusCounts.VALIDATION_ONLY || 0} items) - Add proper error handling
`;

  return report;
};

export const downloadActionMatrix = () => {
  const jsonData = JSON.stringify(actionMatrix, null, 2);
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ActionMatrix-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  toast({
    title: "ActionMatrix Downloaded",
    description: "ActionMatrix.json has been saved to your downloads",
  });
};

// Console logging utilities
let loggingEnabled = true;

export const logAction = (module: string, action: string, id?: string, status: 'OK' | 'ERR' = 'OK', reason?: string) => {
  if (!loggingEnabled) return;
  
  const timestamp = new Date().toISOString();
  const idPart = id ? ` id=${id}` : '';
  const reasonPart = reason ? ` reason=${reason}` : '';
  
  console.log(`[${status}] ${timestamp} ${module}:${action}${idPart}${reasonPart}`);
};

export const toggleActionLogging = (enabled: boolean) => {
  loggingEnabled = enabled;
  console.log(`Action logging ${enabled ? 'enabled' : 'disabled'}`);
};