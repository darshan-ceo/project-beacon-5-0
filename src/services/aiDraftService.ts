import { toast } from '@/hooks/use-toast';
import { Case, Client } from '@/contexts/AppStateContext';
import { FormTemplate } from './formTemplatesService';

export interface AIDraftControls {
  tone: 'neutral' | 'formal' | 'persuasive' | 'concise';
  audience: 'officer' | 'appellate_authority' | 'tribunal' | 'client';
  focusAreas: string[];
  personalization: string;
  language: 'english' | 'hindi';
  insertCitations: boolean;
}

export interface DraftSection {
  fieldKey: string;
  content: string;
  confidence: number;
}

export interface AIDraftResult {
  sections: DraftSection[];
  footnotes?: string[];
  metadata: {
    tokensUsed: number;
    processingTime: number;
    provider: string;
  };
}

export interface AIUsageLog {
  id: string;
  timestamp: string;
  userId: string;
  caseId: string;
  templateCode: string;
  action: 'generate' | 'refine' | 'improve_section';
  controls: Partial<AIDraftControls>;
  tokensUsed: number;
  success: boolean;
}

export interface AISettings {
  enabled: boolean;
  provider: 'google_ai' | 'local';
  maxTokensPerCall: number;
  redactPersonalIds: boolean;
  logLevel: 'minimal' | 'full' | 'off';
}

// Mock AI providers - In production, these would call actual AI services
class AIProviderAdapter {
  private settings: AISettings;

  constructor(settings: AISettings) {
    this.settings = settings;
  }

