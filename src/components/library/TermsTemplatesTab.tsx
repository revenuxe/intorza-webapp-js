import { useState, useEffect } from "react";
import { Plus, Trash2, Star, Edit2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { libraryApi } from "@/lib/api";

interface TermsSection {
  id: string;
  title: string;
  points: string[];
}

interface TermsTemplate {
  id: string;
  template_name: string;
  template_type: 'quotation' | 'invoice';
  content: TermsSection[];
  is_default: boolean;
  is_enabled?: boolean;
  created_at: string;
}

export const TermsTemplatesTab = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TermsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TermsTemplate | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'quotation' | 'invoice'>('all');
  
  const [formData, setFormData] = useState({
    template_name: "",
    template_type: "quotation" as 'quotation' | 'invoice',
    content: [
      { id: "1", title: "PAYMENT TERMS", points: ["Payment is due as per agreed schedule."] }
    ] as TermsSection[],
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data } = await libraryApi.terms.list();
      setTemplates(((data as any[]) || []).map(t => ({
        ...t,
        template_type: t.template_type as 'quotation' | 'invoice',
        content: Array.isArray(t.content) ? t.content as unknown as TermsSection[] : []
      })));
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.template_name.trim()) {
      toast({ title: "Please enter a template name", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);

      if (editingTemplate) {
        await libraryApi.terms.update(editingTemplate.id, {
          template_name: formData.template_name,
          template_type: formData.template_type,
          content: formData.content as unknown as any,
        });
        toast({ title: "Template updated" });
      } else {
        const sameTypeTemplates = templates.filter(t => t.template_type === formData.template_type);
        await libraryApi.terms.create({
          template_name: formData.template_name,
          template_type: formData.template_type,
          content: formData.content as unknown as any,
          is_default: sameTypeTemplates.length === 0,
        });
        toast({ title: "Template created" });
      }

      setDialogOpen(false);
      setEditingTemplate(null);
      resetForm();
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({ title: "Failed to save template", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await libraryApi.terms.remove(id);
      toast({ title: "Template deleted" });
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({ title: "Failed to delete template", variant: "destructive" });
    }
  };

  const handleSetDefault = async (template: TermsTemplate) => {
    try {
      // Clear default on same-type templates, then set this one (no bulk
      // endpoint, so do it client-side).
      await Promise.all(
        templates
          .filter(t => t.template_type === template.template_type && t.is_default && t.id !== template.id)
          .map(t => libraryApi.terms.update(t.id, { is_default: false })),
      );
      await libraryApi.terms.update(template.id, { is_default: true });
      toast({ title: "Default template updated" });
      loadTemplates();
    } catch (error) {
      console.error('Error setting default:', error);
      toast({ title: "Failed to set default", variant: "destructive" });
    }
  };

  const handleToggleEnabled = async (template: TermsTemplate, enabled: boolean) => {
    setTemplates(prev => prev.map(t => (t.id === template.id ? { ...t, is_enabled: enabled } : t)));
    try {
      await libraryApi.terms.update(template.id, { is_enabled: enabled } as any);
      toast({
        title: enabled ? "Template enabled" : "Template disabled",
        description: enabled
          ? "These terms will appear in the preview and downloaded PDF."
          : "These terms will be left out of the preview and PDF.",
      });
      loadTemplates();
    } catch (error) {
      console.error('Error toggling template:', error);
      setTemplates(prev => prev.map(t => (t.id === template.id ? { ...t, is_enabled: !enabled } : t)));
      toast({ title: "Failed to update template", variant: "destructive" });
    }
  };

  const handleEdit = (template: TermsTemplate) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      template_type: template.template_type,
      content: template.content,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      template_name: "",
      template_type: "quotation",
      content: [{ id: "1", title: "PAYMENT TERMS", points: ["Payment is due as per agreed schedule."] }],
    });
  };

  const addSection = () => {
    setFormData(prev => ({
      ...prev,
      content: [...prev.content, { id: Date.now().toString(), title: "", points: [""] }],
    }));
  };

  const removeSection = (index: number) => {
    if (formData.content.length > 1) {
      setFormData(prev => ({
        ...prev,
        content: prev.content.filter((_, i) => i !== index),
      }));
    }
  };

  const addPoint = (sectionIndex: number) => {
    const updated = [...formData.content];
    updated[sectionIndex].points.push("");
    setFormData({ ...formData, content: updated });
  };

  const removePoint = (sectionIndex: number, pointIndex: number) => {
    if (formData.content[sectionIndex].points.length > 1) {
      const updated = [...formData.content];
      updated[sectionIndex].points = updated[sectionIndex].points.filter((_, i) => i !== pointIndex);
      setFormData({ ...formData, content: updated });
    }
  };

  const filteredTemplates = filterType === 'all' 
    ? templates 
    : templates.filter(t => t.template_type === filterType);

  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Terms & Conditions Templates</h3>
          <p className="text-sm text-muted-foreground">Create reusable T&C for quotations and invoices</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={filterType} onValueChange={(v) => setFilterType(v as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
              <TabsTrigger value="quotation" className="text-xs px-3">Quotation</TabsTrigger>
              <TabsTrigger value="invoice" className="text-xs px-3">Invoice</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => { resetForm(); setEditingTemplate(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      {filteredTemplates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground text-center mb-4">No terms templates yet</p>
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base">{template.template_name}</CardTitle>
                    <Badge variant="outline" className="text-xs capitalize">{template.template_type}</Badge>
                    {template.is_default && (
                      <Badge variant="secondary" className="text-xs">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="flex items-center gap-2 mr-2">
                      <Switch
                        checked={template.is_enabled !== false}
                        onCheckedChange={(v) => handleToggleEnabled(template, v)}
                        aria-label="Use these terms in PDFs"
                      />
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {template.is_enabled === false ? "Off" : "On"}
                      </span>
                    </div>
                    {!template.is_default && (
                      <Button variant="ghost" size="sm" onClick={() => handleSetDefault(template)}>
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {template.content.length} section(s)
                  {template.is_enabled === false && " · not shown in PDFs"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit' : 'Create'} Terms Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={formData.template_name}
                  onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                  placeholder="e.g., Standard Quotation Terms"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Tabs value={formData.template_type} onValueChange={(v) => setFormData({ ...formData, template_type: v as any })}>
                  <TabsList className="w-full">
                    <TabsTrigger value="quotation" className="flex-1">Quotation</TabsTrigger>
                    <TabsTrigger value="invoice" className="flex-1">Invoice</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            <div className="space-y-4">
              <Label>Sections</Label>
              {formData.content.map((section, sectionIndex) => (
                <Card key={section.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={section.title}
                        onChange={(e) => {
                          const updated = [...formData.content];
                          updated[sectionIndex].title = e.target.value;
                          setFormData({ ...formData, content: updated });
                        }}
                        placeholder="Section Title"
                        className="font-medium"
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeSection(sectionIndex)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                    
                    {section.points.map((point, pointIndex) => (
                      <div key={pointIndex} className="flex items-start gap-2 pl-4">
                        <span className="text-muted-foreground mt-2">•</span>
                        <Input
                          value={point}
                          onChange={(e) => {
                            const updated = [...formData.content];
                            updated[sectionIndex].points[pointIndex] = e.target.value;
                            setFormData({ ...formData, content: updated });
                          }}
                          placeholder="Enter point..."
                        />
                        <Button variant="ghost" size="icon" onClick={() => removePoint(sectionIndex, pointIndex)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" onClick={() => addPoint(sectionIndex)} className="ml-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Point
                    </Button>
                  </div>
                </Card>
              ))}
              <Button variant="outline" size="sm" onClick={addSection}>
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTemplate ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
