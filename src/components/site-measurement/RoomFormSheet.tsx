import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

interface RoomFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: Room | null;
  onSave: (data: Partial<Room>) => void;
}

export function RoomFormSheet({ open, onOpenChange, room, onSave }: RoomFormSheetProps) {
  const [roomType, setRoomType] = useState("Kitchen");
  const [customName, setCustomName] = useState("");
  const [widthFt, setWidthFt] = useState("");
  const [lengthFt, setLengthFt] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (room) {
      setRoomType(ROOM_TYPES.includes(room.room_type) ? room.room_type : "Custom");
      setCustomName(room.room_name || (ROOM_TYPES.includes(room.room_type) ? "" : room.room_type));
      setWidthFt(room.width_ft?.toString() || "");
      setLengthFt(room.length_ft?.toString() || "");
      setHeightFt(room.height_ft?.toString() || "");
      setNotes(room.notes || "");
    } else {
      resetForm();
    }
  }, [room, open]);

  const resetForm = () => {
    setRoomType("Kitchen");
    setCustomName("");
    setWidthFt("");
    setLengthFt("");
    setHeightFt("");
    setNotes("");
  };

  const calculateArea = () => {
    const w = parseFloat(widthFt) || 0;
    const l = parseFloat(lengthFt) || 0;
    return w * l;
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