  async generateDraft(
    template: FormTemplate,
    caseData: Case,
    clientData: Client,
    controls: AIDraftControls,
    currentFormData?: Record<string, any>
  ): Promise<AIDraftResult> {
    // Simulate API processing time
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));

    const prompt = this.buildGenerationPrompt(template, caseData, clientData, controls, currentFormData);
    
    // Mock AI response
    const sections = this.generateMockSections(template, caseData, clientData, controls);
    
    return {
      sections,
      footnotes: controls.insertCitations ? this.generateMockFootnotes() : undefined,
      metadata: {
        tokensUsed: Math.floor(Math.random() * 800) + 200,
        processingTime: 2500,
        provider: this.settings.provider
      }
    };
  }

  async refineDraft(
    fieldKey: string,
    currentText: string,
    controls: AIDraftControls,
    context: { template: FormTemplate; caseData: Case; clientData: Client }
  ): Promise<{ content: string; metadata: any }> {
    await new Promise(resolve => setTimeout(resolve, 1500));

    const refinedContent = this.generateRefinedContent(fieldKey, currentText, controls, context);

    return {
      content: refinedContent,
      metadata: {
        tokensUsed: Math.floor(Math.random() * 400) + 100,
        processingTime: 1500,
        provider: this.settings.provider
      }
    };
  }

  private buildGenerationPrompt(
    template: FormTemplate,
    caseData: Case,
    clientData: Client,
    controls: AIDraftControls,
    currentFormData?: Record<string, any>
  ): string {
    const contextData = this.buildContextData(caseData, clientData);
    
    return `Generate legal document content for ${template.title} with the following parameters:
    
    Tone: ${controls.tone}
    Audience: ${controls.audience}
    Focus Areas: ${controls.focusAreas.join(', ')}
    Language: ${controls.language}
    Personalization: ${controls.personalization}
    
    Case Context: ${contextData}
    
    Current Form Data: ${JSON.stringify(currentFormData || {})}`;
  }

  private buildContextData(caseData: Case, clientData: Client): string {
    let context = `Case: ${caseData.title} (${caseData.caseNumber})\n`;
    context += `Client: ${clientData.name}\n`;
    context += `Stage: ${caseData.currentStage}\n`;
    context += `Priority: ${caseData.priority}\n`;
    context += `Status: ${caseData.slaStatus}\n`;

    // Redact PAN/Aadhaar if privacy setting is enabled
    if (this.settings.redactPersonalIds) {
      context = context.replace(/[A-Z]{5}[0-9]{4}[A-Z]/g, '[PAN_REDACTED]');
      context = context.replace(/[0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{4}/g, '[AADHAAR_REDACTED]');
    }

    return context;
  }

  private generateMockSections(
    template: FormTemplate,
    caseData: Case,
    clientData: Client,
    controls: AIDraftControls
  ): DraftSection[] {
    const sections: DraftSection[] = [];

    // Generate content for text areas based on template fields
    template.fields.forEach(field => {
      if (field.type === 'textarea') {
        sections.push({
          fieldKey: field.key,
          content: this.generateFieldContent(field.key, field.label, caseData, clientData, controls),
          confidence: 0.85 + Math.random() * 0.1
        });
      }
    });

    return sections;
  }

  private generateFieldContent(
    fieldKey: string,
    fieldLabel: string,
    caseData: Case,
    clientData: Client,
    controls: AIDraftControls
  ): string {
    const templates = {
      factual_background: `Based on the records and documents available, the factual background of the case is as follows:

1. The assessee, ${clientData.name}, is engaged in ${clientData.category || 'business activities'} and has filed the return of income for the Assessment Year in question.

2. The case pertains to ${caseData.title} involving notice under relevant provisions of the Income Tax Act, 1961.

3. The matter relates to ${caseData.currentStage} proceedings where the department has raised certain queries and demands.

${controls.personalization ? `\nAdditional context: ${controls.personalization}` : ''}`,

      legal_submissions: `We respectfully submit the following legal grounds in support of our case:

1. **Procedural Compliance**: All procedural requirements under the Income Tax Act, 1961 have been duly complied with by the assessee.

2. **Legal Precedents**: The matter is covered by favorable precedents established by higher judicial forums.

3. **Factual Merit**: The additions/demands proposed by the department lack factual and legal basis.

4. **Natural Justice**: The principles of natural justice must be followed, and adequate opportunity should be provided to the assessee.

${controls.focusAreas.includes('Legal Grounds') ? '\n5. **Statutory Provisions**: The relevant statutory provisions support the assessee\'s position.' : ''}`,

      prayer: `In light of the above submissions, we humbly pray that your good office may kindly:

1. Accept our submissions and representations made herein above.

2. Delete the proposed additions/demands, if any, as the same are not sustainable in law and on facts.

3. Complete the assessment in accordance with the law and grant relief to the assessee.

4. Pass appropriate orders as deemed fit and proper in the circumstances of the case.

We trust in your wisdom and fair judgment.`
    };

    const toneModifiers = {
      formal: 'in formal legal language',
      persuasive: 'with compelling arguments',
      concise: 'in brief and to-the-point manner',
      neutral: 'in balanced and objective tone'
    };

    let content = templates[fieldKey as keyof typeof templates] || 
      `[AI Generated content for ${fieldLabel} ${toneModifiers[controls.tone]}]`;

    // Apply tone modifications
    if (controls.tone === 'formal') {
      content = content.replace(/we /gi, 'we respectfully ');
    } else if (controls.tone === 'concise') {
      content = content.split('\n').slice(0, 3).join('\n') + '\n\n[Content optimized for brevity]';
    }

    return content;
  }

  private generateRefinedContent(
    fieldKey: string,
    currentText: string,
    controls: AIDraftControls,
    context: { template: FormTemplate; caseData: Case; clientData: Client }
  ): string {
    // Mock refinement - in production, this would use AI to improve the text
    let refined = currentText;

    if (controls.tone === 'formal' && !currentText.includes('respectfully')) {
      refined = refined.replace(/we submit/gi, 'we respectfully submit');
      refined = refined.replace(/we pray/gi, 'we humbly pray');
    }

    if (controls.tone === 'persuasive') {
      refined = refined.replace(/may kindly/gi, 'is urged to kindly');
      refined = refined.replace(/submit that/gi, 'strongly submit that');
    }

    if (controls.personalization) {
      refined += `\n\n[Refined with consideration to: ${controls.personalization}]`;
    }

    return refined;
  }

  private generateMockFootnotes(): string[] {
    return [
      'Section 142(1) of the Income Tax Act, 1961',
      'CIT vs. XYZ Ltd. [2020] 123 ITR 456 (HC)',
      'CBIC Circular No. 12/2021 dated 15th March 2021',
      'Principles established in ABC vs. DCIT [2019] 98 ITD 123'
    ];
  }
}

