import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain,
  Sparkles,
  Lightbulb,
  Settings,
  Key,
  Zap,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Task, useAppState } from '@/contexts/AppStateContext';
import { aiTaskService, AITaskSuggestion, TaskOptimization, WorkloadRecommendation } from '@/services/aiTaskService';
import { toast } from '@/hooks/use-toast';
import { useAdvancedRBAC } from '@/hooks/useAdvancedRBAC';

export const AITaskAssistant: React.FC = () => {
  const { state } = useAppState();
  const [apiKey, setApiKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AITaskSuggestion[]>([]);
  const [optimizations, setOptimizations] = useState<TaskOptimization[]>([]);
  const [recommendations, setRecommendations] = useState<WorkloadRecommendation[]>([]);
  const [selectedCase, setSelectedCase] = useState<string>('');

  // RBAC permission checks
  const { hasPermission } = useAdvancedRBAC();
  const canManageAI = hasPermission('tasks.ai', 'admin') || hasPermission('tasks.ai', 'write');

  useEffect(() => {
    const status = aiTaskService.getApiKeyStatus();
    setIsConfigured(status.configured);
  }, []);

  const handleConfigureAPI = () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your Perplexity API key",
        variant: "destructive"
      });
      return;
    }

    aiTaskService.setApiKey(apiKey.trim());
    setIsConfigured(true);
    setApiKey(''); // Clear the input for security
    
    toast({
      title: "AI Assistant Configured",
      description: "Perplexity AI integration is now active",
    });
  };

  const generateTaskSuggestions = async () => {
    if (!isConfigured) {
      toast({
        title: "Configuration Required",
        description: "Please configure your Perplexity API key first",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Use first case as example, or allow user to select
      const caseContext = {
        caseNumber: 'CASE-2024-001',
        stage: 'Demand',
        priority: 'High',
        description: 'GST demand notice response required',
        existingTasks: state.tasks.slice(0, 5) // Limit for API efficiency
      };

      const newSuggestions = await aiTaskService.generateTaskSuggestions(caseContext);
      setSuggestions(newSuggestions);
      
      toast({
        title: "Task Suggestions Generated",
        description: `Generated ${newSuggestions.length} AI-powered task suggestions`,
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate task suggestions. Check your API key and try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const optimizeTaskPriorities = async () => {
    if (!isConfigured) return;

    setIsLoading(true);
    try {
      const newOptimizations = await aiTaskService.optimizeTaskPriorities(state.tasks.slice(0, 10));
      setOptimizations(newOptimizations);
      
      toast({
        title: "Priority Optimization Complete",
        description: `Analyzed ${state.tasks.length} tasks for priority optimization`,
      });
    } catch (error) {
      toast({
        title: "Optimization Failed",
        description: "Failed to optimize task priorities",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateWorkloadRecommendations = async () => {
    if (!isConfigured) return;

    setIsLoading(true);
    try {
      const teamCapacity = {
        'emp_1': 85,
        'emp_2': 92,
        'emp_3': 78,
        'emp_4': 95
      };

      const newRecommendations = await aiTaskService.generateWorkloadRecommendations(
        state.tasks,
        teamCapacity
      );
      setRecommendations(newRecommendations);
      
      toast({
        title: "Workload Analysis Complete",
        description: `Generated ${newRecommendations.length} optimization recommendations`,
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze workload patterns",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'Critical': return 'text-destructive';
      case 'High': return 'text-warning';
      case 'Medium': return 'text-primary';
      case 'Low': return 'text-muted-foreground';
      default: return 'text-foreground';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-success';
    if (confidence >= 60) return 'text-warning';
    return 'text-destructive';
  };

  if (!isConfigured) {
    // Only show configuration UI if user has permission to manage AI
    if (!canManageAI) {
      return (
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground">AI Task Assistant</h2>
            <p className="text-muted-foreground mt-2">
              AI integration has not been configured yet. Contact an administrator to set up the AI Task Assistant.
            </p>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Configuration Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Brain className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-foreground">AI Task Assistant</h2>
          <p className="text-muted-foreground mt-2">
            Intelligent task suggestions, priority optimization, and workload analysis
          </p>
        </motion.div>

        {/* Configuration Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="mr-2 h-5 w-5" />
                Configure AI Integration
              </CardTitle>
              <CardDescription>
                Enter your Perplexity API key to enable AI-powered task assistance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  For production use, add your Perplexity API key to Supabase Edge Function Secrets. 
                  This temporary input is for testing purposes.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="api-key">Perplexity API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="pplx-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              
              <Button 
                onClick={handleConfigureAPI}
                className="w-full"
                disabled={!apiKey.trim()}
              >
                <Settings className="mr-2 h-4 w-4" />
                Configure AI Assistant
              </Button>
              
              <div className="text-xs text-muted-foreground text-center">
                Need an API key? Visit{' '}
                <a 
                  href="https://www.perplexity.ai/settings/api" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Perplexity AI API
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-between items-center"
      >
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center">
            <Brain className="mr-2 h-6 w-6" />
            AI Task Assistant
          </h2>
          <p className="text-muted-foreground mt-1">
            Intelligent task management powered by Perplexity AI
          </p>
        </div>
        <Badge variant="outline" className="text-success">
          <CheckCircle className="mr-1 h-3 w-3" />
          AI Configured
        </Badge>
      </motion.div>

      {/* Quick Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <Button 
              onClick={generateTaskSuggestions}
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              {isLoading ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Task Suggestions
            </Button>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <Button 
              onClick={optimizeTaskPriorities}
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              {isLoading ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Target className="mr-2 h-4 w-4" />
              )}
              Optimize Priorities
            </Button>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <Button 
              onClick={generateWorkloadRecommendations}
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              {isLoading ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Users className="mr-2 h-4 w-4" />
              )}
              Analyze Workload
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Results */}
      <Tabs defaultValue="suggestions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="suggestions">Task Suggestions</TabsTrigger>
          <TabsTrigger value="optimizations">Priority Optimization</TabsTrigger>
          <TabsTrigger value="recommendations">Workload Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="mt-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {suggestions.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No task suggestions yet. Click "Generate Task Suggestions" to get AI-powered recommendations.
                  </p>
                </CardContent>
              </Card>
            ) : (
              suggestions.map((suggestion, index) => (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground mb-1">{suggestion.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{suggestion.description}</p>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <Badge variant="outline" className={getPriorityColor(suggestion.priority)}>
                            {suggestion.priority}
                          </Badge>
                          <Badge variant="secondary" className={getConfidenceColor(suggestion.confidence)}>
                            {suggestion.confidence}% confidence
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground mb-3">
                        <div>
                          <span className="font-medium">Estimated Hours:</span>
                          <div>{suggestion.estimatedHours}h</div>
                        </div>
                        {suggestion.suggestedAssignee && (
                          <div>
                            <span className="font-medium">Suggested Assignee:</span>
                            <div>{suggestion.suggestedAssignee}</div>
                          </div>
                        )}
                        {suggestion.deadline && (
                          <div>
                            <span className="font-medium">Deadline:</span>
                            <div>{suggestion.deadline}</div>
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Dependencies:</span>
                          <div>{suggestion.dependencies?.length || 0}</div>
                        </div>
                      </div>
                      
                      <div className="p-2 bg-muted/30 rounded text-xs">
                        <span className="font-medium">AI Reasoning:</span> {suggestion.reasoning}
                      </div>
                      
                      <div className="flex justify-end mt-3">
                        <Button size="sm">
                          <Zap className="mr-2 h-3 w-3" />
                          Create Task
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="optimizations" className="mt-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {optimizations.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No priority optimizations available. Click "Optimize Priorities" to analyze current tasks.
                  </p>
                </CardContent>
              </Card>
            ) : (
              optimizations.map((optimization, index) => (
                <motion.div
                  key={optimization.taskId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground mb-1">
                            Task ID: {optimization.taskId}
                          </h4>
                          <p className="text-sm text-muted-foreground">{optimization.reasoning}</p>
                        </div>
                        <Badge variant="outline">
                          Impact: {optimization.impactScore}/10
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <span>Current:</span>
                          <Badge variant="outline" className={getPriorityColor(optimization.currentPriority)}>
                            {optimization.currentPriority}
                          </Badge>
                        </div>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <div className="flex items-center space-x-2">
                          <span>Suggested:</span>
                          <Badge variant="outline" className={getPriorityColor(optimization.suggestedPriority)}>
                            {optimization.suggestedPriority}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex justify-end mt-3">
                        <Button size="sm" variant="outline">
                          Apply Optimization
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="recommendations" className="mt-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {recommendations.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No workload analysis available. Click "Analyze Workload" to get optimization recommendations.
                  </p>
                </CardContent>
              </Card>
            ) : (
              recommendations.map((recommendation, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium text-foreground">
                              {recommendation.type.replace('_', ' ').toUpperCase()}
                            </h4>
                            <Badge variant={
                              recommendation.urgency === 'high' ? 'destructive' :
                              recommendation.urgency === 'medium' ? 'default' : 'secondary'
                            }>
                              {recommendation.urgency} urgency
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {recommendation.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <span className="font-medium text-muted-foreground">Affected Tasks:</span>
                          <div>{recommendation.affectedTasks.length} tasks</div>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Expected Improvement:</span>
                          <div>{recommendation.expectedImprovement}</div>
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <Button size="sm" variant="outline">
                          Implement Recommendation
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};