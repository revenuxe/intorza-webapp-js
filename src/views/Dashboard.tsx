"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLocalization } from "@/hooks/useLocalization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  Receipt, 
  Users, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  Coins,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  UsersRound,
  Target,
  Wallet,
  PiggyBank,
  AlertCircle,
  BarChart3,
  Ruler,
  FolderOpen,
  Star,
  TrendingDown,
  Banknote,
  CreditCard,
  Building2
} from "lucide-react";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

interface DashboardStats {
  totalQuotations: number;
  pendingQuotations: number;
  acceptedQuotations: number;
  rejectedQuotations: number;
  draftQuotations: number;
  totalInvoices: number;
  paidInvoices: number;
  unpaidInvoices: number;
  partiallyPaidInvoices: number;
  overdueInvoices: number;
  totalClients: number;
  totalRevenue: number;
  paidAmount: number;
  pendingAmount: number;
  totalTeamMembers: number;
  activeTeamMembers: number;
  thisMonthQuotations: number;
  lastMonthQuotations: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  thisMonthPaid: number;
  lastMonthPaid: number;
  averageQuotationValue: number;
  averageInvoiceValue: number;
  siteMeasurements: number;
  totalProjects: number;
  highestQuotation: number;
  lowestQuotation: number;
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
  const { formatCurrency: formatCurrencyLocalized, formatCurrencyShort } = useLocalization();
  const [stats, setStats] = useState<DashboardStats>({
    totalQuotations: 0,
    pendingQuotations: 0,
    acceptedQuotations: 0,
    rejectedQuotations: 0,
    draftQuotations: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    unpaidInvoices: 0,
    partiallyPaidInvoices: 0,
    overdueInvoices: 0,
    totalClients: 0,
    totalRevenue: 0,
    paidAmount: 0,
    pendingAmount: 0,
    totalTeamMembers: 0,
    activeTeamMembers: 0,
    thisMonthQuotations: 0,
    lastMonthQuotations: 0,
    thisMonthRevenue: 0,
    lastMonthRevenue: 0,
    thisMonthPaid: 0,
    lastMonthPaid: 0,
    averageQuotationValue: 0,
    averageInvoiceValue: 0,
    siteMeasurements: 0,
    totalProjects: 0,
    highestQuotation: 0,
    lowestQuotation: 0,
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
        siteMeasurementsRes,
        thisMonthPaymentsRes,
        lastMonthPaymentsRes,
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
        supabase.from('site_measurement_projects').select('*').eq('user_id', user.id),
        supabase.from('payments').select('*, invoices!inner(user_id)').eq('invoices.user_id', user.id)
          .gte('payment_date', thisMonthStart.toISOString())
          .lte('payment_date', thisMonthEnd.toISOString()),
        supabase.from('payments').select('*, invoices!inner(user_id)').eq('invoices.user_id', user.id)
          .gte('payment_date', lastMonthStart.toISOString())
          .lte('payment_date', lastMonthEnd.toISOString()),
      ]);

      const quotations = quotationsRes.data || [];
      const invoices = invoicesRes.data || [];
      const clients = clientsRes.data || [];
      const payments = paymentsRes.data || [];
      const teamMembers = teamMembersRes.data || [];
      const thisMonthQuotations = thisMonthQuotationsRes.data || [];
      const lastMonthQuotations = lastMonthQuotationsRes.data || [];
      const siteMeasurements = siteMeasurementsRes.data || [];
      const thisMonthPayments = thisMonthPaymentsRes.data || [];
      const lastMonthPayments = lastMonthPaymentsRes.data || [];

