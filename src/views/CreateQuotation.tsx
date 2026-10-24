"use client";

import { appendFloorPlanEstimate } from '@/lib/quotation-ai/apply-estimate';
import { useState, useEffect, useRef, useMemo } from "react";
import dynamic from 'next/dynamic';
import { Plus, Trash2, Upload, Eye, Share2, Loader2, ImageIcon, LockKeyhole } from "lucide-react";
import { getCountryByCode } from "@/lib/countryConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useInlineFeedback } from "@/hooks/useInlineFeedback";
import { supabase } from "@/integrations/supabase/client";
import { quotationsApi } from "@/lib/api";
import { generateQuotationPDF } from "@/lib/pdfGenerator";
import { useSearchParams } from "@/lib/navigation";
import { useAuthAction } from "@/hooks/useAuthAction";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useQuotationAutomation } from "@/hooks/useQuotationAutomation";
import { CustomizeFieldsDrawer, QuotationSettings, getQuotationSettings } from "@/components/CustomizeFieldsDrawer";
import { PDFPreviewEditor } from "@/components/PDFPreviewEditor";
import { PDFEditorSettings, getEditorSettings } from "@/lib/pdfThemes";
import { normalizeWarrantyInput } from "@/lib/warrantyFormatter";
import { ClientSelector } from "@/components/quotation/ClientSelector";
import { ProductNameInput } from "@/components/quotation/ProductNameInput";
import { RoomPicker } from "@/components/quotation/RoomPicker";
import { getRoomSuggestions } from "@/lib/roomSuggestions";
import { QuotationTemplates } from "@/components/quotation/QuotationTemplates";
import { GalleryImagePicker } from "@/components/quotation/GalleryImagePicker";
import { GalleryImage } from "@/hooks/useGallery";
import { getLibraryTerms, getLibraryPaymentStages, getLibraryBankTemplate } from "@/lib/libraryDefaults";
const FloorPlanQuotationBuilder = dynamic(() => import('@/components/quotation/FloorPlanQuotationBuilder').then(module => module.FloorPlanQuotationBuilder), { ssr: false });
import type { BuilderMode } from '@/components/quotation/FloorPlanQuotationBuilder';
import { EstimatePriceDetails } from '@/components/quotation/EstimatePriceDetails';
import type { PriceEvidence } from '@/lib/quotation-ai/floor-plan';
import { reconcileSavedQuotation, remapDraftIds } from '@/lib/quotation-ai/save-reconciliation';
import { fromQuotation, lineAmount, quotationTotals, reviewDraft, draftSchema, type VoiceDraft } from "@/lib/quotation-ai/domain";
import { ItemSpecifications } from '@/components/quotation/ItemSpecifications';
import { combineItemDetails, splitItemDetails } from '@/lib/itemSpecifications';
import { ItemMeasurements } from '@/components/quotation/ItemMeasurements';
import { changeQuotationUnit, getQuotationUnit } from '@/lib/quotationUnits';
interface LineItem {
 measurementUnit?: string;
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
    toast, feedback, clearFeedback
  } = useInlineFeedback({ autoRevealErrors: true });
  const [isSaving, setIsSaving] = useState(false);
  const [builderMode, setBuilderMode] = useState<BuilderMode | null>(null);
  const lastAIDraft = useRef<VoiceDraft | null>(null);
  const planProjectId = useRef<string | null>(null);
  const [saveGeneratedDraft, setSaveGeneratedDraft] = useState(false);
  const [aiPriceEvidence, setAIPriceEvidence] = useState<Record<string, PriceEvidence | null>>({});
  const [isLoadingQuotation, setIsLoadingQuotation] = useState(false);
  const {
    requireAuth,
    clearPendingAction,
    getPendingAction
  } = useAuthAction();
  const { isPro, setPaywallOpen } = useSubscription();
  const [searchParams, setSearchParams] = useSearchParams();
  const quotationId = searchParams.get('id');
  const continueAction = searchParams.get('continueAction');
  const [actionExecuted, setActionExecuted] = useState(false);
  const smartDefaultsApplied = useRef(false);
  const quotationSaveInProgress = useRef(false);
  const savedQuotationIdRef = useRef<string | null>(null);
  const pendingSaveAndSend = useRef(false);
  
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
        if (formData.warranty) setWarranty(normalizeWarrantyInput(formData.warranty));
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
      setWarranty(normalizeWarrantyInput(defaults.warranty));
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
    savedQuotationIdRef.current = quotationId;
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
          if (continueAction === 'createWithAI') {
            setBuilderMode('details');
          } else if (continueAction === 'saveDraft') {
            await handleSaveQuotation('draft');
          } else if (continueAction === 'downloadPdf') {
            const savedId = await handleSaveQuotation('draft');
            if (savedId) {
              await handleDownloadPDF(undefined, savedId, freshProfile);
            }
          } else if (continueAction === 'saveAndSend') {
            if (!isPro) {
              pendingSaveAndSend.current = true;
              setPaywallOpen(true, 'Save & Send');
            } else {
              await handleSaveQuotation('pending', true);
            }
          }
        }
      }
    };
    executePendingAction();
  }, [continueAction, formRestored, actionExecuted, isPro, setPaywallOpen]);
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
        // Get templates from My Library (default first, else latest saved)
        const [libraryStages, libraryTerms, bankTemplate, warrantyTemplate] = await Promise.all([
          getLibraryPaymentStages(user.id),
          getLibraryTerms(user.id, 'quotation'),
          getLibraryBankTemplate(user.id),
          supabase.from('warranty_templates').select('warranty_years').eq('user_id', user.id).eq('is_default', true).maybeSingle(),
        ]);
        if ((warrantyTemplate.data as any)?.warranty_years) setWarranty(normalizeWarrantyInput(String((warrantyTemplate.data as any).warranty_years)));

        setProfile({
          company_name: data.company_name || "",
          logo_url: data.logo_url || "",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          gstin: data.gstin || "",
          professional_advantages: data.professional_advantages || "",
          signature_url: data.signature_url || "",
          terms_conditions: libraryTerms as any,
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
        if (libraryStages) {
          setPaymentStages(libraryStages as any);
        } else if (data.payment_stages) {
          setPaymentStages(data.payment_stages as any);
        }

      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };
  const loadQuotation = async (id: string) => {
    setIsLoadingQuotation(true);
    lastAIDraft.current = null;
    setAIPriceEvidence({});
    planProjectId.current = null;
    clearFeedback();
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
      setWarranty(normalizeWarrantyInput(quotation.warranty || "10"));
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
            measurementUnit: getQuotationUnit(item.measurement_unit),

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
      const loadedItemIds = loadedSections.flatMap(section => section.items.map(item => item.id));
      const restoredImages: Record<string, GalleryImage[]> = {};
      if (loadedItemIds.length) {
        const { data: links, error } = await supabase.from('quotation_item_images')
          .select('quotation_item_id, sort_order, gallery_images(*)').in('quotation_item_id', loadedItemIds).order('sort_order');
        if (error) throw error;
        for (const link of links || []) {
          if (link.gallery_images) (restoredImages[link.quotation_item_id] ||= []).push(link.gallery_images as GalleryImage);
        }
      }
      setItemImages(restoredImages);
      const { data: planProject } = await supabase.from('quotation_plan_projects').select('id,estimate').eq('quotation_id', id).order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (planProject) {
        planProjectId.current = planProject.id;
        const restored = draftSchema.safeParse((planProject.estimate as { draft?: unknown } | null)?.draft);
        if (restored.success) lastAIDraft.current = restored.data;
        const storedEvidence = (planProject.estimate as { evidence?: { itemId: string; price: PriceEvidence | null }[] } | null)?.evidence;
        if (Array.isArray(storedEvidence)) setAIPriceEvidence(Object.fromEntries(storedEvidence.map(row => [row.itemId, row.price])));
      }
    } catch (error) {
      console.error('Error loading quotation:', error);
      toast({
        title: "Load failed",
        description: "Failed to load quotation data. Refresh to retry before editing.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingQuotation(false);
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
    setSections(currentSections => currentSections.map(section => section.id === sectionId ? {
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
  const selectRoom = (sectionId: string, room: string) => {
    setSections(current => current.map(section => {
      if (section.id !== sectionId) return section;
      const items = [...section.items];
      for (const productName of getRoomSuggestions(room)) {
        if (items.some(item => item.productName.trim().toLowerCase() === productName.toLowerCase())) continue;
        // Fill pristine placeholders without overwriting entered work or images.
        const emptyIndex = items.findIndex(item => !item.productName.trim() && !item.productDetails.trim() && !item.widthFt && !item.heightFt && !item.sftArea && !item.ratePerSft && !item.amount && (!item.side || item.side === 'A') && !itemImages[item.id]?.length);
        if (emptyIndex >= 0) items[emptyIndex] = { ...items[emptyIndex], productName };
        else items.push({ id: crypto.randomUUID(), side: 'A', productName, productDetails: '', widthFt: 0, heightFt: 0, sftArea: 0, ratePerSft: 0, amount: 0 });
      }
      return { ...section, title: room, items };
    }));
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
    setSections(currentSections => currentSections.map(section => section.id === sectionId ? {
      ...section,
      items: section.items.map(item => {
        if (item.id === itemId) {
          if (field === 'measurementUnit') return changeQuotationUnit(item, value);
          const updatedItem = {
            ...item,
            [field]: value
          };
          // Auto-calculate sftArea when dimensions change
          if (field === 'widthFt' || field === 'heightFt') {
            updatedItem.sftArea = Math.round(updatedItem.widthFt * updatedItem.heightFt * 10000) / 10000;
            updatedItem.amount = lineAmount(updatedItem.sftArea, updatedItem.ratePerSft);
          }
          // Auto-calculate amount when rate or sftArea changes
          if (field === 'ratePerSft' || field === 'sftArea') {
            // Direct area replaces dimensions; stale dimensions must not reach saved/PDF rows.
            if (field === 'sftArea') {
              updatedItem.widthFt = 0;
              updatedItem.heightFt = 0;
            }
            updatedItem.amount = lineAmount(updatedItem.sftArea, updatedItem.ratePerSft);
          }
          return updatedItem;
        }
        return item;
      })
    } : section));
  };

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

  const { subtotal, discount: discountAmount, tax: gstAmount, total: grandTotal } = quotationTotals(
    sections.flatMap(section => section.items.map(item => item.amount)),
    { gstEnabled: effGstEnabled, gstRate: Number(effGstRate) || 0, discountPercentage: effDiscountPercentage, enableSocialMediaDiscount: effSocialEnabled, socialMediaDiscountRate: effSocialRate },
  );
  const socialMediaDiscountAmount = effSocialEnabled ? discountAmount : 0;
  const isPendingAIItem = (item: LineItem) => !!lastAIDraft.current?.sections.some(section => section.items.some(row => row.id === item.id))
    && (!(item.sftArea > 0) || (!(item.ratePerSft > 0) && !lastAIDraft.current.sections.some(section => section.items.some(row => row.id === item.id && row.ratePerSft === 0))));
  const aiTotalPending = sections.some(section => section.items.some(isPendingAIItem));
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
  const getAIDraft = () => fromQuotation(
    { projectTitle, clientName, clientAddress, placeOfProject, projectType }, sections,
    { gstEnabled, gstRate: Number(gstRate) || 0, discountPercentage, enableSocialMediaDiscount, socialMediaDiscountRate },
  );
  const handleSaveQuotation = async (status: string, showShare: boolean = false): Promise<string | null> => {
    if (quotationSaveInProgress.current) return null;
    quotationSaveInProgress.current = true;
    setIsSaving(true);
    clearFeedback();
    try {
      const draftClientName = clientName.trim() || 'Client to be confirmed';
      const draftProjectTitle = projectTitle.trim() || 'AI quotation draft';
      if (status !== 'draft' && (!clientName.trim() || !projectTitle.trim())) {
        toast({
          title: "Complete the required details",
          description: `Add ${[!clientName.trim() && 'client name', !projectTitle.trim() && 'project title'].filter(Boolean).join(' and ')} to save your quotation.`,
          focusTargetId: !clientName.trim() ? 'clientName' : 'projectTitle',
          variant: "destructive"
        });
        return null;
      }
      if (status !== 'draft' && lastAIDraft.current) {
        const current = getAIDraft();
        const explicitFreeIds = new Set(lastAIDraft.current.sections.flatMap(section => section.items.filter(item => item.ratePerSft === 0).map(item => item.id)));
        for (const item of current.sections.flatMap(section => section.items)) {
          if (item.ratePerSft == null && explicitFreeIds.has(item.id)) item.ratePerSft = 0;
        }
        const missing = reviewDraft(current).missing;
        if (missing.length) {
          toast({ title: 'Quotation needs a few more details', description: `Complete ${missing.slice(0, 3).join(', ')} before finalizing. You can still save a draft.`, variant: 'destructive' });
          return null;
        }
      }
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');
      
      let savedQuotationId: string | null = null;

      // Build the quotation payload for the Supabase API.
      const payloadSections = sections.map((section, sIdx) => ({
        id: section.id,
        section_name: section.title || `Section ${sIdx + 1}`,
        sort_order: sIdx,
        items: section.items.map((item, iIdx) => ({
          id: item.id,
          gallery_image_ids: (itemImages[item.id] || []).map(image => image.id),
          product_name: item.productName || "",
          product_details: item.productDetails ?? null,
          side: item.side ?? null,
          measurement_unit: getQuotationUnit(item.measurementUnit),

          width_ft: Number(item.widthFt) || 0,
          height_ft: Number(item.heightFt) || 0,
          sft_area: Number(item.sftArea) || 0,
          rate_per_sft: Number(item.ratePerSft) || 0,
          amount: Number(item.amount) || 0,
          sort_order: iIdx,
        })),
      }));

      const basePayload = {
        quotation_title: status === 'draft' ? draftProjectTitle : projectTitle,
        client_name: status === 'draft' ? draftClientName : clientName,
        client_address: clientAddress,
        project_name: status === 'draft' ? draftProjectTitle : projectTitle,
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

      const existingId = quotationId || savedQuotationIdRef.current;
      if (existingId) {
        const { data: updated } = await quotationsApi.update(existingId, basePayload);
        savedQuotationId = updated?.id || existingId;
      } else {
        const quotationNumber = `QT-${Date.now()}`;
        const { data: created } = await quotationsApi.create({
          ...basePayload,
          quotation_number: quotationNumber,
        });
        savedQuotationId = created?.id ?? null;
        savedQuotationIdRef.current = savedQuotationId;
      }


      if (!savedQuotationId) throw new Error('The quotation save did not return an ID. Your editor has been preserved.');
      // Read back the complete nested save before navigating or replacing any local identities.
      const { data: verifiedQuotation } = await quotationsApi.get(savedQuotationId);
      const mapping = reconcileSavedQuotation(payloadSections, verifiedQuotation.sections);
      const currentPlanId = planProjectId.current;
      if (currentPlanId) {
        const source = await supabase.from('quotation_plan_projects').select('estimate').eq('id', currentPlanId).eq('user_id', user.id).single();
        if (source.error || !source.data?.estimate) throw new Error('Quotation saved, but its AI reference could not be loaded. Your editor is preserved; retry saving to link it.');
        const estimate = source.data.estimate as unknown as import('@/lib/quotation-ai/floor-plan').Estimate;
        const linked = await supabase.from('quotation_plan_projects').update({ quotation_id: savedQuotationId, updated_at: new Date().toISOString(), estimate: {
          ...estimate, draft: remapDraftIds(estimate.draft, mapping),
          evidence: estimate.evidence.map(row => ({ ...row, itemId: mapping.items[row.itemId] ?? row.itemId })),
          roomSections: estimate.roomSections.map(row => ({ ...row, sectionId: mapping.sections[row.sectionId] ?? row.sectionId })),
        } }).eq('id', currentPlanId).eq('user_id', user.id);
        if (linked.error) throw new Error('Quotation saved, but its AI reference could not be linked. Your editor is preserved; retry saving.');
      }
      if (lastAIDraft.current) lastAIDraft.current = remapDraftIds(lastAIDraft.current, mapping);
      setSections(current => current.map(section => ({ ...section, id: mapping.sections[section.id] ?? section.id,
        items: section.items.map(item => ({ ...item, id: mapping.items[item.id] ?? item.id })),
      })));
      setAIPriceEvidence(current => Object.fromEntries(Object.entries(current).map(([id, price]) => [mapping.items[id] ?? id, price])));
      setItemImages(current => Object.fromEntries(Object.entries(current).map(([id, images]) => [mapping.items[id] ?? id, images])));
      if (!existingId && !showShare) {
        const params = new URLSearchParams(searchParams); params.set('id', savedQuotationId); setSearchParams(params, { replace: true });
      }
      toast({ title: existingId ? 'Quotation updated' : 'Quotation saved', description: `Verified ${payloadSections.length} sections and ${payloadSections.reduce((count, section) => count + section.items.length, 0)} items.` });

      // Silently save last used preferences and track item usage
      saveLastUsedPreferences({
        warranty,
        projectType,
        placeOfProject,
        gstEnabled: effGstEnabled,
        gstRate: effGstRate,
        discountPercentage: effDiscountPercentage,
        enableSocialMediaDiscount: effSocialEnabled,
        socialMediaDiscountRate: effSocialRate,
      });

      // Track item usage for smart suggestions
      const allItems = sections.flatMap(section => 
        section.items.map(item => ({
          productName: item.productName,
          productDetails: item.productDetails,
          ratePerSft: item.ratePerSft,
        }))
      );
      // Auto-saved AI drafts are proposals, not confirmed pricing evidence.
      // Learn final user-reviewed quotations without reinforcing an AI's own draft.
      if (status !== 'draft') trackItemUsage(allItems);

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
            measurementUnit: getQuotationUnit(item.measurementUnit),

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
        lastAIDraft.current = null;
        setAIPriceEvidence({});
        planProjectId.current = null;
        savedQuotationIdRef.current = null;
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
    } finally {
      quotationSaveInProgress.current = false;
      setIsSaving(false);
    }
  };
  
  // Helper function to fetch fresh profile data
  const fetchFreshProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profileData, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (error || !profileData) throw new Error('Could not load company profile. Please retry before downloading.');

    const libraryTerms = await getLibraryTerms(user.id, 'quotation');
    const bankTemplate = await getLibraryBankTemplate(user.id);

    return {
      company_name: profileData.company_name || "",
      logo_url: profileData.logo_url || "",
      address: profileData.address || "",
      phone: profileData.phone || "",
      email: profileData.email || "",
      gstin: profileData.gstin || "",
      professional_advantages: profileData.professional_advantages || "",
      signature_url: profileData.signature_url || "",
      terms_conditions: libraryTerms as any,
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

  const handleDownloadPDF = async (editorSettings?: PDFEditorSettings, overrideQuotationId?: string, overrideProfile?: typeof profile, editorTerms?: import("@/lib/libraryDefaults").TermsSection[]) => {
    setIsDownloading(true);
    try {
      if (!clientName.trim() || !clientAddress.trim()) {
        toast({
          title: "Complete the required details",
          description: `Add ${[!clientName.trim() && 'client name', !clientAddress.trim() && 'client address'].filter(Boolean).join(' and ')} to download your PDF.`,
          focusTargetId: !clientName.trim() ? 'clientName' : 'clientAddress',
          variant: "destructive"
        });
        setIsDownloading(false);
        return;
      }
      
      // Use override profile if provided, otherwise use state profile
      // If state profile is empty, fetch fresh data
      let profileToUse = overrideProfile;
      if (!profileToUse) {
        const freshProfile = await fetchFreshProfile();
        profileToUse = freshProfile || profile;
        if (freshProfile) setProfile(freshProfile);
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
        gstEnabled: effGstEnabled,
        gstRate: parseFloat(effGstRate),
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
        enableSocialMediaDiscount: effSocialEnabled,
        socialMediaDiscountRate: effSocialRate,
        paymentStages: paymentStages.map(s => ({
          stage: s.stage,
          milestone: s.milestone,
          percentage: s.percentage
        })),
        termsConditions: editorTerms || profileToUse.terms_conditions,
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
        settings: { ...customizeSettings, areaOnly: !customizeSettings.showDetailedSizeColumns && !!lastAIDraft.current },
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
    quotationId: quotationId || undefined,
    quotationTitle: projectTitle,
    clientName,
    clientAddress,
    dateOfProposal,
    quotationValidTill,
    projectDeadline,
    placeOfProject,
    warranty,
    projectType,
    sections: sections.map(section => ({
      ...section,
      items: section.items.map(item => ({
        ...item,
        imageUrls: (itemImages[item.id] || []).map(img => img.image_url),
      }))
    })),
    subtotal,
    grandTotal,
    gstEnabled: effGstEnabled,
    gstRate: parseFloat(effGstRate),
    gstAmount,
    discount: discountAmount,
    enableSocialMediaDiscount: effSocialEnabled,
    socialMediaDiscountRate: effSocialRate,
    paymentStages: paymentStages.map(stage => ({
      stage: stage.stage,
      milestone: stage.milestone,
      percentage: stage.percentage,
    })),
    companyName: profile.company_name,
    companyLogo: profile.logo_url,
    companyAddress: profile.address,
    companyPhone: profile.phone,
    companyEmail: profile.email,
    gstin: profile.gstin,
    professionalAdvantages: profile.professional_advantages,
    signatureUrl: profile.signature_url,
    bankDetails: {
      bankName: profile.bank_name,
      accountNumber: profile.bank_account_number,
      ifscCode: profile.bank_ifsc_code,
      accountHolder: profile.bank_account_holder,
      upiId: profile.upi_id,
      qrCodeUrl: profile.payment_qr_url,
    },
    localization: {
      currencyCode: profile.currency_code,
      currencySymbol: profile.currency_symbol,
      locale: profile.locale,
      taxLabel: profile.tax_label,
      taxRegistrationLabel: profile.tax_label === 'GST' ? 'GSTIN' : `${profile.tax_label} No`,
      areaUnit: profile.measurement_system === 'metric' ? 'Square Meters' : 'Square Feet',
      areaUnitShort: profile.measurement_system === 'metric' ? 'SQM' : 'Sq.Ft',
      countryCode: profile.country_code,
    },
  }), [
    quotationId,
    projectTitle,
    clientName,
    clientAddress,
    dateOfProposal,
    quotationValidTill,
    projectDeadline,
    placeOfProject,
    warranty,
    projectType,
    sections,
    itemImages,
    subtotal,
    grandTotal,
    effGstEnabled,
    effGstRate,
    gstAmount,
    discountAmount,
    effSocialEnabled,
    effSocialRate,
    paymentStages,
    profile,
  ]);
  useEffect(() => {
    if (!saveGeneratedDraft) return;
    setSaveGeneratedDraft(false);
    void handleSaveQuotation('draft');
    // Runs after the generated sections and project details have rendered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveGeneratedDraft]);
  // Auto-save quotation after Pro upgrade when Save & Send was pending.
  // The user built a quotation, clicked Save & Send, paid for Pro, and now
  // isPro flipped to true. Automatically complete the save so the quotation
  // appears in My Quotations without a page refresh.
  useEffect(() => {
    if (isPro && pendingSaveAndSend.current) {
      pendingSaveAndSend.current = false;
      void handleSaveQuotation('pending', true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro]);
  return <div className="container min-w-0 max-w-5xl mx-auto p-4 md:p-6 lg:p-8 pb-24 md:pb-8 relative">
      {feedback}
      {(isSaving || isLoadingQuotation) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" role="status" aria-live="polite">
        <div className="flex items-center gap-3 rounded-lg border bg-card px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          <span>{isLoadingQuotation ? 'Loading quotation…' : 'Saving quotation…'}</span>
        </div>
      </div>}
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
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Create Quotation</h1>
            <p className="text-sm text-muted-foreground mt-1">Fill in the details to create a new quotation</p>
          </div>
          <div className="grid w-full min-w-0 grid-cols-2 items-stretch gap-2 sm:grid-cols-[auto_auto_minmax(260px,1fr)] lg:w-auto lg:shrink-0 [&>button]:h-12 [&>button]:min-w-0 [&>button]:px-3 [&>button]:text-sm" aria-label="Quotation actions">
            <QuotationTemplates onSelectTemplate={(newSections) => setSections(newSections)} currentSections={sections} onSetQuotationTitle={(title) => setProjectTitle(title)} countryCode={profile.country_code} />
            <CustomizeFieldsDrawer type="quotation" settings={customizeSettings} onSettingsChange={s => setCustomizeSettings(s as QuotationSettings)} />
        <FloorPlanQuotationBuilder
          mode={builderMode}
          onStart={mode => requireAuth(async () => {
            try { getAIDraft(); setBuilderMode(mode); }
            catch { toast({ title: 'Check your quotation', description: 'AI estimates support up to 80 sections and 600 items. Split larger projects into separate quotations.', variant: 'destructive' }); }
          }, 'createWithAI', getFormData())}
          getCurrentDraft={getAIDraft}
          clients={clients}
          onMeasurementSystemChange={() => setProfile(current => ({ ...current, measurement_system: 'imperial' }))}
          onClose={() => setBuilderMode(null)}
          onApply={(draft, base, projectId, saveDraft, evidence) => {
            const existing = getAIDraft();
            if (JSON.stringify(existing) !== base) throw new Error('Your quotation changed while the estimate was being prepared. Go Back and regenerate to preserve your edits.');
            const { draft: combined, sections: nextSections } = appendFloorPlanEstimate(existing, draft);
            lastAIDraft.current = combined;
            planProjectId.current = projectId;
            setAIPriceEvidence(current => ({ ...current, ...Object.fromEntries((evidence ?? []).map(row => [row.itemId, row.price])) }));
            const existingItems = new Map(sections.flatMap(section => section.items.map(item => [item.id, item] as const)));
            setSections(nextSections.map(section => ({ ...section, items: section.items.map(item => existingItems.get(item.id) ?? item) })));
            setProjectTitle(draft.project.projectTitle.trim() || 'AI quotation draft');
            setClientName(draft.project.clientName.trim() || 'Client to be confirmed');
            setClientAddress(draft.project.clientAddress);
            setPlaceOfProject(draft.project.placeOfProject);
            setProjectType(draft.project.projectType);
            setGstEnabled(draft.pricing.gstEnabled);
            setGstRate(String(draft.pricing.gstRate));
            setDiscountPercentage(draft.pricing.discountPercentage);
            setEnableSocialMediaDiscount(draft.pricing.enableSocialMediaDiscount);
            setSocialMediaDiscountRate(draft.pricing.socialMediaDiscountRate);
            if (saveDraft) setSaveGeneratedDraft(true);
            toast({ title: saveDraft ? 'Saving your AI quotation' : 'Estimate added to your quotation', description: saveDraft ? 'A draft is being saved to My Quotations so you can safely return after a refresh.' : 'Review the measurements and rates, then save as a draft.' });
          }}
        />
          </div>
        </div>

        {lastAIDraft.current && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100" role="status">AI-generated estimate — rates and measurements require review before final confirmation. Pending items are excluded from the provisional total.</div>}

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
                    id="clientName"
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

        {/* Rooms & Items */}
        {sections.map((section, sectionIndex) => <Card key={section.id} className="min-w-0 max-w-full">
            <CardHeader className="px-5 sm:px-8">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-3">
                <Input aria-label={`Room title ${sectionIndex + 1}`} value={section.title} onChange={e => updateSectionTitle(section.id, e.target.value)} className="min-w-0 basis-40 flex-1 text-lg font-semibold border-none px-2 py-1 h-auto focus-visible:ring-0" placeholder="Room Title" />
                <RoomPicker value={section.title} onChange={room => selectRoom(section.id, room)} />
                {sections.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeSection(section.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>}
              </div>
            </CardHeader>
            <CardContent className="min-w-0 space-y-4 px-5 sm:px-8">
              {/* Items */}
              {section.items.map((item, itemIndex) => {
                const details = splitItemDetails(item.productDetails);
                return <div key={item.id} className="min-w-0 max-w-full p-5 sm:p-6 border border-border rounded-lg space-y-4 bg-muted/30">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Item {itemIndex + 1}</span>
                    <div className="flex gap-1">
                      <Button aria-label={`Add image for item ${itemIndex + 1}`} variant="ghost" size="sm" onClick={() => {
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

                  <div className="space-y-2">
                    <Label htmlFor={`product-name-${item.id}`}>Product Name</Label>
                    <ProductNameInput id={`product-name-${item.id}`} value={item.productName}
                      onChange={name => updateItem(section.id, item.id, 'productName', name)} patterns={itemPatterns}
                      onProductSelect={pattern => {
                        if (pattern.product_details && !item.productDetails) updateItem(section.id, item.id, 'productDetails', pattern.product_details);
                        if (pattern.preferred_rate && pattern.preferred_rate > 0 && !item.ratePerSft) updateItem(section.id, item.id, 'ratePerSft', pattern.preferred_rate);
                      }} placeholder="e.g. Wardrobe" />
                  </div>
                  {customizeSettings.showProductDetails && <div className="space-y-2">
                    <Label htmlFor={`product-details-${item.id}`}>Product Details</Label>
                    <Textarea id={`product-details-${item.id}`} value={details.description}
                      maxLength={Math.max(details.description.length, 1000 - (item.productDetails.length - details.description.length))}
                      onChange={event => updateItem(section.id, item.id, 'productDetails', combineItemDetails(event.target.value, details.specifications))}
                      placeholder="e.g. 4-door wardrobe with loft" rows={2} />
                  </div>}
                  <ItemSpecifications value={item.productDetails} onChange={value => updateItem(section.id, item.id, 'productDetails', value)} />
                  <div className="border-t border-border/70 pt-4">
                    <ItemMeasurements layout="product" item={item} onChange={(field, value) => updateItem(section.id, item.id, field, value)} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {customizeSettings.showSideColumn && <div className="space-y-2">
                      <Label htmlFor={`item-side-${item.id}`}>Side</Label>
                      <Input id={`item-side-${item.id}`} value={item.side} onChange={event => updateItem(section.id, item.id, 'side', event.target.value)} placeholder="A" />
                    </div>}
                    <div className={`space-y-2 ${customizeSettings.showSideColumn ? '' : 'sm:col-span-2'}`}>
                      <Label htmlFor={`item-rate-${item.id}`}>Rate / {getQuotationUnit(item.measurementUnit)} ({profile.currency_symbol})</Label>
                      <Input id={`item-rate-${item.id}`} type="number" min="0" value={item.ratePerSft || ''} onChange={event => updateItem(section.id, item.id, 'ratePerSft', parseFloat(event.target.value) || 0)} placeholder="0" step="0.01" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/5 px-4 py-3">
                    <span className="text-sm font-medium">Amount</span>
                    <span className="text-lg font-semibold tabular-nums text-primary">{isPendingAIItem(item) ? 'Pending' : <>{profile.currency_symbol}{item.amount.toLocaleString(profile.locale, { minimumFractionDigits: 2 })}</>}</span>
                  </div>
                  {Object.prototype.hasOwnProperty.call(aiPriceEvidence, item.id) && <div className="rounded-lg bg-muted/30 px-3 py-2"><EstimatePriceDetails price={aiPriceEvidence[item.id]} /><p className="mt-1 text-[11px] text-muted-foreground">Original AI price evidence. Manual rate/specification changes require your review.</p></div>}
                </div>; })}

              {/* Room Subtotal */}
              <div className="flex justify-between items-center pt-4 border-t border-border">
                <span className="font-medium">{section.items.some(isPendingAIItem) ? 'Provisional Room Total' : 'Room Total'}</span>
                <span className="text-lg font-bold text-primary">
                  {section.items.some(isPendingAIItem) && section.items.every(item => item.amount === 0) ? 'Pending' : <>{profile.currency_symbol}{section.items.reduce((sum, item) => sum + item.amount, 0).toLocaleString(profile.locale, {
                minimumFractionDigits: 2
              })}</>}
                </span>
              </div>

              <Button onClick={() => addItemToSection(section.id)} variant="outline" className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Add Item to Room
              </Button>
            </CardContent>
          </Card>)}

        <Button onClick={addSection} variant="outline" className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Add Room
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
                  {effGstEnabled && <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{profile.tax_label} ({effGstRate}%)</span>
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
                  {effSocialEnabled && <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Social Media Discount ({effSocialRate}%)</span>
                      <span className="font-medium text-green-600">-{profile.currency_symbol}{socialMediaDiscountAmount.toLocaleString(profile.locale, {
                    minimumFractionDigits: 2
                  })}</span>
                    </div>}
                </>}

              {customizeSettings.showDiscount && !enableSocialMediaDiscount && <>
                  {effDiscountPercentage > 0 && !effSocialEnabled && <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount ({effDiscountPercentage}%)</span>
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
                  <span>{aiTotalPending ? 'Provisional Total' : 'Grand Total'}</span>
                  <span className="text-primary">{aiTotalPending && grandTotal === 0 ? 'Pending' : <>{profile.currency_symbol}{grandTotal.toLocaleString(profile.locale, {
                  minimumFractionDigits: 2
                })}</>}</span>
                </div>}

              {pricingDirty && <div className="mt-3 rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Tax/discount changes are not included in the total yet.
                  </p>
                  <Button size="sm" className="w-full rounded-lg" onClick={applyPricing}>
                    Apply pricing
                  </Button>
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
                        const savedId = await handleSaveQuotation("draft");
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
              <Button className={!isPro ? "w-full bg-primary/70 text-primary-foreground hover:bg-primary/80" : "w-full"} onClick={() => requireAuth(async () => {
                if (!isPro) {
                  pendingSaveAndSend.current = true;
                  setPaywallOpen(true, 'Save & Send');
                  return;
                }
                await handleSaveQuotation('pending', true);
              }, 'saveAndSend', getFormData())}>
                {isPro ? <Share2 className="h-4 w-4 mr-2" /> : <LockKeyhole className="h-4 w-4 mr-2" />}
                Save & Send
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* PDF Preview Editor */}
        <PDFPreviewEditor onItemMeasurementChange={(sectionIndex, itemIndex, field, value) => updateItem(sections[sectionIndex].id, sections[sectionIndex].items[itemIndex].id, field, value)} open={showPreview} onClose={() => setShowPreview(false)} onDownload={(settings, terms) => handleDownloadPDF(settings, undefined, undefined, terms)} quotationData={quotationPreviewData} customizeSettings={{ ...customizeSettings, areaOnly: !customizeSettings.showDetailedSizeColumns && !!lastAIDraft.current }} />
        
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
