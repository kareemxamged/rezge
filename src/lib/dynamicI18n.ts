import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { textService } from './supabase';

// Cache for loaded translations
const translationCache: { [key: string]: any } = {};
let cacheTimestamp: { [key: string]: number } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Default fallback translations (in case database is unavailable)
const fallbackTranslations = {
  ar: {
    common: {
      welcome: 'مرحباً',
      login: 'تسجيل الدخول',
      register: 'إنشاء حساب',
      logout: 'تسجيل الخروج',
      search: 'البحث',
      save: 'حفظ',
      cancel: 'إلغاء',
      edit: 'تعديل',
      delete: 'حذف',
      loading: 'جاري التحميل...',
      error: 'حدث خطأ',
      success: 'تم بنجاح'
    },
    navigation: {
      home: 'الرئيسية',
      search: 'البحث',
      messages: 'الرسائل',
      profile: 'الملف الشخصي',
      features: 'الميزات',
      about: 'من نحن',
      contact: 'اتصل بنا'
    }
  },
  en: {
    common: {
      welcome: 'Welcome',
      login: 'Login',
      register: 'Register',
      logout: 'Logout',
      search: 'Search',
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      loading: 'Loading...',
      error: 'An error occurred',
      success: 'Success'
    },
    navigation: {
      home: 'Home',
      search: 'Search',
      messages: 'Messages',
      profile: 'Profile',
      features: 'Features',
      about: 'About',
      contact: 'Contact'
    }
  }
};

// Function to load translations from database
export const loadTranslationsFromDB = async (language: string): Promise<any> => {
  const cacheKey = `translations_${language}`;
  const now = Date.now();

  // Check if we have cached translations that are still valid
  if (
    translationCache[cacheKey] && 
    cacheTimestamp[cacheKey] && 
    (now - cacheTimestamp[cacheKey]) < CACHE_DURATION
  ) {
    return translationCache[cacheKey];
  }

  try {
    const result = await textService.getTextsForI18n(language);
    
    if (result.error || !result.data) {
      console.warn(`Failed to load translations for ${language}, using fallback`);
      return fallbackTranslations[language as keyof typeof fallbackTranslations] || fallbackTranslations.ar;
    }

    // Cache the translations
    translationCache[cacheKey] = result.data;
    cacheTimestamp[cacheKey] = now;

    return result.data;
  } catch (error) {
    console.error(`Error loading translations for ${language}:`, error);
    return fallbackTranslations[language as keyof typeof fallbackTranslations] || fallbackTranslations.ar;
  }
};

// Function to refresh translations cache
export const refreshTranslationsCache = async (language?: string) => {
  if (language) {
    const cacheKey = `translations_${language}`;
    delete translationCache[cacheKey];
    delete cacheTimestamp[cacheKey];
    await loadTranslationsFromDB(language);
  } else {
    // Refresh all cached languages
    Object.keys(translationCache).forEach(key => {
      delete translationCache[key];
    });
    Object.keys(cacheTimestamp).forEach(key => {
      delete cacheTimestamp[key];
    });
  }
};

// Custom resource backend for i18next
const DatabaseBackend = {
  type: 'backend' as const,
  
  init() {
    // Initialization logic if needed
  },

  read(language: string, _namespace: string, callback: (error: any, data?: any) => void) {
    loadTranslationsFromDB(language)
      .then(translations => {
        callback(null, translations);
      })
      .catch(error => {
        console.error('Error loading translations:', error);
        callback(error);
      });
  },

  save() {
    // We don't need to save translations back to the database from the frontend
    // This is handled through the admin interface
  }
};

// Initialize i18next with database backend
const initDynamicI18n = async () => {
  // Load initial translations for Arabic (default language)
  const initialTranslations = await loadTranslationsFromDB('ar');

  await i18n
    .use(DatabaseBackend)
    .use(initReactI18next)
    .init({
      lng: 'ar',
      fallbackLng: 'ar',
      
      // Use the loaded translations as initial resources
      resources: {
        ar: {
          translation: initialTranslations
        }
      },

      interpolation: {
        escapeValue: false
      },

      react: {
        useSuspense: false
      },

      // Backend options
      backend: {
        loadPath: '{{lng}}|{{ns}}'
      }
    });

  return i18n;
};

// Function to change language and update document direction
export const changeLanguage = async (language: string) => {
  try {
    // Load translations for the new language if not already loaded
    const translations = await loadTranslationsFromDB(language);
    
    // Add the translations to i18next resources
    i18n.addResourceBundle(language, 'translation', translations, true, true);
    
    // Change the language
    await i18n.changeLanguage(language);
    
    // Update document direction and lang attribute
    const isRTL = language === 'ar';
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    
    // Update body class for styling
    document.body.classList.toggle('rtl', isRTL);
    document.body.classList.toggle('ltr', !isRTL);
  } catch (error) {
    console.error('Error changing language:', error);
  }
};

// Function to get a specific translation with fallback
export const getTranslation = async (key: string, language: string = 'ar'): Promise<string> => {
  try {
    const translations = await loadTranslationsFromDB(language);
    
    // Navigate through the nested object using the key
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to the key itself if translation not found
        return key;
      }
    }
    
    return typeof value === 'string' ? value : key;
  } catch (error) {
    console.error('Error getting translation:', error);
    return key;
  }
};

// Function to preload translations for better performance
export const preloadTranslations = async (languages: string[] = ['ar', 'en']) => {
  const promises = languages.map(lang => loadTranslationsFromDB(lang));
  await Promise.all(promises);
};

// Function to check if translations are cached
export const areTranslationsCached = (language: string): boolean => {
  const cacheKey = `translations_${language}`;
  const now = Date.now();
  
  return !!(
    translationCache[cacheKey] && 
    cacheTimestamp[cacheKey] && 
    (now - cacheTimestamp[cacheKey]) < CACHE_DURATION
  );
};

// Export the initialization function
export { initDynamicI18n };

// Export i18n instance
export default i18n;
