import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

// دالة لتحديد مفتاح العنوان حسب المسار
const getTitleKeyFromPath = (pathname: string): string => {
  // إزالة المعاملات من المسار
  const cleanPath = pathname.split('?')[0].split('#')[0];
  
  // مسارات الإدارة
  if (cleanPath.startsWith('/admin')) {
    const adminPath = cleanPath.replace('/admin', '').replace(/^\//, '');
    
    switch (adminPath) {
      case '':
      case 'dashboard':
        return 'pageTitles.admin.dashboard';
      case 'users':
        return 'pageTitles.admin.users';
      case 'admins':
        return 'pageTitles.admin.admins';
      case 'reports':
        return 'pageTitles.admin.reports';
      case 'settings':
        return 'pageTitles.admin.settings';
      case 'analytics':
        return 'pageTitles.admin.analytics';
      case 'content':
        return 'pageTitles.admin.content';
      case 'verification':
        return 'pageTitles.admin.verification';
      default:
        return 'pageTitles.admin.dashboard';
    }
  }
  
  // مسارات الموقع العام
  switch (cleanPath) {
    case '/':
    case '/home':
      return 'pageTitles.home';
    case '/search':
      return 'pageTitles.search';
    case '/profile':
      return 'pageTitles.profile';
    case '/messages':
      return 'pageTitles.messages';
    case '/likes':
      return 'pageTitles.likes';
    case '/notifications':
      return 'pageTitles.notifications';
    case '/settings':
      return 'pageTitles.settings';
    case '/features':
      return 'pageTitles.features';
    case '/about':
      return 'pageTitles.about';
    case '/contact':
      return 'pageTitles.contact';
    case '/help-center':
      return 'pageTitles.helpCenter';
    case '/faq':
      return 'pageTitles.faq';
    case '/islamic-guidelines':
      return 'pageTitles.islamicGuidelines';
    case '/privacy-policy':
      return 'pageTitles.privacyPolicy';
    case '/terms-of-service':
      return 'pageTitles.termsOfService';
    case '/articles':
      return 'pageTitles.articles';
    case '/login':
      return 'pageTitles.login';
    case '/register':
      return 'pageTitles.register';
    case '/forgot-password':
      return 'pageTitles.forgotPassword';
    case '/reset-password':
      return 'pageTitles.resetPassword';
    default:
      // للمسارات الديناميكية مثل /profile/123 أو /articles/123
      if (cleanPath.startsWith('/profile/')) {
        return 'pageTitles.profile';
      }
      if (cleanPath.startsWith('/articles/')) {
        return 'pageTitles.articles';
      }
      if (cleanPath.startsWith('/user/')) {
        return 'pageTitles.profile';
      }
      // العنوان الافتراضي
      return 'pageTitles.home';
  }
};

// Hook لإدارة عنوان الصفحة
export const usePageTitle = (customTitle?: string) => {
  const location = useLocation();
  const { i18n: hookI18n } = useTranslation();

  useEffect(() => {
    // دالة تحديث العنوان
    const updateTitle = () => {
      let title: string;
      let titleKey: string = '';

      if (customTitle) {
        // إذا تم تمرير عنوان مخصص
        title = customTitle;
      } else {
        // استخدام العنوان المحدد حسب المسار
        titleKey = getTitleKeyFromPath(location.pathname);

        // استخدام ترجمات يدوية للعناوين
        const currentLang = i18n.language;

        // ترجمات يدوية للعناوين الأساسية
        const manualTitles: { [key: string]: { ar: string; en: string } } = {
          'pageTitles.home': {
            ar: 'رزقي - موقع الزواج الإسلامي',
            en: 'Rezge - Islamic Marriage Website'
          },
          'pageTitles.search': {
            ar: 'البحث المتقدم - رزقي',
            en: 'Advanced Search - Rezge'
          },
          'pageTitles.profile': {
            ar: 'الملف الشخصي - رزقي',
            en: 'Profile - Rezge'
          },
          'pageTitles.messages': {
            ar: 'الرسائل - رزقي',
            en: 'Messages - Rezge'
          },
          'pageTitles.likes': {
            ar: 'الإعجابات - رزقي',
            en: 'Likes - Rezge'
          },
          'pageTitles.notifications': {
            ar: 'الإشعارات - رزقي',
            en: 'Notifications - Rezge'
          },
          'pageTitles.settings': {
            ar: 'الإعدادات - رزقي',
            en: 'Settings - Rezge'
          },
          'pageTitles.features': {
            ar: 'الميزات - رزقي',
            en: 'Features - Rezge'
          },
          'pageTitles.about': {
            ar: 'من نحن - رزقي',
            en: 'About Us - Rezge'
          },
          'pageTitles.contact': {
            ar: 'اتصل بنا - رزقي',
            en: 'Contact Us - Rezge'
          },
          'pageTitles.helpCenter': {
            ar: 'مركز المساعدة - رزقي',
            en: 'Help Center - Rezge'
          },
          'pageTitles.admin.dashboard': {
            ar: 'لوحة التحكم - إدارة رزقي',
            en: 'Dashboard - Rezge Admin'
          },
          'pageTitles.admin.users': {
            ar: 'إدارة المستخدمين - إدارة رزقي',
            en: 'User Management - Rezge Admin'
          }
        };

        if (manualTitles[titleKey]) {
          title = manualTitles[titleKey][currentLang as 'ar' | 'en'];
        } else {
          title = currentLang === 'ar' ? 'رزقي - موقع الزواج الإسلامي' : 'Rezge - Islamic Marriage Website';
        }
      }

      // تحديث عنوان الصفحة
      document.title = title;

      // تحديث meta description إذا لزم الأمر
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        const isArabic = i18n.language === 'ar';
        const description = isArabic
          ? 'موقع رزقي للزواج الإسلامي - منصة آمنة وشرعية للبحث عن شريك الحياة وفقاً للضوابط الإسلامية'
          : 'Rezge Islamic Marriage Website - A safe and Sharia-compliant platform to find your life partner according to Islamic guidelines';
        metaDescription.setAttribute('content', description);
      }

      // إضافة console.log لمراقبة التغييرات
      console.log('🔄 Page title updated:', title, '| Language:', i18n.language, '| Path:', location.pathname);
    };

    // تنفيذ فوري
    updateTitle();

    // إضافة listener لحدث تغيير اللغة
    const handleLanguageChange = () => {
      console.log('🌍 Language changed event detected:', i18n.language);
      setTimeout(updateTitle, 50);  // تأخير قصير للتأكد من تحديث الترجمات
      setTimeout(updateTitle, 200); // تأخير إضافي للتأكد
    };

    i18n.on('languageChanged', handleLanguageChange);

    // تنفيذ مؤجل للتأكد من تحديث الترجمات
    const timeoutId = setTimeout(updateTitle, 100);

    return () => {
      clearTimeout(timeoutId);
      i18n.off('languageChanged', handleLanguageChange);
    };

  }, [location.pathname, customTitle]);
};

// Hook مبسط لتحديث العنوان فقط
export const useDocumentTitle = (title: string) => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    
    return () => {
      document.title = previousTitle;
    };
  }, [title]);
};

// دالة مساعدة للحصول على العنوان المترجم
export const getPageTitle = (pathname: string, t: (key: string) => string): string => {
  const titleKey = getTitleKeyFromPath(pathname);
  return t(titleKey);
};
