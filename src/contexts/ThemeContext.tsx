import React, { createContext, useContext, useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

// أنواع الثيم
export type Theme = 'light' | 'dark' | 'auto';

// واجهة السياق
interface ThemeContextType {
  theme: Theme;
  actualTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// إنشاء السياق
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// مفتاح التخزين المحلي
const THEME_STORAGE_KEY = 'rezge-admin-theme';

// مزود السياق
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // استرجاع الثيم المحفوظ أو استخدام الافتراضي
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
    return savedTheme || 'light';
  });

  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

  // تحديد الثيم الفعلي بناءً على الإعداد
  useEffect(() => {
    const updateActualTheme = () => {
      if (theme === 'auto') {
        // استخدام تفضيل النظام
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setActualTheme(systemPrefersDark ? 'dark' : 'light');
      } else {
        setActualTheme(theme);
      }
    };

    updateActualTheme();

    // الاستماع لتغييرات تفضيل النظام
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => updateActualTheme();
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // تطبيق الثيم على الـ DOM
  useEffect(() => {
    const root = document.documentElement;
    
    // إزالة الكلاسات السابقة
    root.classList.remove('light-theme', 'dark-theme');
    
    // إضافة الكلاس الجديد
    root.classList.add(`${actualTheme}-theme`);
    
    // تحديث خاصية data-theme
    root.setAttribute('data-theme', actualTheme);
  }, [actualTheme]);

  // حفظ الثيم في التخزين المحلي
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  };

  // تبديل الثيم
  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('auto');
    } else {
      setTheme('light');
    }
  };

  const value: ThemeContextType = {
    theme,
    actualTheme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// هوك لاستخدام السياق
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// مكون زر تبديل الثيم
export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="w-4 h-4" />;
      case 'dark':
        return <Moon className="w-4 h-4" />;
      case 'auto':
        return <Monitor className="w-4 h-4" />;
      default:
        return <Sun className="w-4 h-4" />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'الوضع الفاتح';
      case 'dark':
        return 'الوضع المظلم';
      case 'auto':
        return 'تلقائي';
      default:
        return 'الوضع الفاتح';
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className={`theme-toggle-btn ${className}`}
      title={`التبديل إلى: ${getLabel()}`}
      aria-label={`الثيم الحالي: ${getLabel()}`}
    >
      <span className="theme-icon">{getIcon()}</span>
      <span className="theme-label">{getLabel()}</span>
    </button>
  );
};

// مكون مبسط لزر التبديل
export const SimpleThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, actualTheme, toggleTheme } = useTheme();

  const getSimpleIcon = () => {
    switch (actualTheme) {
      case 'light':
        return <Moon className="w-4 h-4" />;
      case 'dark':
        return <Sun className="w-4 h-4" />;
      default:
        return <Sun className="w-4 h-4" />;
    }
  };

  const getTooltip = () => {
    switch (theme) {
      case 'light':
        return 'التبديل للوضع المظلم';
      case 'dark':
        return 'التبديل للوضع التلقائي';
      case 'auto':
        return 'التبديل للوضع الفاتح';
      default:
        return 'تبديل الثيم';
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className={`simple-theme-toggle ${className}`}
      title={getTooltip()}
      aria-label={`الثيم الحالي: ${theme === 'light' ? 'فاتح' : theme === 'dark' ? 'مظلم' : 'تلقائي'}`}
    >
      {getSimpleIcon()}
    </button>
  );
};

export default ThemeContext;
