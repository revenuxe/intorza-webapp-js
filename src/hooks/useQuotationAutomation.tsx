import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface QuotationPreferences {
  default_warranty: string;
  default_project_type: string | null;
  default_place_of_project: string | null;
  default_gst_enabled: boolean;
  default_gst_rate: string;
  default_discount_percentage: number;
  default_social_media_discount_enabled: boolean;
  default_social_media_discount_rate: number;
  default_quotation_valid_days: number;
  // Last used values
  last_warranty: string | null;
  last_project_type: string | null;
  last_place_of_project: string | null;
  last_gst_enabled: boolean | null;
  last_gst_rate: string | null;
  last_discount_percentage: number | null;
  last_social_media_discount_enabled: boolean | null;
  last_social_media_discount_rate: number | null;
}

interface ItemUsagePattern {
  product_name: string;
  product_details: string | null;
  default_rate: number | null;
  preferred_rate: number | null;
  usage_count: number;
  last_used_at: string;
}

interface Client {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
}

const DEFAULT_PREFERENCES: QuotationPreferences = {
  default_warranty: '10',
  default_project_type: null,
  default_place_of_project: null,
  default_gst_enabled: false,
  default_gst_rate: '18',
  default_discount_percentage: 0,
  default_social_media_discount_enabled: false,
  default_social_media_discount_rate: 6,
  default_quotation_valid_days: 7,
  last_warranty: null,
  last_project_type: null,
  last_place_of_project: null,
  last_gst_enabled: null,
  last_gst_rate: null,
  last_discount_percentage: null,
  last_social_media_discount_enabled: null,
  last_social_media_discount_rate: null,
};

