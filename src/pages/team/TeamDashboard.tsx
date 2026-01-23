import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, MapPin, LogOut, CheckCircle, Calendar, Briefcase, Play, Square, Navigation, Circle, Ruler } from "lucide-react";
import { getAddressFromCoords } from "@/lib/geocoding";
import * as awsApi from "@/lib/awsApi";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  work_type: string;
  company_id: string;
}

interface Attendance {
  id: string;
  clock_in: string;
  clock_out: string | null;
  clock_in_location: any;
  clock_out_location: any;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  due_date: string | null;
}

interface ProjectAssignment {
  id: string;
  quotation_id: string;
  quotations: {
    project_name: string;
    client_name: string;
    place_of_project: string | null;
  };
}

interface SiteMeasurementProject {
  id: string;
  client_name: string;
  site_location: string | null;
  status: string;
  room_count: number;
  total_area: number;
}

const TeamDashboard = () => {
  const navigate = useNavigate();
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<Attendance[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignedProjects, setAssignedProjects] = useState<ProjectAssignment[]>([]);
  const [siteMeasurementProjects, setSiteMeasurementProjects] = useState<SiteMeasurementProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  // Set up real-time subscription after teamMember is loaded
  useEffect(() => {
    if (!teamMember) return;

    // Real-time subscription for tasks assigned to this member (Supabase fallback)
    const tasksChannel = supabase
      .channel(`member-tasks-${teamMember.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `assigned_to=eq.${teamMember.id}`
      }, () => {
        fetchTasks(teamMember.id);
      })
      .subscribe();

    // Real-time subscription for site measurement projects assigned to this member
    const projectsChannel = supabase
      .channel(`member-projects-${teamMember.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'site_measurement_projects',
        filter: `assigned_to=eq.${teamMember.id}`
      }, () => {
        fetchSiteMeasurementProjects(teamMember.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(projectsChannel);
    };
  }, [teamMember?.id]);

  const checkAuthAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/team/login');
      return;
    }

    // Try to get team member profile from AWS first
    try {
      const awsResult = await awsApi.getTeamMemberByUserId(user.id);
      if (awsResult.success && awsResult.data) {
        const member = {
          id: awsResult.data.member_id,
          name: awsResult.data.name,
          email: awsResult.data.email,
          work_type: awsResult.data.work_type,
          company_id: awsResult.data.company_id,
        };
        setTeamMember(member);

        // Get company name
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_name')
          .eq('id', member.company_id)
          .single();
        
        if (profile?.company_name) {
          setCompanyName(profile.company_name);
        }

        await Promise.all([
          fetchTodayAttendance(member.id),
          fetchRecentAttendance(member.id),
          fetchTasks(member.id),
          fetchAssignedProjects(member.id),
          fetchSiteMeasurementProjects(member.id),
        ]);

        setLoading(false);
        return;
      }
    } catch (error) {
      console.log('AWS fetch failed, falling back to Supabase:', error);
    }

    // Fallback to Supabase
    const { data: member, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !member) {
      toast.error("Team member profile not found");
      navigate('/team/login');
      return;
    }

    setTeamMember(member);

    // Get company name
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_name')
      .eq('id', member.company_id)
      .single();
    
    if (profile?.company_name) {
      setCompanyName(profile.company_name);
    }

    await Promise.all([
      fetchTodayAttendance(member.id),
      fetchRecentAttendance(member.id),
      fetchTasks(member.id),
      fetchAssignedProjects(member.id),
      fetchSiteMeasurementProjects(member.id),
    ]);

    setLoading(false);
  };

  // Fetch assigned projects from AWS
  const fetchAssignedProjects = async (memberId: string) => {
    try {
      const result = await awsApi.listTeamAssignmentsByMember(memberId);
      if (result.success && result.data) {
        // Need to fetch quotation details for each assignment
        const projectsWithDetails: ProjectAssignment[] = [];
        
        for (const assignment of result.data) {
          try {
            const quotationResult = await awsApi.getQuotation(assignment.quotation_id);
            if (quotationResult.success && quotationResult.data) {
              projectsWithDetails.push({
                id: assignment.assignment_id,
                quotation_id: assignment.quotation_id,
                quotations: {
                  project_name: quotationResult.data.quotation_title || '',
                  client_name: quotationResult.data.client_name || '',
                  place_of_project: quotationResult.data.place_of_project || null,
                },
              });
            }
          } catch (e) {
            console.error('Error fetching quotation:', e);
          }
        }
        
        setAssignedProjects(projectsWithDetails);
        return;
      }
    } catch (error) {
      console.log('AWS fetch failed, falling back to Supabase:', error);
    }

    // Fallback to Supabase
    const { data } = await supabase
      .from('team_project_assignments')
      .select(`
        id,
        quotation_id,
        quotations:quotation_id(project_name, client_name, place_of_project)
      `)
      .eq('team_member_id', memberId);

    if (data) {
      setAssignedProjects(data as unknown as ProjectAssignment[]);
    }
  };

  // Fetch site measurement projects from AWS
  const fetchSiteMeasurementProjects = async (memberId: string) => {
    try {
      const result = await awsApi.listMeasurements(teamMember?.company_id || '');
      if (result.success && result.data) {
        const filtered = result.data
          .filter((m: any) => m.assigned_to === memberId)
          .map((m: any) => ({
            id: m.measurement_id,
            client_name: m.client_name,
            site_location: m.site_location || null,
            status: m.status || 'pending',
            room_count: m.room_count || 0,
            total_area: m.total_area || 0,
          }));
        setSiteMeasurementProjects(filtered);
        return;
      }
    } catch (error) {
      console.log('AWS fetch failed, falling back to Supabase:', error);
    }

    // Fallback to Supabase
    const { data } = await supabase
      .from('site_measurement_projects')
      .select('id, client_name, site_location, status, room_count, total_area')
      .eq('assigned_to', memberId)
      .order('updated_at', { ascending: false });

    if (data) {
      setSiteMeasurementProjects(data);
    }
  };

  // Fetch today's attendance from AWS
  const fetchTodayAttendance = async (memberId: string) => {
    try {
      const result = await awsApi.getTodayAttendance(memberId);
      if (result.success && result.data) {
        setTodayAttendance({
          id: result.data.attendance_id,
          clock_in: result.data.clock_in,
          clock_out: result.data.clock_out || null,
          clock_in_location: result.data.clock_in_location || null,
          clock_out_location: result.data.clock_out_location || null,
        });
        return;
      }
    } catch (error) {
      console.log('AWS fetch failed, falling back to Supabase:', error);
    }

    // Fallback to Supabase
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('team_member_id', memberId)
      .gte('clock_in', today.toISOString())
      .order('clock_in', { ascending: false })
      .limit(1)
      .maybeSingle();

    setTodayAttendance(data);
  };

  // Fetch recent attendance from AWS
  const fetchRecentAttendance = async (memberId: string) => {
    try {
      const result = await awsApi.listAttendanceByMember(memberId, 7);
      if (result.success && result.data) {
        const mapped = result.data.map((a: any) => ({
          id: a.attendance_id,
          clock_in: a.clock_in,
          clock_out: a.clock_out || null,
          clock_in_location: a.clock_in_location || null,
          clock_out_location: a.clock_out_location || null,
        }));
        setRecentAttendance(mapped);
        return;
      }
    } catch (error) {
      console.log('AWS fetch failed, falling back to Supabase:', error);
    }

    // Fallback to Supabase
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('team_member_id', memberId)
      .order('clock_in', { ascending: false })
      .limit(7);

    setRecentAttendance(data || []);
  };

  // Fetch tasks from AWS
  const fetchTasks = async (memberId: string) => {
    try {
      const result = await awsApi.listTasksByMember(memberId);
      if (result.success && result.data) {
        const mapped = result.data.map((t: any) => ({
          id: t.task_id,
          title: t.title,
          description: t.description || null,
          status: t.status,
          priority: t.priority || null,
          due_date: t.due_date || null,
        }));
        setTasks(mapped);
        return;
      }
    } catch (error) {
      console.log('AWS fetch failed, falling back to Supabase:', error);
    }

    // Fallback to Supabase
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', memberId)
      .order('status', { ascending: true })
      .order('due_date', { ascending: true });

    setTasks(data || []);
  };

  const getCurrentLocation = async (): Promise<{ lat: number; lng: number; address?: string }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Get area name
          const address = await getAddressFromCoords(lat, lng);
          
          resolve({ lat, lng, address });
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const handleClockIn = async () => {
    if (!teamMember) return;
    setClockingIn(true);

    try {
      let location = null;
      try {
        location = await getCurrentLocation();
        toast.info(`Location: ${location.address || 'Captured'}`);
      } catch (locError) {
        console.log("Location not available:", locError);
      }

      const attendanceId = `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create in AWS
      const result = await awsApi.createAttendance({
        attendance_id: attendanceId,
        company_id: teamMember.company_id,
        team_member_id: teamMember.id,
        clock_in: new Date().toISOString(),
        clock_in_location: location || undefined,
      });

      if (!result.success) throw new Error(result.error);

      // Also create in Supabase for fallback
      await supabase
        .from('attendance')
        .insert({
          team_member_id: teamMember.id,
          clock_in: new Date().toISOString(),
          clock_in_location: location,
        });

      toast.success("Clocked in successfully!");
      await fetchTodayAttendance(teamMember.id);
      await fetchRecentAttendance(teamMember.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to clock in");
    } finally {
      setClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    if (!teamMember || !todayAttendance) return;
    setClockingOut(true);

    try {
      let location = null;
      try {
        location = await getCurrentLocation();
        toast.info(`Location: ${location.address || 'Captured'}`);
      } catch (locError) {
        console.log("Location not available:", locError);
      }

      // Update in AWS
      const result = await awsApi.updateAttendance(todayAttendance.id, {
        clock_out: new Date().toISOString(),
        clock_out_location: location || undefined,
      });

      if (!result.success) throw new Error(result.error);

      // Also update in Supabase for fallback
      await supabase
        .from('attendance')
        .update({
          clock_out: new Date().toISOString(),
          clock_out_location: location,
        })
        .eq('id', todayAttendance.id);

      toast.success("Clocked out successfully!");
      await fetchTodayAttendance(teamMember.id);
      await fetchRecentAttendance(teamMember.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to clock out");
    } finally {
      setClockingOut(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/team/login');
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
      } else {
        updates.completed_at = undefined;
      }

      // Update in AWS
      const result = await awsApi.updateTask(taskId, updates);
      if (!result.success) throw new Error(result.error);

      // Also update in Supabase for fallback
      const supabaseUpdates: any = { status: newStatus };
      if (newStatus === 'completed') {
        supabaseUpdates.completed_at = new Date().toISOString();
      } else {
        supabaseUpdates.completed_at = null;
      }

      await supabase
        .from('tasks')
        .update(supabaseUpdates)
        .eq('id', taskId);

      if (teamMember) {
        await fetchTasks(teamMember.id);
      }
    } catch (error: any) {
      toast.error("Error updating task");
    }
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

  const formatLocationAddress = (location: any) => {
    if (!location) return null;
    return location.address || (location.lat && location.lng ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : null);
  };

  const isClockDisabled = () => {
    const now = new Date();
    const hours = now.getHours();
    // Allow clock in/out only between 6 AM and 10 PM
    return hours < 6 || hours >= 22;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">{teamMember?.name}</h1>
          <p className="text-sm text-muted-foreground">{companyName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      <div className="space-y-4">
        {/* Clock In/Out Card */}
        <Card className="border-2 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              {!todayAttendance ? (
                <>
                  <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                    <Play className="h-10 w-10 text-green-600" />
                  </div>
                  <Button 
                    size="lg" 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handleClockIn}
                    disabled={clockingIn || isClockDisabled()}
                  >
                    {clockingIn ? 'Getting location...' : 'Clock In'}
                  </Button>
                </>
              ) : !todayAttendance.clock_out ? (
                <>
                  <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center">
                    <Square className="h-10 w-10 text-red-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Working since</p>
                    <p className="text-2xl font-bold tabular-nums">{formatTime(todayAttendance.clock_in)}</p>
                    <p className="text-lg font-medium text-primary tabular-nums">
                      {calculateDuration(todayAttendance.clock_in, null)}
                    </p>
                  </div>
                  <Button 
                    size="lg" 
                    variant="destructive"
                    className="w-full"
                    onClick={handleClockOut}
                    disabled={clockingOut || isClockDisabled()}
                  >
                    {clockingOut ? 'Getting location...' : 'Clock Out'}
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                    <CheckCircle className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Today's shift completed</p>
                    <p className="text-lg font-medium tabular-nums">
                      {formatTime(todayAttendance.clock_in)} - {formatTime(todayAttendance.clock_out)}
                    </p>
                    <p className="text-2xl font-bold text-primary tabular-nums">
                      {calculateDuration(todayAttendance.clock_in, todayAttendance.clock_out)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today's Attendance Details */}
        {todayAttendance && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Today's Attendance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Clock In</span>
                <span className="font-medium">{formatTime(todayAttendance.clock_in)}</span>
              </div>
              {todayAttendance.clock_in_location && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="text-xs text-right max-w-[60%] truncate">
                    {formatLocationAddress(todayAttendance.clock_in_location)}
                  </span>
                </div>
              )}
              {todayAttendance.clock_out && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Clock Out</span>
                    <span className="font-medium">{formatTime(todayAttendance.clock_out)}</span>
                  </div>
                  {todayAttendance.clock_out_location && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location</span>
                      <span className="text-xs text-right max-w-[60%] truncate">
                        {formatLocationAddress(todayAttendance.clock_out_location)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Site Measurement Projects */}
        {siteMeasurementProjects.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                Site Measurement Projects ({siteMeasurementProjects.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {siteMeasurementProjects.map((project) => (
                <div 
                  key={project.id}
                  className="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => navigate(`/site-measurement/${project.id}`)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{project.client_name}</p>
                      {project.site_location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Navigation className="h-3 w-3" />
                          {project.site_location}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {project.room_count} rooms
                    </Badge>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Total: {project.total_area.toFixed(0)} sqft</span>
                    <Badge variant={project.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                      {project.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Assigned Projects */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Assigned Projects ({assignedProjects.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assignedProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No assigned projects</p>
            ) : (
              <div className="space-y-2">
                {assignedProjects.map((assignment) => (
                  <div 
                    key={assignment.id}
                    className="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => navigate(`/team/project/${assignment.quotation_id}`)}
                  >
                    <p className="font-medium text-sm">{assignment.quotations.project_name}</p>
                    <p className="text-xs text-muted-foreground">{assignment.quotations.client_name}</p>
                    {assignment.quotations.place_of_project && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Navigation className="h-3 w-3" />
                        {assignment.quotations.place_of_project}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Your Tasks ({tasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No tasks assigned</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div 
                    key={task.id}
                    className="p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                        )}
                        <div className="flex gap-2 mt-2">
                          {task.priority && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                task.priority === 'high' ? 'border-red-300 text-red-700' :
                                task.priority === 'medium' ? 'border-yellow-300 text-yellow-700' :
                                'border-green-300 text-green-700'
                              }`}
                            >
                              {task.priority}
                            </Badge>
                          )}
                          {task.due_date && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(task.due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleUpdateTaskStatus(
                          task.id, 
                          task.status === 'completed' ? 'pending' : 'completed'
                        )}
                      >
                        {task.status === 'completed' ? (
                          <Circle className="h-5 w-5" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                      </Button>
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
            {recentAttendance.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No attendance records</p>
            ) : (
              <div className="space-y-2">
                {recentAttendance.slice(0, 5).map((record, index) => (
                  <div key={record.id || index} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{formatDate(record.clock_in)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(record.clock_in)} - {record.clock_out ? formatTime(record.clock_out) : 'Working'}
                      </p>
                    </div>
                    <p className="text-sm font-medium tabular-nums">
                      {calculateDuration(record.clock_in, record.clock_out)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamDashboard;
