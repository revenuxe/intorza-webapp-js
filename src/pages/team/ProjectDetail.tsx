import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import * as awsApi from "@/lib/awsApi";

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
  }, [projectId]);

  const checkAuthAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setUser(user);
    await fetchProjectData(user.id);
    setLoading(false);
  };

  const fetchProjectData = async (companyId: string) => {
    if (!projectId) return;

    // Fetch quotation from AWS
    try {
      const quotationResult = await awsApi.getQuotation(projectId);
      if (quotationResult.success && quotationResult.data) {
        const q = quotationResult.data;
        setQuotation({
          id: q.quotation_id,
          project_name: q.quotation_title || '',
          client_name: q.client_name || '',
          client_address: q.client_address || null,
          place_of_project: q.place_of_project || null,
          status: q.status || 'draft',
          project_deadline: q.project_deadline || null,
          grand_total: q.grand_total || null,
        });
      }
    } catch (error) {
      console.error('Error fetching quotation:', error);
    }

    // Fetch assigned members from AWS
    await fetchMembers();
    
    // Fetch tasks from AWS
    await fetchTasks();
  };

  const fetchMembers = async () => {
    if (!projectId) return;
    
    try {
      const result = await awsApi.listTeamAssignmentsByProject(projectId);
      if (result.success && result.data) {
        // Need to get member details for each assignment
        const membersList: TeamMember[] = [];
        
        for (const assignment of result.data) {
          try {
            const memberResult = await awsApi.getTeamMember(assignment.team_member_id);
            if (memberResult.success && memberResult.data) {
              membersList.push({
                id: memberResult.data.member_id,
                name: memberResult.data.name,
                work_type: memberResult.data.work_type,
                assignmentId: assignment.assignment_id,
              });
            }
          } catch (e) {
            console.error('Error fetching member:', e);
          }
        }
        
        setMembers(membersList);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchTasks = async () => {
    if (!projectId) return;

    try {
      const result = await awsApi.listTasksByProject(projectId);
      if (result.success && result.data) {
        const mapped = result.data.map((t: any) => ({
          id: t.task_id,
          title: t.title,
          description: t.description || null,
          status: t.status,
          priority: t.priority || null,
          due_date: t.due_date || null,
          assigned_to: t.assigned_to || null,
          completed_at: t.completed_at || null,
          created_at: t.created_at || new Date().toISOString(),
        }));
        setTasks(mapped);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchAttendance = async () => {
    if (!projectId || members.length === 0) return;

    const memberIds = members.map(m => m.id);
    
    try {
      const result = await awsApi.listAttendanceByMembers(memberIds, 7);
      if (result.success && result.data) {
        const mapped = result.data.map((a: any) => ({
          id: a.attendance_id,
          clock_in: a.clock_in,
          clock_out: a.clock_out || null,
          clock_in_location: a.clock_in_location || null,
          clock_out_location: a.clock_out_location || null,
          team_member_id: a.team_member_id,
        }));
        setAttendance(mapped);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
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
      const taskId = editingTask?.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      if (editingTask) {
        // Update in AWS
        const result = await awsApi.updateTask(taskId, {
          title: taskForm.title,
          description: taskForm.description || undefined,
          priority: taskForm.priority,
          due_date: taskForm.due_date || undefined,
          assigned_to: taskForm.assigned_to || undefined,
        });

        if (!result.success) throw new Error(result.error);
        toast.success("Task updated");
      } else {
        // Create in AWS
        const result = await awsApi.createTask({
          task_id: taskId,
          company_id: user.id,
          quotation_id: projectId,
          title: taskForm.title,
          description: taskForm.description || undefined,
          priority: taskForm.priority,
          due_date: taskForm.due_date || undefined,
          assigned_to: taskForm.assigned_to || undefined,
          status: 'pending',
        });

        if (!result.success) throw new Error(result.error);
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
      const result = await awsApi.deleteTask(taskId);
      if (!result.success) throw new Error(result.error);
      
      toast.success("Task deleted");
      fetchTasks();
    } catch (error: any) {
      toast.error("Error deleting task");
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    try {
      const updates: any = { status };
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      } else {
        updates.completed_at = undefined;
      }

      const result = await awsApi.updateTask(taskId, updates);
      if (!result.success) throw new Error(result.error);
      
      fetchTasks();
    } catch (error: any) {
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
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Project Progress</span>
                <span className="font-medium">{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Project Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Project Details</CardTitle>
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
            <div className="flex items-center gap-2">
              <Badge variant="outline">{quotation.status}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Tasks ({tasks.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No tasks yet. Add your first task!</p>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => {
                  const assignedMember = members.find(m => m.id === task.assigned_to);
                  
                  return (
                    <div key={task.id} className="p-3 border rounded-lg">
                      <div className="flex items-start gap-3">
                        <button onClick={() => handleUpdateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}>
                          {getStatusIcon(task.status)}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {task.priority && (
                              <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </Badge>
                            )}
                            {task.due_date && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(task.due_date)}
                              </span>
                            )}
                            {assignedMember && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {assignedMember.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTask(task)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteTask(task.id)}>
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
            <CardTitle className="text-sm">Team Members ({members.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No team members assigned</p>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{member.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {workTypes[member.work_type] || member.work_type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Attendance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              {attendance.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No attendance records</p>
              ) : (
                <div className="space-y-2">
                  {attendance.map((record) => {
                    const member = members.find(m => m.id === record.team_member_id);
                    
                    return (
                      <div key={record.id} className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm">{member?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(record.clock_in)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div>
                            <p>In: {formatTime(record.clock_in)}</p>
                            {record.clock_in_location && (
                              <p className="flex items-center gap-1 mt-0.5 truncate">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{formatLocationAddress(record.clock_in_location)}</span>
                              </p>
                            )}
                          </div>
                          <div>
                            <p>Out: {record.clock_out ? formatTime(record.clock_out) : 'Working'}</p>
                            {record.clock_out_location && (
                              <p className="flex items-center gap-1 mt-0.5 truncate">
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
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ProjectDetail;
