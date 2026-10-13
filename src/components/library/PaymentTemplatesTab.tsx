import { useState, useEffect } from "react";
import { Plus, Trash2, Star, Edit2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { libraryApi } from "@/lib/api";

interface PaymentStage {
  id: string;
  stage: string;
  milestone: string;
  percentage: number;
}

interface PaymentTemplate {
  id: string;
  template_name: string;
  stages: PaymentStage[];
  is_default: boolean;
  created_at: string;
}

export const PaymentTemplatesTab = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<PaymentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PaymentTemplate | null>(null);
  
  const [formData, setFormData] = useState({
    template_name: "",
    stages: [
      { id: "1", stage: "1", milestone: "Design Phase", percentage: 10 },
      { id: "2", stage: "2", milestone: "Material Procurement", percentage: 30 },
      { id: "3", stage: "3", milestone: "Execution Start", percentage: 30 },
      { id: "4", stage: "4", milestone: "Mid-Execution", percentage: 20 },
      { id: "5", stage: "5", milestone: "Final Handover", percentage: 10 },
    ] as PaymentStage[],
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data } = await libraryApi.paymentTemplates.list();
      setTemplates(((data as any[]) || []).map(t => ({
        ...t,
        stages: Array.isArray(t.stages) ? t.stages as unknown as PaymentStage[] : []
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
        await libraryApi.paymentTemplates.update(editingTemplate.id, {
          template_name: formData.template_name,
          stages: formData.stages as unknown as any,
        });
        toast({ title: "Template updated" });
      } else {
        await libraryApi.paymentTemplates.create({
          template_name: formData.template_name,
          stages: formData.stages as unknown as any,
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
      await libraryApi.paymentTemplates.remove(id);
      toast({ title: "Template deleted" });
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({ title: "Failed to delete template", variant: "destructive" });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      // Clear existing default(s), then set this one (no bulk endpoint).
      await Promise.all(
        templates
          .filter(t => t.is_default && t.id !== id)
          .map(t => libraryApi.paymentTemplates.update(t.id, { is_default: false })),
      );
      await libraryApi.paymentTemplates.update(id, { is_default: true });
      toast({ title: "Default template updated" });
      loadTemplates();
    } catch (error) {
      console.error('Error setting default:', error);
      toast({ title: "Failed to set default", variant: "destructive" });
    }
  };

  const handleEdit = (template: PaymentTemplate) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      stages: template.stages,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      template_name: "",
      stages: [
        { id: "1", stage: "1", milestone: "Design Phase", percentage: 10 },
        { id: "2", stage: "2", milestone: "Material Procurement", percentage: 30 },
        { id: "3", stage: "3", milestone: "Execution Start", percentage: 30 },
        { id: "4", stage: "4", milestone: "Mid-Execution", percentage: 20 },
        { id: "5", stage: "5", milestone: "Final Handover", percentage: 10 },
      ],
    });
  };

  const addStage = () => {
    setFormData(prev => ({
      ...prev,
      stages: [...prev.stages, { id: Date.now().toString(), stage: (prev.stages.length + 1).toString(), milestone: "", percentage: 0 }],
    }));
  };

  const removeStage = (index: number) => {
    if (formData.stages.length > 1) {
      setFormData(prev => ({
        ...prev,
        stages: prev.stages.filter((_, i) => i !== index),
      }));
    }
  };

  const totalPercentage = formData.stages.reduce((sum, s) => sum + s.percentage, 0);

  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Payment Stage Templates</h3>
          <p className="text-sm text-muted-foreground">Create reusable stage-wise payment plans</p>
        </div>
        <Button onClick={() => { resetForm(); setEditingTemplate(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground text-center mb-4">No payment templates yet</p>
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
                <div className="flex flex-wrap gap-2">
                  {template.stages.map((stage, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {stage.milestone}: {stage.percentage}%
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit' : 'Create'} Payment Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                placeholder="e.g., Standard 5-Stage Payment"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Payment Stages</Label>
                <span className={`text-sm font-medium ${totalPercentage === 100 ? 'text-green-600' : 'text-destructive'}`}>
                  Total: {totalPercentage}%
                </span>
              </div>
              
              {formData.stages.map((stage, index) => (
                <div key={stage.id} className="grid grid-cols-[60px_1fr_100px_40px] gap-2 items-center">
                  <Input
                    value={stage.stage}
                    onChange={(e) => {
                      const updated = [...formData.stages];
                      updated[index].stage = e.target.value;
                      setFormData({ ...formData, stages: updated });
                    }}
                    placeholder="1"
                    className="h-9"
                  />
                  <Input
                    value={stage.milestone}
                    onChange={(e) => {
                      const updated = [...formData.stages];
                      updated[index].milestone = e.target.value;
                      setFormData({ ...formData, stages: updated });
                    }}
                    placeholder="Milestone name"
                    className="h-9"
                  />
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={stage.percentage}
                      onChange={(e) => {
                        const updated = [...formData.stages];
                        updated[index].percentage = parseFloat(e.target.value) || 0;
                        setFormData({ ...formData, stages: updated });
                      }}
                      className="h-9"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeStage(index)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              
              <Button variant="outline" size="sm" onClick={addStage}>
                <Plus className="h-4 w-4 mr-2" />
                Add Stage
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || totalPercentage !== 100}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTemplate ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
