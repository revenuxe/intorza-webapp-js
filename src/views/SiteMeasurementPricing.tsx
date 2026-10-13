"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "@/lib/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLocalization } from "@/hooks/useLocalization";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, FileText } from "lucide-react";
import { toast } from "sonner";

interface Room {
  id: string;
  room_type: string;
  room_name: string | null;
  area_sqft: number;
  pricing_mode: string | null;
  rate_per_sqft: number | null;
  lump_sum_amount: number | null;
  quantity: number | null;
  rate_per_unit: number | null;
  final_amount: number | null;
}

interface Project {
  id: string;
  client_name: string;
  site_location: string | null;
}

export default function SiteMeasurementPricing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings, formatCurrency: formatCurrencyLocalized, formatArea } = useLocalization();
  const [project, setProject] = useState<Project | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [createAsDraft, setCreateAsDraft] = useState(true);

  const fetchData = useCallback(async () => {
    if (!id) return;

    const [projectRes, roomsRes] = await Promise.all([
      supabase
        .from('site_measurement_projects')
        .select('id, client_name, site_location')
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('site_measurement_rooms')
        .select('*')
        .eq('project_id', id)
        .order('sort_order')
    ]);

    if (projectRes.data) {
      setProject(projectRes.data);
    }

    if (roomsRes.data) {
      setRooms(roomsRes.data.map(r => ({
        ...r,
        pricing_mode: r.pricing_mode || 'per_sqft',
        rate_per_sqft: r.rate_per_sqft || 0,
        lump_sum_amount: r.lump_sum_amount || 0,
        quantity: r.quantity || 1,
        rate_per_unit: r.rate_per_unit || 0,
        final_amount: r.final_amount || 0
      })));
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateRoom = (roomId: string, updates: Partial<Room>) => {
    setRooms(prev => prev.map(room => {
      if (room.id !== roomId) return room;
      
      const updated = { ...room, ...updates };
      
      // Calculate final amount based on pricing mode
      if (updated.pricing_mode === 'per_sqft') {
        updated.final_amount = (updated.area_sqft || 0) * (updated.rate_per_sqft || 0);
      } else if (updated.pricing_mode === 'lump_sum') {
        updated.final_amount = updated.lump_sum_amount || 0;
      } else if (updated.pricing_mode === 'per_unit') {
        updated.final_amount = (updated.quantity || 0) * (updated.rate_per_unit || 0);
      }
      
      return updated;
    }));
  };

  const getTotalAmount = () => {
    return rooms.reduce((sum, r) => sum + (r.final_amount || 0), 0);
  };

  const saveRoomPricing = async () => {
    for (const room of rooms) {
      await supabase
        .from('site_measurement_rooms')
        .update({
          pricing_mode: room.pricing_mode,
          rate_per_sqft: room.rate_per_sqft,
          lump_sum_amount: room.lump_sum_amount,
          quantity: room.quantity,
          rate_per_unit: room.rate_per_unit,
          final_amount: room.final_amount
        })
        .eq('id', room.id);
    }
  };

  const generateQuotation = async (skipAmounts: boolean = false) => {
    if (!user || !project || !id) return;

    setGenerating(true);

    try {
      // Save pricing first
      if (!skipAmounts) {
        await saveRoomPricing();
      }

      // Generate quotation number
      const { count } = await supabase
        .from('quotations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const quotationNumber = `QT-${String((count || 0) + 1).padStart(4, '0')}`;

      // Create quotation
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .insert({
          user_id: user.id,
          quotation_number: quotationNumber,
          project_name: project.client_name,
          client_name: project.client_name,
          client_address: project.site_location,
          status: createAsDraft ? 'draft' : 'pending',
          subtotal: skipAmounts ? 0 : getTotalAmount(),
          grand_total: skipAmounts ? 0 : getTotalAmount(),
          date_of_proposal: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (quotationError || !quotation) {
        throw new Error('Failed to create quotation');
      }

      // Create a section for measurements
      const { data: section, error: sectionError } = await supabase
        .from('quotation_sections')
        .insert({
          quotation_id: quotation.id,
          section_name: 'Site Measurements',
          sort_order: 0
        })
        .select()
        .single();

      if (sectionError || !section) {
        throw new Error('Failed to create section');
      }

      // Create items for each room
      for (let i = 0; i < rooms.length; i++) {
        const room = rooms[i];
        await supabase
          .from('quotation_items')
          .insert({
            section_id: section.id,
            product_name: room.room_name || room.room_type,
            product_details: `Area: ${room.area_sqft?.toFixed(1)} sq.ft`,
            width_ft: Math.sqrt(room.area_sqft || 0),
            height_ft: Math.sqrt(room.area_sqft || 0),
            sft_area: room.area_sqft,
            rate_per_sft: room.pricing_mode === 'per_sqft' ? room.rate_per_sqft : null,
            amount: skipAmounts ? 0 : room.final_amount,
            sort_order: i
          });
      }

      // Update site measurement project
      await supabase
        .from('site_measurement_projects')
        .update({
          status: 'converted',
          quotation_id: quotation.id
        })
        .eq('id', id);

      toast.success('Quotation created successfully');
      navigate(`/?id=${quotation.id}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate quotation');
    } finally {
      setGenerating(false);
    }
  };

  // Use localized currency formatting
  const formatCurrency = (amount: number) => formatCurrencyLocalized(amount);
  
  // Get area unit label based on measurement system
  const areaUnitLabel = settings.measurementSystem === 'metric' ? 'sq.m' : 'sq.ft';
  const areaUnitShort = settings.areaUnitShort.toLowerCase();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="p-4 md:p-6 pb-32 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(`/site-measurement/${id}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Pricing Setup</h1>
          <p className="text-sm text-muted-foreground">{project.client_name}</p>
        </div>
      </div>

      {/* Rooms Pricing */}
      <div className="space-y-4 mb-6">
        {rooms.map((room) => (
          <Card key={room.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{room.room_name || room.room_type}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {room.area_sqft?.toFixed(1)} {areaUnitLabel}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Pricing Mode</Label>
                <Select 
                  value={room.pricing_mode || 'per_sqft'} 
                  onValueChange={(value) => updateRoom(room.id, { pricing_mode: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_sqft">Per {areaUnitLabel}</SelectItem>
                    <SelectItem value="lump_sum">Lump Sum</SelectItem>
                    <SelectItem value="per_unit">Per Unit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {room.pricing_mode === 'per_sqft' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Rate per {areaUnitLabel}</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={room.rate_per_sqft || ''}
                      onChange={(e) => updateRoom(room.id, { rate_per_sqft: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="text"
                      value={formatCurrency(room.final_amount || 0)}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
              )}

              {room.pricing_mode === 'lump_sum' && (
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={room.lump_sum_amount || ''}
                    onChange={(e) => {
                      const amount = parseFloat(e.target.value) || 0;
                      updateRoom(room.id, { lump_sum_amount: amount, final_amount: amount });
                    }}
                  />
                </div>
              )}

              {room.pricing_mode === 'per_unit' && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={room.quantity || ''}
                      onChange={(e) => updateRoom(room.id, { quantity: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rate/Unit</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={room.rate_per_unit || ''}
                      onChange={(e) => updateRoom(room.id, { rate_per_unit: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="text"
                      value={formatCurrency(room.final_amount || 0)}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Total */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Amount</span>
            <span className="text-2xl font-bold tabular-nums">{formatCurrency(getTotalAmount())}</span>
          </div>
        </CardContent>
      </Card>

      {/* Draft checkbox */}
      <div className="flex items-center space-x-2 mb-6">
        <Checkbox 
          id="draft" 
          checked={createAsDraft}
          onCheckedChange={(checked) => setCreateAsDraft(checked === true)}
        />
        <Label htmlFor="draft" className="cursor-pointer">Create quotation as Draft</Label>
      </div>

      {/* Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t md:relative md:border-t-0 md:p-0">
        <div className="flex flex-col gap-2 max-w-lg mx-auto md:max-w-none md:flex-row">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => navigate(`/site-measurement/${id}`)}
          >
            Back
          </Button>
          <Button 
            variant="secondary" 
            className="flex-1"
            onClick={() => generateQuotation(true)}
            disabled={generating}
          >
            Skip Amounts → Create Empty
          </Button>
          <Button 
            className="flex-1"
            onClick={() => generateQuotation(false)}
            disabled={generating}
          >
            <FileText className="h-4 w-4 mr-2" />
            {generating ? "Generating..." : "Generate Quotation"}
          </Button>
        </div>
      </div>
    </div>
  );
}
