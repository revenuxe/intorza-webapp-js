import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  name: string;
}

export default function SiteMeasurementNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clientName, setClientName] = useState("");
  const [siteLocation, setSiteLocation] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
  }, [user]);

  const fetchTeamMembers = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('team_members')
      .select('id, name')
      .eq('company_id', user.id)
      .eq('status', 'active')
      .order('name');
    
    if (data) {
      setTeamMembers(data);
    }
  };

  const handleCreate = async () => {
    if (!clientName.trim()) {
      toast.error("Please enter a client/project name");
      return;
    }

    if (!user) {
      toast.error("Please login to continue");
      return;
    }

    setLoading(true);

    // Handle "unassigned" value - convert to null
    const assignedToValue = assignedTo && assignedTo !== "unassigned" ? assignedTo : null;

    const { data, error } = await supabase
      .from('site_measurement_projects')
      .insert({
        user_id: user.id,
        client_name: clientName.trim(),
        site_location: siteLocation.trim() || null,
        assigned_to: assignedToValue,
        status: 'draft'
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast.error("Failed to create project");
      console.error(error);
      return;
    }

    toast.success("Project created successfully");
    navigate(`/site-measurement/${data.id}`);
  };

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <Button 
        variant="ghost" 
        className="mb-4 -ml-2"
        onClick={() => navigate('/site-measurement')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>New Site Measurement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Client Name / Project Name *</Label>
            <Input
              id="clientName"
              placeholder="Enter client or project name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="siteLocation">Site Location (Optional)</Label>
            <Input
              id="siteLocation"
              placeholder="Enter site address or location"
              value={siteLocation}
              onChange={(e) => setSiteLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignedTo">Assign To Member</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => navigate('/site-measurement')}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1"
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
