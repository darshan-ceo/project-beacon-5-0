/**
 * Notice Extraction Service
 * Handles PDF parsing and data extraction from ASMT-10 notices
 */

import { toast } from '@/hooks/use-toast';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Error categories for user-friendly messages
type PDFErrorCategory = 'worker_blocked' | 'password_protected' | 'invalid_pdf' | 'file_empty' | 'unknown';

interface PDFLoadError extends Error {
  category: PDFErrorCategory;
  technicalDetails: string;
}

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
  // Extended extraction fields
  taxpayerName?: string;
  tradeName?: string;
  subject?: string;
  legalSection?: string;
  discrepancies?: Array<{
    particulars: string;
    claimed: number;
    asPerDept: number;
    difference: number;
  }>;
  // Document type detection
  documentType?: 'main_notice' | 'annexure';
  documentTypeLabel?: string;
}

interface ExtractionResult {
  success: boolean;
  data?: ExtractedNoticeData;
  error?: string;
  errorCode?: 'INVALID_API_KEY' | 'RATE_LIMIT' | 'PDF_PARSE_ERROR' | 'UNKNOWN';
  confidence?: number;
}

class NoticeExtractionService {
  constructor() {
    // Configure PDF.js worker with local bundle
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  }

  /**
   * Classify PDF.js errors into user-friendly categories
   */
  private classifyPDFError(error: any): { category: PDFErrorCategory; userMessage: string; technicalDetails: string } {
    const message = error?.message || String(error);
    const name = error?.name || '';
    
    // Check for password-protected PDFs
    if (name === 'PasswordException' || message.toLowerCase().includes('password')) {
      return {
        category: 'password_protected',
        userMessage: 'This PDF is password-protected. Please remove the password and re-upload.',
        technicalDetails: message
      };
    }
    
    // Check for worker loading issues
    if (
      message.includes('Failed to fetch') ||
      message.includes('imported module') ||
      message.includes('Failed to load module') ||
      message.includes('NetworkError') ||
      message.includes('dynamically imported module')
    ) {
      return {
        category: 'worker_blocked',
        userMessage: 'Your browser/network is blocking the PDF parser. Try Incognito mode, disable extensions, or use another browser.',
        technicalDetails: `Worker load failed: ${message}`
      };
    }
    
    // Check for invalid PDF structure
    if (
      message.includes('Invalid PDF') ||
      message.includes('missing header') ||
      message.includes('stream must have data') ||
      message.includes('Invalid XRef')
    ) {
      return {
        category: 'invalid_pdf',
        userMessage: 'This file doesn\'t appear to be a valid PDF. Please upload a different file.',
        technicalDetails: message
      };
    }
    
    // Check for empty/corrupted files
    if (message.includes('empty') || message.includes('0 bytes') || message.includes('corrupted')) {
      return {
        category: 'file_empty',
        userMessage: 'The PDF file is empty or corrupted. Please re-upload the file.',
        technicalDetails: message
      };
    }
    
    return {
      category: 'unknown',
      userMessage: 'Failed to process PDF. Please try a different file.',
      technicalDetails: message
    };
  }

