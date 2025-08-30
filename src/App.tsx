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
import { DashboardOverview } from "./components/dashboard/DashboardOverview";
import { ClientMasters } from "./components/masters/ClientMasters";
import { CourtMasters } from "./components/masters/CourtMasters";
import { JudgeMasters } from "./components/masters/JudgeMasters";
import { CaseManagement } from "./components/cases/CaseManagement";
import { TaskManagement } from "./components/tasks/TaskManagement";
import { DocumentManagement } from "./components/documents/DocumentManagement";
import { RBACManagement } from "./components/admin/RBACManagement";
import { GlobalParameters } from "./components/admin/GlobalParameters";
import { UserProfile } from "./components/admin/UserProfile";
import { ClientPortal } from "./components/portal/ClientPortal";
import { EnhancedDashboard } from "./components/dashboard/EnhancedDashboard";

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
              <Route path="/client-portal" element={<ClientPortal />} />
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
                  <UserProfile />
                </AdminLayout>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AppStateProvider>
    </RBACProvider>
  </QueryClientProvider>
);

export default App;