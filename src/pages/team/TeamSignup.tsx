import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Search, Building2, CheckCircle2 } from "lucide-react";
import intorzaLogo from "@/assets/intorza-logo.webp";

interface Company {
  id: string;
  company_name: string;
}

const workTypes = [
  { value: 'carpenter', label: 'Carpenter' },
  { value: 'labour', label: 'Labour' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'painter', label: 'Painter' },
  { value: 'mason', label: 'Mason' },
  { value: 'welder', label: 'Welder' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'other', label: 'Other' },
];

const TeamSignup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'org' | 'details' | 'success'>('org');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    work_type: 'other',
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, company_name')
      .not('company_name', 'is', null)
      .neq('company_name', '');
    
    if (!error && data) {
      setCompanies(data.map(d => ({ id: d.id, company_name: d.company_name || '' })));
    }
  };

  const filteredCompanies = companies.filter(c =>
    c.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectOrg = (company: Company) => {
    setSelectedCompany(company);
    setStep('details');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCompany) {
      toast.error("Please select an organization");
      return;
    }

    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Please fill all required fields");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      // Create auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
            is_team_member: true,
          },
          emailRedirectTo: window.location.origin + '/team/login',
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        toast.error("Failed to create account");
        setLoading(false);
        return;
      }

      // Create a join request
      const { error: requestError } = await supabase
        .from('team_member_requests')
        .insert({
          email: formData.email,
          name: formData.name,
          phone: formData.phone || null,
          work_type: formData.work_type,
          company_id: selectedCompany.id,
          user_id: authData.user.id,
          status: 'pending',
        });

      if (requestError) throw requestError;

      setStep('success');
      toast.success("Request sent successfully!");
    } catch (error: any) {
      if (error.message?.includes('already registered')) {
        toast.error("This email is already registered. Try logging in instead.");
      } else {
        toast.error(error.message || "Registration failed");
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
          onClick={() => {
            if (step === 'details') setStep('org');
            else navigate('/team/login');
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {step === 'details' ? 'Change Organization' : 'Back to Login'}
        </Button>

        {step === 'org' && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <img src={intorzaLogo} alt="INTORZA" className="h-10 mx-auto" />
              </div>
              <CardTitle className="text-xl">Join an Organization</CardTitle>
              <CardDescription>
                Search and select the company you want to join
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search organization..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="max-h-72 overflow-y-auto space-y-2">
                {filteredCompanies.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {searchQuery ? 'No organizations found' : 'No organizations available'}
                  </p>
                ) : (
                  filteredCompanies.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => handleSelectOrg(company)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border hover:bg-accent/50 transition-colors text-left"
                    >
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{company.company_name}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'details' && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2">
                <img src={intorzaLogo} alt="INTORZA" className="h-10 mx-auto" />
              </div>
              <CardTitle className="text-xl">Create Your Account</CardTitle>
              <CardDescription>
                Joining <span className="font-semibold text-foreground">{selectedCompany?.company_name}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Full Name *</Label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your.email@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone number (optional)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Role / Work Type *</Label>
                  <Select value={formData.work_type} onValueChange={(v) => setFormData({ ...formData, work_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {workTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Password *</Label>
                  <Input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min 8 characters"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm Password *</Label>
                  <Input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Confirm your password"
                  />
                </div>
                <Button type="submit" className="w-full mt-2" disabled={loading}>
                  {loading ? "Creating Account..." : "Create Account & Request to Join"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'success' && (
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <h2 className="text-xl font-bold">Request Sent!</h2>
                <p className="text-muted-foreground mt-2">
                  Your request to join <span className="font-semibold text-foreground">{selectedCompany?.company_name}</span> has been submitted.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  The organization owner will review your request. You'll be able to login once approved.
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate('/team/login')} className="mt-4">
                Go to Login
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TeamSignup;
