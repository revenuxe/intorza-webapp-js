import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Users, Clock, MapPin, Phone, Mail, Briefcase, Trash2, Edit } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
  clock_in_location: { lat: number; lng: number; address?: string } | null;
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
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [companyName, setCompanyName] = useState("");
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    work_type: 'other',
    daily_rate: '',
  });

  useEffect(() => {
    if (user) {
      fetchTeamMembers();
      fetchTodayAttendance();
      fetchCompanyName();
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
    }
    setLoading(false);
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

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please login first");
      return;
    }

    if (!formData.name || !formData.email) {
      toast.error("Name and email are required");
      return;
    }

    try {
      if (editingMember) {
        const { error } = await supabase
          .from('team_members')
          .update({
            name: formData.name,
            email: formData.email,
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
            email: formData.email,
            phone: formData.phone || null,
            work_type: formData.work_type as any,
            daily_rate: formData.daily_rate ? parseFloat(formData.daily_rate) : null,
          });

        if (error) throw error;
        toast.success("Team member added");
      }

      setDialogOpen(false);
      setEditingMember(null);
      setFormData({ name: '', email: '', phone: '', work_type: 'other', daily_rate: '' });
      fetchTeamMembers();
    } catch (error: any) {
      toast.error(error.message || "Error saving team member");
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
      email: member.email,
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

  const teamLoginUrl = `${window.location.origin}/team/login`;

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
            setFormData({ name: '', email: '', phone: '', work_type: 'other', daily_rate: '' });
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
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
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

      {/* Team Login Link Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold">Team Member Login Portal</h3>
              <p className="text-sm text-muted-foreground">Share this link with your team members to login</p>
              <code className="text-xs bg-muted px-2 py-1 rounded mt-2 block break-all">{teamLoginUrl}</code>
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              navigator.clipboard.writeText(teamLoginUrl);
              toast.success("Link copied!");
            }}>
              Copy Link
            </Button>
          </div>
        </CardContent>
      </Card>

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
              <Briefcase className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-2xl font-bold tabular-nums">{teamMembers.filter(m => m.status === 'active').length}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
              
              return (
                <Card key={member.id} className="overflow-hidden">
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
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
