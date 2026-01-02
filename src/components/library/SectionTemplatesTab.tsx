import { useState, useEffect } from "react";
import { Layers, Plus, Trash2, Package, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getCountryByCode } from "@/lib/countryConfig";

const CATEGORIES = ["Kitchen", "Wardrobe", "TV Unit", "Bedroom", "Living Room", "Bathroom", "Study", "Dining", "Storage", "General"];

interface SectionItem {
  product_name: string;
  product_details: string;
  default_rate: number;
}

interface SectionTemplate {
  id: string;
  template_name: string;
  category: string;
  items: SectionItem[];
  usage_count: number;
  is_default: boolean;
}

export const SectionTemplatesTab = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<SectionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    category: "Kitchen",
    items: [{ product_name: "", product_details: "", default_rate: 0 }] as SectionItem[]
  });
  const [currencySymbol, setCurrencySymbol] = useState("₹");

  useEffect(() => {
    loadTemplates();
    loadLocalization();
  }, []);

  const loadLocalization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('country_code, currency_symbol')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profile?.country_code) {
        const countryConfig = getCountryByCode(profile.country_code);
        if (countryConfig) {
          setCurrencySymbol(profile.currency_symbol || countryConfig.currency.symbol);
        }
      }
    } catch (error) {
      console.error('Error loading localization:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('section_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setTemplates((data || []).map(t => ({
        ...t,
        items: (t.items as unknown as SectionItem[]) || []
      })));
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!newTemplate.name.trim()) {
      toast({ title: "Template name required", variant: "destructive" });
      return;
    }

    const validItems = newTemplate.items.filter(i => i.product_name.trim());
    if (validItems.length === 0) {
      toast({ title: "Add at least one item", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('section_templates').insert([{
        user_id: user.id,
        template_name: newTemplate.name.trim(),
        category: newTemplate.category,
        items: validItems as unknown as any,
        usage_count: 0,
        is_default: false
      }]);

      if (error) throw error;

      toast({ title: "Section template saved" });
      setShowAddDialog(false);
      setNewTemplate({ name: "", category: "Kitchen", items: [{ product_name: "", product_details: "", default_rate: 0 }] });
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('section_templates').delete().eq('id', id);
      if (error) throw error;
      setTemplates(templates.filter(t => t.id !== id));
      toast({ title: "Template deleted" });
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const addItemToNew = () => {
    setNewTemplate({
      ...newTemplate,
      items: [...newTemplate.items, { product_name: "", product_details: "", default_rate: 0 }]
    });
  };

  const updateNewItem = (index: number, field: keyof SectionItem, value: string | number) => {
    const updated = [...newTemplate.items];
    updated[index] = { ...updated[index], [field]: value };
    setNewTemplate({ ...newTemplate, items: updated });
  };

  const removeNewItem = (index: number) => {
    if (newTemplate.items.length > 1) {
      setNewTemplate({ ...newTemplate, items: newTemplate.items.filter((_, i) => i !== index) });
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Section Templates
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Pre-built sections with items for one-click addition to quotations
              </p>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No section templates yet. Create templates for quick quotation building.
            </div>
          ) : (
            <div className="grid gap-4">
              {templates.map((template) => (
                <div key={template.id} className="p-4 border rounded-lg bg-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{template.template_name}</h4>
                        <Badge variant="outline">{template.category}</Badge>
                        {template.usage_count > 0 && (
                          <Badge variant="secondary">{template.usage_count} uses</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.items.slice(0, 5).map((item, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            <Package className="h-3 w-3 mr-1" />
                            {item.product_name}
                          </Badge>
                        ))}
                        {template.items.length > 5 && (
                          <Badge variant="secondary" className="text-xs">+{template.items.length - 5} more</Badge>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(template.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Section Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="e.g., Full Kitchen Setup"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newTemplate.category} onValueChange={(val) => setNewTemplate({ ...newTemplate, category: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Items in this section</Label>
              {newTemplate.items.map((item, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_100px_40px] gap-2 items-end">
                  <Input
                    placeholder="Product name"
                    value={item.product_name}
                    onChange={(e) => updateNewItem(index, 'product_name', e.target.value)}
                  />
                  <Input
                    placeholder="Details (optional)"
                    value={item.product_details}
                    onChange={(e) => updateNewItem(index, 'product_details', e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder={`Rate (${currencySymbol})`}
                    value={item.default_rate || ''}
                    onChange={(e) => updateNewItem(index, 'default_rate', parseFloat(e.target.value) || 0)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeNewItem(index)}
                    disabled={newTemplate.items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addItemToNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveTemplate} disabled={saving}>
              {saving ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};