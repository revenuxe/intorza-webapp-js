"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, MapPin, Calendar, Eye, Ruler, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { visitStage } from '@/lib/siteMeasurements';
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SiteMeasurementProject {
  id: string;
  client_name: string;
  site_location: string | null;
  assigned_to: string | null;
  status: string;
  total_area: number;
  room_count: number;
  photo_count: number;
  created_at: string;
  team_member?: {
    id: string;
    name: string;
    user_id: string | null;
  } | null;
}

export default function SiteMeasurement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<SiteMeasurementProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [teamMemberId, setTeamMemberId] = useState<string | null>(null);
  const [loadError,setLoadError]=useState(false);

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchTeamMemberId();
    }
  }, [user?.id]);

  const fetchTeamMemberId = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('team_members')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setTeamMemberId(data.id);
    }
  };

  const fetchProjects = async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(false);
    try {
    
    const { data, error } = await supabase
      .from('site_measurement_projects')
      .select(`
        *,
        team_member:team_members(id, name, user_id)
      `)
      .order('created_at', { ascending: false });

    if(error)throw error;
    if (data) {
      setProjects(data.map(p => ({
        ...p,
        team_member: p.team_member as SiteMeasurementProject['team_member']
      })));
    }
    }catch{setLoadError(true);}
    finally{setLoading(false);}
  };

  const filteredProjects = projects.filter(p => {
    if (activeTab === "assigned") {
      return Boolean(user?.id && p.team_member?.user_id === user.id) || Boolean(teamMemberId && p.assigned_to === teamMemberId);
    }
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'converted': return 'bg-green-100 text-green-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      default: return 'bg-amber-100 text-amber-700';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleDelete = async (projectId: string) => {
    const { error } = await supabase
      .from('site_measurement_projects')
      .delete()
      .eq('id', projectId);
    
    if (error) {
      toast.error("Failed to delete project");
      return;
    }
    
    toast.success("Project deleted successfully");
    setProjects(current=>current.filter(p => p.id !== projectId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-5 p-4 md:space-y-6 md:p-6">
      {/* Header */}
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Site Measurement</h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground sm:text-base">Record a site visit, room by room. Add pricing when you're ready.</p>
        </div>
        <Button onClick={() => navigate('/site-measurement/new')} className="h-12 w-full shrink-0 gap-2 rounded-xl sm:w-auto">
          <Plus className="h-4 w-4" />
          Start site visit
        </Button>
      </div>
      <details className="rounded-xl border bg-card p-4 text-sm">
        <summary className="min-h-6 cursor-pointer font-medium">How does a site visit work?</summary>
        <ol className="mt-3 space-y-3 text-muted-foreground">
          <li><strong className="text-foreground">1. Name the site.</strong> Add the client, address and optional team assignment.</li>
          <li><strong className="text-foreground">2. Walk through the rooms.</strong> Save each room's width and length, then add notes or photos.</li>
          <li><strong className="text-foreground">3. Finish or quote later.</strong> Keep the visit as a measurement record, or create a quotation from it.</li>
        </ol>
      </details>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl p-1 sm:max-w-sm">
          <TabsTrigger value="all" className="min-h-11 min-w-0 rounded-lg px-2 text-xs sm:text-sm">All visits</TabsTrigger>
          <TabsTrigger value="assigned" className="min-h-11 min-w-0 rounded-lg px-2 text-xs sm:text-sm">Assigned to Me</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 min-w-0">
          {loadError?<Card><CardContent className="space-y-3 p-4"><p role="alert" className="text-sm">Your site visits couldn't be loaded. Check your connection and retry.</p><Button variant="outline" className="h-11" onClick={()=>void fetchProjects()}>Retry loading visits</Button></CardContent></Card>:filteredProjects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Ruler className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No site visits yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {activeTab === "assigned" 
                    ? "No site visits assigned to you yet."
                    : "Start with a client or project name. You'll add rooms on the next screen."
                  }
                </p>
                {activeTab === "all" && (
                  <Button onClick={() => navigate('/site-measurement/new')} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Start site visit
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid min-w-0 grid-cols-1 gap-4">
              {filteredProjects.map((project) => (
                <Card key={project.id} className="min-w-0 rounded-2xl transition-shadow hover:shadow-md">
                  <CardContent className="min-w-0 p-4 sm:p-5">
                    <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="mb-2 flex min-w-0 flex-wrap items-start gap-2">
                          <h3 className="min-w-0 flex-1 break-words text-base font-semibold leading-6 sm:text-lg">{project.client_name}</h3>
                          <Badge className={`shrink-0 ${getStatusColor(project.status)}`}>
                            {visitStage(project.status)}
                          </Badge>
                        </div>
                        
                        {project.site_location && (
                          <div className="mb-3 flex min-w-0 items-start gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span className="min-w-0 break-words">{project.site_location}</span>
                          </div>
                        )}

                        <div className="space-y-3 text-sm text-muted-foreground">
                          {project.team_member ? (
                            <div className="flex min-w-0 items-center gap-2">
                              <Avatar className="h-6 w-6 shrink-0">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {getInitials(project.team_member.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="min-w-0 break-words">{project.team_member.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/70">Unassigned</span>
                          )}
                          
                          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>{format(new Date(project.created_at), 'MMM d, yyyy')}</span>
                          </div>
                          
                          <span>{project.room_count} rooms</span>
                          <span className="min-w-0 break-words">{project.total_area?.toFixed(0) || 0} sq.ft</span>
                          </div>
                        </div>
                        <p className="mt-3 text-xs leading-5 text-muted-foreground">{!project.room_count?'Next: add your first room.':project.status==='converted'?'Quotation created. Your site record is kept here.':project.status==='completed'?'Visit complete. Create a quotation whenever you need it.':'Continue measuring, then finish your visit.'}</p>
                      </div>

                      <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_2.75rem] gap-2 border-t pt-3 sm:w-auto sm:shrink-0 sm:border-0 sm:pt-0">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-11 min-w-0 rounded-xl px-4"
                          onClick={() => navigate(`/site-measurement/${project.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Open visit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-11 w-11 rounded-xl p-0 text-destructive hover:text-destructive"
                              aria-label={`Delete ${project.client_name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="min-w-0 break-words">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete site visit?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Delete "{project.client_name}" and its rooms and attached photos? Your saved quotations are kept. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(project.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

    </div>
  );
}
