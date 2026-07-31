import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { teamApi, tasksApi, quotationsApi, profileApi } from "@/lib/api";
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
import { Plus, Users, Clock, MapPin, Phone, Mail, Trash2, Edit, FolderPlus, UserPlus, Briefcase, Navigation, Calendar, ChevronRight, CheckCircle, XCircle, FileQuestion, AlertCircle, Hash, Copy, RefreshCw, ListTodo, BarChart3, MessageSquare, Target, TrendingUp, Award } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useFeedback } from "@/components/FeedbackProvider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

// Interfaces
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

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  due_date: string | null;
  assigned_to: string | null;
  quotation_id: string | null;
  created_at: string;
}

const workTypes = [
  { value: 'carpenter', label: 'Carpenter', icon: '🪚' },
  { value: 'labour', label: 'Labour', icon: '👷' },
  { value: 'plumber', label: 'Plumber', icon: '🔧' },
  { value: 'electrician', label: 'Electrician', icon: '⚡' },
  { value: 'painter', label: 'Painter', icon: '🎨' },
  { value: 'mason', label: 'Mason', icon: '🧱' },
  { value: 'welder', label: 'Welder', icon: '🔥' },
  { value: 'supervisor', label: 'Supervisor', icon: '📋' },
  { value: 'helper', label: 'Helper', icon: '🤝' },
  { value: 'driver', label: 'Driver', icon: '🚗' },
  { value: 'other', label: 'Other', icon: '👤' },
];

