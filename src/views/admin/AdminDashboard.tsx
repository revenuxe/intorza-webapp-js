"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  LogOut, Users, FileText, Receipt, Settings as SettingsIcon, MessageSquare, Star, 
  TrendingUp, TrendingDown, Activity, Calendar, Ruler, UserCheck, Building2, 
  AlertTriangle, Bug, ThumbsUp, RefreshCw, Eye, Clock, Crown
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { TechStackDialog } from "@/components/TechStackDialog";
import { AITrainingPanel } from '@/components/admin/AITrainingPanel';

interface User {
  id: string;
  email: string;
  full_name: string;
  company_name: string;
  phone: string;
  created_at: string;
  quotation_count?: number;
  invoice_count?: number;
  team_count?: number;
}

interface Feedback {
  id: string;
  user_id: string;
  rating: number;
  message: string | null;
  trigger_action: string;
  feedback_type: string;
  created_at: string;
  user_email?: string;
}

interface Quotation {
  id: string;
  quotation_number: string;
  client_name: string;
  project_name: string;
  grand_total: number;
  status: string;
  created_at: string;
  user_email?: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  project_name: string;
  total_amount: number;
  paid_amount: number;
  status: string;
  created_at: string;
  user_email?: string;
}

interface SiteMeasurement {
  id: string;
  client_name: string;
  site_location: string;
  room_count: number;
  total_area: number;
  status: string;
  created_at: string;
  user_email?: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  work_type: string;
  status: string;
  company_name?: string;
}

