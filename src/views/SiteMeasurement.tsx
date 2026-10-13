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
import { Plus, MapPin, Calendar, Eye, Pencil, Ruler, Trash2 } from "lucide-react";
import { format } from "date-fns";
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

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchTeamMemberId();
    }
  }, [user]);

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
    
    const { data, error } = await supabase
      .from('site_measurement_projects')
      .select(`
        *,
        team_member:team_members(id, name, user_id)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProjects(data.map(p => ({
        ...p,
        team_member: p.team_member as SiteMeasurementProject['team_member']
      })));
    }
    setLoading(false);
  };

  const filteredProjects = projects.filter(p => {
    if (activeTab === "assigned") {
      return p.team_member?.user_id === user?.id || p.assigned_to === teamMemberId;
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
    setProjects(projects.filter(p => p.id !== projectId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Site Measurement</h1>
          <p className="text-muted-foreground">Capture and manage site measurements</p>
        </div>
        <Button onClick={() => navigate('/site-measurement/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Measurement</span>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Projects</TabsTrigger>
          <TabsTrigger value="assigned">Assigned to Me</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredProjects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Ruler className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No measurements yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {activeTab === "assigned" 
                    ? "No projects assigned to you yet."
                    : "Start by creating your first site measurement project."
                  }
                </p>
                {activeTab === "all" && (
                  <Button onClick={() => navigate('/site-measurement/new')} className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Measurement
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredProjects.map((project) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg truncate">{project.client_name}</h3>
                          <Badge className={getStatusColor(project.status)}>
                            {project.status}
                          </Badge>
                        </div>
                        
                        {project.site_location && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate">{project.site_location}</span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          {project.team_member ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {getInitials(project.team_member.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{project.team_member.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/70">Unassigned</span>
                          )}
                          
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{format(new Date(project.created_at), 'MMM d, yyyy')}</span>
                          </div>
                          
                          <span>{project.room_count} rooms</span>
                          <span>{project.total_area?.toFixed(0) || 0} sq.ft</span>
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/site-measurement/${project.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Project</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{project.client_name}"? This will also delete all rooms and photos. This action cannot be undone.
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

      {/* Mobile FAB */}
      <Button
        onClick={() => navigate('/site-measurement/new')}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg md:hidden"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
