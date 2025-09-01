import { toast } from '@/hooks/use-toast';

export interface AIDraft {
  id: string;
  caseId: string;
  noticeType: string;
  facts: string;
  annexures: string[];
  generatedContent: string;
  createdAt: string;
  createdBy: string;
  lastModified: string;
  status: 'draft' | 'reviewed' | 'sent';
}

export interface DocumentSummary {
  id: string;
  documentId: string;
  caseId: string;
  summary: string;
  keyPoints: string[];
  deadlines: Array<{
    date: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  extractedEntities: Array<{
    type: 'date' | 'amount' | 'reference' | 'party';
    value: string;
    confidence: number;
  }>;
  createdAt: string;
}

// Legal templates for different notice types
const DRAFT_TEMPLATES = {
  'ASMT-10': `To,
The Assessing Officer,
[Department Name],
[Address]

Subject: Reply to Assessment Notice under Section 142(1) - A.Y. [YEAR]

Dear Sir/Madam,

With reference to the Assessment Notice dated [DATE] received under Section 142(1) of the Income Tax Act, 1961, we submit our response as follows:

FACTS OF THE CASE:
[FACTS]

SUBMISSION:
Based on the above facts and circumstances, we respectfully submit that:

1. The documents/information sought in the notice are enclosed herewith.
2. All income has been correctly declared and assessed.
3. We request your good office to kindly consider our submissions.

We trust that the above submissions are in order and await your favorable consideration.

Thanking you,

Yours faithfully,
[FIRM NAME]
[PARTNER NAME]
Advocate`,

  'ASMT-11': `To,
The Deputy Commissioner of Income Tax,
[Department Name],
[Address]

Subject: Response to Notice under Section 143(2) - A.Y. [YEAR]

Dear Sir/Madam,

We acknowledge receipt of your notice dated [DATE] under Section 143(2) of the Income Tax Act, 1961 regarding the above subject.

FACTUAL BACKGROUND:
[FACTS]

OUR RESPONSE:
We submit that the return of income filed is correct and complete in all respects. The details sought are provided as under:

[DETAILED_RESPONSE]

We request your honor to kindly accept our submission and complete the assessment accordingly.

Thanking you,

Yours faithfully,
[FIRM NAME]
[PARTNER NAME]
Advocate`,

  'DRC-01': `To,
The Dispute Resolution Committee,
[Department Name],
[Address]

Subject: Objection before DRC - A.Y. [YEAR]

Respected Members,

We represent the assessee in the above matter and submit our objections to the Draft Assessment Order as follows:

BRIEF FACTS:
[FACTS]

GROUNDS OF OBJECTION:
1. The draft assessment order is contrary to law and facts.
2. The additions made are without any legal basis.
3. The principles of natural justice have not been followed.

PRAYER:
In light of the above submissions, we humbly pray that:
- The objections may be allowed
- The draft assessment order may be annulled
- No addition may be sustained

We trust in your wisdom and fair judgment.

Thanking you,

Yours faithfully,
[FIRM NAME]
[PARTNER NAME]
Advocate`,

  'DRC-07': `To,
The Dispute Resolution Committee,
[Department Name],
[Address]

Subject: Additional Submissions before DRC - A.Y. [YEAR]

Respected Members,

Further to our earlier submissions dated [DATE], we wish to submit additional grounds and documents for your consideration.

ADDITIONAL FACTS:
[FACTS]

ADDITIONAL SUBMISSIONS:
[ADDITIONAL_POINTS]

CONCLUSION:
Based on the comprehensive submissions made above and earlier, we respectfully request the Hon'ble Committee to allow our objections and direct the AO accordingly.

Thanking you,

Yours faithfully,
[FIRM NAME]
[PARTNER NAME]
Advocate`
};

// Enhanced AI service with draft generation capabilities
export { aiDraftService } from './aiDraftService';

export const aiService = {
  // Generate AI draft for legal notices
  generateDraft: async (
    caseId: string,
    noticeType: string,
    facts: string,
    annexures: string[] = []
  ): Promise<AIDraft> => {
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));

