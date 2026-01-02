import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLocalization } from "@/hooks/useLocalization";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  MapPin, 
  FileText, 
  Receipt, 
  Ruler,
  Eye,
  Coins
} from "lucide-react";
import { format } from "date-fns";

interface Quotation {
  id: string;
  quotation_number: string;
  status: string;
  grand_total: number;
  created_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  created_at: string;
}

interface SiteMeasurement {
  id: string;
  room_count: number;
  total_area: number;
  photo_count: number;
  status: string;
}

interface ProjectDetail {
  id: string;
  project_name: string;
  client_name: string;
  client_address: string | null;
  status: string;
  grand_total: number;
  created_at: string;
}

export default function MyProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatCurrency } = useLocalization();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [siteMeasurement, setSiteMeasurement] = useState<SiteMeasurement | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!id || !user) return;

    // Get main quotation (project)
    const { data: quotation } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!quotation) {
      navigate('/my-projects');
      return;
    }

    setProject({
      id: quotation.id,
      project_name: quotation.project_name,
      client_name: quotation.client_name,
      client_address: quotation.client_address,
      status: quotation.status || 'draft',
      grand_total: quotation.grand_total || 0,
      created_at: quotation.created_at || ''
    });

    // Get all quotations for this project
    const { data: allQuotations } = await supabase
      .from('quotations')
      .select('*')
      .eq('user_id', user.id)
      .eq('project_name', quotation.project_name)
      .order('created_at', { ascending: false });

    setQuotations(allQuotations || []);

    // Get invoices linked to these quotations
    const quotationIds = allQuotations?.map(q => q.id) || [];
    if (quotationIds.length > 0) {
      const { data: projectInvoices } = await supabase
        .from('invoices')
        .select('*')
        .in('quotation_id', quotationIds)
        .order('created_at', { ascending: false });

      setInvoices(projectInvoices || []);
    }

    // Get site measurement
    const { data: measurement } = await supabase
      .from('site_measurement_projects')
      .select('*')
      .eq('quotation_id', id)
      .maybeSingle();

    setSiteMeasurement(measurement);

    setLoading(false);
  }, [id, user, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
      case 'paid': return 'bg-green-100 text-green-700';
      case 'pending':
      case 'partially_paid': return 'bg-amber-100 text-amber-700';
      case 'rejected':
      case 'overdue': return 'bg-red-100 text-red-700';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // formatCurrency is now provided by useLocalization hook

  const totalInvoiced = invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
  const totalPaid = invoices.reduce((sum, i) => sum + (i.paid_amount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/my-projects')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold">{project.project_name}</h1>
            <Badge className={getStatusColor(project.status)}>
              {project.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">{project.client_name}</p>
          {project.client_address && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <MapPin className="h-3.5 w-3.5" />
              <span>{project.client_address}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quotations">Quotations</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="measurement">Measurement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{quotations.length}</p>
                    <p className="text-xs text-muted-foreground">Quotations</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Receipt className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{invoices.length}</p>
                    <p className="text-xs text-muted-foreground">Invoices</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Value Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Coins className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="text-xl font-bold tabular-nums">{formatCurrency(project.grand_total)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Coins className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Collected</p>
                    <p className="text-xl font-bold tabular-nums text-green-600">{formatCurrency(totalPaid)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Coins className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-xl font-bold tabular-nums text-amber-600">{formatCurrency(totalInvoiced - totalPaid)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quotations" className="mt-4">
          {quotations.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No quotations yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {quotations.map((q) => (
                <Card key={q.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/quotations/${q.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{q.quotation_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(q.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium tabular-nums">{formatCurrency(q.grand_total || 0)}</p>
                        <Badge className={getStatusColor(q.status)}>{q.status}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          {invoices.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Receipt className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No invoices yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => (
                <Card key={inv.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/invoices/${inv.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{inv.invoice_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(inv.created_at || ''), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium tabular-nums">{formatCurrency(inv.total_amount || 0)}</p>
                        <Badge className={getStatusColor(inv.status || 'unpaid')}>{inv.status}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="measurement" className="mt-4">
          {siteMeasurement ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Site Measurement Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xl font-bold tabular-nums">{siteMeasurement.room_count}</p>
                    <p className="text-xs text-muted-foreground">Rooms</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xl font-bold tabular-nums">{siteMeasurement.total_area?.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">sq.ft</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xl font-bold tabular-nums">{siteMeasurement.photo_count}</p>
                    <p className="text-xs text-muted-foreground">Photos</p>
                  </div>
                </div>
                <Button 
                  className="w-full"
                  onClick={() => navigate(`/site-measurement/${siteMeasurement.id}`)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Site Measurement Data
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Ruler className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground mb-4">No site measurement linked</p>
                <Button variant="outline" onClick={() => navigate('/site-measurement/new')}>
                  Create Site Measurement
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
