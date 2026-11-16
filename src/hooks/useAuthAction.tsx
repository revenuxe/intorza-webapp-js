import { useNavigate, useLocation } from "@/lib/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useAuthAction = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const requireAuth = async (action: () => Promise<void>, actionName?: string, formData?: unknown) => {
    let result: Awaited<ReturnType<typeof supabase.auth.getUser>>;
    try { result = await supabase.auth.getUser(); }
    catch {
      toast({ title: 'Sign-in check unavailable', description: 'Check your connection and retry. Your editor has been kept.', variant: 'destructive' });
      return;
    }
    const { data: { user }, error } = result;
    if (error && (error.status === 0 || (error.status ?? 0) >= 500 || error.name === 'AuthRetryableFetchError')) {
      toast({ title: 'Sign-in check unavailable', description: 'Check your connection and retry. Your editor has been kept.', variant: 'destructive' });
      return;
    }
    
    if (!user) {
      // Store the current path and action to continue after login
      try {
        sessionStorage.setItem('pendingAction', actionName || 'default');
        sessionStorage.setItem('returnPath', location.pathname + location.search);
        // Store form data before navigating away from the editor.
        if (formData) sessionStorage.setItem('pendingFormData', JSON.stringify(formData));
      } catch {
        toast({ title: 'Browser storage unavailable', description: 'Enable browser storage before continuing so your quotation can be kept during sign-in.', variant: 'destructive' });
        return;
      }
      
      toast({
        title: "Login required",
        description: "Please login to continue",
      });
      navigate("/auth");
      return;
    }
    
    if (!error) await action();
  };

  const isAuthenticated = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      return !error && !!user;
    } catch { return false; }
  };

  const getPendingAction = <T,>(parse?: (value: unknown) => T | null) => {
    try {
      const action = sessionStorage.getItem('pendingAction');
      const returnPath = sessionStorage.getItem('returnPath');
      const formDataStr = sessionStorage.getItem('pendingFormData');
      let formData: T | null = null;
      try {
        const parsed: unknown = formDataStr ? JSON.parse(formDataStr) : null;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) formData = parse ? parse(parsed) : parsed as T;
        if (formDataStr && formData === null) sessionStorage.removeItem('pendingFormData');
      }
      catch { sessionStorage.removeItem('pendingFormData'); }
      return { action, returnPath, formData };
    } catch { return { action: null, returnPath: null, formData: null }; }
  };

  const clearPendingAction = () => {
    try {
      sessionStorage.removeItem('pendingAction');
      sessionStorage.removeItem('returnPath');
      sessionStorage.removeItem('pendingFormData');
    } catch { /* Storage can be disabled after a page has loaded. */ }
  };

  return { requireAuth, isAuthenticated, getPendingAction, clearPendingAction };
};
