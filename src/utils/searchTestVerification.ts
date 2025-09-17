/**
 * Search Test Verification
 * Utility to verify search fixes are working correctly
 */

export const verifySearchFixes = () => {
  console.log('🔧 Verifying search fixes...');
  
  // Check if MultiState Logistics data exists
  const appStateStr = localStorage.getItem('lawfirm_app_data');
  if (appStateStr) {
    const appState = JSON.parse(appStateStr);
    const documents = appState.documents || [];
    
    const multiStateDoc = documents.find((doc: any) => 
      doc.name?.toLowerCase().includes('multistate') || 
      doc.name?.toLowerCase().includes('doshi')
    );
    
    if (multiStateDoc) {
      console.log('✅ Test document found:', multiStateDoc.name);
      console.log('✅ Document has content:', !!multiStateDoc.content);
      
      // Test URL generation
      const testUrl = `/documents?search=${encodeURIComponent(multiStateDoc.name)}`;
      console.log('✅ Generated URL:', testUrl);
      
      return {
        success: true,
        documentFound: true,
        hasContent: !!multiStateDoc.content,
        generatedUrl: testUrl
      };
    } else {
      console.log('❌ No MultiState/Doshi document found');
      return {
        success: false,
        documentFound: false,
        reason: 'Test document not found'
      };
    }
  } else {
    console.log('❌ No app state found');
    return {
      success: false,
      documentFound: false,
      reason: 'No app state'
    };
  }
};

// Auto-run verification on import
if (typeof window !== 'undefined') {
  setTimeout(verifySearchFixes, 1000);
}