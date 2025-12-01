import { useState, useEffect } from "react";
import { FileText, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

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

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN');
  };

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
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading quotations...</p>
          </div>
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
                          ₹{quotation.grand_total?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p className="text-sm font-medium">
                          {formatDate(quotation.date_of_proposal || quotation.created_at)}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full mt-2"
                      onClick={() => navigate(`/quotations/${quotation.id}`)}
                    >
                      View Details
                    </Button>
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
