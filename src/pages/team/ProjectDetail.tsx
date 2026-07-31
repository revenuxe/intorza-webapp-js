import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { tasksApi, quotationsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  ArrowLeft, Calendar, MapPin, Users, Clock, Plus, CheckCircle2, 
  Circle, AlertCircle, Trash2, Edit, Target, TrendingUp
} from "lucide-react";

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

interface TeamMember {
  id: string;
  name: string;
  work_type: string;
  assignmentId: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  due_date: string | null;
  assigned_to: string | null;
  completed_at: string | null;
  created_at: string;
}

interface Attendance {
  id: string;
  clock_in: string;
  clock_out: string | null;
  clock_in_location: any;
  clock_out_location: any;
  team_member_id: string;
}

const workTypes: Record<string, string> = {
  carpenter: 'Carpenter',
  labour: 'Labour',
  plumber: 'Plumber',
  electrician: 'Electrician',
  painter: 'Painter',
  mason: 'Mason',
  welder: 'Welder',
  supervisor: 'Supervisor',
  helper: 'Helper',
  driver: 'Driver',
  other: 'Other',
};

const ProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [user, setUser] = useState<any>(null);

  // Task form
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    assigned_to: '',
  });

  useEffect(() => {
    checkAuthAndFetch();

    // Polls rather than using a supabase.channel() postgres_changes subscription
    // so other team members' task edits show up without a realtime wiring pass.
    const interval = setInterval(() => {
      if (projectId) fetchTasks();
    }, 20000);

    return () => clearInterval(interval);
  }, [projectId]);

  const checkAuthAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setUser(user);
    await fetchProjectData();
    setLoading(false);
  };

  const fetchProjectData = async () => {
    if (!projectId) return;

    // Fetch quotation
    const { data: quotationData } = await quotationsApi.get(projectId);
    if (quotationData) {
      setQuotation(quotationData);
    }

    const { data: assignments } = await supabase
      .from('team_project_assignments')
      .select(`
        id,
        team_member_id,
        team_members:team_member_id(id, name, work_type)
      `)
      .eq('quotation_id', projectId);

    if (assignments) {
      const membersList = assignments
        .filter(a => a.team_members)
        .map(a => ({
          ...(a.team_members as any),
          assignmentId: a.id,
        }));
      setMembers(membersList);
    }

    await fetchTasks();
    await fetchAttendance();
  };

  const fetchTasks = async () => {
    if (!projectId) return;

    const { data } = await tasksApi.list();
    const projectTasks = ((data || []) as (Task & { quotation_id: string | null })[])
      .filter((t) => t.quotation_id === projectId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setTasks(projectTasks);
  };

  const fetchAttendance = async () => {
    if (!projectId || members.length === 0) return;

    const memberIds = new Set(members.map(m => m.id));
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data } = await supabase
      .from('attendance')
      .select('*')
      .in('team_member_id', Array.from(memberIds))
      .gte('clock_in', sevenDaysAgo.toISOString())
      .order('clock_in', { ascending: false });

    setAttendance(data || []);
  };

  useEffect(() => {
    if (members.length > 0) {
      fetchAttendance();
    }
  }, [members]);

  const handleCreateTask = async () => {
    if (!taskForm.title || !user || !projectId) {
      toast.error("Task title is required");
      return;
    }

    try {
      if (editingTask) {
        await tasksApi.update(editingTask.id, {
          title: taskForm.title,
          description: taskForm.description || null,
          priority: taskForm.priority,
          due_date: taskForm.due_date || null,
          assigned_to: taskForm.assigned_to || null,
        });
        toast.success("Task updated");
      } else {
        await tasksApi.create({
          title: taskForm.title,
          description: taskForm.description || null,
          priority: taskForm.priority,
          due_date: taskForm.due_date || null,
          assigned_to: taskForm.assigned_to || null,
          quotation_id: projectId,
        });
        toast.success("Task created");
      }

      setTaskDialogOpen(false);
      setEditingTask(null);
      setTaskForm({ title: '', description: '', priority: 'medium', due_date: '', assigned_to: '' });
      fetchTasks();
    } catch (error: any) {
      toast.error(error.message || "Error saving task");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await tasksApi.remove(taskId);
      toast.success("Task deleted");
      fetchTasks();
    } catch {
      toast.error("Error deleting task");
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    const updates: any = { status };
    updates.completed_at = status === 'completed' ? new Date().toISOString() : null;

    try {
      await tasksApi.update(taskId, updates);
      fetchTasks();
    } catch {
      toast.error("Error updating task");
    }
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'medium',
      due_date: task.due_date || '',
      assigned_to: task.assigned_to || '',
    });
    setTaskDialogOpen(true);
  };

  // Calculate project progress
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate days remaining
  const getDaysRemaining = () => {
    if (!quotation?.project_deadline) return null;
    const deadline = new Date(quotation.project_deadline);
    const today = new Date();
    const diff = deadline.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = getDaysRemaining();

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatLocationAddress = (location: any) => {
    if (!location) return null;
    return location.address || (location.lat && location.lng ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : null);
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'in_progress': return <Clock className="h-5 w-5 text-blue-600" />;
      default: return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex items-center h-14 px-4 gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/team')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold truncate">{quotation.project_name}</h1>
            <p className="text-xs text-muted-foreground">{quotation.client_name}</p>
          </div>
          <Dialog open={taskDialogOpen} onOpenChange={(open) => {
            setTaskDialogOpen(open);
            if (!open) {
              setEditingTask(null);
              setTaskForm({ title: '', description: '', priority: 'medium', due_date: '', assigned_to: '' });
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingTask ? 'Edit Task' : 'Create Task'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    placeholder="Task title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    placeholder="Task description"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={taskForm.due_date}
                      onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Select 
                    value={taskForm.assigned_to || "unassigned"} 
                    onValueChange={(v) => setTaskForm({ ...taskForm, assigned_to: v === "unassigned" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} ({workTypes[member.work_type] || member.work_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateTask}>{editingTask ? 'Update' : 'Create'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6 pb-24">
        {/* Project Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold tabular-nums">{progressPercentage}%</p>
                  <p className="text-xs text-muted-foreground">Complete</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold tabular-nums">{completedTasks}/{totalTasks}</p>
                  <p className="text-xs text-muted-foreground">Tasks Done</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold tabular-nums">{members.length}</p>
                  <p className="text-xs text-muted-foreground">Team Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={daysRemaining !== null && daysRemaining < 7 ? "border-orange-200 bg-orange-50/50" : ""}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Calendar className={`h-5 w-5 ${daysRemaining !== null && daysRemaining < 7 ? 'text-orange-600' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-2xl font-bold tabular-nums">
                    {daysRemaining !== null ? (daysRemaining < 0 ? 'Overdue' : `${daysRemaining}d`) : '--'}
                  </p>
                  <p className="text-xs text-muted-foreground">Days Left</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Project Progress</p>
              <p className="text-sm text-muted-foreground">{progressPercentage}%</p>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </CardContent>
        </Card>

        {/* Project Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quotation.place_of_project && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{quotation.place_of_project}</span>
              </div>
            )}
            {quotation.project_deadline && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Deadline: {new Date(quotation.project_deadline).toLocaleDateString()}</span>
              </div>
            )}
            {quotation.grand_total && (
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span>Value: ₹{quotation.grand_total.toLocaleString()}</span>
              </div>
            )}
            <Badge variant="outline">{quotation.status}</Badge>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Tasks ({tasks.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No tasks yet. Create your first task to get started.
              </p>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => {
                  const assignedMember = members.find(m => m.id === task.assigned_to);
                  return (
                    <div 
                      key={task.id} 
                      className={`p-4 rounded-lg border transition-colors ${
                        task.status === 'completed' ? 'bg-green-50/50 border-green-200' : 'bg-muted/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button onClick={() => handleUpdateTaskStatus(
                          task.id, 
                          task.status === 'completed' ? 'pending' : 'completed'
                        )}>
                          {getStatusIcon(task.status)}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge variant="outline" className={getPriorityColor(task.priority)}>
                              {task.priority || 'medium'}
                            </Badge>
                            {task.due_date && (
                              <Badge variant="outline" className="text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatDate(task.due_date)}
                              </Badge>
                            )}
                            {assignedMember && (
                              <Badge variant="secondary" className="text-xs">
                                {assignedMember.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditTask(task)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members.map((member) => {
                const memberTodayAtt = attendance.find(a => {
                  const today = new Date().toDateString();
                  return a.team_member_id === member.id && 
                    new Date(a.clock_in).toDateString() === today;
                });
                const isWorking = memberTodayAtt && !memberTodayAtt.clock_out;

                return (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{member.name}</p>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {workTypes[member.work_type] || member.work_type}
                      </Badge>
                    </div>
                    <div className="text-right">
                      {isWorking ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Clock className="h-3 w-3 mr-1" />
                          Working
                        </Badge>
                      ) : memberTodayAtt ? (
                        <p className="text-xs text-muted-foreground">
                          {formatTime(memberTodayAtt.clock_in)} - {formatTime(memberTodayAtt.clock_out!)}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Not clocked in</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Attendance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {attendance.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No attendance records</p>
              ) : (
                <div className="space-y-2">
                  {attendance.slice(0, 20).map((record) => {
                    const member = members.find(m => m.id === record.team_member_id);
                    return (
                      <div key={record.id} className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm">{member?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(record.clock_in).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div>
                            <p>In: {formatTime(record.clock_in)}</p>
                            {record.clock_in_location && (
                              <p className="truncate">{formatLocationAddress(record.clock_in_location)}</p>
                            )}
                          </div>
                          <div>
                            <p>Out: {record.clock_out ? formatTime(record.clock_out) : 'Working'}</p>
                            {record.clock_out_location && (
                              <p className="truncate">{formatLocationAddress(record.clock_out_location)}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ProjectDetail;
