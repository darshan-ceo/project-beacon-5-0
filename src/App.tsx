import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppStateProvider, useAppState } from "@/contexts/AppStateContext";
import { AdvancedRBACProvider } from "@/hooks/useAdvancedRBAC";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { FollowUpReminderService } from "@/services/followUpReminderService";
import { FollowUpSystemTutorial } from "@/components/tasks/FollowUpSystemTutorial";
import { toast } from "@/hooks/use-toast";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AdminLayout } from "./components/layout/AdminLayout";
import { EnhancedDashboard } from "@/components/dashboard/EnhancedDashboard";
import { ClientMasters } from "@/components/masters/ClientMasters";
import { ClientGroupMasters } from "@/components/masters/ClientGroupMasters";
import { CourtMasters } from "@/components/masters/CourtMasters";
import JudgeMasters from "@/components/masters/JudgeMasters";
import { EmployeeMasters } from "@/components/masters/EmployeeMasters";
import { CaseManagement } from "@/components/cases/CaseManagement";
import { TaskManagement } from "@/components/tasks/TaskManagement";
import { DocumentManagement } from "@/components/documents/DocumentManagement";
import { RBACManagementWrapper as RBACManagement } from "@/components/admin/RBACManagementWrapper";
import { GlobalParameters } from "@/components/admin/GlobalParameters";
import { UserProfile } from "@/components/admin/UserProfile";
import { ProfileErrorBoundary } from "@/components/admin/ProfileErrorBoundary";
import { ReportsModule } from "@/components/reports/ReportsModule";
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
import { ClientLayout } from "./components/layout/ClientLayout";
import { ClientRouteGuard } from "./components/ui/client-route-guard";
import { AppWithPersistence } from "./components/AppWithPersistence";
import { SearchResultsPage } from "./pages/SearchResultsPage";
import { DebugSearchInspector } from "./pages/DebugSearchInspector";
import { MigrationHealth } from "@/components/qa/MigrationHealth";
import { TooltipDiagnostics } from "@/pages/TooltipDiagnostics";
import { OAuthCallback } from "@/pages/OAuthCallback";
import { LoginPage } from "@/pages/auth/LoginPage";
import { SignupPage } from "@/pages/auth/SignupPage";
import { useAutomation } from "@/hooks/useAutomation";

const queryClient = new QueryClient();

// Mock current user - in real app this would come from auth context
const currentUser = {
  id: 'demo-user',
  name: 'John Doe',
  role: 'Admin' as const,
  avatar: undefined
};

// Inner component to access AppState context
const AppContent = () => {
  const { state } = useAppState();

  // Initialize automation system
  useAutomation();

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
              <Route path="/oauth/callback" element={<OAuthCallback />} />
              
              {/* Protected Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <EnhancedDashboard />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/portal" element={
                <ProtectedRoute>
                  <ClientRouteGuard>
                    <ClientLayout>
                      <ClientPortal />
                    </ClientLayout>
                  </ClientRouteGuard>
                </ProtectedRoute>
              } />
              <Route path="/clients" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <ClientMasters />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/client-groups" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <ClientGroupMasters />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/courts" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <CourtMasters />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/judges" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <JudgeMasters />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/employees" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <EmployeeMasters />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/cases" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <CaseManagement />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/tasks" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <TaskManagement />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/documents" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <DocumentManagement />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/documents/folder/:id" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <DocumentManagement />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/rbac" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <RBACManagement />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <GlobalParameters />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <ProfileErrorBoundary>
                      <UserProfile />
                    </ProfileErrorBoundary>
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <ReportsModule userRole={currentUser.role} />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/debug/gst" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <GSTDebugPage />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/qa" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <QADashboard />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/dev-dashboard" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <DevModeDashboard />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/hearings/*" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <HearingsPage />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/hearings/calendar" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <HearingsPage />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/hearings/list" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <HearingsPage />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/help" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <HelpCenter />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/help/glossary" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <GlossaryPage />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/help/api" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <APIDocsPage />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/help/best-practices" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <BestPracticesPage />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/help/articles/:slug" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
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
                  <AdminLayout currentUser={currentUser}>
                    <HelpDiagnostics />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/pending-records" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <PendingRecordsPage />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/search" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <SearchResultsPage />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/debug/search" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <DebugSearchInspector />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/migration" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <MigrationHealth />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/qa/tooltips" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <TooltipDiagnostics />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              {/* Redirect legacy URLs */}
              <Route path="/document-management" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <DocumentManagement />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/documents/templates/custom/new" element={
                <ProtectedRoute>
                  <AdminLayout currentUser={currentUser}>
                    <DocumentManagement />
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
            <AppWithPersistence>
              <AppContent />
            </AppWithPersistence>
          </AppStateProvider>
        </AdvancedRBACProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;