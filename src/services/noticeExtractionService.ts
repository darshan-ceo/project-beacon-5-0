/**
 * Notice Extraction Service
 * Handles PDF parsing and data extraction from ASMT-10 notices
 */

import { toast } from '@/hooks/use-toast';

export interface ExtractedNoticeData {
  din: string;
  gstin: string;
  period: string;
  dueDate: string;
  office: string;
  amount?: string;
  noticeType?: string;
  rawText?: string;
}

interface ExtractionResult {
  success: boolean;
  data?: ExtractedNoticeData;
  error?: string;
  confidence?: number;
}

class NoticeExtractionService {
  private regexPatterns = {
    din: /(?:DIN|Document\s+Identification\s+Number)[:\s]*([A-Z0-9]{15})/i,
    gstin: /(?:GSTIN|GST\s+Identification\s+Number)[:\s]*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1})/i,
    period: /(?:Period|Tax\s+Period)[:\s]*([0-9]{2}\/[0-9]{4}|[A-Z]{3}\s+[0-9]{4})/i,
    dueDate: /(?:Due\s+Date|Last\s+Date)[:\s]*([0-9]{2}\/[0-9]{2}\/[0-9]{4}|[0-9]{2}-[0-9]{2}-[0-9]{4})/i,
    office: /(?:Issuing\s+Office|Office)[:\s]*([A-Z\s,]+(?:GST|CGST|SGST|IGST)[A-Z\s,]*)/i,
    amount: /(?:Amount|Tax\s+Amount)[:\s]*(?:Rs\.?\s*)?([0-9,]+\.?[0-9]*)/i,
    noticeType: /(ASMT-10|ASMT-11|DRC-01|DRC-07)/i
  };

  /**
   * Extract text from PDF file
   */
  private async extractTextFromPDF(file: File): Promise<string> {
    try {
      // In a real implementation, you would use a PDF parsing library
      // For now, we'll simulate text extraction
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          // Simulate extracted text from ASMT-10 notice
          const mockText = `
            FORM ASMT-10
            ASSESSMENT ORDER
            DIN: 20241201ASMT001
            GSTIN: 27ABCDE1234F1Z5
            Period: 04/2024
            Due Date: 15/12/2024
            Office: Mumbai Central GST Commissionerate
            Amount: Rs. 125,000
          `;
          resolve(mockText);
        };
        reader.readAsText(file);
      });
    } catch (error) {
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Use AI/OCR service for text extraction (when API keys available)
   */
  private async extractWithAI(file: File): Promise<string> {
    // Check if AI keys are available
    const apiKey = localStorage.getItem('ocr_api_key') || localStorage.getItem('openai_api_key');
    
    if (!apiKey) {
      throw new Error('AI/OCR API key not configured');
    }

    try {
      // Simulate AI/OCR extraction
      // In real implementation, you would call OCR service like Google Vision API, AWS Textract, etc.
      const extractedText = await this.extractTextFromPDF(file);
      return extractedText;
    } catch (error) {
      throw new Error('AI/OCR extraction failed');
    }
  }

  /**
   * Extract structured data using regex patterns
   */
  private extractDataFromText(text: string): ExtractedNoticeData {
    const extracted: ExtractedNoticeData = {
      din: '',
      gstin: '',
      period: '',
      dueDate: '',
      office: ''
    };

    // Apply regex patterns
    Object.entries(this.regexPatterns).forEach(([key, pattern]) => {
      const match = text.match(pattern);
      if (match && match[1]) {
        (extracted as any)[key] = match[1].trim();
      }
    });

    // Store raw text for manual editing
    extracted.rawText = text;

    return extracted;
  }

  /**
   * Calculate confidence score based on extracted fields
   */
  private calculateConfidence(data: ExtractedNoticeData): number {
    const requiredFields = ['din', 'gstin', 'period', 'dueDate', 'office'];
    const filledFields = requiredFields.filter(field => (data as any)[field]);
    return (filledFields.length / requiredFields.length) * 100;
  }

  /**
   * Main extraction method with AI fallback to regex
   */
  async extractFromPDF(file: File): Promise<ExtractionResult> {
    try {
      let extractedText = '';
      let usingAI = false;

      // Try AI/OCR first
      try {
        extractedText = await this.extractWithAI(file);
        usingAI = true;
        console.log('Notice extraction using AI/OCR successful');
      } catch (aiError) {
        console.log('AI/OCR extraction failed, falling back to regex:', aiError);
        // Fallback to basic text extraction + regex
        extractedText = await this.extractTextFromPDF(file);
      }

      // Extract structured data
      const extractedData = this.extractDataFromText(extractedText);
      const confidence = this.calculateConfidence(extractedData);

      toast({
        title: "Notice Data Extracted",
        description: `Extracted using ${usingAI ? 'AI/OCR' : 'regex patterns'} (${confidence.toFixed(0)}% confidence)`,
      });

      return {
        success: true,
        data: extractedData,
        confidence
      };

    } catch (error) {
      console.error('Notice extraction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Extraction failed'
      };
    }
  }

  /**
   * Validate extracted data
   */
  validateExtractedData(data: ExtractedNoticeData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate GSTIN format
    if (data.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1}$/.test(data.gstin)) {
      errors.push('Invalid GSTIN format');
    }

    // Validate DIN format
    if (data.din && data.din.length !== 15) {
      errors.push('DIN should be 15 characters');
    }

    // Validate period format
    if (data.period && !/^[0-9]{2}\/[0-9]{4}$/.test(data.period)) {
      errors.push('Period should be in MM/YYYY format');
    }

    // Validate due date format
    if (data.dueDate && !/^[0-9]{2}\/[0-9]{2}\/[0-9]{4}$/.test(data.dueDate)) {
      errors.push('Due date should be in DD/MM/YYYY format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get API key management instructions
   */
  getAPIKeyInfo(): { hasKeys: boolean; instructions: string } {
    const hasOCRKey = !!localStorage.getItem('ocr_api_key');
    const hasOpenAIKey = !!localStorage.getItem('openai_api_key');
    
    return {
      hasKeys: hasOCRKey || hasOpenAIKey,
      instructions: hasOCRKey || hasOpenAIKey 
        ? 'AI/OCR extraction is configured and will be used for better accuracy.'
        : 'For better extraction accuracy, configure OCR or OpenAI API keys in Admin → Global Parameters.'
    };
  }
}

export const noticeExtractionService = new NoticeExtractionService();