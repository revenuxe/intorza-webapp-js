import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Users, Clock, MapPin, Phone, Mail, Trash2, Edit, FolderPlus, UserPlus, Briefcase, Eye, Navigation, Calendar, ChevronRight, CheckCircle, XCircle, FileQuestion, AlertCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useFeedback } from "@/components/FeedbackProvider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

interface TeamMemberRequest {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  work_type: string;
  company_id: string;
  user_id: string | null;
  status: string;
  rejection_reason: string | null;
  docs_request_note: string | null;
  created_at: string;
}

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
  clock_out_location: any;
}

interface Quotation {
  id: string;
  project_name: string;
  client_name: string;
  client_address: string | null;
  place_of_project: string | null;
  status: string;
  project_deadline: string | null;
  grand_total: number | null;
}

interface ProjectAssignment {
  id: string;
  quotation_id: string;
  team_member_id: string;
  quotation: Quotation;
}

interface ProjectTeam {
  quotation: Quotation;
  members: (TeamMember & { assignmentId: string })[];
}

interface MemberAttendance {
  id: string;
  clock_in: string;
  clock_out: string | null;
  clock_in_location: any;
  clock_out_location: any;
  team_member_id: string;
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
  { value: 'helper', label: 'Helper' },
  { value: 'driver', label: 'Driver' },
  { value: 'other', label: 'Other' },
];

