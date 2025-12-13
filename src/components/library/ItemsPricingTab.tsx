import { useState, useEffect } from "react";
import { Package, TrendingUp, IndianRupee, Trash2, Search, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ItemPattern {
  id: string;
  product_name: string;
  product_details: string | null;
  preferred_rate: number | null;
  default_rate: number | null;
  usage_count: number;
  last_used_at: string;
}

export const ItemsPricingTab = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<ItemPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", details: "", rate: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('item_usage_patterns')
        .select('*')
        .eq('user_id', user.id)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name.trim()) {
      toast({ title: "Product name is required", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if item already exists
      const existing = items.find(i => i.product_name.toLowerCase() === newItem.name.trim().toLowerCase());
      if (existing) {
        toast({ title: "Item already exists", description: "Update the existing item instead", variant: "destructive" });
        return;
      }

      const rate = parseFloat(newItem.rate) || null;
      const { error } = await supabase.from('item_usage_patterns').insert({
        user_id: user.id,
        product_name: newItem.name.trim(),
        product_details: newItem.details.trim() || null,
        default_rate: rate,
        preferred_rate: rate,
        usage_count: 0,
        last_used_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({ title: "Item added to library" });
      setShowAddDialog(false);
      setNewItem({ name: "", details: "", rate: "" });
      loadItems();
    } catch (error) {
      console.error('Error adding item:', error);
      toast({ title: "Failed to add item", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRate = async (id: string, newRate: number) => {
    try {
      const { error } = await supabase
        .from('item_usage_patterns')
        .update({ preferred_rate: newRate, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      
      setItems(items.map(item => 
        item.id === id ? { ...item, preferred_rate: newRate } : item
      ));
      
      toast({ title: "Rate updated" });
    } catch (error) {
      console.error('Error updating rate:', error);
      toast({ title: "Failed to update rate", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('item_usage_patterns')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setItems(items.filter(item => item.id !== id));
      toast({ title: "Item removed from library" });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const filteredItems = items.filter(item =>
    item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.product_details?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading items...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Items & Pricing Library
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Add items manually or they're auto-learned from quotations
              </p>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {items.length === 0 
                ? "No items yet. Add items manually or create quotations to auto-learn."
                : "No items match your search."}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{item.product_name}</h4>
                      {item.usage_count > 0 && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {item.usage_count}
                        </Badge>
                      )}
                    </div>
                    {item.product_details && (
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {item.product_details}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <div className="flex items-center gap-1">
                      <IndianRupee className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={item.preferred_rate || item.default_rate || ''}
                        onChange={(e) => handleUpdateRate(item.id, parseFloat(e.target.value) || 0)}
                        className="w-24 h-8 text-right"
                        placeholder="Rate"
                      />
                      <span className="text-xs text-muted-foreground">/sft</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center pt-4">
            {items.length} items in your library
          </p>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">Product Name *</Label>
              <Input
                id="item-name"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                placeholder="e.g., Modular Kitchen Cabinet"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-details">Product Details</Label>
              <Textarea
                id="item-details"
                value={newItem.details}
                onChange={(e) => setNewItem({ ...newItem, details: e.target.value })}
                placeholder="Optional description or specifications"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-rate">Default Rate (₹/sft)</Label>
              <Input
                id="item-rate"
                type="number"
                value={newItem.rate}
                onChange={(e) => setNewItem({ ...newItem, rate: e.target.value })}
                placeholder="e.g., 850"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddItem} disabled={saving}>
              {saving ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};