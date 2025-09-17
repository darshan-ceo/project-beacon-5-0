// Quick test data seeder - run this in browser console
const seedData = () => {
  const lawfirmData = JSON.parse(localStorage.getItem('lawfirm_app_data') || '{}');
  
  const testDocs = [
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
    }
  ];
  
  const testCases = [
    {
      id: 'case-gst-001',
      title: 'GST Assessment Appeal',
      caseNumber: 'GST/2024/001',
      clientName: 'MultiState Logistics Limited',
      client: 'MultiState Logistics Limited',
      description: 'Appeal against GST assessment order',
      subject: 'Tax assessment dispute',
      status: 'Active'
    }
  ];
  
  lawfirmData.documents = [...(lawfirmData.documents || []), ...testDocs];
  lawfirmData.cases = [...(lawfirmData.cases || []), ...testCases];
  
  localStorage.setItem('lawfirm_app_data', JSON.stringify(lawfirmData));
  console.log('✅ Test data seeded');
};

seedData();