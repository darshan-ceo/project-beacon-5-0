/**
 * Test Data Seeder - Creates sample documents with realistic content for testing search
 */
import { generateSampleContent } from './fileTypeUtils';

export interface TestDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  caseId: string;
  clientId: string;
  uploadedById: string;
  uploadedByName: string;
  uploadedAt: string;
  tags: string[];
  isShared: boolean;
  path: string;
  content?: string;
}

export const seedTestDocuments = (): TestDocument[] => {
  const documents: TestDocument[] = [
    {
      id: 'doc-multistate-1',
      name: 'MultiState_Logistics_GST_Notice.pdf',
      type: 'application/pdf',
      size: 156789,
      caseId: 'case-gst-001',
      clientId: 'client-multistate',
      uploadedById: 'user-1',
      uploadedByName: 'Legal Assistant',
      uploadedAt: new Date().toISOString(),
      tags: ['gst', 'notice', 'multistate', 'logistics'],
      isShared: false,
      path: '/MultiState_Logistics_GST_Notice.pdf'
    },
    {
      id: 'doc-multistate-2',
      name: 'MultiState_Tax_Assessment_Reply.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 89345,
      caseId: 'case-gst-001',
      clientId: 'client-multistate',
      uploadedById: 'user-2',
      uploadedByName: 'Senior Associate',
      uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['tax', 'assessment', 'reply', 'multistate'],
      isShared: true,
      path: '/MultiState_Tax_Assessment_Reply.docx'
    },
    {
      id: 'doc-multistate-3',
      name: 'Logistics_Company_Registration.txt',
      type: 'text/plain',
      size: 12456,
      caseId: 'case-gst-001',
      clientId: 'client-multistate',
      uploadedById: 'user-1',
      uploadedByName: 'Legal Assistant',
      uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['registration', 'company', 'logistics'],
      isShared: false,
      path: '/Logistics_Company_Registration.txt'
    },
    {
      id: 'doc-sample-4',
      name: 'Sample_Contract_Agreement.pdf',
      type: 'application/pdf',
      size: 234567,
      caseId: 'case-contract-002',
      clientId: 'client-abc',
      uploadedById: 'user-3',
      uploadedByName: 'Partner',
      uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['contract', 'agreement', 'sample'],
      isShared: true,
      path: '/Sample_Contract_Agreement.pdf'
    },
    {
      id: 'doc-test-5',
      name: 'Test_Document_Invoice.json',
      type: 'application/json',
      size: 8734,
      caseId: 'case-invoice-003',
      clientId: 'client-xyz',
      uploadedById: 'user-2',
      uploadedByName: 'Senior Associate',
      uploadedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['invoice', 'test', 'json'],
      isShared: false,
      path: '/Test_Document_Invoice.json'
    }
  ];

  // Generate content for each document
  documents.forEach(doc => {
    doc.content = btoa(generateSampleContent(doc.name, doc.type));
  });

  return documents;
};

export const seedTestCases = () => [
  {
    id: 'case-gst-001',
    title: 'GST Assessment Appeal',
    caseNumber: 'GST/2024/001',
    clientName: 'MultiState Logistics Limited',
    client: 'MultiState Logistics Limited',
    description: 'Appeal against GST assessment order for financial year 2023-24',
    subject: 'Tax assessment dispute involving input tax credit claims',
    status: 'Active',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'case-contract-002',
    title: 'Contract Dispute Resolution',
    caseNumber: 'CONTRACT/2024/002',
    clientName: 'ABC Corporation',
    client: 'ABC Corporation',
    description: 'Commercial contract dispute resolution',
    subject: 'Breach of contract claim and damages',
    status: 'Under Review',
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    lastActivity: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'case-invoice-003',
    title: 'Invoice Verification Matter',
    caseNumber: 'INV/2024/003',
    clientName: 'XYZ Enterprises',
    client: 'XYZ Enterprises',
    description: 'Invoice verification and compliance check',
    subject: 'Documentation and compliance review',
    status: 'Completed',
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    lastActivity: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const seedTestHearings = () => [
  {
    id: 'hearing-1',
    purpose: 'Initial hearing for GST assessment appeal',
    title: 'GST Assessment Appeal Hearing',
    caseNumber: 'GST/2024/001',
    caseTitle: 'MultiState Logistics Limited vs Commissioner',
    caseId: 'case-gst-001',
    court: 'High Court - Tax Division',
    date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    scheduledDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Scheduled',
    createdAt: new Date().toISOString()
  },
  {
    id: 'hearing-2',
    purpose: 'Contract dispute mediation session',
    title: 'Mediation Session',
    caseNumber: 'CONTRACT/2024/002',
    caseTitle: 'ABC Corporation Contract Dispute',
    caseId: 'case-contract-002',
    court: 'Arbitration Center',
    date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    scheduledDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Scheduled',
    createdAt: new Date().toISOString()
  }
];

/**
 * Seeds test data to localStorage for immediate testing
 */
export const seedTestDataToLocalStorage = () => {
  const lawfirmData = JSON.parse(localStorage.getItem('lawfirm_app_data') || '{}');
  
  const testDocuments = seedTestDocuments();
  const testCases = seedTestCases();
  const testHearings = seedTestHearings();
  
  // Merge with existing data
  lawfirmData.documents = [...(lawfirmData.documents || []), ...testDocuments];
  lawfirmData.cases = [...(lawfirmData.cases || []), ...testCases];
  lawfirmData.hearings = [...(lawfirmData.hearings || []), ...testHearings];
  
  localStorage.setItem('lawfirm_app_data', JSON.stringify(lawfirmData));
  
  console.log('✅ Test data seeded successfully:', {
    documents: testDocuments.length,
    cases: testCases.length,
    hearings: testHearings.length
  });
  
  return {
    documents: testDocuments,
    cases: testCases,
    hearings: testHearings
  };
};