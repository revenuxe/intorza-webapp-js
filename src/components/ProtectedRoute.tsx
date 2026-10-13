import { Fragment, useEffect } from "react";
import { useNavigate, useLocation } from "@/lib/navigation";
import { useAuth } from "@/hooks/useAuth";
import { GlobalLoader } from "@/components/GlobalLoader";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      sessionStorage.setItem('returnPath', location.pathname + location.search);
      navigate("/auth", { replace: true });
    }
  }, [isAuthenticated, loading, navigate, location.pathname, location.search]);

  if (loading) {
    return <GlobalLoader message="Loading..." fullScreen={false} />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <Fragment key={user.id}>{children}</Fragment>;
};
