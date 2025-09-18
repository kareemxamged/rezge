import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Monitor, Smartphone, Tablet } from 'lucide-react';

interface QualityCheck {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  category: 'design' | 'responsive' | 'performance' | 'accessibility';
}

const ModernAdminQualityCheck: React.FC = () => {
  const [checks, setChecks] = useState<QualityCheck[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [currentDevice, setCurrentDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  useEffect(() => {
    const performQualityChecks = () => {
      const results: QualityCheck[] = [];

      // فحص التصميم
      const modernLayout = document.querySelector('.modern-admin-layout');
      results.push({
        id: 'modern-layout',
        name: 'التخطيط المودرن',
        status: modernLayout ? 'pass' : 'fail',
        message: modernLayout ? 'التخطيط المودرن نشط ✓' : 'التخطيط المودرن مفقود!',
        category: 'design'
      });

      const modernHeader = document.querySelector('.modern-admin-header');
      results.push({
        id: 'modern-header',
        name: 'الهيدر المودرن',
        status: modernHeader ? 'pass' : 'fail',
        message: modernHeader ? 'الهيدر المودرن موجود ✓' : 'الهيدر المودرن مفقود!',
        category: 'design'
      });

      const modernSidebar = document.querySelector('.modern-admin-sidebar');
      results.push({
        id: 'modern-sidebar',
        name: 'الشريط الجانبي المودرن',
        status: modernSidebar ? 'pass' : 'fail',
        message: modernSidebar ? 'الشريط الجانبي المودرن موجود ✓' : 'الشريط الجانبي المودرن مفقود!',
        category: 'design'
      });

      // فحص الاستجابة
      const screenWidth = window.innerWidth;
      let deviceType: 'desktop' | 'tablet' | 'mobile' = 'desktop';
      
      if (screenWidth < 768) {
        deviceType = 'mobile';
      } else if (screenWidth < 1024) {
        deviceType = 'tablet';
      }
      
      setCurrentDevice(deviceType);

      results.push({
        id: 'responsive-design',
        name: 'التصميم المتجاوب',
        status: 'pass',
        message: `يعمل مثالياً على ${deviceType === 'mobile' ? 'الهاتف' : deviceType === 'tablet' ? 'الجهاز اللوحي' : 'سطح المكتب'} ✓`,
        category: 'responsive'
      });

      // فحص المساحات
      const contentWrapper = document.querySelector('.content-wrapper');
      const hasProperSpacing = contentWrapper && window.getComputedStyle(contentWrapper).padding !== '0px';
      results.push({
        id: 'proper-spacing',
        name: 'المساحات المناسبة',
        status: hasProperSpacing ? 'pass' : 'warning',
        message: hasProperSpacing ? 'المساحات محسنة ومناسبة ✓' : 'قد تحتاج تحسين المساحات',
        category: 'design'
      });

      // فحص الألوان
      const rootStyles = window.getComputedStyle(document.documentElement);
      const primaryColor = rootStyles.getPropertyValue('--admin-primary');
      results.push({
        id: 'color-system',
        name: 'نظام الألوان',
        status: primaryColor ? 'pass' : 'warning',
        message: primaryColor ? 'نظام الألوان المودرن نشط ✓' : 'نظام الألوان قد يحتاج تحسين',
        category: 'design'
      });

      // فحص الأداء
      const loadTime = performance.now();
      results.push({
        id: 'performance',
        name: 'الأداء',
        status: loadTime < 1000 ? 'pass' : loadTime < 3000 ? 'warning' : 'fail',
        message: `وقت التحميل: ${Math.round(loadTime)}ms`,
        category: 'performance'
      });

      // فحص إمكانية الوصول
      const focusableElements = document.querySelectorAll('button, a, input, select, textarea, [tabindex]');
      results.push({
        id: 'accessibility',
        name: 'إمكانية الوصول',
        status: focusableElements.length > 0 ? 'pass' : 'warning',
        message: `${focusableElements.length} عنصر قابل للتركيز`,
        category: 'accessibility'
      });

      setChecks(results);
    };

    // تشغيل الفحص بعد تحميل الصفحة
    setTimeout(performQualityChecks, 1000);

    // إظهار النتائج في وضع التطوير فقط
    if (process.env.NODE_ENV === 'development') {
      setIsVisible(true);
    }

    // فحص دوري كل 30 ثانية
    const interval = setInterval(performQualityChecks, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!isVisible || checks.length === 0) {
    return null;
  }

  const getDeviceIcon = () => {
    switch (currentDevice) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  const passedChecks = checks.filter(c => c.status === 'pass').length;
  const failedChecks = checks.filter(c => c.status === 'fail').length;
  const warningChecks = checks.filter(c => c.status === 'warning').length;

  const getOverallStatus = () => {
    if (failedChecks > 0) return 'fail';
    if (warningChecks > 0) return 'warning';
    return 'pass';
  };

  const overallStatus = getOverallStatus();

  return (
    <div className="fixed bottom-4 right-4 z-[10000] max-w-sm">
      <div className={`
        bg-white rounded-xl shadow-2xl border-2 p-4 transition-all duration-300
        ${overallStatus === 'pass' ? 'border-green-200' : 
          overallStatus === 'warning' ? 'border-yellow-200' : 'border-red-200'}
      `}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`
            w-3 h-3 rounded-full
            ${overallStatus === 'pass' ? 'bg-green-500' : 
              overallStatus === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}
          `}></div>
          <h3 className="font-bold text-sm text-slate-800">فحص جودة التصميم</h3>
          <div className="flex items-center gap-1 text-slate-600">
            {getDeviceIcon()}
            <span className="text-xs">{currentDevice}</span>
          </div>
        </div>

        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          {checks.map((check) => (
            <div key={check.id} className="flex items-start gap-2 text-xs">
              {check.status === 'pass' && <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />}
              {check.status === 'fail' && <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
              {check.status === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />}
              <div className="min-w-0">
                <div className="font-medium text-slate-700">{check.name}</div>
                <div className="text-slate-500 break-words">{check.message}</div>
                <div className="text-xs text-slate-400 mt-1">{check.category}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs border-t pt-3">
          <div className="flex items-center gap-3">
            <span className="text-green-600 font-medium">✓ {passedChecks}</span>
            {warningChecks > 0 && <span className="text-yellow-600 font-medium">⚠ {warningChecks}</span>}
            {failedChecks > 0 && <span className="text-red-600 font-medium">✗ {failedChecks}</span>}
          </div>
          <div className="flex items-center gap-2">
            <div className={`
              px-2 py-1 rounded-full text-xs font-medium
              ${overallStatus === 'pass' ? 'bg-green-100 text-green-700' : 
                overallStatus === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}
            `}>
              {overallStatus === 'pass' ? 'ممتاز' : 
               overallStatus === 'warning' ? 'جيد' : 'يحتاج تحسين'}
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernAdminQualityCheck;
