import { useState, useEffect } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateQuotationPDF } from "@/lib/pdfGenerator";

interface LineItem {
  id: string;
  side: string;
  productName: string;
  productDetails: string;
  widthFt: number;
  heightFt: number;
  sftArea: number;
  ratePerSft: number;
  amount: number;
}

interface Section {
  id: string;
  title: string;
  items: LineItem[];
}


const CreateQuotation = () => {
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>([
    {
      id: "1",
      title: "KITCHEN WITHOUT CIVIL AND ACCESSORIES",
      items: [
        { id: "1", side: "A", productName: "BASE UNIT-1", productDetails: "", widthFt: 0, heightFt: 0, sftArea: 0, ratePerSft: 0, amount: 0 },
      ],
    },
  ]);
  const [projectTitle, setProjectTitle] = useState("BEST BUDGET");
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [dateOfProposal, setDateOfProposal] = useState("");
  const [quotationValidTill, setQuotationValidTill] = useState("");
  const [placeOfProject, setPlaceOfProject] = useState("");
  const [warranty, setWarranty] = useState("10");
  const [projectType, setProjectType] = useState("");
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState("18");
  const [discount, setDiscount] = useState(0);
  const [enableSocialMediaDiscount, setEnableSocialMediaDiscount] = useState(false);
  const [socialMediaDiscountRate, setSocialMediaDiscountRate] = useState(6);
  const [profile, setProfile] = useState({
    company_name: "",
    logo_url: "",
    address: "",
    phone: "",
    email: "",
    gstin: "",
    professional_advantages: "",
    signature_url: ""
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setProfile({
          company_name: data.company_name || "",
          logo_url: data.logo_url || "",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          gstin: data.gstin || "",
          professional_advantages: data.professional_advantages || "",
          signature_url: data.signature_url || ""
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const addSection = () => {
    setSections([
      ...sections,
      {
        id: Date.now().toString(),
        title: "NEW SECTION",
        items: [
          { id: Date.now().toString(), side: "A", productName: "", productDetails: "", widthFt: 0, heightFt: 0, sftArea: 0, ratePerSft: 0, amount: 0 },
        ],
      },
    ]);
  };

  const addItemToSection = (sectionId: string) => {
    setSections(sections.map(section => 
      section.id === sectionId
        ? {
            ...section,
            items: [
              ...section.items,
              { id: Date.now().toString(), side: "A", productName: "", productDetails: "", widthFt: 0, heightFt: 0, sftArea: 0, ratePerSft: 0, amount: 0 },
            ],
          }
        : section
    ));
  };

  const removeItem = (sectionId: string, itemId: string) => {
    setSections(sections.map(section =>
      section.id === sectionId
        ? { ...section, items: section.items.filter(item => item.id !== itemId) }
        : section
    ));
  };

  const removeSection = (sectionId: string) => {
    setSections(sections.filter(section => section.id !== sectionId));
  };

  const updateSectionTitle = (sectionId: string, title: string) => {
    setSections(sections.map(section =>
      section.id === sectionId ? { ...section, title } : section
    ));
  };

  const updateItem = (sectionId: string, itemId: string, field: keyof LineItem, value: any) => {
    setSections(sections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            items: section.items.map(item => {
              if (item.id === itemId) {
                const updatedItem = { ...item, [field]: value };
                // Auto-calculate sftArea when dimensions change
                if (field === 'widthFt' || field === 'heightFt') {
                  updatedItem.sftArea = updatedItem.widthFt * updatedItem.heightFt;
                  updatedItem.amount = updatedItem.sftArea * updatedItem.ratePerSft;
                }
                // Auto-calculate amount when rate or sftArea changes
                if (field === 'ratePerSft' || field === 'sftArea') {
                  updatedItem.amount = updatedItem.sftArea * updatedItem.ratePerSft;
                }
                return updatedItem;
              }
              return item;
            }),
          }
        : section
    ));
  };

  const subtotal = sections.reduce(
    (sum, section) => sum + section.items.reduce((itemSum, item) => itemSum + item.amount, 0),
    0
  );
  
  // Calculate social media discount based on custom rate
  const socialMediaDiscountAmount = enableSocialMediaDiscount ? subtotal * (socialMediaDiscountRate / 100) : 0;
  const discountAmount = enableSocialMediaDiscount ? socialMediaDiscountAmount : discount;
  
  const gstAmount = gstEnabled ? ((subtotal - discountAmount) * parseFloat(gstRate)) / 100 : 0;
  const grandTotal = subtotal - discountAmount + gstAmount;

  const handleSaveQuotation = async (status: string) => {
    try {
      if (!clientName || !projectTitle) {
        toast({
          title: "Missing information",
          description: "Please fill in client name and project title",
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Generate quotation number
      const quotationNumber = `QT-${Date.now()}`;

      // Insert quotation
      const { data: quotationData, error: quotationError } = await supabase
        .from('quotations')
        .insert({
          user_id: user.id,
          quotation_number: quotationNumber,
          quotation_title: projectTitle,
          client_name: clientName,
          client_address: clientAddress,
          project_name: projectTitle,
          date_of_proposal: dateOfProposal || new Date().toISOString().split('T')[0],
          valid_till: quotationValidTill,
          place_of_project: placeOfProject,
          warranty: warranty,
          project_type: projectType,
          status: status,
          gst_enabled: gstEnabled,
          gst_percentage: parseFloat(gstRate),
          gst_amount: gstAmount,
          discount_amount: discount,
          subtotal: subtotal,
          grand_total: grandTotal,
        })
        .select()
        .single();

      if (quotationError) throw quotationError;

      // Insert sections and items
      for (const section of sections) {
        const { data: sectionData, error: sectionError } = await supabase
          .from('quotation_sections')
          .insert({
            quotation_id: quotationData.id,
            section_name: section.title,
            sort_order: sections.indexOf(section),
          })
          .select()
          .single();

        if (sectionError) throw sectionError;

        // Insert items for this section
        const itemsToInsert = section.items.map((item, index) => ({
          section_id: sectionData.id,
          side: item.side,
          product_name: item.productName,
          product_details: item.productDetails,
          width_ft: item.widthFt,
          height_ft: item.heightFt,
          sft_area: item.sftArea,
          rate_per_sft: item.ratePerSft,
          amount: item.amount,
          sort_order: index,
        }));

        const { error: itemsError } = await supabase
          .from('quotation_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      toast({
        title: "Quotation saved",
        description: `Quotation ${quotationNumber} has been saved successfully`,
      });

      // Reset form if saved as pending
      if (status === 'pending') {
        setClientName("");
        setClientAddress("");
        setDateOfProposal("");
        setQuotationValidTill("");
        setPlaceOfProject("");
        setProjectType("");
        setSections([
          {
            id: "1",
            title: "KITCHEN WITHOUT CIVIL AND ACCESSORIES",
            items: [
              { id: "1", side: "A", productName: "BASE UNIT-1", productDetails: "", widthFt: 0, heightFt: 0, sftArea: 0, ratePerSft: 0, amount: 0 },
            ],
          },
        ]);
      }
    } catch (error) {
      console.error('Error saving quotation:', error);
      toast({
        title: "Save failed",
        description: "Failed to save quotation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = async () => {
    try {
      if (!clientName || !clientAddress) {
        toast({
          title: "Missing information",
          description: "Please fill in client name and address before downloading PDF",
          variant: "destructive",
        });
        return;
      }

      await generateQuotationPDF({
        quotationTitle: projectTitle,
        clientName,
        clientAddress,
        dateOfProposal: dateOfProposal || new Date().toLocaleDateString('en-IN'),
        quotationValidTill: quotationValidTill || '',
        placeOfProject: placeOfProject || '',
        warranty,
        projectType,
        sections: sections.map(section => ({
          title: section.title,
          items: section.items
        })),
        subtotal,
        gstEnabled,
        gstRate: parseFloat(gstRate),
        gstAmount,
        discount: enableSocialMediaDiscount ? socialMediaDiscountAmount : discount,
        grandTotal,
        companyLogo: profile.logo_url,
        companyName: profile.company_name,
        companyAddress: profile.address,
        companyPhone: profile.phone,
        companyEmail: profile.email,
        gstin: profile.gstin,
        professionalAdvantages: profile.professional_advantages,
        signatureUrl: profile.signature_url,
        enableSocialMediaDiscount,
        socialMediaDiscountRate
      });

      toast({
        title: "PDF Downloaded",
        description: "Your quotation PDF has been generated successfully",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF Generation Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

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
            <div className="space-y-2">
              <Label htmlFor="projectTitle">Quotation Title</Label>
              <Input 
                id="projectTitle" 
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="e.g., BEST BUDGET, PREMIUM PACKAGE" 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input 
                  id="clientName" 
                  placeholder="Enter client name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientAddress">Client Address</Label>
                <Input 
                  id="clientAddress" 
                  placeholder="Enter address"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfProposal">Date of Proposal</Label>
                <Input 
                  id="dateOfProposal" 
                  type="date"
                  value={dateOfProposal}
                  onChange={(e) => setDateOfProposal(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quotationValidTill">Quotation Valid Till</Label>
                <Input 
                  id="quotationValidTill" 
                  type="date"
                  value={quotationValidTill}
                  onChange={(e) => setQuotationValidTill(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="placeOfProject">Place of Project</Label>
                <Input 
                  id="placeOfProject" 
                  placeholder="Enter location"
                  value={placeOfProject}
                  onChange={(e) => setPlaceOfProject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warranty">Warranty (Years)</Label>
                <Input 
                  id="warranty" 
                  type="number"
                  value={warranty}
                  onChange={(e) => setWarranty(e.target.value)}
                  placeholder="10" 
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="projectType">Project Type</Label>
                <Input 
                  id="projectType" 
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  placeholder="e.g., Residential - 2BHK RENOVATION" 
                />
              </div>
              {!profile.logo_url && (
                <div className="space-y-2 md:col-span-2 p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Company logo not uploaded. <a href="/settings" className="text-primary underline">Go to Settings</a> to upload your logo.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sections & Items */}
        {sections.map((section, sectionIndex) => (
          <Card key={section.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <Input
                  value={section.title}
                  onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                  className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0"
                  placeholder="Section Title"
                />
                {sections.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSection(section.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Table Header - Hidden on mobile, shown on tablet+ */}
              <div className="hidden md:block overflow-x-auto">
                <div className="min-w-[1000px]">
                  <div className="grid grid-cols-[60px_120px_1fr_80px_80px_80px_100px_100px_100px] gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                    <div>Side</div>
                    <div>Product Name</div>
                    <div>Product Details</div>
                    <div>Width (Ft)</div>
                    <div>Height (Ft)</div>
                    <div>Sft Area</div>
                    <div>Rate/Sft</div>
                    <div>Price/Sq.ft</div>
                    <div>Amount</div>
                  </div>
                </div>
              </div>

              {/* Items */}
              {section.items.map((item, itemIndex) => (
                <div key={item.id} className="p-4 border border-border rounded-lg space-y-4 bg-muted/30">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Item {itemIndex + 1}</span>
                    {section.items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(section.id, item.id)}
                        className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Desktop Table Row */}
                  <div className="hidden md:block overflow-x-auto">
                    <div className="min-w-[1000px]">
                      <div className="grid grid-cols-[60px_120px_1fr_80px_80px_80px_100px_100px_100px] gap-2">
                        <Input
                          value={item.side}
                          onChange={(e) => updateItem(section.id, item.id, "side", e.target.value)}
                          placeholder="A"
                          className="h-9"
                        />
                        <Input
                          value={item.productName}
                          onChange={(e) => updateItem(section.id, item.id, "productName", e.target.value)}
                          placeholder="Product"
                          className="h-9"
                        />
                        <Textarea
                          value={item.productDetails}
                          onChange={(e) => updateItem(section.id, item.id, "productDetails", e.target.value)}
                          placeholder="Detailed description..."
                          className="resize-none h-9 min-h-[36px]"
                          rows={1}
                        />
                        <Input
                          type="number"
                          value={item.widthFt || ""}
                          onChange={(e) => updateItem(section.id, item.id, "widthFt", parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          step="0.1"
                          className="h-9"
                        />
                        <Input
                          type="number"
                          value={item.heightFt || ""}
                          onChange={(e) => updateItem(section.id, item.id, "heightFt", parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          step="0.1"
                          className="h-9"
                        />
                        <Input
                          type="number"
                          value={item.sftArea.toFixed(2)}
                          readOnly
                          className="h-9 bg-muted"
                        />
                        <Input
                          type="number"
                          value={item.ratePerSft || ""}
                          onChange={(e) => updateItem(section.id, item.id, "ratePerSft", parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          step="0.01"
                          className="h-9"
                        />
                        <div className="h-9 flex items-center font-medium tabular-nums">
                          ₹{item.ratePerSft.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                        <div className="h-9 flex items-center font-semibold tabular-nums">
                          ₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Stacked Layout */}
                  <div className="md:hidden space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Side</Label>
                        <Input
                          value={item.side}
                          onChange={(e) => updateItem(section.id, item.id, "side", e.target.value)}
                          placeholder="A"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Product Name</Label>
                        <Input
                          value={item.productName}
                          onChange={(e) => updateItem(section.id, item.id, "productName", e.target.value)}
                          placeholder="Product"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Product Details</Label>
                      <Textarea
                        value={item.productDetails}
                        onChange={(e) => updateItem(section.id, item.id, "productDetails", e.target.value)}
                        placeholder="Detailed description..."
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>Width (Ft)</Label>
                        <Input
                          type="number"
                          value={item.widthFt || ""}
                          onChange={(e) => updateItem(section.id, item.id, "widthFt", parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          step="0.1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Height (Ft)</Label>
                        <Input
                          type="number"
                          value={item.heightFt || ""}
                          onChange={(e) => updateItem(section.id, item.id, "heightFt", parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          step="0.1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>Sft Area</Label>
                        <Input
                          type="number"
                          value={item.sftArea.toFixed(2)}
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Rate/Sft (₹)</Label>
                        <Input
                          type="number"
                          value={item.ratePerSft || ""}
                          onChange={(e) => updateItem(section.id, item.id, "ratePerSft", parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          step="0.01"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 pt-2 border-t">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Price/Sq.ft:</span>
                        <span className="font-medium tabular-nums">₹{item.ratePerSft.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Amount:</span>
                        <span className="font-semibold tabular-nums">₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Section Subtotal */}
              <div className="flex justify-between items-center pt-4 border-t border-border">
                <span className="font-medium">Section Total</span>
                <span className="text-lg font-bold text-primary">
                  ₹{section.items.reduce((sum, item) => sum + item.amount, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <Button onClick={() => addItemToSection(section.id)} variant="outline" className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Add Item to Section
              </Button>
            </CardContent>
          </Card>
        ))}

        <Button onClick={addSection} variant="outline" className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Add New Section
        </Button>

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

              <div className="flex items-center justify-between py-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={enableSocialMediaDiscount} 
                    onCheckedChange={setEnableSocialMediaDiscount}
                  />
                  <Label className="cursor-pointer">Social Media Special Discount</Label>
                </div>
                {enableSocialMediaDiscount && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={socialMediaDiscountRate}
                      onChange={(e) => setSocialMediaDiscountRate(parseFloat(e.target.value) || 0)}
                      className="w-20 h-8"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                )}
              </div>

              {enableSocialMediaDiscount && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Social Media Discount ({socialMediaDiscountRate}%)</span>
                  <span className="font-medium text-green-600">-₹{socialMediaDiscountAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              {!enableSocialMediaDiscount && (
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
              )}

              <div className="flex justify-between text-lg font-bold pt-3 border-t border-border">
                <span>Grand Total</span>
                <span className="text-primary">₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-4">
              <Button variant="outline" className="w-full" onClick={() => handleSaveQuotation('draft')}>
                Save as Draft
              </Button>
              <Button variant="outline" className="w-full" onClick={handleDownloadPDF}>
                Download PDF
              </Button>
              <Button className="w-full" onClick={() => handleSaveQuotation('pending')}>
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
