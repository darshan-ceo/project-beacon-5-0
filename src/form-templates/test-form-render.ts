// Test script to verify form template rendering
import { reportsService } from '../services/reportsService';

export async function testGSTATFormRender() {
  try {
    console.log('[FormTemplates] Testing GSTAT form render...');
    
    const samplePayload = {
      jurisdiction: 'Mumbai',
      order_no: 'ORDER/2024/001',
      order_date: '2024-03-15',
      grounds: 'The order passed by the lower authority is contrary to the provisions of the CGST Act and the principles of natural justice. The demand raised is without basis and the penalty imposed is excessive.',
      reliefs: 'It is prayed that the impugned order be set aside and the demand be dropped.',
      annexures: ['Copy of impugned order', 'Supporting documents', 'Legal precedents'],
      verification_place: 'Mumbai',
      verification_date: '2024-03-20',
      signatory_name: 'CA John Doe',
      signatory_designation: 'Chartered Accountant'
    };

    const result = await reportsService.renderFormPDF('GSTAT', 'CASE-001', samplePayload);
    
    console.log(`[FormTemplates] GSTAT render OK - Blob size: ${result.blob.size} bytes`);
    console.log(`[FormTemplates] Suggested filename: ${result.suggestedFilename}`);
    
    return result;
  } catch (error) {
    console.error('[FormTemplates] Test failed:', error);
    throw error;
  }
}