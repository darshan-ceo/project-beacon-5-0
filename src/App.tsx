import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const queryClient = new QueryClient();

// Mock current user - in real app this would come from auth context
const currentUser = {
  name: 'John Doe',
  role: 'Admin' as const,
  avatar: undefined
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <AdminLayout currentUser={currentUser}>
              <DashboardOverview />
            </AdminLayout>
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
          {/* Placeholder routes for missing components */}
          <Route path="/rbac" element={
            <AdminLayout currentUser={currentUser}>
              <div className="p-6">
                <h1 className="text-3xl font-bold">RBAC Management</h1>
                <p className="text-muted-foreground mt-2">Role-based access control management coming soon...</p>
              </div>
            </AdminLayout>
          } />
          <Route path="/settings" element={
            <AdminLayout currentUser={currentUser}>
              <div className="p-6">
                <h1 className="text-3xl font-bold">Global Parameters</h1>
                <p className="text-muted-foreground mt-2">System-wide settings and configuration coming soon...</p>
              </div>
            </AdminLayout>
          } />
          <Route path="/profile" element={
            <AdminLayout currentUser={currentUser}>
              <div className="p-6">
                <h1 className="text-3xl font-bold">User Profile</h1>
                <p className="text-muted-foreground mt-2">User profile management coming soon...</p>
              </div>
            </AdminLayout>
          } />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
