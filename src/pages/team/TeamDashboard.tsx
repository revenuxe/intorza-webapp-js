import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, MapPin, LogOut, CheckCircle, Calendar, Briefcase, Play, Square, Navigation } from "lucide-react";
import { getAddressFromCoords } from "@/lib/geocoding";

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

const TeamDashboard = () => {
  const navigate = useNavigate();
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<Attendance[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignedProjects, setAssignedProjects] = useState<ProjectAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/team/login');
      return;
    }

    // Get team member profile
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
    ]);

    setLoading(false);
  };

  const fetchAssignedProjects = async (memberId: string) => {
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

  const fetchTodayAttendance = async (memberId: string) => {
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

  const fetchRecentAttendance = async (memberId: string) => {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('team_member_id', memberId)
      .order('clock_in', { ascending: false })
      .limit(7);

    setRecentAttendance(data || []);
  };

  const fetchTasks = async (memberId: string) => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', memberId)
      .neq('status', 'completed')
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

      const { error } = await supabase
        .from('attendance')
        .insert({
          team_member_id: teamMember.id,
          clock_in: new Date().toISOString(),
          clock_in_location: location,
        });

      if (error) throw error;

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

      const { error } = await supabase
        .from('attendance')
        .update({
          clock_out: new Date().toISOString(),
          clock_out_location: location,
        })
        .eq('id', todayAttendance.id);

      if (error) throw error;

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

  const isClockedIn = todayAttendance && !todayAttendance.clock_out;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex items-center justify-between h-14 px-4">
          <div>
            <p className="text-sm font-medium">{teamMember?.name}</p>
            <p className="text-xs text-muted-foreground">{companyName}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6 pb-24">
        {/* Clock In/Out Card */}
        <Card className={isClockedIn ? "border-green-200 bg-green-50/50" : ""}>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
                isClockedIn ? "bg-green-100" : "bg-muted"
              }`}>
                <Clock className={`h-10 w-10 ${isClockedIn ? "text-green-600" : "text-muted-foreground"}`} />
              </div>
              
              {isClockedIn ? (
                <>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 mb-2">
                    Currently Working
                  </Badge>
                  <p className="text-2xl font-bold tabular-nums">
                    {calculateDuration(todayAttendance.clock_in, null)}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Since {formatTime(todayAttendance.clock_in)}
                  </p>
                  <Button 
                    variant="destructive" 
                    size="lg" 
                    className="w-full max-w-xs"
                    onClick={handleClockOut}
                    disabled={clockingOut}
                  >
                    <Square className="h-4 w-4 mr-2" />
                    {clockingOut ? "Clocking Out..." : "Clock Out"}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium mb-2">Ready to start work?</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                  <Button 
                    size="lg" 
                    className="w-full max-w-xs"
                    onClick={handleClockIn}
                    disabled={clockingIn}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {clockingIn ? "Clocking In..." : "Clock In"}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today's Summary */}
        {todayAttendance && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Today's Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Clock In</p>
                  <p className="font-medium tabular-nums">{formatTime(todayAttendance.clock_in)}</p>
                  {todayAttendance.clock_in_location && (
                    <div className="mt-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {formatLocationAddress(todayAttendance.clock_in_location) || 'Location captured'}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Clock Out</p>
                  {todayAttendance.clock_out ? (
                    <>
                      <p className="font-medium tabular-nums">{formatTime(todayAttendance.clock_out)}</p>
                      {todayAttendance.clock_out_location && (
                        <div className="mt-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {formatLocationAddress(todayAttendance.clock_out_location) || 'Location captured'}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground">--:--</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assigned Projects */}
        {assignedProjects.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Your Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {assignedProjects
                  .filter((assignment) => assignment.quotations)
                  .map((assignment) => (
                    <div key={assignment.id} className="p-3 rounded-lg bg-muted/50">
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
            </CardContent>
          </Card>
        )}

        {/* Tasks */}
        {tasks.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Your Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <CheckCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                      )}
                      {task.due_date && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                      {task.priority || 'medium'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Attendance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Recent Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAttendance.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No attendance records yet</p>
            ) : (
              <div className="space-y-3">
                {recentAttendance.map((record) => (
                  <div key={record.id} className="p-3 rounded-lg bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{formatDate(record.clock_in)}</p>
                      <p className="text-sm font-medium tabular-nums">
                        {calculateDuration(record.clock_in, record.clock_out)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">In: {formatTime(record.clock_in)}</p>
                        {record.clock_in_location && (
                          <p className="text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{formatLocationAddress(record.clock_in_location)}</span>
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          Out: {record.clock_out ? formatTime(record.clock_out) : 'Working'}
                        </p>
                        {record.clock_out_location && (
                          <p className="text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{formatLocationAddress(record.clock_out_location)}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TeamDashboard;
