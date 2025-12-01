import { Users, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Mock data
const clients = [
  {
    id: "1",
    name: "Rajesh Kumar",
    phone: "+91 98765 43210",
    email: "rajesh@example.com",
    projects: 2,
    outstanding: 125000,
  },
  {
    id: "2",
    name: "Priya Sharma",
    phone: "+91 98765 43211",
    email: "priya@example.com",
    projects: 1,
    outstanding: 0,
  },
  {
    id: "3",
    name: "Amit Patel",
    phone: "+91 98765 43212",
    email: "amit@example.com",
    projects: 3,
    outstanding: 325000,
  },
];

const Clients = () => {
  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Clients</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your client relationships</p>
          </div>
        </div>

        {/* Mobile Cards View */}
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
                        <p className="text-xs text-muted-foreground">{client.projects} projects</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{client.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{client.email}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">Outstanding Balance</p>
                    <p className="text-lg font-bold text-primary">
                      ₹{client.outstanding.toLocaleString("en-IN")}
                    </p>
                  </div>

                  <Button variant="outline" className="w-full mt-2">
                    View Profile
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

export default Clients;
