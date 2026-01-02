import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FontPreferences {
  headingFont: string;
  bodyFont: string;
}

const DEFAULT_PREFERENCES: FontPreferences = {
  headingFont: 'times',
  bodyFont: 'helvetica',
};

export const useFontPreferences = () => {
  const [preferences, setPreferences] = useState<FontPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load preferences from database
  const loadPreferences = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('pdf_heading_font, pdf_body_font')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading font preferences:', error);
        setLoading(false);
        return;
      }

      if (data) {
        setPreferences({
          headingFont: data.pdf_heading_font || DEFAULT_PREFERENCES.headingFont,
          bodyFont: data.pdf_body_font || DEFAULT_PREFERENCES.bodyFont,
        });
      }
    } catch (error) {
      console.error('Error loading font preferences:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save preferences to database
  const savePreferences = useCallback(async (newPreferences: FontPreferences) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to save preferences');
        return false;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          pdf_heading_font: newPreferences.headingFont,
          pdf_body_font: newPreferences.bodyFont,
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving font preferences:', error);
        toast.error('Failed to save font preferences');
        return false;
      }

      setPreferences(newPreferences);
      return true;
    } catch (error) {
      console.error('Error saving font preferences:', error);
      toast.error('Failed to save font preferences');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  // Update preferences (local state + save to DB)
  const updatePreferences = useCallback(async (updates: Partial<FontPreferences>) => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    await savePreferences(newPreferences);
  }, [preferences, savePreferences]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    loading,
    saving,
    updatePreferences,
    loadPreferences,
  };
};
