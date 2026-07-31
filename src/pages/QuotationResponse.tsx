import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
        // Anonymous visitors have no RLS access to the quotations table directly (by design —
        // a table-level anon policy would let anyone with the public anon key enumerate every
        // tenant's quotations). This RPC does the lookup + atomic accept/reject entirely
        // server-side, scoped to exactly the one id in the link.
        const { data, error: rpcError } = await supabase.rpc("respond_to_quotation", {
          p_id: quotationId,
          p_action: action,
        });

        if (rpcError || !data) {
          setError("An unexpected error occurred. Please try again.");
          setLoading(false);
          return;
        }

        const result = data as {
          success: boolean;
          quotation_number?: string;
          status?: string;
          error?: string;
        };

        if (result.quotation_number) {
          setQuotationNumber(result.quotation_number);
        }

        if (!result.success) {
          if (result.error === "already_responded") {
            setError(`This quotation has already been ${result.status}.`);
          } else if (result.error === "not_found") {
            setError("Quotation not found. It may have been deleted.");
          } else {
            setError("Invalid link. Please contact the sender.");
          }
          setLoading(false);
          return;
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
