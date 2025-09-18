import { useState } from 'react';

// Hook لإدارة localStorage مع TypeScript
export function useLocalStorage<T>(key: string, initialValue: T) {
  // الحصول على القيمة من localStorage أو استخدام القيمة الافتراضية
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // دالة لتحديث القيمة
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // السماح بالقيمة أو دالة لتحديث القيمة
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // حفظ القيمة في state
      setStoredValue(valueToStore);
      
      // حفظ القيمة في localStorage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  // دالة لحذف القيمة
  const removeValue = () => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue, removeValue] as const;
}

// Hook خاص لإدارة بيانات المصادقة المحفوظة
export function useAuthStorage() {
  const [rememberMe, setRememberMe, removeRememberMe] = useLocalStorage('rememberMe', false);
  const [savedEmail, setSavedEmail, removeSavedEmail] = useLocalStorage('userEmail', '');
  const [lastLoginTime, setLastLoginTime, removeLastLoginTime] = useLocalStorage('lastLoginTime', null);

  // حفظ بيانات تسجيل الدخول
  const saveLoginData = (email: string, remember: boolean) => {
    if (remember) {
      setRememberMe(true);
      setSavedEmail(email);
      setLastLoginTime(new Date().toISOString() as any);
    } else {
      clearLoginData();
    }
  };

  // مسح بيانات تسجيل الدخول المحفوظة
  const clearLoginData = () => {
    removeRememberMe();
    removeSavedEmail();
    removeLastLoginTime();
  };

  // التحقق من صحة الجلسة المحفوظة (مثلاً، انتهت صلاحيتها بعد 30 يوم)
  const isSessionValid = () => {
    if (!rememberMe || !lastLoginTime) return false;
    
    const lastLogin = new Date(lastLoginTime);
    const now = new Date();
    const daysDiff = (now.getTime() - lastLogin.getTime()) / (1000 * 3600 * 24);
    
    return daysDiff <= 30; // صالح لمدة 30 يوم
  };

  return {
    rememberMe,
    savedEmail,
    lastLoginTime,
    saveLoginData,
    clearLoginData,
    isSessionValid,
  };
}

// Hook لإدارة إعدادات المستخدم المحلية
export function useUserPreferences() {
  const [language, setLanguage] = useLocalStorage('userLanguage', 'ar');
  const [theme, setTheme] = useLocalStorage('userTheme', 'light');
  const [notifications, setNotifications] = useLocalStorage('userNotifications', {
    email: true,
    push: true,
    sms: false,
  });

  return {
    language,
    setLanguage,
    theme,
    setTheme,
    notifications,
    setNotifications,
  };
}

export default useLocalStorage;
