import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook مخصص لحفظ واستعادة القسم النشط في صفحات لوحة الإدارة
 * يحفظ القسم النشط في localStorage ويستعيده عند إعادة تحميل الصفحة
 */

interface UseActiveTabOptions {
  /** القيمة الافتراضية للقسم النشط */
  defaultTab: string;
  /** مفتاح فريد لحفظ البيانات في localStorage */
  storageKey: string;
  /** دالة اختيارية لتنفيذها عند تغيير القسم */
  onTabChange?: (tabId: string) => void;
  /** قائمة الأقسام المسموحة (للتحقق من صحة القيمة المحفوظة) */
  validTabs?: string[];
}

interface UseActiveTabReturn {
  /** القسم النشط الحالي */
  activeTab: string;
  /** دالة لتغيير القسم النشط */
  setActiveTab: (tabId: string) => void;
  /** دالة لإعادة تعيين القسم للقيمة الافتراضية */
  resetTab: () => void;
  /** دالة للحصول على القسم المحفوظ بدون تطبيقه */
  getSavedTab: () => string | null;
}

export function useActiveTab(options: UseActiveTabOptions): UseActiveTabReturn {
  const { defaultTab, storageKey, onTabChange, validTabs } = options;
  const location = useLocation();

  // دالة للحصول على القسم المحفوظ
  const getSavedTab = useCallback((): string | null => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && (!validTabs || validTabs.includes(saved))) {
        return saved;
      }
    } catch (error) {
      console.warn(`Error reading saved tab from localStorage (${storageKey}):`, error);
    }
    return null;
  }, [storageKey, validTabs]);

  // دالة لحفظ القسم
  const saveTab = useCallback((tabId: string) => {
    try {
      localStorage.setItem(storageKey, tabId);
    } catch (error) {
      console.warn(`Error saving tab to localStorage (${storageKey}):`, error);
    }
  }, [storageKey]);

  // تحديد القسم الأولي
  const getInitialTab = useCallback((): string => {
    // أولاً: فحص URL parameters
    const urlParams = new URLSearchParams(location.search);
    const tabFromUrl = urlParams.get('tab');
    if (tabFromUrl && (!validTabs || validTabs.includes(tabFromUrl))) {
      return tabFromUrl;
    }

    // ثانياً: فحص localStorage
    const savedTab = getSavedTab();
    if (savedTab) {
      return savedTab;
    }

    // ثالثاً: استخدام القيمة الافتراضية
    return defaultTab;
  }, [location.search, getSavedTab, defaultTab, validTabs]);

  // حالة القسم النشط
  const [activeTab, setActiveTabState] = useState<string>(getInitialTab);

  // دالة لتغيير القسم النشط (مبسطة بدون تحديث URL)
  const setActiveTab = useCallback((tabId: string) => {
    // التحقق من صحة القسم
    if (validTabs && !validTabs.includes(tabId)) {
      console.warn(`Invalid tab ID: ${tabId}. Valid tabs:`, validTabs);
      return;
    }

    // تجنب التحديث إذا كان نفس القسم النشط
    if (tabId === activeTab) {
      return;
    }

    // تحديث الحالة
    setActiveTabState(tabId);

    // حفظ في localStorage
    saveTab(tabId);

    // تنفيذ callback إذا كان موجوداً
    if (onTabChange) {
      onTabChange(tabId);
    }

    // إزالة تحديث URL لتجنب المشاكل
    // يمكن إضافته لاحقاً إذا لزم الأمر بطريقة أكثر أماناً
  }, [validTabs, saveTab, onTabChange, activeTab]);

  // دالة لإعادة تعيين القسم
  const resetTab = useCallback(() => {
    setActiveTab(defaultTab);
  }, [setActiveTab, defaultTab]);

  // إزالة useEffect الذي يراقب URL لأنه يسبب حلقات لا نهائية
  // بدلاً من ذلك، سنعتمد على getInitialTab فقط عند التحميل الأولي

  // تأثير جانبي لحفظ القسم عند تغيير المسار (مبسط)
  useEffect(() => {
    // حفظ القسم الحالي عند تغيير المسار فقط
    saveTab(activeTab);
  }, [location.pathname, saveTab, activeTab]);

  return {
    activeTab,
    setActiveTab,
    resetTab,
    getSavedTab
  };
}

/**
 * Hook مبسط لحفظ القسم النشط بدون خيارات متقدمة
 */
export function useSimpleActiveTab(
  defaultTab: string, 
  storageKey: string, 
  validTabs?: string[]
): [string, (tabId: string) => void] {
  const { activeTab, setActiveTab } = useActiveTab({
    defaultTab,
    storageKey,
    validTabs
  });

  return [activeTab, setActiveTab];
}

/**
 * Hook خاص لصفحات إدارة المستخدمين
 */
export function useUsersManagementTab() {
  const validTabs = ['all', 'reports', 'blocked', 'verification'];

  return useActiveTab({
    defaultTab: 'all',
    storageKey: 'admin_users_active_tab',
    validTabs
    // إزالة onTabChange لتجنب السجلات المفرطة
  });
}

/**
 * Hook خاص لصفحات إدارة الاشتراكات
 */
export function useSubscriptionManagementTab() {
  const validTabs = ['plans', 'subscriptions', 'payments', 'pending-payments', 'coupons', 'payment-settings'];

  return useActiveTab({
    defaultTab: 'plans',
    storageKey: 'admin_subscriptions_active_tab',
    validTabs
    // إزالة onTabChange لتجنب السجلات المفرطة
  });
}

/**
 * دالة مساعدة لمسح جميع الأقسام المحفوظة
 */
export function clearAllSavedTabs(): void {
  try {
    const keysToRemove = [
      'admin_users_active_tab',
      'admin_subscriptions_active_tab'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('✅ All saved tabs cleared');
  } catch (error) {
    console.warn('Error clearing saved tabs:', error);
  }
}

/**
 * دالة مساعدة للحصول على جميع الأقسام المحفوظة
 */
export function getAllSavedTabs(): Record<string, string | null> {
  try {
    return {
      usersManagement: localStorage.getItem('admin_users_active_tab'),
      subscriptionManagement: localStorage.getItem('admin_subscriptions_active_tab')
    };
  } catch (error) {
    console.warn('Error getting saved tabs:', error);
    return {};
  }
}

export default useActiveTab;
