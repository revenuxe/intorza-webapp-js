/**
 * Admin Data Sync Utilities
 * 
 * Provides functions to sync admin dashboard data from Supabase to AWS
 * and load data from AWS when available.
 */

import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay } from "date-fns";
import * as awsApi from "./awsApi";

/**
 * Fetch all users from Supabase and format for admin dashboard
 */
export const fetchUsersFromSupabase = async (): Promise<awsApi.AdminUserData[]> => {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, company_name, phone, created_at, is_pro, pro_since, pro_expiry, pro_plan, payment_status, country_code')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const usersWithStats = await Promise.all((profiles || []).map(async (profile) => {
    const [quotationsRes, invoicesRes, teamRes] = await Promise.all([
      supabase.from('quotations').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
      supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
      supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('company_id', profile.id),
    ]);

    return {
      user_id: profile.id,
      email: profile.email || '',
      full_name: profile.full_name || undefined,
      company_name: profile.company_name || undefined,
      phone: profile.phone || undefined,
      created_at: profile.created_at || new Date().toISOString(),
      is_pro: profile.is_pro || false,
      pro_since: profile.pro_since || undefined,
      pro_expiry: profile.pro_expiry || undefined,
      pro_plan: profile.pro_plan || undefined,
      payment_status: profile.payment_status || undefined,
      quotation_count: quotationsRes.count || 0,
      invoice_count: invoicesRes.count || 0,
      team_count: teamRes.count || 0,
      country_code: profile.country_code || undefined,
    };
  }));

  return usersWithStats;
};

/**
 * Fetch billing/subscription data from Supabase
 */
export const fetchBillingFromSupabase = async (): Promise<awsApi.AdminBillingData[]> => {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, company_name, is_pro, pro_plan, pro_since, pro_expiry, payment_status, provider_subscription_id, provider_customer_id, payment_provider')
    .eq('is_pro', true)
    .order('pro_since', { ascending: false });

  if (error) throw error;

  return (profiles || []).map((p, index) => ({
    billing_id: `billing_${p.id}_${index}`,
    user_id: p.id,
    email: p.email || '',
    company_name: p.company_name || undefined,
    is_pro: p.is_pro || false,
    pro_plan: p.pro_plan || undefined,
    pro_since: p.pro_since || undefined,
    pro_expiry: p.pro_expiry || undefined,
    payment_status: p.payment_status || undefined,
    provider_subscription_id: p.provider_subscription_id || undefined,
    provider_customer_id: p.provider_customer_id || undefined,
    payment_provider: p.payment_provider || undefined,
  }));
};

/**
 * Fetch feedback from Supabase
 */
export const fetchFeedbackFromSupabase = async (): Promise<awsApi.AdminFeedbackData[]> => {
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

    return {
      feedback_id: f.id,
      user_id: f.user_id,
      user_email: profile?.email || 'Unknown',
      rating: f.rating,
      message: f.message || undefined,
      trigger_action: f.trigger_action,
      feedback_type: (f.feedback_type || 'feedback') as 'feedback' | 'bug' | 'issue',
      created_at: f.created_at,
    };
  }));

  return feedbackWithEmails;
};

/**
 * Fetch quotations from Supabase for admin
 */
export const fetchQuotationsFromSupabase = async () => {
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

  return quotationsWithEmail;
};

/**
 * Fetch invoices from Supabase for admin
 */
export const fetchInvoicesFromSupabase = async () => {
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

  return invoicesWithEmail;
};

/**
 * Fetch site measurements from Supabase for admin
 */
export const fetchMeasurementsFromSupabase = async () => {
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

  return measurementsWithEmail;
};

/**
 * Fetch team members from Supabase for admin
 */
export const fetchTeamMembersFromSupabase = async () => {
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

  return membersWithCompany;
};

/**
 * Calculate admin stats from Supabase
 */
