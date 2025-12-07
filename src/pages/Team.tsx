import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Users, Clock, MapPin, Phone, Mail, Trash2, Edit, FolderPlus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useFeedback } from "@/components/FeedbackProvider";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  work_type: string;
  status: string;
  daily_rate: number | null;
  created_at: string;
  user_id: string | null;
}

interface TodayAttendance {
  team_member_id: string;
  clock_in: string;
  clock_out: string | null;
  clock_in_location: any;
}

interface Quotation {
  id: string;
  project_name: string;
  client_name: string;
  status: string;
}

interface ProjectAssignment {
  id: string;
  quotation_id: string;
  quotation: Quotation;
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

const Team = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { trackAction } = useFeedback();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState("");
  const [memberAssignments, setMemberAssignments] = useState<Record<string, ProjectAssignment[]>>({});
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [companyName, setCompanyName] = useState("");
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    work_type: 'other',
    daily_rate: '',
  });

  useEffect(() => {
    if (user) {
      fetchTeamMembers();
      fetchTodayAttendance();
      fetchCompanyName();
      fetchQuotations();
    }
  }, [user]);

  const fetchCompanyName = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('company_name')
      .eq('id', user.id)
      .single();
    if (data?.company_name) {
      setCompanyName(data.company_name);
    }
  };

  const fetchQuotations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('quotations')
      .select('id, project_name, client_name, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    setQuotations(data || []);
  };

  const fetchTeamMembers = async () => {
    if (!user) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('company_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Error fetching team members");
      console.error(error);
    } else {
      setTeamMembers(data || []);
      // Fetch assignments for each member
      if (data) {
        for (const member of data) {
          fetchMemberAssignments(member.id);
        }
      }
    }
    setLoading(false);
  };

  const fetchMemberAssignments = async (memberId: string) => {
    const { data } = await supabase
      .from('team_project_assignments')
      .select('id, quotation_id, quotations:quotation_id(id, project_name, client_name, status)')
      .eq('team_member_id', memberId);

    if (data) {
      const assignments = data.map((a: any) => ({
        id: a.id,
        quotation_id: a.quotation_id,
        quotation: a.quotations,
      }));
      setMemberAssignments(prev => ({ ...prev, [memberId]: assignments }));
    }
  };

  const fetchTodayAttendance = async () => {
    if (!user) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data, error } = await supabase
      .from('attendance')
      .select('team_member_id, clock_in, clock_out, clock_in_location')
      .gte('clock_in', today.toISOString());

    if (!error && data) {
      setTodayAttendance(data as TodayAttendance[]);
    }
  };

  const generateEmail = (name: string) => {
    const cleanCompany = (companyName || 'company').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${cleanCompany}.${cleanName}@intorza.com`;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please login first");
      return;
    }

    if (!formData.name) {
      toast.error("Name is required");
      return;
    }

    const generatedEmail = generateEmail(formData.name);

    try {
      if (editingMember) {
        const { error } = await supabase
          .from('team_members')
          .update({
            name: formData.name,
            email: generatedEmail,
            phone: formData.phone || null,
            work_type: formData.work_type as any,
            daily_rate: formData.daily_rate ? parseFloat(formData.daily_rate) : null,
          })
          .eq('id', editingMember.id);

        if (error) throw error;
        toast.success("Team member updated");
      } else {
        const { error } = await supabase
          .from('team_members')
          .insert({
            company_id: user.id,
            name: formData.name,
            email: generatedEmail,
            phone: formData.phone || null,
            work_type: formData.work_type as any,
            daily_rate: formData.daily_rate ? parseFloat(formData.daily_rate) : null,
          });

        if (error) throw error;
        toast.success("Team member added");
        trackAction('team_member_added');
      }

      setDialogOpen(false);
      setEditingMember(null);
      setFormData({ name: '', phone: '', work_type: 'other', daily_rate: '' });
      fetchTeamMembers();
    } catch (error: any) {
      toast.error(error.message || "Error saving team member");
    }
  };

  const handleAssignProject = async () => {
    if (!selectedMember || !selectedQuotation) {
      toast.error("Please select a project");
      return;
    }

    try {
      const { error } = await supabase
        .from('team_project_assignments')
        .insert({
          team_member_id: selectedMember.id,
          quotation_id: selectedQuotation,
        });

      if (error) throw error;
      
      toast.success("Project assigned successfully");
      setAssignDialogOpen(false);
      setSelectedQuotation("");
      fetchMemberAssignments(selectedMember.id);
    } catch (error: any) {
      toast.error(error.message || "Error assigning project");
    }
  };

  const handleRemoveAssignment = async (assignmentId: string, memberId: string) => {
    const { error } = await supabase
      .from('team_project_assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      toast.error("Error removing assignment");
    } else {
      toast.success("Assignment removed");
      fetchMemberAssignments(memberId);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Error deleting team member");
    } else {
      toast.success("Team member deleted");
      fetchTeamMembers();
    }
  };

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      phone: member.phone || '',
      work_type: member.work_type,
      daily_rate: member.daily_rate?.toString() || '',
    });
    setDialogOpen(true);
  };

  const getMemberAttendance = (memberId: string) => {
    return todayAttendance.find(a => a.team_member_id === memberId);
  };

  const getWorkTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      carpenter: 'bg-amber-100 text-amber-800',
      labour: 'bg-gray-100 text-gray-800',
      plumber: 'bg-blue-100 text-blue-800',
      electrician: 'bg-yellow-100 text-yellow-800',
      painter: 'bg-purple-100 text-purple-800',
      mason: 'bg-orange-100 text-orange-800',
      welder: 'bg-red-100 text-red-800',
      supervisor: 'bg-green-100 text-green-800',
      other: 'bg-muted text-muted-foreground',
    };
    return colors[type] || colors.other;
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Users className="h-16 w-16 text-muted-foreground" />
        <p className="text-muted-foreground">Please login to manage your team</p>
        <Button onClick={() => navigate('/auth')}>Login</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">Manage your team members and track attendance</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingMember(null);
            setFormData({ name: '', phone: '', work_type: 'other', daily_rate: '' });
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingMember ? 'Edit' : 'Add'} Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Full name"
                />
                {formData.name && companyName && (
                  <p className="text-xs text-muted-foreground">
                    Email: <span className="font-medium">{generateEmail(formData.name)}</span>
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <Label>Work Type</Label>
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
              <div className="space-y-2">
                <Label>Daily Rate (₹)</Label>
                <Input
                  type="number"
                  value={formData.daily_rate}
                  onChange={(e) => setFormData({ ...formData, daily_rate: e.target.value })}
                  placeholder="500"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit}>{editingMember ? 'Update' : 'Add'} Member</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold tabular-nums">{teamMembers.length}</p>
                <p className="text-xs text-muted-foreground">Total Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold tabular-nums">{todayAttendance.filter(a => a.clock_in && !a.clock_out).length}</p>
                <p className="text-xs text-muted-foreground">Clocked In</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold tabular-nums">{todayAttendance.length}</p>
                <p className="text-xs text-muted-foreground">Attended Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-2xl font-bold tabular-nums">{teamMembers.filter(m => m.status === 'active').length}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Project to {selectedMember?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Project</Label>
              <Select value={selectedQuotation} onValueChange={setSelectedQuotation}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
                <SelectContent>
                  {quotations.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.project_name} - {q.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignProject}>Assign Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Members List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Team Members</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6 h-24 bg-muted/50" />
              </Card>
            ))}
          </div>
        ) : teamMembers.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No team members yet</p>
              <p className="text-sm text-muted-foreground">Add your first team member to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {teamMembers.map((member) => {
              const attendance = getMemberAttendance(member.id);
              const isClockedIn = attendance && !attendance.clock_out;
              const assignments = memberAssignments[member.id] || [];
              
              return (
                <Card key={member.id} className="overflow-hidden">
                  <CardContent className="pt-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-semibold">{member.name}</h3>
                            <Badge className={getWorkTypeBadgeColor(member.work_type)}>
                              {workTypes.find(t => t.value === member.work_type)?.label || member.work_type}
                            </Badge>
                            {isClockedIn && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <Clock className="h-3 w-3 mr-1" />
                                Working
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              {member.email}
                            </span>
                            {member.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-4 w-4" />
                                {member.phone}
                              </span>
                            )}
                            {member.daily_rate && (
                              <span className="flex items-center gap-1">
                                ₹{member.daily_rate}/day
                              </span>
                            )}
                          </div>
                          {attendance && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>In: {new Date(attendance.clock_in).toLocaleTimeString()}</span>
                              {attendance.clock_out && (
                                <span>Out: {new Date(attendance.clock_out).toLocaleTimeString()}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedMember(member);
                              setAssignDialogOpen(true);
                            }}
                          >
                            <FolderPlus className="h-4 w-4 mr-1" />
                            Assign
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(member)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Team Member</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {member.name}? This will also delete their attendance records.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(member.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      
                      {/* Assigned Projects */}
                      {assignments.length > 0 && (
                        <div className="border-t pt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Assigned Projects</p>
                          <div className="flex flex-wrap gap-2">
                            {assignments.map((assignment) => (
                              <Badge 
                                key={assignment.id} 
                                variant="secondary" 
                                className="flex items-center gap-1"
                              >
                                {assignment.quotation?.project_name}
                                <button
                                  onClick={() => handleRemoveAssignment(assignment.id, member.id)}
                                  className="ml-1 hover:text-destructive"
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Team;
