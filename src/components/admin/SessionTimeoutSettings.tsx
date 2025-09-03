import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Shield, TestTube } from 'lucide-react';
import { sessionService } from '@/services/sessionService';
import { toast } from '@/hooks/use-toast';

export const SessionTimeoutSettings: React.FC = () => {
  const [config, setConfig] = useState(sessionService.getConfig());
  const [remainingTime, setRemainingTime] = useState(0);
  const [isTestMode, setIsTestMode] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingTime(sessionService.getRemainingTime());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleConfigUpdate = (updates: Partial<typeof config>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    sessionService.updateConfig(newConfig);
    
    toast({
      title: 'Session Settings Updated',
      description: 'New timeout configuration has been applied'
    });
  };

  const handleTestMode = () => {
    if (isTestMode) {
      // Reset to normal mode
      handleConfigUpdate({ 
        timeoutMinutes: 30,
        warningMinutes: 5
      });
      setIsTestMode(false);
      toast({
        title: 'Test Mode Disabled',
        description: 'Session timeout reset to normal values'
      });
    } else {
      // Enable test mode with short timeout
      sessionService.enableTestMode();
      setConfig(sessionService.getConfig());
      setIsTestMode(true);
      toast({
        title: 'Test Mode Enabled',
        description: 'Session will timeout in 30 seconds for testing',
        variant: 'destructive'
      });
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session Timeout Configuration
          </CardTitle>
          <CardDescription>
            Configure automatic session timeout and idle detection settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Session Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Session Timeout</div>
              <div className="text-2xl font-bold">{config.timeoutMinutes}m</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Warning Time</div>
              <div className="text-2xl font-bold">{config.warningMinutes}m</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Time Remaining</div>
              <div className="text-2xl font-bold">{formatTime(remainingTime)}</div>
            </div>
          </div>

          {/* Configuration Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="timeout">Session Timeout (minutes)</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={config.timeoutMinutes}
                  onChange={(e) => handleConfigUpdate({ 
                    timeoutMinutes: parseInt(e.target.value) || 30 
                  })}
                  min="5"
                  max="480"
                />
                <p className="text-xs text-muted-foreground">
                  User will be logged out after this period of inactivity
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="warning">Warning Time (minutes)</Label>
                <Input
                  id="warning"
                  type="number"
                  value={config.warningMinutes}
                  onChange={(e) => handleConfigUpdate({ 
                    warningMinutes: parseInt(e.target.value) || 5 
                  })}
                  min="1"
                  max="60"
                />
                <p className="text-xs text-muted-foreground">
                  Warning dialog appears before timeout
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Remember Me Option</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to extend session
                  </p>
                </div>
                <Switch
                  checked={config.rememberMe}
                  onCheckedChange={(checked) => handleConfigUpdate({ 
                    rememberMe: checked 
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>Quick Presets</Label>
                <Select onValueChange={(value) => {
                  const presets = {
                    'short': { timeoutMinutes: 15, warningMinutes: 2 },
                    'normal': { timeoutMinutes: 30, warningMinutes: 5 },
                    'long': { timeoutMinutes: 60, warningMinutes: 10 },
                    'extended': { timeoutMinutes: 120, warningMinutes: 15 }
                  };
                  if (presets[value as keyof typeof presets]) {
                    handleConfigUpdate(presets[value as keyof typeof presets]);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose preset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (15m)</SelectItem>
                    <SelectItem value="normal">Normal (30m)</SelectItem>
                    <SelectItem value="long">Long (60m)</SelectItem>
                    <SelectItem value="extended">Extended (120m)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Test Mode */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="flex items-center gap-2">
                  <TestTube className="h-4 w-4" />
                  Test Mode
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enable 30-second timeout for testing purposes
                </p>
              </div>
              <Button
                variant={isTestMode ? "destructive" : "outline"}
                onClick={handleTestMode}
              >
                {isTestMode ? 'Disable Test Mode' : 'Enable Test Mode'}
              </Button>
            </div>

            {isTestMode && (
              <Alert className="mt-4" variant="destructive">
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Test Mode Active:</strong> Session will timeout in 30 seconds. 
                  Warning will appear after 25 seconds. Click "Disable Test Mode" to restore normal settings.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};