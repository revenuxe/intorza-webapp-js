import { useEffect, useState, useRef, useId } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { feetAndInches, splitFeet } from '@/lib/siteMeasurements';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useInlineFeedback } from '@/hooks/useInlineFeedback';
import { uploadAndSave, resolveRoomPhotoUrl, removeStoredUpload } from '@/lib/storageUpload';
import { storageObjectPath } from '@/lib/storage-path';

const ROOM_TYPES = [
  "Kitchen",
  "Bedroom",
  "Living Room",
  "Bathroom",
  "Dining Room",
  "Study Room",
  "Balcony",
  "Utility Room",
  "Hallway",
  "Custom"
];

interface Room {
  id?: string;
  room_type: string;
  room_name: string | null;
  width_ft: number;
  length_ft: number;
  height_ft: number | null;
  notes: string | null;
}

interface RoomPhoto {
  id: string;
  photo_url: string;
  caption: string | null;
  storage_key?: string;
}

interface RoomFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: Room | null;
  onSave: (data: Partial<Room>) => Promise<void>;
  focusPhotos?: boolean;
  onPhotosChanged?:()=>void;
}

// Compress image to WebP format with quality reduction
const compressImage = async (file: File, maxWidth = 1200, quality = 0.7): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      
      // Scale down if larger than maxWidth
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/webp',
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Failed to load image')); };
    img.src = objectUrl;
  });
};

