import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppStateProvider, useAppState } from "@/contexts/AppStateContext";
import { AdvancedRBACProvider } from "@/hooks/useAdvancedRBAC";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { FollowUpReminderService } from "@/services/followUpReminderService";
import { FollowUpSystemTutorial } from "@/components/tasks/FollowUpSystemTutorial";
import { toast } from "@/hooks/use-toast";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AdminLayout } from "./components/layout/AdminLayout";
import { EnhancedDashboard } from "@/components/dashboard/EnhancedDashboard";
import { ClientMasters } from "@/components/masters/ClientMasters";
import { ContactsPage } from "@/pages/ContactsPage";
import { ClientGroupMasters } from "@/components/masters/ClientGroupMasters";
import { CourtMasters } from "@/components/masters/CourtMasters";
import JudgeMasters from "@/components/masters/JudgeMasters";
import { EmployeeMasters } from "@/components/masters/EmployeeMasters";
import { StatutoryActMasters } from "@/components/masters/StatutoryActMasters";
import { StatutoryEventTypeMasters } from "@/components/masters/StatutoryEventTypeMasters";
import { HolidayMasters } from "@/components/masters/HolidayMasters";
import { CaseManagement } from "@/components/cases/CaseManagement";
import { TaskManagement } from "@/components/tasks/TaskManagement";
import { TaskConversation } from "@/components/tasks/TaskConversation";
import CreateTask from "@/pages/CreateTask";
import { DocumentManagement } from "@/components/documents/DocumentManagement";
import { RBACManagementWrapper as RBACManagement } from "@/components/admin/RBACManagementWrapper";
import { GlobalParameters } from "@/components/admin/GlobalParameters";
import { UserProfile } from "@/components/admin/UserProfile";
import { ProfileErrorBoundary } from "@/components/admin/ProfileErrorBoundary";
import { ReportsModule } from "@/components/reports/ReportsModule";
import { AnalyticsDashboard } from "@/pages/AnalyticsDashboard";
import { GSTDebugPage } from "@/components/debug/GSTDebugPage";
import { QADashboard } from "@/pages/QADashboard";
import { HearingsPage } from "@/pages/HearingsPage";
import { HelpCenter } from "@/pages/HelpCenter";
import { HelpDiagnostics } from "@/pages/HelpDiagnostics";
import { GlossaryPage } from "@/pages/help/GlossaryPage";
import { APIDocsPage } from "@/pages/help/APIDocsPage";
import { BestPracticesPage } from "@/pages/help/BestPracticesPage";
import { ArticlePage } from "@/pages/help/ArticlePage";
import { PendingRecordsPage } from "@/pages/PendingRecordsPage";
import StageContextPage from "@/pages/StageContextPage";
import { DevModeDashboard } from "@/pages/DevModeDashboard";
import { ClientPortal } from "./components/portal/ClientPortal";
import { ClientPortalUserManagement } from "./components/admin/ClientPortalUserManagement";
import { ClientLayout } from "./components/layout/ClientLayout";
import { ClientRouteGuard } from "./components/ui/client-route-guard";
import { ClientPortalProvider } from "./contexts/ClientPortalContext";
import { AppWithPersistence } from "./components/AppWithPersistence";
import { SearchResultsPage } from "./pages/SearchResultsPage";
import { DebugSearchInspector } from "./pages/DebugSearchInspector";
import { MigrationHealth } from "@/components/qa/MigrationHealth";
import { TooltipDiagnostics } from "@/pages/TooltipDiagnostics";
import { OAuthCallback } from "@/pages/OAuthCallback";
import { DocViewerPage } from "@/pages/DocViewerPage";
import { ComplianceDashboard } from "@/pages/ComplianceDashboard";
import { LoginPage } from "@/pages/auth/LoginPage";
import { SignupPage } from "@/pages/auth/SignupPage";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import { useAutomation } from "@/hooks/useAutomation";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { DataInitializer } from "@/components/data/DataInitializer";

const queryClient = new QueryClient();

