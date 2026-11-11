"use client";

import { useEffect, useState } from 'react';
import { format, subDays } from 'date-fns';
import { ArrowLeft, UserRound, Mail, Phone, Clock, Briefcase, ListTodo, MapPin, RefreshCw } from 'lucide-react';
import { useParams, useNavigate } from '@/lib/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import { teamProfessions } from '@/lib/team-professions';
import { attendanceRange, workedMinutes, hoursLabel } from '@/lib/member-attendance';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Member = Database['public']['Tables']['team_members']['Row'];
type Task = Database['public']['Tables']['tasks']['Row'];
type Attendance = Database['public']['Tables']['attendance']['Row'];
type Project = { id: string; project_name: string; client_name: string; status: string };
function locationLabel(location: Json | null) {
  if (!location || typeof location !== 'object' || Array.isArray(location)) return null;
  if (typeof location.address === 'string') return location.address;
  if (typeof location.lat === 'number' && typeof location.lng === 'number') return location.lat.toFixed(4) + ', ' + location.lng.toFixed(4);
  return null;
}
const dateLabel = (value: string) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const timeLabel = (value: string) => new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

export default function TeamMemberDetail() {
  const { memberId } = useParams<{ memberId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [member, setMember] = useState<Member | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const today = format(new Date(), 'yyyy-MM-dd');
  const [preset, setPreset] = useState('today');
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState('');
  const [taskFilter, setTaskFilter] = useState('all');
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);

  useEffect(() => {
    let active = true;
    if (!user || !memberId) return;
    setLoading(true); setError(''); setMember(null); setTasks([]); setProjects([]);
    const load = async () => {
      try {
        const result = await supabase.from('team_members').select('*').eq('id', memberId).eq('company_id', user.id).maybeSingle();
        if (result.error) throw result.error;
        if (!result.data) throw new Error('Member not found in your organization.');
        const [taskResult, assignmentResult] = await Promise.all([
          supabase.from('tasks').select('*').eq('company_id', user.id).eq('assigned_to', memberId).order('created_at', { ascending: false }),
          supabase.from('team_project_assignments').select('quotation_id').eq('team_member_id', memberId),
        ]);
        if (taskResult.error) throw taskResult.error;
        if (assignmentResult.error) throw assignmentResult.error;
        const ids = [...new Set((assignmentResult.data || []).map(row => row.quotation_id).filter(Boolean))];
        let projectRows: Project[] = [];
        if (ids.length) {
          const result = await supabase.from('quotations').select('id, project_name, client_name, status').eq('user_id', user.id).in('id', ids);
          if (result.error) throw result.error;
          projectRows = result.data || [];
        }
        if (active) { setMember(result.data); setTasks(taskResult.data || []); setProjects(projectRows); }
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load this member. Please try again.'); }
      finally { if (active) setLoading(false); }
    };
    void load(); return () => { active = false; };
  }, [user?.id, memberId, revision]);

  useEffect(() => {
    let active = true;
    setAttendance([]); setAttendanceError('');
    if (!member) return;
    const range = attendanceRange(start, end);
    if (!range) { setAttendanceError('Choose a valid start and end date. The end date must be on or after the start date.'); setAttendanceLoading(false); return; }
    setAttendanceLoading(true);
    const load = async () => {
      try {
        const rows: Attendance[] = [];
        // Read every page so long date ranges do not silently omit records.
        for (let offset = 0; ; offset += 500) {
          const result = await supabase.from('attendance').select('*').eq('team_member_id', member.id)
            .gte('clock_in', range.start).lt('clock_in', range.end).order('clock_in', { ascending: false }).order('id').range(offset, offset + 499);
          if (!active) return;
          if (result.error) throw result.error;
          rows.push(...(result.data || []));
          if ((result.data || []).length < 500) break;
        }
        if (active) setAttendance(rows);
      } catch { if (active) setAttendanceError('Unable to load attendance. Please try again.'); }
      finally { if (active) setAttendanceLoading(false); }
    };
    void load(); return () => { active = false; };
  }, [member, start, end, revision]);

  const choosePreset = (value: string) => {
    setPreset(value);
    if (value !== 'custom') {
      const day = format(value === 'yesterday' ? subDays(new Date(), 1) : new Date(), 'yyyy-MM-dd');
      setStart(day); setEnd(day);
    }
  };
  const completed = tasks.filter(task => task.status === 'completed').length;
  const totalMinutes = attendance.reduce((sum, row) => sum + workedMinutes(row.clock_in, row.clock_out, now), 0);
  const days = new Set(attendance.map(row => format(new Date(row.clock_in), 'yyyy-MM-dd'))).size;
  const profession = teamProfessions.find(role => role.value === member?.work_type)?.label || member?.work_type;
  const filteredTasks = tasks.filter(task => taskFilter === 'all' || task.status === taskFilter);

  return <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24 sm:px-6 lg:px-8">
    <Button variant="ghost" onClick={() => navigate('/team')}><ArrowLeft className="mr-2 h-4 w-4" />Back to Team</Button>
    {loading ? <p role="status" className="py-12 text-center text-muted-foreground">Loading member profile...</p> : error ? <Card><CardContent className="space-y-3 p-6"><p role="alert">{error}</p><Button variant="outline" onClick={() => setRevision(value => value + 1)}>Try again</Button></CardContent></Card> : member && <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><UserRound className="h-8 w-8" /></div><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-widest text-primary">Member profile</p><h1 className="break-words text-2xl font-bold">{member.name}</h1><p className="text-sm text-muted-foreground">{profession}</p></div></div>
        <div className="flex items-center gap-3"><Badge variant="secondary">{member.status.replaceAll('_', ' ')}</Badge><Button variant="outline" size="sm" onClick={() => setRevision(value => value + 1)}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Assigned tasks', tasks.length], ['Completed tasks', completed], ['Projects', projects.length], ['Joined', dateLabel(member.created_at)]].map(([label,value]) => <Card key={label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></CardContent></Card>)}</div>
      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl p-1"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="tasks"><ListTodo className="mr-2 h-4 w-4" />Tasks</TabsTrigger><TabsTrigger value="attendance"><Clock className="mr-2 h-4 w-4" />Attendance</TabsTrigger><TabsTrigger value="projects"><Briefcase className="mr-2 h-4 w-4" />Projects</TabsTrigger></TabsList>
        <TabsContent value="overview" className="grid gap-4 sm:grid-cols-2"><Card><CardContent className="space-y-4 p-5"><h2 className="font-semibold">Contact details</h2><p className="flex items-center gap-2 break-all text-sm"><Mail className="h-4 w-4 shrink-0 text-muted-foreground" />{member.email}</p><p className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" />{member.phone || 'No phone number added'}</p></CardContent></Card><Card><CardContent className="space-y-3 p-5"><h2 className="font-semibold">Work summary</h2><p className="text-sm text-muted-foreground">{tasks.filter(task => task.status === 'in_progress').length} tasks in progress ? {tasks.filter(task => task.status === 'pending').length} pending</p><p className="text-sm text-muted-foreground">{tasks.length ? Math.round(completed / tasks.length * 100) : 0}% of assigned tasks completed</p><p className="text-sm text-muted-foreground">{projects.length} assigned project{projects.length === 1 ? '' : 's'}</p></CardContent></Card></TabsContent>
        <TabsContent value="tasks" className="space-y-4"><div className="flex flex-wrap gap-2">{['all','pending','in_progress','completed'].map(status => <Button key={status} size="sm" variant={taskFilter === status ? 'default' : 'outline'} onClick={() => setTaskFilter(status)}>{status.replaceAll('_',' ')}</Button>)}</div>{filteredTasks.length ? filteredTasks.map(task => <Card key={task.id}><CardContent className="flex flex-wrap items-start justify-between gap-3 p-4"><div className="min-w-0"><h3 className="break-words font-medium">{task.title}</h3>{task.description && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{task.description}</p>}<p className="mt-2 text-xs text-muted-foreground">Priority: {task.priority || 'medium'}{task.due_date ? ' ? Due ' + dateLabel(task.due_date) : ''}</p></div><Badge variant="secondary">{task.status.replaceAll('_',' ')}</Badge></CardContent></Card>) : <p className="rounded-xl border p-8 text-center text-sm text-muted-foreground">No tasks in this view.</p>}</TabsContent>
        <TabsContent value="attendance" className="space-y-4">
          <Card><CardContent className="space-y-4 p-4"><div className="flex flex-wrap gap-2">{[['today','Today'],['yesterday','Yesterday'],['custom','Date range']].map(([value,label]) => <Button key={value} size="sm" variant={preset === value ? 'default' : 'outline'} onClick={() => choosePreset(value)}>{label}</Button>)}</div>{preset === 'custom' && <div className="grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-2"><div className="space-y-1"><Label htmlFor="attendance-start">From</Label><Input id="attendance-start" type="date" value={start} onChange={event => setStart(event.target.value)} /></div><div className="space-y-1"><Label htmlFor="attendance-end">To</Label><Input id="attendance-end" type="date" value={end} onChange={event => setEnd(event.target.value)} /></div></div>}<p className="text-xs text-muted-foreground">{start} ? {end} ? Local time ? Includes shifts clocked in during this period.</p></CardContent></Card>
          {attendanceLoading ? <p role="status" className="p-8 text-center">Loading attendance...</p> : attendanceError ? <div role="alert" className="rounded-xl border p-5"><p>{attendanceError}</p><Button className="mt-3" variant="outline" onClick={() => setRevision(value => value + 1)}>Try again</Button></div> : <><div className="grid grid-cols-3 gap-3">{[['Days attended',days],['Hours worked',hoursLabel(totalMinutes)],['Shifts',attendance.length]].map(([label,value]) => <Card key={label}><CardContent className="p-3 sm:p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></CardContent></Card>)}</div>{attendance.length ? attendance.map(row => <Card key={row.id}><CardContent className="space-y-3 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">{dateLabel(row.clock_in)}</h3><Badge variant="secondary">{row.clock_out ? hoursLabel(workedMinutes(row.clock_in,row.clock_out,now)) : 'Clocked in ? ' + hoursLabel(workedMinutes(row.clock_in,null,now))}</Badge></div><div className="grid gap-3 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Clock in</p><p className="text-sm">{timeLabel(row.clock_in)}</p>{locationLabel(row.clock_in_location) && <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" />{locationLabel(row.clock_in_location)}</p>}</div><div><p className="text-xs text-muted-foreground">Clock out</p><p className="text-sm">{row.clock_out ? dateLabel(row.clock_out) + ' ? ' + timeLabel(row.clock_out) : 'Still working'}</p>{locationLabel(row.clock_out_location) && <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" />{locationLabel(row.clock_out_location)}</p>}</div></div>{row.notes && <p className="text-sm text-muted-foreground">{row.notes}</p>}</CardContent></Card>) : <p className="rounded-xl border p-8 text-center text-sm text-muted-foreground">No attendance recorded for this period.</p>}</>}
        </TabsContent>
        <TabsContent value="projects" className="space-y-3">{projects.length ? projects.map(project => <button key={project.id} type="button" onClick={() => navigate('/team/project/' + project.id)} className="flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-muted/50"><div><h3 className="font-medium">{project.project_name}</h3><p className="text-sm text-muted-foreground">{project.client_name}</p></div><Badge variant="secondary">{project.status}</Badge></button>) : <p className="rounded-xl border p-8 text-center text-sm text-muted-foreground">No projects assigned yet.</p>}</TabsContent>
      </Tabs>
    </>}
  </div>;
}
