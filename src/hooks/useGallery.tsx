import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface GalleryImage {
  id: string;
  user_id: string;
  image_url: string;
  filename: string;
  title: string | null;
  description: string | null;
  tags: string[];
  category: string;
  file_size: number | null;
  width: number | null;
  height: number | null;
  is_favorite: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

const FREE_IMAGE_LIMIT = 20;

export const useGallery = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadImages = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gallery_images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setImages((data as GalleryImage[]) || []);
    } catch (error) {
      console.error('Error loading gallery:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadImages(); }, [loadImages]);

  const uploadImage = useCallback(async (file: File, tags: string[] = [], category = 'General') => {
    if (!user) return null;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('gallery-images')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('gallery-images').getPublicUrl(fileName);
      const imageUrl = urlData.publicUrl;

      // Get image dimensions
      const dims = await getImageDimensions(file);

      const { data, error } = await supabase.from('gallery_images').insert({
        user_id: user.id,
        image_url: imageUrl,
        filename: file.name,
        tags,
        category,
        file_size: file.size,
        width: dims.width,
        height: dims.height,
      }).select().single();

      if (error) throw error;
      setImages(prev => [data as GalleryImage, ...prev]);
      return data as GalleryImage;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setUploading(false);
    }
  }, [user, toast]);

  const updateImage = useCallback(async (id: string, updates: Partial<Pick<GalleryImage, 'title' | 'description' | 'tags' | 'category' | 'is_favorite'>>) => {
    try {
      const { error } = await supabase.from('gallery_images').update(updates).eq('id', id);
      if (error) throw error;
      setImages(prev => prev.map(img => img.id === id ? { ...img, ...updates } : img));
    } catch (error: any) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    }
  }, [toast]);

  const deleteImage = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('gallery_images').delete().eq('id', id);
      if (error) throw error;
      setImages(prev => prev.filter(img => img.id !== id));
    } catch (error: any) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    }
  }, [toast]);

  const deleteMultiple = useCallback(async (ids: string[]) => {
    try {
      const { error } = await supabase.from('gallery_images').delete().in('id', ids);
      if (error) throw error;
      setImages(prev => prev.filter(img => !ids.includes(img.id)));
    } catch (error: any) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    }
  }, [toast]);

  const getImagesByTag = useCallback((tag: string) => {
    return images.filter(img => img.tags.some(t => t.toLowerCase() === tag.toLowerCase()));
  }, [images]);

  const getAllTags = useCallback(() => {
    const tagMap = new Map<string, number>();
    images.forEach(img => img.tags.forEach(tag => tagMap.set(tag, (tagMap.get(tag) || 0) + 1)));
    return Array.from(tagMap.entries()).sort((a, b) => b[1] - a[1]);
  }, [images]);

  const getAllCategories = useCallback(() => {
    const catSet = new Set(images.map(img => img.category));
    return Array.from(catSet).sort();
  }, [images]);

  const incrementUsage = useCallback(async (id: string) => {
    const img = images.find(i => i.id === id);
    if (!img) return;
    await supabase.from('gallery_images').update({ usage_count: img.usage_count + 1 }).eq('id', id);
    setImages(prev => prev.map(i => i.id === id ? { ...i, usage_count: i.usage_count + 1 } : i));
  }, [images]);

  return {
    images, loading, uploading, imageLimit: FREE_IMAGE_LIMIT,
    loadImages, uploadImage, updateImage, deleteImage, deleteMultiple,
    getImagesByTag, getAllTags, getAllCategories, incrementUsage,
  };
};

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { resolve({ width: img.width, height: img.height }); URL.revokeObjectURL(img.src); };
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = URL.createObjectURL(file);
  });
}