export const useQuotationAutomation = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<QuotationPreferences>(DEFAULT_PREFERENCES);
  const [itemPatterns, setItemPatterns] = useState<ItemUsagePattern[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Load preferences and item patterns
  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Load preferences, item patterns, and clients in parallel
      const [prefsResult, patternsResult, clientsResult] = await Promise.all([
        supabase
          .from('quotation_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('item_usage_patterns')
          .select('*')
          .eq('user_id', user.id)
          .order('usage_count', { ascending: false })
          .order('last_used_at', { ascending: false })
          .limit(100),
        supabase
          .from('clients')
          .select('*')
          .eq('user_id', user.id)
          .order('name')
      ]);

      if (prefsResult.data) {
        setPreferences({
          ...DEFAULT_PREFERENCES,
          ...prefsResult.data,
        });
      }

      if (patternsResult.data) {
        setItemPatterns(patternsResult.data);
      }

      if (clientsResult.data) {
        setClients(clientsResult.data);
      }
    } catch (error) {
      console.error('Error loading automation data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get smart defaults for a new quotation
  const getSmartDefaults = useCallback(() => {
    const today = new Date();
    const validTillDate = new Date(today);
    validTillDate.setDate(validTillDate.getDate() + (preferences.default_quotation_valid_days || 7));

    // Prefer last used values over defaults
    return {
      dateOfProposal: today.toISOString().split('T')[0],
      quotationValidTill: validTillDate.toISOString().split('T')[0],
      warranty: preferences.last_warranty || preferences.default_warranty || '10',
      projectType: preferences.last_project_type || preferences.default_project_type || '',
      placeOfProject: preferences.last_place_of_project || preferences.default_place_of_project || '',
      gstEnabled: preferences.last_gst_enabled ?? preferences.default_gst_enabled ?? false,
      gstRate: preferences.last_gst_rate || preferences.default_gst_rate || '18',
      discountPercentage: preferences.last_discount_percentage ?? preferences.default_discount_percentage ?? 0,
      enableSocialMediaDiscount: preferences.last_social_media_discount_enabled ?? preferences.default_social_media_discount_enabled ?? false,
      socialMediaDiscountRate: preferences.last_social_media_discount_rate ?? preferences.default_social_media_discount_rate ?? 6,
    };
  }, [preferences]);

  // Get client address when client is selected
  const getClientAddress = useCallback((clientName: string): string | null => {
    const client = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
    return client?.address || null;
  }, [clients]);

  // Get prioritized product suggestions
  const getProductSuggestions = useCallback((searchTerm: string = ''): ItemUsagePattern[] => {
    if (!searchTerm) {
      // Return top used items
      return itemPatterns.slice(0, 20);
    }
    
    const term = searchTerm.toLowerCase();
    return itemPatterns
      .filter(p => p.product_name.toLowerCase().includes(term))
      .slice(0, 20);
  }, [itemPatterns]);

  // Get item details and rate for a product
  const getItemDefaults = useCallback((productName: string): { details: string; rate: number } | null => {
    const pattern = itemPatterns.find(
      p => p.product_name.toLowerCase() === productName.toLowerCase()
    );
    
    if (pattern) {
      return {
        details: pattern.product_details || '',
        rate: pattern.preferred_rate || pattern.default_rate || 0,
      };
    }
    return null;
  }, [itemPatterns]);

  // Save last used preferences after quotation save
  const saveLastUsedPreferences = useCallback(async (values: {
    warranty?: string;
    projectType?: string;
    placeOfProject?: string;
    gstEnabled?: boolean;
    gstRate?: string;
    discountPercentage?: number;
    enableSocialMediaDiscount?: boolean;
    socialMediaDiscountRate?: number;
  }) => {
    if (!user) return;

    try {
      const updateData: any = {
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };

      if (values.warranty !== undefined) updateData.last_warranty = values.warranty;
      if (values.projectType !== undefined) updateData.last_project_type = values.projectType;
      if (values.placeOfProject !== undefined) updateData.last_place_of_project = values.placeOfProject;
      if (values.gstEnabled !== undefined) updateData.last_gst_enabled = values.gstEnabled;
      if (values.gstRate !== undefined) updateData.last_gst_rate = values.gstRate;
      if (values.discountPercentage !== undefined) updateData.last_discount_percentage = values.discountPercentage;
      if (values.enableSocialMediaDiscount !== undefined) updateData.last_social_media_discount_enabled = values.enableSocialMediaDiscount;
      if (values.socialMediaDiscountRate !== undefined) updateData.last_social_media_discount_rate = values.socialMediaDiscountRate;

      // Upsert preferences
      await supabase
        .from('quotation_preferences')
        .upsert(updateData, { onConflict: 'user_id' });
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  }, [user]);

  // Track item usage when quotation is saved
  const trackItemUsage = useCallback(async (items: Array<{
    productName: string;
    productDetails: string;
    ratePerSft: number;
  }>) => {
    if (!user || items.length === 0) return;

    try {
      for (const item of items) {
        if (!item.productName.trim()) continue;

        // Check if pattern exists
        const { data: existing } = await supabase
          .from('item_usage_patterns')
          .select('id, usage_count')
          .eq('user_id', user.id)
          .eq('product_name', item.productName)
          .single();

        if (existing) {
          // Update existing pattern
          await supabase
            .from('item_usage_patterns')
            .update({
              usage_count: existing.usage_count + 1,
              last_used_at: new Date().toISOString(),
              preferred_rate: item.ratePerSft > 0 ? item.ratePerSft : undefined,
              product_details: item.productDetails || undefined,
            })
            .eq('id', existing.id);
        } else {
          // Insert new pattern
          await supabase
            .from('item_usage_patterns')
            .insert({
              user_id: user.id,
              product_name: item.productName,
              product_details: item.productDetails || null,
              default_rate: item.ratePerSft > 0 ? item.ratePerSft : null,
              preferred_rate: item.ratePerSft > 0 ? item.ratePerSft : null,
              usage_count: 1,
              last_used_at: new Date().toISOString(),
            });
        }
      }

      // Reload patterns
      loadData();
    } catch (error) {
      console.error('Error tracking item usage:', error);
    }
  }, [user]);

  return {
    loading,
    preferences,
    clients,
    itemPatterns,
    getSmartDefaults,
    getClientAddress,
    getProductSuggestions,
    getItemDefaults,
    saveLastUsedPreferences,
    trackItemUsage,
    refreshData: loadData,
  };
};
