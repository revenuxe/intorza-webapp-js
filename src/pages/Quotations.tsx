import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Mock data
const quotations = [
  {
    id: "1",
    projectName: "Modern Kitchen Remodel",
    client: "Rajesh Kumar",
    amount: 450000,
    status: "Pending",
    date: "2025-11-25",
  },
  {
    id: "2",
    projectName: "Master Bedroom Wardrobe",
    client: "Priya Sharma",
    amount: 185000,
    status: "Accepted",
    date: "2025-11-20",
  },
  {
    id: "3",
    projectName: "Living Room Renovation",
    client: "Amit Patel",
    amount: 625000,
    status: "Converted",
    date: "2025-11-15",
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Pending":
      return "bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20";
    case "Accepted":
      return "bg-green-500/10 text-green-700 hover:bg-green-500/20";
    case "Rejected":
      return "bg-red-500/10 text-red-700 hover:bg-red-500/20";
    case "Converted":
      return "bg-primary/10 text-primary hover:bg-primary/20";
    default:
      return "";
  }
};

const Quotations = () => {
  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Quotations</h1>
            <p className="text-sm text-muted-foreground mt-1">View and manage all your quotations</p>
          </div>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            New Quotation
          </Button>
        </div>

        {/* Mobile Cards View */}
        <div className="flex flex-col gap-4">
          {quotations.map((quotation) => (
            <Card key={quotation.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-foreground">{quotation.projectName}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{quotation.client}</p>
                    </div>
                    <Badge className={getStatusColor(quotation.status)}>{quotation.status}</Badge>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Amount</p>
                      <p className="text-lg font-bold text-primary">
                        ₹{quotation.amount.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="text-sm font-medium">{quotation.date}</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-2">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Quotations;
