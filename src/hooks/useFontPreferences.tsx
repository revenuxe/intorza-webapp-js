import { useState, useEffect, useCallback } from 'react';
import { profileApi } from '@/lib/api';
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
      const { data } = await profileApi.get();

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
      await profileApi.update({
        pdf_heading_font: newPreferences.headingFont,
        pdf_body_font: newPreferences.bodyFont,
      });

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
