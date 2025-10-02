/**
 * Case Number Generator Utility
 * Generates and parses case numbers in format: GST/2025/001 – OFFICE001 – ASMT-10/2025
 */

export type CaseType = 'GST' | 'ST' | 'Excise' | 'Custom' | 'VAT' | 'DGFT';

export interface CaseNumberComponents {
  caseType: CaseType;
  year: string;
  sequence: string;
  officeFileNo: string;
  noticeNo: string;
}

/**
 * Generate composite case number from components
 */
export const generateCaseNumber = (
  caseType: CaseType,
  year: string,
  sequence: string,
  officeFileNo: string,
  noticeNo: string
): string => {
  const seqPadded = sequence.padStart(3, '0');
  return `${caseType}/${year}/${seqPadded} – ${officeFileNo} – ${noticeNo}`;
};

/**
 * Parse case number into components
 * Returns null if format is invalid
 */
export const parseCaseNumber = (caseNumber: string): CaseNumberComponents | null => {
  if (!caseNumber) return null;
  
  // Pattern: GST/2025/001 – OFFICE001 – ASMT-10/2025
  const regex = /^(\w+)\/(\d{4})\/(\d+)\s*–\s*(\S+)\s*–\s*(.+)$/;
  const match = caseNumber.match(regex);
  
  if (!match) return null;
  
  return {
    caseType: match[1] as CaseType,
    year: match[2],
    sequence: match[3],
    officeFileNo: match[4],
    noticeNo: match[5]
  };
};

/**
 * Generate next sequence number for a given case type and year
 */
export const getNextSequence = (
  existingCases: Array<{ caseNumber: string }>,
  caseType: CaseType,
  year: string
): string => {
  const prefix = `${caseType}/${year}/`;
  
  const matchingCases = existingCases
    .map(c => parseCaseNumber(c.caseNumber))
    .filter((parsed): parsed is CaseNumberComponents => 
      parsed !== null && parsed.caseType === caseType && parsed.year === year
    );
  
  if (matchingCases.length === 0) {
    return '001';
  }
  
  const maxSeq = Math.max(...matchingCases.map(c => parseInt(c.sequence, 10)));
  return String(maxSeq + 1).padStart(3, '0');
};

/**
 * Validate case number format
 */
export const isValidCaseNumber = (caseNumber: string): boolean => {
  return parseCaseNumber(caseNumber) !== null;
};
