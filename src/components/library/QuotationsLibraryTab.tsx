import { useState, useEffect } from "react";
import { FileText, Calendar, User, Coins, ExternalLink, Save, Sparkles, Trash2, BookOpen, Check, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useLocalization } from "@/hooks/useLocalization";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Quotation {
  id: string;
  quotation_number: string;
  quotation_title: string | null;
  project_name: string;
  client_name: string;
  grand_total: number;
  status: string;
  created_at: string;
  is_template_saved?: boolean;
}

interface Section {
  id: string;
  section_name: string;
  items: Array<{
    id: string;
    product_name: string;
    product_details: string | null;
    width_ft: number | null;
    height_ft: number | null;
    sft_area: number | null;
    rate_per_sft: number | null;
    amount: number | null;
  }>;
}

export const QuotationsLibraryTab = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [learningId, setLearningId] = useState<string | null>(null);
  const [savedTemplateIds, setSavedTemplateIds] = useState<Set<string>>(new Set());
  const { formatCurrency, formatDate } = useLocalization();
  useEffect(() => {
    loadQuotations();
    loadSavedTemplates();
  }, []);

  const loadQuotations = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('quotations')
        .select('id, quotation_number, quotation_title, project_name, client_name, grand_total, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setQuotations(data || []);
    } catch (error) {
      console.error('Error loading quotations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all template names that match quotation titles/project names
      const { data, error } = await supabase
        .from('quotation_templates')
        .select('template_name')
        .eq('user_id', user.id);

      if (error) throw error;
      
      const templateNames = new Set(data?.map(t => t.template_name) || []);
      setSavedTemplateIds(templateNames);
    } catch (error) {
      console.error('Error loading saved templates:', error);
    }
  };

  const fetchQuotationSections = async (quotationId: string): Promise<Section[]> => {
    const { data: sectionsData, error: sectionsError } = await supabase
      .from('quotation_sections')
      .select('id, section_name, sort_order')
      .eq('quotation_id', quotationId)
      .order('sort_order');

    if (sectionsError) throw sectionsError;

    const sections: Section[] = [];
    for (const section of sectionsData || []) {
      const { data: itemsData, error: itemsError } = await supabase
        .from('quotation_items')
        .select('id, product_name, product_details, width_ft, height_ft, sft_area, rate_per_sft, amount')
        .eq('section_id', section.id)
        .order('sort_order');

      if (itemsError) throw itemsError;

      sections.push({
        id: section.id,
        section_name: section.section_name,
        items: itemsData || [],
      });
    }

    return sections;
  };

  const handleSaveAsTemplate = async (quotation: Quotation) => {
    try {
      setSavingId(quotation.id);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login to save templates");
        return;
      }

      // Fetch sections and items
      const sections = await fetchQuotationSections(quotation.id);

      // Transform to template format
      const templateSections = sections.map(section => ({
        id: section.id,
        title: section.section_name,
        items: section.items.map(item => ({
          id: item.id,
          side: "",
          productName: item.product_name,
          productDetails: item.product_details || "",
          widthFt: item.width_ft || 0,
          heightFt: item.height_ft || 0,
          sftArea: item.sft_area || 0,
          ratePerSft: item.rate_per_sft || 0,
          amount: item.amount || 0,
        })),
      }));

      const templateName = quotation.quotation_title || quotation.project_name;

      // Check if template already exists
      const { data: existing } = await supabase
        .from('quotation_templates')
        .select('id')
        .eq('user_id', user.id)
        .eq('template_name', templateName)
        .maybeSingle();

      if (existing) {
        // Update existing template
        const { error } = await supabase
          .from('quotation_templates')
          .update({
            sections: templateSections as any,
            description: `From quotation: ${quotation.client_name}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
        toast.success("Template updated successfully");
      } else {
        // Create new template
        const { error } = await supabase
          .from('quotation_templates')
          .insert({
            user_id: user.id,
            template_name: templateName,
            category: 'Custom',
            description: `From quotation: ${quotation.client_name}`,
            sections: templateSections as any,
          });

        if (error) throw error;
        toast.success("Saved to Templates");
      }

      // Update saved templates set
      setSavedTemplateIds(prev => new Set([...prev, templateName]));
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error("Failed to save template");
    } finally {
      setSavingId(null);
    }
  };

  const handleLearnAndDelete = async (quotation: Quotation) => {
    try {
      setLearningId(quotation.id);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login");
        return;
      }

      // Fetch sections and items
      const sections = await fetchQuotationSections(quotation.id);

      // Extract and save item usage patterns
      let itemsLearned = 0;
      for (const section of sections) {
        for (const item of section.items) {
          if (!item.product_name) continue;

          // Check if pattern exists
          const { data: existing } = await supabase
            .from('item_usage_patterns')
            .select('id, usage_count')
            .eq('user_id', user.id)
            .eq('product_name', item.product_name)
            .maybeSingle();

          if (existing) {
            // Update existing pattern
            await supabase
              .from('item_usage_patterns')
              .update({
                usage_count: (existing.usage_count || 0) + 1,
                preferred_rate: item.rate_per_sft,
                product_details: item.product_details,
                last_used_at: new Date().toISOString(),
              })
              .eq('id', existing.id);
          } else {
            // Create new pattern
            await supabase
              .from('item_usage_patterns')
              .insert({
                user_id: user.id,
                product_name: item.product_name,
                product_details: item.product_details,
                preferred_rate: item.rate_per_sft,
                default_rate: item.rate_per_sft,
                usage_count: 1,
                category: section.section_name,
              });
          }
          itemsLearned++;
        }
      }

      // Delete the quotation (cascade will handle sections and items)
      const { error: deleteError } = await supabase
        .from('quotation_sections')
        .delete()
        .eq('quotation_id', quotation.id);

      if (deleteError) console.error('Error deleting sections:', deleteError);

      const { error: quotationDeleteError } = await supabase
        .from('quotations')
        .delete()
        .eq('id', quotation.id);

      if (quotationDeleteError) throw quotationDeleteError;

      toast.success(`Learned ${itemsLearned} items and deleted quotation`);
      
      // Refresh list
      setQuotations(prev => prev.filter(q => q.id !== quotation.id));
    } catch (error) {
      console.error('Error learning from quotation:', error);
      toast.error("Failed to learn from quotation");
    } finally {
      setLearningId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-700 border-red-500/20';
      case 'pending': return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const isTemplateSaved = (quotation: Quotation) => {
    const name = quotation.quotation_title || quotation.project_name;
    return savedTemplateIds.has(name);
  };

  const filteredQuotations = quotations.filter(q =>
    q.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.quotation_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading quotations...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Quotations Library
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Save quotations as templates or learn item patterns for faster creation.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search by project, client or number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {filteredQuotations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {quotations.length === 0 
                ? "No quotations yet. Create your first quotation to see it here."
                : "No quotations match your search."}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuotations.map((quotation) => (
                <div
                  key={quotation.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium">{quotation.quotation_title || quotation.project_name}</h4>
                      <Badge variant="outline" className={getStatusColor(quotation.status)}>
                        {quotation.status}
                      </Badge>
                      {isTemplateSaved(quotation) && (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          <Check className="h-3 w-3 mr-1" />
                          Saved
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {quotation.client_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(quotation.created_at)}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <Coins className="h-3 w-3" />
                        {formatCurrency(quotation.grand_total || 0)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveAsTemplate(quotation)}
                      disabled={savingId === quotation.id}
                      className="gap-1.5"
                    >
                      {savingId === quotation.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      {isTemplateSaved(quotation) ? "Update" : "Save"}
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={learningId === quotation.id}
                          className="gap-1.5 text-amber-600 hover:text-amber-700 hover:border-amber-500"
                        >
                          {learningId === quotation.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                          Learn
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Learn from this quotation?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will extract all item patterns (names, rates, details) for smart suggestions in future quotations, then delete this quotation permanently.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleLearnAndDelete(quotation)}
                            className="bg-amber-500 hover:bg-amber-600"
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Learn & Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/quotation/${quotation.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center pt-4">
            {quotations.length} quotations • {formatCurrency(quotations.reduce((sum, q) => sum + (q.grand_total || 0), 0))} total value
          </p>
        </CardContent>
      </Card>
    </div>
  );
};