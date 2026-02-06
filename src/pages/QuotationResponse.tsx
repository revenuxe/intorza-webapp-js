import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { updateQuotation, createClient, createClientBehavior } from "@/lib/awsApi";

const QuotationResponse = () => {
  const [searchParams] = useSearchParams();
  const quotationId = searchParams.get("id");
  const action = searchParams.get("action");
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [quotationNumber, setQuotationNumber] = useState("");

  useEffect(() => {
    const processResponse = async () => {
      if (!quotationId || !action) {
        setError("Invalid link. Please contact the sender.");
        setLoading(false);
        return;
      }

      if (action !== "accept" && action !== "reject") {
        setError("Invalid action. Please use a valid link.");
        setLoading(false);
        return;
      }

      try {
        // Get quotation details first
        const { data: quotation, error: fetchError } = await supabase
          .from("quotations")
          .select("quotation_number, status, user_id, client_name, client_address, client_id, place_of_project, project_type, subtotal, grand_total")
          .eq("id", quotationId)
          .single();

        if (fetchError || !quotation) {
          setError("Quotation not found. It may have been deleted.");
          setLoading(false);
          return;
        }

        setQuotationNumber(quotation.quotation_number);

        // Check if already responded (case-insensitive)
        const currentStatus = quotation.status?.toLowerCase();
        if (currentStatus === "accepted" || currentStatus === "rejected") {
          setError(`This quotation has already been ${quotation.status}.`);
          setLoading(false);
          return;
        }

        // Update the quotation status
        const newStatus = action === "accept" ? "accepted" : "rejected";
        
        // AWS-FIRST: Update status in AWS
        const awsResponse = await updateQuotation(quotationId, { status: newStatus });
        if (!awsResponse.success) {
          console.error('AWS update failed:', awsResponse.error);
        }
        
        // Update Supabase
        const { error: updateError } = await supabase
          .from("quotations")
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq("id", quotationId);

        if (updateError) {
          setError("Failed to update quotation. Please try again later.");
          setLoading(false);
          return;
        }

        // Auto-create client in AWS when quotation is accepted by client
        if (newStatus === 'accepted' && quotation.client_name && quotation.user_id) {
          try {
            const clientId = quotation.client_id || crypto.randomUUID();
            await createClient({
              client_id: clientId,
              company_id: quotation.user_id,
              name: quotation.client_name,
              address: quotation.client_address || undefined,
            });
            
            // Record client behavior
            await createClientBehavior({
              behavior_id: `behavior_${Date.now()}`,
              company_id: quotation.user_id,
              client_id: clientId,
              quotation_id: quotationId,
              city: quotation.place_of_project || '',
              category: quotation.project_type || 'general',
              rate: quotation.subtotal || 0,
              final_price: quotation.grand_total || 0,
              won_or_lost: 'won',
            });
            console.log('Client auto-created from response page:', quotation.client_name);
          } catch (clientError) {
            console.error('Failed to auto-create client:', clientError);
          }
        }

        setSuccess(true);
        setLoading(false);
      } catch (err) {
        console.error("Error processing response:", err);
        setError("An unexpected error occurred. Please try again.");
        setLoading(false);
      }
    };

    processResponse();
  }, [quotationId, action]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <X className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Error</h1>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAccepted = action === "accept";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <div
            className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
              isAccepted ? "bg-green-100" : "bg-red-100"
            }`}
          >
            {isAccepted ? (
              <Check className="w-8 h-8 text-green-600" />
            ) : (
              <X className="w-8 h-8 text-red-600" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {isAccepted ? "Quotation Accepted" : "Quotation Rejected"}
          </h1>
          {quotationNumber && (
            <p className="text-sm text-muted-foreground mb-4">
              Quotation #{quotationNumber}
            </p>
          )}
          <p className="text-muted-foreground">
            {isAccepted
              ? "Thank you for accepting the quotation. The sender has been notified and will proceed with the next steps."
              : "The quotation has been rejected. The sender has been notified."}
          </p>
          <div className="mt-6 pt-6 border-t">
            <p className="text-xs text-muted-foreground">
              Powered by INTORZA
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuotationResponse;