export function RoomFormSheet({ open, onOpenChange, room, onSave, focusPhotos=false, onPhotosChanged }: RoomFormSheetProps) {
  const {toast:notify,feedback:photoFeedback,clearFeedback}=useInlineFeedback({autoRevealErrors:true});
  const toast={error:(description:string)=>notify({title:'Photo needs attention',description,variant:'destructive'}),success:(description:string)=>notify({title:'Photos saved',description})};
  const fieldId=useId();
  const draftId=useRef<string>('');
  const photoSection=useRef<HTMLDivElement>(null);
  const errorNotice=useRef<HTMLParagraphElement>(null);
  const photoGeneration=useRef(0);
  const submitBusy=useRef(false);
  const [saving,setSaving]=useState(false);
  const [dirty,setDirty]=useState(false);
  const [discardOpen,setDiscardOpen]=useState(false);
  const [formError,setFormError]=useState('');
  useEffect(()=>{if(formError)errorNotice.current?.scrollIntoView({block:'nearest'});},[formError]);
  const [unitMode,setUnitMode]=useState<'feet_inches'|'decimal'>('feet_inches');
  const [widthInches,setWidthInches]=useState('');
  const [lengthInches,setLengthInches]=useState('');
  const [roomType, setRoomType] = useState("Kitchen");
  const [customName, setCustomName] = useState("");
  const [widthFt, setWidthFt] = useState("");
  const [lengthFt, setLengthFt] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<RoomPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    photoGeneration.current++;
    setPhotos([]);setFormError('');setDirty(false);setDiscardOpen(false);setUnitMode('feet_inches');clearFeedback();
    if (room) {
      setRoomType(ROOM_TYPES.includes(room.room_type) ? room.room_type : "Custom");
      setCustomName(room.room_name || (ROOM_TYPES.includes(room.room_type) ? "" : room.room_type));
      const width=splitFeet(room.width_ft),length=splitFeet(room.length_ft);
      setWidthFt(width.feet);setWidthInches(width.inches);
      setLengthFt(length.feet);setLengthInches(length.inches);
      setHeightFt(room.height_ft&&room.height_ft>0?room.height_ft.toString():"");
      setNotes(room.notes || "");
      // Fetch existing photos if editing
      if (room.id) {
        fetchPhotos(room.id);
      }
    } else {
      resetForm();
    }
    return ()=>{photoGeneration.current++;};
  }, [room, open]);
  useEffect(()=>{if(open&&focusPhotos&&room?.id){const timer=setTimeout(()=>photoSection.current?.scrollIntoView({block:'start'}),100);return ()=>clearTimeout(timer);}},[open,focusPhotos,room?.id]);

  const fetchPhotos = async (roomId: string) => {
    const generation=photoGeneration.current;
    const { data, error } = await supabase
      .from('room_photos')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at');
    
    if(generation!==photoGeneration.current)return;
    if (error) { toast.error('Could not load room photos'); return; }
    if (data) {
      // Generate signed URLs for each photo
      const photosWithSignedUrls = await Promise.all(
        data.map(async (photo) => {
          try {
            return { ...photo, storage_key: storageObjectPath(photo.photo_url, 'room-photos') || undefined, photo_url: await resolveRoomPhotoUrl(photo.photo_url) };
          } catch {
            toast.error('A room photo could not be opened');
            return { ...photo, photo_url: '' };
          }
        })
      );
      if(generation===photoGeneration.current)setPhotos(photosWithSignedUrls);
    }
  };

  const resetForm = () => {
    draftId.current=crypto.randomUUID();
    setRoomType("Kitchen");
    setCustomName("");
    setWidthFt("");
    setLengthFt("");
    setWidthInches('');setLengthInches('');
    setHeightFt("");
    setNotes("");
    setPhotos([]);
  };

  const calculateArea = () => {
    const w = unitMode==='feet_inches'?feetAndInches(widthFt,widthInches):Number(widthFt);
    const l = unitMode==='feet_inches'?feetAndInches(lengthFt,lengthInches):Number(lengthFt);
    return w&&l&&w>0&&l>0?w*l:0;
  };
  const changeUnitMode=(next:'feet_inches'|'decimal')=>{
    if(next===unitMode)return;
    const width=unitMode==='feet_inches'?feetAndInches(widthFt,widthInches):Number(widthFt);
    const length=unitMode==='feet_inches'?feetAndInches(lengthFt,lengthInches):Number(lengthFt);
    if(next==='decimal'){setWidthFt(width===null?'':String(width));setLengthFt(length===null?'':String(length));}
    else {const w=splitFeet(width||0),l=splitFeet(length||0);setWidthFt(w.feet);setWidthInches(w.inches);setLengthFt(l.feet);setLengthInches(l.inches);}
    setUnitMode(next);setFormError('');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !room?.id) return;

    setUploading(true);
    let savedCount = 0;
    
    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image`);
          continue;
        }

        // Compress to WebP
        const compressedBlob = await compressImage(file);
        const fileName = `${room.id}-${Date.now()}.webp`;

        const photoData = await uploadAndSave(compressedBlob, 'room', async ({ key }) => {
          const { data, error } = await supabase
          .from('room_photos')
          .insert({
            room_id: room.id,
            photo_url: key,
          })
          .select()
          .single();

          if (error) throw error;
          return data;
        });
        const displayUrl = await resolveRoomPhotoUrl(photoData.photo_url);
        setPhotos(prev => [...prev, { 
          ...photoData, 
          storage_key: photoData.photo_url,
          photo_url: displayUrl
        }]);
        savedCount++;
      }
      
      if (savedCount) {toast.success(`${savedCount} photo(s) uploaded successfully`);onPhotosChanged?.();}
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Failed to upload photos');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePhoto = async (photo: RoomPhoto) => {
    try {
      const { data, error } = await supabase
        .from('room_photos')
        .delete()
        .eq('id', photo.id).select('id');
      if (error || !data?.length) throw error || new Error('Photo could not be deleted');
      const key = photo.storage_key || storageObjectPath(photo.photo_url, 'room-photos');
      if (key) {
        try { await removeStoredUpload({ bucket: 'room-photos', key }); }
        catch { toast.error('Photo removed, but its storage file could not be cleaned up'); }
      }

      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      onPhotosChanged?.();
      toast.success('Photo deleted');
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Failed to delete photo');
    }
  };

  const handleSubmit = async () => {
    if(submitBusy.current)return;
    const width=unitMode==='feet_inches'?feetAndInches(widthFt,widthInches):Number(widthFt);
    const length=unitMode==='feet_inches'?feetAndInches(lengthFt,lengthInches):Number(lengthFt);
    if(width===null||length===null||!Number.isFinite(width)||!Number.isFinite(length)||width<=0||length<=0){setFormError('Enter a positive width and length. In feet & inches, use whole feet and inches from 0 to less than 12.');return;}
    if(heightFt&&(!Number.isFinite(Number(heightFt))||Number(heightFt)<=0)){setFormError('Enter a positive height, or leave it blank.');return;}
    if(roomType==='Custom'&&!customName.trim()){setFormError('Give this space a name.');return;}
    const finalRoomType = roomType === "Custom" ? customName.trim() : roomType;
    const finalRoomName = room&&!room.room_name&&customName.trim()===room.room_type?null:customName.trim()||null;
    submitBusy.current=true;setSaving(true);setFormError('');
    try {await onSave({
      id:room?.id||draftId.current,
      room_type: finalRoomType,
      room_name: finalRoomName,
      width_ft: width,
      length_ft: length,
      height_ft: heightFt ? parseFloat(heightFt) : null,
      notes: notes || null
    });}catch{setFormError('Could not save this room. Your measurements are still here; please retry.');}
    finally{submitBusy.current=false;setSaving(false);}
  };
  const requestClose=(value:boolean)=>{
    if(saving||uploading)return;
    if(!value&&dirty){setDiscardOpen(true);return;}
    onOpenChange(value);
  };

  return (
    <Sheet open={open} onOpenChange={requestClose}>
      <SheetContent side="bottom" className="h-[85dvh] min-w-0 overflow-y-auto rounded-t-xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:mx-auto sm:max-w-2xl sm:px-6">
        <SheetHeader className="pb-4">
          <SheetTitle>{room ? "Room details" : "Measure a room"}</SheetTitle>
          <SheetDescription>Measure the floor from wall to wall. Save the room, then attach photos if you need them.</SheetDescription>
        </SheetHeader>

        <fieldset disabled={saving||uploading} className="min-w-0 space-y-4" onChangeCapture={event=>{if(!(event.target instanceof HTMLInputElement)||event.target.type!=='file')setDirty(true);}}>
          {formError&&<p ref={errorNotice} role="alert" className="rounded-xl bg-destructive/5 p-3 text-sm text-destructive">{formError}</p>}
          <div className="space-y-2">
            <Label htmlFor={`${fieldId}-type`}>Room type</Label>
            <Select value={roomType} onValueChange={value=>{setRoomType(value);setDirty(true);}}>
              <SelectTrigger id={`${fieldId}-type`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROOM_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-name`}>Room name {roomType==='Custom'?'':'(optional)'}</Label>
              <Input
                id={`${fieldId}-name`}
                placeholder="e.g. Master bedroom, Bedroom 2"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2" aria-label="Measurement entry format">
            <Button type="button" variant={unitMode==='feet_inches'?'default':'outline'} aria-pressed={unitMode==='feet_inches'} onClick={()=>changeUnitMode('feet_inches')} className="h-11 min-w-0 px-2">Feet & inches</Button>
            <Button type="button" variant={unitMode==='decimal'?'default':'outline'} aria-pressed={unitMode==='decimal'} onClick={()=>changeUnitMode('decimal')} className="h-11 min-w-0 px-2">Decimal feet</Button>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">{unitMode==='feet_inches'?'Example: for 12 ft 6 in, enter 12 feet and 6 inches.':'Example: 12 ft 6 in is 12.5 decimal feet.'}</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-width`}>Width (feet)</Label>
              <Input
                type="number"
                id={`${fieldId}-width`}
                min="0"
                inputMode="decimal"
                placeholder="0"
                value={widthFt}
                onChange={(e) => setWidthFt(e.target.value)}
              />
              {unitMode==='feet_inches'&&<><Label htmlFor={`${fieldId}-width-in`}>Width (inches)</Label><Input id={`${fieldId}-width-in`} type="number" min="0" max="11.999999" inputMode="decimal" value={widthInches} onChange={e=>setWidthInches(e.target.value)} placeholder="0"/></>}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-length`}>Length (feet)</Label>
              <Input
                type="number"
                id={`${fieldId}-length`}
                min="0"
                inputMode="decimal"
                placeholder="0"
                value={lengthFt}
                onChange={(e) => setLengthFt(e.target.value)}
              />
              {unitMode==='feet_inches'&&<><Label htmlFor={`${fieldId}-length-in`}>Length (inches)</Label><Input id={`${fieldId}-length-in`} type="number" min="0" max="11.999999" inputMode="decimal" value={lengthInches} onChange={e=>setLengthInches(e.target.value)} placeholder="0"/></>}
            </div>
          </div>

          {/* Auto Area */}
          <div className="p-4 bg-muted rounded-lg">
            <Label className="text-muted-foreground text-sm">Floor area · width × length</Label>
            <p className="text-2xl font-bold tabular-nums">{calculateArea().toFixed(1)} sq.ft</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Floor area only. Walls, cabinets and other work may need different billable measurements.</p>
          </div>

          <details key={room?.id||'new'} className="rounded-xl border p-3">
            <summary className="min-h-8 cursor-pointer text-sm font-medium">Ceiling height & site notes (optional)</summary>
            <div className="mt-3 space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${fieldId}-height`}>Ceiling height (decimal feet, optional)</Label>
            <Input
              type="number"
              id={`${fieldId}-height`}
              min="0"
              inputMode="decimal"
              placeholder="0"
              value={heightFt}
              onChange={(e) => setHeightFt(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${fieldId}-notes`}>Site notes (optional)</Label>
            <Textarea
              id={`${fieldId}-notes`}
              placeholder="Add any notes about this room..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

            </div>
          </details>

          {/* Photo Upload Section - Only show for existing rooms */}
          {room?.id && (
            <div ref={photoSection} className="scroll-mt-4 space-y-3 rounded-xl border p-3">
              <h3 className="text-sm font-medium">Room photos (optional)</h3>
              {photoFeedback}
              
              {/* Photo Grid */}
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo,index) => (
                    <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden group">
                      <img 
                        src={photo.photo_url} 
                        alt={`Room photo ${index+1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(photo)}
                        aria-label={`Delete room photo ${index+1}`}
                        className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Upload Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    Add Photo
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Photos save as you add them. Use Save room for measurement changes.
              </p>
            </div>
          )}

          {/* Show message for new rooms */}
          {!room?.id && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground text-center">
                Save the room first to add photos
              </p>
            </div>
          )}

          <div className="sticky bottom-0 z-10 -mx-4 grid grid-cols-2 gap-3 border-t bg-background px-4 py-3 [&>button]:h-12 [&>button]:min-w-0 [&>button]:rounded-xl [&>button]:px-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => requestClose(false)}
            >
              {room?.id?'Close':'Cancel'}
            </Button>
            <Button 
              className="flex-1"
              onClick={handleSubmit}
            >
              {saving?'Saving...':'Save room'}
            </Button>
          </div>
        </fieldset>
        <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Discard unsaved measurements?</AlertDialogTitle><AlertDialogDescription>Your changes in this room haven't been saved. Photos already uploaded will stay with the site visit.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={()=>{setDirty(false);onOpenChange(false);}}>Discard changes</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
