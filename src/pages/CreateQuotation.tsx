import { useState, useEffect, useRef, useMemo } from "react";
import { Plus, Trash2, Upload, Eye, Share2, Loader2, ImageIcon } from "lucide-react";
import { getCountryByCode } from "@/lib/countryConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { quotationsApi } from "@/lib/api";
import { generateQuotationPDF } from "@/lib/pdfGenerator";
import { useSearchParams } from "react-router-dom";
import { useAuthAction } from "@/hooks/useAuthAction";
import { useQuotationAutomation } from "@/hooks/useQuotationAutomation";
import { CustomizeFieldsDrawer, QuotationSettings, getQuotationSettings } from "@/components/CustomizeFieldsDrawer";
import { PDFPreviewEditor } from "@/components/PDFPreviewEditor";
import { PDFEditorSettings, getEditorSettings } from "@/lib/pdfThemes";
import { ClientSelector } from "@/components/quotation/ClientSelector";
import { ProductNameInput } from "@/components/quotation/ProductNameInput";
import { QuotationTemplates } from "@/components/quotation/QuotationTemplates";
import { GalleryImagePicker } from "@/components/quotation/GalleryImagePicker";
import { GalleryImage } from "@/hooks/useGallery";
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
  // Pricing is only reflected in the bill once the user explicitly applies it
  const [appliedPricing, setAppliedPricing] = useState({
    gstEnabled: false,
    gstRate: "18",
    discountPercentage: 0,
    enableSocialMediaDiscount: false,
    socialMediaDiscountRate: 6,
  });
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
    payment_qr_url: "",
    // Localization settings
    currency_code: "INR",
    currency_symbol: "₹",
    tax_label: "GST",
    locale: "en-IN",
    measurement_system: "imperial",
    country_code: "IN",
  });
  const [formRestored, setFormRestored] = useState(false);
  const [customizeSettings, setCustomizeSettings] = useState<QuotationSettings>(getQuotationSettings());
  const [showPreview, setShowPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [itemImages, setItemImages] = useState<Record<string, GalleryImage[]>>({});
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [imagePickerItemId, setImagePickerItemId] = useState<string>("");
  const [imagePickerProductName, setImagePickerProductName] = useState<string>("");

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
        if (formData.appliedPricing) setAppliedPricing(formData.appliedPricing);
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

  // Handle continuing actions after login (wait for form to be restored and profile to be loaded)
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

        // Fetch fresh profile data before executing pending action
        const freshProfile = await fetchFreshProfile();
        if (freshProfile) {
          setProfile(freshProfile);
          
          // Fetch payment stages separately
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: paymentTemplate } = await supabase
              .from('payment_templates')
              .select('stages')
              .eq('user_id', user.id)
              .eq('is_default', true)
              .single();

            const { data: profileData } = await supabase.from('profiles').select('payment_stages').eq('id', user.id).single();

            if (paymentTemplate?.stages) {
              setPaymentStages(paymentTemplate.stages as any);
            } else if (profileData?.payment_stages) {
              setPaymentStages(profileData.payment_stages as any);
            }
          }

          // Execute the pending action with the fresh profile data
          if (continueAction === 'saveDraft') {
            await handleSaveQuotation('draft');
          } else if (continueAction === 'downloadPdf') {
            const savedId = await handleSaveQuotation('pending');
            if (savedId) {
              await handleDownloadPDF(undefined, savedId, freshProfile);
            }
          } else if (continueAction === 'saveAndSend') {
            await handleSaveQuotation('pending', true);
          }
        }
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
          payment_qr_url: bankTemplate?.qr_code_url || (data as any).payment_qr_url || "",
          // Localization settings
          currency_code: data.currency_code || "INR",
          currency_symbol: data.currency_symbol || "₹",
          tax_label: data.tax_label || "GST",
          locale: data.locale || "en-IN",
          measurement_system: data.measurement_system || "imperial",
          country_code: data.country_code || "IN",
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

      // Pre-fill form fields - use quotation_title or project_name as fallback
      setProjectTitle(quotation.quotation_title || quotation.project_name || "");
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
      let loadedDiscount = 0;
      if (quotation.discount_amount && quotation.subtotal && quotation.subtotal > 0) {
        loadedDiscount = (quotation.discount_amount / quotation.subtotal) * 100;
      }
      setDiscountPercentage(loadedDiscount);

      // Saved quotations already have their pricing applied
      setAppliedPricing(prev => ({
        ...prev,
        gstEnabled: quotation.gst_enabled || false,
        gstRate: quotation.gst_percentage?.toString() || "18",
        discountPercentage: loadedDiscount,
      }));

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

  // Only applied pricing affects the bill
  const effGstEnabled = appliedPricing.gstEnabled;
  const effGstRate = appliedPricing.gstRate;
  const effDiscountPercentage = appliedPricing.discountPercentage;
  const effSocialEnabled = appliedPricing.enableSocialMediaDiscount;
  const effSocialRate = appliedPricing.socialMediaDiscountRate;

  const pricingDirty =
    effGstEnabled !== gstEnabled ||
    effGstRate !== gstRate ||
    effDiscountPercentage !== discountPercentage ||
    effSocialEnabled !== enableSocialMediaDiscount ||
    effSocialRate !== socialMediaDiscountRate;

  const applyPricing = () => {
    setAppliedPricing({
      gstEnabled,
      gstRate,
      discountPercentage,
      enableSocialMediaDiscount,
      socialMediaDiscountRate,
    });
    toast({ title: "Pricing applied", description: "Totals have been updated." });
  };

  const socialMediaDiscountAmount = effSocialEnabled ? subtotal * (effSocialRate / 100) : 0;
  const discountAmount = effSocialEnabled ? socialMediaDiscountAmount : subtotal * effDiscountPercentage / 100;
  const gstAmount = effGstEnabled ? (subtotal - discountAmount) * parseFloat(effGstRate) / 100 : 0;
  const grandTotal = subtotal - discountAmount + gstAmount;
  const getFormData = () => ({
    appliedPricing,
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
  const handleSaveQuotation = async (status: string, showShare: boolean = false): Promise<string | null> => {
    try {
      if (!clientName || !projectTitle) {
        toast({
          title: "Missing information",
          description: "Please fill in client name and project title",
          variant: "destructive"
        });
        return null;
      }
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');
      
      let savedQuotationId: string | null = null;

      // Build a payload that matches the AWS backend QuotationSchema.
      const payloadSections = sections.map((section, sIdx) => ({
        section_name: section.title || `Section ${sIdx + 1}`,
        sort_order: sIdx,
        items: section.items.map((item, iIdx) => ({
          product_name: item.productName || "",
          product_details: item.productDetails ?? null,
          side: item.side ?? null,
          width_ft: Number(item.widthFt) || 0,
          height_ft: Number(item.heightFt) || 0,
          sft_area: Number(item.sftArea) || 0,
          rate_per_sft: Number(item.ratePerSft) || 0,
          amount: Number(item.amount) || 0,
          sort_order: iIdx,
        })),
      }));

      const basePayload = {
        quotation_title: projectTitle,
        client_name: clientName,
        client_address: clientAddress,
        project_name: projectTitle,
        date_of_proposal: dateOfProposal || new Date().toISOString().split('T')[0],
        valid_till: quotationValidTill || null,
        project_deadline: projectDeadline || null,
        place_of_project: placeOfProject,
        warranty: warranty,
        project_type: projectType,
        status,
        gst_enabled: effGstEnabled,
        gst_percentage: parseFloat(effGstRate) || 0,
        gst_amount: Number(gstAmount) || 0,
        discount_amount: Number(discountAmount) || 0,
        subtotal: Number(subtotal) || 0,
        grand_total: Number(grandTotal) || 0,
        sections: payloadSections,
      };

      if (quotationId) {
        const { data: updated } = await quotationsApi.update(quotationId, basePayload);
        savedQuotationId = updated?.id || quotationId;
        toast({
          title: "Quotation updated",
          description: "Quotation has been updated successfully",
        });
      } else {
        const quotationNumber = `QT-${Date.now()}`;
        const { data: created } = await quotationsApi.create({
          ...basePayload,
          quotation_number: quotationNumber,
        });
        savedQuotationId = created?.id ?? null;
        toast({
          title: "Quotation saved",
          description: `Quotation ${quotationNumber} has been saved successfully`,
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

      // Auto-save quotation as template (silently)
      try {
        const templateName = projectTitle;
        const templateSections = sections.map(section => ({
          id: section.id,
          title: section.title,
          items: section.items.map(item => ({
            id: item.id,
            side: item.side,
            productName: item.productName,
            productDetails: item.productDetails,
            widthFt: item.widthFt,
            heightFt: item.heightFt,
            sftArea: item.sftArea,
            ratePerSft: item.ratePerSft,
            amount: item.amount,
          })),
        }));

        // Check if template already exists
        const { data: existingTemplate } = await supabase
          .from('quotation_templates')
          .select('id')
          .eq('user_id', user.id)
          .eq('template_name', templateName)
          .maybeSingle();

        if (existingTemplate) {
          // Update existing template
          await supabase
            .from('quotation_templates')
            .update({
              sections: templateSections as any,
              description: `Auto-saved from quotation: ${clientName}`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingTemplate.id);
        } else {
          // Create new template
          await supabase
            .from('quotation_templates')
            .insert({
              user_id: user.id,
              template_name: templateName,
              category: 'Custom',
              description: `Auto-saved from quotation: ${clientName}`,
              sections: templateSections as any,
            });
        }
      } catch (templateError) {
        // Silently fail - template saving is optional
        console.error('Error auto-saving template:', templateError);
      }

      // Reset form only for Save & Send flow (pending status with share)
      if (status === 'pending' && showShare) {
        if (savedQuotationId) {
          // Fetch fresh profile and generate PDF with the saved quotation ID for Accept/Reject buttons
          const freshProfile = await fetchFreshProfile();
          await handleDownloadPDF(undefined, savedQuotationId, freshProfile || undefined);
        }
        
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
      
      return savedQuotationId;
    } catch (error) {
      console.error('Error saving quotation:', error);
      toast({
        title: "Save failed",
        description: "Failed to save quotation. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  };
  
  // Helper function to fetch fresh profile data
  const fetchFreshProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (!profileData) return null;

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

    return {
      company_name: profileData.company_name || "",
      logo_url: profileData.logo_url || "",
      address: profileData.address || "",
      phone: profileData.phone || "",
      email: profileData.email || "",
      gstin: profileData.gstin || "",
      professional_advantages: profileData.professional_advantages || "",
      signature_url: profileData.signature_url || "",
      terms_conditions: (termsTemplate?.content as any) || profileData.terms_conditions as any || [],
      bank_name: bankTemplate?.bank_name || (profileData as any).bank_name || "",
      bank_account_number: bankTemplate?.account_number || (profileData as any).bank_account_number || "",
      bank_ifsc_code: bankTemplate?.ifsc_code || (profileData as any).bank_ifsc_code || "",
      bank_account_holder: bankTemplate?.account_holder_name || (profileData as any).bank_account_holder || "",
      upi_id: bankTemplate?.upi_id || (profileData as any).upi_id || "",
      payment_qr_url: bankTemplate?.qr_code_url || (profileData as any).payment_qr_url || "",
      // Localization settings
      currency_code: profileData.currency_code || "INR",
      currency_symbol: profileData.currency_symbol || "₹",
      tax_label: profileData.tax_label || "GST",
      locale: profileData.locale || "en-IN",
      measurement_system: profileData.measurement_system || "imperial",
      country_code: profileData.country_code || "IN",
    };
  };

  const handleDownloadPDF = async (editorSettings?: PDFEditorSettings, overrideQuotationId?: string, overrideProfile?: typeof profile) => {
    setIsDownloading(true);
    try {
      if (!clientName || !clientAddress) {
        toast({
          title: "Missing information",
          description: "Please fill in client name and address before downloading PDF",
          variant: "destructive"
        });
        setIsDownloading(false);
        return;
      }
      
      // Use override profile if provided, otherwise use state profile
      // If state profile is empty, fetch fresh data
      let profileToUse = overrideProfile || profile;
      if (!profileToUse.company_name && !profileToUse.logo_url) {
        const freshProfile = await fetchFreshProfile();
        if (freshProfile) {
          profileToUse = freshProfile;
          setProfile(freshProfile); // Update state for future use
        }
      }
      
      await generateQuotationPDF({
        quotationId: overrideQuotationId || quotationId || undefined,
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
          items: section.items.map(item => ({
            ...item,
            imageUrls: (itemImages[item.id] || []).map(img => img.image_url),
          }))
        })),
        subtotal,
        gstEnabled,
        gstRate: parseFloat(gstRate),
        gstAmount,
        discount: discountAmount,
        grandTotal,
        companyLogo: profileToUse.logo_url,
        companyName: profileToUse.company_name,
        companyAddress: profileToUse.address,
        companyPhone: profileToUse.phone,
        companyEmail: profileToUse.email,
        gstin: profileToUse.gstin,
        professionalAdvantages: profileToUse.professional_advantages,
        signatureUrl: profileToUse.signature_url,
        enableSocialMediaDiscount,
        socialMediaDiscountRate,
        paymentStages: paymentStages.map(s => ({
          stage: s.stage,
          milestone: s.milestone,
          percentage: s.percentage
        })),
        termsConditions: profileToUse.terms_conditions,
        bankDetails: {
          bankName: profileToUse.bank_name,
          accountNumber: profileToUse.bank_account_number,
          ifscCode: profileToUse.bank_ifsc_code,
          accountHolder: profileToUse.bank_account_holder,
          upiId: profileToUse.upi_id,
          qrCodeUrl: profileToUse.payment_qr_url
        },
        localization: {
          currencyCode: profileToUse.currency_code,
          currencySymbol: profileToUse.currency_symbol,
          locale: profileToUse.locale,
          taxLabel: profileToUse.tax_label,
          taxRegistrationLabel: profileToUse.tax_label === 'GST' ? 'GSTIN' : `${profileToUse.tax_label} No`,
          areaUnit: profileToUse.measurement_system === 'metric' ? 'Square Meters' : 'Square Feet',
          areaUnitShort: profileToUse.measurement_system === 'metric' ? 'SQM' : 'Sq.Ft',
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
    } finally {
      setIsDownloading(false);
    }
  };
  // Memoized so the object reference is stable across unrelated re-renders —
  // it's passed straight into PDFPreviewEditor's live-preview effect, which
  // treats a new reference as "data changed" and restarts PDF regeneration.
  const quotationPreviewData = useMemo(() => ({
    quotationTitle: projectTitle,
    clientName,
    clientAddress,
    dateOfProposal,
    sections: sections.map(section => ({
      ...section,
      items: section.items.map(item => ({
        ...item,
        imageUrls: (itemImages[item.id] || []).map(img => img.image_url),
      }))
    })),
    subtotal,
    grandTotal,
    companyName: profile.company_name,
    companyLogo: profile.logo_url
  }), [projectTitle, clientName, clientAddress, dateOfProposal, sections, itemImages, subtotal, grandTotal, profile.company_name, profile.logo_url]);
  return <div className="container max-w-5xl mx-auto p-4 md:p-6 lg:p-8 pb-24 md:pb-8 relative">
      {/* Download Loader Overlay */}
      {isDownloading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 p-6 bg-card rounded-lg shadow-lg border">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg font-medium">Downloading...</p>
            <p className="text-sm text-muted-foreground">Generating your PDF</p>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Create Quotation</h1>
            <p className="text-sm text-muted-foreground mt-1">Fill in the details to create a new quotation</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <QuotationTemplates onSelectTemplate={(newSections) => setSections(newSections)} currentSections={sections} onSetQuotationTitle={(title) => setProjectTitle(title)} countryCode={profile.country_code} />
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
                    <div>Rate/{profile.measurement_system === 'metric' ? 'Sqm' : 'Sft'}</div>
                    <div>Amount</div>
                  </div>
                </div>
              </div>

              {/* Items */}
              {section.items.map((item, itemIndex) => <div key={item.id} className="p-4 border border-border rounded-lg space-y-4 bg-muted/30">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Item {itemIndex + 1}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => {
                        setImagePickerItemId(item.id);
                        setImagePickerProductName(item.productName);
                        setImagePickerOpen(true);
                      }} className="h-8 text-muted-foreground hover:text-primary">
                        <ImageIcon className="h-4 w-4" />
                        {itemImages[item.id]?.length ? <span className="text-xs ml-1">{itemImages[item.id].length}</span> : null}
                      </Button>
                      {section.items.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeItem(section.id, item.id)} className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>}
                    </div>
                  </div>
                  {/* Item images preview */}
                  {itemImages[item.id]?.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {itemImages[item.id].map(img => (
                        <div key={img.id} className="relative group">
                          <img src={img.image_url} alt="" className="h-12 w-12 rounded-lg object-cover border border-border" />
                          <button onClick={() => setItemImages(prev => ({...prev, [item.id]: prev[item.id].filter(i => i.id !== img.id)}))}
                            className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                        </div>
                      ))}
                    </div>
                  )}

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
                          {profile.currency_symbol}{item.amount.toLocaleString(profile.locale, {
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
                      <Label>Rate/{profile.measurement_system === 'metric' ? 'Sqm' : 'Sft'} ({profile.currency_symbol})</Label>
                      <Input type="number" value={item.ratePerSft || ""} onChange={e => updateItem(section.id, item.id, "ratePerSft", parseFloat(e.target.value) || 0)} placeholder="0" step="0.01" />
                    </div>

                    <div className="space-y-1 pt-2 border-t">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Amount:</span>
                        <span className="font-semibold tabular-nums">{profile.currency_symbol}{item.amount.toLocaleString(profile.locale, {
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
                  {profile.currency_symbol}{section.items.reduce((sum, item) => sum + item.amount, 0).toLocaleString(profile.locale, {
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
                  <span className="font-medium">{profile.currency_symbol}{subtotal.toLocaleString(profile.locale, {
                  minimumFractionDigits: 2
                })}</span>
                </div>}

              {customizeSettings.showTaxGst && <>
                  <div className="flex items-center justify-between py-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} />
                      <Label className="cursor-pointer">{profile.tax_label}</Label>
                    </div>
                    {gstEnabled && <Select value={gstRate} onValueChange={setGstRate}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(getCountryByCode(profile.country_code)?.tax.commonRates || [5, 12, 18]).map((rate) => (
                            <SelectItem key={rate} value={rate.toString()}>{rate}%</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>}
                  </div>
                  {gstEnabled && <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{profile.tax_label} ({gstRate}%)</span>
                      <span className="font-medium">{profile.currency_symbol}{gstAmount.toLocaleString(profile.locale, {
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
                      <span className="font-medium text-green-600">-{profile.currency_symbol}{socialMediaDiscountAmount.toLocaleString(profile.locale, {
                    minimumFractionDigits: 2
                  })}</span>
                    </div>}
                </>}

              {customizeSettings.showDiscount && !enableSocialMediaDiscount && <>
                  {discountPercentage > 0 && <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount ({discountPercentage}%)</span>
                      <span className="font-medium text-green-600">-{profile.currency_symbol}{discountAmount.toLocaleString(profile.locale, {
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
                  <span className="text-primary">{profile.currency_symbol}{grandTotal.toLocaleString(profile.locale, {
                  minimumFractionDigits: 2
                })}</span>
                </div>}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4">
              <Button variant="outline" className="w-full" onClick={() => requireAuth(async () => { await handleSaveQuotation('draft'); }, 'saveDraft', getFormData())}>
                Save as Draft
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setShowPreview(true)}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  requireAuth(
                    async () => {
                      // Fetch fresh profile for PDF generation
                      const freshProfile = await fetchFreshProfile();
                      if (!quotationId) {
                        const savedId = await handleSaveQuotation("pending");
                        if (savedId) {
                          await handleDownloadPDF(undefined, savedId, freshProfile || undefined);
                        }
                      } else {
                        await handleDownloadPDF(undefined, undefined, freshProfile || undefined);
                      }
                    },
                    "downloadPdf",
                    getFormData()
                  )
                }
              >
                Download PDF
              </Button>
              <Button className="w-full" onClick={() => requireAuth(async () => { await handleSaveQuotation('pending', true); }, 'saveAndSend', getFormData())}>
                <Share2 className="h-4 w-4 mr-2" />
                Save & Send
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* PDF Preview Editor */}
        <PDFPreviewEditor open={showPreview} onClose={() => setShowPreview(false)} onDownload={settings => handleDownloadPDF(settings)} quotationData={quotationPreviewData} customizeSettings={customizeSettings} />
        
        {/* Gallery Image Picker */}
        <GalleryImagePicker
          open={imagePickerOpen}
          onOpenChange={setImagePickerOpen}
          productName={imagePickerProductName}
          selectedImageIds={itemImages[imagePickerItemId]?.map(i => i.id) || []}
          onSelect={(selectedImages) => {
            setItemImages(prev => ({ ...prev, [imagePickerItemId]: selectedImages }));
            // Auto-tag: add product name as tag to selected images
            if (imagePickerProductName) {
              selectedImages.forEach(img => {
                if (!img.tags.includes(imagePickerProductName)) {
                  supabase.from('gallery_images').update({
                    tags: [...img.tags, imagePickerProductName]
                  }).eq('id', img.id).then(() => {});
                }
              });
            }
          }}
        />
      </div>
    </div>;
};
export default CreateQuotation;