  /**
   * Load PDF with automatic worker fallback
   * Tries worker mode first, falls back to no-worker mode if blocked
   */
  private async loadPdf(arrayBuffer: ArrayBuffer): Promise<PDFDocumentProxy> {
    console.log('📄 [PDF.js] Loading PDF, buffer size:', arrayBuffer.byteLength);
    
    if (arrayBuffer.byteLength === 0) {
      const error = new Error('PDF file is empty (0 bytes)') as PDFLoadError;
      error.category = 'file_empty';
      error.technicalDetails = 'ArrayBuffer has 0 bytes';
      throw error;
    }
    
    // Check PDF header (%PDF-)
    const header = new Uint8Array(arrayBuffer.slice(0, 5));
    const headerString = String.fromCharCode(...header);
    console.log('📄 [PDF.js] File header:', headerString);
    
    if (headerString !== '%PDF-') {
      console.warn('📄 [PDF.js] Invalid PDF header:', headerString);
      const error = new Error('File does not have a valid PDF header') as PDFLoadError;
      error.category = 'invalid_pdf';
      error.technicalDetails = `Header: "${headerString}" (expected "%PDF-")`;
      throw error;
    }
    
    // Try with worker first
    try {
      console.log('📄 [PDF.js] Attempting load with worker...');
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      console.log('📄 [PDF.js] Worker mode succeeded, pages:', pdf.numPages);
      return pdf;
    } catch (workerError) {
      const classified = this.classifyPDFError(workerError);
      console.warn('📄 [PDF.js] Worker mode failed:', classified.technicalDetails);
      
      // Don't retry for password-protected or invalid PDFs
      if (classified.category === 'password_protected' || classified.category === 'invalid_pdf') {
        const error = new Error(classified.userMessage) as PDFLoadError;
        error.category = classified.category;
        error.technicalDetails = classified.technicalDetails;
        throw error;
      }
      
      // Retry without worker for network/CSP issues
      try {
        console.log('📄 [PDF.js] Retrying without worker (useWorkerFetch: false)...');
        const pdf = await pdfjsLib.getDocument({ 
          data: arrayBuffer, 
          useWorkerFetch: false,
          isEvalSupported: false
        }).promise;
        console.log('📄 [PDF.js] No-worker mode succeeded, pages:', pdf.numPages);
        return pdf;
      } catch (noWorkerError) {
        const retryClassified = this.classifyPDFError(noWorkerError);
        console.error('📄 [PDF.js] Both modes failed:', retryClassified.technicalDetails);
        
        const error = new Error(retryClassified.userMessage) as PDFLoadError;
        error.category = retryClassified.category;
        error.technicalDetails = `Worker: ${classified.technicalDetails} | No-worker: ${retryClassified.technicalDetails}`;
        throw error;
      }
    }
  }

