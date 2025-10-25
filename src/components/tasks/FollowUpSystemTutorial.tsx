import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, FileText, CheckCircle2, Clock, Shield } from 'lucide-react';

export const FollowUpSystemTutorial: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem('followup_tutorial_seen');
    if (!seen) {
      // Delay showing tutorial slightly to avoid overwhelming on first load
      setTimeout(() => setIsOpen(true), 1000);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('followup_tutorial_seen', 'true');
    setIsOpen(false);
  };

  const steps = [
    {
      icon: Lock,
      title: 'New Follow-Up System',
      description: 'We\'ve upgraded how task follow-ups work to provide better tracking and audit trails.',
      content: (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The new system separates task definitions from progress tracking, making it easier
            to see the complete history of work done on each task.
          </p>
        </div>
      )
    },
    {
      icon: FileText,
      title: 'How It Works',
      description: 'Tasks lock after the first follow-up to preserve the original assignment.',
      content: (
        <div className="space-y-3">
          <Card className="bg-muted/50 border-primary/20">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Before First Follow-Up</p>
                  <p className="text-xs text-muted-foreground">
                    Task is fully editable by creator and admins
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">After First Follow-Up</p>
                  <p className="text-xs text-muted-foreground">
                    Task details lock automatically. Only follow-ups can be added.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      icon: Clock,
      title: 'Adding Follow-Ups',
      description: 'Log progress, update status, and set next actions through follow-ups.',
      content: (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            When viewing a task, click <Badge variant="outline" className="mx-1">Add Follow-Up</Badge> to:
          </p>
          <ul className="text-sm space-y-2 ml-4">
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              Record what work was done
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              Update task status and log hours
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              Set next follow-up dates
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              Flag blockers or request support
            </li>
          </ul>
        </div>
      )
    },
    {
      icon: Shield,
      title: 'Admin Override',
      description: 'Administrators can unlock tasks if the original definition needs changes.',
      content: (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            If a locked task needs editing, contact an administrator. They can temporarily
            unlock the task, and all override actions are logged for audit purposes.
          </p>
          <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
            <CardContent className="p-3">
              <p className="text-xs text-amber-900 dark:text-amber-100">
                <strong>Why lock tasks?</strong> Locking preserves the original assignment details,
                prevents accidental changes to scope, and maintains a clear audit trail of all work done.
              </p>
            </CardContent>
          </Card>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle>{currentStepData.title}</DialogTitle>
              <DialogDescription>{currentStepData.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          {currentStepData.content}
        </div>

        <DialogFooter className="flex justify-between items-center sm:justify-between">
          <div className="flex gap-1">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 w-2 rounded-full transition-colors ${
                  idx === currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {currentStep < steps.length - 1 ? (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Skip
                </Button>
                <Button onClick={() => setCurrentStep(currentStep + 1)}>
                  Next
                </Button>
              </>
            ) : (
              <Button onClick={handleClose}>
                Got It!
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
