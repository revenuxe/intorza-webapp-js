import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { FeedbackProvider } from "./components/FeedbackProvider";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Quotations from "./pages/Quotations";
import QuotationDetail from "./pages/QuotationDetail";
import Invoices from "./pages/Invoices";
import InvoiceDetail from "./pages/InvoiceDetail";
import Clients from "./pages/Clients";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Team from "./pages/Team";
import TeamLogin from "./pages/team/TeamLogin";
import TeamDashboard from "./pages/team/TeamDashboard";
import ProjectDetail from "./pages/team/ProjectDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <FeedbackProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Admin routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            
            {/* Team member routes */}
            <Route path="/team/login" element={<TeamLogin />} />
            <Route path="/team/dashboard" element={<TeamDashboard />} />
            
            {/* Public routes with Layout - auth triggered on actions */}
            <Route path="/" element={<Layout><Index /></Layout>} />
            <Route path="/dashboard" element={<Layout><ProtectedRoute><Dashboard /></ProtectedRoute></Layout>} />
            <Route path="/quotations" element={<Layout><ProtectedRoute><Quotations /></ProtectedRoute></Layout>} />
            <Route path="/quotations/:id" element={<Layout><ProtectedRoute><QuotationDetail /></ProtectedRoute></Layout>} />
            <Route path="/invoices" element={<Layout><ProtectedRoute><Invoices /></ProtectedRoute></Layout>} />
            <Route path="/invoices/:id" element={<Layout><ProtectedRoute><InvoiceDetail /></ProtectedRoute></Layout>} />
            <Route path="/clients" element={<Layout><ProtectedRoute><Clients /></ProtectedRoute></Layout>} />
            <Route path="/team" element={<Layout><ProtectedRoute><Team /></ProtectedRoute></Layout>} />
            <Route path="/team/project/:projectId" element={<Layout><ProtectedRoute><ProjectDetail /></ProtectedRoute></Layout>} />
            <Route path="/settings" element={<Layout><ProtectedRoute><Settings /></ProtectedRoute></Layout>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </FeedbackProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
