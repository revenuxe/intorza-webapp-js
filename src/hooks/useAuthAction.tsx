import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useAuthAction = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const requireAuth = async (action: () => Promise<void>) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
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

  return { requireAuth, isAuthenticated };
};
