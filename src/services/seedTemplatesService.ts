import { customTemplatesService } from './customTemplatesService';
import { FormTemplate } from './formTemplatesService';

/**
 * Seed Templates Service
 * Provides initial template data for QA and demonstration purposes
 */

const SEED_TEMPLATES: Array<Omit<FormTemplate, 'id' | 'createdAt' | 'updatedAt'> & {
  isCustom?: boolean;
  createdBy: string;
  templateType?: 'unified';
  richContent?: string;
  variableMappings?: Record<string, string>;
}> = [
  {
    code: 'GST_SCRUTINY_LETTER_01',
    title: 'GST Scrutiny Response Letter',
    stage: 'Scrutiny',
    templateType: 'unified',
    version: '1.0',
    createdBy: 'System',
    richContent: `
      <h2>Re: Response to GST Scrutiny Notice</h2>
      <br/>
      <p><strong>To:</strong><br/>
      The Jurisdictional Officer<br/>
      GST Department<br/>
      [Office Address]</p>
      <br/>
      <p><strong>Subject:</strong> Response to Notice No. {{case.noticeNumber}} dated {{case.noticeDate}}</p>
      <br/>
      <p>Dear Sir/Madam,</p>
      <br/>
      <p>On behalf of <strong>{{client.display_name}}</strong> (GSTIN: <strong>{{client.gstin}}</strong>), 
      we hereby submit our response to the scrutiny notice referenced above.</p>
      <br/>
      <p><strong>Case Details:</strong></p>
      <ul>
        <li>Case Number: {{case.case_number}}</li>
        <li>Notice Number: {{case.noticeNumber}}</li>
        <li>Status: {{case.status}}</li>
      </ul>
      <br/>
      <p><strong>Client Information:</strong></p>
      <ul>
        <li>Client Name: {{client.display_name}}</li>
        <li>GSTIN: {{client.gstin}}</li>
        <li>City: {{client.city}}</li>
        <li>State: {{client.state}}</li>
      </ul>
      <br/>
      <p>We request that this matter be reviewed and resolved at the earliest convenience. 
      We are available for any clarifications required.</p>
      <br/>
      <p>Thanking you,</p>
      <br/>
      <p><strong>Yours faithfully,</strong><br/>
      H-Office Legal Team – GST Practice</p>
    `,
    fields: [
      { key: 'client_name', label: 'Client Name', type: 'string', required: true },
      { key: 'client_gstin', label: 'Client GSTIN', type: 'string', required: true },
      { key: 'client_city', label: 'Client City', type: 'string', required: false },
      { key: 'client_state', label: 'Client State', type: 'string', required: false },
      { key: 'case_number', label: 'Case Number', type: 'string', required: true },
      { key: 'case_notice_number', label: 'Notice Number', type: 'string', required: false },
      { key: 'case_status', label: 'Case Status', type: 'string', required: false },
    ],
    variableMappings: {
      'client.display_name': 'client.display_name',
      'client.gstin': 'client.gstin',
      'client.city': 'client.city',
      'client.state': 'client.state',
      'case.case_number': 'case.case_number',
      'case.noticeNumber': 'case.noticeNumber',
      'case.status': 'case.status',
    },
    prefill: {
      'client_name': 'client.display_name',
      'client_gstin': 'client.gstin',
      'client_city': 'client.city',
      'client_state': 'client.state',
      'case_number': 'case.case_number',
    },
    output: {
      filename: '${code}_${case.case_number}_${now:YYYYMMDD}.pdf',
      dms_folder_by_stage: true,
      timeline_event: 'Document Generated',
    },
  },
  {
    code: 'GST_APPEAL_SUMMARY_02',
    title: 'GST Appeal Summary',
    stage: 'Appeals',
    templateType: 'unified',
    version: '1.0',
    createdBy: 'System',
    richContent: `
      <h1 style="text-align: center; color: #0B5FFF;">GST APPEAL SUMMARY</h1>
      <br/>
      <hr/>
      <br/>
      <h3>Client Information</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Client Name:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">{{client.display_name}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>GSTIN:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">{{client.gstin}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Location:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">{{client.city}}, {{client.state}}</td>
        </tr>
      </table>
      <br/>
      <h3>Case Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Case Number:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">{{case.case_number}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Title:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">{{case.title}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Status:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">{{case.status}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Stage:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">{{case.stage_code}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Opened On:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">{{case.opened_on:DD-MMM-YYYY}}</td>
        </tr>
      </table>
      <br/>
      <h3>Summary</h3>
      <p>This appeal summary document provides an overview of the case {{case.case_number}} 
      for client {{client.display_name}}. The matter is currently in <strong>{{case.status}}</strong> status.</p>
      <br/>
      <p><em>This summary was generated on {{system.currentDate}}.</em></p>
    `,
    fields: [
      { key: 'client_name', label: 'Client Name', type: 'string', required: true },
      { key: 'client_gstin', label: 'Client GSTIN', type: 'string', required: true },
      { key: 'client_city', label: 'Client City', type: 'string', required: false },
      { key: 'client_state', label: 'Client State', type: 'string', required: false },
      { key: 'case_number', label: 'Case Number', type: 'string', required: true },
      { key: 'case_title', label: 'Case Title', type: 'string', required: false },
      { key: 'case_status', label: 'Case Status', type: 'string', required: false },
      { key: 'case_stage', label: 'Case Stage', type: 'string', required: false },
      { key: 'case_opened_on', label: 'Opened On', type: 'string', required: false },
    ],
    variableMappings: {
      'client.display_name': 'client.display_name',
      'client.gstin': 'client.gstin',
      'client.city': 'client.city',
      'client.state': 'client.state',
      'case.case_number': 'case.case_number',
      'case.title': 'case.title',
      'case.status': 'case.status',
      'case.stage_code': 'case.stage_code',
      'case.opened_on': 'case.opened_on',
      'system.currentDate': 'system.currentDate',
    },
    prefill: {
      'client_name': 'client.display_name',
      'client_gstin': 'client.gstin',
      'client_city': 'client.city',
      'client_state': 'client.state',
      'case_number': 'case.case_number',
      'case_title': 'case.title',
      'case_status': 'case.status',
      'case_stage': 'case.stage_code',
    },
    output: {
      filename: '${code}_${case.case_number}_${now:YYYYMMDD}.pdf',
      dms_folder_by_stage: true,
      timeline_event: 'Document Generated',
    },
  },
];

