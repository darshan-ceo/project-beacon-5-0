import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppStateProvider } from "@/contexts/AppStateContext";
import { RBACProvider } from "@/hooks/useRBAC";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AdminLayout } from "./components/layout/AdminLayout";
import { EnhancedDashboard } from "@/components/dashboard/EnhancedDashboard";
import { ClientMasters } from "@/components/masters/ClientMasters";
import { CourtMasters } from "@/components/masters/CourtMasters";
import JudgeMasters from "@/components/masters/JudgeMasters";
import { EmployeeMasters } from "@/components/masters/EmployeeMasters";
import { CaseManagement } from "@/components/cases/CaseManagement";
import { TaskManagement } from "@/components/tasks/TaskManagement";
import { DocumentManagement } from "@/components/documents/DocumentManagement";
import { RBACManagement } from "@/components/admin/RBACManagement";
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

const queryClient = new QueryClient();

// Mock current user - in real app this would come from auth context
const currentUser = {
  name: 'John Doe',
  role: 'Admin' as const,
  avatar: undefined
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <RBACProvider>
      <AppStateProvider>
        <AppWithPersistence>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <Routes>
              <Route path="/" element={
                <AdminLayout currentUser={currentUser}>
                  <EnhancedDashboard />
                </AdminLayout>
              } />
              <Route path="/portal" element={
                <ClientRouteGuard>
                  <ClientLayout>
                    <ClientPortal />
                  </ClientLayout>
                </ClientRouteGuard>
              } />
              <Route path="/clients" element={
                <AdminLayout currentUser={currentUser}>
                  <ClientMasters />
                </AdminLayout>
              } />
              <Route path="/courts" element={
                <AdminLayout currentUser={currentUser}>
                  <CourtMasters />
                </AdminLayout>
              } />
              <Route path="/judges" element={
                <AdminLayout currentUser={currentUser}>
                  <JudgeMasters />
                </AdminLayout>
              } />
              <Route path="/employees" element={
                <AdminLayout currentUser={currentUser}>
                  <EmployeeMasters />
                </AdminLayout>
              } />
              <Route path="/cases" element={
                <AdminLayout currentUser={currentUser}>
                  <CaseManagement />
                </AdminLayout>
              } />
              <Route path="/tasks" element={
                <AdminLayout currentUser={currentUser}>
                  <TaskManagement />
                </AdminLayout>
              } />
              <Route path="/documents" element={
                <AdminLayout currentUser={currentUser}>
                  <DocumentManagement />
                </AdminLayout>
              } />
              <Route path="/documents/folder/:id" element={
                <AdminLayout currentUser={currentUser}>
                  <DocumentManagement />
                </AdminLayout>
              } />
              <Route path="/rbac" element={
                <AdminLayout currentUser={currentUser}>
                  <RBACManagement />
                </AdminLayout>
              } />
              <Route path="/settings" element={
                <AdminLayout currentUser={currentUser}>
                  <GlobalParameters />
                </AdminLayout>
              } />
              <Route path="/profile" element={
                <AdminLayout currentUser={currentUser}>
                  <ProfileErrorBoundary>
                    <UserProfile />
                  </ProfileErrorBoundary>
                </AdminLayout>
              } />
              <Route path="/reports" element={
                <AdminLayout currentUser={currentUser}>
                  <ReportsModule userRole={currentUser.role} />
                </AdminLayout>
              } />
              <Route path="/debug/gst" element={
                <AdminLayout currentUser={currentUser}>
                  <GSTDebugPage />
                </AdminLayout>
              } />
              <Route path="/qa" element={
                <AdminLayout currentUser={currentUser}>
                  <QADashboard />
                </AdminLayout>
              } />
              <Route path="/dev-dashboard" element={
                <AdminLayout currentUser={currentUser}>
                  <DevModeDashboard />
                </AdminLayout>
              } />
              <Route path="/hearings/*" element={
                <AdminLayout currentUser={currentUser}>
                  <HearingsPage />
                </AdminLayout>
              } />
              <Route path="/hearings/calendar" element={
                <AdminLayout currentUser={currentUser}>
                  <HearingsPage />
                </AdminLayout>
              } />
              <Route path="/hearings/list" element={
                <AdminLayout currentUser={currentUser}>
                  <HearingsPage />
                </AdminLayout>
              } />
              <Route path="/help" element={
                <AdminLayout currentUser={currentUser}>
                  <HelpCenter />
                </AdminLayout>
              } />
              <Route path="/help/glossary" element={
                <AdminLayout currentUser={currentUser}>
                  <GlossaryPage />
                </AdminLayout>
              } />
              <Route path="/help/api" element={
                <AdminLayout currentUser={currentUser}>
                  <APIDocsPage />
                </AdminLayout>
              } />
              <Route path="/help/best-practices" element={
                <AdminLayout currentUser={currentUser}>
                  <BestPracticesPage />
                </AdminLayout>
              } />
              <Route path="/help/articles/:slug" element={
                <AdminLayout currentUser={currentUser}>
                  <ArticlePage />
                </AdminLayout>
              } />
              <Route path="/cases/:caseId/stages/:instanceId/context" element={
                <StageContextPage />
              } />
              <Route path="/help/diagnostics" element={
                <AdminLayout currentUser={currentUser}>
                  <HelpDiagnostics />
                </AdminLayout>
              } />
              <Route path="/pending-records" element={
                <AdminLayout currentUser={currentUser}>
                  <PendingRecordsPage />
                </AdminLayout>
              } />
              <Route path="/search" element={
                <AdminLayout currentUser={currentUser}>
                  <SearchResultsPage />
                </AdminLayout>
              } />
              <Route path="/debug/search" element={
                <AdminLayout currentUser={currentUser}>
                  <DebugSearchInspector />
                </AdminLayout>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AppWithPersistence>
      </AppStateProvider>
    </RBACProvider>
  </QueryClientProvider>
);

export default App;