// Reports wrapper to get user role from context
const ReportsWithAuth = () => {
  const { userProfile } = useAuth();
  // Map roles to ReportsModule expected types
  const roleMap: Record<string, 'Admin' | 'Partner/CA' | 'Staff' | 'Client'> = {
    'Admin': 'Admin',
    'Partner': 'Partner/CA',
    'CA': 'Partner/CA',
    'Advocate': 'Partner/CA',
    'Manager': 'Partner/CA',
    'Staff': 'Staff',
    'User': 'Staff',
    'Clerk': 'Staff',
    'Client': 'Client',
  };
  const userRole = roleMap[userProfile?.role || ''] || 'Staff';
  return <ReportsModule userRole={userRole} />;
};

// Inner component to access AppState context
const AppContent = () => {
  const { state } = useAppState();

  // Initialize automation system
  useAutomation();

  // Initialize realtime sync
  useRealtimeSync();

  // Initialize UI Help Service on app startup
  useEffect(() => {
    const initializeApp = async () => {
      const { uiHelpService } = await import('@/services/uiHelpService');
      await uiHelpService.loadHelpData();
    };

    initializeApp();
  }, []);

  // Start follow-up reminder monitoring
  useEffect(() => {
    FollowUpReminderService.startMonitoring(state.tasks, (overdueTasks) => {
      toast({
        title: "Follow-Ups Overdue",
        description: `${overdueTasks.length} task${overdueTasks.length !== 1 ? 's have' : ' has'} overdue follow-ups`,
        variant: "destructive",
      });
    });

    return () => FollowUpReminderService.stopMonitoring();
  }, [state.tasks]);

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <FollowUpSystemTutorial />
        <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/signup" element={<SignupPage />} />
              <Route path="/auth/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              <Route path="/oauth/callback" element={<OAuthCallback />} />
              
              {/* Protected Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <EnhancedDashboard />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/portal" element={
                <ProtectedRoute>
                  <ClientPortalProvider>
                    <ClientRouteGuard>
                      <ClientLayout>
                        <ClientPortal />
                      </ClientLayout>
                    </ClientRouteGuard>
                  </ClientPortalProvider>
                </ProtectedRoute>
              } />
              <Route path="/clients" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <ClientMasters />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/contacts" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <ContactsPage />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/client-groups" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <ClientGroupMasters />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/courts" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <CourtMasters />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/judges" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <JudgeMasters />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/employees" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <EmployeeMasters />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/statutory-acts" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <StatutoryActMasters />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/statutory-event-types" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <StatutoryEventTypeMasters />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/holidays" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <HolidayMasters />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/cases" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <CaseManagement />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/tasks" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <TaskManagement />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/tasks/new" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <CreateTask />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/tasks/:taskId" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <TaskConversation />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/documents" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <DocumentManagement />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/documents/folder/:id" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <DocumentManagement />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/access-roles" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <RBACManagement />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <GlobalParameters />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <ProfileErrorBoundary>
                      <UserProfile />
                    </ProfileErrorBoundary>
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <ReportsWithAuth />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/analytics" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <AnalyticsDashboard />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/compliance" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <ComplianceDashboard />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/debug/gst" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <GSTDebugPage />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/qa" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <QADashboard />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/dev-dashboard" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <DevModeDashboard />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/hearings/*" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <HearingsPage />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/hearings/calendar" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <HearingsPage />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/hearings/list" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <HearingsPage />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/help" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <HelpCenter />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/help/glossary" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <GlossaryPage />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/help/api" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <APIDocsPage />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/help/best-practices" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <BestPracticesPage />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/help/articles/:slug" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <ArticlePage />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/cases/:caseId/stages/:instanceId/context" element={
                <ProtectedRoute>
                  <StageContextPage />
                </ProtectedRoute>
              } />
              <Route path="/help/diagnostics" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <HelpDiagnostics />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/pending-records" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <PendingRecordsPage />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/search" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <SearchResultsPage />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/debug/search" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <DebugSearchInspector />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/migration" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <MigrationHealth />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/qa/tooltips" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <TooltipDiagnostics />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/docs" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <DocViewerPage />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              {/* Redirect legacy URLs */}
              <Route path="/document-management" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <DocumentManagement />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/documents/templates/custom/new" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <DocumentManagement />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/settings/client-portal-users" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <ClientPortalUserManagement />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AdvancedRBACProvider>
          <AppStateProvider>
            <DataInitializer>
              <AppWithPersistence>
                <AppContent />
              </AppWithPersistence>
            </DataInitializer>
          </AppStateProvider>
        </AdvancedRBACProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
