import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  loadTranslationsFromDB,
  refreshTranslationsCache,
  areTranslationsCached
} from '../lib/dynamicI18n';

interface UseDynamicTranslationReturn {
  t: (key: string, options?: any) => string;
  i18n: any;
  ready: boolean;
  refreshTranslations: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook for dynamic translations from database
 * Falls back to react-i18next if database is unavailable
 */
export const useDynamicTranslation = (): UseDynamicTranslationReturn => {
  const { t: originalT, i18n } = useTranslation();
  const [ready, setReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Enhanced translation function that tries database first (unused for now)
  // const tAsync = useCallback(async (key: string, options?: any): Promise<string> => {
  //   try {
  //     const currentLang = i18n.language || 'ar';
  //
  //     // Try to get translation from database
  //     const dbTranslation = await getTranslation(key, currentLang);
  //
  //     // If we got a valid translation (not just the key back), use it
  //     if (dbTranslation !== key) {
  //       return dbTranslation;
  //     }
  //
  //     // Fallback to react-i18next
  //     const result = originalT(key, options);
  //     return typeof result === 'string' ? result : key;
  //   } catch (error) {
  //     console.warn('Error getting dynamic translation, falling back:', error);
  //     const result = originalT(key, options);
  //     return typeof result === 'string' ? result : key;
  //   }
  // }, [originalT, i18n.language]);

  // Synchronous version for immediate use (uses cached data)
  const tSync = useCallback((key: string, options?: any): string => {
    try {
      // Use react-i18next for immediate response
      const result = originalT(key, options);
      return typeof result === 'string' ? result : key;
    } catch (error) {
      console.warn('Error getting translation:', error);
      return key;
    }
  }, [originalT]);

  // Function to refresh translations
  const refreshTranslations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const currentLang = i18n.language || 'ar';
      await refreshTranslationsCache(currentLang);
      
      // Reload translations into i18next
      const translations = await loadTranslationsFromDB(currentLang);
      i18n.addResourceBundle(currentLang, 'translation', translations, true, true);
      
      setReady(true);
    } catch (error) {
      console.error('Error refreshing translations:', error);
      setError('فشل في تحديث الترجمات');
    } finally {
      setIsLoading(false);
    }
  }, [i18n]);

  // Initialize translations on mount and language change
  useEffect(() => {
    const initializeTranslations = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const currentLang = i18n.language || 'ar';
        
        // Check if translations are already cached
        if (areTranslationsCached(currentLang)) {
          setReady(true);
          setIsLoading(false);
          return;
        }
        
        // Load translations from database
        const translations = await loadTranslationsFromDB(currentLang);
        
        // Add to i18next resources
        i18n.addResourceBundle(currentLang, 'translation', translations, true, true);
        
        setReady(true);
      } catch (error) {
        console.error('Error initializing translations:', error);
        setError('فشل في تحميل الترجمات');
        // Still set ready to true so the app can use fallback translations
        setReady(true);
      } finally {
        setIsLoading(false);
      }
    };

    initializeTranslations();
  }, [i18n, i18n.language]);

  return {
    t: tSync, // Return synchronous version for immediate use
    i18n,
    ready,
    refreshTranslations,
    isLoading,
    error
  };
};

/**
 * Hook for admin components that need to refresh translations
 */
export const useTranslationAdmin = () => {
  const { refreshTranslations, isLoading, error } = useDynamicTranslation();
  
  const updateTranslation = useCallback(async (_key: string, _value: string, _language: string) => {
    // This would be handled by the TextManagement component
    // Just refresh the cache after updates
    await refreshTranslations();
  }, [refreshTranslations]);

  return {
    refreshTranslations,
    updateTranslation,
    isLoading,
    error
  };
};

export default useDynamicTranslation;
