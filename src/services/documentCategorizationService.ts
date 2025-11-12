/**
 * Document Categorization Service
 * Uses pattern matching and AI to automatically categorize documents
 */

import { supabase } from '@/integrations/supabase/client';

export type DocumentCategory = 
  | 'Notice'
  | 'Reply'
  | 'Adjournment'
  | 'Order'
  | 'Submission'
  | 'Miscellaneous';

interface CategorizationResult {
  category: DocumentCategory;
  confidence: number;
  reasoning?: string;
}

// Pattern matching rules for different document categories
const CATEGORY_PATTERNS: Record<DocumentCategory, RegExp[]> = {
  'Notice': [
    /notice/i,
    /notification/i,
    /intimation/i,
    /scn/i,
    /show[\s-]?cause/i,
  ],
  'Reply': [
    /reply/i,
    /response/i,
    /submission/i,
    /answer/i,
    /revert/i,
  ],
  'Adjournment': [
    /adjourn/i,
    /postpone/i,
    /defer/i,
    /reschedule/i,
  ],
  'Order': [
    /order/i,
    /judgment/i,
    /ruling/i,
    /decree/i,
    /decision/i,
  ],
  'Submission': [
    /written[\s-]?submission/i,
    /brief/i,
    /memorandum/i,
    /petition/i,
    /application/i,
  ],
  'Miscellaneous': [
    /misc/i,
    /other/i,
    /general/i,
    /document/i,
  ],
};

/**
 * Categorize document using filename pattern matching
 */
const categorizeByPattern = (filename: string): CategorizationResult | null => {
  const cleanName = filename.toLowerCase().replace(/[_-]/g, ' ');

  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(cleanName)) {
        return {
          category: category as DocumentCategory,
          confidence: 0.75,
          reasoning: `Matched pattern: ${pattern.source}`,
        };
      }
    }
  }

  return null;
};

/**
 * Categorize document using AI (Lovable AI - Gemini Flash Lite)
 */
const categorizeWithAI = async (filename: string): Promise<CategorizationResult | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('categorize-document', {
      body: { filename },
    });

    if (error) throw error;

    return data as CategorizationResult;
  } catch (error) {
    console.warn('AI categorization failed:', error);
    return null;
  }
};

/**
 * Clean filename for better display
 */
export const cleanFilename = (filename: string): string => {
  return filename
    .replace(/[_]/g, ' ')
    .replace(/\.(pdf|doc|docx|xlsx|jpg|png)$/i, '')
    .replace(/\s+/g, ' ')
    .replace(/v\d+$/i, '') // Remove version numbers
    .trim();
};

/**
 * Main categorization function
 * Uses pattern matching first, falls back to AI if confidence is low
 */
export const categorizeDocument = async (
  filename: string
): Promise<CategorizationResult> => {
  // Try pattern matching first (fast and free)
  const patternResult = categorizeByPattern(filename);

  if (patternResult && patternResult.confidence >= 0.7) {
    console.log('📋 Categorized by pattern:', patternResult);
    return patternResult;
  }

  // Try AI categorization for ambiguous cases
  const aiResult = await categorizeWithAI(filename);

  if (aiResult && aiResult.confidence >= 0.6) {
    console.log('🤖 Categorized by AI:', aiResult);
    return aiResult;
  }

  // Return pattern result or default to Miscellaneous
  return patternResult || {
    category: 'Miscellaneous',
    confidence: 0.3,
    reasoning: 'No pattern match or AI confidence',
  };
};

/**
 * Batch categorize multiple files
 */
export const categorizeDocumentsBatch = async (
  filenames: string[]
): Promise<CategorizationResult[]> => {
  const results = await Promise.all(
    filenames.map(filename => categorizeDocument(filename))
  );
  return results;
};
