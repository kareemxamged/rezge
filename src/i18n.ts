import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import arTranslations from './locales/ar.json';
import enTranslations from './locales/en.json';

// Get saved language from localStorage or default to Arabic
const getSavedLanguage = (): string => {
  try {
    const savedLang = localStorage.getItem('preferred-language');
    return savedLang && ['ar', 'en'].includes(savedLang) ? savedLang : 'ar';
  } catch (error) {
    console.warn('Could not access localStorage:', error);
    return 'ar';
  }
};

const resources = {
  ar: {
    translation: arTranslations
  },
  en: {
    translation: enTranslations
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getSavedLanguage(), // Use saved language or default to Arabic
    fallbackLng: 'ar',

    interpolation: {
      escapeValue: false // React already does escaping
    },

    // Configure for RTL support
    react: {
      useSuspense: false
    }
  });

// Function to change language and update document direction
export const changeLanguage = (language: string) => {
  console.log('🔄 changeLanguage called:', language);

  i18n.changeLanguage(language);

  // Save language preference to localStorage
  try {
    localStorage.setItem('preferred-language', language);
  } catch (error) {
    console.warn('Could not save language preference:', error);
  }

  // Update document direction and lang attribute
  const isRTL = language === 'ar';
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = language;

  // Update body class for styling
  document.body.classList.toggle('rtl', isRTL);
  document.body.classList.toggle('ltr', !isRTL);

  console.log('✅ Language changed to:', language, '| Direction:', isRTL ? 'rtl' : 'ltr');
};

// Initialize direction on load with saved language
const currentLang = getSavedLanguage();
changeLanguage(currentLang);

export default i18n;
