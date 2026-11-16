"use client";

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@/lib/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MeasurementJourney } from '@/components/site-measurement/MeasurementJourney';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { useInlineFeedback } from '@/hooks/useInlineFeedback';

interface TeamMember {
  id: string;
  name: string;
}

export default function SiteMeasurementNew() {
  const {toast:notify,feedback}=useInlineFeedback({autoRevealErrors:true});
  const toast={error:(description:string)=>notify({title:'Could not start the visit',description,variant:'destructive'})};
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clientName, setClientName] = useState("");
  const [siteLocation, setSiteLocation] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);
  const creationId = useRef<string | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);

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
    if(inFlight.current) return;
    if (!clientName.trim()) {
      toast.error("Please enter a client/project name");
      nameInput.current?.focus();
      return;
    }

    if (!user) {
      toast.error("Please login to continue");
      return;
    }

    setLoading(true);
    inFlight.current=true;
    creationId.current ||= crypto.randomUUID();
    try {

    // Handle "unassigned" value - convert to null
    const assignedToValue = assignedTo && assignedTo !== "unassigned" ? assignedTo : null;

    const { data, error } = await supabase
      .from('site_measurement_projects')
      .insert({
        id:creationId.current,
        user_id: user.id,
        client_name: clientName.trim(),
        site_location: siteLocation.trim() || null,
        assigned_to: assignedToValue,
        status: 'draft'
      })
      .select()
      .single();

    if (error) {
      if(error.code==='23505') {
        const existing=await supabase.from('site_measurement_projects').select('id').eq('id',creationId.current).eq('user_id',user.id).maybeSingle();
        if(existing.data){navigate(`/site-measurement/${existing.data.id}`);return;}
      }
      throw error;
    }

    navigate(`/site-measurement/${data.id}`);
    } catch {toast.error('Could not start the site visit. Your details are still here; retry when connected.');}
    finally {inFlight.current=false;setLoading(false);}
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-lg p-4 md:p-6">
      {feedback}
      <Button 
        variant="ghost" 
        className="mb-4 -ml-2"
        onClick={() => navigate('/site-measurement')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="mb-5"><MeasurementJourney step={1}/></div>
      <form onSubmit={event=>{event.preventDefault();void handleCreate();}}>
      <Card>
        <CardHeader>
          <CardTitle className="break-words text-xl sm:text-2xl">Start a site visit</CardTitle>
          <CardDescription className="leading-6">First, name the site. Next, measure each room and add photos. You can create a quotation later.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Client or project name <span className="text-destructive">*</span></Label>
            <Input
              id="clientName"
              ref={nameInput}
              placeholder="e.g. Rahul's apartment"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="siteLocation">Site address <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input
              id="siteLocation"
              placeholder="Enter site address or location"
              value={siteLocation}
              disabled={loading}
              onChange={(e) => setSiteLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignedTo">Who will measure this site?</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo} disabled={loading}>
              <SelectTrigger id="assignedTo">
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
            <p className="text-xs leading-5 text-muted-foreground">Leave unassigned if you're measuring it yourself, or choose a team member.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 [&>button]:h-12 [&>button]:min-w-0 [&>button]:whitespace-normal [&>button]:rounded-xl [&>button]:px-2 [&>button]:leading-5">
            <Button 
              type="button"
              variant="outline" 
              className="flex-1"
              onClick={() => navigate('/site-measurement')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="flex-1"
              disabled={loading}
            >
              {loading ? "Starting..." : "Continue to rooms"}
            </Button>
          </div>
        </CardContent>
      </Card>
      </form>
    </div>
  );
}
