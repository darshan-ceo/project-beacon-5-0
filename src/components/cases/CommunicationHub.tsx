import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  Send, 
  Paperclip, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Search,
  Filter,
  Eye,
  Download,
  User,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { communicationService, CommunicationLog, MessageComposer } from '@/services/communicationService';
import { useAppState, Case } from '@/contexts/AppStateContext';

interface CommunicationHubProps {
  selectedCase: Case | null;
}

export const CommunicationHub: React.FC<CommunicationHubProps> = ({ selectedCase }) => {
  const { state } = useAppState();
  
  // Message Composer State
  const [messageForm, setMessageForm] = useState<Partial<MessageComposer>>({
    channel: 'email',
    subject: '',
    message: '',
    attachments: []
  });
  const [isSending, setIsSending] = useState(false);
  
  // Communication Logs State
  const [communicationLogs, setCommunicationLogs] = useState<CommunicationLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Client contacts for the selected case
  const caseClient = selectedCase ? state.clients.find(c => c.id === selectedCase.clientId) : null;
  const clientContacts = caseClient ? [
    {
      id: caseClient.id,
      name: caseClient.name,
      email: caseClient.email,
      phone: caseClient.phone,
      type: 'primary'
    }
  ] : [];

  // Load communication logs
  useEffect(() => {
    if (selectedCase) {
      loadCommunicationLogs();
    }
  }, [selectedCase]);

  const loadCommunicationLogs = async () => {
    if (!selectedCase) return;
    
    setIsLoadingLogs(true);
    try {
      const logs = await communicationService.getCommunicationLog(selectedCase.id);
      setCommunicationLogs(logs);
    } catch (error) {
      console.error('Failed to load communication logs:', error);
      toast({
        title: "Failed to Load Communications",
        description: "Could not load communication history.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!selectedCase || !caseClient) {
      toast({
        title: "No Case Selected",
        description: "Please select a case first.",
        variant: "destructive"
      });
      return;
    }

    if (!messageForm.message?.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message.",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    try {
      let communicationLog: CommunicationLog;

      const fullMessage: MessageComposer = {
        to: messageForm.channel === 'email' ? caseClient.email : caseClient.phone,
        toName: caseClient.name,
        channel: messageForm.channel as 'email' | 'sms' | 'whatsapp',
        subject: messageForm.subject,
        message: messageForm.message!,
        attachments: messageForm.attachments || [],
        caseId: selectedCase.id,
        clientId: caseClient.id
      };

      switch (messageForm.channel) {
        case 'email':
          communicationLog = await communicationService.sendEmail(fullMessage);
          break;
        case 'sms':
          communicationLog = await communicationService.sendSMS(
            caseClient.phone,
            messageForm.message!,
            selectedCase.id,
            caseClient.id,
            caseClient.name
          );
          break;
        case 'whatsapp':
          communicationLog = await communicationService.sendWhatsApp(
            caseClient.phone,
            messageForm.message!,
            messageForm.attachments || [],
            selectedCase.id,
            caseClient.id,
            caseClient.name
          );
          break;
        default:
          throw new Error('Invalid channel');
      }

      // Add to local state
      setCommunicationLogs(prev => [communicationLog, ...prev]);
      
      // Reset form
      setMessageForm({
        channel: 'email',
        subject: '',
        message: '',
        attachments: []
      });

    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Message Send Failed",
        description: error instanceof Error ? error.message : "Failed to send message.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  // Filter communication logs
  const filteredLogs = communicationLogs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.sentToName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesChannel = filterChannel === 'all' || log.channel === filterChannel;
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    
    return matchesSearch && matchesChannel && matchesStatus;
  });

  // Get status icon and color
  const getStatusDisplay = (status: CommunicationLog['status']) => {
    switch (status) {
      case 'sent':
        return { icon: Send, color: 'text-primary', label: 'Sent' };
      case 'delivered':
        return { icon: CheckCircle, color: 'text-success', label: 'Delivered' };
      case 'read':
        return { icon: Eye, color: 'text-success', label: 'Read' };
      case 'failed':
        return { icon: AlertCircle, color: 'text-destructive', label: 'Failed' };
      default:
        return { icon: Clock, color: 'text-muted-foreground', label: 'Pending' };
    }
  };

  // Get channel icon
  const getChannelIcon = (channel: CommunicationLog['channel']) => {
    switch (channel) {
      case 'email':
        return Mail;
      case 'sms':
        return Phone;
      case 'whatsapp':
        return MessageSquare;
      default:
        return MessageSquare;
    }
  };

  if (!selectedCase) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Case Selected</h3>
            <p className="text-muted-foreground">Please select a case to view communications.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center">
              <MessageSquare className="mr-3 h-6 w-6 text-primary" />
              Communication Hub
            </h2>
            <p className="text-muted-foreground">
              Send messages and view communication history for case {selectedCase.caseNumber}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{caseClient?.name}</p>
            <p className="text-xs text-muted-foreground">{caseClient?.email}</p>
            <p className="text-xs text-muted-foreground">{caseClient?.phone}</p>
          </div>
        </div>

        <Tabs defaultValue="compose" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="compose">Compose Message</TabsTrigger>
            <TabsTrigger value="history">Communication History</TabsTrigger>
          </TabsList>

          {/* Message Composer Tab */}
          <TabsContent value="compose" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Send className="mr-2 h-5 w-5" />
                  Send Message
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Channel</Label>
                    <Select 
                      value={messageForm.channel} 
                      onValueChange={(value) => setMessageForm(prev => ({ ...prev, channel: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">
                          <div className="flex items-center">
                            <Mail className="mr-2 h-4 w-4" />
                            Email
                          </div>
                        </SelectItem>
                        <SelectItem value="sms">
                          <div className="flex items-center">
                            <Phone className="mr-2 h-4 w-4" />
                            SMS
                          </div>
                        </SelectItem>
                        <SelectItem value="whatsapp">
                          <div className="flex items-center">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            WhatsApp
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>To</Label>
                    <div className="flex items-center space-x-2 bg-muted p-2 rounded-md">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{caseClient?.name}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Contact</Label>
                    <div className="text-sm text-muted-foreground bg-muted p-2 rounded-md">
                      {messageForm.channel === 'email' ? caseClient?.email : caseClient?.phone}
                    </div>
                  </div>
                </div>

                {messageForm.channel === 'email' && (
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Enter email subject"
                      value={messageForm.subject || ''}
                      onChange={(e) => setMessageForm(prev => ({ ...prev, subject: e.target.value }))}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder={
                      messageForm.channel === 'sms' 
                        ? "Enter your SMS message (160 characters recommended)"
                        : "Enter your message"
                    }
                    value={messageForm.message || ''}
                    onChange={(e) => setMessageForm(prev => ({ ...prev, message: e.target.value }))}
                    rows={messageForm.channel === 'sms' ? 3 : 6}
                  />
                  {messageForm.channel === 'sms' && messageForm.message && (
                    <p className="text-xs text-muted-foreground">
                      {messageForm.message.length}/160 characters
                      {messageForm.message.length > 160 && ' (Will be sent as multiple SMS)'}
                    </p>
                  )}
                </div>

                {(messageForm.channel === 'email' || messageForm.channel === 'whatsapp') && (
                  <div className="space-y-2">
                    <Label>Attachments</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="file"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          setMessageForm(prev => ({ ...prev, attachments: files }));
                        }}
                      />
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                    </div>
                    {messageForm.attachments && messageForm.attachments.length > 0 && (
                      <div className="space-y-1">
                        {messageForm.attachments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-muted p-2 rounded text-sm">
                            <span>{file.name}</span>
                            <button
                              onClick={() => setMessageForm(prev => ({
                                ...prev,
                                attachments: prev.attachments?.filter((_, i) => i !== index)
                              }))}
                              className="text-destructive hover:text-destructive-foreground"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <Button 
                  onClick={handleSendMessage}
                  disabled={isSending || !messageForm.message?.trim()}
                  className="w-full"
                >
                  {isSending ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Communication History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
                    Communication History
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={loadCommunicationLogs}>
                    <Clock className="mr-1 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search messages..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={filterChannel} onValueChange={setFilterChannel}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Channels</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Communication Logs */}
                <ScrollArea className="h-96">
                  {isLoadingLogs ? (
                    <div className="flex items-center justify-center py-8">
                      <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredLogs.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No communications found</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredLogs.map((log) => {
                        const ChannelIcon = getChannelIcon(log.channel);
                        const statusDisplay = getStatusDisplay(log.status);
                        const StatusIcon = statusDisplay.icon;

                        return (
                          <motion.div
                            key={log.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <ChannelIcon className="h-4 w-4 text-primary" />
                                <Badge variant="outline" className="capitalize">
                                  {log.channel}
                                </Badge>
                                <span className="text-sm font-medium">{log.sentToName}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <StatusIcon className={`h-4 w-4 ${statusDisplay.color}`} />
                                <span className={`text-xs ${statusDisplay.color}`}>
                                  {statusDisplay.label}
                                </span>
                              </div>
                            </div>

                            {log.subject && (
                              <h4 className="font-medium text-sm mb-1">{log.subject}</h4>
                            )}

                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {log.message}
                            </p>

                            {log.attachments.length > 0 && (
                              <div className="flex items-center space-x-2 mb-2">
                                <Paperclip className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {log.attachments.length} attachment(s)
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(log.timestamp).toLocaleString()}</span>
                              </div>
                              <span>Sent by {log.sentBy}</span>
                            </div>

                            {log.metadata?.readAt && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Read: {new Date(log.metadata.readAt).toLocaleString()}
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};