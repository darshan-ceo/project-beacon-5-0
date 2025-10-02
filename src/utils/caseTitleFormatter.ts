/**
 * Case Title Formatter Utility
 * Formats case titles as "Client Name – Issue Type"
 */

/**
 * Format case title from client name and issue type
 * @param clientName - Name of the client
 * @param issueType - Type of legal issue
 * @returns Formatted title: "Client Name – Issue Type"
 */
export const formatCaseTitle = (clientName: string, issueType: string): string => {
  if (!clientName || !issueType) {
    return issueType || clientName || 'Untitled Case';
  }
  return `${clientName} – ${issueType}`;
};

/**
 * Extract issue type from formatted title
 * @param fullTitle - Full formatted title
 * @returns Issue type portion, or full title if not formatted
 */
export const extractIssueType = (fullTitle: string): string => {
  if (!fullTitle) return '';
  const parts = fullTitle.split(' – ');
  return parts.length > 1 ? parts[1] : fullTitle;
};

/**
 * Extract client name from formatted title
 * @param fullTitle - Full formatted title
 * @returns Client name portion, or empty string if not formatted
 */
export const extractClientName = (fullTitle: string): string => {
  if (!fullTitle) return '';
  const parts = fullTitle.split(' – ');
  return parts.length > 1 ? parts[0] : '';
};