const Team = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { trackAction } = useFeedback();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [projectTeams, setProjectTeams] = useState<ProjectTeam[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialogs
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
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

  // Task form
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    assigned_to: '',
    quotation_id: '',
  });

  // Approval requests
  const [memberRequests, setMemberRequests] = useState<TeamMemberRequest[]>([]);
  const [actionNote, setActionNote] = useState('');
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'reject' | 'docs_requested'>('reject');
  const [selectedRequest, setSelectedRequest] = useState<TeamMemberRequest | null>(null);

  // Weekly attendance for performance
  const [weeklyAttendance, setWeeklyAttendance] = useState<MemberAttendance[]>([]);

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
      fetchTasks(),
      fetchWeeklyAttendance(),
    ]);
    setLoading(false);
  };

  const fetchMemberRequests = async () => {
    if (!user) return;
    const { data } = await teamApi.requests.list();
    setMemberRequests((data || []) as TeamMemberRequest[]);
  };

  const fetchTasks = async () => {
    if (!user) return;
    const { data } = await tasksApi.list();
    setTasks((data || []) as Task[]);
  };

  const fetchWeeklyAttendance = async () => {
    if (!user) return;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data } = await supabase
      .from('attendance')
      .select('*')
      .gte('clock_in', sevenDaysAgo.toISOString())
      .order('clock_in', { ascending: false });

    setWeeklyAttendance((data || []) as MemberAttendance[]);
  };

  const handleApproveRequest = async (request: TeamMemberRequest) => {
    if (!user) return;
    try {
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          company_id: user.id,
          name: request.name,
          email: request.email,
          phone: request.phone,
          work_type: request.work_type as any,
          user_id: request.user_id,
        });

      if (memberError) throw memberError;

      await teamApi.requests.update(request.id, { status: 'approved' });

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

      await teamApi.requests.update(selectedRequest.id, updateData);

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
    const { data } = await profileApi.get();
    if (data?.company_name) {
      setCompanyName(data.company_name);
    }
    setOrgCode(data?.org_code || null);
  };

  const fetchQuotations = async () => {
    if (!user) return;
    const { data } = await quotationsApi.list();
    setQuotations((data || []) as Quotation[]);
  };

  // team_members and team_project_assignments stay on Supabase for now — see
  // note on handleApproveRequest about create-team-member-auth.
  const fetchTeamMembers = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('company_id', user.id)
      .order('created_at', { ascending: false });

    if (!error) {
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
          teamsMap.set(quotation.id, { quotation, members: [] });
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

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
      await profileApi.update({ org_code: orgCodeInput.trim().toUpperCase() });

      setOrgCode(orgCodeInput.trim().toUpperCase());
      setOrgCodeDialogOpen(false);
      toast.success("Organization code saved!");
    } catch (error: any) {
      if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
        toast.error("This code is already taken. Try a different one.");
      } else {
        toast.error(error.message || "Failed to save code");
      }
    }
  };

  const copyOrgCode = () => {
    if (orgCode) {
      navigator.clipboard.writeText(orgCode);
      toast.success("Code copied!");
    }
  };

  const handleAddMember = async () => {
    if (!user) { toast.error("Please login first"); return; }
    if (!memberForm.name) { toast.error("Name is required"); return; }
    if (!editingMember && !memberForm.password) { toast.error("Password is required for new members"); return; }
    if (!editingMember && memberForm.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }

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
    if (!teamForm.project_id) { toast.error("Please select a project"); return; }
    if (teamForm.selectedMembers.length === 0) { toast.error("Please select at least one member"); return; }

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

  const handleSaveTask = async () => {
    if (!user) return;
    if (!taskForm.title.trim()) { toast.error("Title is required"); return; }

    try {
      if (editingTask) {
        await tasksApi.update(editingTask.id, {
          title: taskForm.title,
          description: taskForm.description || null,
          priority: taskForm.priority,
          due_date: taskForm.due_date || null,
          assigned_to: taskForm.assigned_to || null,
          quotation_id: taskForm.quotation_id || null,
        });
        toast.success("Task updated");
      } else {
        await tasksApi.create({
          title: taskForm.title,
          description: taskForm.description || null,
          priority: taskForm.priority,
          due_date: taskForm.due_date || null,
          assigned_to: taskForm.assigned_to || null,
          quotation_id: taskForm.quotation_id || null,
        });
        toast.success("Task created");
      }

      setTaskDialogOpen(false);
      setEditingTask(null);
      setTaskForm({ title: '', description: '', priority: 'medium', due_date: '', assigned_to: '', quotation_id: '' });
      fetchTasks();
    } catch (error: any) {
      toast.error(error.message || "Error saving task");
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
      await tasksApi.update(taskId, updateData);
      fetchTasks();
    } catch {
      toast.error("Failed to update task");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await tasksApi.remove(taskId);
      toast.success("Task deleted");
      fetchTasks();
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const handleRemoveMemberFromProject = async (assignmentId: string) => {
    const { error } = await supabase.from('team_project_assignments').delete().eq('id', assignmentId);
    if (!error) { toast.success("Member removed"); fetchProjectTeams(); }
  };

  const handleDeleteMember = async (id: string) => {
    const { error } = await supabase.from('team_members').delete().eq('id', id);
    if (!error) { toast.success("Deleted"); fetchTeamMembers(); }
  };

  const handleEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setMemberForm({ name: member.name, phone: member.phone || '', work_type: member.work_type, project_id: '', password: '' });
    setMemberDialogOpen(true);
  };

  const getMemberAttendance = (memberId: string) => todayAttendance.find(a => a.team_member_id === memberId);

  const getWorkTypeBadge = (type: string) => {
    const wt = workTypes.find(t => t.value === type);
    return wt ? `${wt.icon} ${wt.label}` : type;
  };

  const toggleMemberSelection = (memberId: string) => {
    setTeamForm(prev => ({
      ...prev,
      selectedMembers: prev.selectedMembers.includes(memberId)
        ? prev.selectedMembers.filter(id => id !== memberId)
        : [...prev.selectedMembers, memberId],
    }));
  };

  // Performance calculations
  const getMemberWeeklyHours = (memberId: string) => {
    const records = weeklyAttendance.filter(a => a.team_member_id === memberId && a.clock_out);
    let totalMs = 0;
    records.forEach(r => {
      totalMs += new Date(r.clock_out!).getTime() - new Date(r.clock_in).getTime();
    });
    return Math.round(totalMs / (1000 * 60 * 60) * 10) / 10;
  };

  const getMemberTaskStats = (memberId: string) => {
    const memberTasks = tasks.filter(t => t.assigned_to === memberId);
    const completed = memberTasks.filter(t => t.status === 'completed').length;
    const total = memberTasks.length;
    return { completed, total, pending: total - completed };
  };

  const pendingCount = memberRequests.filter(r => r.status === 'pending').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const activeWorkers = todayAttendance.filter(a => a.clock_in && !a.clock_out).length;

  const priorityColors: Record<string, string> = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-green-100 text-green-700 border-green-200',
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
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
    <div className="space-y-3 pb-20">
      {/* Compact Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold">Team</h1>
          <p className="text-xs text-muted-foreground">{companyName || 'Your Organization'}</p>
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="rounded-xl h-8 text-xs" onClick={() => setTeamDialogOpen(true)}>
            <FolderPlus className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Team</span>
          </Button>
          <Button size="sm" className="rounded-xl h-8 text-xs" onClick={() => { setEditingMember(null); setMemberDialogOpen(true); }}>
            <UserPlus className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Member</span>
          </Button>
        </div>
      </div>

      {/* Org Code - Inline Compact */}
      <div className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-xl">
        <Hash className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs text-muted-foreground">Org Code:</span>
        {orgCode ? (
          <span className="font-mono font-bold text-sm tracking-wider">{orgCode}</span>
        ) : (
          <span className="text-xs text-muted-foreground">Not set</span>
        )}
        <button onClick={orgCode ? copyOrgCode : () => { setOrgCodeInput(orgCode || ''); setOrgCodeDialogOpen(true); }} className="ml-auto">
          {orgCode ? <Copy className="h-3.5 w-3.5 text-muted-foreground" /> : <Button variant="ghost" size="sm" className="h-6 text-xs rounded-lg">Set</Button>}
        </button>
      </div>

      {/* Quick Stats - Ultra Compact */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: Users, value: teamMembers.length, label: 'Members', color: 'text-primary' },
          { icon: Briefcase, value: projectTeams.length, label: 'Projects', color: 'text-blue-600' },
          { icon: Clock, value: activeWorkers, label: 'Active', color: 'text-green-600' },
          { icon: ListTodo, value: pendingTasks + inProgressTasks, label: 'Tasks', color: 'text-amber-600' },
        ].map((stat, i) => (
          <div key={i} className="flex items-center gap-1.5 p-2 bg-card border rounded-xl">
            <stat.icon className={`h-4 w-4 ${stat.color} shrink-0`} />
            <div className="min-w-0">
              <p className="text-base font-bold tabular-nums leading-none">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="teams" className="space-y-2">
        <div className="overflow-x-auto -mx-4 px-4">
          <TabsList className="inline-flex w-max gap-0.5 p-0.5 h-9">
            <TabsTrigger value="teams" className="text-xs px-2.5 h-8">Teams</TabsTrigger>
            <TabsTrigger value="members" className="text-xs px-2.5 h-8">Members</TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs px-2.5 h-8 relative">
              Tasks
              {pendingTasks > 0 && <span className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full bg-amber-500 text-white text-[9px] font-bold">{pendingTasks}</span>}
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-xs px-2.5 h-8">
              <BarChart3 className="h-3 w-3 mr-1" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="approvals" className="text-xs px-2.5 h-8 relative">
              Approvals
              {pendingCount > 0 && <span className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">{pendingCount}</span>}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Teams Tab */}
        <TabsContent value="teams" className="space-y-2">
          {projectTeams.length === 0 ? (
            <div className="text-center py-10">
              <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No project teams yet</p>
              <Button variant="outline" size="sm" onClick={() => setTeamDialogOpen(true)} className="mt-3 rounded-xl text-xs">
                <FolderPlus className="h-3.5 w-3.5 mr-1.5" />Create First Team
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {projectTeams.map((team) => {
                const activeCount = todayAttendance.filter(a => 
                  team.members.some(m => m.id === a.team_member_id) && a.clock_in && !a.clock_out
                ).length;
                const teamTasks = tasks.filter(t => t.quotation_id === team.quotation.id);
                const completedTeamTasks = teamTasks.filter(t => t.status === 'completed').length;
                
                return (
                  <div
                    key={team.quotation.id} 
                    className="p-3 border rounded-2xl cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => navigate(`/team/project/${team.quotation.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="font-semibold text-sm truncate">{team.quotation.project_name}</p>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{team.quotation.client_name}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Badge variant="outline" className="text-[9px] h-5">{team.members.length}👷</Badge>
                        {activeCount > 0 && <Badge className="bg-green-100 text-green-700 border-green-200 text-[9px] h-5">{activeCount} active</Badge>}
                      </div>
                    </div>
                    {/* Members chips */}
                    <div className="flex flex-wrap gap-1">
                      {team.members.slice(0, 5).map((m) => (
                        <span key={m.assignmentId} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md">{m.name.split(' ')[0]}</span>
                      ))}
                      {team.members.length > 5 && <span className="text-[10px] text-muted-foreground px-1">+{team.members.length - 5}</span>}
                    </div>
                    {/* Task progress */}
                    {teamTasks.length > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <Progress value={teamTasks.length > 0 ? (completedTeamTasks / teamTasks.length) * 100 : 0} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground">{completedTeamTasks}/{teamTasks.length}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Members Tab - Compact */}
        <TabsContent value="members" className="space-y-2">
          {teamMembers.length === 0 ? (
            <div className="text-center py-10">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No team members yet</p>
              <Button size="sm" onClick={() => setMemberDialogOpen(true)} className="mt-3 rounded-xl text-xs">
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />Add First Member
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {teamMembers.map((member) => {
                const attendance = getMemberAttendance(member.id);
                const isClockedIn = attendance && !attendance.clock_out;
                const weeklyHours = getMemberWeeklyHours(member.id);
                const taskStats = getMemberTaskStats(member.id);
                
                return (
                  <div key={member.id} className="flex items-center gap-2.5 p-2.5 border rounded-xl">
                    {/* Avatar circle */}
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm shrink-0 ${isClockedIn ? 'bg-green-100 ring-2 ring-green-400' : 'bg-muted'}`}>
                      {workTypes.find(t => t.value === member.work_type)?.icon || '👤'}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-sm truncate">{member.name}</p>
                        {isClockedIn && <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{workTypes.find(t => t.value === member.work_type)?.label}</span>
                        {weeklyHours > 0 && <span className="tabular-nums">{weeklyHours}h/wk</span>}
                        {taskStats.total > 0 && <span>{taskStats.completed}/{taskStats.total} tasks</span>}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button className="p-1.5 hover:bg-muted rounded-lg" onClick={() => handleEditMember(member)}>
                        <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="p-1.5 hover:bg-destructive/10 rounded-lg">
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {member.name}?</AlertDialogTitle>
                            <AlertDialogDescription>This will also delete their attendance records.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteMember(member.id)} className="rounded-xl">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tasks Tab - NEW */}
        <TabsContent value="tasks" className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex gap-1.5">
              {[
                { label: 'Pending', count: pendingTasks, color: 'bg-amber-100 text-amber-700' },
                { label: 'Active', count: inProgressTasks, color: 'bg-blue-100 text-blue-700' },
                { label: 'Done', count: completedTasks, color: 'bg-emerald-100 text-emerald-700' },
              ].map(s => (
                <span key={s.label} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.count} {s.label}</span>
              ))}
            </div>
            <Button size="sm" className="rounded-xl h-7 text-xs" onClick={() => { setEditingTask(null); setTaskForm({ title: '', description: '', priority: 'medium', due_date: '', assigned_to: '', quotation_id: '' }); setTaskDialogOpen(true); }}>
              <Plus className="h-3 w-3 mr-1" />Task
            </Button>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-10">
              <ListTodo className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No tasks yet</p>
              <Button size="sm" onClick={() => setTaskDialogOpen(true)} className="mt-3 rounded-xl text-xs">
                <Plus className="h-3.5 w-3.5 mr-1.5" />Create First Task
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {tasks.filter(t => t.status !== 'completed').concat(tasks.filter(t => t.status === 'completed').slice(0, 5)).map((task) => {
                const assignedMember = teamMembers.find(m => m.id === task.assigned_to);
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
                
                return (
                  <div key={task.id} className={`p-2.5 border rounded-xl ${task.status === 'completed' ? 'opacity-60' : ''} ${isOverdue ? 'border-red-200 bg-red-50/30' : ''}`}>
                    <div className="flex items-start gap-2">
                      {/* Status toggle */}
                      <button
                        className={`mt-0.5 h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          task.status === 'completed' ? 'border-emerald-500 bg-emerald-500' : task.status === 'in_progress' ? 'border-blue-500 bg-blue-100' : 'border-muted-foreground/30'
                        }`}
                        onClick={() => handleUpdateTaskStatus(task.id, task.status === 'completed' ? 'pending' : task.status === 'pending' ? 'in_progress' : 'completed')}
                      >
                        {task.status === 'completed' && <CheckCircle className="h-3 w-3 text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                        <div className="flex items-center flex-wrap gap-1.5 mt-1">
                          {task.priority && <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${priorityColors[task.priority] || ''}`}>{task.priority}</Badge>}
                          {assignedMember && <span className="text-[10px] text-muted-foreground">→ {assignedMember.name.split(' ')[0]}</span>}
                          {task.due_date && (
                            <span className={`text-[10px] flex items-center gap-0.5 ${isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                              <Calendar className="h-2.5 w-2.5" />
                              {new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        <button className="p-1 hover:bg-muted rounded-lg" onClick={() => {
                          setEditingTask(task);
                          setTaskForm({
                            title: task.title,
                            description: task.description || '',
                            priority: task.priority || 'medium',
                            due_date: task.due_date || '',
                            assigned_to: task.assigned_to || '',
                            quotation_id: task.quotation_id || '',
                          });
                          setTaskDialogOpen(true);
                        }}>
                          <Edit className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <button className="p-1 hover:bg-destructive/10 rounded-lg" onClick={() => handleDeleteTask(task.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Performance Tab - NEW */}
        <TabsContent value="performance" className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 bg-card border rounded-xl text-center">
              <TrendingUp className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold tabular-nums">{todayAttendance.length}</p>
              <p className="text-[10px] text-muted-foreground">Today's Check-ins</p>
            </div>
            <div className="p-2.5 bg-card border rounded-xl text-center">
              <Target className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
              <p className="text-lg font-bold tabular-nums">{completedTasks}</p>
              <p className="text-[10px] text-muted-foreground">Tasks Done</p>
            </div>
            <div className="p-2.5 bg-card border rounded-xl text-center">
              <Award className="h-4 w-4 text-amber-600 mx-auto mb-1" />
              <p className="text-lg font-bold tabular-nums">{tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}%</p>
              <p className="text-[10px] text-muted-foreground">Completion</p>
            </div>
          </div>

          <h3 className="text-sm font-semibold">Member Performance (7 days)</h3>
          <div className="space-y-1.5">
            {teamMembers.map((member) => {
              const hours = getMemberWeeklyHours(member.id);
              const taskStats = getMemberTaskStats(member.id);
              const daysPresent = weeklyAttendance.filter(a => a.team_member_id === member.id).length;
              const attendancePercent = Math.min(100, (daysPresent / 7) * 100);
              
              return (
                <div key={member.id} className="p-2.5 border rounded-xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm">{workTypes.find(t => t.value === member.work_type)?.icon}</span>
                      <p className="font-medium text-sm truncate">{member.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground tabular-nums">{hours}h</span>
                      <span className="text-[10px] text-muted-foreground">{daysPresent}/7 days</span>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Progress value={attendancePercent} className="h-1.5 flex-1" />
                    {taskStats.total > 0 && (
                      <span className="text-[10px] text-muted-foreground shrink-0">{taskStats.completed}/{taskStats.total} tasks</span>
                    )}
                  </div>
                </div>
              );
            })}
            {teamMembers.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Add members to see performance</p>}
          </div>
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="space-y-2">
          {memberRequests.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No pending requests</p>
              <p className="text-[10px] text-muted-foreground mt-1">When team members sign up, they'll appear here</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {memberRequests.map((request) => {
                const isPending = request.status === 'pending';
                const statusStyles: Record<string, string> = {
                  pending: 'bg-amber-100 text-amber-800',
                  approved: 'bg-emerald-100 text-emerald-800',
                  rejected: 'bg-red-100 text-red-800',
                  docs_requested: 'bg-blue-100 text-blue-800',
                };

                return (
                  <div key={request.id} className="p-2.5 border rounded-xl">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{request.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{workTypes.find(t => t.value === request.work_type)?.icon} {workTypes.find(t => t.value === request.work_type)?.label}</span>
                          <Badge className={`${statusStyles[request.status] || ''} text-[9px] h-4`}>{request.status}</Badge>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{new Date(request.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mb-1.5">
                      <Mail className="h-2.5 w-2.5 inline mr-0.5" />{request.email}
                      {request.phone && <span className="ml-2"><Phone className="h-2.5 w-2.5 inline mr-0.5" />{request.phone}</span>}
                    </div>
                    {request.rejection_reason && <p className="text-[10px] text-destructive bg-destructive/5 rounded-lg px-2 py-1 mb-1.5">Reason: {request.rejection_reason}</p>}
                    {request.docs_request_note && <p className="text-[10px] text-blue-700 bg-blue-50 rounded-lg px-2 py-1 mb-1.5">Note: {request.docs_request_note}</p>}
                    {isPending && (
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="flex-1 rounded-xl text-[10px] text-destructive border-destructive/30 h-7" onClick={() => openActionDialog(request, 'reject')}>Reject</Button>
                        <Button size="sm" variant="outline" className="flex-1 rounded-xl text-[10px] h-7" onClick={() => openActionDialog(request, 'docs_requested')}>Docs</Button>
                        <Button size="sm" className="flex-1 rounded-xl text-[10px] h-7" onClick={() => handleApproveRequest(request)}>Approve</Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Member Dialog */}
      <Dialog open={memberDialogOpen} onOpenChange={(open) => {
        setMemberDialogOpen(open);
        if (!open) { setEditingMember(null); setMemberForm({ name: '', phone: '', work_type: 'labour', project_id: '', password: '' }); }
      }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">{editingMember ? 'Edit' : 'Add'} Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Full Name *</Label>
              <Input value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} placeholder="Enter full name" className="rounded-xl h-9" />
              {memberForm.name && companyName && (
                <p className="text-[10px] text-muted-foreground">Email: <span className="font-medium text-foreground">{generateEmail(memberForm.name)}</span></p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input value={memberForm.phone} onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} placeholder="Phone number" className="rounded-xl h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Work Type *</Label>
              <Select value={memberForm.work_type} onValueChange={(v) => setMemberForm({ ...memberForm, work_type: v })}>
                <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {workTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.icon} {type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!editingMember && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Login Password *</Label>
                  <Input type="password" value={memberForm.password} onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })} placeholder="Min 6 characters" className="rounded-xl h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Assign to Project</Label>
                  <Select value={memberForm.project_id || "none"} onValueChange={(v) => setMemberForm({ ...memberForm, project_id: v === "none" ? "" : v })}>
                    <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {quotations.map((q) => (<SelectItem key={q.id} value={q.id}>{q.project_name} - {q.client_name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberDialogOpen(false)} className="rounded-xl h-9 text-xs">Cancel</Button>
            <Button onClick={handleAddMember} disabled={creatingAuth} className="rounded-xl h-9 text-xs">
              {creatingAuth ? 'Creating...' : editingMember ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={(open) => {
        setTaskDialogOpen(open);
        if (!open) { setEditingTask(null); setTaskForm({ title: '', description: '', priority: 'medium', due_date: '', assigned_to: '', quotation_id: '' }); }
      }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">{editingTask ? 'Edit' : 'New'} Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Title *</Label>
              <Input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Task title" className="rounded-xl h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="Details..." rows={2} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Priority</Label>
                <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}>
                  <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">🔴 High</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="low">🟢 Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Due Date</Label>
                <Input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} className="rounded-xl h-9" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Assign To</Label>
              <Select value={taskForm.assigned_to || "none"} onValueChange={(v) => setTaskForm({ ...taskForm, assigned_to: v === "none" ? "" : v })}>
                <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {teamMembers.map((m) => (<SelectItem key={m.id} value={m.id}>{workTypes.find(t => t.value === m.work_type)?.icon} {m.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Project</Label>
              <Select value={taskForm.quotation_id || "none"} onValueChange={(v) => setTaskForm({ ...taskForm, quotation_id: v === "none" ? "" : v })}>
                <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Link to project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {quotations.map((q) => (<SelectItem key={q.id} value={q.id}>{q.project_name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)} className="rounded-xl h-9 text-xs">Cancel</Button>
            <Button onClick={handleSaveTask} className="rounded-xl h-9 text-xs">{editingTask ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Team Dialog */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl">
          <DialogHeader><DialogTitle className="text-base">Create Project Team</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Select Project *</Label>
              <Select value={teamForm.project_id} onValueChange={(v) => setTeamForm({ ...teamForm, project_id: v })}>
                <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Choose a project" /></SelectTrigger>
                <SelectContent>
                  {quotations.map((q) => (<SelectItem key={q.id} value={q.id}>{q.project_name} - {q.client_name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Select Members *</Label>
              <div className="border rounded-xl p-2 max-h-52 overflow-y-auto space-y-1">
                {teamMembers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No members yet.</p>
                ) : (
                  teamMembers.map((member) => (
                    <label key={member.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${teamForm.selectedMembers.includes(member.id) ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'}`}>
                      <input type="checkbox" checked={teamForm.selectedMembers.includes(member.id)} onChange={() => toggleMemberSelection(member.id)} className="rounded" />
                      <span className="text-sm">{workTypes.find(t => t.value === member.work_type)?.icon}</span>
                      <span className="text-sm font-medium truncate">{member.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamDialogOpen(false)} className="rounded-xl h-9 text-xs">Cancel</Button>
            <Button onClick={handleCreateTeam} className="rounded-xl h-9 text-xs">Create Team</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject/Docs Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">{actionType === 'reject' ? 'Reject Request' : 'Request Documentation'}</DialogTitle>
            <DialogDescription className="text-xs">{actionType === 'reject' ? `Reject ${selectedRequest?.name}'s request.` : `Ask ${selectedRequest?.name} for documents.`}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">{actionType === 'reject' ? 'Reason (optional)' : 'What documents?'}</Label>
            <Textarea value={actionNote} onChange={(e) => setActionNote(e.target.value)} placeholder={actionType === 'reject' ? 'Reason...' : 'ID proof, certificate...'} rows={2} className="rounded-xl" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)} className="rounded-xl h-9 text-xs">Cancel</Button>
            <Button variant={actionType === 'reject' ? 'destructive' : 'default'} onClick={handleRejectOrDocsRequest} className="rounded-xl h-9 text-xs">{actionType === 'reject' ? 'Reject' : 'Send'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Org Code Dialog */}
      <Dialog open={orgCodeDialogOpen} onOpenChange={setOrgCodeDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Organization Code</DialogTitle>
            <DialogDescription className="text-xs">Set a unique code for team members to find you during signup.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input value={orgCodeInput} onChange={(e) => setOrgCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} placeholder="e.g. MYORG23" className="font-mono tracking-wider rounded-xl h-9" maxLength={8} />
              <Button variant="outline" size="icon" onClick={generateUniqueCode} className="shrink-0 rounded-xl h-9 w-9"><RefreshCw className="h-3.5 w-3.5" /></Button>
            </div>
            <p className="text-[10px] text-muted-foreground">3-8 characters, letters & numbers only</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrgCodeDialogOpen(false)} className="rounded-xl h-9 text-xs">Cancel</Button>
            <Button onClick={handleSaveOrgCode} disabled={orgCodeInput.trim().length < 3} className="rounded-xl h-9 text-xs">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Team;