    try {
      const template = DRAFT_TEMPLATES[noticeType as keyof typeof DRAFT_TEMPLATES];
      
      if (!template) {
        throw new Error(`Template not found for notice type: ${noticeType}`);
      }

      // Simulate AI content generation by replacing placeholders
      let generatedContent = template
        .replace(/\[FACTS\]/g, facts || 'Please provide case facts')
        .replace(/\[DATE\]/g, new Date().toLocaleDateString('en-IN'))
        .replace(/\[YEAR\]/g, new Date().getFullYear().toString())
        .replace(/\[FIRM_NAME\]/g, 'H-Office Legal Associates')
        .replace(/\[PARTNER_NAME\]/g, 'Senior Partner');

      // Add annexures if provided
      if (annexures.length > 0) {
        generatedContent += '\n\nENCLOSURES:\n' + 
          annexures.map((doc, index) => `${index + 1}. ${doc}`).join('\n');
      }

      const draft: AIDraft = {
        id: `draft-${Date.now()}`,
        caseId,
        noticeType,
        facts,
        annexures,
        generatedContent,
        createdAt: new Date().toISOString(),
        createdBy: 'AI Assistant',
        lastModified: new Date().toISOString(),
        status: 'draft'
      };

      toast({
        title: "Draft Generated",
        description: `AI draft for ${noticeType} has been generated successfully.`,
      });

      return draft;
    } catch (error) {
      toast({
        title: "Draft Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate draft.",
        variant: "destructive",
      });
      throw error;
    }
  },

  // Summarize document content
  summariseDocument: async (
    documentId: string,
    content: string,
    caseId: string
  ): Promise<DocumentSummary> => {
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    try {
      // Mock AI analysis - in real implementation, this would call an AI service
      const mockSummary = aiService.generateMockSummary(content);

      const summary: DocumentSummary = {
        id: `summary-${Date.now()}`,
        documentId,
        caseId,
        summary: mockSummary.summary,
        keyPoints: mockSummary.keyPoints,
        deadlines: mockSummary.deadlines,
        extractedEntities: mockSummary.entities,
        createdAt: new Date().toISOString()
      };

      toast({
        title: "Document Summarized",
        description: "AI summary has been generated successfully.",
      });

      return summary;
    } catch (error) {
      toast({
        title: "Summarization Failed",
        description: error instanceof Error ? error.message : "Failed to summarize document.",
        variant: "destructive",
      });
      throw error;
    }
  },

  // Analyze document for key information
  analyzeDocument: async (content: string) => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock analysis
    return {
      documentType: 'Legal Notice',
      urgency: Math.random() > 0.5 ? 'high' : 'medium',
      expectedResponseTime: Math.floor(Math.random() * 30) + 1 + ' days',
      keyDates: [
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      ],
      relevantSections: ['Section 142(1)', 'Section 143(2)', 'Section 147']
    };
  },

  // Private method to generate mock summary
  generateMockSummary(content: string) {
    const summaries = [
      {
        summary: "This notice pertains to assessment proceedings under the Income Tax Act. The department seeks clarification on certain income declarations and requires supporting documents.",
        keyPoints: [
          "Assessment year in question: 2023-24",
          "Primary concern: Unexplained cash deposits",
          "Documents required: Bank statements, investment proofs",
          "Response deadline: 30 days from notice date"
        ],
        deadlines: [
          {
            date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            description: "Response to assessment notice",
            priority: 'high' as const
          },
          {
            date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
            description: "Document submission",
            priority: 'medium' as const
          }
        ],
        entities: [
          { type: 'date' as const, value: '2024-03-15', confidence: 0.95 },
          { type: 'amount' as const, value: '₹2,50,000', confidence: 0.88 },
          { type: 'reference' as const, value: 'PAN: ABCDE1234F', confidence: 0.92 },
          { type: 'party' as const, value: 'Income Tax Department', confidence: 0.98 }
        ]
      },
      {
        summary: "Legal notice regarding compliance issues and mandatory submissions. Immediate attention required for regulatory adherence.",
        keyPoints: [
          "Compliance audit findings",
          "Mandatory regulatory submissions pending",
          "Penalty implications discussed",
          "Resolution timeline specified"
        ],
        deadlines: [
          {
            date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
            description: "Compliance submission",
            priority: 'high' as const
          }
        ],
        entities: [
          { type: 'date' as const, value: '2024-04-01', confidence: 0.91 },
          { type: 'reference' as const, value: 'File No: 12345/2024', confidence: 0.89 }
        ]
      }
    ];

    return summaries[Math.floor(Math.random() * summaries.length)];
  }
};