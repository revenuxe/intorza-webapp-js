"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MeasurementJourney } from '@/components/site-measurement/MeasurementJourney';
import { roomAmount, roomIsMeasured } from '@/lib/siteMeasurements';
import { notifyAccountChanged } from '@/lib/accountQueries';
import { useParams, useNavigate } from "@/lib/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLocalization } from "@/hooks/useLocalization";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText } from "lucide-react";
import { useInlineFeedback } from '@/hooks/useInlineFeedback';

interface Room {
  id: string;
  room_type: string;
  room_name: string | null;
  area_sqft: number;
  width_ft:number;
  length_ft:number;
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
  quotation_id?:string|null;
}

export default function SiteMeasurementPricing() {
  const { toast, feedback } = useInlineFeedback();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatCurrency: formatCurrencyLocalized } = useLocalization();
  const [project, setProject] = useState<Project | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const generationBusy=useRef(false);
  const requestId=useRef<string|null>(null);
  const readyForQuotation=rooms.length>0&&rooms.every(roomIsMeasured);

  const fetchData = useCallback(async () => {
    if (!id) return;

    const [projectRes, roomsRes] = await Promise.all([
      supabase
        .from('site_measurement_projects')
        .select('id, client_name, site_location, quotation_id')
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
        quantity: r.quantity ?? 1,
        rate_per_unit: r.rate_per_unit || 0,
        final_amount: roomAmount(r)
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
    return rooms.reduce((sum, r) => sum + roomAmount(r), 0);
  };

  const generateQuotation = async (skipAmounts = false) => {
    if (!user || !project || !id || generationBusy.current) return;
    if(project.quotation_id){navigate('/?id='+project.quotation_id);return;}
    if(!rooms.length){toast({title:'Add a room first',description:'Go back to the site visit and measure at least one room.',variant:'destructive'});return;}
    if(rooms.some(room=>!roomIsMeasured(room))){toast({title:'Measurements need attention',description:'Each room needs a positive width and length before creating a quotation.',variant:'destructive'});return;}
    const invalid=rooms.some(room=>{
      const values=room.pricing_mode==='lump_sum'?[room.lump_sum_amount||0]:room.pricing_mode==='per_unit'?[room.quantity??1,room.rate_per_unit||0]:[room.rate_per_sqft||0];
      return values.some(value=>!Number.isFinite(Number(value))||Number(value)<0)||(room.pricing_mode==='per_unit'&&Number(room.quantity??1)<=0);
    });
    if(!skipAmounts&&invalid){toast({title:'Check the room prices',description:'Use non-negative prices and a quantity greater than zero.',variant:'destructive'});return;}
    generationBusy.current=true;setGenerating(true);requestId.current ||= crypto.randomUUID();
    try{
      const {data,error}=await supabase.rpc('convert_site_measurement',{
        p_project_id:id,p_request_id:requestId.current,p_skip_amounts:skipAmounts,
        p_pricing:rooms.map(room=>({id:room.id,expected_width_ft:room.width_ft,expected_length_ft:room.length_ft,pricing_mode:room.pricing_mode||'per_sqft',rate_per_sqft:room.rate_per_sqft||0,lump_sum_amount:room.lump_sum_amount||0,quantity:room.quantity??1,rate_per_unit:room.rate_per_unit||0})),
      });
      if(error)throw error;
      const quotationId=(data as {quotation_id?:string}|null)?.quotation_id;
      if(!quotationId)throw new Error('Missing quotation acknowledgement');
      notifyAccountChanged(user.id,'quotations',true);
      navigate('/?id='+quotationId);
    }catch(error){const message=error&&typeof error==='object'&&'message' in error&&typeof error.message==='string'?error.message:'Your site visit is kept. Retry to confirm the saved draft.';toast({title:'Could not create the draft',description:message,variant:'destructive'});}
    finally{generationBusy.current=false;setGenerating(false);}
  };

  // Use localized currency formatting
  const formatCurrency = (amount: number) => formatCurrencyLocalized(amount,true);
  
  // Get area unit label based on measurement system
  const areaUnitLabel = 'sq.ft';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  if(!project)return <div className="p-4"><p>This site visit could not be loaded.</p><Button variant="outline" className="mt-3" onClick={()=>navigate('/site-measurement')}>Back to site visits</Button></div>;

  if (!project) return null;

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl p-4 pb-40 md:p-6">
      {feedback}
      <div className="mb-5"><MeasurementJourney step={3}/></div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          className="h-11 w-11 shrink-0"
          aria-label="Back to measurements"
          onClick={() => navigate(`/site-measurement/${id}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold">Prepare a quotation</h1>
          <p className="break-words text-sm text-muted-foreground">{project.client_name}</p>
        </div>
      </div>
      <div className="mb-5 space-y-2 rounded-xl border bg-card p-4 text-sm leading-6">
        <p className="font-medium">{project.quotation_id?'A quotation already exists for this visit.':'Add room prices now, or start without prices.'}</p>
        <p className="text-muted-foreground">{project.quotation_id?'Open the saved quotation to edit its items and prices. This site record is kept separately.':'Room dimensions describe floor area in square feet. Walls, cabinets and other work need their own billable measurements. Review the draft before sharing.'}</p>
      </div>

      {!project.quotation_id&&!readyForQuotation&&<p role="alert" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">The visit needs at least one room with a positive width and length for every room. Use Back to finish those measurements first.</p>}
      {/* Rooms Pricing */}
      <fieldset disabled={generating||Boolean(project.quotation_id)} className="mb-6 min-w-0 space-y-4">
        {rooms.map((room) => (
          <Card key={room.id} className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="flex min-w-0 flex-col gap-1 text-base sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <span className="min-w-0 break-words">{room.room_name || room.room_type}</span>
                <span className="shrink-0 text-sm font-normal text-muted-foreground">
                  {room.area_sqft?.toFixed(1)} {areaUnitLabel}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`pricing-mode-${room.id}`}>How do you want to price this room?</Label>
                <Select 
                  value={room.pricing_mode || 'per_sqft'} 
                  onValueChange={(value) => updateRoom(room.id, { pricing_mode: value })}
                >
                  <SelectTrigger id={`pricing-mode-${room.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_sqft">Rate × floor area ({areaUnitLabel})</SelectItem>
                    <SelectItem value="lump_sum">Fixed room price</SelectItem>
                    <SelectItem value="per_unit">Quantity × rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {room.pricing_mode === 'per_sqft' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`area-rate-${room.id}`}>Rate per {areaUnitLabel}</Label>
                    <Input
                      type="number"
                      id={`area-rate-${room.id}`}
                      min="0"
                      inputMode="decimal"
                      value={room.rate_per_sqft || ''}
                      onChange={(e) => updateRoom(room.id, { rate_per_sqft: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`area-amount-${room.id}`}>Amount</Label>
                    <Input
                      type="text"
                      id={`area-amount-${room.id}`}
                      value={formatCurrency(room.final_amount || 0)}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
              )}

              {room.pricing_mode === 'lump_sum' && (
                <div className="space-y-2">
                  <Label htmlFor={`fixed-amount-${room.id}`}>Fixed room price</Label>
                  <Input
                    type="number"
                    id={`fixed-amount-${room.id}`}
                    min="0"
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
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`quantity-${room.id}`}>Quantity</Label>
                    <Input
                      type="number"
                      id={`quantity-${room.id}`}
                      min="0"
                      inputMode="numeric"
                      value={room.quantity || ''}
                      onChange={(e) => updateRoom(room.id, { quantity: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`unit-rate-${room.id}`}>Rate per unit</Label>
                    <Input
                      type="number"
                      id={`unit-rate-${room.id}`}
                      min="0"
                      inputMode="decimal"
                      value={room.rate_per_unit || ''}
                      onChange={(e) => updateRoom(room.id, { rate_per_unit: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="col-span-2 space-y-2 sm:col-span-1">
                    <Label htmlFor={`unit-amount-${room.id}`}>Amount</Label>
                    <Input
                      type="text"
                      id={`unit-amount-${room.id}`}
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
      </fieldset>

      {/* Total */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <span className="font-medium">Room subtotal</span>
            <span className="min-w-0 break-all text-xl font-bold tabular-nums sm:text-2xl">{formatCurrency(getTotalAmount())}</span>
          </div>
        </CardContent>
      </Card>

      <p className="mb-6 text-sm leading-6 text-muted-foreground">A draft opens in the quotation editor. Confirm work scope, billable units, taxes and discounts there before sharing it.</p>

      {/* Actions */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:relative md:border-t-0 md:p-0">
        <div className="mx-auto grid min-w-0 max-w-lg grid-cols-2 gap-2 md:max-w-none md:grid-cols-3 [&>button]:h-12 [&>button]:min-w-0 [&>button]:rounded-xl [&>button]:px-2 [&>button]:text-xs sm:[&>button]:text-sm">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => navigate(`/site-measurement/${id}`)}
            disabled={generating}
          >
            Back
          </Button>
          {!project.quotation_id&&<Button
            variant="secondary" 
            className="flex-1"
            onClick={() => generateQuotation(true)}
            disabled={generating||!readyForQuotation}
          >
            Create without prices
          </Button>}
          <Button 
            className="col-span-2 gap-2 md:col-span-1"
            onClick={() => generateQuotation(false)}
            disabled={generating||(!project.quotation_id&&!readyForQuotation)}
          >
            <FileText className="h-4 w-4 shrink-0" />
            {generating ? "Creating draft..." : project.quotation_id?'Open quotation':"Create draft quotation"}
          </Button>
        </div>
      </div>
    </div>
  );
}
