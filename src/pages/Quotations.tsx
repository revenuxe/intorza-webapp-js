import { useState, useEffect } from "react";
import { FileText, Plus, Edit, Trash2, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocalization } from "@/hooks/useLocalization";
import { supabase } from "@/integrations/supabase/client";
import { ListSkeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { deleteQuotation as deleteQuotationFromAws, createQuotation, buildQuotationPayload, logAdminAction } from "@/lib/awsApi";

interface Quotation {
  id: string;
  quotation_number: string;
  quotation_title: string;
  project_name: string;
  client_name: string;
  grand_total: number;
  status: string;
  date_of_proposal: string;
  created_at: string;
}

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "pending":
      return "bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20";
    case "accepted":
      return "bg-green-500/10 text-green-700 hover:bg-green-500/20";
    case "rejected":
      return "bg-red-500/10 text-red-700 hover:bg-red-500/20";
    case "converted":
      return "bg-primary/10 text-primary hover:bg-primary/20";
    case "draft":
      return "bg-gray-500/10 text-gray-700 hover:bg-gray-500/20";
    default:
      return "";
  }
};

const Quotations = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { formatCurrency, formatDate } = useLocalization();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadQuotations();
  }, []);

  const loadQuotations = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotations(data || []);
    } catch (error) {
      console.error('Error loading quotations:', error);
      toast({
        title: "Error loading quotations",
        description: "Failed to load quotations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuotation = async (quotationId: string) => {
    try {
      setDeletingId(quotationId);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      // First get all sections for this quotation
      const { data: sections } = await supabase
        .from('quotation_sections')
        .select('id')
        .eq('quotation_id', quotationId);
      
      if (sections && sections.length > 0) {
        // Delete all items from all sections
        const sectionIds = sections.map(s => s.id);
        await supabase
          .from('quotation_items')
          .delete()
          .in('section_id', sectionIds);
        
        // Delete all sections
        await supabase
          .from('quotation_sections')
          .delete()
          .eq('quotation_id', quotationId);
      }
      
      // Finally delete the quotation from Supabase
      const { error } = await supabase
        .from('quotations')
        .delete()
        .eq('id', quotationId);
      
      if (error) throw error;

      // Sync delete to AWS (best-effort)
      try {
        await deleteQuotationFromAws(quotationId);
        if (user) {
          await logAdminAction(user.id, user.id, 'delete_quotation', 'quotation', quotationId);
        }
      } catch (awsError) {
        console.error('AWS delete sync failed:', awsError);
      }
      
      toast({
        title: "Quotation Deleted",
        description: "The quotation has been permanently deleted",
      });
      
      loadQuotations();
    } catch (error) {
      console.error('Error deleting quotation:', error);
      toast({
        title: "Error",
        description: "Failed to delete quotation",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicateQuotation = async (quotationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get original quotation
      const { data: original, error: fetchError } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', quotationId)
        .single();

      if (fetchError || !original) throw fetchError;

      // Get sections and items for AWS payload
      const { data: sections } = await supabase
        .from('quotation_sections')
        .select('*, quotation_items(*)')
        .eq('quotation_id', quotationId)
        .order('sort_order');

      // Create new quotation - AWS First approach
      const newQuotationNumber = `QT-${Date.now()}`;
      const newQuotationId = crypto.randomUUID();
      
      // Build sections for AWS payload
      const awsSections = sections?.map(section => ({
        id: crypto.randomUUID(),
        title: section.section_name,
        items: (section.quotation_items || []).map((item: any) => ({
          side: item.side || '',
          productName: item.product_name,
          productDetails: item.product_details || '',
          widthFt: item.width_ft || 0,
          heightFt: item.height_ft || 0,
          sftArea: item.sft_area || 0,
          ratePerSft: item.rate_per_sft || 0,
          amount: item.amount || 0,
        })),
      })) || [];

      // Build AWS payload
      const awsPayload = buildQuotationPayload(newQuotationId, user.id, {
        quotationNumber: newQuotationNumber,
        quotationTitle: original.quotation_title ? `${original.quotation_title} (Copy)` : 'Copy',
        clientName: original.client_name,
        clientAddress: original.client_address || '',
        dateOfProposal: new Date().toISOString().split('T')[0],
        validTill: original.valid_till || '',
        projectDeadline: original.project_deadline || undefined,
        placeOfProject: original.place_of_project || '',
        warranty: original.warranty || '',
        projectType: original.project_type || '',
        status: 'draft',
        gstEnabled: original.gst_enabled || false,
        gstPercentage: original.gst_percentage || 0,
        gstAmount: original.gst_amount || 0,
        discountAmount: original.discount_amount || 0,
        subtotal: original.subtotal || 0,
        grandTotal: original.grand_total || 0,
        sections: awsSections,
      });

      // Send to AWS first (source of truth)
      const awsResponse = await createQuotation(awsPayload);
      if (!awsResponse.success) {
        throw new Error(awsResponse.error || 'Failed to save quotation to AWS');
      }

      // After AWS success, store minimal data in Supabase
      const { data: newQuotation, error: insertError } = await supabase
        .from('quotations')
        .insert({
          id: newQuotationId,
          user_id: user.id,
          quotation_number: newQuotationNumber,
          quotation_title: original.quotation_title ? `${original.quotation_title} (Copy)` : 'Copy',
          client_name: original.client_name,
          client_address: original.client_address,
          project_name: original.project_name ? `${original.project_name} (Copy)` : 'Copy',
          date_of_proposal: new Date().toISOString().split('T')[0],
          valid_till: original.valid_till,
          project_deadline: original.project_deadline,
          place_of_project: original.place_of_project,
          warranty: original.warranty,
          project_type: original.project_type,
          status: 'draft',
          gst_enabled: original.gst_enabled,
          gst_percentage: original.gst_percentage,
          gst_amount: original.gst_amount,
          discount_amount: original.discount_amount,
          subtotal: original.subtotal,
          grand_total: original.grand_total
        })
        .select()
        .single();

      if (insertError || !newQuotation) throw insertError;

      // Copy sections and items to Supabase for UI queries
      if (sections) {
        for (const section of sections) {
          const { data: newSection } = await supabase
            .from('quotation_sections')
            .insert({
              quotation_id: newQuotation.id,
              section_name: section.section_name,
              sort_order: section.sort_order
            })
            .select()
            .single();

          if (newSection && section.quotation_items?.length > 0) {
            const itemsToInsert = section.quotation_items.map((item: any) => ({
              section_id: newSection.id,
              product_name: item.product_name,
              product_details: item.product_details,
              side: item.side,
              width_ft: item.width_ft,
              height_ft: item.height_ft,
              sft_area: item.sft_area,
              rate_per_sft: item.rate_per_sft,
              amount: item.amount,
              sort_order: item.sort_order
            }));
            await supabase.from('quotation_items').insert(itemsToInsert);
          }
        }
      }

      toast({
        title: "Quotation Duplicated",
        description: `Created ${newQuotationNumber} as a copy`,
      });

      loadQuotations();
    } catch (error) {
      console.error('Error duplicating quotation:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate quotation",
        variant: "destructive",
      });
    }
  };

  // formatDate is now provided by useLocalization hook

  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Quotations</h1>
            <p className="text-sm text-muted-foreground mt-1">View and manage all your quotations</p>
          </div>
          <Button onClick={() => navigate('/')}>
            <Plus className="h-4 w-4 mr-2" />
            New Quotation
          </Button>
        </div>

        {loading ? (
          <ListSkeleton count={4} />
        ) : quotations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No quotations yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Create your first quotation to get started</p>
              <Button onClick={() => navigate('/')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Quotation
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {quotations.map((quotation) => (
              <Card key={quotation.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-foreground">{quotation.quotation_title || quotation.project_name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{quotation.client_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{quotation.quotation_number}</p>
                      </div>
                      <Badge className={getStatusColor(quotation.status)}>
                        {quotation.status?.charAt(0).toUpperCase() + quotation.status?.slice(1) || 'Draft'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-border">
                      <div>
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p className="text-lg font-bold text-primary tabular-nums">
                          {formatCurrency(quotation.grand_total || 0, true)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p className="text-sm font-medium">
                          {formatDate(quotation.date_of_proposal || quotation.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {quotation.status === 'draft' ? (
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => navigate(`/?id=${quotation.id}`)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Draft
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => navigate(`/quotations/${quotation.id}`)}
                        >
                          View Details
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="shrink-0"
                        onClick={() => handleDuplicateQuotation(quotation.id)}
                        title="Duplicate"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon" className="text-destructive hover:text-destructive shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Quotation?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this quotation and all its sections and items. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteQuotation(quotation.id)} 
                              disabled={deletingId === quotation.id}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {deletingId === quotation.id ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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

export default Quotations;