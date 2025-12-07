import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (teamMember) {
          navigate('/team/dashboard');
        }
      }
    };
    checkAuth();
  }, [navigate]);

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
        .single();

      if (teamError || !teamMember) {
        await supabase.auth.signOut();
        toast.error("This account is not linked to a team member profile");
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
              <img src={intorzaLogo} alt="INTORZA" className="h-12 mx-auto" />
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
                  placeholder="yourcompany.yourname@intorza.com"
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

            <p className="mt-6 text-xs text-muted-foreground text-center">
              Don't have login credentials? Contact your employer to get your account details.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamLogin;
