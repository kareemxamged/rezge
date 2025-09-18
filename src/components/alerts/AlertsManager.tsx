import React, { useState, useEffect, useRef, useCallback } from 'react';
import { alertsService, type AlertWithStatus } from '../../lib/alertsService';
import UserAlertPopup from './UserAlertPopup';

interface AlertsManagerProps {
  // يمكن إضافة خصائص إضافية حسب الحاجة
}

const AlertsManager: React.FC<AlertsManagerProps> = () => {
  const [currentAlert, setCurrentAlert] = useState<AlertWithStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // استخدام refs مباشرة بدون state لتجنب re-renders
  const dismissedAlertsRef = useRef<Set<string>>(new Set());
  const temporarilyClosedAlertsRef = useRef<Set<string>>(new Set());
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // جلب التنبيهات النشطة - نسخة مبسطة بدون console logs
  const fetchActiveAlerts = useCallback(async () => {
    try {
      if (!isMountedRef.current) return;

      setLoading(true);
      const activeAlerts = await alertsService.getActiveAlertsForUser();

      if (!isMountedRef.current) return;

      // فلترة التنبيهات
      const visibleAlerts = activeAlerts.filter(alert =>
        !alert.is_dismissed &&
        !alert.is_hidden &&
        alert.show_as_popup &&
        !dismissedAlertsRef.current.has(alert.id) &&
        !temporarilyClosedAlertsRef.current.has(alert.id)
      );

      // ترتيب حسب الأولوية ثم التاريخ
      visibleAlerts.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      // عرض أول تنبيه إذا وجد
      if (visibleAlerts.length > 0) {
        const firstAlert = visibleAlerts[0];
        setCurrentAlert(prev => {
          if (!prev || prev.id !== firstAlert.id) {
            return firstAlert;
          }
          return prev;
        });
      } else {
        setCurrentAlert(null);
      }

    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // جلب التنبيهات عند تحميل المكون
  useEffect(() => {
    isMountedRef.current = true;

    // مسح التنبيهات المخفية مؤقتاً عند إعادة تحميل الصفحة/تسجيل الدخول
    temporarilyClosedAlertsRef.current = new Set();

    return () => {
      isMountedRef.current = false;
    };
  }, []); // إزالة fetchActiveAlerts من dependencies لمنع الحلقة اللا نهائية

  // جلب التنبيهات مرة واحدة عند التحميل
  useEffect(() => {
    let mounted = true;

    const loadAlerts = async () => {
      if (mounted) {
        await fetchActiveAlerts();
      }
    };

    loadAlerts();

    return () => {
      mounted = false;
    };
  }, []);

  // جلب دوري منفصل تماماً
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isMountedRef.current) {
        fetchActiveAlerts();
      }
    }, 30000); // 30 ثانية

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // معالجة إغلاق التنبيه (زر "فهمت")
  const handleDismissAlert = useCallback(async () => {
    if (!currentAlert) return;

    const alertId = currentAlert.id;
    setCurrentAlert(null);
    dismissedAlertsRef.current.add(alertId);

    try {
      await alertsService.updateAlertStatus(alertId, { is_dismissed: true });
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }

    // جلب التنبيه التالي
    setTimeout(() => fetchActiveAlerts(), 500);
  }, [currentAlert]);

  // معالجة الإغلاق المؤقت (زر X)
  const handleTemporaryCloseAlert = useCallback(() => {
    if (!currentAlert) return;

    const alertId = currentAlert.id;
    setCurrentAlert(null);
    temporarilyClosedAlertsRef.current.add(alertId);

    // إزالة من القائمة المؤقتة بعد 10 دقائق
    setTimeout(() => {
      temporarilyClosedAlertsRef.current.delete(alertId);
    }, 10 * 60 * 1000);

    // جلب التنبيه التالي
    setTimeout(() => fetchActiveAlerts(), 500);
  }, [currentAlert]);

  // معالجة إخفاء التنبيه نهائياً (زر "عدم عرض مجدداً")
  const handleHideAlert = useCallback(async () => {
    if (!currentAlert) return;

    const alertId = currentAlert.id;
    setCurrentAlert(null);
    dismissedAlertsRef.current.add(alertId);

    try {
      await alertsService.updateAlertStatus(alertId, {
        is_dismissed: true,
        is_hidden: true
      });
    } catch (error) {
      console.error('Error hiding alert:', error);
    }

    // جلب التنبيه التالي
    setTimeout(() => fetchActiveAlerts(), 500);
  }, [currentAlert]);

  // تنظيف الموارد عند إلغاء تحميل المكون
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  // عدم عرض أي شيء إذا لم توجد تنبيهات أو كان التحميل جارياً
  if (loading || !currentAlert) {
    return null;
  }

  return (
    <UserAlertPopup
      alert={currentAlert}
      onDismiss={handleDismissAlert}
      onHide={handleHideAlert}
      onTemporaryClose={handleTemporaryCloseAlert}
    />
  );
};

export default AlertsManager;
