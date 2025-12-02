import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import Index from "./pages/Index";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/auth" element={<Auth />} />
          
          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          
          {/* Public routes with Layout - auth triggered on actions */}
          <Route path="/" element={<Layout><Index /></Layout>} />
          <Route path="/quotations" element={<Layout><Quotations /></Layout>} />
          <Route path="/quotations/:id" element={<Layout><QuotationDetail /></Layout>} />
          <Route path="/invoices" element={<Layout><Invoices /></Layout>} />
          <Route path="/invoices/:id" element={<Layout><InvoiceDetail /></Layout>} />
          <Route path="/clients" element={<Layout><Clients /></Layout>} />
          <Route path="/settings" element={<Layout><Settings /></Layout>} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
