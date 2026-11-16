"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MeasurementJourney } from '@/components/site-measurement/MeasurementJourney';
import { roomIsMeasured, visitStage } from '@/lib/siteMeasurements';
import { useParams, useNavigate } from "@/lib/navigation";
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
  FileText,
  Ruler,Camera,CheckCircle2
} from "lucide-react";
import { useInlineFeedback } from '@/hooks/useInlineFeedback';
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
  room_photos?:{id:string}[];
}

interface Project {
  id: string;
  client_name: string;
  site_location: string | null;
  status: string;
  assigned_to: string | null;
  quotation_id?: string | null;
  team_member?: {
    id: string;
    name: string;
  } | null;
}

export default function SiteMeasurementDetail({ teamPortal = false }: { teamPortal?: boolean } = {}) {
  const {toast:notify,feedback}=useInlineFeedback({autoRevealErrors:true});
  const toast={error:(description:string)=>notify({title:'Action needs attention',description,variant:'destructive'}),success:(description:string)=>notify({title:'Saved',description})};
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
  const [focusPhotos,setFocusPhotos]=useState(false);
  const [roomsError,setRoomsError]=useState(false);
  const currentId=useRef(id);currentId.current=id;

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

    if(currentId.current!==id)return;
    if (error || !data) {
      toast.error("Project not found");
      navigate(teamPortal ? '/team/dashboard' : '/site-measurement');
      return;
    }

    setProject({
      ...data,
      team_member: data.team_member as Project['team_member']
    });
  }, [id, navigate, teamPortal]);

  const fetchRooms = useCallback(async () => {
    if (!id) return;
    
    const { data,error } = await supabase
      .from('site_measurement_rooms')
      .select('*, room_photos(id)')
      .eq('project_id', id)
      .order('sort_order');

    if(currentId.current!==id)return;
    setRoomsError(Boolean(error));
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

      const { error } = await supabase
        .from('site_measurement_rooms')
        .upsert({
          id:editingRoom?.id||roomData.id,
          room_type: roomData.room_type || 'Custom',
          room_name: roomData.room_name,
          width_ft: roomData.width_ft || 0,
          length_ft: roomData.length_ft || 0,
          height_ft: roomData.height_ft,
          notes: roomData.notes,
          project_id: id,
          sort_order: editingRoom?.sort_order??rooms.length
        },{onConflict:'id'});

      if (error) {
        throw error;
      }
      toast.success(editingRoom?'Room measurements saved.':'Room saved. Add another room or attach photos.');

    await fetchRooms();
    try{await updateProjectStats();await fetchProject();}catch{toast.error('The room is saved, but the visit summary could not refresh. Reopen this visit to retry.');}
    setRoomSheetOpen(false);
    setEditingRoom(null);
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
    await fetchRooms();
    try{await updateProjectStats();await fetchProject();}catch{toast.error('Room deleted. The visit summary could not refresh.');}
  };

  const updateProjectStats = async () => {
    if (!id) return;

    const { data: roomsData,error:roomError } = await supabase
      .from('site_measurement_rooms')
      .select('id, area_sqft')
      .eq('project_id', id);
    if(roomError)throw roomError;

    const totalArea = roomsData?.reduce((sum, r) => sum + (r.area_sqft || 0), 0) || 0;
    const roomCount = roomsData?.length || 0;

    // Count photos across all rooms
    let photoCount = 0;
    if (roomsData && roomsData.length > 0) {
      const roomIds = roomsData.map(r => r.id);
      const { count,error } = await supabase
        .from('room_photos')
        .select('id', { count: 'exact', head: true })
        .in('room_id', roomIds);
      if(error)throw error;
      photoCount = count || 0;
    }

    const {error}=await supabase
      .from('site_measurement_projects')
      .update({ 
        total_area: totalArea, 
        room_count: roomCount,
        photo_count: photoCount,
        status:project?.quotation_id?'converted':'draft'
      })
      .eq('id', id);
    if(error)throw error;
  };

  const handleSaveMeasurements = async () => {
    if(saving||!id)return;
    const incomplete=rooms.find(room=>!roomIsMeasured(room));
    if(!rooms.length){toast.error('Add at least one room before finishing the visit.');return;}
    if(incomplete){toast.error('Finish the width and length for each room first.');setEditingRoom(incomplete);setFocusPhotos(false);setRoomSheetOpen(true);return;}
    setSaving(true);
    try{
      const {error}=await supabase.rpc('complete_site_measurement',{p_project_id:id});
      if(error)throw error;
      await fetchProject();
      toast.success(teamPortal?'Site visit complete. Your company can review the measurements.':'Site visit complete. Create a quotation now or come back later.');
    }catch{toast.error('Could not finish this visit. Your saved rooms are kept; please retry.');}
    finally{setSaving(false);}
  };

  const handleConvertToQuotation = () => {
    if(project?.quotation_id){navigate(`/?id=${project.quotation_id}`);return;}
    const incomplete=rooms.find(room=>!roomIsMeasured(room));
    if(incomplete){toast.error('Measure every room before preparing a quotation.');setEditingRoom(incomplete);setFocusPhotos(false);setRoomSheetOpen(true);return;}
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
  if(roomsError)return <div className="space-y-3 p-4"><p role="alert">Rooms couldn't be loaded. Your saved measurements are kept.</p><Button variant="outline" className="h-11" onClick={()=>{setLoading(true);void fetchRooms();}}>Retry loading rooms</Button></div>;

  const totalArea = rooms.reduce((sum, r) => sum + (r.area_sqft || 0), 0);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col">
      <div className="min-w-0 flex-1 p-4 pb-32 md:p-6">
        {feedback}
        <div className="mb-5"><MeasurementJourney step={2} team={teamPortal}/></div>
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            className="h-11 w-11 shrink-0"
            aria-label="Back to site measurements"
            onClick={() => navigate(teamPortal?'/team/dashboard':'/site-measurement')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="min-w-0 break-words text-xl font-bold md:text-2xl">{project.client_name}</h1>
              <Badge className={getStatusColor(project.status)}>
                {visitStage(project.status)}
              </Badge>
            </div>
            {project.site_location && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 break-words">{project.site_location}</span>
              </div>
            )}
            {project.team_member && (
              <div className="flex items-center gap-2 mt-2">
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(project.team_member.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 break-words text-sm">{project.team_member.name}</span>
              </div>
            )}
          </div>
        </div>
        <div className="mb-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <h2 className="text-sm font-semibold">{!rooms.length?'Next: measure your first room':rooms.some(room=>!roomIsMeasured(room))?'Some rooms still need measurements':'Your room measurements are saved'}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{teamPortal?"Save each room as you walk through the site. Add photos or notes where helpful, then finish the visit so your company can review it.":"Save each room as you walk through the site. Add photos or notes where helpful. Finish the visit when you've checked the rooms; a quotation is optional."}</p>
          {project.quotation_id&&<p className="mt-2 text-xs leading-5 text-muted-foreground">A quotation already exists. Changes to this visit do not change that saved quotation.</p>}
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
              <p className="text-sm text-muted-foreground">Floor area (sq.ft)</p>
            </CardContent>
          </Card>
        </div>

        {/* Rooms List */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Rooms</h2>
          <Button 
            size="sm" 
            className="h-11 rounded-xl"
            onClick={() => {
              setEditingRoom(null);
              setFocusPhotos(false);
              setRoomSheetOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add room
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
                  setFocusPhotos(false);
                  setRoomSheetOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Measure first room
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <Card key={room.id} className="min-w-0">
                <CardContent className="p-4">
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1 break-words">
                      <h3 className="break-words font-medium">
                        {room.room_name || room.room_type}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {room.width_ft} × {room.length_ft} ft = {room.area_sqft?.toFixed(1)} sq.ft
                      </p>
                      {!roomIsMeasured(room)&&<p className="mt-1 text-xs font-medium text-amber-700">Needs width and length</p>}
                      <p className="mt-1 text-xs text-muted-foreground">{room.room_photos?.length||0} photos{room.notes?' · Site notes added':''}</p>
                      {room.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{room.notes}</p>
                      )}
                    </div>
                    <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem] gap-2 border-t pt-2 sm:flex sm:border-0 sm:pt-0">
                      <Button
                        variant="ghost"
                        className="h-11 min-w-0 gap-1.5 px-2 text-xs"
                        aria-label={`Edit ${room.room_name || room.room_type}`}
                        onClick={() => {
                          setEditingRoom(room);
                          setFocusPhotos(false);
                          setRoomSheetOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                        Measure
                      </Button>
                      <Button variant="outline" className="h-11 min-w-0 gap-1.5 px-2 text-xs" aria-label={`Photos for ${room.room_name||room.room_type}`} onClick={()=>{setEditingRoom(room);setFocusPhotos(true);setRoomSheetOpen(true);}}><Camera className="h-4 w-4"/>Photos</Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11"
                        aria-label={`Delete ${room.room_name || room.room_type}`}
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
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:relative md:border-t-0 md:p-6 md:pt-0">
        <div className={`mx-auto grid min-w-0 max-w-lg gap-2 md:max-w-none ${teamPortal ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <Button 
            variant="outline" 
            className="h-12 min-w-0 gap-2 rounded-xl px-2 text-xs sm:text-sm"
            onClick={handleSaveMeasurements}
            disabled={saving||project.status==='completed'||project.status==='converted'}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {saving ? "Finishing..." : project.status==='converted'?'Site saved':project.status==='completed'?'Visit complete':'Finish visit'}
          </Button>
          {!teamPortal && <Button
            className="h-12 min-w-0 gap-2 rounded-xl px-2 text-xs sm:text-sm"
            onClick={handleConvertToQuotation}
            disabled={rooms.length === 0}
          >
            <FileText className="h-4 w-4 shrink-0" />
            {project.quotation_id?'Open quotation':'Create quotation'}
          </Button>}
        </div>
      </div>

      {/* Room Form Sheet */}
      <RoomFormSheet
        open={roomSheetOpen}
        onOpenChange={setRoomSheetOpen}
        room={editingRoom}
        onSave={handleSaveRoom}
        focusPhotos={focusPhotos}
        onPhotosChanged={()=>void fetchRooms()}
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
