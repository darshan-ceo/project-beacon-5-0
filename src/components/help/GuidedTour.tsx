import React, { useState, useEffect } from 'react';
import { Play, SkipForward, Pause, RotateCcw, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { helpService } from '@/services/helpService';
import { tourService } from '@/services/tourService';
import { cn } from '@/lib/utils';

interface Tour {
  id: string;
  title: string;
  description: string;
  module: string;
  steps: TourStep[];
  roles: string[];
}

interface TourStep {
  target: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'hover' | 'none';
}

interface GuidedTourProps {
  onClose: () => void;
  userRole: string;
  module?: string;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({
  onClose,
  userRole,
  module
}) => {
  const [tours, setTours] = useState<Tour[]>([]);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tourStats, setTourStats] = useState({ completed: new Set() });

  useEffect(() => {
    const loadTours = async () => {
      try {
        const availableTours = await helpService.getGuidedTours(userRole, module);
        setTours(availableTours);
      } catch (error) {
        console.error('Failed to load guided tours:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTours();
  }, [userRole, module]);

  const handleStartTour = async (tourId: string) => {
    try {
      const success = await tourService.startTour(tourId);
      if (success) {
        onClose();
      } else {
        console.error('Failed to start tour - tour not found or navigation failed');
        // Could show an error toast here instead of just logging
      }
    } catch (error) {
      console.error('Failed to start tour:', error);
      // Could show an error toast here
    }
  };

  const nextStep = () => {
    if (selectedTour && currentStep < selectedTour.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTour = () => {
    setIsRunning(false);
    setSelectedTour(null);
    setCurrentStep(0);
    // Here you could track completion in analytics or user progress
  };

  const pauseTour = () => {
    setIsRunning(false);
  };

  const resumeTour = () => {
    setIsRunning(true);
  };

  const restartTour = () => {
    setCurrentStep(0);
    setIsRunning(true);
  };

  const skipTour = () => {
    completeTour();
  };

  const getModuleIcon = (moduleName: string) => {
    switch (moduleName) {
      case 'cases': return '⚖️';
      case 'documents': return '📁';
      case 'hearings': return '📅';
      case 'tasks': return '✅';
      case 'reports': return '📊';
      case 'clients': return '👥';
      default: return '🎯';
    }
  };

  const renderTourSelection = () => (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Guided Tours</h2>
        <p className="text-muted-foreground">
          Learn key features with step-by-step walkthroughs
        </p>
      </div>

      <div className="grid gap-4">
        {tours.map(tour => (
          <Card key={tour.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getModuleIcon(tour.module)}</span>
                  <div>
                    <CardTitle className="text-lg">{tour.title}</CardTitle>
                    <CardDescription>{tour.description}</CardDescription>
                  </div>
                </div>
                <Badge variant="outline">{tour.steps.length} steps</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{tour.module}</Badge>
                  <span className="text-sm text-muted-foreground">
                    ~{Math.ceil(tour.steps.length * 1.5)} min
                  </span>
                </div>
                <Button onClick={() => handleStartTour(tour.id)}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Tour
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {tours.length === 0 && !loading && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-lg font-medium mb-2">No Tours Available</h3>
            <p className="text-muted-foreground">
              Guided tours for your role are being prepared.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderTourStep = () => {
    if (!selectedTour) return null;

    const step = selectedTour.steps[currentStep];
    const progress = ((currentStep + 1) / selectedTour.steps.length) * 100;

    return (
      <div className="space-y-6">
        {/* Tour Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{selectedTour.title}</h2>
            <Badge variant="outline">
              Step {currentStep + 1} of {selectedTour.steps.length}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{step.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground leading-relaxed mb-4">{step.content}</p>
            
            {step.action && step.action !== 'none' && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">
                  Action: {step.action === 'click' ? 'Click' : 'Hover over'} the highlighted element
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tour Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={previousStep}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={restartTour}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restart
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {isRunning ? (
              <Button variant="outline" size="sm" onClick={pauseTour}>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={resumeTour}>
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            )}
            
            <Button variant="outline" size="sm" onClick={skipTour}>
              <SkipForward className="h-4 w-4 mr-2" />
              Skip Tour
            </Button>

            <Button onClick={nextStep}>
              {currentStep === selectedTour.steps.length - 1 ? 'Complete' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded animate-pulse" />
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {selectedTour ? 'Tour in Progress' : 'Available Tours'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {selectedTour ? renderTourStep() : renderTourSelection()}
      </DialogContent>
    </Dialog>
  );
};