import React, { useEffect, useRef } from 'react';
import { connectionManager } from '../utils/connectionManager';
import { supabase } from '../lib/supabase';

/**
 * مدير الاتصال الصامت المتقدم
 * يعمل خلف الكواليس لضمان استمرارية الاتصال دون إزعاج المستخدم
 */
const SilentConnectionManager: React.FC = () => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<number>(0);

  useEffect(() => {
    // تفعيل الوضع الصامت
    connectionManager.setSilentMode(true);
    console.log('🔇 تم تفعيل مدير الاتصال الصامت');

    // مراقبة تغييرات حالة الشبكة
    const handleOnline = () => {
      console.log('🌐 عاد الاتصال بالإنترنت - فحص سريع للخادم');
      connectionManager.checkConnection();
    };

    const handleOffline = () => {
      console.log('📡 انقطع الاتصال بالإنترنت');
    };

    // مراقبة أخطاء Supabase
    const handleSupabaseError = (event: any) => {
      const { error, context } = event.detail;
      console.log(`🔄 خطأ Supabase تم اكتشافه: ${context || 'غير محدد'}`);

      // إعادة محاولة فورية للأخطاء الشبكية
      if (error?.message?.includes('Failed to fetch') ||
          error?.message?.includes('ERR_CONNECTION_CLOSED')) {
        setTimeout(() => {
          connectionManager.checkConnection();
        }, 1000);
      }
    };

    // بدء مراقبة ذكية
    const startSmartMonitoring = () => {
      intervalRef.current = setInterval(async () => {
        const now = Date.now();
        const status = connectionManager.getStatus();

        // فحص أقل تكراراً إذا كان كل شيء يعمل
        const checkInterval = status.isSupabaseReachable ? 60000 : 15000; // دقيقة أو 15 ثانية

        if (now - lastCheckRef.current > checkInterval) {
          lastCheckRef.current = now;

          // فحص صامت للاتصال
          if (!status.isSupabaseReachable && !status.isRecovering) {
            console.log('🔄 فحص صامت للاتصال...');
            connectionManager.checkConnection();
          } else if (status.isSupabaseReachable) {
            // فحص دوري خفيف للتأكد من استمرار الاتصال
            try {
              await supabase.from('users').select('id').limit(1);
            } catch (error) {
              console.log('🔄 تم اكتشاف مشكلة في الاتصال، بدء إعادة المحاولة');
              connectionManager.checkConnection();
            }
          }
        }
      }, 10000); // فحص كل 10 ثواني
    };

    // تسجيل مستمعي الأحداث
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('supabase-connection-error', handleSupabaseError);

    // بدء المراقبة
    startSmartMonitoring();

    // تنظيف عند إلغاء التحميل
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('supabase-connection-error', handleSupabaseError);

      connectionManager.setSilentMode(false);
      console.log('🔇 تم إيقاف مدير الاتصال الصامت');
    };
  }, []);

  // هذا المكون لا يعرض أي شيء - يعمل خلف الكواليس فقط
  return null;
};

export default SilentConnectionManager;
