import { Case, Client, Court } from '@/contexts/AppStateContext';

export interface AuditResult {
  orphanedCases: Case[];
  missingClients: string[];
  missingAuthorities: string[];
  invalidGSTINs: { caseId: string; clientId: string; gstin: string }[];
  invalidPincodes: { caseId: string; clientId: string; pincode: string }[];
  missingMandatoryFields: { caseId: string; caseNumber: string; field: string }[];
}

/**
 * Audits case data for integrity issues
 * Used by QC Scan module to identify data quality problems
 */
export function auditCaseData(
  cases: Case[],
  clients: Client[],
  courts: Court[]
): AuditResult {
  const result: AuditResult = {
    orphanedCases: [],
    missingClients: [],
    missingAuthorities: [],
    invalidGSTINs: [],
    invalidPincodes: [],
    missingMandatoryFields: []
  };
  
  const clientIds = new Set(clients.map(c => c.id));
  const courtIds = new Set(courts.map(c => c.id));
  
  cases.forEach(caseItem => {
    // Check client linkage
    if (!clientIds.has(caseItem.clientId)) {
      result.orphanedCases.push(caseItem);
      if (!result.missingClients.includes(caseItem.clientId)) {
        result.missingClients.push(caseItem.clientId);
      }
    }
    
    // Check authority linkage (if authorityId exists)
    if (caseItem.authorityId && !courtIds.has(caseItem.authorityId)) {
      if (!result.missingAuthorities.includes(caseItem.authorityId)) {
        result.missingAuthorities.push(caseItem.authorityId);
      }
    }
    
    // Validate GSTIN (15 characters)
    const client = clients.find(c => c.id === caseItem.clientId);
    if (client?.gstin && client.gstin.length !== 15) {
      result.invalidGSTINs.push({
        caseId: caseItem.id,
        clientId: client.id,
        gstin: client.gstin
      });
    }
    
    // Validate pincode (6 digits)
    const pincode = typeof client?.address === 'object' && 'pincode' in client.address 
      ? (client.address as any).pincode 
      : '';
    if (pincode && !/^\d{6}$/.test(pincode)) {
      result.invalidPincodes.push({
        caseId: caseItem.id,
        clientId: client?.id || '',
        pincode
      });
    }
    
    // Check mandatory fields
    if (!caseItem.clientId) {
      result.missingMandatoryFields.push({
        caseId: caseItem.id,
        caseNumber: caseItem.caseNumber,
        field: 'clientId'
      });
    }
    
    if (!caseItem.city && caseItem.currentStage !== 'Assessment') {
      result.missingMandatoryFields.push({
        caseId: caseItem.id,
        caseNumber: caseItem.caseNumber,
        field: 'city'
      });
    }
    
    if (!caseItem.authorityId && caseItem.currentStage !== 'Assessment') {
      result.missingMandatoryFields.push({
        caseId: caseItem.id,
        caseNumber: caseItem.caseNumber,
        field: 'authorityId'
      });
    }
  });
  
  return result;
}

/**
 * Generate a human-readable audit report
 */
export function generateAuditReport(result: AuditResult): string {
  const lines: string[] = [];
  
  lines.push('# Case Data Audit Report');
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push('');
  
  lines.push(`## Summary`);
  lines.push(`- Orphaned Cases: ${result.orphanedCases.length}`);
  lines.push(`- Invalid GSTINs: ${result.invalidGSTINs.length}`);
  lines.push(`- Invalid Pincodes: ${result.invalidPincodes.length}`);
  lines.push(`- Missing Mandatory Fields: ${result.missingMandatoryFields.length}`);
  lines.push('');
  
  if (result.orphanedCases.length > 0) {
    lines.push(`## Orphaned Cases (${result.orphanedCases.length})`);
    result.orphanedCases.forEach(c => {
      lines.push(`- ${c.caseNumber} (${c.title}) - Missing client: ${c.clientId}`);
    });
    lines.push('');
  }
  
  if (result.invalidGSTINs.length > 0) {
    lines.push(`## Invalid GSTINs (${result.invalidGSTINs.length})`);
    result.invalidGSTINs.forEach(item => {
      lines.push(`- Case ${item.caseId}: GSTIN "${item.gstin}" is not 15 characters`);
    });
    lines.push('');
  }
  
  if (result.invalidPincodes.length > 0) {
    lines.push(`## Invalid Pincodes (${result.invalidPincodes.length})`);
    result.invalidPincodes.forEach(item => {
      lines.push(`- Case ${item.caseId}: Pincode "${item.pincode}" is not 6 digits`);
    });
    lines.push('');
  }
  
  if (result.missingMandatoryFields.length > 0) {
    lines.push(`## Missing Mandatory Fields (${result.missingMandatoryFields.length})`);
    result.missingMandatoryFields.forEach(item => {
      lines.push(`- ${item.caseNumber}: Missing "${item.field}"`);
    });
    lines.push('');
  }
  
  return lines.join('\n');
}
