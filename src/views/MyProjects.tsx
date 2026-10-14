"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLocalization } from "@/hooks/useLocalization";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, FileText, Receipt, Eye, FolderOpen, Trash2 } from "lucide-react";
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

interface Project {
  id: string;
  project_name: string;
  client_name: string;
  client_address: string | null;
  status: string;
  grand_total: number;
  created_at: string;
  quotation_count: number;
  invoice_count: number;
  approved_quotations: number;
  draft_quotations: number;
  site_measurement_id?: string;
  assigned_members: string[];
}

export default function MyProjects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatCurrency } = useLocalization();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch quotations grouped by project
    const { data: quotations } = await supabase
      .from('quotations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Fetch invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user.id);

    // Fetch site measurements
    const { data: siteMeasurements } = await supabase
      .from('site_measurement_projects')
      .select(`
        *,
        team_member:team_members(name)
      `)
      .eq('user_id', user.id);

    // Group by project name
    const projectMap = new Map<string, Project>();

    quotations?.forEach(q => {
      const key = q.project_name;
      const existing = projectMap.get(key);
      
      if (existing) {
        existing.quotation_count++;
        if (q.status === 'accepted') existing.approved_quotations++;
        if (q.status === 'draft') existing.draft_quotations++;
        if ((q.grand_total || 0) > existing.grand_total) {
          existing.grand_total = q.grand_total || 0;
        }
      } else {
        const relatedInvoices = invoices?.filter(i => i.quotation_id === q.id) || [];
        const siteMeasurement = siteMeasurements?.find(s => s.quotation_id === q.id);
        
        projectMap.set(key, {
          id: q.id,
          project_name: q.project_name,
          client_name: q.client_name,
          client_address: q.client_address,
          status: q.status || 'draft',
          grand_total: q.grand_total || 0,
          created_at: q.created_at || '',
          quotation_count: 1,
          invoice_count: relatedInvoices.length,
          approved_quotations: q.status === 'accepted' ? 1 : 0,
          draft_quotations: q.status === 'draft' ? 1 : 0,
          site_measurement_id: siteMeasurement?.id,
          assigned_members: siteMeasurement?.team_member ? [siteMeasurement.team_member.name] : []
        });
      }
    });

    setProjects(Array.from(projectMap.values()));
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // formatCurrency is now provided by useLocalization hook

  const handleDeleteProject = async (projectId: string) => {
    // Delete the quotation (cascades to sections and items)
    const { error } = await supabase
      .from('quotations')
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
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Projects</h1>
        <p className="text-muted-foreground">All projects with quotations</p>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Projects will appear here once you create quotations.
            </p>
            <Button onClick={() => navigate('/')}>Create Quotation</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-lg">{project.project_name}</h3>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">{project.client_name}</p>
                    
                    {project.client_address && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="truncate">{project.client_address}</span>
                      </div>
                    )}

                    {/* Assigned Members */}
                    {project.assigned_members.length > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex -space-x-2">
                          {project.assigned_members.map((name, i) => (
                            <Avatar key={i} className="h-6 w-6 border-2 border-background">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {getInitials(name)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {project.assigned_members.join(', ')}
                        </span>
                      </div>
                    )}

                    {/* Summary */}
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span>
                          {project.quotation_count} Quotation{project.quotation_count !== 1 ? 's' : ''}
                          {project.approved_quotations > 0 && (
                            <span className="text-green-600 ml-1">
                              ({project.approved_quotations} approved)
                            </span>
                          )}
                          {project.draft_quotations > 0 && (
                            <span className="text-muted-foreground ml-1">
                              ({project.draft_quotations} draft)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Receipt className="h-4 w-4 text-green-500" />
                        <span>{project.invoice_count} Invoice{project.invoice_count !== 1 ? 's' : ''}</span>
                      </div>
                      <span className="font-medium tabular-nums">
                        {formatCurrency(project.grand_total)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => navigate(`/my-projects/${project.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Project</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{project.project_name}"? This will delete the quotation and all related data. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteProject(project.id)}
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
    </div>
  );
}
