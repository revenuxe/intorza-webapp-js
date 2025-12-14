import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Upload, Eye } from "lucide-react";
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
import { useSearchParams } from "react-router-dom";
import { useAuthAction } from "@/hooks/useAuthAction";
import { useQuotationAutomation } from "@/hooks/useQuotationAutomation";
import { CustomizeFieldsDrawer, QuotationSettings, getQuotationSettings } from "@/components/CustomizeFieldsDrawer";
import { PDFPreviewEditor } from "@/components/PDFPreviewEditor";
import { PDFEditorSettings, getEditorSettings } from "@/lib/pdfThemes";
import { ClientSelector } from "@/components/quotation/ClientSelector";
import { ProductNameInput } from "@/components/quotation/ProductNameInput";

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
interface PaymentStage {
  id: string;
  stage: string;
  milestone: string;
  percentage: number;
}
const CreateQuotation = () => {
  const {
    toast
  } = useToast();
  const {
    requireAuth,
    clearPendingAction,
    getPendingAction
  } = useAuthAction();
  const [searchParams, setSearchParams] = useSearchParams();
  const quotationId = searchParams.get('id');
  const continueAction = searchParams.get('continueAction');
  const [actionExecuted, setActionExecuted] = useState(false);
  const smartDefaultsApplied = useRef(false);
  
  // Use automation hook
  const {
    loading: automationLoading,
    clients,
    itemPatterns,
    getSmartDefaults,
    getClientAddress,
    getItemDefaults,
    saveLastUsedPreferences,
    trackItemUsage,
  } = useQuotationAutomation();

  const [sections, setSections] = useState<Section[]>([{
    id: "1",
    title: "",
    items: [{
      id: "1",
      side: "A",
      productName: "",
      productDetails: "",
      widthFt: 0,
      heightFt: 0,
      sftArea: 0,
      ratePerSft: 0,
      amount: 0
    }]
  }]);
  const [projectTitle, setProjectTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [dateOfProposal, setDateOfProposal] = useState("");
  const [quotationValidTill, setQuotationValidTill] = useState("");
  const [projectDeadline, setProjectDeadline] = useState("");
  const [placeOfProject, setPlaceOfProject] = useState("");
  const [warranty, setWarranty] = useState("10");
  const [projectType, setProjectType] = useState("");
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState("18");
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [enableSocialMediaDiscount, setEnableSocialMediaDiscount] = useState(false);
  const [socialMediaDiscountRate, setSocialMediaDiscountRate] = useState(6);
  const [paymentStages, setPaymentStages] = useState<PaymentStage[]>([{
    id: "1",
    stage: "1",
    milestone: "Design Phase",
    percentage: 10
  }, {
    id: "2",
    stage: "2",
    milestone: "Material Procurement",
    percentage: 30
  }, {
    id: "3",
    stage: "3",
    milestone: "Execution Start",
    percentage: 30
  }, {
    id: "4",
    stage: "4",
    milestone: "Mid-Execution",
    percentage: 20
  }, {
    id: "5",
    stage: "5",
    milestone: "Final Handover",
    percentage: 10
  }]);
  const [profile, setProfile] = useState({
    company_name: "",
    logo_url: "",
    address: "",
    phone: "",
    email: "",
    gstin: "",
    professional_advantages: "",
    signature_url: "",
    terms_conditions: [] as any[],
    bank_name: "",
    bank_account_number: "",
    bank_ifsc_code: "",
    bank_account_holder: "",
    upi_id: "",
    payment_qr_url: ""
  });
  const [formRestored, setFormRestored] = useState(false);
  const [customizeSettings, setCustomizeSettings] = useState<QuotationSettings>(getQuotationSettings());
  const [showPreview, setShowPreview] = useState(false);

  // Restore form data from sessionStorage after login
  useEffect(() => {
    if (continueAction && !formRestored) {
      const {
        formData
      } = getPendingAction();
      if (formData) {
        if (formData.sections) setSections(formData.sections);
        if (formData.projectTitle) setProjectTitle(formData.projectTitle);
        if (formData.clientName) setClientName(formData.clientName);
        if (formData.clientAddress) setClientAddress(formData.clientAddress);
        if (formData.dateOfProposal) setDateOfProposal(formData.dateOfProposal);
        if (formData.quotationValidTill) setQuotationValidTill(formData.quotationValidTill);
        if (formData.projectDeadline) setProjectDeadline(formData.projectDeadline);
        if (formData.placeOfProject) setPlaceOfProject(formData.placeOfProject);
        if (formData.warranty) setWarranty(formData.warranty);
        if (formData.projectType) setProjectType(formData.projectType);
        if (formData.gstEnabled !== undefined) setGstEnabled(formData.gstEnabled);
        if (formData.gstRate) setGstRate(formData.gstRate);
        if (formData.discountPercentage !== undefined) setDiscountPercentage(formData.discountPercentage);
        if (formData.enableSocialMediaDiscount !== undefined) setEnableSocialMediaDiscount(formData.enableSocialMediaDiscount);
        if (formData.socialMediaDiscountRate !== undefined) setSocialMediaDiscountRate(formData.socialMediaDiscountRate);
      }
      setFormRestored(true);
    }
  }, [continueAction, formRestored]);

  // Apply smart defaults on initial load (only for new quotations)
  useEffect(() => {
    if (!automationLoading && !quotationId && !smartDefaultsApplied.current && !continueAction) {
      const defaults = getSmartDefaults();
      setDateOfProposal(defaults.dateOfProposal);
      setQuotationValidTill(defaults.quotationValidTill);
      setWarranty(defaults.warranty);
      setProjectType(defaults.projectType);
      setPlaceOfProject(defaults.placeOfProject);
      setGstEnabled(defaults.gstEnabled);
      setGstRate(defaults.gstRate);
      setDiscountPercentage(defaults.discountPercentage);
      setEnableSocialMediaDiscount(defaults.enableSocialMediaDiscount);
      setSocialMediaDiscountRate(defaults.socialMediaDiscountRate);
      smartDefaultsApplied.current = true;
    }
  }, [automationLoading, quotationId, continueAction, getSmartDefaults]);

  useEffect(() => {
    loadProfile();
    if (quotationId) {
      loadQuotation(quotationId);
    }
  }, [quotationId]);

  // Handle continuing actions after login (wait for form to be restored)
  useEffect(() => {
    const executePendingAction = async () => {
      if (continueAction && formRestored && !actionExecuted) {
        setActionExecuted(true);
        clearPendingAction();

        // Remove continueAction from URL
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('continueAction');
        setSearchParams(newParams, {
          replace: true
        });

        // Small delay to ensure state is fully updated
        setTimeout(async () => {
          if (continueAction === 'saveDraft') {
            await handleSaveQuotation('draft');
          } else if (continueAction === 'downloadPdf') {
            await handleDownloadPDF();
          } else if (continueAction === 'saveAndSend') {
            await handleSaveQuotation('pending');
          }
        }, 800);
      }
    };
    executePendingAction();
  }, [continueAction, formRestored, actionExecuted]);
  const loadProfile = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        data,
        error
      } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error) throw error;
      if (data) {
        // Get default templates from My Library
        const { data: paymentTemplate } = await supabase
          .from('payment_templates')
          .select('stages')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .single();

        const { data: termsTemplate } = await supabase
          .from('terms_templates')
          .select('content')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .eq('template_type', 'quotation')
          .single();

        const { data: bankTemplate } = await supabase
          .from('bank_detail_templates')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .single();

        setProfile({
          company_name: data.company_name || "",
          logo_url: data.logo_url || "",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          gstin: data.gstin || "",
          professional_advantages: data.professional_advantages || "",
          signature_url: data.signature_url || "",
          terms_conditions: (termsTemplate?.content as any) || data.terms_conditions as any || [],
          bank_name: bankTemplate?.bank_name || (data as any).bank_name || "",
          bank_account_number: bankTemplate?.account_number || (data as any).bank_account_number || "",
          bank_ifsc_code: bankTemplate?.ifsc_code || (data as any).bank_ifsc_code || "",
          bank_account_holder: bankTemplate?.account_holder_name || (data as any).bank_account_holder || "",
          upi_id: bankTemplate?.upi_id || (data as any).upi_id || "",
          payment_qr_url: bankTemplate?.qr_code_url || (data as any).payment_qr_url || ""
        });

        // Load payment stages - prefer template over profile
        if (paymentTemplate?.stages) {
          setPaymentStages(paymentTemplate.stages as any);
        } else if (data.payment_stages) {
          setPaymentStages(data.payment_stages as any);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };
  const loadQuotation = async (id: string) => {
    try {
      // Load quotation data
      const {
        data: quotation,
        error: quotationError
      } = await supabase.from('quotations').select('*').eq('id', id).single();
      if (quotationError) throw quotationError;

      // Pre-fill form fields
      setProjectTitle(quotation.quotation_title || "");
      setClientName(quotation.client_name || "");
      setClientAddress(quotation.client_address || "");
      setDateOfProposal(quotation.date_of_proposal || "");
      setQuotationValidTill(quotation.valid_till || "");
      setProjectDeadline(quotation.project_deadline || "");
      setPlaceOfProject(quotation.place_of_project || "");
      setWarranty(quotation.warranty || "10");
      setProjectType(quotation.project_type || "");
      setGstEnabled(quotation.gst_enabled || false);
      setGstRate(quotation.gst_percentage?.toString() || "18");

      // Calculate discount percentage from discount amount
      if (quotation.discount_amount && quotation.subtotal) {
        const discountPercent = quotation.discount_amount / quotation.subtotal * 100;
        setDiscountPercentage(discountPercent);
      }

      // Load sections
      const {
        data: sectionsData,
        error: sectionsError
      } = await supabase.from('quotation_sections').select('*').eq('quotation_id', id).order('sort_order');
      if (sectionsError) throw sectionsError;

      // Load items for each section
      const loadedSections: Section[] = [];
      for (const section of sectionsData || []) {
        const {
          data: itemsData,
          error: itemsError
        } = await supabase.from('quotation_items').select('*').eq('section_id', section.id).order('sort_order');
        if (itemsError) throw itemsError;
        loadedSections.push({
          id: section.id,
          title: section.section_name,
          items: (itemsData || []).map(item => ({
            id: item.id,
            side: item.side || "A",
            productName: item.product_name || "",
            productDetails: item.product_details || "",
            widthFt: item.width_ft || 0,
            heightFt: item.height_ft || 0,
            sftArea: item.sft_area || 0,
            ratePerSft: item.rate_per_sft || 0,
            amount: item.amount || 0
          }))
        });
      }
      if (loadedSections.length > 0) {
        setSections(loadedSections);
      }
      toast({
        title: "Quotation loaded",
        description: "Existing quotation data has been loaded for editing"
      });
    } catch (error) {
      console.error('Error loading quotation:', error);
      toast({
        title: "Load failed",
        description: "Failed to load quotation data",
        variant: "destructive"
      });
    }
  };
  const addSection = () => {
    setSections([...sections, {
      id: Date.now().toString(),
      title: "",
      items: [{
        id: Date.now().toString(),
        side: "A",
        productName: "",
        productDetails: "",
        widthFt: 0,
        heightFt: 0,
        sftArea: 0,
        ratePerSft: 0,
        amount: 0
      }]
    }]);
  };
  const addItemToSection = (sectionId: string) => {
    setSections(sections.map(section => section.id === sectionId ? {
      ...section,
      items: [...section.items, {
        id: Date.now().toString(),
        side: "A",
        productName: "",
        productDetails: "",
        widthFt: 0,
        heightFt: 0,
        sftArea: 0,
        ratePerSft: 0,
        amount: 0
      }]
    } : section));
  };
  const removeItem = (sectionId: string, itemId: string) => {
    setSections(sections.map(section => section.id === sectionId ? {
      ...section,
      items: section.items.filter(item => item.id !== itemId)
    } : section));
  };
  const removeSection = (sectionId: string) => {
    setSections(sections.filter(section => section.id !== sectionId));
  };
  const updateSectionTitle = (sectionId: string, title: string) => {
    setSections(sections.map(section => section.id === sectionId ? {
      ...section,
      title
    } : section));
  };
  const updateItem = (sectionId: string, itemId: string, field: keyof LineItem, value: any) => {
    setSections(sections.map(section => section.id === sectionId ? {
      ...section,
      items: section.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = {
            ...item,
            [field]: value
          };
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
      })
    } : section));
  };
  const subtotal = sections.reduce((sum, section) => sum + section.items.reduce((itemSum, item) => itemSum + item.amount, 0), 0);

  // Calculate social media discount based on custom rate
  const socialMediaDiscountAmount = enableSocialMediaDiscount ? subtotal * (socialMediaDiscountRate / 100) : 0;
  const discountAmount = enableSocialMediaDiscount ? socialMediaDiscountAmount : subtotal * discountPercentage / 100;
  const gstAmount = gstEnabled ? (subtotal - discountAmount) * parseFloat(gstRate) / 100 : 0;
  const grandTotal = subtotal - discountAmount + gstAmount;
  const getFormData = () => ({
    sections,
    projectTitle,
    clientName,
    clientAddress,
    dateOfProposal,
    quotationValidTill,
    projectDeadline,
    placeOfProject,
    warranty,
    projectType,
    gstEnabled,
    gstRate,
    discountPercentage,
    enableSocialMediaDiscount,
    socialMediaDiscountRate
  });
  const handleSaveQuotation = async (status: string) => {
    try {
      if (!clientName || !projectTitle) {
        toast({
          title: "Missing information",
          description: "Please fill in client name and project title",
          variant: "destructive"
        });
        return;
      }
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');
      if (quotationId) {
        // Update existing quotation
        const {
          error: quotationError
        } = await supabase.from('quotations').update({
          quotation_title: projectTitle,
          client_name: clientName,
          client_address: clientAddress,
          project_name: projectTitle,
          date_of_proposal: dateOfProposal || new Date().toISOString().split('T')[0],
          valid_till: quotationValidTill,
          project_deadline: projectDeadline || null,
          place_of_project: placeOfProject,
          warranty: warranty,
          project_type: projectType,
          status: status,
          gst_enabled: gstEnabled,
          gst_percentage: parseFloat(gstRate),
          gst_amount: gstAmount,
          discount_amount: discountAmount,
          subtotal: subtotal,
          grand_total: grandTotal
        }).eq('id', quotationId);
        if (quotationError) throw quotationError;

        // Delete existing sections and items
        const {
          error: deleteSectionsError
        } = await supabase.from('quotation_sections').delete().eq('quotation_id', quotationId);
        if (deleteSectionsError) throw deleteSectionsError;

        // Insert updated sections and items
        for (const section of sections) {
          const {
            data: sectionData,
            error: sectionError
          } = await supabase.from('quotation_sections').insert({
            quotation_id: quotationId,
            section_name: section.title,
            sort_order: sections.indexOf(section)
          }).select().single();
          if (sectionError) throw sectionError;
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
            sort_order: index
          }));
          const {
            error: itemsError
          } = await supabase.from('quotation_items').insert(itemsToInsert);
          if (itemsError) throw itemsError;
        }
        toast({
          title: "Quotation updated",
          description: "Quotation has been updated successfully"
        });
      } else {
        // Create new quotation
        const quotationNumber = `QT-${Date.now()}`;
        const {
          data: quotationData,
          error: quotationError
        } = await supabase.from('quotations').insert({
          user_id: user.id,
          quotation_number: quotationNumber,
          quotation_title: projectTitle,
          client_name: clientName,
          client_address: clientAddress,
          project_name: projectTitle,
          date_of_proposal: dateOfProposal || new Date().toISOString().split('T')[0],
          valid_till: quotationValidTill,
          project_deadline: projectDeadline || null,
          place_of_project: placeOfProject,
          warranty: warranty,
          project_type: projectType,
          status: status,
          gst_enabled: gstEnabled,
          gst_percentage: parseFloat(gstRate),
          gst_amount: gstAmount,
          discount_amount: discountAmount,
          subtotal: subtotal,
          grand_total: grandTotal
        }).select().single();
        if (quotationError) throw quotationError;
        for (const section of sections) {
          const {
            data: sectionData,
            error: sectionError
          } = await supabase.from('quotation_sections').insert({
            quotation_id: quotationData.id,
            section_name: section.title,
            sort_order: sections.indexOf(section)
          }).select().single();
          if (sectionError) throw sectionError;
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
            sort_order: index
          }));
          const {
            error: itemsError
          } = await supabase.from('quotation_items').insert(itemsToInsert);
          if (itemsError) throw itemsError;
        }
        toast({
          title: "Quotation saved",
          description: `Quotation ${quotationNumber} has been saved successfully`
        });
      }

      // Silently save last used preferences and track item usage
      saveLastUsedPreferences({
        warranty,
        projectType,
        placeOfProject,
        gstEnabled,
        gstRate,
        discountPercentage,
        enableSocialMediaDiscount,
        socialMediaDiscountRate,
      });

      // Track item usage for smart suggestions
      const allItems = sections.flatMap(section => 
        section.items.map(item => ({
          productName: item.productName,
          productDetails: item.productDetails,
          ratePerSft: item.ratePerSft,
        }))
      );
      trackItemUsage(allItems);

      // Reset form if saved as pending
      if (status === 'pending') {
        setClientName("");
        setClientAddress("");
        setDateOfProposal("");
        setQuotationValidTill("");
        setPlaceOfProject("");
        setProjectType("");
        setSections([{
          id: "1",
          title: "",
          items: [{
            id: "1",
            side: "A",
            productName: "",
            productDetails: "",
            widthFt: 0,
            heightFt: 0,
            sftArea: 0,
            ratePerSft: 0,
            amount: 0
          }]
        }]);
        
        // Re-apply smart defaults after reset
        const defaults = getSmartDefaults();
        setDateOfProposal(defaults.dateOfProposal);
        setQuotationValidTill(defaults.quotationValidTill);
      }
    } catch (error) {
      console.error('Error saving quotation:', error);
      toast({
        title: "Save failed",
        description: "Failed to save quotation. Please try again.",
        variant: "destructive"
      });
    }
  };
  const handleDownloadPDF = async (editorSettings?: PDFEditorSettings) => {
    try {
      if (!clientName || !clientAddress) {
        toast({
          title: "Missing information",
          description: "Please fill in client name and address before downloading PDF",
          variant: "destructive"
        });
        return;
      }
      await generateQuotationPDF({
        quotationId: quotationId || undefined,
        quotationTitle: projectTitle,
        clientName,
        clientAddress,
        dateOfProposal: dateOfProposal || new Date().toLocaleDateString('en-IN'),
        quotationValidTill: quotationValidTill || '',
        projectDeadline: projectDeadline || '',
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
        discount: discountAmount,
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
        socialMediaDiscountRate,
        paymentStages: paymentStages.map(s => ({
          stage: s.stage,
          milestone: s.milestone,
          percentage: s.percentage
        })),
        termsConditions: profile.terms_conditions,
        bankDetails: {
          bankName: profile.bank_name,
          accountNumber: profile.bank_account_number,
          ifscCode: profile.bank_ifsc_code,
          accountHolder: profile.bank_account_holder,
          upiId: profile.upi_id,
          qrCodeUrl: profile.payment_qr_url
        },
        settings: customizeSettings,
        editorSettings: editorSettings || getEditorSettings()
      });
      toast({
        title: "PDF Downloaded",
        description: "Your quotation PDF has been generated successfully"
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF Generation Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };
  const getQuotationPreviewData = () => ({
    quotationTitle: projectTitle,
    clientName,
    clientAddress,
    dateOfProposal,
    sections,
    subtotal,
    grandTotal,
    companyName: profile.company_name,
    companyLogo: profile.logo_url
  });
  return <div className="container max-w-5xl mx-auto p-4 md:p-6 lg:p-8 pb-24 md:pb-8">
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
            <CustomizeFieldsDrawer type="quotation" settings={customizeSettings} onSettingsChange={s => setCustomizeSettings(s as QuotationSettings)} />
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
              <Input id="projectTitle" value={projectTitle} onChange={e => setProjectTitle(e.target.value)} placeholder="e.g., BEST BUDGET, PREMIUM PACKAGE" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customizeSettings.showClientName && <div className="space-y-2">
                  <Label htmlFor="clientName">Client Name</Label>
                  <ClientSelector
                    value={clientName}
                    onChange={setClientName}
                    clients={clients}
                    onClientSelect={(client) => {
                      if (client.address && !clientAddress) {
                        setClientAddress(client.address);
                      }
                    }}
                    placeholder="Enter or select client name"
                  />
                </div>}
              {customizeSettings.showClientAddress && <div className="space-y-2">
                  <Label htmlFor="clientAddress">Client Address</Label>
                  <Input id="clientAddress" placeholder="Enter address" value={clientAddress} onChange={e => setClientAddress(e.target.value)} />
                </div>}
              {customizeSettings.showDateOfProposal && <div className="space-y-2">
                  <Label htmlFor="dateOfProposal">Date of Proposal</Label>
                  <Input id="dateOfProposal" type="date" value={dateOfProposal} onChange={e => setDateOfProposal(e.target.value)} />
                </div>}
              {customizeSettings.showQuotationValidTill && <div className="space-y-2">
                  <Label htmlFor="quotationValidTill">Quotation Valid Till</Label>
                  <Input id="quotationValidTill" type="date" value={quotationValidTill} onChange={e => setQuotationValidTill(e.target.value)} />
                </div>}
              {customizeSettings.showProjectDeadline && <div className="space-y-2">
                  <Label htmlFor="projectDeadline">Project Deadline</Label>
                  <Input id="projectDeadline" type="date" value={projectDeadline} onChange={e => setProjectDeadline(e.target.value)} />
                </div>}
              {customizeSettings.showPlaceOfProject && <div className="space-y-2">
                  <Label htmlFor="placeOfProject">Place of Project</Label>
                  <Input id="placeOfProject" placeholder="Enter location" value={placeOfProject} onChange={e => setPlaceOfProject(e.target.value)} />
                </div>}
              {customizeSettings.showWarranty && <div className="space-y-2">
                  <Label htmlFor="warranty">Warranty (Years)</Label>
                  <Input id="warranty" type="number" value={warranty} onChange={e => setWarranty(e.target.value)} placeholder="10" />
                </div>}
              {customizeSettings.showProjectType && <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="projectType">Project Type</Label>
                  <Input id="projectType" value={projectType} onChange={e => setProjectType(e.target.value)} placeholder="e.g., Residential - 2BHK RENOVATION" />
                </div>}
              {!profile.logo_url && <div className="space-y-2 md:col-span-2 p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Company logo not uploaded. <a href="/settings" className="text-primary underline">Go to Settings</a> to upload your logo.
                  </p>
                </div>}
            </div>
          </CardContent>
        </Card>

        {/* Sections & Items */}
        {sections.map((section, sectionIndex) => <Card key={section.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <Input value={section.title} onChange={e => updateSectionTitle(section.id, e.target.value)} className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0" placeholder="Section Title" />
                {sections.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeSection(section.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Table Header - Hidden on mobile, shown on tablet+ */}
              <div className="hidden md:block overflow-x-auto">
                <div className="min-w-[800px]">
                  <div className="grid gap-2 text-sm font-medium text-muted-foreground border-b pb-2" style={{
                gridTemplateColumns: `${customizeSettings.showSideColumn ? '60px ' : ''}120px ${customizeSettings.showProductDetails ? '1fr ' : ''}${customizeSettings.showDetailedSizeColumns ? '80px 80px 80px ' : ''}100px 100px`
              }}>
                    {customizeSettings.showSideColumn && <div>Side</div>}
                    <div>Product Name</div>
                    {customizeSettings.showProductDetails && <div>Product Details</div>}
                    {customizeSettings.showDetailedSizeColumns && <>
                        <div>Width (Ft)</div>
                        <div>Height (Ft)</div>
                        <div>Sft Area</div>
                      </>}
                    <div>Rate/Sft</div>
                    <div>Amount</div>
                  </div>
                </div>
              </div>

              {/* Items */}
              {section.items.map((item, itemIndex) => <div key={item.id} className="p-4 border border-border rounded-lg space-y-4 bg-muted/30">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Item {itemIndex + 1}</span>
                    {section.items.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeItem(section.id, item.id)} className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>}
                  </div>

                  {/* Desktop Table Row */}
                  <div className="hidden md:block overflow-x-auto">
                    <div className="min-w-[800px]">
                      <div className="grid gap-2" style={{
                  gridTemplateColumns: `${customizeSettings.showSideColumn ? '60px ' : ''}120px ${customizeSettings.showProductDetails ? '1fr ' : ''}${customizeSettings.showDetailedSizeColumns ? '80px 80px 80px ' : ''}100px 100px`
                }}>
                        {customizeSettings.showSideColumn && <Input value={item.side} onChange={e => updateItem(section.id, item.id, "side", e.target.value)} placeholder="A" className="h-9" />}
                        <ProductNameInput
                          value={item.productName}
                          onChange={(name) => updateItem(section.id, item.id, "productName", name)}
                          patterns={itemPatterns}
                          onProductSelect={(pattern) => {
                            // Auto-fill details and rate when product is selected
                            if (pattern.product_details && !item.productDetails) {
                              updateItem(section.id, item.id, "productDetails", pattern.product_details);
                            }
                            if (pattern.preferred_rate && pattern.preferred_rate > 0 && !item.ratePerSft) {
                              updateItem(section.id, item.id, "ratePerSft", pattern.preferred_rate);
                            }
                          }}
                          placeholder="Product"
                          className="h-9"
                        />
                        {customizeSettings.showProductDetails && <Textarea value={item.productDetails} onChange={e => updateItem(section.id, item.id, "productDetails", e.target.value)} placeholder="Detailed description..." className="resize-none h-9 min-h-[36px]" rows={1} />}
                        {customizeSettings.showDetailedSizeColumns && <>
                            <Input type="number" value={item.widthFt || ""} onChange={e => updateItem(section.id, item.id, "widthFt", parseFloat(e.target.value) || 0)} placeholder="0" step="0.1" className="h-9" />
                            <Input type="number" value={item.heightFt || ""} onChange={e => updateItem(section.id, item.id, "heightFt", parseFloat(e.target.value) || 0)} placeholder="0" step="0.1" className="h-9" />
                            <Input type="number" value={item.sftArea || ""} onChange={e => updateItem(section.id, item.id, "sftArea", parseFloat(e.target.value) || 0)} placeholder="0" step="0.01" className="h-9" />
                          </>}
                        <Input type="number" value={item.ratePerSft || ""} onChange={e => updateItem(section.id, item.id, "ratePerSft", parseFloat(e.target.value) || 0)} placeholder="0" step="0.01" className="h-9" />
                        <div className="h-9 flex items-center font-semibold tabular-nums">
                          ₹{item.amount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2
                    })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Stacked Layout */}
                  <div className="md:hidden space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {customizeSettings.showSideColumn && <div className="space-y-2">
                          <Label>Side</Label>
                          <Input value={item.side} onChange={e => updateItem(section.id, item.id, "side", e.target.value)} placeholder="A" />
                        </div>}
                      <div className={`space-y-2 ${!customizeSettings.showSideColumn ? 'col-span-2' : ''}`}>
                        <Label>Product Name</Label>
                        <ProductNameInput
                          value={item.productName}
                          onChange={(name) => updateItem(section.id, item.id, "productName", name)}
                          patterns={itemPatterns}
                          onProductSelect={(pattern) => {
                            if (pattern.product_details && !item.productDetails) {
                              updateItem(section.id, item.id, "productDetails", pattern.product_details);
                            }
                            if (pattern.preferred_rate && pattern.preferred_rate > 0 && !item.ratePerSft) {
                              updateItem(section.id, item.id, "ratePerSft", pattern.preferred_rate);
                            }
                          }}
                          placeholder="Product"
                        />
                      </div>
                    </div>

                    {customizeSettings.showProductDetails && <div className="space-y-2">
                        <Label>Product Details</Label>
                        <Textarea value={item.productDetails} onChange={e => updateItem(section.id, item.id, "productDetails", e.target.value)} placeholder="Detailed description..." rows={2} />
                      </div>}

                    {customizeSettings.showDetailedSizeColumns && <>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <Label>Width (Ft)</Label>
                            <Input type="number" value={item.widthFt || ""} onChange={e => updateItem(section.id, item.id, "widthFt", parseFloat(e.target.value) || 0)} placeholder="0" step="0.1" />
                          </div>
                          <div className="space-y-2">
                            <Label>Height (Ft)</Label>
                            <Input type="number" value={item.heightFt || ""} onChange={e => updateItem(section.id, item.id, "heightFt", parseFloat(e.target.value) || 0)} placeholder="0" step="0.1" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Sft Area</Label>
                          <Input type="number" value={item.sftArea || ""} onChange={e => updateItem(section.id, item.id, "sftArea", parseFloat(e.target.value) || 0)} placeholder="0" step="0.01" />
                        </div>
                      </>}

                    <div className="space-y-2">
                      <Label>Rate/Sft (₹)</Label>
                      <Input type="number" value={item.ratePerSft || ""} onChange={e => updateItem(section.id, item.id, "ratePerSft", parseFloat(e.target.value) || 0)} placeholder="0" step="0.01" />
                    </div>

                    <div className="space-y-1 pt-2 border-t">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Amount:</span>
                        <span className="font-semibold tabular-nums">₹{item.amount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2
                    })}</span>
                      </div>
                    </div>
                  </div>
                </div>)}

              {/* Section Subtotal */}
              <div className="flex justify-between items-center pt-4 border-t border-border">
                <span className="font-medium">Section Total</span>
                <span className="text-lg font-bold text-primary">
                  ₹{section.items.reduce((sum, item) => sum + item.amount, 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2
              })}
                </span>
              </div>

              <Button onClick={() => addItemToSection(section.id)} variant="outline" className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Add Item to Section
              </Button>
            </CardContent>
          </Card>)}

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
              {customizeSettings.showSubtotal && <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">₹{subtotal.toLocaleString("en-IN", {
                  minimumFractionDigits: 2
                })}</span>
                </div>}

              {customizeSettings.showTaxGst && <>
                  <div className="flex items-center justify-between py-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} />
                      <Label className="cursor-pointer">GST</Label>
                    </div>
                    {gstEnabled && <Select value={gstRate} onValueChange={setGstRate}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5%</SelectItem>
                          <SelectItem value="12">12%</SelectItem>
                          <SelectItem value="18">18%</SelectItem>
                        </SelectContent>
                      </Select>}
                  </div>
                  {gstEnabled && <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">GST ({gstRate}%)</span>
                      <span className="font-medium">₹{gstAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2
                  })}</span>
                    </div>}
                </>}

              {customizeSettings.showSocialMediaDiscount && <>
                  <div className="flex items-center justify-between py-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Switch checked={enableSocialMediaDiscount} onCheckedChange={setEnableSocialMediaDiscount} />
                      <Label className="cursor-pointer">Social Media Special Discount</Label>
                    </div>
                    {enableSocialMediaDiscount && <div className="flex items-center gap-2">
                        <Input type="number" value={socialMediaDiscountRate} onChange={e => setSocialMediaDiscountRate(parseFloat(e.target.value) || 0)} className="w-20 h-8" min="0" max="100" step="0.1" />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>}
                  </div>
                  {enableSocialMediaDiscount && <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Social Media Discount ({socialMediaDiscountRate}%)</span>
                      <span className="font-medium text-green-600">-₹{socialMediaDiscountAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2
                  })}</span>
                    </div>}
                </>}

              {customizeSettings.showDiscount && !enableSocialMediaDiscount && <>
                  {discountPercentage > 0 && <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount ({discountPercentage}%)</span>
                      <span className="font-medium text-green-600">-₹{discountAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2
                  })}</span>
                    </div>}
                  <div className="space-y-2">
                    <Label htmlFor="discount">Discount % (Optional)</Label>
                    <div className="flex items-center gap-2">
                      <Input id="discount" type="number" value={discountPercentage} onChange={e => setDiscountPercentage(parseFloat(e.target.value) || 0)} min="0" max="100" step="0.1" placeholder="0" className="h-8" />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                </>}

              {customizeSettings.showGrandTotal && <div className="flex justify-between text-lg font-bold pt-3 border-t border-border">
                  <span>Grand Total</span>
                  <span className="text-primary">₹{grandTotal.toLocaleString("en-IN", {
                  minimumFractionDigits: 2
                })}</span>
                </div>}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4">
              <Button variant="outline" className="w-full" onClick={() => requireAuth(() => handleSaveQuotation('draft'), 'saveDraft', getFormData())}>
                Save as Draft
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setShowPreview(true)}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button variant="outline" className="w-full" onClick={() => requireAuth(() => handleDownloadPDF(), 'downloadPdf', getFormData())}>
                Download PDF
              </Button>
              <Button className="w-full" onClick={() => requireAuth(() => handleSaveQuotation('pending'), 'saveAndSend', getFormData())}>
                Save & Send
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* PDF Preview Editor */}
        <PDFPreviewEditor open={showPreview} onClose={() => setShowPreview(false)} onDownload={settings => handleDownloadPDF(settings)} quotationData={getQuotationPreviewData()} customizeSettings={customizeSettings} />
      </div>
    </div>;
};
export default CreateQuotation;