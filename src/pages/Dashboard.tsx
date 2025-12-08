import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Receipt, 
  Users, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  IndianRupee,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  UsersRound
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

interface DashboardStats {
  totalQuotations: number;
  pendingQuotations: number;
  acceptedQuotations: number;
  rejectedQuotations: number;
  totalInvoices: number;
  paidInvoices: number;
  unpaidInvoices: number;
  totalClients: number;
  totalRevenue: number;
  paidAmount: number;
  pendingAmount: number;
  totalTeamMembers: number;
  thisMonthQuotations: number;
  lastMonthQuotations: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
}

interface RecentActivity {
  id: string;
  type: 'quotation' | 'invoice' | 'client';
  title: string;
  subtitle: string;
  date: string;
  amount?: number;
  status?: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalQuotations: 0,
    pendingQuotations: 0,
    acceptedQuotations: 0,
    rejectedQuotations: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    unpaidInvoices: 0,
    totalClients: 0,
    totalRevenue: 0,
    paidAmount: 0,
    pendingAmount: 0,
    totalTeamMembers: 0,
    thisMonthQuotations: 0,
    lastMonthQuotations: 0,
    thisMonthRevenue: 0,
    lastMonthRevenue: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      const now = new Date();
      const thisMonthStart = startOfMonth(now);
      const thisMonthEnd = endOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));

      // Fetch all data in parallel
      const [
        quotationsRes,
        invoicesRes,
        clientsRes,
        paymentsRes,
        teamMembersRes,
        thisMonthQuotationsRes,
        lastMonthQuotationsRes,
      ] = await Promise.all([
        supabase.from('quotations').select('*').eq('user_id', user.id),
        supabase.from('invoices').select('*').eq('user_id', user.id),
        supabase.from('clients').select('*').eq('user_id', user.id),
        supabase.from('payments').select('*, invoices!inner(user_id)').eq('invoices.user_id', user.id),
        supabase.from('team_members').select('*').eq('company_id', user.id),
        supabase.from('quotations').select('*').eq('user_id', user.id)
          .gte('created_at', thisMonthStart.toISOString())
          .lte('created_at', thisMonthEnd.toISOString()),
        supabase.from('quotations').select('*').eq('user_id', user.id)
          .gte('created_at', lastMonthStart.toISOString())
          .lte('created_at', lastMonthEnd.toISOString()),
      ]);

      const quotations = quotationsRes.data || [];
      const invoices = invoicesRes.data || [];
      const clients = clientsRes.data || [];
      const payments = paymentsRes.data || [];
      const teamMembers = teamMembersRes.data || [];
      const thisMonthQuotations = thisMonthQuotationsRes.data || [];
      const lastMonthQuotations = lastMonthQuotationsRes.data || [];

      // Calculate stats
      const totalRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
      const paidAmount = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const thisMonthRevenue = invoices
        .filter(inv => new Date(inv.created_at || '') >= thisMonthStart && new Date(inv.created_at || '') <= thisMonthEnd)
        .reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
      const lastMonthRevenue = invoices
        .filter(inv => new Date(inv.created_at || '') >= lastMonthStart && new Date(inv.created_at || '') <= lastMonthEnd)
        .reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);

      setStats({
        totalQuotations: quotations.length,
        pendingQuotations: quotations.filter(q => q.status === 'pending').length,
        acceptedQuotations: quotations.filter(q => q.status === 'accepted').length,
        rejectedQuotations: quotations.filter(q => q.status === 'rejected').length,
        totalInvoices: invoices.length,
        paidInvoices: invoices.filter(i => i.status === 'paid').length,
        unpaidInvoices: invoices.filter(i => i.status === 'unpaid' || i.status === 'partially_paid').length,
        totalClients: clients.length,
        totalRevenue,
        paidAmount,
        pendingAmount: totalRevenue - paidAmount,
        totalTeamMembers: teamMembers.length,
        thisMonthQuotations: thisMonthQuotations.length,
        lastMonthQuotations: lastMonthQuotations.length,
        thisMonthRevenue,
        lastMonthRevenue,
      });

      // Build recent activities
      const activities: RecentActivity[] = [
        ...quotations.slice(0, 5).map(q => ({
          id: q.id,
          type: 'quotation' as const,
          title: q.project_name,
          subtitle: q.client_name,
          date: q.created_at || '',
          amount: Number(q.grand_total) || 0,
          status: q.status || 'pending',
        })),
        ...invoices.slice(0, 5).map(i => ({
          id: i.id,
          type: 'invoice' as const,
          title: i.project_name,
          subtitle: i.client_name,
          date: i.created_at || '',
          amount: Number(i.total_amount) || 0,
          status: i.status || 'unpaid',
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

      setRecentActivities(activities);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Set up real-time subscriptions
    const quotationsChannel = supabase
      .channel('dashboard-quotations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotations' }, fetchDashboardData)
      .subscribe();

    const invoicesChannel = supabase
      .channel('dashboard-invoices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, fetchDashboardData)
      .subscribe();

    const clientsChannel = supabase
      .channel('dashboard-clients')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, fetchDashboardData)
      .subscribe();

    const paymentsChannel = supabase
      .channel('dashboard-payments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, fetchDashboardData)
      .subscribe();

    return () => {
      supabase.removeChannel(quotationsChannel);
      supabase.removeChannel(invoicesChannel);
      supabase.removeChannel(clientsChannel);
      supabase.removeChannel(paymentsChannel);
    };
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getGrowthPercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const quotationGrowth = getGrowthPercentage(stats.thisMonthQuotations, stats.lastMonthQuotations);
  const revenueGrowth = getGrowthPercentage(stats.thisMonthRevenue, stats.lastMonthRevenue);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
      case 'paid':
        return 'text-green-600 bg-green-100';
      case 'pending':
      case 'partially_paid':
        return 'text-amber-600 bg-amber-100';
      case 'rejected':
      case 'overdue':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const conversionRate = stats.totalQuotations > 0 
    ? Math.round((stats.acceptedQuotations / stats.totalQuotations) * 100) 
    : 0;

  const collectionRate = stats.totalRevenue > 0 
    ? Math.round((stats.paidAmount / stats.totalRevenue) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your business overview.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div className={`flex items-center text-xs font-medium ${quotationGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {quotationGrowth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(quotationGrowth)}%
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold tabular-nums">{stats.totalQuotations}</p>
              <p className="text-xs text-muted-foreground">Total Quotations</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-xs font-medium text-green-600">{conversionRate}%</span>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold tabular-nums">{stats.acceptedQuotations}</p>
              <p className="text-xs text-muted-foreground">Converted Projects</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold tabular-nums">{stats.totalClients}</p>
              <p className="text-xs text-muted-foreground">Total Clients</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <UsersRound className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold tabular-nums">{stats.totalTeamMembers}</p>
              <p className="text-xs text-muted-foreground">Team Members</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl">
                <IndianRupee className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold tabular-nums">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className={`flex items-center text-xs font-medium ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {revenueGrowth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(revenueGrowth)}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Amount Collected</p>
                <p className="text-xl font-bold tabular-nums text-green-600">{formatCurrency(stats.paidAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Amount Pending</p>
                <p className="text-xl font-bold tabular-nums text-amber-600">{formatCurrency(stats.pendingAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quotation Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Quotation Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Conversion Rate</span>
                <span className="font-medium">{conversionRate}%</span>
              </div>
              <Progress value={conversionRate} className="h-2" />
            </div>
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <p className="text-xl font-bold text-amber-600 tabular-nums">{stats.pendingQuotations}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-xl font-bold text-green-600 tabular-nums">{stats.acceptedQuotations}</p>
                <p className="text-xs text-muted-foreground">Accepted</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-xl font-bold text-red-600 tabular-nums">{stats.rejectedQuotations}</p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Invoice Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Collection Rate</span>
                <span className="font-medium">{collectionRate}%</span>
              </div>
              <Progress value={collectionRate} className="h-2" />
            </div>
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-xl font-bold tabular-nums">{stats.totalInvoices}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-xl font-bold text-green-600 tabular-nums">{stats.paidInvoices}</p>
                <p className="text-xs text-muted-foreground">Paid</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <p className="text-xl font-bold text-amber-600 tabular-nums">{stats.unpaidInvoices}</p>
                <p className="text-xs text-muted-foreground">Unpaid</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
              <p className="text-sm">Create your first quotation to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${activity.type === 'quotation' ? 'bg-blue-100' : 'bg-green-100'}`}>
                      {activity.type === 'quotation' ? (
                        <FileText className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Receipt className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.subtitle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm tabular-nums">{formatCurrency(activity.amount || 0)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(activity.status || '')}`}>
                      {activity.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
