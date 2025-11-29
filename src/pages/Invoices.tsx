import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Mock data
const invoices = [
  {
    id: "INV-001",
    client: "Priya Sharma",
    project: "Master Bedroom Wardrobe",
    total: 185000,
    paid: 185000,
    status: "Paid",
    date: "2025-11-22",
  },
  {
    id: "INV-002",
    client: "Amit Patel",
    project: "Living Room Renovation",
    total: 625000,
    paid: 300000,
    status: "Partially Paid",
    date: "2025-11-18",
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Paid":
      return "bg-green-500/10 text-green-700 hover:bg-green-500/20";
    case "Partially Paid":
      return "bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20";
    case "Unpaid":
      return "bg-orange-500/10 text-orange-700 hover:bg-orange-500/20";
    case "Overdue":
      return "bg-red-500/10 text-red-700 hover:bg-red-500/20";
    default:
      return "";
  }
};

const Invoices = () => {
  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Invoices</h1>
            <p className="text-sm text-muted-foreground mt-1">Track payments and manage invoices</p>
          </div>
          <Button>
            <Receipt className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </div>

        {/* Mobile Cards View */}
        <div className="flex flex-col gap-4">
          {invoices.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-mono text-muted-foreground">{invoice.id}</p>
                      <h3 className="font-semibold text-foreground mt-1">{invoice.project}</h3>
                      <p className="text-sm text-muted-foreground">{invoice.client}</p>
                    </div>
                    <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-sm font-bold text-foreground">
                        ₹{invoice.total.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Paid</p>
                      <p className="text-sm font-bold text-green-600">
                        ₹{invoice.paid.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Remaining</p>
                      <p className="text-sm font-bold text-primary">
                        ₹{(invoice.total - invoice.paid).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="text-sm font-medium">{invoice.date}</p>
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

export default Invoices;
