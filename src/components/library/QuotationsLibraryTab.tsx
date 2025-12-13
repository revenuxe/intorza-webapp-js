import { useState, useEffect } from "react";
import { FileText, Calendar, User, IndianRupee, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface Quotation {
  id: string;
  quotation_number: string;
  project_name: string;
  client_name: string;
  grand_total: number;
  status: string;
  created_at: string;
}

export const QuotationsLibraryTab = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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
        .select('id, quotation_number, project_name, client_name, grand_total, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setQuotations(data || []);
    } catch (error) {
      console.error('Error loading quotations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-700 border-red-500/20';
      case 'pending': return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredQuotations = quotations.filter(q =>
    q.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.quotation_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading quotations...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Quotations Library
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            All your quotations in one place. Items and pricing from these are automatically learned for faster quotation creation.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search by project, client or number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {filteredQuotations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {quotations.length === 0 
                ? "No quotations yet. Create your first quotation to see it here."
                : "No quotations match your search."}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuotations.map((quotation) => (
                <div
                  key={quotation.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium">{quotation.project_name}</h4>
                      <Badge variant="outline" className={getStatusColor(quotation.status)}>
                        {quotation.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {quotation.client_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(quotation.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <IndianRupee className="h-3 w-3" />
                        {quotation.grand_total?.toLocaleString('en-IN') || 0}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/quotation/${quotation.id}`}>
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center pt-4">
            {quotations.length} quotations • ₹{quotations.reduce((sum, q) => sum + (q.grand_total || 0), 0).toLocaleString('en-IN')} total value
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
