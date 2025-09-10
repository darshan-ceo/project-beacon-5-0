import { Task } from '@/contexts/AppStateContext';

export interface AITaskSuggestion {
  id: string;
  title: string;
  description: string;
  priority: Task['priority'];
  estimatedHours: number;
  reasoning: string;
  confidence: number;
  suggestedAssignee?: string;
  dependencies?: string[];
  deadline?: string;
}

export interface TaskOptimization {
  taskId: string;
  currentPriority: Task['priority'];
  suggestedPriority: Task['priority'];
  reasoning: string;
  impactScore: number;
}

export interface WorkloadRecommendation {
  type: 'redistribute' | 'extend_deadline' | 'escalate' | 'automate';
  description: string;
  affectedTasks: string[];
  expectedImprovement: string;
  urgency: 'low' | 'medium' | 'high';
}

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

class AITaskService {
  private apiKey: string | null = null;
  private isSupabaseConnected = false;

  constructor() {
    // Check if we're in a Supabase environment
    this.isSupabaseConnected = !!window.location.hostname.includes('supabase') || 
                               !!process.env.VITE_SUPABASE_URL;
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  private async makePerplexityRequest(
    systemPrompt: string, 
    userPrompt: string
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Perplexity API key not configured');
    }

    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          temperature: 0.2,
          top_p: 0.9,
          max_tokens: 1000,
          return_images: false,
          return_related_questions: false,
          frequency_penalty: 1,
          presence_penalty: 0
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.statusText}`);
      }

      const data: PerplexityResponse = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Perplexity API request failed:', error);
      throw error;
    }
  }

  async generateTaskSuggestions(
    caseContext: {
      caseNumber: string;
      stage: string;
      priority: string;
      description: string;
      existingTasks: Task[];
    }
  ): Promise<AITaskSuggestion[]> {
    const systemPrompt = `You are an expert legal case management AI. Analyze the given case context and suggest relevant tasks. Return a JSON array of task suggestions with this exact structure:
    [
      {
        "id": "unique_id",
        "title": "Task title",
        "description": "Detailed description",
        "priority": "Critical|High|Medium|Low",
        "estimatedHours": number,
        "reasoning": "Why this task is important",
        "confidence": number (0-100),
        "suggestedAssignee": "role or specific person",
        "dependencies": ["existing_task_ids"],
        "deadline": "YYYY-MM-DD or relative like '+7 days'"
      }
    ]`;

    const userPrompt = `Case Details:
    - Case Number: ${caseContext.caseNumber}
    - Current Stage: ${caseContext.stage}
    - Priority: ${caseContext.priority}
    - Description: ${caseContext.description}
    
    Existing Tasks:
    ${caseContext.existingTasks.map(t => `- ${t.title} (${t.status}, ${t.priority})`).join('\n')}
    
    Suggest 3-5 relevant tasks for this case stage, considering legal procedures, deadlines, and workflow efficiency.`;

    try {
      const response = await this.makePerplexityRequest(systemPrompt, userPrompt);
      const suggestions = JSON.parse(response);
      
      return suggestions.map((s: any, index: number) => ({
        id: s.id || `ai_suggestion_${Date.now()}_${index}`,
        title: s.title || 'Suggested Task',
        description: s.description || '',
        priority: s.priority || 'Medium',
        estimatedHours: s.estimatedHours || 4,
        reasoning: s.reasoning || 'AI-generated suggestion',
        confidence: s.confidence || 75,
        suggestedAssignee: s.suggestedAssignee,
        dependencies: s.dependencies || [],
        deadline: s.deadline
      }));
    } catch (error) {
      console.error('Failed to generate task suggestions:', error);
      return this.getFallbackSuggestions(caseContext);
    }
  }

  async optimizeTaskPriorities(tasks: Task[]): Promise<TaskOptimization[]> {
    const systemPrompt = `You are a legal workflow optimization AI. Analyze the given tasks and suggest priority adjustments. Return a JSON array with this structure:
    [
      {
        "taskId": "task_id",
        "currentPriority": "current",
        "suggestedPriority": "suggested",
        "reasoning": "explanation",
        "impactScore": number (1-10)
      }
    ]`;

    const userPrompt = `Tasks to analyze:
    ${tasks.map(t => `ID: ${t.id}, Title: ${t.title}, Current Priority: ${t.priority}, Due: ${t.dueDate}, Status: ${t.status}, Stage: ${t.stage}`).join('\n')}
    
