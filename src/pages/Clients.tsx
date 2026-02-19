import { useState, useEffect } from "react";
import { Users, Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocalization } from "@/hooks/useLocalization";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createClient, updateClient, ClientPayload, logAdminAction } from "@/lib/awsApi";

interface Client {
  id: string;
  name: string;
  address?: string;
  email?: string;
  phone?: string;
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
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch clients from Supabase
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id);

      if (clientsError) throw clientsError;

      // Fetch quotations for project count
      const { data: quotations, error: quotationsError } = await supabase
        .from('quotations')
        .select('client_id, grand_total')
        .eq('user_id', user.id);

      if (quotationsError) throw quotationsError;

      // Fetch invoices with payment info
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('client_id, total_amount, paid_amount, remaining_amount')
        .eq('user_id', user.id);

      if (invoicesError) throw invoicesError;

      // Build client list with aggregated data
      const clientList: Client[] = (clientsData || []).map((c) => {
        const clientQuotes = quotations?.filter(q => q.client_id === c.id) || [];
        const clientInvoices = invoices?.filter(inv => inv.client_id === c.id) || [];
        
        return {
          id: c.id,
          name: c.name,
          address: c.address || undefined,
          email: c.email || undefined,
          phone: c.phone || undefined,
          projects: clientQuotes.length,
          totalAmount: clientInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
          paidAmount: clientInvoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0),
          outstanding: clientInvoices.reduce((sum, inv) => sum + (inv.remaining_amount || 0), 0),
        };
      });

      setClients(clientList);
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

  const handleOpenDialog = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        address: client.address || "",
        email: client.email || "",
        phone: client.phone || "",
      });
    } else {
      setEditingClient(null);
      setFormData({ name: "", address: "", email: "", phone: "" });
    }
    setDialogOpen(true);
  };

  const handleSaveClient = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const clientId = editingClient?.id || crypto.randomUUID();

      // AWS-first: Create/update in AWS first
      const awsPayload: ClientPayload = {
        client_id: clientId,
        company_id: user.id,
        name: formData.name.trim(),
        address: formData.address.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
      };

      if (editingClient) {
        // Update existing client
        const awsResult = await updateClient(clientId, awsPayload);
        if (!awsResult.success) {
          throw new Error(awsResult.error || "Failed to update client in AWS");
        }

        // Update in Supabase after AWS success
        const { error } = await supabase
          .from('clients')
          .update({
            name: formData.name.trim(),
            address: formData.address.trim() || null,
            email: formData.email.trim() || null,
            phone: formData.phone.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', clientId);

        if (error) throw error;

        await logAdminAction(user.id, user.id, "update", "client", clientId);
        toast({ title: "Client updated successfully" });
      } else {
        // Create new client
        const awsResult = await createClient(awsPayload);
        if (!awsResult.success) {
          throw new Error(awsResult.error || "Failed to create client in AWS");
        }

        // Insert in Supabase after AWS success
        const { error } = await supabase
          .from('clients')
          .insert({
            id: clientId,
            user_id: user.id,
            name: formData.name.trim(),
            address: formData.address.trim() || null,
            email: formData.email.trim() || null,
            phone: formData.phone.trim() || null,
          });

        if (error) throw error;

        await logAdminAction(user.id, user.id, "create", "client", clientId);
        toast({ title: "Client created successfully" });
      }

      setDialogOpen(false);
      loadClients();
    } catch (error: any) {
      console.error('Error saving client:', error);
      toast({
        title: "Error saving client",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Note: AWS delete endpoint would be called here if available
      // For now, we just delete from Supabase
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      await logAdminAction(user.id, user.id, "delete", "client", clientId);
      toast({ title: "Client deleted" });
      loadClients();
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast({
        title: "Error deleting client",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingClient ? "Edit Client" : "Add New Client"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Client name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="client@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Client address"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveClient} disabled={saving}>
                  {saving ? "Saving..." : editingClient ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
              <p className="text-sm text-muted-foreground mb-4">Add your first client to get started</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {clients.map((client) => (
              <Card key={client.id} className="hover:shadow-md transition-shadow">
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
                          {client.email && <p className="text-xs text-muted-foreground">{client.email}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(client)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Client</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {client.name}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteClient(client.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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