export class AIDraftService {
  private provider: AIProviderAdapter;
  private settings: AISettings;
  private usageLogs: AIUsageLog[] = [];

  constructor() {
    // Default settings - in production, these would come from global parameters
    this.settings = {
      enabled: true,
      provider: 'google_ai',
      maxTokensPerCall: 2000,
      redactPersonalIds: true,
      logLevel: 'minimal'
    };
    
    this.provider = new AIProviderAdapter(this.settings);
  }

  updateSettings(settings: Partial<AISettings>) {
    this.settings = { ...this.settings, ...settings };
    this.provider = new AIProviderAdapter(this.settings);
  }

  async generateDraft(
    templateCode: string,
    caseId: string,
    currentFormValues: Record<string, any>,
    controls: AIDraftControls,
    template: FormTemplate,
    caseData: Case,
    clientData: Client,
    userId: string
  ): Promise<AIDraftResult> {
    if (!this.settings.enabled) {
      throw new Error('AI Draft Assistant is disabled');
    }

    const startTime = Date.now();

    try {
      const result = await this.provider.generateDraft(
        template,
        caseData,
        clientData,
        controls,
        currentFormValues
      );

      // Log usage
      this.logUsage({
        userId,
        caseId,
        templateCode,
        action: 'generate',
        controls,
        tokensUsed: result.metadata.tokensUsed,
        success: true
      });

      // Add timeline entry to case
      this.addTimelineEntry(caseId, `AI draft generated for ${template.title}`, userId);

      toast({
        title: "AI Draft Generated",
        description: `Draft content generated for ${result.sections.length} fields.`,
      });

      return result;

    } catch (error) {
      this.logUsage({
        userId,
        caseId,
        templateCode,
        action: 'generate',
        controls,
        tokensUsed: 0,
        success: false
      });

      throw error;
    }
  }

  async refineField(
    fieldKey: string,
    currentText: string,
    controls: AIDraftControls,
    context: { template: FormTemplate; caseData: Case; clientData: Client },
    userId: string
  ): Promise<string> {
    if (!this.settings.enabled) {
      throw new Error('AI Draft Assistant is disabled');
    }

    try {
      const result = await this.provider.refineDraft(fieldKey, currentText, controls, context);

      this.logUsage({
        userId,
        caseId: context.caseData.id,
        templateCode: context.template.code,
        action: 'refine',
        controls: { tone: controls.tone, audience: controls.audience },
        tokensUsed: result.metadata.tokensUsed,
        success: true
      });

      toast({
        title: "Content Refined",
        description: "AI has improved the selected field content.",
      });

      return result.content;

    } catch (error) {
      toast({
        title: "Refinement Failed",
        description: "Failed to refine content. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  }

  async improveSectionWithAI(
    fieldKey: string,
    currentText: string,
    controls: AIDraftControls,
    context: { template: FormTemplate; caseData: Case; clientData: Client },
    userId: string
  ): Promise<string> {
    return this.refineField(fieldKey, currentText, controls, context, userId);
  }

  private logUsage(params: Omit<AIUsageLog, 'id' | 'timestamp'>) {
    const log: AIUsageLog = {
      id: `ai-log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...params
    };

    this.usageLogs.push(log);

    // In production, this would be sent to a logging service
    if (this.settings.logLevel !== 'off') {
      console.log('AI Usage Log:', this.settings.logLevel === 'full' ? log : {
        id: log.id,
        timestamp: log.timestamp,
        userId: log.userId,
        action: log.action,
        tokensUsed: log.tokensUsed,
        success: log.success
      });
    }
  }

  private addTimelineEntry(caseId: string, description: string, userId: string) {
    // In production, this would update the case timeline
    console.log(`Timeline entry for case ${caseId}: ${description} by ${userId}`);
  }

  getUsageLogs(): AIUsageLog[] {
    return this.usageLogs;
  }

  getSettings(): AISettings {
    return this.settings;
  }
}

export const aiDraftService = new AIDraftService();