/**
 * Notice Extraction Service
 * Handles PDF parsing and data extraction from ASMT-10 notices
 */

import { toast } from '@/hooks/use-toast';
import * as pdfjsLib from 'pdfjs-dist';

export interface FieldConfidence {
  value: string;
  confidence: number; // 0-100
  source: 'ocr' | 'regex' | 'manual';
}

export interface ExtractedNoticeData {
  din: string;
  gstin: string;
  period: string;
  dueDate: string;
  office: string;
  amount?: string;
  noticeType?: string;
  noticeNo?: string;
  issueDate?: string;
  rawText?: string;
  fieldConfidence?: Record<string, FieldConfidence>;
}

interface ExtractionResult {
  success: boolean;
  data?: ExtractedNoticeData;
  error?: string;
  confidence?: number;
}

class NoticeExtractionService {
  constructor() {
    // Configure PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }

  private regexPatterns = {
    din: /(?:DIN|Document\s+Identification\s+Number|Unique\s+ID)[:\s]*([A-Z0-9]{15})/i,
    noticeNo: /(?:Notice\s+No\.?|Reference\s+No\.?|Notice\s+Number)[:\s]*([A-Z0-9\-\/]+)/i,
    gstin: /(?:GSTIN|GST\s+Identification\s+Number|GSTIN\s+of\s+Taxpayer)[:\s]*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1})/i,
    period: /(?:Period|Tax\s+Period|Financial\s+Period)[:\s]*([0-9]{2}\/[0-9]{4}|[A-Z]{3}[-\s][0-9]{4}|[0-9]{4}-[0-9]{2})/i,
    issueDate: /(?:Issue\s+Date|Date\s+of\s+Issue|Issued\s+on)[:\s]*([0-9]{2}[\/\-][0-9]{2}[\/\-][0-9]{4})/i,
    dueDate: /(?:Due\s+Date|Last\s+Date|Response\s+Due|Reply\s+by)[:\s]*([0-9]{2}[\/\-][0-9]{2}[\/\-][0-9]{4})/i,
    office: /(?:Issuing\s+Office|Office|Jurisdiction|Commissionerate)[:\s]*([A-Z][A-Z\s,\-]+(?:GST|CGST|SGST|IGST|Commissionerate)[A-Z\s,\-]*)/i,
    amount: /(?:Amount|Tax\s+Amount|Total\s+Amount|Discrepancy)[:\s]*(?:Rs\.?\s*|₹\s*)?([0-9,]+\.?[0-9]*)/i,
    noticeType: /(ASMT-10|ASMT-11|ASMT-12|DRC-01|DRC-07|GSTR[-\s]?[0-9A-Z]+)/i
  };

  /**
   * Extract text from PDF file using PDF.js
   */
  private async extractTextFromPDF(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 10); pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }
      
      return fullText;
    } catch (error) {
      console.error('PDF text extraction error:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Convert PDF first page to PNG image for Vision API
   */
  private async pdfToBase64Image(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      // Render first page to canvas
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 }); // Higher resolution
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Failed to get canvas context');
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext as any).promise;
      
      // Convert canvas to base64 PNG
      const base64 = canvas.toDataURL('image/png').split(',')[1];
      return base64;
    } catch (error) {
      console.error('PDF to image conversion error:', error);
      throw new Error('Failed to convert PDF to image');
    }
  }

  /**
   * Use OpenAI Vision API for text extraction with confidence scoring
   */
  private async extractWithAI(file: File): Promise<{ text: string; fieldConfidence: Record<string, FieldConfidence> }> {
    const apiKey = localStorage.getItem('openai_api_key');
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      // Convert PDF to base64 image
      const base64Image = await this.pdfToBase64Image(file);

      // Call OpenAI Vision API with structured extraction prompt
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are an expert at extracting structured data from GST notices. Extract the following fields from the notice image and provide confidence scores (0-100) for each field:
- DIN (Document Identification Number): 15 character alphanumeric
- GSTIN: 15 character format (2 digits + 5 letters + 4 digits + 1 letter + 1 alphanumeric + Z + 1 alphanumeric)
- Period: Tax period in MM/YYYY format
- Due Date: Date in DD/MM/YYYY format
- Office: Issuing GST office name
- Amount: Tax amount if mentioned
- Notice Type: Type of notice (ASMT-10, ASMT-11, DRC-01, DRC-07, etc.)

Return the data as JSON with this structure:
{
  "fields": {
    "din": { "value": "...", "confidence": 95 },
    "gstin": { "value": "...", "confidence": 90 },
    "period": { "value": "...", "confidence": 85 },
    "dueDate": { "value": "...", "confidence": 90 },
    "office": { "value": "...", "confidence": 80 },
    "amount": { "value": "...", "confidence": 75 },
    "noticeType": { "value": "...", "confidence": 95 }
  },
  "rawText": "full extracted text..."
}`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract all information from this GST notice with confidence scores:'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/png;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 2000,
          temperature: 0.1
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI Vision API error:', response.status, errorText);
        
        if (response.status === 401) {
          throw new Error('Invalid OpenAI API key. Please reconfigure in wizard.');
        } else if (response.status === 429) {
          throw new Error('OpenAI rate limit exceeded. Please try again later.');
        }
        
        throw new Error(`Vision API request failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Parse the JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse Vision API response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Convert to our field confidence format
      const fieldConfidence: Record<string, FieldConfidence> = {};
      Object.entries(parsed.fields || {}).forEach(([key, field]: [string, any]) => {
        if (field && field.value) {
          fieldConfidence[key] = {
            value: field.value,
            confidence: field.confidence || 0,
            source: 'ocr'
          };
        }
      });

      return {
        text: parsed.rawText || content,
        fieldConfidence
      };

    } catch (error) {
      console.error('AI/OCR extraction error:', error);
      throw new Error('AI/OCR extraction failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Extract structured data using regex patterns with confidence scoring
   */
  private extractDataFromText(text: string): ExtractedNoticeData {
    const extracted: ExtractedNoticeData = {
      din: '',
      gstin: '',
      period: '',
      dueDate: '',
      office: '',
      fieldConfidence: {}
    };

    // Apply regex patterns with confidence based on match quality
    Object.entries(this.regexPatterns).forEach(([key, pattern]) => {
      const match = text.match(pattern);
      if (match && match[1]) {
        const value = match[1].trim()
          .replace(/\s+/g, ' ') // Normalize spaces
          .replace(/[–—]/g, '-'); // Normalize dashes
        
        (extracted as any)[key] = value;
        
        // Calculate confidence based on validation
        let confidence = 50; // Base confidence for regex match
        
        // Boost confidence for well-formed matches
        if (key === 'gstin' && /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1}$/.test(value)) {
          confidence = 85;
        } else if (key === 'din' && value.length === 15) {
          confidence = 80;
        } else if (key === 'noticeNo' && value.length > 5) {
          confidence = 75;
        } else if (key === 'period') {
          // Handle multiple period formats
          if (/^[0-9]{2}\/[0-9]{4}$/.test(value)) confidence = 85;
          else if (/^[A-Z]{3}[-\s][0-9]{4}$/.test(value)) confidence = 80;
          else if (/^[0-9]{4}-[0-9]{2}$/.test(value)) confidence = 75;
          else confidence = 60;
        } else if (key === 'issueDate' || key === 'dueDate') {
          if (/^[0-9]{2}[\/\-][0-9]{2}[\/\-][0-9]{4}$/.test(value)) {
            confidence = 85;
          } else {
            confidence = 60;
          }
        } else if (key === 'noticeType' && /(ASMT-10|ASMT-11|ASMT-12|DRC-01|DRC-07)/.test(value)) {
          confidence = 95;
        } else if (key === 'office' && value.length > 10) {
          confidence = 70;
        } else if (key === 'amount' && /^[0-9,]+\.?[0-9]*$/.test(value.replace(/,/g, ''))) {
          confidence = 75;
        } else {
          confidence = 60;
        }
        
        extracted.fieldConfidence![key] = {
          value,
          confidence,
          source: 'regex'
        };
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
      let extractedData: ExtractedNoticeData;
      let usingAI = false;

      // Try AI/OCR first
      try {
        const aiResult = await this.extractWithAI(file);
        usingAI = true;
        
        // Merge AI-extracted data with our structure
        extractedData = {
          din: aiResult.fieldConfidence.din?.value || '',
          gstin: aiResult.fieldConfidence.gstin?.value || '',
          period: aiResult.fieldConfidence.period?.value || '',
          dueDate: aiResult.fieldConfidence.dueDate?.value || '',
          office: aiResult.fieldConfidence.office?.value || '',
          amount: aiResult.fieldConfidence.amount?.value || '',
          noticeType: aiResult.fieldConfidence.noticeType?.value || '',
          rawText: aiResult.text,
          fieldConfidence: aiResult.fieldConfidence
        };
        
        console.log('Notice extraction using AI/OCR successful');
      } catch (aiError) {
        console.log('AI/OCR extraction failed, falling back to regex:', aiError);
        // Fallback to basic text extraction + regex
        const extractedText = await this.extractTextFromPDF(file);
        extractedData = this.extractDataFromText(extractedText);
        usingAI = false;
      }

      const confidence = this.calculateConfidence(extractedData);

      toast({
        title: "Notice Data Extracted",
        description: `Extracted using ${usingAI ? 'AI/OCR' : 'regex patterns'} (${Math.round(confidence)}% fields found)`,
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
    const hasOpenAIKey = !!localStorage.getItem('openai_api_key');
    
    return {
      hasKeys: hasOpenAIKey,
      instructions: hasOpenAIKey 
        ? 'OpenAI Vision API is configured. Extraction accuracy: ~90-95%'
        : 'Add OpenAI API key for 90%+ extraction accuracy with field-level confidence scoring.'
    };
  }

  /**
   * Set OpenAI API key
   */
  setAPIKey(apiKey: string) {
    localStorage.setItem('openai_api_key', apiKey);
    toast({
      title: "API Key Saved",
      description: "OpenAI Vision API is now active for OCR extraction",
    });
  }

  /**
   * Clear API key
   */
  clearAPIKey() {
    localStorage.removeItem('openai_api_key');
    toast({
      title: "API Key Removed",
      description: "Fallback to regex-based extraction",
    });
  }
}

export const noticeExtractionService = new NoticeExtractionService();