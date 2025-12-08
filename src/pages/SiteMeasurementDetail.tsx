import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  MapPin, 
  Plus, 
  Pencil, 
  Trash2, 
  Save,
  FileText,
  Ruler
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RoomFormSheet } from "@/components/site-measurement/RoomFormSheet";

interface Room {
  id: string;
  room_type: string;
  room_name: string | null;
  width_ft: number;
  length_ft: number;
  height_ft: number | null;
  area_sqft: number;
  notes: string | null;
  sort_order: number;
}

interface Project {
  id: string;
  client_name: string;
  site_location: string | null;
  status: string;
  assigned_to: string | null;
  team_member?: {
    id: string;
    name: string;
  } | null;
}

export default function SiteMeasurementDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roomSheetOpen, setRoomSheetOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!id) return;
    
    const { data, error } = await supabase
      .from('site_measurement_projects')
      .select(`
        *,
        team_member:team_members(id, name)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      toast.error("Project not found");
      navigate('/site-measurement');
      return;
    }

    setProject({
      ...data,
      team_member: data.team_member as Project['team_member']
    });
  }, [id, navigate]);

  const fetchRooms = useCallback(async () => {
    if (!id) return;
    
    const { data } = await supabase
      .from('site_measurement_rooms')
      .select('*')
      .eq('project_id', id)
      .order('sort_order');

    if (data) {
      setRooms(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchProject();
    fetchRooms();
  }, [fetchProject, fetchRooms]);

  const handleSaveRoom = async (roomData: Partial<Room>) => {
    if (!id) return;

    if (editingRoom) {
      const { error } = await supabase
        .from('site_measurement_rooms')
        .update(roomData)
        .eq('id', editingRoom.id);

      if (error) {
        toast.error("Failed to update room");
        return;
      }
      toast.success("Room updated");
    } else {
      const { error } = await supabase
        .from('site_measurement_rooms')
        .insert({
          room_type: roomData.room_type || 'Custom',
          room_name: roomData.room_name,
          width_ft: roomData.width_ft || 0,
          length_ft: roomData.length_ft || 0,
          height_ft: roomData.height_ft,
          notes: roomData.notes,
          project_id: id,
          sort_order: rooms.length
        });

      if (error) {
        toast.error("Failed to add room");
        return;
      }
      toast.success("Room added");
    }

    setRoomSheetOpen(false);
    setEditingRoom(null);
    fetchRooms();
    updateProjectStats();
  };

  const handleDeleteRoom = async () => {
    if (!deleteRoomId) return;

    const { error } = await supabase
      .from('site_measurement_rooms')
      .delete()
      .eq('id', deleteRoomId);

    if (error) {
      toast.error("Failed to delete room");
      return;
    }

    toast.success("Room deleted");
    setDeleteRoomId(null);
    fetchRooms();
    updateProjectStats();
  };

  const updateProjectStats = async () => {
    if (!id) return;

    const { data: roomsData } = await supabase
      .from('site_measurement_rooms')
      .select('area_sqft')
      .eq('project_id', id);

    const totalArea = roomsData?.reduce((sum, r) => sum + (r.area_sqft || 0), 0) || 0;
    const roomCount = roomsData?.length || 0;

    await supabase
      .from('site_measurement_projects')
      .update({ 
        total_area: totalArea, 
        room_count: roomCount 
      })
      .eq('id', id);
  };

  const handleSaveMeasurements = async () => {
    setSaving(true);
    await updateProjectStats();
    setSaving(false);
    toast.success("Measurements saved. You can convert to a quotation later.");
  };

  const handleConvertToQuotation = () => {
    navigate(`/site-measurement/${id}/pricing`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'converted': return 'bg-green-100 text-green-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      default: return 'bg-amber-100 text-amber-700';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) return null;

  const totalArea = rooms.reduce((sum, r) => sum + (r.area_sqft || 0), 0);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 p-4 md:p-6 pb-32 md:pb-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/site-measurement')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold">{project.client_name}</h1>
              <Badge className={getStatusColor(project.status)}>
                {project.status}
              </Badge>
            </div>
            {project.site_location && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <MapPin className="h-3.5 w-3.5" />
                <span>{project.site_location}</span>
              </div>
            )}
            {project.team_member && (
              <div className="flex items-center gap-2 mt-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(project.team_member.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{project.team_member.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold tabular-nums">{rooms.length}</p>
              <p className="text-sm text-muted-foreground">Rooms</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold tabular-nums">{totalArea.toFixed(0)}</p>
              <p className="text-sm text-muted-foreground">Total sq.ft</p>
            </CardContent>
          </Card>
        </div>

        {/* Rooms List */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Rooms</h2>
          <Button 
            size="sm" 
            onClick={() => {
              setEditingRoom(null);
              setRoomSheetOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Room
          </Button>
        </div>

        {rooms.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Ruler className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No rooms added</h3>
              <p className="text-muted-foreground text-center mb-4">
                Start adding rooms to capture measurements
              </p>
              <Button 
                onClick={() => {
                  setEditingRoom(null);
                  setRoomSheetOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add First Room
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <Card key={room.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">
                        {room.room_name || room.room_type}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {room.width_ft} × {room.length_ft} ft = {room.area_sqft?.toFixed(1)} sq.ft
                      </p>
                      {room.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{room.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingRoom(room);
                          setRoomSheetOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteRoomId(room.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t md:relative md:border-t-0 md:p-6 md:pt-0">
        <div className="flex gap-3 max-w-lg mx-auto md:max-w-none">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={handleSaveMeasurements}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Measurements"}
          </Button>
          <Button 
            className="flex-1"
            onClick={handleConvertToQuotation}
            disabled={rooms.length === 0}
          >
            <FileText className="h-4 w-4 mr-2" />
            Convert to Quotation
          </Button>
        </div>
      </div>

      {/* Room Form Sheet */}
      <RoomFormSheet
        open={roomSheetOpen}
        onOpenChange={setRoomSheetOpen}
        room={editingRoom}
        onSave={handleSaveRoom}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteRoomId} onOpenChange={() => setDeleteRoomId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Room?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The room and all its data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRoom}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
