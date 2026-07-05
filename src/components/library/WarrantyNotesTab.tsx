import { useState, useEffect } from "react";
import { Plus, Trash2, Star, Edit2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { libraryApi } from "@/lib/api";

interface WarrantyTemplate {
  id: string;
  template_name: string;
  content: string;
  is_default: boolean;
  created_at: string;
}

export const WarrantyNotesTab = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<WarrantyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WarrantyTemplate | null>(null);
  
  const [formData, setFormData] = useState({
    template_name: "",
    content: "",
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data } = await libraryApi.warranty.list();
      setTemplates((data as WarrantyTemplate[]) || []);
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
        await libraryApi.warranty.update(editingTemplate.id, {
          template_name: formData.template_name,
          content: formData.content,
        });
        toast({ title: "Template updated" });
      } else {
        await libraryApi.warranty.create({
          template_name: formData.template_name,
          content: formData.content,
          is_default: templates.length === 0,
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
      await libraryApi.warranty.remove(id);
      toast({ title: "Template deleted" });
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      // Clear existing default(s), then set this one (no bulk endpoint).
      await Promise.all(
        templates
          .filter(t => t.is_default && t.id !== id)
          .map(t => libraryApi.warranty.update(t.id, { is_default: false })),
      );
      await libraryApi.warranty.update(id, { is_default: true });
      toast({ title: "Default updated" });
      loadTemplates();
    } catch (error) {
      console.error('Error setting default:', error);
      toast({ title: "Failed to set default", variant: "destructive" });
    }
  };

  const handleEdit = (template: WarrantyTemplate) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      content: template.content,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      template_name: "",
      content: "",
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Warranty & Notes Templates</h3>
          <p className="text-sm text-muted-foreground">Create reusable warranty terms and notes</p>
        </div>
        <Button onClick={() => { resetForm(); setEditingTemplate(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground text-center mb-4">No warranty templates yet</p>
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{template.template_name}</CardTitle>
                    {template.is_default && (
                      <Badge variant="secondary" className="text-xs">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!template.is_default && (
                      <Button variant="ghost" size="sm" onClick={() => handleSetDefault(template.id)}>
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
                <p className="text-sm text-muted-foreground line-clamp-2">{template.content || "No content"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit' : 'Create'} Warranty Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                placeholder="e.g., 10 Year Warranty"
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter warranty terms or notes..."
                rows={6}
              />
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