    Suggest priority optimizations based on legal deadlines, case importance, and workflow efficiency.`;

    try {
      const response = await this.makePerplexityRequest(systemPrompt, userPrompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to optimize task priorities:', error);
      return [];
    }
  }

  async generateWorkloadRecommendations(
    tasks: Task[],
    teamCapacity: { [employeeId: string]: number }
  ): Promise<WorkloadRecommendation[]> {
    const systemPrompt = `You are a workforce management AI for legal practices. Analyze workload and suggest optimizations. Return a JSON array with this structure:
    [
      {
        "type": "redistribute|extend_deadline|escalate|automate",
        "description": "detailed recommendation",
        "affectedTasks": ["task_ids"],
        "expectedImprovement": "quantified benefit",
        "urgency": "low|medium|high"
      }
    ]`;

    const overdueTasks = tasks.filter(t => t.status === 'Overdue').length;
    const totalTasks = tasks.length;
    const avgWorkload = Object.values(teamCapacity).reduce((a, b) => a + b, 0) / Object.keys(teamCapacity).length;

    const userPrompt = `Current Workload Analysis:
    - Total Tasks: ${totalTasks}
    - Overdue Tasks: ${overdueTasks}
    - Team Capacity: ${JSON.stringify(teamCapacity)}
    - Average Workload: ${avgWorkload.toFixed(1)}%
    
    Critical Tasks:
    ${tasks.filter(t => t.priority === 'Critical' || t.status === 'Overdue').map(t => 
      `- ${t.title} (${t.status}, Due: ${t.dueDate}, Assigned: ${t.assignedToName})`
    ).join('\n')}
    
    Provide actionable recommendations to optimize workload distribution and improve efficiency.`;

    try {
      const response = await this.makePerplexityRequest(systemPrompt, userPrompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to generate workload recommendations:', error);
      return this.getFallbackRecommendations();
    }
  }

  private getFallbackSuggestions(caseContext: any): AITaskSuggestion[] {
    const stageTasks: { [key: string]: AITaskSuggestion[] } = {
      'Demand': [
        {
          id: 'fallback_demand_1',
          title: 'Review Demand Notice',
          description: 'Analyze the demand notice and identify key issues',
          priority: 'High',
          estimatedHours: 2,
          reasoning: 'Critical first step in demand stage',
          confidence: 90,
          suggestedAssignee: 'Senior Associate'
        }
      ],
      'Assessment': [
        {
          id: 'fallback_assessment_1',
          title: 'Prepare Assessment Response',
          description: 'Draft comprehensive response to assessment order',
          priority: 'Critical',
          estimatedHours: 6,
          reasoning: 'Time-sensitive legal requirement',
          confidence: 95,
          suggestedAssignee: 'Partner'
        }
      ]
    };

    return stageTasks[caseContext.stage] || [];
  }

  private getFallbackRecommendations(): WorkloadRecommendation[] {
    return [
      {
        type: 'redistribute',
        description: 'Consider redistributing high-priority tasks from overloaded team members',
        affectedTasks: [],
        expectedImprovement: 'Reduce overdue rate by 15-20%',
        urgency: 'medium'
      }
    ];
  }

  getApiKeyStatus(): { configured: boolean; source: string } {
    return {
      configured: !!this.apiKey,
      source: this.isSupabaseConnected ? 'supabase' : 'manual'
    };
  }
}

export const aiTaskService = new AITaskService();