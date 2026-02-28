import { useState, useRef, useMemo } from "react";
import { Upload, Trash2, Search, Heart, Tag, Grid3X3, List, Filter, X, Check, ImagePlus, Star, Edit2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useGallery, GalleryImage } from "@/hooks/useGallery";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CATEGORIES = ['General', 'Kitchen', 'Wardrobe', 'Living Room', 'Bedroom', 'Bathroom', 'Office', 'Other'];

const Gallery = () => {
  const { images, loading, uploading, imageLimit, uploadImage, updateImage, deleteImage, deleteMultiple, getAllTags, getAllCategories } = useGallery();
  const { isPro } = useSubscription();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editImage, setEditImage] = useState<GalleryImage | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editCategory, setEditCategory] = useState("General");
  const [uploadTags, setUploadTags] = useState("");
  const [uploadCategory, setUploadCategory] = useState("General");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const allTags = getAllTags();
  const allCategories = getAllCategories();

  const canUpload = isPro || images.length < imageLimit;

  const filteredImages = useMemo(() => {
    let result = images;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(img =>
        img.filename.toLowerCase().includes(s) ||
        img.title?.toLowerCase().includes(s) ||
        img.tags.some(t => t.toLowerCase().includes(s))
      );
    }
    if (selectedTag) result = result.filter(img => img.tags.includes(selectedTag));
    if (selectedCategory) result = result.filter(img => img.category === selectedCategory);
    if (showFavoritesOnly) result = result.filter(img => img.is_favorite);
    return result;
  }, [images, search, selectedTag, selectedCategory, showFavoritesOnly]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (!canUpload) {
      toast({ title: 'Limit reached', description: `Free users can upload up to ${imageLimit} images. Upgrade to Pro for unlimited.`, variant: 'destructive' });
      return;
    }
    setPendingFiles(files);
    setShowUploadDialog(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadConfirm = async () => {
    const tags = uploadTags.split(',').map(t => t.trim()).filter(Boolean);
    for (const file of pendingFiles) {
      await uploadImage(file, tags, uploadCategory);
    }
    toast({ title: 'Uploaded', description: `${pendingFiles.length} image(s) uploaded successfully` });
    setShowUploadDialog(false);
    setPendingFiles([]);
    setUploadTags("");
    setUploadCategory("General");
  };

  const handleEditOpen = (img: GalleryImage) => {
    setEditImage(img);
    setEditTitle(img.title || "");
    setEditDesc(img.description || "");
    setEditTags(img.tags.join(", "));
    setEditCategory(img.category);
  };

  const handleEditSave = async () => {
    if (!editImage) return;
    const tags = editTags.split(',').map(t => t.trim()).filter(Boolean);
    await updateImage(editImage.id, { title: editTitle || null, description: editDesc || null, tags, category: editCategory });
    setEditImage(null);
    toast({ title: 'Updated', description: 'Image details saved' });
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    await deleteMultiple(Array.from(selectedIds));
    setSelectedIds(new Set());
    toast({ title: 'Deleted', description: `${selectedIds.size} image(s) removed` });
  };

  const toggleFavorite = (img: GalleryImage) => {
    updateImage(img.id, { is_favorite: !img.is_favorite });
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Gallery</h1>
          <p className="text-sm text-muted-foreground">
            {images.length}{!isPro ? `/${imageLimit}` : ''} images • {allTags.length} tags
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading || !canUpload} className="rounded-xl">
            {uploading ? <span className="animate-spin mr-2">⏳</span> : <ImagePlus className="h-4 w-4 mr-2" />}
            Upload
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, tag..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={selectedCategory || "all"} onValueChange={v => setSelectedCategory(v === "all" ? null : v)}>
            <SelectTrigger className="w-[140px] rounded-xl">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant={showFavoritesOnly ? "default" : "outline"} size="icon" onClick={() => setShowFavoritesOnly(!showFavoritesOnly)} className="rounded-xl">
            <Heart className={cn("h-4 w-4", showFavoritesOnly && "fill-current")} />
          </Button>
          <Button variant={viewMode === 'grid' ? "default" : "outline"} size="icon" onClick={() => setViewMode('grid')} className="rounded-xl">
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === 'list' ? "default" : "outline"} size="icon" onClick={() => setViewMode('list')} className="rounded-xl">
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tag chips */}
      {allTags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {selectedTag && (
            <Badge variant="default" className="cursor-pointer rounded-full" onClick={() => setSelectedTag(null)}>
              {selectedTag} <X className="h-3 w-3 ml-1" />
            </Badge>
          )}
          {allTags.slice(0, 15).map(([tag, count]) => (
            <Badge
              key={tag}
              variant={selectedTag === tag ? "default" : "outline"}
              className="cursor-pointer rounded-full text-xs"
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            >
              {tag} ({count})
            </Badge>
          ))}
        </div>
      )}

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-xl">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="rounded-lg">
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())} className="rounded-lg">Clear</Button>
        </div>
      )}

      {/* Grid / List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <ImagePlus className="h-12 w-12 mb-3 opacity-40" />
          <p className="font-medium">No images found</p>
          <p className="text-sm">Upload images to build your gallery</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredImages.map(img => (
            <Card key={img.id} className={cn("group relative overflow-hidden rounded-2xl border-2 transition-all cursor-pointer", selectedIds.has(img.id) ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-muted-foreground/20")}>
              <div className="aspect-square relative" onClick={() => setLightboxImage(img)}>
                <img src={img.image_url} alt={img.title || img.filename} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                {/* Overlay actions */}
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Checkbox checked={selectedIds.has(img.id)} onCheckedChange={() => toggleSelect(img.id)} className="bg-background/80 rounded" onClick={e => e.stopPropagation()} />
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={e => { e.stopPropagation(); toggleFavorite(img); }} className="p-1.5 rounded-full bg-background/80 hover:bg-background transition-colors">
                    <Heart className={cn("h-3.5 w-3.5", img.is_favorite ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleEditOpen(img); }} className="p-1.5 rounded-full bg-background/80 hover:bg-background transition-colors">
                    <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
                {/* Bottom info */}
                <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs font-medium truncate">{img.title || img.filename}</p>
                  {img.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {img.tags.slice(0, 2).map(t => (
                        <span key={t} className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded-full">{t}</span>
                      ))}
                      {img.tags.length > 2 && <span className="text-[10px] text-white/70">+{img.tags.length - 2}</span>}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredImages.map(img => (
            <div key={img.id} className={cn("flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer", selectedIds.has(img.id) ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30")}>
              <Checkbox checked={selectedIds.has(img.id)} onCheckedChange={() => toggleSelect(img.id)} />
              <img src={img.image_url} alt={img.title || img.filename} className="h-14 w-14 rounded-lg object-cover" onClick={() => setLightboxImage(img)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{img.title || img.filename}</p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {img.tags.slice(0, 3).map(t => <Badge key={t} variant="outline" className="text-[10px] rounded-full">{t}</Badge>)}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => toggleFavorite(img)} className="p-1.5 rounded-full hover:bg-muted">
                  <Heart className={cn("h-4 w-4", img.is_favorite ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
                </button>
                <button onClick={() => handleEditOpen(img)} className="p-1.5 rounded-full hover:bg-muted">
                  <Edit2 className="h-4 w-4 text-muted-foreground" />
                </button>
                <button onClick={() => deleteImage(img.id)} className="p-1.5 rounded-full hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader><DialogTitle>Upload {pendingFiles.length} Image(s)</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {pendingFiles.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {pendingFiles.map((f, i) => (
                  <img key={i} src={URL.createObjectURL(f)} alt="" className="h-16 w-16 rounded-lg object-cover shrink-0" />
                ))}
              </div>
            )}
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input value={uploadTags} onChange={e => setUploadTags(e.target.value)} placeholder="e.g. kitchen, modular, walnut" className="rounded-xl mt-1" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleUploadConfirm} disabled={uploading} className="rounded-xl">
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editImage} onOpenChange={() => setEditImage(null)}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader><DialogTitle>Edit Image</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {editImage && <img src={editImage.image_url} alt="" className="w-full h-48 object-cover rounded-xl" />}
            <div>
              <Label>Title</Label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Image title" className="rounded-xl mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" className="rounded-xl mt-1" rows={2} />
            </div>
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input value={editTags} onChange={e => setEditTags(e.target.value)} placeholder="e.g. kitchen, modern" className="rounded-xl mt-1" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            {editImage && (
              <Button variant="destructive" className="rounded-xl mr-auto" onClick={() => { deleteImage(editImage.id); setEditImage(null); }}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => setEditImage(null)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleEditSave} className="rounded-xl">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-3xl p-2 rounded-2xl">
          {lightboxImage && (
            <div>
              <img src={lightboxImage.image_url} alt={lightboxImage.title || lightboxImage.filename} className="w-full max-h-[70vh] object-contain rounded-xl" />
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{lightboxImage.title || lightboxImage.filename}</h3>
                  <Badge variant="outline" className="rounded-full">{lightboxImage.category}</Badge>
                </div>
                {lightboxImage.description && <p className="text-sm text-muted-foreground">{lightboxImage.description}</p>}
                <div className="flex gap-1 flex-wrap">
                  {lightboxImage.tags.map(t => <Badge key={t} variant="secondary" className="rounded-full text-xs">{t}</Badge>)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {lightboxImage.width}×{lightboxImage.height} • {lightboxImage.file_size ? `${(lightboxImage.file_size / 1024).toFixed(0)} KB` : ''} • Used {lightboxImage.usage_count} times
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Gallery;
