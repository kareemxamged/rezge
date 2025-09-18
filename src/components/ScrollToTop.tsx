import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * مكون ScrollToTop المحسن - يحل مشاكل التمرير والطول الزائد بذكاء
 *
 * يتعامل مع:
 * - التمرير التلقائي لأعلى الصفحة عند تغيير المسار
 * - إصلاح مشكلة الطول الزائد في نهاية الصفحة
 * - إعادة حساب ارتفاع الصفحة بعد تحميل المحتوى
 * - منع تضارب مواضع التمرير بين الصفحات
 */
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousPathRef = useRef<string>('');

  useEffect(() => {
    // تنظيف timeout السابق إذا كان موجوداً
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // حفظ المسار السابق للمقارنة
    previousPathRef.current = pathname;

    // دالة إعادة تعيين التمرير والتخطيط
    const resetScrollAndLayout = () => {
      // 1. إعادة تعيين التمرير فوراً (بدون animation لتجنب التأخير)
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      // 2. إجبار المتصفح على إعادة حساب التخطيط
      document.body.style.minHeight = '100vh';

      // 3. إعادة تعيين أي overflow مخفي
      document.documentElement.style.overflow = 'auto';
      document.body.style.overflow = 'auto';

      // 4. تشغيل reflow لإعادة حساب الأبعاد
      document.body.offsetHeight;

      // 5. تأكيد إضافي للتمرير بعد فترة قصيرة
      setTimeout(() => {
        window.scrollTo(0, 0);

        // 6. إعادة حساب ارتفاع الصفحة بناءً على المحتوى الفعلي
        const actualHeight = Math.max(
          document.body.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.clientHeight,
          document.documentElement.scrollHeight,
          document.documentElement.offsetHeight
        );

        // 7. تطبيق الارتفاع الصحيح
        document.body.style.minHeight = `${actualHeight}px`;

        // 8. تنظيف الارتفاع الإضافي بعد فترة قصيرة
        setTimeout(() => {
          document.body.style.minHeight = '100vh';
        }, 100);

      }, 50);
    };

    // تشغيل إعادة التعيين فوراً
    resetScrollAndLayout();

    // إعادة التعيين مرة أخرى بعد تحميل المحتوى (للصفحات التي تحتاج وقت للتحميل)
    timeoutRef.current = setTimeout(() => {
      resetScrollAndLayout();

      // تأكيد نهائي بعد فترة أطول للصفحات التي تحتوي على صور أو محتوى ديناميكي
      setTimeout(() => {
        window.scrollTo(0, 0);

        // إزالة أي ارتفاع زائد نهائياً
        const viewportHeight = window.innerHeight;
        const contentHeight = document.body.scrollHeight;

        if (contentHeight < viewportHeight) {
          document.body.style.minHeight = '100vh';
        } else {
          document.body.style.minHeight = 'auto';
        }
      }, 200);

    }, 100);

    // تنظيف عند إلغاء المكون
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [pathname]);

  // إضافة مستمع لأحداث تغيير حجم النافذة لإعادة حساب الارتفاع
  useEffect(() => {
    const handleResize = () => {
      // إعادة حساب الارتفاع عند تغيير حجم النافذة
      setTimeout(() => {
        const viewportHeight = window.innerHeight;
        const contentHeight = document.body.scrollHeight;

        if (contentHeight < viewportHeight) {
          document.body.style.minHeight = '100vh';
        } else {
          document.body.style.minHeight = 'auto';
        }
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // هذا المكون لا يعرض أي محتوى مرئي
  return null;
};

export default ScrollToTop;
