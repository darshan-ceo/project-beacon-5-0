import React, { useState, useEffect } from 'react';
import { MessageCircle, CheckCircle, XCircle, Send, RefreshCw, AlertCircle, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { whatsappService, WhatsAppConfig, WhatsAppDeliveryLog } from '@/services/whatsappService';
import { format } from 'date-fns';

const WhatsAppConfigPanel: React.FC = () => {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [dailyLimit, setDailyLimit] = useState('1000');
  const [monthlyLimit, setMonthlyLimit] = useState('30000');
  const [testPhone, setTestPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [deliveryLogs, setDeliveryLogs] = useState<WhatsAppDeliveryLog[]>([]);
  const [stats, setStats] = useState({ total: 0, sent: 0, delivered: 0, failed: 0, successRate: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConfig();
    loadDeliveryLogs();
    loadStats();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const configData = await whatsappService.getConfig();
      if (configData) {
        setConfig(configData);
        setIsActive(configData.is_active);
        setDailyLimit(configData.daily_limit.toString());
        setMonthlyLimit(configData.monthly_limit.toString());
      }
    } catch (error) {
      console.error('Failed to load WhatsApp config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDeliveryLogs = async () => {
    const logs = await whatsappService.getDeliveryLogs(20);
    setDeliveryLogs(logs);
  };

  const loadStats = async () => {
    const statsData = await whatsappService.getDeliveryStats();
    setStats(statsData);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await whatsappService.saveConfig({
        is_active: isActive,
        daily_limit: parseInt(dailyLimit) || 1000,
        monthly_limit: parseInt(monthlyLimit) || 30000
      });

      if (success) {
        toast({
          title: 'Configuration Saved',
          description: 'WhatsApp settings have been updated successfully.'
        });
        loadConfig();
      } else {
        toast({
          title: 'Save Failed',
          description: 'Failed to save WhatsApp configuration.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while saving configuration.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!testPhone) {
      toast({
        title: 'Phone Required',
        description: 'Please enter a phone number to test.',
        variant: 'destructive'
      });
      return;
    }

    setIsTesting(true);
    try {
      const result = await whatsappService.testConnection(testPhone);
      
      if (result.success) {
        toast({
          title: 'Test Successful',
          description: 'WhatsApp test message sent successfully!'
        });
        loadDeliveryLogs();
        loadStats();
      } else {
        toast({
          title: 'Test Failed',
          description: result.error || 'Failed to send test message.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while testing.',
        variant: 'destructive'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <Badge variant="default" className="bg-green-500">Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground mt-2">Loading WhatsApp configuration...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-500" />
          WhatsApp Configuration
        </CardTitle>
        <CardDescription>
          Configure WhatsApp messaging via eNotify API. Uses same templates as SMS.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="settings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="test">Test Connection</TabsTrigger>
            <TabsTrigger value="logs">Delivery Logs</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4">
            <div className="grid gap-4">
              {/* Gateway Status */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {isActive ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">WhatsApp Gateway</p>
                    <p className="text-sm text-muted-foreground">
                      Provider: eNotify API
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>

              {/* Configuration Fields */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dailyLimit">Daily Message Limit</Label>
                  <Input
                    id="dailyLimit"
                    type="number"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    placeholder="1000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum messages per day
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthlyLimit">Monthly Message Limit</Label>
                  <Input
                    id="monthlyLimit"
                    type="number"
                    value={monthlyLimit}
                    onChange={(e) => setMonthlyLimit(e.target.value)}
                    placeholder="30000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum messages per month
                  </p>
                </div>
              </div>

              {/* Info Box */}
              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                <AlertCircle className="h-4 w-4 mt-0.5 text-blue-500" />
                <div className="text-sm">
                  <p className="font-medium">Template Sharing</p>
                  <p className="text-muted-foreground">
                    WhatsApp uses the same templates as SMS. Create and manage templates in the SMS Templates section above.
                  </p>
                </div>
              </div>

              <Button onClick={handleSave} disabled={isSaving} className="w-full md:w-auto">
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Configuration'
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="test" className="space-y-4">
            <div className="p-4 border rounded-lg space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testPhone">Test Phone Number</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="testPhone"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="9876543210"
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handleTestConnection} disabled={isTesting || !isActive}>
                    {isTesting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Test
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter a 10-digit Indian mobile number to receive a test WhatsApp message
                </p>
              </div>

              {!isActive && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Enable WhatsApp in Settings to send test messages</span>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Recent WhatsApp delivery logs</p>
              <Button variant="outline" size="sm" onClick={loadDeliveryLogs}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveryLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No WhatsApp messages sent yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    deliveryLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">{log.recipient_phone}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{log.message_text}</TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(log.created_at), 'dd MMM yyyy, HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-4 border rounded-lg text-center">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Messages</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">{stats.sent + stats.delivered}</p>
                <p className="text-sm text-muted-foreground">Sent Successfully</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.successRate}%</p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </div>

            <Button variant="outline" onClick={loadStats}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Statistics
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default WhatsAppConfigPanel;
