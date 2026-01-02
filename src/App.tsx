import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { FeedbackProvider } from "./components/FeedbackProvider";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import { PaywallModal } from "./components/PaywallModal";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { SEOProvider } from "./components/SEOProvider";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { CountrySelectionPopup } from "./components/CountrySelectionPopup";
import { GuestOnboardingTour } from "./components/GuestOnboardingTour";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import SiteMeasurement from "./pages/SiteMeasurement";
import SiteMeasurementNew from "./pages/SiteMeasurementNew";
import SiteMeasurementDetail from "./pages/SiteMeasurementDetail";
import SiteMeasurementPricing from "./pages/SiteMeasurementPricing";
import MyProjects from "./pages/MyProjects";
import MyProjectDetail from "./pages/MyProjectDetail";
import Quotations from "./pages/Quotations";
import QuotationDetail from "./pages/QuotationDetail";
import Invoices from "./pages/Invoices";
import InvoiceDetail from "./pages/InvoiceDetail";
import Clients from "./pages/Clients";
import Settings from "./pages/Settings";
import MyLibrary from "./pages/MyLibrary";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Team from "./pages/Team";
import TeamLogin from "./pages/team/TeamLogin";
import TeamDashboard from "./pages/team/TeamDashboard";
import ProjectDetail from "./pages/team/ProjectDetail";
import TermsAndConditions from "./pages/TermsAndConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CancellationRefundPolicy from "./pages/CancellationRefundPolicy";
import PaymentProcessing from "./pages/PaymentProcessing";
import QuotationResponse from "./pages/QuotationResponse";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SEOProvider>
          <SubscriptionProvider>
            <FeedbackProvider>
              <PaywallModal />
              <PWAInstallPrompt />
              <OfflineIndicator />
              <CountrySelectionPopup />
              <GuestOnboardingTour />
              <Routes>
                {/* Public routes */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/payment-processing" element={<PaymentProcessing />} />
                <Route path="/quotation-response" element={<QuotationResponse />} />
                
                {/* Admin routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                
                {/* Team member routes */}
                <Route path="/team/login" element={<TeamLogin />} />
                <Route path="/team/dashboard" element={<TeamDashboard />} />
                
                {/* Public routes with Layout - auth triggered on actions */}
                <Route path="/" element={<Layout><Index /></Layout>} />
                <Route path="/dashboard" element={<Layout><ProtectedRoute><Dashboard /></ProtectedRoute></Layout>} />
                <Route path="/site-measurement" element={<Layout><ProtectedRoute><SiteMeasurement /></ProtectedRoute></Layout>} />
                <Route path="/site-measurement/new" element={<Layout><ProtectedRoute><SiteMeasurementNew /></ProtectedRoute></Layout>} />
                <Route path="/site-measurement/:id" element={<Layout><ProtectedRoute><SiteMeasurementDetail /></ProtectedRoute></Layout>} />
                <Route path="/site-measurement/:id/pricing" element={<Layout><ProtectedRoute><SiteMeasurementPricing /></ProtectedRoute></Layout>} />
                <Route path="/my-projects" element={<Layout><ProtectedRoute><MyProjects /></ProtectedRoute></Layout>} />
                <Route path="/my-projects/:id" element={<Layout><ProtectedRoute><MyProjectDetail /></ProtectedRoute></Layout>} />
                <Route path="/quotations" element={<Layout><ProtectedRoute><Quotations /></ProtectedRoute></Layout>} />
                <Route path="/quotations/:id" element={<Layout><ProtectedRoute><QuotationDetail /></ProtectedRoute></Layout>} />
                <Route path="/invoices" element={<Layout><ProtectedRoute><Invoices /></ProtectedRoute></Layout>} />
                <Route path="/invoices/:id" element={<Layout><ProtectedRoute><InvoiceDetail /></ProtectedRoute></Layout>} />
                <Route path="/clients" element={<Layout><ProtectedRoute><Clients /></ProtectedRoute></Layout>} />
                <Route path="/team" element={<Layout><ProtectedRoute><Team /></ProtectedRoute></Layout>} />
                <Route path="/team/project/:projectId" element={<Layout><ProtectedRoute><ProjectDetail /></ProtectedRoute></Layout>} />
                <Route path="/library" element={<Layout><ProtectedRoute><MyLibrary /></ProtectedRoute></Layout>} />
                <Route path="/settings" element={<Layout><ProtectedRoute><Settings /></ProtectedRoute></Layout>} />
                <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/cancellation-refund-policy" element={<CancellationRefundPolicy />} />
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </FeedbackProvider>
          </SubscriptionProvider>
        </SEOProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