  private regexPatterns = {
    // DIN format - 15-20 characters alphanumeric
    din: /DIN[\s:]*([A-Z0-9]{15,20})/i,
    
    // Notice Number - multiple formats for different notice types
    noticeNo: /(?:Reference\s*No\.?|Notice\s*(?:No\.?|Number)|Ref\.?\s*No\.?|Case\s*ID)[\s.:]*([A-Z0-9\/\-]+)/i,
    
    // GSTIN - standard 15 character format
    gstin: /GSTIN[\s:]*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z])/i,
    
    // Period - support F.Y. format, YYYY-YY, and monthly formats
    period: /(?:F\.?Y\.?\s*(?:From\s*:?)?|Tax\s*Period|Period)[\s:]*(\d{4}[-\s]*(?:to\s*)?[-\s]*\d{2,4}|\d{4}[-\/]\d{2,4}|[A-Z][a-z]+\s+\d{4}\s*[-–to]+\s*[A-Z][a-z]+\s+\d{4})/i,
    
    // Issue Date - support DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY
    issueDate: /(?:Date[\s:]*|Dated[\s:]*|Issue\s*Date[\s:]*)(\d{2}[\/\.\-]\d{2}[\/\.\-]\d{4})/i,
    
    // Due date - multiple labels
    dueDate: /(?:Due\s*Date|Last\s*Date|Response\s*Due|Reply\s*by|Comply\s*by|On\s*or\s*before)[\s:]*(\d{2}[\/\.\-]\d{2}[\/\.\-]\d{4})/i,
    
    // Office - GST office patterns
    office: /(?:CGST|SGST|GST)[\s\-,]*(?:Range|Division|Commissionerate|Commissioner|Circle)[^\n]*/i,
    
    // Amount - Indian lakh format with ₹ and Rs.
    amount: /(?:Total\s*(?:Tax|Amount|Demand)?|Tax[\s:]*Amount|Demand[\s:]*Amount|(?:IGST|CGST|SGST)[\s:]*)(?:Rs\.?|₹)?\s*([\d,]+(?:\.\d{2})?)/i,
    
    // Notice type - all GST notice types including FORM prefix
    noticeType: /((?:FORM\s+)?GST\s+)?(?:ASMT[-\s]?(?:10|11|12)|DRC[-\s]?(?:01A?|03|07)|GSTR[-\s]?[0-9A-Z]+)/i,
    
    // Taxpayer name - look for "Name" or "M/s." label
    taxpayerName: /(?:Name|M\/s\.?)[\s:]+([A-Z][A-Z\s&.,()'\-]+(?:PVT\.?|PRIVATE|LTD\.?|LIMITED|ENTERPRISES?|TRADERS?|CO\.?|COMPANY)?[A-Z\s&.,()'\-]*)/i
  };

  /**
   * Extract text from PDF file using PDF.js with resilient loading
   */
  private async extractTextFromPDF(file: File): Promise<string> {
    console.log('📄 [extractTextFromPDF] Processing file:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });
    
    // Validate file before processing
    if (!file || file.size === 0) {
      throw new Error('PDF file is empty (0 bytes). Please re-upload the file.');
    }
    
    const arrayBuffer = await file.arrayBuffer();
    console.log('📄 [extractTextFromPDF] ArrayBuffer size:', arrayBuffer.byteLength);
    
    // Use resilient loader with worker fallback
    const pdf = await this.loadPdf(arrayBuffer);
    
    if (pdf.numPages === 0) {
      throw new Error('PDF has no pages');
    }
    
    let fullText = '';
    
    // Extract text from all pages with improved line detection
    for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 10); pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Improved text joining - add newlines between items with large Y gaps
      let lastY = 0;
      const pageText = textContent.items
        .map((item: any) => {
          const text = item.str;
          const y = item.transform ? item.transform[5] : 0; // Y position
          
          // Add newline if Y position changed significantly (new line)
          const prefix = (lastY && Math.abs(y - lastY) > 10) ? '\n' : ' ';
          lastY = y;
          
          return prefix + text;
        })
        .join('');
      
      fullText += pageText + '\n';
    }
    
    // Normalize whitespace but preserve newlines
    return fullText.replace(/[ \t]+/g, ' ').trim();
  }

  /**
   * Convert PDF pages to PNG images for Vision API (up to 4 pages)
   */
  private async pdfToBase64Images(file: File): Promise<string[]> {
    console.log('🖼️ [pdfToBase64Images] Converting to images:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    // Validate file before processing
    if (!file || file.size === 0) {
      throw new Error('PDF file is empty (0 bytes). Please re-upload the file.');
    }
    
    const arrayBuffer = await file.arrayBuffer();
    console.log('🖼️ [pdfToBase64Images] ArrayBuffer size:', arrayBuffer.byteLength);
    
    // Use resilient loader with worker fallback
    const pdf = await this.loadPdf(arrayBuffer);
    
    if (pdf.numPages === 0) {
      throw new Error('PDF has no pages');
    }
    
    const images: string[] = [];
    const maxPages = Math.min(pdf.numPages, 4); // Process up to 4 pages
    
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 }); // Slightly lower for multiple pages
      
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
      images.push(canvas.toDataURL('image/png').split(',')[1]);
    }
    
    console.log('🖼️ [pdfToBase64Images] Successfully converted', images.length, 'pages to images');
    
    return images;
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
      // Convert PDF to base64 images (up to 4 pages)
      const base64Images = await this.pdfToBase64Images(file);

      // Build image content array for Vision API
      const imageContent = base64Images.map(img => ({
        type: 'image_url' as const,
        image_url: {
          url: `data:image/png;base64,${img}`
        }
      }));

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
              content: `You are an expert at extracting structured data from GST notices (ASMT-10, ASMT-11, DRC-01, DRC-01A, DRC-03, DRC-07, etc.). Extract the following fields from the notice image and provide confidence scores (0-100) for each field:

DOCUMENT TYPE DETECTION:
- Identify if this is a main notice (DRC-01, ASMT-10, DRC-01A) or an annexure (Annexure-A, B, C, D)
- Return documentType: "main_notice" or "annexure"
- Annexures may not contain taxpayer details - extract what's available
- If this is an Annexure, also extract what notice type it's attached to (e.g., "Annexure-C to DRC-01A")

REQUIRED FIELDS:
- DIN (Document Identification Number): 15 character alphanumeric
- Notice Number/Reference: The notice/intimation reference number (separate from DIN)
- GSTIN: 15 character format (2 digits + 5 letters + 4 digits + 1 letter + 1 alphanumeric + Z + 1 alphanumeric)
- Notice Type: Type of notice (ASMT-10, ASMT-11, ASMT-12, DRC-01, DRC-01A, DRC-03, DRC-07, etc.)
- Issue Date: When the notice was issued (extract as DD/MM/YYYY or DD.MM.YYYY format)
- Due Date: Response deadline (DD/MM/YYYY or DD.MM.YYYY format)
- Tax Period: Period covered by the notice (e.g., "F.Y. 2021-22", "April 2021 - March 2022", "04/2024")

IMPORTANT GSTIN RULES:
- The TAXPAYER's GSTIN appears in the notice header or "To:" section
- Do NOT use supplier GSTINs from discrepancy tables
- Supplier GSTINs are listed in tables showing ITC details - these are NOT the taxpayer
- If taxpayer GSTIN is not visible (e.g., in Annexure), return empty string (not a supplier GSTIN)

TAXPAYER DETAILS:
- Taxpayer Name: The legal name of the taxpayer/business from the notice header (NOT supplier names from tables)
- Trade Name: Business trade name if different from legal name

NOTICE CONTENT:
- Subject: The full subject line of the notice (this becomes the Notice Title)
- Legal Section: GST Act section invoked (e.g., "Section 73(1)", "Section 74", "Section 61", "Section 16")
- Office: Issuing GST office/authority name (look for "CGST", "SGST", "Commissionerate", "Range", "Division")

AMOUNT EXTRACTION:
- Extract amounts as numeric values without commas
- Handle Indian lakh format: "97,06,154" = 9706154
- Handle "/-" suffix: "₹97,06,154/-" = 9706154
- Handle "lakhs": "97.06 lakhs" = 9706000
- Look for "Total Tax", "Demand", "ITC mismatch", "Difference" amounts

TAX PERIOD:
- Extract as "F.Y. 2021-22" or "April 2021 - March 2022"
- For scrutiny notices, look for "F.Y." followed by year range
- For monthly returns, look for "MM/YYYY" format

DISCREPANCY DETAILS (if present):
- Extract any tabular discrepancy data with columns: Particulars, Claimed/As per GSTR-3B, As per Dept/GSTR-2A, Difference
- Parse amounts correctly from Indian format

Return the data as JSON with this structure:
{
  "fields": {
    "documentType": { "value": "main_notice" or "annexure", "confidence": 90 },
    "documentTypeLabel": { "value": "DRC-01A" or "Annexure-C to DRC-01A", "confidence": 85 },
    "din": { "value": "...", "confidence": 95 },
    "noticeNo": { "value": "...", "confidence": 90 },
    "gstin": { "value": "...", "confidence": 95 },
    "noticeType": { "value": "ASMT-10", "confidence": 95 },
    "issueDate": { "value": "DD/MM/YYYY", "confidence": 85 },
    "dueDate": { "value": "DD/MM/YYYY", "confidence": 90 },
    "period": { "value": "F.Y. 2021-22", "confidence": 85 },
    "taxpayerName": { "value": "...", "confidence": 90 },
    "tradeName": { "value": "...", "confidence": 85 },
    "subject": { "value": "...", "confidence": 85 },
    "legalSection": { "value": "Section 73(1)", "confidence": 80 },
    "office": { "value": "CGST Range-II, Division-III, Jalandhar", "confidence": 80 },
    "amount": { "value": "9706154", "confidence": 85 },
    "discrepancies": { 
      "value": [
        { "particulars": "Input Tax Credit (IGST)", "claimed": 475000, "asPerDept": 230000, "difference": 245000 }
      ], 
      "confidence": 80 
    }
  },
  "rawText": "full extracted text..."
}`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract all information from this GST notice with confidence scores. This may be a multi-page document - analyze all pages provided:'
                },
                ...imageContent
              ]
            }
          ],
          max_tokens: 3000,
          temperature: 0.1
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI Vision API error:', response.status, errorText);
        
        if (response.status === 401) {
          const error = new Error('INVALID_API_KEY');
          (error as any).code = 'INVALID_API_KEY';
          throw error;
        } else if (response.status === 429) {
          const error = new Error('RATE_LIMIT');
          (error as any).code = 'RATE_LIMIT';
          throw error;
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
      console.error('❌ [AI Extraction] Error:', error);
      
      // Categorize errors for better user feedback
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Invalid API key')) {
          throw { code: 'INVALID_API_KEY', message: 'Invalid OpenAI API key' };
        }
        if (error.message.includes('429') || error.message.includes('rate limit')) {
          throw { code: 'RATE_LIMIT', message: 'API rate limit exceeded. Please try again later.' };
        }
      }
      
      throw { code: 'AI_ERROR', message: 'AI extraction failed: ' + (error instanceof Error ? error.message : 'Unknown error') };
    }
  }

  /**
   * Fallback to Lovable AI when OpenAI fails (uses edge function)
   */
  private async extractWithLovableAI(file: File): Promise<{ text: string; fieldConfidence: Record<string, FieldConfidence> }> {
    console.log('🔄 [Lovable AI] Starting extraction fallback...');
    
    try {
      // Convert PDF to base64 images (same as OpenAI method)
      const base64Images = await this.pdfToBase64Images(file);
      
      // Call the edge function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/notice-ocr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ images: base64Images })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Lovable AI edge function error:', response.status, errorText);
        
        // Check for configuration issues - throw specific error for graceful fallback
        if (response.status === 503 || response.status === 401) {
          console.log('⚠️ [Lovable AI] Service unavailable, will fallback to regex extraction');
          throw { 
            code: 'LOVABLE_AI_UNAVAILABLE', 
            message: 'Lovable AI service unavailable, falling back to regex extraction'
          };
        }
        
        throw new Error(`Lovable AI extraction failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Lovable AI extraction failed');
      }
      
      // Convert to our field confidence format
      const fieldConfidence: Record<string, FieldConfidence> = {};
      Object.entries(result.fields || {}).forEach(([key, field]: [string, any]) => {
        if (field && field.value) {
          fieldConfidence[key] = {
            value: field.value,
            confidence: field.confidence || 0,
            source: 'ocr'
          };
        }
      });
      
      console.log('✅ [Lovable AI] Extraction successful:', Object.keys(fieldConfidence));
      
      return {
        text: result.rawText || '',
        fieldConfidence
      };
    } catch (error) {
      console.error('❌ [Lovable AI] Error:', error);
      throw error;
    }
  }

  /**
   * Extract structured data using regex patterns with confidence scoring
   */
  private extractDataFromText(text: string): ExtractedNoticeData {
    console.debug('📄 [Regex Extraction] Starting with text length:', text.length);
    
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
        console.debug(`  ✓ [Regex] Found ${key}:`, value);
        
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
      let errorCode: ExtractionResult['errorCode'] | undefined;

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
          noticeNo: aiResult.fieldConfidence.noticeNo?.value || '',
          issueDate: aiResult.fieldConfidence.issueDate?.value || '',
          // Extended fields
          taxpayerName: aiResult.fieldConfidence.taxpayerName?.value || '',
          tradeName: aiResult.fieldConfidence.tradeName?.value || '',
          subject: aiResult.fieldConfidence.subject?.value || '',
          legalSection: aiResult.fieldConfidence.legalSection?.value || '',
          discrepancies: Array.isArray(aiResult.fieldConfidence.discrepancies?.value) ? aiResult.fieldConfidence.discrepancies.value : [],
          // Document type detection
          documentType: (aiResult.fieldConfidence.documentType?.value as 'main_notice' | 'annexure') || 'main_notice',
          documentTypeLabel: aiResult.fieldConfidence.documentTypeLabel?.value || '',
          rawText: aiResult.text,
          fieldConfidence: aiResult.fieldConfidence
        };
        
        console.debug('Notice extraction using AI/OCR successful', {
          fields: Object.keys(aiResult.fieldConfidence),
          values: extractedData
        });
      } catch (aiError) {
        const errorMessage = aiError instanceof Error ? aiError.message : 'Unknown error';
        const code = (aiError as any).code;
        
        console.log('AI/OCR extraction failed, trying Lovable AI fallback:', errorMessage);
        
        // Check for specific error codes
        if (code === 'INVALID_API_KEY' || errorMessage.includes('INVALID_API_KEY')) {
          errorCode = 'INVALID_API_KEY';
        } else if (code === 'RATE_LIMIT' || errorMessage.includes('RATE_LIMIT')) {
          errorCode = 'RATE_LIMIT';
        }
        
        // Try Lovable AI as secondary fallback before regex
        try {
          console.log('🔄 Attempting Lovable AI fallback...');
          const lovableResult = await this.extractWithLovableAI(file);
          usingAI = true;
          
          // Merge Lovable AI-extracted data with our structure
          extractedData = {
            din: lovableResult.fieldConfidence.din?.value || '',
            gstin: lovableResult.fieldConfidence.gstin?.value || '',
            period: lovableResult.fieldConfidence.period?.value || '',
            dueDate: lovableResult.fieldConfidence.dueDate?.value || '',
            office: lovableResult.fieldConfidence.office?.value || '',
            amount: lovableResult.fieldConfidence.amount?.value || '',
            noticeType: lovableResult.fieldConfidence.noticeType?.value || '',
            noticeNo: lovableResult.fieldConfidence.noticeNo?.value || '',
            issueDate: lovableResult.fieldConfidence.issueDate?.value || '',
            taxpayerName: lovableResult.fieldConfidence.taxpayerName?.value || '',
            tradeName: lovableResult.fieldConfidence.tradeName?.value || '',
            subject: lovableResult.fieldConfidence.subject?.value || '',
            legalSection: lovableResult.fieldConfidence.legalSection?.value || '',
            discrepancies: Array.isArray(lovableResult.fieldConfidence.discrepancies?.value) ? lovableResult.fieldConfidence.discrepancies.value : [],
            documentType: (lovableResult.fieldConfidence.documentType?.value as 'main_notice' | 'annexure') || 'main_notice',
            documentTypeLabel: lovableResult.fieldConfidence.documentTypeLabel?.value || '',
            rawText: lovableResult.text,
            fieldConfidence: lovableResult.fieldConfidence
          };
          
          console.log('✅ Lovable AI fallback successful');
          errorCode = undefined; // Clear error code since we succeeded with fallback
        } catch (lovableError) {
          console.log('Lovable AI fallback also failed, using regex:', lovableError);
          
          // Final fallback to basic text extraction + regex
          try {
            const extractedText = await this.extractTextFromPDF(file);
            extractedData = this.extractDataFromText(extractedText);
            usingAI = false;
            
            console.debug('Regex extraction completed', {
              textLength: extractedText.length,
              fieldsFound: Object.keys(extractedData.fieldConfidence || {}).length,
              values: extractedData
            });
          } catch (pdfError) {
            console.error('PDF text extraction failed:', pdfError);
            return {
              success: false,
              error: 'Failed to extract text from PDF',
              errorCode: 'PDF_PARSE_ERROR'
            };
          }
        }
      }

      const confidence = this.calculateConfidence(extractedData);

      // Don't show toast for API key errors - let wizard handle it
      if (!errorCode) {
        toast({
          title: "Notice Data Extracted",
          description: `Extracted using ${usingAI ? 'AI/OCR' : 'regex patterns'} (~${Math.round(confidence)}% complete)`,
        });
      }

      return {
        success: true,
        data: extractedData,
        confidence,
        errorCode // Pass through error code even on success (for fallback scenarios)
      };

    } catch (error) {
      console.error('Notice extraction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Extraction failed',
        errorCode: 'UNKNOWN'
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