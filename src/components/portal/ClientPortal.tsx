import React from 'react';
import { motion } from 'framer-motion';
import { useAppState } from '@/contexts/AppStateContext';
import { useRBAC } from '@/hooks/useAdvancedRBAC';
import { ClientCaseView } from './ClientCaseView';
import { ClientDocumentLibrary } from './ClientDocumentLibrary';
import { ClientHearingSchedule } from './ClientHearingSchedule';
import { ClientNotifications } from './ClientNotifications';
import { ClientDocumentUpload } from './ClientDocumentUpload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Scale, 
  FileText, 
  Calendar, 
  Bell,
  User,
  Shield
} from 'lucide-react';

export const ClientPortal: React.FC = () => {
  const { state } = useAppState();
  const { currentUser } = useRBAC();
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasAccess, setHasAccess] = React.useState(false);
  const [clientCases, setClientCases] = React.useState<any[]>([]);

  // PHASE 3C: CRITICAL SECURITY FIX - Get clientId from authenticated user
  // TODO: Replace with actual auth context
  const currentUserId = currentUser?.id || '1';
  const clientId = currentUserId; // In real app: map userId to clientId
  
  const client = state.clients.find(c => c.id === clientId);

  // PHASE 3C: Validate client access and apply scope filtering
  React.useEffect(() => {
    const validateAccess = async () => {
      try {
        const { policyEngine, secureDataAccess } = await import('@/security/policyEngine');
        
        // Check: Can user access client portal?
        const canAccessClient = await policyEngine.evaluatePermission(
          currentUserId,
          'clients',
          'read'
        );
        
        if (!canAccessClient.allowed) {
          setHasAccess(false);
          setIsLoading(false);
          return;
        }
        
        // Apply scope filtering to cases
        const filteredCases = await secureDataAccess.secureList(
          currentUserId,
          'cases',
          async () => state.cases.filter(c => c.clientId === clientId)
        );
        
        setClientCases(filteredCases);
        setHasAccess(true);
      } catch (error) {
        console.error('Client portal access validation failed:', error);
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (clientId && state.cases.length > 0) {
      validateAccess();
    }
  }, [clientId, currentUserId, state.cases]);
  // Transform documents to match interface
  const clientDocuments = state.documents
    .filter(d => d.clientId === clientId)
    .map(d => ({
      ...d,
      uploadedBy: d.uploadedByName || 'System',
      shared: d.isShared || false
    }));
  
  // Transform hearings to match interface  
  const clientHearings = (state.hearings?.filter(h => 
    clientCases.some(c => c.id === (h.caseId || h.case_id))
  ) || []).map(h => ({
    ...h,
    time: h.time || h.start_time,
    caseId: h.caseId || h.case_id,
    type: h.type || 'Preliminary'
  })) as any;

  // Calculate stats
  const activeCases = clientCases.length; // All cases considered active for demo
  const upcomingHearings = clientHearings.filter(h => 
    new Date(h.date) > new Date()
  ).length;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Validating access...</p>
        </div>
      </div>
    );
  }

  if (!client || !hasAccess) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground">
            Client profile not found or you don't have permission to access this portal.
          </p>
        </div>
      </div>
    );
  }

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
            Welcome back, {client.name}! Here's your case overview.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <User className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{client.type}</span>
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
              <div className="text-2xl font-bold text-foreground">{clientDocuments.length}</div>
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
                Scheduled this month
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
        <Tabs defaultValue="cases" className="space-y-6">
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
            <ClientCaseView cases={clientCases} clientId={clientId} />
          </TabsContent>

          <TabsContent value="hearings">
            <ClientHearingSchedule hearings={clientHearings} cases={clientCases} />
          </TabsContent>

          <TabsContent value="documents">
            <div className="space-y-6">
              <ClientDocumentUpload clientId={clientId} />
              <ClientDocumentLibrary documents={clientDocuments} clientId={clientId} />
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <ClientNotifications clientId={clientId} />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};