export const fetchStatsFromSupabase = async (): Promise<awsApi.AdminStatsData> => {
  const today = startOfDay(new Date());
  const weekAgo = startOfDay(subDays(new Date(), 7));
  const monthAgo = startOfDay(subDays(new Date(), 30));

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
    { count: proSubscribersCount },
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
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_pro', true),
  ]);

  const totalRevenue = invoiceData?.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0) || 0;
  const pendingRevenue = invoiceData?.reduce((sum, inv) => sum + (inv.remaining_amount || 0), 0) || 0;
  const totalFeedback = feedbackData?.length || 0;
  const avgRating = totalFeedback > 0 
    ? feedbackData!.reduce((sum, f) => sum + f.rating, 0) / totalFeedback 
    : 0;
  
  const bugReports = feedbackData?.filter(f => f.feedback_type === 'bug').length || 0;
  const issueReports = feedbackData?.filter(f => f.feedback_type === 'issue').length || 0;

  const todayStr = format(today, 'yyyy-MM-dd');
  const weekAgoStr = format(weekAgo, 'yyyy-MM-dd');
  const monthAgoStr = format(monthAgo, 'yyyy-MM-dd');

  const dailyActiveUsers = new Set(activityData?.filter(a => a.activity_date === todayStr).map(a => a.user_id)).size;
  const weeklyActiveUsers = new Set(activityData?.filter(a => a.activity_date >= weekAgoStr).map(a => a.user_id)).size;
  const monthlyActiveUsers = new Set(activityData?.filter(a => a.activity_date >= monthAgoStr).map(a => a.user_id)).size;

  const newUsersToday = profilesData?.filter(p => new Date(p.created_at) >= today).length || 0;
  const newUsersWeek = profilesData?.filter(p => new Date(p.created_at) >= weekAgo).length || 0;

  const userDays = new Map<string, Set<string>>();
  activityData?.forEach(a => {
    if (!userDays.has(a.user_id)) {
      userDays.set(a.user_id, new Set());
    }
    userDays.get(a.user_id)!.add(a.activity_date);
  });
  const returningUsers = Array.from(userDays.values()).filter(days => days.size > 1).length;

  return {
    total_users: profilesData?.length || 0,
    total_quotations: quotationsCount || 0,
    total_invoices: invoicesCount || 0,
    total_revenue: totalRevenue,
    pending_revenue: pendingRevenue,
    total_feedback: totalFeedback,
    avg_rating: avgRating,
    total_site_measurements: siteMeasurementsCount || 0,
    total_team_members: teamMembersCount || 0,
    daily_active_users: dailyActiveUsers,
    weekly_active_users: weeklyActiveUsers,
    monthly_active_users: monthlyActiveUsers,
    new_users_today: newUsersToday,
    new_users_week: newUsersWeek,
    returning_users: returningUsers,
    bug_reports: bugReports,
    issue_reports: issueReports,
    quotations_today: quotationsTodayCount || 0,
    invoices_today: invoicesTodayCount || 0,
    pro_subscribers: proSubscribersCount || 0,
  };
};

/**
 * Sync all admin data from Supabase to AWS
 */
export const syncAllDataToAWS = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const [users, billing, feedback, stats, quotations, invoices, measurements, teamMembers] = await Promise.all([
      fetchUsersFromSupabase(),
      fetchBillingFromSupabase(),
      fetchFeedbackFromSupabase(),
      fetchStatsFromSupabase(),
      fetchQuotationsFromSupabase(),
      fetchInvoicesFromSupabase(),
      fetchMeasurementsFromSupabase(),
      fetchTeamMembersFromSupabase(),
    ]);

    // Sync to AWS using individual endpoints (more reliable than bulk)
    const results = await Promise.allSettled([
      awsApi.syncAdminUsers(users),
      awsApi.syncAdminBilling(billing),
      awsApi.syncAdminFeedback(feedback),
      awsApi.syncAdminStats(stats),
      awsApi.syncAdminQuotations(quotations),
      awsApi.syncAdminInvoices(invoices),
      awsApi.syncAdminMeasurements(measurements),
      awsApi.syncAdminTeamMembers(teamMembers),
    ]);

    // Log admin action
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await awsApi.logAdminAction('admin', user.id, 'sync_all_data', 'admin', 'admin_dashboard', {
        users_count: users.length,
        billing_count: billing.length,
        feedback_count: feedback.length,
        quotations_count: quotations.length,
        invoices_count: invoices.length,
        measurements_count: measurements.length,
        team_members_count: teamMembers.length,
      });
    }

    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.warn('Some sync operations failed:', failures);
    }

    return { success: true };
  } catch (error) {
    console.error('Error syncing admin data to AWS:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Load admin data from AWS (with Supabase fallback)
 */
export const loadAdminDataFromAWS = async () => {
  const [
    usersRes,
    billingRes,
    feedbackRes,
    statsRes,
    quotationsRes,
    invoicesRes,
    measurementsRes,
    teamMembersRes,
  ] = await Promise.all([
    awsApi.listAdminUsers(),
    awsApi.listAdminBilling(),
    awsApi.listAdminFeedback(),
    awsApi.getAdminStats(),
    awsApi.listAdminQuotations(),
    awsApi.listAdminInvoices(),
    awsApi.listAdminMeasurements(),
    awsApi.listAdminTeamMembers(),
  ]);

  return {
    users: usersRes.success ? usersRes.data : null,
    billing: billingRes.success ? billingRes.data : null,
    feedback: feedbackRes.success ? feedbackRes.data : null,
    stats: statsRes.success ? statsRes.data : null,
    quotations: quotationsRes.success ? quotationsRes.data : null,
    invoices: invoicesRes.success ? invoicesRes.data : null,
    measurements: measurementsRes.success ? measurementsRes.data : null,
    teamMembers: teamMembersRes.success ? teamMembersRes.data : null,
  };
};
