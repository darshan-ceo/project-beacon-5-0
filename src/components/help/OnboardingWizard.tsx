/**
 * Onboarding Wizard Component
 * Role-based learning path with progress tracking
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  GraduationCap, 
  BookOpen, 
  Play, 
  Video, 
  HelpCircle,
  Check,
  Clock,
  ChevronRight,
  Trophy,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { helpDiscoveryService, type OnboardingPath, type OnboardingStep } from '@/services/helpDiscoveryService';
import { cn } from '@/lib/utils';

interface OnboardingWizardProps {
  userRole: string;
  className?: string;
}

const stepTypeIcons = {
  tour: Play,
  article: BookOpen,
  video: Video,
  quiz: HelpCircle
};

const stepTypeLabels = {
  tour: 'Guided Tour',
  article: 'Article',
  video: 'Video',
  quiz: 'Quiz'
};

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ 
  userRole,
  className 
}) => {
  const navigate = useNavigate();
  const [path, setPath] = useState<OnboardingPath | null>(null);
  const [loading, setLoading] = useState(true);
  const { 
    progress, 
    markOnboardingStepCompleted, 
    isOnboardingStepCompleted,
    hasAchievement 
  } = useLearningProgress();

  useEffect(() => {
    const loadPath = async () => {
      setLoading(true);
      try {
        await helpDiscoveryService.initialize();
        const onboardingPath = await helpDiscoveryService.getOnboardingPath(
          userRole,
          progress.completedOnboardingSteps
        );
        setPath(onboardingPath);
      } catch (error) {
        console.error('[Onboarding] Failed to load path:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPath();
  }, [userRole, progress.completedOnboardingSteps]);

  const handleStepClick = (step: OnboardingStep) => {
    // Navigate or start the step
    if (step.type === 'tour') {
      console.log('[Onboarding] Start tour:', step.id);
      // Could integrate with tour system
    } else if (step.type === 'article') {
      navigate(`/help/articles/${step.id}`);
    }
  };

  const handleMarkComplete = (step: OnboardingStep, e: React.MouseEvent) => {
    e.stopPropagation();
    markOnboardingStepCompleted(step.id);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Your Learning Path
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-20 bg-muted rounded animate-pulse" />
            <div className="h-20 bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!path) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Your Learning Path
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No onboarding path available for your role</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const completedCount = path.steps.filter(s => isOnboardingStepCompleted(s.id)).length;
  const progressPercent = Math.round((completedCount / path.steps.length) * 100);
  const isComplete = completedCount === path.steps.length;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>{path.title}</CardTitle>
              <CardDescription className="mt-1">
                {path.description}
              </CardDescription>
            </div>
          </div>
          {isComplete && (
            <Badge variant="default" className="bg-green-500">
              <Trophy className="h-3 w-3 mr-1" />
              Complete!
            </Badge>
          )}
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{completedCount} of {path.steps.length} steps</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {path.duration}
            </span>
            <span>{progressPercent}% complete</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[350px] pr-4">
          <div className="space-y-3">
            {path.steps.map((step, index) => {
              const Icon = stepTypeIcons[step.type];
              const isCompleted = isOnboardingStepCompleted(step.id);
              const isNext = !isCompleted && 
                path.steps.slice(0, index).every(s => isOnboardingStepCompleted(s.id));
              
              return (
                <div
                  key={step.id}
                  className={cn(
                    "p-4 border rounded-lg cursor-pointer transition-all",
                    isCompleted && "bg-green-500/5 border-green-500/20",
                    isNext && "ring-2 ring-primary/20 bg-primary/5",
                    !isCompleted && !isNext && "opacity-60"
                  )}
                  onClick={() => handleStepClick(step)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-full flex-shrink-0",
                      isCompleted ? "bg-green-500/10" : "bg-muted"
                    )}>
                      {isCompleted ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className={cn(
                            "font-medium text-sm",
                            isCompleted && "text-green-700 dark:text-green-400"
                          )}>
                            {step.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {step.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {step.required && !isCompleted && (
                            <Badge variant="outline" className="text-[10px]">
                              Required
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-[10px]">
                            {stepTypeLabels[step.type]}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          ~{step.estimatedMinutes} min
                        </span>
                        
                        <div className="flex items-center gap-2">
                          {!isCompleted && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-xs"
                              onClick={(e) => handleMarkComplete(step, e)}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Mark done
                            </Button>
                          )}
                          <Button 
                            variant={isNext ? "default" : "outline"} 
                            size="sm" 
                            className="h-7 text-xs gap-1"
                          >
                            {isCompleted ? 'Review' : 'Start'}
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        
        {/* Achievements Section */}
        {progress.achievements.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Your Achievements
            </h4>
            <div className="flex flex-wrap gap-2">
              {progress.achievements.map((achievement) => (
                <Badge key={achievement} variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  {achievement.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
