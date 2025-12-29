import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { ClientCaseView } from './ClientCaseView';
import { ClientCaseTimeline } from './ClientCaseTimeline';
import { ClientDocumentLibrary } from './ClientDocumentLibrary';
import { ClientHearingSchedule } from './ClientHearingSchedule';
import { ClientNotifications } from './ClientNotifications';
import { ClientDocumentUpload } from './ClientDocumentUpload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { 
  Scale, 
  FileText, 
  Calendar, 
  Bell,
  User,
  Shield,
  Loader2
} from 'lucide-react';

interface Case {
  id: string;
  case_number: string;
  title: string;
  status: string;
  client_id: string;
}

interface Hearing {
  id: string;
  case_id: string;
  hearing_date: string;
  status: string;
  notes: string | null;
}

export const ClientPortal: React.FC = () => {
  const { clientAccess, loading: portalLoading } = useClientPortal();
  const [isLoading, setIsLoading] = useState(true);
  const [clientCases, setClientCases] = useState<Case[]>([]);
  const [clientHearings, setClientHearings] = useState<Hearing[]>([]);
  const [documentCount, setDocumentCount] = useState(0);
  const [activeTab, setActiveTab] = useState('cases');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);

  const clientId = clientAccess?.clientId || '';
  const clientName = clientAccess?.clientName || '';

  const fetchClientData = useCallback(async () => {
    if (!clientId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch cases for this client using portal client
      const { data: cases, error: casesError } = await portalSupabase
        .from('cases')
        .select('id, case_number, title, status, client_id')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (casesError) throw casesError;
      setClientCases(cases || []);

      // Fetch hearings for these cases
      if (cases && cases.length > 0) {
        const caseIds = cases.map(c => c.id);
        const { data: hearings, error: hearingsError } = await portalSupabase
          .from('hearings')
          .select('id, case_id, hearing_date, status, notes')
          .in('case_id', caseIds)
          .order('hearing_date', { ascending: false });

        if (hearingsError) throw hearingsError;
        setClientHearings(hearings || []);
      }

      // Get document count
      const { count, error: docError } = await portalSupabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId);

      if (!docError) {
        setDocumentCount(count || 0);
      }

    } catch (error) {
      console.error('Error loading client data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (portalLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md">
          <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground mt-2">
            Client profile not found. Please contact your legal team for assistance.
          </p>
        </div>
      </div>
    );
  }

  const activeCases = clientCases.filter(c => c.status !== 'Closed').length;
  const upcomingHearings = clientHearings.length;

  const selectedCase = selectedCaseId 
    ? clientCases.find(c => c.id === selectedCaseId) 
    : null;

  const handleViewDocuments = (caseId: string) => {
    setSelectedCaseId(caseId);
    setActiveTab('documents');
  };

  const handleCaseTimeline = (caseId: string) => {
    setSelectedCaseId(caseId);
    setShowTimeline(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Client Portal</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {clientName}! Here's your case overview.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <User className="h-5 w-5 text-muted-foreground" />
          <Badge variant="outline" className="ml-2">
            {clientAccess?.portalRole || 'Viewer'}
          </Badge>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <motion.div variants={itemVariants}>
          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Cases
              </CardTitle>
              <Scale className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{activeCases}</div>
              <p className="text-xs text-muted-foreground">
                {clientCases.length} total cases
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Documents
              </CardTitle>
              <FileText className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{documentCount}</div>
              <p className="text-xs text-muted-foreground">
                Available for download
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Upcoming Hearings
              </CardTitle>
              <Calendar className="h-5 w-5 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{upcomingHearings}</div>
              <p className="text-xs text-muted-foreground">
                Scheduled hearings
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Main Content Tabs */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 p-1 h-auto">
            <TabsTrigger value="cases" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap flex items-center space-x-2">
              <Scale className="h-4 w-4" />
              <span>Cases</span>
            </TabsTrigger>
            <TabsTrigger value="hearings" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Hearings</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Documents</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap flex items-center space-x-2">
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cases">
            <ClientCaseView 
              cases={clientCases} 
              clientId={clientId}
              onViewDocuments={handleViewDocuments}
              onCaseTimeline={handleCaseTimeline}
            />
          </TabsContent>

          <TabsContent value="hearings">
            <ClientHearingSchedule hearings={clientHearings} cases={clientCases} />
          </TabsContent>

          <TabsContent value="documents">
            <div className="space-y-6">
              <ClientDocumentUpload 
                clientId={clientId} 
                onUploadComplete={fetchClientData}
              />
              <ClientDocumentLibrary 
                clientId={clientId} 
                cases={clientCases.map(c => ({ id: c.id, case_number: c.case_number, title: c.title }))}
              />
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <ClientNotifications clientId={clientId} />
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Case Timeline Sheet */}
      <Sheet open={showTimeline} onOpenChange={setShowTimeline}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Case Timeline
            </SheetTitle>
            <SheetDescription>
              View the complete history of events for this case.
            </SheetDescription>
          </SheetHeader>
          {selectedCaseId && selectedCase && (
            <div className="mt-6">
              <ClientCaseTimeline 
                caseId={selectedCaseId} 
                caseNumber={selectedCase.case_number} 
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
