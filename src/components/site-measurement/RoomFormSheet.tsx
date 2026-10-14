import { useEffect, useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { uploadAndSave, resolveRoomPhotoUrl, removeStoredUpload } from '@/lib/storageUpload';
import { storageObjectPath } from '@/lib/storage-path';

const ROOM_TYPES = [
  "Kitchen",
  "Bedroom",
  "Living Room",
  "Bathroom",
  "Wardrobe",
  "TV Unit",
  "Dining Room",
  "Study Room",
  "Balcony",
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
  onSave: (data: Partial<Room>) => void;
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

export function RoomFormSheet({ open, onOpenChange, room, onSave }: RoomFormSheetProps) {
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
    if (room) {
      setRoomType(ROOM_TYPES.includes(room.room_type) ? room.room_type : "Custom");
      setCustomName(room.room_name || (ROOM_TYPES.includes(room.room_type) ? "" : room.room_type));
      setWidthFt(room.width_ft?.toString() || "");
      setLengthFt(room.length_ft?.toString() || "");
      setHeightFt(room.height_ft?.toString() || "");
      setNotes(room.notes || "");
      // Fetch existing photos if editing
      if (room.id) {
        fetchPhotos(room.id);
      }
    } else {
      resetForm();
    }
  }, [room, open]);

  const fetchPhotos = async (roomId: string) => {
    const { data, error } = await supabase
      .from('room_photos')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at');
    
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
      setPhotos(photosWithSignedUrls);
    }
  };

  const resetForm = () => {
    setRoomType("Kitchen");
    setCustomName("");
    setWidthFt("");
    setLengthFt("");
    setHeightFt("");
    setNotes("");
    setPhotos([]);
  };

  const calculateArea = () => {
    const w = parseFloat(widthFt) || 0;
    const l = parseFloat(lengthFt) || 0;
    return w * l;
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
      
      if (savedCount) toast.success(`${savedCount} photo(s) uploaded successfully`);
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
      toast.success('Photo deleted');
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Failed to delete photo');
    }
  };

  const handleSubmit = () => {
    const finalRoomType = roomType === "Custom" ? (customName || "Custom Room") : roomType;
    const finalRoomName = roomType === "Custom" ? customName : null;

    onSave({
      room_type: finalRoomType,
      room_name: finalRoomName,
      width_ft: parseFloat(widthFt) || 0,
      length_ft: parseFloat(lengthFt) || 0,
      height_ft: heightFt ? parseFloat(heightFt) : null,
      notes: notes || null
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-xl">
        <SheetHeader className="pb-4">
          <SheetTitle>{room ? "Edit Room" : "Add Room"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Room Type</Label>
            <Select value={roomType} onValueChange={setRoomType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROOM_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {roomType === "Custom" && (
            <div className="space-y-2">
              <Label>Room Name</Label>
              <Input
                placeholder="Enter room name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Width (ft)</Label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={widthFt}
                onChange={(e) => setWidthFt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Length (ft)</Label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={lengthFt}
                onChange={(e) => setLengthFt(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Height (ft) - Optional</Label>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={heightFt}
              onChange={(e) => setHeightFt(e.target.value)}
            />
          </div>

          {/* Auto Area */}
          <div className="p-4 bg-muted rounded-lg">
            <Label className="text-muted-foreground text-sm">Calculated Area</Label>
            <p className="text-2xl font-bold tabular-nums">{calculateArea().toFixed(1)} sq.ft</p>
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              placeholder="Add any notes about this room..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Photo Upload Section - Only show for existing rooms */}
          {room?.id && (
            <div className="space-y-3">
              <Label>Photos</Label>
              
              {/* Photo Grid */}
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden group">
                      <img 
                        src={photo.photo_url} 
                        alt="Room" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(photo)}
                        className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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
                Photos are compressed to WebP for faster uploads
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

          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1"
              onClick={handleSubmit}
            >
              Save Room
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
