import { Fragment, useEffect } from "react";
import { useNavigate, useLocation } from "@/lib/navigation";
import { useAuth } from "@/hooks/useAuth";
import { GlobalLoader } from "@/components/GlobalLoader";

interface ProtectedRouteProps {
  children: React.ReactNode;
  loginPath?: string;
}

export const ProtectedRoute = ({ children, loginPath = '/auth' }: ProtectedRouteProps) => {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      try { sessionStorage.setItem('returnPath', location.pathname + location.search); }
      catch { /* Signing in must still work when browser storage is blocked. */ }
      navigate(loginPath, { replace: true });
    }
  }, [isAuthenticated, loading, navigate, location.pathname, location.search, loginPath]);

  if (loading) {
    return <GlobalLoader message="Loading..." fullScreen={false} />;
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return <Fragment key={user.id}>{children}</Fragment>;
};