      // Calculate stats
      const totalRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
      const paidAmount = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const thisMonthRevenue = invoices
        .filter(inv => new Date(inv.created_at || '') >= thisMonthStart && new Date(inv.created_at || '') <= thisMonthEnd)
        .reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
      const lastMonthRevenue = invoices
        .filter(inv => new Date(inv.created_at || '') >= lastMonthStart && new Date(inv.created_at || '') <= lastMonthEnd)
        .reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);

      const thisMonthPaid = thisMonthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const lastMonthPaid = lastMonthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const quotationValues = quotations.map(q => Number(q.grand_total) || 0).filter(v => v > 0);
      const averageQuotationValue = quotationValues.length > 0 
        ? quotationValues.reduce((a, b) => a + b, 0) / quotationValues.length 
        : 0;
      const highestQuotation = quotationValues.length > 0 ? Math.max(...quotationValues) : 0;
      const lowestQuotation = quotationValues.length > 0 ? Math.min(...quotationValues) : 0;

      const invoiceValues = invoices.map(i => Number(i.total_amount) || 0).filter(v => v > 0);
      const averageInvoiceValue = invoiceValues.length > 0 
        ? invoiceValues.reduce((a, b) => a + b, 0) / invoiceValues.length 
        : 0;

      // Count unique projects from quotations
      const uniqueProjects = new Set(quotations.map(q => q.project_name)).size;

      setStats({
        totalQuotations: quotations.length,
        pendingQuotations: quotations.filter(q => q.status === 'pending').length,
        acceptedQuotations: quotations.filter(q => q.status === 'accepted').length,
        rejectedQuotations: quotations.filter(q => q.status === 'rejected').length,
        draftQuotations: quotations.filter(q => q.status === 'draft').length,
        totalInvoices: invoices.length,
        paidInvoices: invoices.filter(i => i.status === 'paid').length,
        unpaidInvoices: invoices.filter(i => i.status === 'unpaid').length,
        partiallyPaidInvoices: invoices.filter(i => i.status === 'partially_paid').length,
        overdueInvoices: invoices.filter(i => i.status === 'overdue').length,
        totalClients: clients.length,
        totalRevenue,
        paidAmount,
        pendingAmount: totalRevenue - paidAmount,
        totalTeamMembers: teamMembers.length,
        activeTeamMembers: teamMembers.filter(t => t.status === 'active').length,
        thisMonthQuotations: thisMonthQuotations.length,
        lastMonthQuotations: lastMonthQuotations.length,
        thisMonthRevenue,
        lastMonthRevenue,
        thisMonthPaid,
        lastMonthPaid,
        averageQuotationValue,
        averageInvoiceValue,
        siteMeasurements: siteMeasurements.length,
        totalProjects: uniqueProjects,
        highestQuotation,
        lowestQuotation,
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

  // Use localized currency formatting from hook
  const formatCurrency = (amount: number) => formatCurrencyShort(amount);
  const formatFullCurrency = (amount: number) => formatCurrencyLocalized(amount);

  const getGrowthPercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const quotationGrowth = getGrowthPercentage(stats.thisMonthQuotations, stats.lastMonthQuotations);
  const revenueGrowth = getGrowthPercentage(stats.thisMonthRevenue, stats.lastMonthRevenue);
  const collectionGrowth = getGrowthPercentage(stats.thisMonthPaid, stats.lastMonthPaid);

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
      case 'draft':
        return 'text-slate-600 bg-slate-100';
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

  const profitMargin = stats.totalRevenue > 0 ? Math.round((stats.paidAmount / stats.totalRevenue) * 100) : 0;

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your complete business overview.</p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-500/20 rounded-lg">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums">{stats.totalQuotations}</p>
                <p className="text-[10px] text-muted-foreground">Quotations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-500/20 rounded-lg">
                <Receipt className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums">{stats.totalInvoices}</p>
                <p className="text-[10px] text-muted-foreground">Invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-500/20 rounded-lg">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums">{stats.totalClients}</p>
                <p className="text-[10px] text-muted-foreground">Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-200/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/20 rounded-lg">
                <FolderOpen className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums">{stats.totalProjects}</p>
                <p className="text-[10px] text-muted-foreground">Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-200/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-cyan-500/20 rounded-lg">
                <Ruler className="h-4 w-4 text-cyan-600" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums">{stats.siteMeasurements}</p>
                <p className="text-[10px] text-muted-foreground">Site Surveys</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 border-rose-200/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-rose-500/20 rounded-lg">
                <UsersRound className="h-4 w-4 text-rose-600" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums">{stats.activeTeamMembers}<span className="text-xs text-muted-foreground">/{stats.totalTeamMembers}</span></p>
                <p className="text-[10px] text-muted-foreground">Team Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Overview - Main Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold tabular-nums mt-1">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatFullCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl">
                <Coins className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className={`flex items-center text-xs font-medium ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {revenueGrowth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(revenueGrowth)}%
              </div>
              <span className="text-xs text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/5 to-green-600/10 border-green-200/50">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Amount Collected</p>
                <p className="text-3xl font-bold tabular-nums text-green-600 mt-1">{formatCurrency(stats.paidAmount)}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatFullCurrency(stats.paidAmount)}</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-xl">
                <Wallet className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className={`flex items-center text-xs font-medium ${collectionGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {collectionGrowth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(collectionGrowth)}%
              </div>
              <span className="text-xs text-muted-foreground">collection this month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/5 to-amber-600/10 border-amber-200/50">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Amount Pending</p>
                <p className="text-3xl font-bold tabular-nums text-amber-600 mt-1">{formatCurrency(stats.pendingAmount)}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatFullCurrency(stats.pendingAmount)}</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <div className="mt-4">
              <Progress value={collectionRate} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">{collectionRate}% collected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Insights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 rounded-xl">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg. Quotation</p>
                <p className="text-lg font-bold tabular-nums">{formatCurrency(stats.averageQuotationValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-500/10 rounded-xl">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg. Invoice</p>
                <p className="text-lg font-bold tabular-nums">{formatCurrency(stats.averageInvoiceValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Highest Quote</p>
                <p className="text-lg font-bold tabular-nums">{formatCurrency(stats.highestQuotation)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-500/10 rounded-xl">
                <TrendingDown className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lowest Quote</p>
                <p className="text-lg font-bold tabular-nums">{formatCurrency(stats.lowestQuotation)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Conversion Rate</span>
              </div>
              <Badge variant={conversionRate >= 50 ? "default" : conversionRate >= 25 ? "secondary" : "destructive"}>
                {conversionRate >= 50 ? "Excellent" : conversionRate >= 25 ? "Good" : "Needs Work"}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quotes → Projects</span>
                <span className="font-bold">{conversionRate}%</span>
              </div>
              <Progress value={conversionRate} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {stats.acceptedQuotations} of {stats.totalQuotations} converted
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <PiggyBank className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Collection Rate</span>
              </div>
              <Badge variant={collectionRate >= 75 ? "default" : collectionRate >= 50 ? "secondary" : "destructive"}>
                {collectionRate >= 75 ? "Healthy" : collectionRate >= 50 ? "Fair" : "At Risk"}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Revenue → Cash</span>
                <span className="font-bold">{collectionRate}%</span>
              </div>
              <Progress value={collectionRate} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {formatCurrency(stats.paidAmount)} collected
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Client Growth</span>
              </div>
              <Badge variant="outline">{stats.totalClients} total</Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg. per Client</span>
                <span className="font-bold">{stats.totalClients > 0 ? formatCurrency(stats.totalRevenue / stats.totalClients) : '₹0'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="text-center p-2 bg-muted/50 rounded">
                  <p className="text-sm font-bold">{stats.totalClients > 0 ? (stats.totalQuotations / stats.totalClients).toFixed(1) : 0}</p>
                  <p className="text-[10px] text-muted-foreground">Quotes/Client</p>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded">
                  <p className="text-sm font-bold">{stats.totalClients > 0 ? (stats.totalInvoices / stats.totalClients).toFixed(1) : 0}</p>
                  <p className="text-[10px] text-muted-foreground">Invoices/Client</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium">Attention Needed</span>
              </div>
              <Badge variant={stats.overdueInvoices > 0 ? "destructive" : "default"}>
                {stats.overdueInvoices > 0 ? `${stats.overdueInvoices} overdue` : "All good!"}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 bg-amber-50 rounded">
                  <p className="text-lg font-bold text-amber-600">{stats.pendingQuotations}</p>
                  <p className="text-[10px] text-muted-foreground">Pending Quotes</p>
                </div>
                <div className="text-center p-2 bg-red-50 rounded">
                  <p className="text-lg font-bold text-red-600">{stats.overdueInvoices}</p>
                  <p className="text-[10px] text-muted-foreground">Overdue</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 bg-slate-50 rounded">
                  <p className="text-lg font-bold text-slate-600">{stats.draftQuotations}</p>
                  <p className="text-[10px] text-muted-foreground">Drafts</p>
                </div>
                <div className="text-center p-2 bg-orange-50 rounded">
                  <p className="text-lg font-bold text-orange-600">{stats.partiallyPaidInvoices}</p>
                  <p className="text-[10px] text-muted-foreground">Partial Paid</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quotation Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Quotation Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xl font-bold text-slate-600 tabular-nums">{stats.draftQuotations}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Draft</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-xl font-bold text-amber-600 tabular-nums">{stats.pendingQuotations}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Pending</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
                <p className="text-xl font-bold text-green-600 tabular-nums">{stats.acceptedQuotations}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Accepted</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg border border-red-100">
                <p className="text-xl font-bold text-red-600 tabular-nums">{stats.rejectedQuotations}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Rejected</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
              <Star className="h-4 w-4 text-amber-500" />
              <span className="text-sm">
                <span className="font-medium">{conversionRate}%</span> 
                <span className="text-muted-foreground"> of quotes convert to projects</span>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-green-600" />
              Invoice Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
                <p className="text-xl font-bold text-green-600 tabular-nums">{stats.paidInvoices}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Paid</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-100">
                <p className="text-xl font-bold text-orange-600 tabular-nums">{stats.partiallyPaidInvoices}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Partial</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-xl font-bold text-amber-600 tabular-nums">{stats.unpaidInvoices}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Unpaid</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg border border-red-100">
                <p className="text-xl font-bold text-red-600 tabular-nums">{stats.overdueInvoices}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Overdue</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
              <Banknote className="h-4 w-4 text-green-500" />
              <span className="text-sm">
                <span className="font-medium">{collectionRate}%</span> 
                <span className="text-muted-foreground"> of billed amount collected</span>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* This Month Summary */}
      <Card className="bg-gradient-to-r from-primary/5 via-transparent to-green-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            This Month at a Glance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-background rounded-lg border">
              <p className="text-2xl font-bold tabular-nums">{stats.thisMonthQuotations}</p>
              <p className="text-xs text-muted-foreground">New Quotations</p>
              <div className={`flex items-center justify-center text-xs font-medium mt-1 ${quotationGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {quotationGrowth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(quotationGrowth)}% vs last month
              </div>
            </div>
            <div className="text-center p-4 bg-background rounded-lg border">
              <p className="text-2xl font-bold tabular-nums">{formatCurrency(stats.thisMonthRevenue)}</p>
              <p className="text-xs text-muted-foreground">Revenue Generated</p>
              <div className={`flex items-center justify-center text-xs font-medium mt-1 ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {revenueGrowth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(revenueGrowth)}% vs last month
              </div>
            </div>
            <div className="text-center p-4 bg-background rounded-lg border">
              <p className="text-2xl font-bold tabular-nums text-green-600">{formatCurrency(stats.thisMonthPaid)}</p>
              <p className="text-xs text-muted-foreground">Payments Received</p>
              <div className={`flex items-center justify-center text-xs font-medium mt-1 ${collectionGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {collectionGrowth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(collectionGrowth)}% vs last month
              </div>
            </div>
            <div className="text-center p-4 bg-background rounded-lg border">
              <p className="text-2xl font-bold tabular-nums">{stats.lastMonthQuotations}</p>
              <p className="text-xs text-muted-foreground">Last Month Quotes</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(stats.lastMonthRevenue)} revenue
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" />
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
            <div className="space-y-2">
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
