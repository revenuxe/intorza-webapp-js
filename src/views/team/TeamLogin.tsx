"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "@/lib/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import intorzaLogo from "@/assets/intorza-logo.webp";

const TeamLogin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    // Check if already logged in as team member
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: teamMember } = await supabase
            .from('team_members')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (teamMember) {
            navigate('/team/dashboard', { replace: true });
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
      }
    };
    checkAuth();
  }, [navigate]);

  // No longer restricting to @intorza.com - any email can be a team member

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);

    try {
      // Login with credentials provided by employer
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      // Check if user is a team member
      const { data: teamMember, error: teamError } = await supabase
        .from('team_members')
        .select('id, name')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (teamError || !teamMember) {
        // Check if there's a pending request
        const { data: pendingRequest } = await supabase
          .from('team_member_requests')
          .select('status')
          .eq('user_id', data.user.id)
          .maybeSingle();
        
        await supabase.auth.signOut();
        
        if (pendingRequest?.status === 'pending') {
          toast.error("Your request is still pending approval. Please wait for the organization to approve.");
        } else if (pendingRequest?.status === 'rejected') {
          toast.error("Your request was rejected. Contact the organization for details.");
        } else if (pendingRequest?.status === 'docs_requested') {
          toast.error("Additional documentation requested. Contact the organization for details.");
        } else {
          toast.error("No team membership found. Sign up first to request access.");
        }
        setLoading(false);
        return;
      }

      toast.success(`Welcome back, ${teamMember.name}!`);
      navigate('/team/dashboard');
    } catch (error: any) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error("Invalid email or password. Please check your credentials.");
      } else {
        toast.error(error.message || "Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <img src={intorzaLogo.src} alt="INTORZA" className="h-12 mx-auto" />
            </div>
            <CardTitle>Team Member Login</CardTitle>
            <CardDescription>
              Sign in with credentials provided by your employer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your.email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <p className="mt-6 text-sm text-muted-foreground text-center">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/team/signup')}
                className="text-primary font-medium hover:underline"
              >
                Sign up here
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamLogin;
