/**
 * Global Text Formatting Utilities
 * Provides consistent formatting rules across all master modules
 */

/**
 * Convert text to Title Case (first letter of each word capitalized)
 * Used for: Names, City, District, Designation, Court Names, etc.
 * Example: "JOHN DOE" → "John Doe"
 */
export const toTitleCase = (text: string): string => {
  if (!text || typeof text !== 'string') return text;
  
  return text
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Convert text to UPPERCASE
 * Used for: PAN, GSTIN, CIN, TAN, Document Numbers
 * Example: "abcde1234f" → "ABCDE1234F"
 */
export const toUpperCase = (text: string): string => {
  if (!text || typeof text !== 'string') return text;
  return text.trim().toUpperCase();
};

/**
 * Convert text to lowercase
 * Used for: Email addresses, Websites
 * Example: "John@EXAMPLE.com" → "john@example.com"
 */
export const toLowerCase = (text: string): string => {
  if (!text || typeof text !== 'string') return text;
  return text.trim().toLowerCase();
};

/**
 * Capitalize only the first character
 * Used for: Free text fields like addresses, notes, remarks
 * Does NOT capitalize inside words
 * Example: "123 main street" → "123 main street"
 */
export const capitalizeFirst = (text: string): string => {
  if (!text || typeof text !== 'string') return text;
  
  const trimmed = text.trim();
  if (!trimmed) return text;
  
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

/**
 * Normalize client payload before persistence
 */
export const normalizeClientPayload = (payload: any): any => {
  const normalized = { ...payload };

  // Title Case fields
  if (normalized.displayName) normalized.displayName = toTitleCase(normalized.displayName);
  if (normalized.display_name) normalized.display_name = toTitleCase(normalized.display_name);
  if (normalized.city) normalized.city = toTitleCase(normalized.city);
  if (normalized.state) normalized.state = toTitleCase(normalized.state);

  // Uppercase fields
  if (normalized.pan) normalized.pan = toUpperCase(normalized.pan);
  if (normalized.gstin) normalized.gstin = toUpperCase(normalized.gstin);
  if (normalized.cin) normalized.cin = toUpperCase(normalized.cin);
  if (normalized.tan) normalized.tan = toUpperCase(normalized.tan);

  // Lowercase fields
  if (normalized.email) normalized.email = toLowerCase(normalized.email);

  // Normalize signatories
  if (normalized.signatories && Array.isArray(normalized.signatories)) {
    normalized.signatories = normalized.signatories.map((sig: any) => ({
      ...sig,
      name: sig.name ? toTitleCase(sig.name) : sig.name,
      designation: sig.designation ? toTitleCase(sig.designation) : sig.designation,
      emails: sig.emails && Array.isArray(sig.emails) 
        ? sig.emails.map((e: string) => toLowerCase(e))
        : sig.emails
    }));
  }

  return normalized;
};

/**
 * Normalize case payload before persistence
 */
// Legal form code prefixes that should stay UPPERCASE in titles
const LEGAL_FORM_PREFIXES = ['ASMT-', 'DRC-', 'GSTR-', 'GST-', 'APPEAL-', 'ITC-', 'RFD-', 'PMT-'];

export const normalizeCasePayload = (payload: any): any => {
  const normalized = { ...payload };

  // Check if title starts with a legal form code - if so, skip title-casing
  const startsWithLegalCode = normalized.title && LEGAL_FORM_PREFIXES.some(
    prefix => normalized.title.toUpperCase().startsWith(prefix)
  );

  // Title Case fields (ONLY if not a legal form code title)
  if (normalized.title && !startsWithLegalCode) {
    normalized.title = toTitleCase(normalized.title);
  }
  if (normalized.stateBenchCity) normalized.stateBenchCity = toTitleCase(normalized.stateBenchCity);
  if (normalized.state_bench_city) normalized.state_bench_city = toTitleCase(normalized.state_bench_city);
  if (normalized.stateBenchState) normalized.stateBenchState = toTitleCase(normalized.stateBenchState);
  if (normalized.state_bench_state) normalized.state_bench_state = toTitleCase(normalized.state_bench_state);

  // Uppercase fields - Legal identifiers and form codes
  if (normalized.caseNumber) normalized.caseNumber = toUpperCase(normalized.caseNumber);
  if (normalized.case_number) normalized.case_number = toUpperCase(normalized.case_number);
  if (normalized.noticeNo) normalized.noticeNo = toUpperCase(normalized.noticeNo);
  if (normalized.notice_no) normalized.notice_no = toUpperCase(normalized.notice_no);
  if (normalized.officeFileNo) normalized.officeFileNo = toUpperCase(normalized.officeFileNo);
  if (normalized.office_file_no) normalized.office_file_no = toUpperCase(normalized.office_file_no);
  
  // NEW: Form type, section invoked, and DIN should be uppercase
  if (normalized.formType) normalized.formType = toUpperCase(normalized.formType);
  if (normalized.form_type) normalized.form_type = toUpperCase(normalized.form_type);
  if (normalized.sectionInvoked) normalized.sectionInvoked = toUpperCase(normalized.sectionInvoked);
  if (normalized.section_invoked) normalized.section_invoked = toUpperCase(normalized.section_invoked);
  if (normalized.din) normalized.din = toUpperCase(normalized.din);
  if (normalized.noticeType) normalized.noticeType = toUpperCase(normalized.noticeType);
  if (normalized.notice_type) normalized.notice_type = toUpperCase(normalized.notice_type);

  return normalized;
};

/**
 * Normalize court/authority payload before persistence
 */
export const normalizeCourtPayload = (payload: any): any => {
  const normalized = { ...payload };

  // Title Case fields
  if (normalized.name) normalized.name = toTitleCase(normalized.name);
  if (normalized.city) normalized.city = toTitleCase(normalized.city);
  if (normalized.state) normalized.state = toTitleCase(normalized.state);
  if (normalized.benchLocation) normalized.benchLocation = toTitleCase(normalized.benchLocation);
  if (normalized.bench_location) normalized.bench_location = toTitleCase(normalized.bench_location);
  if (normalized.jurisdiction) normalized.jurisdiction = toTitleCase(normalized.jurisdiction);

  // Uppercase fields
  if (normalized.code) normalized.code = toUpperCase(normalized.code);

  // Lowercase fields
  if (normalized.email) normalized.email = toLowerCase(normalized.email);

  return normalized;
};

/**
 * Normalize judge payload before persistence
 */
export const normalizeJudgePayload = (payload: any): any => {
  const normalized = { ...payload };

  // Title Case fields
  if (normalized.name) normalized.name = toTitleCase(normalized.name);
  if (normalized.designation) normalized.designation = toTitleCase(normalized.designation);
  if (normalized.city) normalized.city = toTitleCase(normalized.city);
  if (normalized.state) normalized.state = toTitleCase(normalized.state);
  if (normalized.bench) normalized.bench = toTitleCase(normalized.bench);
  if (normalized.jurisdiction) normalized.jurisdiction = toTitleCase(normalized.jurisdiction);
  if (normalized.chambers) normalized.chambers = toTitleCase(normalized.chambers);

  // Lowercase fields
  if (normalized.email) normalized.email = toLowerCase(normalized.email);

  return normalized;
};

/**
 * Normalize employee payload before persistence
 */
export const normalizeEmployeePayload = (payload: any): any => {
  const normalized = { ...payload };

  // Title Case fields
  if (normalized.fullName) normalized.fullName = toTitleCase(normalized.fullName);
  if (normalized.full_name) normalized.full_name = toTitleCase(normalized.full_name);
  if (normalized.city) normalized.city = toTitleCase(normalized.city);
  if (normalized.state) normalized.state = toTitleCase(normalized.state);
  if (normalized.designation) normalized.designation = toTitleCase(normalized.designation);
  if (normalized.department) normalized.department = toTitleCase(normalized.department);
  if (normalized.branch) normalized.branch = toTitleCase(normalized.branch);
  if (normalized.qualification) normalized.qualification = toTitleCase(normalized.qualification);
  if (normalized.university) normalized.university = toTitleCase(normalized.university);

  // Uppercase fields
  if (normalized.pan) normalized.pan = toUpperCase(normalized.pan);
  if (normalized.aadhaar) normalized.aadhaar = toUpperCase(normalized.aadhaar);
  if (normalized.employeeCode) normalized.employeeCode = toUpperCase(normalized.employeeCode);
  if (normalized.employee_code) normalized.employee_code = toUpperCase(normalized.employee_code);
  if (normalized.barCouncilNo) normalized.barCouncilNo = toUpperCase(normalized.barCouncilNo);
  if (normalized.bar_council_no) normalized.bar_council_no = toUpperCase(normalized.bar_council_no);
  if (normalized.icaiNo) normalized.icaiNo = toUpperCase(normalized.icaiNo);
  if (normalized.icai_no) normalized.icai_no = toUpperCase(normalized.icai_no);
  if (normalized.gstPractitionerId) normalized.gstPractitionerId = toUpperCase(normalized.gstPractitionerId);
  if (normalized.gst_practitioner_id) normalized.gst_practitioner_id = toUpperCase(normalized.gst_practitioner_id);

  // Lowercase fields
  if (normalized.email) normalized.email = toLowerCase(normalized.email);
  if (normalized.officialEmail) normalized.officialEmail = toLowerCase(normalized.officialEmail);
  if (normalized.official_email) normalized.official_email = toLowerCase(normalized.official_email);
  if (normalized.personalEmail) normalized.personalEmail = toLowerCase(normalized.personalEmail);
  if (normalized.personal_email) normalized.personal_email = toLowerCase(normalized.personal_email);

  return normalized;
};

/**
 * Normalize task payload before persistence
 */
export const normalizeTaskPayload = (payload: any): any => {
  const normalized = { ...payload };

  // Title Case fields (only task title, not description/notes)
  if (normalized.title) normalized.title = capitalizeFirst(normalized.title);

  return normalized;
};

/**
 * Normalize common fields across all entities
 */
export const normalizeCommonFields = (payload: any): any => {
  const normalized = { ...payload };

  // Common patterns
  if (normalized.name) normalized.name = toTitleCase(normalized.name);
  if (normalized.email) normalized.email = toLowerCase(normalized.email);
  if (normalized.city) normalized.city = toTitleCase(normalized.city);
  if (normalized.state) normalized.state = toTitleCase(normalized.state);

  return normalized;
};
