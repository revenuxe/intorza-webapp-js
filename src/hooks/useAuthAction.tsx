import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useAuthAction = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const requireAuth = async (action: () => Promise<void>, actionName?: string, formData?: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Store the current path and action to continue after login
      sessionStorage.setItem('pendingAction', actionName || 'default');
      sessionStorage.setItem('returnPath', location.pathname + location.search);
      
      // Store form data if provided
      if (formData) {
        sessionStorage.setItem('pendingFormData', JSON.stringify(formData));
      }
      
      toast({
        title: "Login required",
        description: "Please login to continue",
      });
      navigate("/auth");
      return;
    }
    
    await action();
  };

  const isAuthenticated = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  };

  const getPendingAction = () => {
    const action = sessionStorage.getItem('pendingAction');
    const returnPath = sessionStorage.getItem('returnPath');
    const formDataStr = sessionStorage.getItem('pendingFormData');
    const formData = formDataStr ? JSON.parse(formDataStr) : null;
    return { action, returnPath, formData };
  };

  const clearPendingAction = () => {
    sessionStorage.removeItem('pendingAction');
    sessionStorage.removeItem('returnPath');
    sessionStorage.removeItem('pendingFormData');
  };

  return { requireAuth, isAuthenticated, getPendingAction, clearPendingAction };
};
