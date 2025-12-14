import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLocalization } from '@/contexts/LocalizationContext';
import { CountrySelectionDialog } from './CountrySelectionDialog';

export const CountrySelectionWrapper: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { needsCountrySelection, isLoading: locLoading } = useLocalization();
  const location = useLocation();

  // Don't show on auth, team, or admin pages
  const excludedPaths = ['/auth', '/team/', '/admin/', '/payment-processing'];
  const isExcludedPath = excludedPaths.some(path => location.pathname.startsWith(path));

  if (authLoading || locLoading || isExcludedPath || !user) {
    return null;
  }

  return (
    <CountrySelectionDialog
      open={needsCountrySelection}
      isOnboarding={true}
    />
  );
};
