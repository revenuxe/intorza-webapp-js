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
import { Plus, Users, Clock, MapPin, Phone, Mail, Trash2, Edit, FolderPlus, UserPlus, Briefcase, Eye, Navigation, Calendar, ChevronRight, CheckCircle, XCircle, FileQuestion, AlertCircle, Hash, Copy, RefreshCw } from "lucide-react";
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
  
  // Org code
  const [orgCode, setOrgCode] = useState<string | null>(null);
  const [orgCodeInput, setOrgCodeInput] = useState('');
  const [orgCodeDialogOpen, setOrgCodeDialogOpen] = useState(false);
  
  // Member form
  const [memberForm, setMemberForm] = useState({
    name: '',
    phone: '',
    work_type: 'labour',
    project_id: '',
    password: '',
  });
  const [creatingAuth, setCreatingAuth] = useState(false);

  // Team form
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
      .select('company_name, org_code')
      .eq('id', user.id)
      .single();
    if (data?.company_name) {
      setCompanyName(data.company_name);
    }
    setOrgCode(data?.org_code || null);
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

  // Org code handlers
  const generateUniqueCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setOrgCodeInput(code);
  };

  const handleSaveOrgCode = async () => {
    if (!user || !orgCodeInput.trim()) {
      toast.error("Please enter a code");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ org_code: orgCodeInput.trim().toUpperCase() })
        .eq('id', user.id);

      if (error) {
        if (error.message.includes('unique') || error.message.includes('duplicate')) {
          toast.error("This code is already taken. Try a different one.");
        } else {
          throw error;
        }
        return;
      }

      setOrgCode(orgCodeInput.trim().toUpperCase());
      setOrgCodeDialogOpen(false);
      toast.success("Organization code saved!");
    } catch (error: any) {
      toast.error(error.message || "Failed to save code");
    }
  };

  const copyOrgCode = () => {
    if (orgCode) {
      navigator.clipboard.writeText(orgCode);
      toast.success("Code copied!");
    }
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
          await supabase.from('team_members').delete().eq('id', newMember.id);
          throw new Error(response.error.message || 'Failed to create login account');
        }

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
      password: '',
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

  const pendingCount = memberRequests.filter(r => r.status === 'pending').length;

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
    <div className="space-y-4 sm:space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Team Management</h1>
            <p className="text-sm text-muted-foreground">Manage members & project assignments</p>
          </div>
          <div className="flex gap-1.5">
            <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl">
                  <FolderPlus className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Add Team</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Create Project Team</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Project *</Label>
                    <Select value={teamForm.project_id} onValueChange={(v) => setTeamForm({ ...teamForm, project_id: v })}>
                      <SelectTrigger className="rounded-xl">
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
                    <div className="border rounded-xl p-3 max-h-60 overflow-y-auto space-y-2">
                      {teamMembers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No members yet. Add members first.</p>
                      ) : (
                        teamMembers.map((member) => (
                          <label
                            key={member.id}
                            className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
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
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{member.name}</p>
                            </div>
                            <Badge className={getWorkTypeBadgeColor(member.work_type)} variant="secondary">
                              {workTypes.find(t => t.value === member.work_type)?.label}
                            </Badge>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setTeamDialogOpen(false)} className="rounded-xl">Cancel</Button>
                  <Button onClick={handleCreateTeam} className="rounded-xl">Create Team</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Org Code Card */}
        <Card className="rounded-2xl">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Hash className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Organization Code</p>
                  {orgCode ? (
                    <div className="flex items-center gap-2">
                      <p className="font-bold font-mono text-lg tracking-wider">{orgCode}</p>
                      <button onClick={copyOrgCode} className="text-muted-foreground hover:text-foreground">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not set yet</p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl shrink-0"
                onClick={() => {
                  setOrgCodeInput(orgCode || '');
                  setOrgCodeDialogOpen(true);
                }}
              >
                {orgCode ? 'Change' : 'Set Code'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="rounded-2xl">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xl font-bold tabular-nums">{teamMembers.length}</p>
                <p className="text-[11px] text-muted-foreground">Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xl font-bold tabular-nums">{projectTeams.length}</p>
                <p className="text-[11px] text-muted-foreground">Teams</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xl font-bold tabular-nums">{todayAttendance.filter(a => a.clock_in && !a.clock_out).length}</p>
                <p className="text-[11px] text-muted-foreground">Clocked In</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-xl font-bold tabular-nums">{todayAttendance.length}</p>
                <p className="text-[11px] text-muted-foreground">Attended</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="teams" className="space-y-3">
        <div className="overflow-x-auto -mx-4 px-4">
          <TabsList className="inline-flex w-max gap-1 p-1">
            <TabsTrigger value="teams" className="text-xs sm:text-sm px-3">Teams</TabsTrigger>
            <TabsTrigger value="members" className="text-xs sm:text-sm px-3">Members</TabsTrigger>
            <TabsTrigger value="approvals" className="text-xs sm:text-sm px-3 relative">
              Approvals
              {pendingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="teams" className="space-y-3">
          {projectTeams.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="pt-6 text-center py-12">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No project teams yet</p>
                <Button variant="outline" onClick={() => setTeamDialogOpen(true)} className="mt-4 rounded-xl">
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create First Team
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {projectTeams.map((team) => {
                const activeCount = todayAttendance.filter(a => 
                  team.members.some(m => m.id === a.team_member_id) && a.clock_in && !a.clock_out
                ).length;
                
                return (
                  <Card 
                    key={team.quotation.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl"
                    onClick={() => navigate(`/team/project/${team.quotation.id}`)}
                  >
                    <CardHeader className="p-3 sm:p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base flex items-center gap-1.5">
                            <span className="truncate">{team.quotation.project_name}</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </CardTitle>
                          <p className="text-xs text-muted-foreground truncate">{team.quotation.client_name}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant="outline" className="text-[10px]">{team.members.length} members</Badge>
                          {activeCount > 0 && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">
                              {activeCount} working
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-1.5">
                        {team.members.slice(0, 4).map((member) => (
                          <div 
                            key={member.assignmentId}
                            className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1.5"
                          >
                            <p className="text-xs font-medium">{member.name}</p>
                            <button
                              onClick={() => handleRemoveMemberFromProject(member.assignmentId)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {team.members.length > 4 && (
                          <div className="flex items-center bg-muted/50 rounded-lg px-2.5 py-1.5">
                            <p className="text-xs text-muted-foreground">+{team.members.length - 4}</p>
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

        <TabsContent value="members" className="space-y-3">
          {teamMembers.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="pt-6 text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No team members yet</p>
                <Button onClick={() => setMemberDialogOpen(true)} className="mt-4 rounded-xl">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add First Member
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2">
              {teamMembers.map((member) => {
                const attendance = getMemberAttendance(member.id);
                const isClockedIn = attendance && !attendance.clock_out;
                
                return (
                  <Card key={member.id} className="rounded-2xl">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <h3 className="font-semibold text-sm">{member.name}</h3>
                            <Badge className={`${getWorkTypeBadgeColor(member.work_type)} text-[10px]`}>
                              {workTypes.find(t => t.value === member.work_type)?.label}
                            </Badge>
                            {isClockedIn && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">
                                <Clock className="h-2.5 w-2.5 mr-0.5" />
                                Working
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                              <Mail className="h-3 w-3" />
                              <span className="truncate max-w-[140px] sm:max-w-none">{member.email}</span>
                            </span>
                            {member.phone && (
                              <span className="flex items-center gap-0.5">
                                <Phone className="h-3 w-3" />
                                {member.phone}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditMember(member)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-2xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete {member.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will also delete their attendance records.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteMember(member.id)} className="rounded-xl">Delete</AlertDialogAction>
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

        {/* Approvals Tab - Mobile-first */}
        <TabsContent value="approvals" className="space-y-3">
          {memberRequests.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="pt-6 text-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No pending requests</p>
                <p className="text-xs text-muted-foreground mt-1">When team members sign up, they'll appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2">
              {memberRequests.map((request) => {
                const isPending = request.status === 'pending';
                const statusStyles: Record<string, string> = {
                  pending: 'bg-amber-100 text-amber-800',
                  approved: 'bg-emerald-100 text-emerald-800',
                  rejected: 'bg-red-100 text-red-800',
                  docs_requested: 'bg-blue-100 text-blue-800',
                };
                const statusIcons: Record<string, React.ReactNode> = {
                  pending: <AlertCircle className="h-3 w-3" />,
                  approved: <CheckCircle className="h-3 w-3" />,
                  rejected: <XCircle className="h-3 w-3" />,
                  docs_requested: <FileQuestion className="h-3 w-3" />,
                };

                return (
                  <Card key={request.id} className="rounded-2xl">
                    <CardContent className="p-3 sm:p-4">
                      <div className="space-y-2.5">
                        {/* Top row: name + status */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm">{request.name}</h3>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <Badge className={`${getWorkTypeBadgeColor(request.work_type)} text-[10px]`}>
                                {workTypes.find(t => t.value === request.work_type)?.label || request.work_type}
                              </Badge>
                              <Badge className={`${statusStyles[request.status] || ''} text-[10px]`}>
                                <span className="flex items-center gap-0.5">
                                  {statusIcons[request.status]}
                                  {request.status === 'docs_requested' ? 'Docs' : request.status}
                                </span>
                              </Badge>
                            </div>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(request.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Contact info */}
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <Mail className="h-3 w-3" />
                            <span className="truncate max-w-[160px]">{request.email}</span>
                          </span>
                          {request.phone && (
                            <span className="flex items-center gap-0.5">
                              <Phone className="h-3 w-3" />
                              {request.phone}
                            </span>
                          )}
                        </div>

                        {/* Notes */}
                        {request.rejection_reason && (
                          <p className="text-xs text-destructive bg-destructive/5 rounded-lg px-2.5 py-1.5">
                            Reason: {request.rejection_reason}
                          </p>
                        )}
                        {request.docs_request_note && (
                          <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-2.5 py-1.5">
                            Note: {request.docs_request_note}
                          </p>
                        )}

                        {/* Action buttons - full width on mobile */}
                        {isPending && (
                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 rounded-xl text-xs text-destructive border-destructive/30 h-9"
                              onClick={() => openActionDialog(request, 'reject')}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 rounded-xl text-xs h-9"
                              onClick={() => openActionDialog(request, 'docs_requested')}
                            >
                              <FileQuestion className="h-3.5 w-3.5 mr-1" />
                              Docs
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 rounded-xl text-xs h-9"
                              onClick={() => handleApproveRequest(request)}
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
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

      {/* Edit Member Dialog */}
      <Dialog open={memberDialogOpen} onOpenChange={(open) => {
        setMemberDialogOpen(open);
        if (!open) {
          setEditingMember(null);
          setMemberForm({ name: '', phone: '', work_type: 'labour', project_id: '', password: '' });
        }
      }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingMember ? 'Edit' : 'Add'} Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input
                value={memberForm.name}
                onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                placeholder="Enter full name"
                className="rounded-xl"
              />
              {memberForm.name && companyName && (
                <p className="text-xs text-muted-foreground">
                  Email: <span className="font-medium text-foreground">{generateEmail(memberForm.name)}</span>
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={memberForm.phone}
                onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                placeholder="Phone number"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Work Type *</Label>
              <Select value={memberForm.work_type} onValueChange={(v) => setMemberForm({ ...memberForm, work_type: v })}>
                <SelectTrigger className="rounded-xl">
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
                <div className="space-y-1.5">
                  <Label>Login Password *</Label>
                  <Input
                    type="password"
                    value={memberForm.password}
                    onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })}
                    placeholder="Min 6 characters"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Assign to Project</Label>
                  <Select value={memberForm.project_id || "none"} onValueChange={(v) => setMemberForm({ ...memberForm, project_id: v === "none" ? "" : v })}>
                    <SelectTrigger className="rounded-xl">
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
            <Button variant="outline" onClick={() => setMemberDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleAddMember} disabled={creatingAuth} className="rounded-xl">
              {creatingAuth ? 'Creating...' : editingMember ? 'Update' : 'Add'} Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject/Docs Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'reject' ? 'Reject Request' : 'Request Documentation'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'reject' 
                ? `Reject ${selectedRequest?.name}'s request.`
                : `Ask ${selectedRequest?.name} for documents.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{actionType === 'reject' ? 'Reason (optional)' : 'What documents?'}</Label>
              <Textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder={actionType === 'reject' ? 'Reason for rejection...' : 'ID proof, experience certificate...'}
                rows={3}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button 
              variant={actionType === 'reject' ? 'destructive' : 'default'}
              onClick={handleRejectOrDocsRequest}
              className="rounded-xl"
            >
              {actionType === 'reject' ? 'Reject' : 'Send Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Org Code Dialog */}
      <Dialog open={orgCodeDialogOpen} onOpenChange={setOrgCodeDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Organization Code</DialogTitle>
            <DialogDescription>
              Set a unique code that team members can use to find your organization during signup.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Code</Label>
              <div className="flex gap-2">
                <Input
                  value={orgCodeInput}
                  onChange={(e) => setOrgCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                  placeholder="e.g. MYORG23"
                  className="font-mono tracking-wider rounded-xl"
                  maxLength={8}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={generateUniqueCode}
                  className="shrink-0 rounded-xl"
                  title="Generate random code"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">3-8 characters, letters & numbers only</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrgCodeDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSaveOrgCode} disabled={orgCodeInput.trim().length < 3} className="rounded-xl">
              Save Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Detail Dialog */}
      <Dialog open={projectDetailOpen} onOpenChange={setProjectDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col rounded-2xl">
          <DialogHeader>
            <DialogTitle>{selectedProject?.quotation.project_name}</DialogTitle>
            <DialogDescription>{selectedProject?.quotation.client_name}</DialogDescription>
          </DialogHeader>
          
          {selectedProject && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-xl">
                  {selectedProject.quotation.place_of_project && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">Location</p>
                      <p className="text-xs font-medium flex items-center gap-1">
                        <Navigation className="h-3 w-3" />
                        {selectedProject.quotation.place_of_project}
                      </p>
                    </div>
                  )}
                  {selectedProject.quotation.project_deadline && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">Deadline</p>
                      <p className="text-xs font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(selectedProject.quotation.project_deadline).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-muted-foreground">Status</p>
                    <Badge variant="outline" className="text-[10px]">{selectedProject.quotation.status}</Badge>
                  </div>
                  {selectedProject.quotation.grand_total && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">Value</p>
                      <p className="text-xs font-medium tabular-nums">
                        ₹{selectedProject.quotation.grand_total.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    Members ({selectedProject.members.length})
                  </h3>
                  <div className="space-y-1.5">
                    {selectedProject.members.map((member) => {
                      const memberAttToday = todayAttendance.find(a => a.team_member_id === member.id);
                      const isWorking = memberAttToday && !memberAttToday.clock_out;
                      
                      return (
                        <div key={member.id} className="flex items-center justify-between p-2.5 bg-muted/30 rounded-xl">
                          <div>
                            <p className="font-medium text-xs">{member.name}</p>
                            <Badge className={`${getWorkTypeBadgeColor(member.work_type)} text-[10px]`} variant="secondary">
                              {workTypes.find(t => t.value === member.work_type)?.label}
                            </Badge>
                          </div>
                          {isWorking && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">
                              Working
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    Attendance (7 Days)
                  </h3>
                  {projectAttendance.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No records</p>
                  ) : (
                    <div className="space-y-1.5">
                      {projectAttendance.slice(0, 15).map((record) => {
                        const member = selectedProject.members.find(m => m.id === record.team_member_id);
                        return (
                          <div key={record.id} className="p-2.5 bg-muted/30 rounded-xl">
                            <div className="flex items-center justify-between mb-1">
                              <div>
                                <p className="font-medium text-xs">{member?.name || 'Unknown'}</p>
                                <p className="text-[10px] text-muted-foreground">{formatDate(record.clock_in)}</p>
                              </div>
                              <p className="text-xs font-medium tabular-nums">
                                {calculateDuration(record.clock_in, record.clock_out)}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                              <div>
                                <p>In: {formatTime(record.clock_in)}</p>
                                {record.clock_in_location && (
                                  <p className="flex items-center gap-0.5 mt-0.5">
                                    <MapPin className="h-2.5 w-2.5" />
                                    <span className="truncate">{formatLocationAddress(record.clock_in_location)}</span>
                                  </p>
                                )}
                              </div>
                              <div>
                                <p>Out: {record.clock_out ? formatTime(record.clock_out) : 'Working'}</p>
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
            <Button variant="outline" onClick={() => setProjectDetailOpen(false)} className="rounded-xl">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Team;