interface Stats {
  totalUsers: number;
  totalQuotations: number;
  totalInvoices: number;
  totalRevenue: number;
  pendingRevenue: number;
  totalFeedback: number;
  avgRating: number;
  totalSiteMeasurements: number;
  totalTeamMembers: number;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  returningUsers: number;
  bugReports: number;
  issueReports: number;
  quotationsToday: number;
  invoicesToday: number;
}

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [siteMeasurements, setSiteMeasurements] = useState<SiteMeasurement[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState<Stats>({ 
    totalUsers: 0, 
    totalQuotations: 0, 
    totalInvoices: 0, 
    totalRevenue: 0,
    pendingRevenue: 0,
    totalFeedback: 0,
    avgRating: 0,
    totalSiteMeasurements: 0,
    totalTeamMembers: 0,
    dailyActiveUsers: 0,
    weeklyActiveUsers: 0,
    monthlyActiveUsers: 0,
    newUsersToday: 0,
    newUsersWeek: 0,
    returningUsers: 0,
    bugReports: 0,
    issueReports: 0,
    quotationsToday: 0,
    invoicesToday: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    const channels: any[] = [];

    // Subscribe to profiles changes
    const profilesChannel = supabase
      .channel('admin-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        loadUsers();
        loadStats();
      })
      .subscribe();
    channels.push(profilesChannel);

    // Subscribe to quotations changes
    const quotationsChannel = supabase
      .channel('admin-quotations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotations' }, () => {
        loadQuotations();
        loadStats();
      })
      .subscribe();
    channels.push(quotationsChannel);

    // Subscribe to invoices changes
    const invoicesChannel = supabase
      .channel('admin-invoices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        loadInvoices();
        loadStats();
      })
      .subscribe();
    channels.push(invoicesChannel);

    // Subscribe to feedback changes
    const feedbackChannel = supabase
      .channel('admin-feedback')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, () => {
        loadFeedback();
        loadStats();
      })
      .subscribe();
    channels.push(feedbackChannel);

    // Subscribe to site measurements changes
    const siteMeasurementsChannel = supabase
      .channel('admin-site-measurements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_measurement_projects' }, () => {
        loadSiteMeasurements();
        loadStats();
      })
      .subscribe();
    channels.push(siteMeasurementsChannel);

    // Subscribe to team members changes
    const teamMembersChannel = supabase
      .channel('admin-team-members')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => {
        loadTeamMembers();
        loadStats();
      })
      .subscribe();
    channels.push(teamMembersChannel);

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/admin/login");
        return;
      }

      const { data: isAdmin, error } = await supabase.rpc('is_admin');

      if (error || !isAdmin) {
        toast.error("Access denied. Admin privileges required.");
        await supabase.auth.signOut();
        navigate("/admin/login");
        return;
      }

      await Promise.all([
        loadUsers(), 
        loadStats(), 
        loadFeedback(), 
        loadQuotations(), 
        loadInvoices(),
        loadSiteMeasurements(),
        loadTeamMembers()
      ]);
    } catch (error) {
      console.error('Admin check error:', error);
      navigate("/admin/login");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, company_name, phone, created_at, is_pro, pro_since, pro_expiry')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get additional stats for each user
      const usersWithStats = await Promise.all((profiles || []).map(async (profile) => {
        const [quotationsRes, invoicesRes, teamRes] = await Promise.all([
          supabase.from('quotations').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
          supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
          supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('company_id', profile.id),
        ]);
        
        return {
          ...profile,
          quotation_count: quotationsRes.count || 0,
          invoice_count: invoicesRes.count || 0,
          team_count: teamRes.count || 0,
        };
      }));

      setUsers(usersWithStats);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadQuotations = async () => {
    try {
      const { data, error } = await supabase
        .from('quotations')
        .select('id, quotation_number, client_name, project_name, grand_total, status, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      const quotationsWithEmail = await Promise.all((data || []).map(async (q) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', q.user_id)
          .single();
        return { ...q, user_email: profile?.email || 'Unknown' };
      }));

      setQuotations(quotationsWithEmail);
    } catch (error) {
      console.error('Error loading quotations:', error);
    }
  };

  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, client_name, project_name, total_amount, paid_amount, status, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      const invoicesWithEmail = await Promise.all((data || []).map(async (i) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', i.user_id)
          .single();
        return { ...i, user_email: profile?.email || 'Unknown' };
      }));

      setInvoices(invoicesWithEmail);
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  };

  const loadSiteMeasurements = async () => {
    try {
      const { data, error } = await supabase
        .from('site_measurement_projects')
        .select('id, client_name, site_location, room_count, total_area, status, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      const measurementsWithEmail = await Promise.all((data || []).map(async (m) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', m.user_id)
          .single();
        return { ...m, user_email: profile?.email || 'Unknown' };
      }));

      setSiteMeasurements(measurementsWithEmail);
    } catch (error) {
      console.error('Error loading site measurements:', error);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('id, name, email, work_type, status, company_id')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const membersWithCompany = await Promise.all((data || []).map(async (m) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_name')
          .eq('id', m.company_id)
          .single();
        return { ...m, company_name: profile?.company_name || 'Unknown' };
      }));

      setTeamMembers(membersWithCompany);
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const loadFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const feedbackWithEmails = await Promise.all((data || []).map(async (f) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', f.user_id)
          .single();
        return { ...f, user_email: profile?.email || 'Unknown', feedback_type: f.feedback_type || 'feedback' };
      }));
      
      setFeedback(feedbackWithEmails);
    } catch (error) {
      console.error('Error loading feedback:', error);
    }
  };

  const loadStats = async () => {
    try {
      const today = startOfDay(new Date());
      const weekAgo = startOfDay(subDays(new Date(), 7));
      const monthAgo = startOfDay(subDays(new Date(), 30));

      // Get all counts
      const [
        { count: quotationsCount },
        { count: invoicesCount },
        { count: siteMeasurementsCount },
        { count: teamMembersCount },
        { data: invoiceData },
        { data: feedbackData },
        { data: profilesData },
        { count: quotationsTodayCount },
        { count: invoicesTodayCount },
        { data: activityData },
      ] = await Promise.all([
        supabase.from('quotations').select('*', { count: 'exact', head: true }),
        supabase.from('invoices').select('*', { count: 'exact', head: true }),
        supabase.from('site_measurement_projects').select('*', { count: 'exact', head: true }),
        supabase.from('team_members').select('*', { count: 'exact', head: true }),
        supabase.from('invoices').select('paid_amount, remaining_amount'),
        supabase.from('feedback').select('rating, feedback_type'),
        supabase.from('profiles').select('created_at'),
        supabase.from('quotations').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
        supabase.from('invoices').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
        supabase.from('user_activity').select('user_id, activity_date'),
      ]);

      const totalRevenue = invoiceData?.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0) || 0;
      const pendingRevenue = invoiceData?.reduce((sum, inv) => sum + (inv.remaining_amount || 0), 0) || 0;
      const totalFeedback = feedbackData?.length || 0;
      const avgRating = totalFeedback > 0 
        ? feedbackData!.reduce((sum, f) => sum + f.rating, 0) / totalFeedback 
        : 0;
      
      const bugReports = feedbackData?.filter(f => f.feedback_type === 'bug').length || 0;
      const issueReports = feedbackData?.filter(f => f.feedback_type === 'issue').length || 0;

      // Calculate user activity
      const todayStr = format(today, 'yyyy-MM-dd');
      const weekAgoStr = format(weekAgo, 'yyyy-MM-dd');
      const monthAgoStr = format(monthAgo, 'yyyy-MM-dd');

      const dailyActiveUsers = new Set(activityData?.filter(a => a.activity_date === todayStr).map(a => a.user_id)).size;
      const weeklyActiveUsers = new Set(activityData?.filter(a => a.activity_date >= weekAgoStr).map(a => a.user_id)).size;
      const monthlyActiveUsers = new Set(activityData?.filter(a => a.activity_date >= monthAgoStr).map(a => a.user_id)).size;

      // New users
      const newUsersToday = profilesData?.filter(p => new Date(p.created_at) >= today).length || 0;
      const newUsersWeek = profilesData?.filter(p => new Date(p.created_at) >= weekAgo).length || 0;

      // Returning users (users who have activity on more than one day)
      const userDays = new Map<string, Set<string>>();
      activityData?.forEach(a => {
        if (!userDays.has(a.user_id)) {
          userDays.set(a.user_id, new Set());
        }
        userDays.get(a.user_id)!.add(a.activity_date);
      });
      const returningUsers = Array.from(userDays.values()).filter(days => days.size > 1).length;

      setStats({
        totalUsers: profilesData?.length || 0,
        totalQuotations: quotationsCount || 0,
        totalInvoices: invoicesCount || 0,
        totalRevenue,
        pendingRevenue,
        totalFeedback,
        avgRating,
        totalSiteMeasurements: siteMeasurementsCount || 0,
        totalTeamMembers: teamMembersCount || 0,
        dailyActiveUsers,
        weeklyActiveUsers,
        monthlyActiveUsers,
        newUsersToday,
        newUsersWeek,
        returningUsers,
        bugReports,
        issueReports,
        quotationsToday: quotationsTodayCount || 0,
        invoicesToday: invoicesTodayCount || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/admin/login");
  };

  const refreshData = async () => {
    toast.info("Refreshing data...");
    await Promise.all([
      loadUsers(), 
      loadStats(), 
      loadFeedback(), 
      loadQuotations(), 
      loadInvoices(),
      loadSiteMeasurements(),
      loadTeamMembers()
    ]);
    toast.success("Data refreshed");
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
            }`}
          />
        ))}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      accepted: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      draft: "bg-gray-100 text-gray-800",
      paid: "bg-green-100 text-green-800",
      partially_paid: "bg-blue-100 text-blue-800",
      unpaid: "bg-red-100 text-red-800",
      overdue: "bg-red-100 text-red-800",
      converted: "bg-purple-100 text-purple-800",
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
    };
    return (
      <Badge className={statusColors[status] || "bg-gray-100 text-gray-800"}>
        {status?.replace('_', ' ')}
      </Badge>
    );
  };

  const getFeedbackTypeBadge = (type: string) => {
    const typeConfig: Record<string, { color: string; icon: any }> = {
      feedback: { color: "bg-blue-100 text-blue-800", icon: ThumbsUp },
      bug: { color: "bg-red-100 text-red-800", icon: Bug },
      issue: { color: "bg-orange-100 text-orange-800", icon: AlertTriangle },
    };
    const config = typeConfig[type] || typeConfig.feedback;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {type}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-optimized header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-3 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
              <SettingsIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold truncate">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">INTORZA Management</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <TechStackDialog />
            <Button variant="outline" size="icon" onClick={refreshData} className="h-8 w-8">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="h-8 px-2 sm:px-3">
              <LogOut className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-6">
        {/* Overview Stats */}
        <section>
          <h2 className="text-base sm:text-lg font-semibold mb-3">Overview</h2>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 rounded-full bg-blue-100 shrink-0">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl sm:text-2xl font-bold tabular-nums">{stats.totalUsers}</p>
                    <p className="text-xs text-muted-foreground">Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 rounded-full bg-green-100 shrink-0">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl sm:text-2xl font-bold tabular-nums">{stats.totalQuotations}</p>
                    <p className="text-xs text-muted-foreground">Quotations</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 rounded-full bg-purple-100 shrink-0">
                    <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl sm:text-2xl font-bold tabular-nums">{stats.totalInvoices}</p>
                    <p className="text-xs text-muted-foreground">Invoices</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 rounded-full bg-yellow-100 shrink-0">
                    <Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl sm:text-2xl font-bold tabular-nums">{stats.avgRating.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">Rating</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Revenue Section */}
        <section>
          <h2 className="text-base sm:text-lg font-semibold mb-3">Revenue</h2>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5">Total Revenue</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-600 tabular-nums truncate">{formatCurrency(stats.totalRevenue)}</p>
                  </div>
                  <div className="p-2 rounded-full bg-green-100 shrink-0">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5">Pending Revenue</p>
                    <p className="text-xl sm:text-2xl font-bold text-orange-600 tabular-nums truncate">{formatCurrency(stats.pendingRevenue)}</p>
                  </div>
                  <div className="p-2 rounded-full bg-orange-100 shrink-0">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Activity Stats - Scrollable on mobile */}
        <section>
          <h2 className="text-base sm:text-lg font-semibold mb-3">Activity</h2>
          <div className="grid gap-2 grid-cols-3 sm:grid-cols-6">
            <Card>
              <CardContent className="p-2 sm:p-3 text-center">
                <p className="text-lg sm:text-xl font-bold tabular-nums">{stats.dailyActiveUsers}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Today</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2 sm:p-3 text-center">
                <p className="text-lg sm:text-xl font-bold tabular-nums">{stats.weeklyActiveUsers}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Weekly</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2 sm:p-3 text-center">
                <p className="text-lg sm:text-xl font-bold tabular-nums">{stats.monthlyActiveUsers}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Monthly</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2 sm:p-3 text-center">
                <p className="text-lg sm:text-xl font-bold text-green-600 tabular-nums">+{stats.newUsersWeek}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">New</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2 sm:p-3 text-center">
                <p className="text-lg sm:text-xl font-bold text-red-600 tabular-nums">{stats.bugReports}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Bugs</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2 sm:p-3 text-center">
                <p className="text-lg sm:text-xl font-bold text-orange-600 tabular-nums">{stats.issueReports}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Issues</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Data Tables */}
        <Tabs defaultValue="users" className="space-y-3">
          <div className="overflow-x-auto -mx-3 px-3">
            <TabsList className="inline-flex h-auto gap-1 p-1 w-max">
              <TabsTrigger value="ai" className="text-xs sm:text-sm px-2 sm:px-3">AI</TabsTrigger>
              <TabsTrigger value="users" className="text-xs sm:text-sm px-2 sm:px-3">Users</TabsTrigger>
              <TabsTrigger value="companies" className="text-xs sm:text-sm px-2 sm:px-3">Companies</TabsTrigger>
              <TabsTrigger value="billing" className="text-xs sm:text-sm px-2 sm:px-3">Billing</TabsTrigger>
              <TabsTrigger value="feedback" className="text-xs sm:text-sm px-2 sm:px-3">Feedback</TabsTrigger>
              <TabsTrigger value="quotations" className="text-xs sm:text-sm px-2 sm:px-3">Quotes</TabsTrigger>
              <TabsTrigger value="invoices" className="text-xs sm:text-sm px-2 sm:px-3">Invoices</TabsTrigger>
              <TabsTrigger value="sites" className="text-xs sm:text-sm px-2 sm:px-3">Sites</TabsTrigger>
              <TabsTrigger value="teams" className="text-xs sm:text-sm px-2 sm:px-3">Teams</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="ai" className="space-y-4"><AITrainingPanel /></TabsContent>
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Users</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  All registered users
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 sm:pt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Email</TableHead>
                        <TableHead className="text-xs hidden sm:table-cell">Name</TableHead>
                        <TableHead className="text-xs hidden md:table-cell">Company</TableHead>
                        <TableHead className="text-xs text-center">Quotes</TableHead>
                        <TableHead className="text-xs text-center hidden sm:table-cell">Invoices</TableHead>
                        <TableHead className="text-xs hidden lg:table-cell">Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="text-xs font-medium max-w-[120px] sm:max-w-none truncate">{user.email}</TableCell>
                            <TableCell className="text-xs hidden sm:table-cell">{user.full_name || '-'}</TableCell>
                            <TableCell className="text-xs hidden md:table-cell">{user.company_name || '-'}</TableCell>
                            <TableCell className="text-xs text-center tabular-nums">{user.quotation_count}</TableCell>
                            <TableCell className="text-xs text-center tabular-nums hidden sm:table-cell">{user.invoice_count}</TableCell>
                            <TableCell className="text-xs hidden lg:table-cell">{format(new Date(user.created_at), 'dd MMM')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="companies" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Companies
                </CardTitle>
                <CardDescription>
                  All company names saved by users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company Name</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="text-center">Quotations</TableHead>
                        <TableHead className="text-center">Invoices</TableHead>
                        <TableHead className="text-center">Team Size</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.filter(u => u.company_name).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            No companies found
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.filter(u => u.company_name).map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.company_name}</TableCell>
                            <TableCell>{user.full_name || 'N/A'}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{(user as any).phone || 'N/A'}</TableCell>
                            <TableCell className="text-center tabular-nums">{user.quotation_count}</TableCell>
                            <TableCell className="text-center tabular-nums">{user.invoice_count}</TableCell>
                            <TableCell className="text-center tabular-nums">{user.team_count}</TableCell>
                            <TableCell>{format(new Date(user.created_at), 'dd MMM yyyy')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="space-y-4">
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  Pro Subscribers
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Users with active Pro subscriptions
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 sm:pt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Email</TableHead>
                        <TableHead className="text-xs">Plan</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs hidden sm:table-cell">Since</TableHead>
                        <TableHead className="text-xs hidden sm:table-cell">Expires</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.filter(u => (u as any).is_pro).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-sm">
                            No Pro subscribers yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.filter(u => (u as any).is_pro).map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="text-xs font-medium">{user.email}</TableCell>
                            <TableCell className="text-xs">
                              <Badge className="bg-amber-500/10 text-amber-700 text-[10px]">Monthly</Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              <Badge className="bg-green-500/10 text-green-700 text-[10px]">Active</Badge>
                            </TableCell>
                            <TableCell className="text-xs hidden sm:table-cell">
                              {(user as any).pro_since ? format(new Date((user as any).pro_since), 'dd MMM') : '-'}
                            </TableCell>
                            <TableCell className="text-xs hidden sm:table-cell">
                              {(user as any).pro_expiry ? format(new Date((user as any).pro_expiry), 'dd MMM') : '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  User Feedback, Bugs & Issues
                </CardTitle>
                <CardDescription>
                  All feedback, bug reports, and issues submitted by users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Trigger</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feedback.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No feedback yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        feedback.map((f) => (
                          <TableRow key={f.id}>
                            <TableCell>{getFeedbackTypeBadge(f.feedback_type)}</TableCell>
                            <TableCell className="font-medium">{f.user_email}</TableCell>
                            <TableCell>{renderStars(f.rating)}</TableCell>
                            <TableCell className="max-w-xs">
                              <p className="truncate">{f.message || '-'}</p>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs bg-muted px-2 py-1 rounded">{f.trigger_action}</span>
                            </TableCell>
                            <TableCell>{format(new Date(f.created_at), 'dd MMM yyyy')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quotations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quotations Overview</CardTitle>
                <CardDescription>All quotations created by users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quote #</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quotations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No quotations found
                          </TableCell>
                        </TableRow>
                      ) : (
                        quotations.map((q) => (
                          <TableRow key={q.id}>
                            <TableCell className="font-medium">{q.quotation_number}</TableCell>
                            <TableCell>{q.client_name}</TableCell>
                            <TableCell>{q.project_name}</TableCell>
                            <TableCell className="tabular-nums">{formatCurrency(q.grand_total || 0)}</TableCell>
                            <TableCell>{getStatusBadge(q.status || 'pending')}</TableCell>
                            <TableCell className="text-xs">{q.user_email}</TableCell>
                            <TableCell>{format(new Date(q.created_at), 'dd MMM yyyy')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Invoices Overview</CardTitle>
                <CardDescription>All invoices created by users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            No invoices found
                          </TableCell>
                        </TableRow>
                      ) : (
                        invoices.map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                            <TableCell>{inv.client_name}</TableCell>
                            <TableCell>{inv.project_name}</TableCell>
                            <TableCell className="tabular-nums">{formatCurrency(inv.total_amount || 0)}</TableCell>
                            <TableCell className="tabular-nums text-green-600">{formatCurrency(inv.paid_amount || 0)}</TableCell>
                            <TableCell>{getStatusBadge(inv.status || 'unpaid')}</TableCell>
                            <TableCell className="text-xs">{inv.user_email}</TableCell>
                            <TableCell>{format(new Date(inv.created_at), 'dd MMM yyyy')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sites" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Site Measurement Projects</CardTitle>
                <CardDescription>All site surveys created by users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Rooms</TableHead>
                        <TableHead>Area (sqft)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {siteMeasurements.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No site measurements found
                          </TableCell>
                        </TableRow>
                      ) : (
                        siteMeasurements.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium">{m.client_name}</TableCell>
                            <TableCell>{m.site_location || 'N/A'}</TableCell>
                            <TableCell className="text-center tabular-nums">{m.room_count || 0}</TableCell>
                            <TableCell className="tabular-nums">{m.total_area?.toLocaleString('en-IN') || 0}</TableCell>
                            <TableCell>{getStatusBadge(m.status || 'draft')}</TableCell>
                            <TableCell className="text-xs">{m.user_email}</TableCell>
                            <TableCell>{format(new Date(m.created_at), 'dd MMM yyyy')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teams" className="space-y-4">
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Teams Overview
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  All team members grouped by company ({teamMembers.length} total)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                {(() => {
                  // Group members by company
                  const companyGroups = new Map<string, typeof teamMembers>();
                  teamMembers.forEach(m => {
                    const company = m.company_name || 'Unknown';
                    if (!companyGroups.has(company)) {
                      companyGroups.set(company, []);
                    }
                    companyGroups.get(company)!.push(m);
                  });

                  if (companyGroups.size === 0) {
                    return (
                      <p className="text-center text-muted-foreground py-8 text-sm">No team members found</p>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {Array.from(companyGroups.entries()).map(([company, members]) => (
                        <div key={company} className="border rounded-2xl overflow-hidden">
                          <div className="p-3 sm:p-4 bg-muted/30 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-primary" />
                              <span className="font-semibold text-sm">{company}</span>
                            </div>
                            <Badge variant="outline" className="text-[10px]">{members.length} members</Badge>
                          </div>
                          <div className="divide-y">
                            {members.map((m) => (
                              <div key={m.id} className="p-3 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{m.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Badge className="text-[10px] capitalize">{m.work_type?.replace('_', ' ')}</Badge>
                                  {getStatusBadge(m.status || 'active')}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