const Team = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { trackAction } = useFeedback();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [projectTeams, setProjectTeams] = useState<ProjectTeam[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialogs
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [projectDetailOpen, setProjectDetailOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectTeam | null>(null);
  const [projectAttendance, setProjectAttendance] = useState<MemberAttendance[]>([]);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [companyName, setCompanyName] = useState("");
  
  // Member form
  const [memberForm, setMemberForm] = useState({
    name: '',
    phone: '',
    work_type: 'labour',
    project_id: '',
    password: '',
  });
  const [creatingAuth, setCreatingAuth] = useState(false);

  // Team form (create team = assign multiple members to project)
  const [teamForm, setTeamForm] = useState({
    project_id: '',
    selectedMembers: [] as string[],
  });

  // Approval requests
  const [memberRequests, setMemberRequests] = useState<TeamMemberRequest[]>([]);
  const [actionNote, setActionNote] = useState('');
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'reject' | 'docs_requested'>('reject');
  const [selectedRequest, setSelectedRequest] = useState<TeamMemberRequest | null>(null);

  useEffect(() => {
    if (user) {
      fetchAll();
    }
  }, [user]);

  const fetchAll = async () => {
    await Promise.all([
      fetchCompanyName(),
      fetchTeamMembers(),
      fetchTodayAttendance(),
      fetchQuotations(),
      fetchMemberRequests(),
    ]);
    setLoading(false);
  };

  const fetchMemberRequests = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('team_member_requests')
      .select('*')
      .eq('company_id', user.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setMemberRequests(data as TeamMemberRequest[]);
    }
  };

  const handleApproveRequest = async (request: TeamMemberRequest) => {
    if (!user) return;
    try {
      // Create team member from request
      const { data: newMember, error: memberError } = await supabase
        .from('team_members')
        .insert({
          company_id: user.id,
          name: request.name,
          email: request.email,
          phone: request.phone,
          work_type: request.work_type as any,
          user_id: request.user_id,
        })
        .select()
        .single();

      if (memberError) throw memberError;

      // Update request status
      const { error: updateError } = await supabase
        .from('team_member_requests')
        .update({ status: 'approved' })
        .eq('id', request.id);

      if (updateError) throw updateError;

      toast.success(`${request.name} approved and added to team!`);
      fetchMemberRequests();
      fetchTeamMembers();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve request");
    }
  };

  const handleRejectOrDocsRequest = async () => {
    if (!selectedRequest) return;
    try {
      const updateData: any = { status: actionType === 'reject' ? 'rejected' : 'docs_requested' };
      if (actionType === 'reject') {
        updateData.rejection_reason = actionNote;
      } else {
        updateData.docs_request_note = actionNote;
      }

      const { error } = await supabase
        .from('team_member_requests')
        .update(updateData)
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success(actionType === 'reject' ? 'Request rejected' : 'Documentation requested');
      setActionDialogOpen(false);
      setActionNote('');
      setSelectedRequest(null);
      fetchMemberRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to update request");
    }
  };

  const openActionDialog = (request: TeamMemberRequest, type: 'reject' | 'docs_requested') => {
    setSelectedRequest(request);
    setActionType(type);
    setActionNote('');
    setActionDialogOpen(true);
  };

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
      .select('id, project_name, client_name, client_address, place_of_project, status, project_deadline, grand_total')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    setQuotations(data || []);
  };

  const fetchTeamMembers = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('company_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setTeamMembers(data || []);
    }
  };

  const fetchProjectTeams = async () => {
    if (!user) return;
    
    const { data: assignments } = await supabase
      .from('team_project_assignments')
      .select(`
        id,
        quotation_id,
        team_member_id,
        quotations:quotation_id(id, project_name, client_name, client_address, place_of_project, status, project_deadline, grand_total)
      `);

    if (assignments) {
      // Group by project
      const teamsMap = new Map<string, ProjectTeam>();
      
      for (const assignment of assignments) {
        const quotation = assignment.quotations as unknown as Quotation;
        if (!quotation) continue;
        
        const member = teamMembers.find(m => m.id === assignment.team_member_id);
        if (!member) continue;
        
        if (!teamsMap.has(quotation.id)) {
          teamsMap.set(quotation.id, {
            quotation,
            members: [],
          });
        }
        
        teamsMap.get(quotation.id)!.members.push({
          ...member,
          assignmentId: assignment.id,
        });
      }
      
      setProjectTeams(Array.from(teamsMap.values()));
    }
  };

  useEffect(() => {
    if (teamMembers.length > 0) {
      fetchProjectTeams();
    }
  }, [teamMembers]);

  const fetchTodayAttendance = async () => {
    if (!user) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data } = await supabase
      .from('attendance')
      .select('team_member_id, clock_in, clock_out, clock_in_location, clock_out_location')
      .gte('clock_in', today.toISOString());

    if (data) {
      setTodayAttendance(data as TodayAttendance[]);
    }
  };

  const openProjectDetail = async (team: ProjectTeam) => {
    setSelectedProject(team);
    setProjectDetailOpen(true);
    
    // Fetch attendance for all members in this project
    const memberIds = team.members.map(m => m.id);
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .in('team_member_id', memberIds)
      .gte('clock_in', sevenDaysAgo.toISOString())
      .order('clock_in', { ascending: false });

    setProjectAttendance((data || []) as MemberAttendance[]);
  };

  const formatLocationAddress = (location: any) => {
    if (!location) return null;
    return location.address || (location.lat && location.lng ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : null);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const calculateDuration = (clockIn: string, clockOut: string | null) => {
    const start = new Date(clockIn);
    const end = clockOut ? new Date(clockOut) : new Date();
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const generateEmail = (name: string) => {
    const cleanCompany = (companyName || 'company').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${cleanCompany}.${cleanName}@intorza.com`;
  };

  const handleAddMember = async () => {
    if (!user) {
      toast.error("Please login first");
      return;
    }

    if (!memberForm.name) {
      toast.error("Name is required");
      return;
    }

    if (!editingMember && !memberForm.password) {
      toast.error("Password is required for new members");
      return;
    }

    if (!editingMember && memberForm.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    const generatedEmail = generateEmail(memberForm.name);
    setCreatingAuth(true);

    try {
      if (editingMember) {
        const { error } = await supabase
          .from('team_members')
          .update({
            name: memberForm.name,
            email: generatedEmail,
            phone: memberForm.phone || null,
            work_type: memberForm.work_type as any,
          })
          .eq('id', editingMember.id);

        if (error) throw error;
        toast.success("Team member updated");
      } else {
        // Create member record first
        const { data: newMember, error } = await supabase
          .from('team_members')
          .insert({
            company_id: user.id,
            name: memberForm.name,
            email: generatedEmail,
            phone: memberForm.phone || null,
            work_type: memberForm.work_type as any,
          })
          .select()
          .single();

        if (error) throw error;

        // Create auth account via edge function
        const { data: session } = await supabase.auth.getSession();
        const response = await supabase.functions.invoke('create-team-member-auth', {
          body: {
            email: generatedEmail,
            password: memberForm.password,
            name: memberForm.name,
            phone: memberForm.phone,
            work_type: memberForm.work_type,
            company_id: user.id,
            team_member_id: newMember.id,
          },
        });

        if (response.error) {
          // Clean up the team member record if auth creation fails
          await supabase.from('team_members').delete().eq('id', newMember.id);
          throw new Error(response.error.message || 'Failed to create login account');
        }

        // If project selected, assign to project
        if (memberForm.project_id && newMember) {
          await supabase
            .from('team_project_assignments')
            .insert({
              team_member_id: newMember.id,
              quotation_id: memberForm.project_id,
            });
        }

        toast.success("Team member added with login credentials");
        trackAction('team_member_added');
      }

      setMemberDialogOpen(false);
      setEditingMember(null);
      setMemberForm({ name: '', phone: '', work_type: 'labour', project_id: '', password: '' });
      fetchTeamMembers();
    } catch (error: any) {
      toast.error(error.message || "Error saving team member");
    } finally {
      setCreatingAuth(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!teamForm.project_id) {
      toast.error("Please select a project");
      return;
    }

    if (teamForm.selectedMembers.length === 0) {
      toast.error("Please select at least one member");
      return;
    }

    try {
      const assignments = teamForm.selectedMembers.map(memberId => ({
        team_member_id: memberId,
        quotation_id: teamForm.project_id,
      }));

      const { error } = await supabase
        .from('team_project_assignments')
        .insert(assignments);

      if (error) throw error;

      toast.success("Team created successfully");
      trackAction('team_created');
      setTeamDialogOpen(false);
      setTeamForm({ project_id: '', selectedMembers: [] });
      fetchProjectTeams();
    } catch (error: any) {
      toast.error(error.message || "Error creating team");
    }
  };

  const handleRemoveMemberFromProject = async (assignmentId: string) => {
    const { error } = await supabase
      .from('team_project_assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      toast.error("Error removing member");
    } else {
      toast.success("Member removed from project");
      fetchProjectTeams();
    }
  };

  const handleDeleteMember = async (id: string) => {
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

  const handleEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setMemberForm({
      name: member.name,
      phone: member.phone || '',
      work_type: member.work_type,
      project_id: '',
      password: '', // Password not shown when editing
    });
    setMemberDialogOpen(true);
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
      helper: 'bg-teal-100 text-teal-800',
      driver: 'bg-indigo-100 text-indigo-800',
      other: 'bg-muted text-muted-foreground',
    };
    return colors[type] || colors.other;
  };

  const toggleMemberSelection = (memberId: string) => {
    setTeamForm(prev => ({
      ...prev,
      selectedMembers: prev.selectedMembers.includes(memberId)
        ? prev.selectedMembers.filter(id => id !== memberId)
        : [...prev.selectedMembers, memberId],
    }));
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
          <p className="text-muted-foreground">Manage your team members and project assignments</p>
        </div>
        <div className="flex gap-2">
          {/* Add Team Dialog */}
          <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FolderPlus className="h-4 w-4 mr-2" />
                Add Team
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Project Team</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Project *</Label>
                  <Select value={teamForm.project_id} onValueChange={(v) => setTeamForm({ ...teamForm, project_id: v })}>
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
                
                <div className="space-y-2">
                  <Label>Select Team Members *</Label>
                  <div className="border rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
                    {teamMembers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No members yet. Add members first.</p>
                    ) : (
                      teamMembers.map((member) => (
                        <label
                          key={member.id}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                            teamForm.selectedMembers.includes(member.id)
                              ? 'bg-primary/10 border border-primary/30'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={teamForm.selectedMembers.includes(member.id)}
                            onChange={() => toggleMemberSelection(member.id)}
                            className="rounded"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                          <Badge className={getWorkTypeBadgeColor(member.work_type)} variant="secondary">
                            {workTypes.find(t => t.value === member.work_type)?.label}
                          </Badge>
                        </label>
                      ))
                    )}
                  </div>
                  {teamForm.selectedMembers.length > 0 && (
                    <p className="text-xs text-muted-foreground">{teamForm.selectedMembers.length} member(s) selected</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTeamDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateTeam}>Create Team</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Member Dialog (triggered programmatically) */}
          <Dialog open={memberDialogOpen} onOpenChange={(open) => {
            setMemberDialogOpen(open);
            if (!open) {
              setEditingMember(null);
              setMemberForm({ name: '', phone: '', work_type: 'labour', project_id: '', password: '' });
            }
          }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingMember ? 'Edit' : 'Add'} Team Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={memberForm.name}
                    onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                    placeholder="Enter full name"
                  />
                  {memberForm.name && companyName && (
                    <p className="text-xs text-muted-foreground">
                      Login Email: <span className="font-medium text-foreground">{generateEmail(memberForm.name)}</span>
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={memberForm.phone}
                    onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Work Type *</Label>
                  <Select value={memberForm.work_type} onValueChange={(v) => setMemberForm({ ...memberForm, work_type: v })}>
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
                {!editingMember && (
                  <>
                    <div className="space-y-2">
                      <Label>Login Password *</Label>
                      <Input
                        type="password"
                        value={memberForm.password}
                        onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })}
                        placeholder="Create login password (min 6 chars)"
                      />
                      <p className="text-xs text-muted-foreground">
                        Share this password with the team member to login at /team/login
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Assign to Project (Optional)</Label>
                      <Select value={memberForm.project_id || "none"} onValueChange={(v) => setMemberForm({ ...memberForm, project_id: v === "none" ? "" : v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No project</SelectItem>
                          {quotations.map((q) => (
                            <SelectItem key={q.id} value={q.id}>
                              {q.project_name} - {q.client_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setMemberDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddMember} disabled={creatingAuth}>
                  {creatingAuth ? 'Creating...' : editingMember ? 'Update' : 'Add'} Member
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
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
              <Briefcase className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold tabular-nums">{projectTeams.length}</p>
                <p className="text-xs text-muted-foreground">Active Teams</p>
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
              <MapPin className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-2xl font-bold tabular-nums">{todayAttendance.length}</p>
                <p className="text-xs text-muted-foreground">Attended Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Teams and Members */}
      <Tabs defaultValue="teams" className="space-y-4">
        <TabsList>
          <TabsTrigger value="teams">Project Teams</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="approvals" className="relative">
            Approvals
            {memberRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
                {memberRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6 h-32 bg-muted/50" />
                </Card>
              ))}
            </div>
          ) : projectTeams.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No project teams yet</p>
                <p className="text-sm text-muted-foreground mb-4">Create a team by assigning members to a project</p>
                <Button variant="outline" onClick={() => setTeamDialogOpen(true)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create First Team
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {projectTeams.map((team) => {
                const teamTodayAttendance = todayAttendance.filter(a => 
                  team.members.some(m => m.id === a.team_member_id)
                );
                const activeCount = teamTodayAttendance.filter(a => a.clock_in && !a.clock_out).length;
                
                return (
                  <Card 
                    key={team.quotation.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/team/project/${team.quotation.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {team.quotation.project_name}
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">{team.quotation.client_name}</p>
                          {team.quotation.place_of_project && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Navigation className="h-3 w-3" />
                              {team.quotation.place_of_project}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline">{team.members.length} members</Badge>
                          {activeCount > 0 && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <Clock className="h-3 w-3 mr-1" />
                              {activeCount} working
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-2">
                        {team.members.slice(0, 5).map((member) => (
                          <div 
                            key={member.assignmentId}
                            className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-medium">{member.name}</p>
                              <Badge className={`${getWorkTypeBadgeColor(member.work_type)} text-xs`} variant="secondary">
                                {workTypes.find(t => t.value === member.work_type)?.label}
                              </Badge>
                            </div>
                            <button
                              onClick={() => handleRemoveMemberFromProject(member.assignmentId)}
                              className="text-muted-foreground hover:text-destructive ml-2"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {team.members.length > 5 && (
                          <div className="flex items-center justify-center bg-muted/50 rounded-lg px-3 py-2">
                            <p className="text-sm text-muted-foreground">+{team.members.length - 5} more</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
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
                <p className="text-sm text-muted-foreground mb-4">Add your first team member to get started</p>
                <Button onClick={() => setMemberDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add First Member
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {teamMembers.map((member) => {
                const attendance = getMemberAttendance(member.id);
                const isClockedIn = attendance && !attendance.clock_out;
                
                return (
                  <Card key={member.id}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex flex-col sm:flex-row justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold">{member.name}</h3>
                            <Badge className={getWorkTypeBadgeColor(member.work_type)}>
                              {workTypes.find(t => t.value === member.work_type)?.label}
                            </Badge>
                            {isClockedIn && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <Clock className="h-3 w-3 mr-1" />
                                Working
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {member.email}
                            </span>
                            {member.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {member.phone}
                              </span>
                            )}
                          </div>
                          {attendance && (
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>In: {new Date(attendance.clock_in).toLocaleTimeString()}</span>
                              {attendance.clock_out && (
                                <span>Out: {new Date(attendance.clock_out).toLocaleTimeString()}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditMember(member)}>
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
                                <AlertDialogAction onClick={() => handleDeleteMember(member.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="space-y-4">
          {memberRequests.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No pending requests</p>
                <p className="text-sm text-muted-foreground">When team members sign up and request to join, they'll appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {memberRequests.map((request) => {
                const isPending = request.status === 'pending';
                const statusColors: Record<string, string> = {
                  pending: 'bg-amber-100 text-amber-800 border-amber-200',
                  approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                  rejected: 'bg-red-100 text-red-800 border-red-200',
                  docs_requested: 'bg-blue-100 text-blue-800 border-blue-200',
                };
                const statusIcons: Record<string, React.ReactNode> = {
                  pending: <AlertCircle className="h-3 w-3" />,
                  approved: <CheckCircle className="h-3 w-3" />,
                  rejected: <XCircle className="h-3 w-3" />,
                  docs_requested: <FileQuestion className="h-3 w-3" />,
                };

                return (
                  <Card key={request.id}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex flex-col sm:flex-row justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold">{request.name}</h3>
                            <Badge className={workTypes.find(t => t.value === request.work_type) ? getWorkTypeBadgeColor(request.work_type) : 'bg-muted text-muted-foreground'}>
                              {workTypes.find(t => t.value === request.work_type)?.label || request.work_type}
                            </Badge>
                            <Badge variant="outline" className={statusColors[request.status] || ''}>
                              <span className="flex items-center gap-1">
                                {statusIcons[request.status]}
                                {request.status === 'docs_requested' ? 'Docs Requested' : request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                              </span>
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {request.email}
                            </span>
                            {request.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {request.phone}
                              </span>
                            )}
                            <span className="text-xs">
                              {new Date(request.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {request.rejection_reason && (
                            <p className="text-xs text-destructive mt-1">Reason: {request.rejection_reason}</p>
                          )}
                          {request.docs_request_note && (
                            <p className="text-xs text-blue-600 mt-1">Note: {request.docs_request_note}</p>
                          )}
                        </div>
                        {isPending && (
                          <div className="flex items-center gap-2 shrink-0">
                            <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => openActionDialog(request, 'reject')}>
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openActionDialog(request, 'docs_requested')}>
                              <FileQuestion className="h-4 w-4 mr-1" />
                              Request Docs
                            </Button>
                            <Button size="sm" onClick={() => handleApproveRequest(request)}>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reject/Docs Request Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'reject' ? 'Reject Request' : 'Request Documentation'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'reject' 
                ? `Reject ${selectedRequest?.name}'s request to join your team.`
                : `Ask ${selectedRequest?.name} for additional documentation.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{actionType === 'reject' ? 'Reason (optional)' : 'What documents do you need?'}</Label>
              <Textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder={actionType === 'reject' ? 'Reason for rejection...' : 'Please provide ID proof, experience certificate...'}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Cancel</Button>
            <Button 
              variant={actionType === 'reject' ? 'destructive' : 'default'}
              onClick={handleRejectOrDocsRequest}
            >
              {actionType === 'reject' ? 'Reject' : 'Send Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Detail Dialog */}
      <Dialog open={projectDetailOpen} onOpenChange={setProjectDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedProject?.quotation.project_name}</DialogTitle>
            <DialogDescription>{selectedProject?.quotation.client_name}</DialogDescription>
          </DialogHeader>
          
          {selectedProject && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                {/* Project Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                  {selectedProject.quotation.place_of_project && (
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Navigation className="h-3 w-3" />
                        {selectedProject.quotation.place_of_project}
                      </p>
                    </div>
                  )}
                  {selectedProject.quotation.project_deadline && (
                    <div>
                      <p className="text-xs text-muted-foreground">Deadline</p>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(selectedProject.quotation.project_deadline).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant="outline">{selectedProject.quotation.status}</Badge>
                  </div>
                  {selectedProject.quotation.grand_total && (
                    <div>
                      <p className="text-xs text-muted-foreground">Project Value</p>
                      <p className="text-sm font-medium tabular-nums">
                        ₹{selectedProject.quotation.grand_total.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Team Members */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Team Members ({selectedProject.members.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedProject.members.map((member) => {
                      const memberAttToday = todayAttendance.find(a => a.team_member_id === member.id);
                      const isWorking = memberAttToday && !memberAttToday.clock_out;
                      
                      return (
                        <div key={member.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-medium text-sm">{member.name}</p>
                              <div className="flex items-center gap-2">
                                <Badge className={`${getWorkTypeBadgeColor(member.work_type)} text-xs`} variant="secondary">
                                  {workTypes.find(t => t.value === member.work_type)?.label}
                                </Badge>
                                {isWorking && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                    Working
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          {memberAttToday && (
                            <div className="text-right text-xs text-muted-foreground">
                              <p>In: {formatTime(memberAttToday.clock_in)}</p>
                              {memberAttToday.clock_in_location && (
                                <p className="flex items-center gap-1 justify-end">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate max-w-[120px]">
                                    {formatLocationAddress(memberAttToday.clock_in_location)}
                                  </span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Attendance */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Recent Attendance (Last 7 Days)
                  </h3>
                  {projectAttendance.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No attendance records</p>
                  ) : (
                    <div className="space-y-2">
                      {projectAttendance.slice(0, 15).map((record) => {
                        const member = selectedProject.members.find(m => m.id === record.team_member_id);
                        
                        return (
                          <div key={record.id} className="p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="font-medium text-sm">{member?.name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">{formatDate(record.clock_in)}</p>
                              </div>
                              <p className="text-sm font-medium tabular-nums">
                                {calculateDuration(record.clock_in, record.clock_out)}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <div>
                                <p>In: {formatTime(record.clock_in)}</p>
                                {record.clock_in_location && (
                                  <p className="flex items-center gap-1 mt-0.5">
                                    <MapPin className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{formatLocationAddress(record.clock_in_location)}</span>
                                  </p>
                                )}
                              </div>
                              <div>
                                <p>Out: {record.clock_out ? formatTime(record.clock_out) : 'Working'}</p>
                                {record.clock_out_location && (
                                  <p className="flex items-center gap-1 mt-0.5">
                                    <MapPin className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{formatLocationAddress(record.clock_out_location)}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectDetailOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Team;
