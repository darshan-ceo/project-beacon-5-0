/**
 * SMS Configuration Panel - SMS24 Gateway Setup
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  MessageSquare, 
  Settings, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Send, 
  Loader2,
  RefreshCw,
  Info,
  Clock,
  TrendingUp,
  Smartphone
} from 'lucide-react';
import { smsService, SMSConfig, SMSDeliveryLog } from '@/services/smsService';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const SMSConfigPanel: React.FC = () => {
  const [config, setConfig] = useState<SMSConfig | null>(null);
  const [logs, setLogs] = useState<SMSDeliveryLog[]>([]);
  const [stats, setStats] = useState({ total: 0, sent: 0, delivered: 0, failed: 0, credits: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [formData, setFormData] = useState({
    senderId: 'HOFFIC',
    dltEntityId: '',
    isActive: true,
    dailyLimit: 1000,
    monthlyLimit: 30000
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    
    const [configData, logsData, statsData] = await Promise.all([
      smsService.getConfig(),
      smsService.getDeliveryLogs({ limit: 50 }),
      smsService.getDeliveryStats('day')
    ]);

    if (configData) {
      setConfig(configData);
      setFormData({
        senderId: configData.senderId,
        dltEntityId: configData.dltEntityId || '',
        isActive: configData.isActive,
        dailyLimit: configData.dailyLimit,
        monthlyLimit: configData.monthlyLimit
      });
    }

    setLogs(logsData);
    setStats(statsData);
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!formData.senderId) {
      toast({
        title: "Validation Error",
        description: "Sender ID is required",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    const success = await smsService.saveConfig({
      provider: 'sms24',
      senderId: formData.senderId,
      dltEntityId: formData.dltEntityId || null,
      isActive: formData.isActive,
      dailyLimit: formData.dailyLimit,
      monthlyLimit: formData.monthlyLimit
    });

    if (success) {
      loadData();
    }
    setIsSaving(false);
  };

  const handleTestConnection = async () => {
    if (!testPhone) {
      toast({
        title: "Phone Required",
        description: "Enter a phone number to test",
        variant: "destructive"
      });
      return;
    }

    setIsTesting(true);
    const result = await smsService.testConnection(testPhone);
    
    if (result.success) {
      toast({
        title: "Test Successful",
        description: `SMS sent! Message ID: ${result.messageId}`
      });
      loadData(); // Refresh logs
    } else {
      toast({
        title: "Test Failed",
        description: result.error || "Failed to send test SMS",
        variant: "destructive"
      });
    }
    setIsTesting(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'sent':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      delivered: 'default',
      sent: 'secondary',
      failed: 'destructive',
      pending: 'outline'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const successRate = stats.total > 0 ? ((stats.sent + stats.delivered) / stats.total * 100).toFixed(1) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">SMS Configuration</h2>
          <p className="text-muted-foreground">Configure SMS24 gateway for TRAI-compliant messaging</p>
        </div>
        <Button variant="outline" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's SMS</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{successRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
              </div>
              <XCircle className="h-8 w-8 text-destructive/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Credits Used</p>
                <p className="text-2xl font-bold">{stats.credits}</p>
              </div>
              <Smartphone className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">
            <Settings className="h-4 w-4 mr-2" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Clock className="h-4 w-4 mr-2" />
            Delivery Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4 mt-4">
          {/* Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                SMS24 Gateway Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {formData.isActive ? (
                  <>
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="font-medium text-green-600">SMS Gateway Active</p>
                      <p className="text-sm text-muted-foreground">
                        Provider: SMS24 | Sender ID: {formData.senderId}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-8 w-8 text-amber-500" />
                    <div>
                      <p className="font-medium text-amber-600">SMS Gateway Inactive</p>
                      <p className="text-sm text-muted-foreground">
                        Enable gateway to send SMS notifications
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Configuration Form */}
          <Card>
            <CardHeader>
              <CardTitle>Gateway Configuration</CardTitle>
              <CardDescription>
                Configure SMS24/MSG24 gateway settings for TRAI DLT compliance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  API credentials are configured via system secrets. Contact administrator to update API key.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Sender ID (Header)</Label>
                  <Input
                    value={formData.senderId}
                    onChange={(e) => setFormData({ ...formData, senderId: e.target.value.toUpperCase() })}
                    placeholder="HOFFIC"
                    maxLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    6-character DLT-registered sender ID
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>DLT Entity ID (PEID)</Label>
                  <Input
                    value={formData.dltEntityId}
                    onChange={(e) => setFormData({ ...formData, dltEntityId: e.target.value })}
                    placeholder="e.g., 12071657197689"
                  />
                  <p className="text-xs text-muted-foreground">
                    Principal Entity ID from TRAI DLT registration
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Daily Limit</Label>
                  <Input
                    type="number"
                    value={formData.dailyLimit}
                    onChange={(e) => setFormData({ ...formData, dailyLimit: parseInt(e.target.value) || 1000 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Monthly Limit</Label>
                  <Input
                    type="number"
                    value={formData.monthlyLimit}
                    onChange={(e) => setFormData({ ...formData, monthlyLimit: parseInt(e.target.value) || 30000 })}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable SMS Gateway</Label>
                  <p className="text-sm text-muted-foreground">
                    Toggle SMS notifications on/off
                  </p>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={loadData}>
                Reset
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Configuration
              </Button>
            </CardFooter>
          </Card>

          {/* Test Connection */}
          <Card>
            <CardHeader>
              <CardTitle>Test Connection</CardTitle>
              <CardDescription>
                Send a test SMS to verify gateway configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="Enter phone number (e.g., 9876543210)"
                  />
                </div>
                <Button onClick={handleTestConnection} disabled={isTesting || !testPhone}>
                  {isTesting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Send className="h-4 w-4 mr-2" />
                  Send Test
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Logs</CardTitle>
              <CardDescription>
                Recent SMS delivery attempts and status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No SMS delivery logs yet</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Credits</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(log.createdAt), 'dd MMM HH:mm')}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.recipientPhone}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {log.messageText}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(log.status)}
                              {getStatusBadge(log.status)}
                            </div>
                            {log.errorMessage && (
                              <p className="text-xs text-destructive mt-1">{log.errorMessage}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{log.creditsUsed}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SMSConfigPanel;
