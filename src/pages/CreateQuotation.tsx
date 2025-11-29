import { useState } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface LineItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  notes: string;
}

const categories = [
  "Modular Kitchen",
  "Wardrobe",
  "Electrical",
  "Painting",
  "False Ceiling",
  "Flooring",
  "Furniture",
  "Curtains & Fabrics",
  "Civil Work",
  "Appliances",
  "Other",
];

const units = ["sq.ft", "sq.m", "unit", "running ft", "piece", "kg", "liter"];

const CreateQuotation = () => {
  const [items, setItems] = useState<LineItem[]>([
    { id: "1", name: "", quantity: 1, unit: "sq.ft", price: 0, notes: "" },
  ]);
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState("18");
  const [discount, setDiscount] = useState(0);

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), name: "", quantity: 1, unit: "sq.ft", price: 0, notes: "" },
    ]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const gstAmount = gstEnabled ? (subtotal * parseFloat(gstRate)) / 100 : 0;
  const grandTotal = subtotal + gstAmount - discount;

  return (
    <div className="container max-w-5xl mx-auto p-4 md:p-6 lg:p-8 pb-24 md:pb-8">
      <div className="flex flex-col gap-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Create Quotation</h1>
            <p className="text-sm text-muted-foreground mt-1">Fill in the details to create a new quotation</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
              Templates
            </Button>
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
              Customize View
            </Button>
          </div>
        </div>

        {/* Project Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input id="projectName" placeholder="Enter project name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input id="clientName" placeholder="Enter client name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientPhone">Client Phone</Label>
                <Input id="clientPhone" type="tel" placeholder="+91 " />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientEmail">Client Email (Optional)</Label>
                <Input id="clientEmail" type="email" placeholder="client@example.com" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="location">Location (Optional)</Label>
                <Input id="location" placeholder="Enter project location" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="logo">Company Logo</Label>
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Logo
                  </Button>
                  <span className="text-sm text-muted-foreground">No file chosen</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {items.map((item, index) => (
              <div key={item.id} className="p-4 border border-border rounded-lg space-y-4 bg-muted/30">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                  {items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Item Name</Label>
                    <div className="flex gap-2">
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(item.id, "name", e.target.value)}
                        placeholder="Type item name..."
                        className="flex-1"
                      />
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="outline" size="sm">
                            Select
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="h-[80vh]">
                          <SheetHeader>
                            <SheetTitle>Choose Category</SheetTitle>
                          </SheetHeader>
                          <div className="grid grid-cols-2 gap-3 mt-6">
                            {categories.map((category) => (
                              <Button
                                key={category}
                                variant="outline"
                                className="h-auto py-4 text-left justify-start"
                                onClick={() => {
                                  updateItem(item.id, "name", category);
                                }}
                              >
                                {category}
                              </Button>
                            ))}
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit</Label>
                      <Select value={item.unit} onValueChange={(value) => updateItem(item.id, "unit", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Price (₹)</Label>
                    <Input
                      type="number"
                      value={item.price}
                      onChange={(e) => updateItem(item.id, "price", parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      value={item.notes}
                      onChange={(e) => updateItem(item.id, "notes", e.target.value)}
                      placeholder="Add any notes about this item..."
                      className="resize-none"
                      rows={2}
                    />
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-medium">
                      Total: ₹{(item.quantity * item.price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <Button onClick={addItem} variant="outline" className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="sticky bottom-0 md:static shadow-lg md:shadow-none">
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} />
                  <Label className="cursor-pointer">GST</Label>
                </div>
                {gstEnabled && (
                  <Select value={gstRate} onValueChange={setGstRate}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="12">12%</SelectItem>
                      <SelectItem value="18">18%</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {gstEnabled && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">GST ({gstRate}%)</span>
                  <span className="font-medium">₹{gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="discount">Discount (Optional)</Label>
                <Input
                  id="discount"
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>

              <div className="flex justify-between text-lg font-bold pt-3 border-t border-border">
                <span>Grand Total</span>
                <span className="text-primary">₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-4">
              <Button variant="outline" className="w-full">
                Save as Draft
              </Button>
              <Button variant="outline" className="w-full">
                Preview PDF
              </Button>
              <Button className="w-full">
                Save & Send
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateQuotation;
