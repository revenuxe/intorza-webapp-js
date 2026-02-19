import { useState, useEffect } from "react";
import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocalization } from "@/hooks/useLocalization";
import { supabase } from "@/integrations/supabase/client";

interface Client {
  name: string;
  projects: number;
  totalAmount: number;
  paidAmount: number;
  outstanding: number;
}

const Clients = () => {
  const { toast } = useToast();
  const { formatCurrency } = useLocalization();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch quotations
      const { data: quotations, error: quotationsError } = await supabase
        .from('quotations')
        .select('client_name, grand_total')
        .eq('user_id', user.id);

      if (quotationsError) throw quotationsError;

      // Fetch invoices with payment info
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('client_name, total_amount, paid_amount, remaining_amount')
        .eq('user_id', user.id);

      if (invoicesError) throw invoicesError;

      // Combine and group by client
      const clientMap = new Map<string, Client>();

      // Process quotations
      quotations?.forEach((q) => {
        if (!clientMap.has(q.client_name)) {
          clientMap.set(q.client_name, {
            name: q.client_name,
            projects: 0,
            totalAmount: 0,
            paidAmount: 0,
            outstanding: 0,
          });
        }
        const client = clientMap.get(q.client_name)!;
        client.projects += 1;
      });

      // Process invoices
      invoices?.forEach((inv) => {
        if (!clientMap.has(inv.client_name)) {
          clientMap.set(inv.client_name, {
            name: inv.client_name,
            projects: 0,
            totalAmount: 0,
            paidAmount: 0,
            outstanding: 0,
          });
        }
        const client = clientMap.get(inv.client_name)!;
        client.totalAmount += inv.total_amount || 0;
        client.paidAmount += inv.paid_amount || 0;
        client.outstanding += inv.remaining_amount || 0;
      });

      setClients(Array.from(clientMap.values()));
    } catch (error) {
      console.error('Error loading clients:', error);
      toast({
        title: "Error loading clients",
        description: "Failed to load client data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Clients</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your client relationships</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading clients...</p>
          </div>
        ) : clients.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No clients yet</h3>
              <p className="text-sm text-muted-foreground">Clients will appear here when you create quotations</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {clients.map((client, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{client.name}</h3>
                          <p className="text-xs text-muted-foreground">{client.projects} project{client.projects !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Billed</p>
                        <p className="text-sm font-bold text-foreground tabular-nums">
                          {formatCurrency(client.totalAmount, true)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Paid</p>
                        <p className="text-sm font-bold text-green-600 tabular-nums">
                          {formatCurrency(client.paidAmount, true)}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">Outstanding Balance</p>
                      <p className="text-lg font-bold text-primary tabular-nums">
                        {formatCurrency(client.outstanding, true)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Clients;
