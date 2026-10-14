"use client";

import { useState, useEffect, useRef } from "react";
import { AuthCaptcha, requireAuthCaptcha, type AuthCaptchaHandle } from '@/components/AuthCaptcha';
import { useNavigate } from "@/lib/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield } from "lucide-react";

const AdminLogin = () => {
  const captcha = useRef<AuthCaptchaHandle>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check if already logged in as admin
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: isAdmin } = await supabase.rpc('is_admin');
        if (isAdmin) {
          navigate('/admin/dashboard');
        }
      }
    };
    checkAuth();
  }, [navigate]);

  // Block team member emails
  const isTeamMemberEmail = (email: string) => {
    return email.toLowerCase().endsWith('@intorza.com');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Block team member emails from admin login
    if (isTeamMemberEmail(email)) {
      toast.error("Team member accounts cannot access admin portal");
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken: requireAuthCaptcha(captcha) },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Check if user is admin
        const { data: isAdmin, error: roleError } = await supabase
          .rpc('is_admin');

        if (roleError) {
          console.error('Role check error:', roleError);
          throw new Error('Failed to verify admin access');
        }

        if (!isAdmin) {
          await supabase.auth.signOut();
          toast.error("Access denied. Admin privileges required.");
          return;
        }

        toast.success("Welcome back, Admin!");
        navigate("/admin/dashboard");
      }
    } catch (error: any) {
      if (error.message?.includes("Invalid login credentials")) {
        toast.error("Invalid email or password");
      } else {
        toast.error(error.message || "Login failed");
      }
    } finally {
      captcha.current?.reset();
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Admin Portal</CardTitle>
          <CardDescription>
            Sign in to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <AuthCaptcha ref={captcha} />
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@intorza.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