/**
 * Initialize seed templates in storage
 */
export const initializeSeedTemplates = async (): Promise<void> => {
  try {
    const existingTemplates = await customTemplatesService.getCustomTemplates();
    
    for (const seedTemplate of SEED_TEMPLATES) {
      // Check if template already exists
      const exists = existingTemplates.some(t => t.code === seedTemplate.code);
      
      if (!exists) {
        await customTemplatesService.saveTemplate(seedTemplate as any);
        console.log(`✅ Seed template created: ${seedTemplate.code}`);
      } else {
        console.log(`ℹ️ Seed template already exists: ${seedTemplate.code}`);
      }
    }
  } catch (error) {
    console.error('❌ Error initializing seed templates:', error);
  }
};

/**
 * Get mock data for template preview
 */
export const getMockData = () => ({
  client: {
    display_name: 'ABC Traders Ltd.',
    gstin: '27AABCU9603R1Z5',
    city: 'Mumbai',
    state: 'Maharashtra',
  },
  case: {
    case_number: 'DRC-01/2025/09/112',
    title: 'GST Scrutiny - Input Tax Credit Discrepancy',
    status: 'Open',
    stage_code: 'SCRUTINY',
    opened_on: new Date('2025-09-15'),
  },
  system: {
    currentDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
  },
});
