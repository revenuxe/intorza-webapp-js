import { useState, useMemo } from "react";
import { ImagePlus, Search, X, Check, Heart, Tag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useGallery, GalleryImage } from "@/hooks/useGallery";
import { cn } from "@/lib/utils";

interface GalleryImagePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (images: GalleryImage[]) => void;
  productName?: string;
  multiple?: boolean;
  selectedImageIds?: string[];
}

export const GalleryImagePicker = ({
  open, onOpenChange, onSelect, productName, multiple = true, selectedImageIds = []
}: GalleryImagePickerProps) => {
  const { images, loading, getAllTags, incrementUsage } = useGallery();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedImageIds));
  const [filterTag, setFilterTag] = useState<string | null>(null);

  // Auto-suggest images matching product name
  const suggestedImages = useMemo(() => {
    if (!productName) return [];
    const pn = productName.toLowerCase();
    return images.filter(img =>
      img.tags.some(t => t.toLowerCase().includes(pn)) ||
      img.title?.toLowerCase().includes(pn) ||
      img.filename.toLowerCase().includes(pn)
    );
  }, [images, productName]);

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
    if (filterTag) result = result.filter(img => img.tags.includes(filterTag));
    return result;
  }, [images, search, filterTag]);

  const allTags = getAllTags();

  const toggleImage = (img: GalleryImage) => {
    if (multiple) {
      const next = new Set(selected);
      next.has(img.id) ? next.delete(img.id) : next.add(img.id);
      setSelected(next);
    } else {
      setSelected(new Set([img.id]));
    }
  };

  const handleConfirm = () => {
    const selectedImages = images.filter(img => selected.has(img.id));
    selectedImages.forEach(img => incrementUsage(img.id));
    onSelect(selectedImages);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col rounded-2xl p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5" />
            Select from Gallery
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pt-2 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search images..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl" />
          </div>
          {allTags.length > 0 && (
            <div className="flex gap-1 flex-wrap max-h-16 overflow-y-auto">
              {filterTag && (
                <Badge variant="default" className="cursor-pointer rounded-full" onClick={() => setFilterTag(null)}>
                  {filterTag} <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {allTags.slice(0, 10).map(([tag]) => (
                <Badge key={tag} variant={filterTag === tag ? "default" : "outline"} className="cursor-pointer rounded-full text-xs"
                  onClick={() => setFilterTag(filterTag === tag ? null : tag)}>
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Auto-suggested section */}
        {productName && suggestedImages.length > 0 && (
          <div className="px-4 pt-2">
            <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
              <Tag className="h-3 w-3" /> Auto-matched for "{productName}"
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {suggestedImages.slice(0, 6).map(img => (
                <button key={img.id} onClick={() => toggleImage(img)}
                  className={cn("relative shrink-0 rounded-xl overflow-hidden border-2 transition-all",
                    selected.has(img.id) ? "border-primary ring-2 ring-primary/20" : "border-transparent")}>
                  <img src={img.image_url} alt="" className="h-16 w-16 object-cover" />
                  {selected.has(img.id) && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <Check className="h-5 w-5 text-primary-foreground bg-primary rounded-full p-0.5" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* All images */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin h-6 w-6 rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredImages.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">No images found</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
              {filteredImages.map(img => (
                <button key={img.id} onClick={() => toggleImage(img)}
                  className={cn("relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                    selected.has(img.id) ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-muted-foreground/30")}>
                  <img src={img.image_url} alt={img.title || img.filename} className="w-full h-full object-cover" loading="lazy" />
                  {selected.has(img.id) && (
                    <div className="absolute top-1 right-1">
                      <Check className="h-5 w-5 text-primary-foreground bg-primary rounded-full p-0.5" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/50 to-transparent">
                    <p className="text-white text-[10px] truncate">{img.title || img.filename}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 pt-2 border-t flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleConfirm} disabled={selected.size === 0} className="rounded-xl">
              Add {selected.size > 0 ? `(${selected.size})` : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
