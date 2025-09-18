import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface IsolationCheck {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

const AdminIsolationCheck: React.FC = () => {
  const [checks, setChecks] = useState<IsolationCheck[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // فحص الفصل الكامل للوحة الإدارة
    const performChecks = () => {
      const results: IsolationCheck[] = [];

      // فحص 1: التأكد من عدم وجود هيدر الموقع العام
      const mainHeader = document.querySelector('header:not(.admin-header)');
      results.push({
        id: 'main-header',
        name: 'فصل الهيدر العام',
        status: mainHeader ? 'fail' : 'pass',
        message: mainHeader ? 'هيدر الموقع العام موجود!' : 'لا يوجد هيدر للموقع العام ✓'
      });

      // فحص 2: التأكد من عدم وجود فوتر الموقع العام
      const mainFooter = document.querySelector('footer');
      results.push({
        id: 'main-footer',
        name: 'فصل الفوتر العام',
        status: mainFooter ? 'fail' : 'pass',
        message: mainFooter ? 'فوتر الموقع العام موجود!' : 'لا يوجد فوتر للموقع العام ✓'
      });

      // فحص 3: التأكد من وجود الهيدر الإداري
      const adminHeader = document.querySelector('.admin-header');
      results.push({
        id: 'admin-header',
        name: 'وجود الهيدر الإداري',
        status: adminHeader ? 'pass' : 'fail',
        message: adminHeader ? 'الهيدر الإداري موجود ✓' : 'الهيدر الإداري مفقود!'
      });

      // فحص 4: التأكد من وجود التخطيط الإداري
      const adminLayout = document.querySelector('.admin-layout');
      results.push({
        id: 'admin-layout',
        name: 'التخطيط الإداري',
        status: adminLayout ? 'pass' : 'fail',
        message: adminLayout ? 'التخطيط الإداري نشط ✓' : 'التخطيط الإداري مفقود!'
      });

      // فحص 5: التأكد من عدم وجود عناصر الموقع العام
      const mainElements = document.querySelectorAll('.font-arabic:not(.admin-layout)');
      results.push({
        id: 'main-elements',
        name: 'عناصر الموقع العام',
        status: mainElements.length > 0 ? 'warning' : 'pass',
        message: mainElements.length > 0 ? `تم العثور على ${mainElements.length} عنصر من الموقع العام` : 'لا توجد عناصر من الموقع العام ✓'
      });

      // فحص 6: التأكد من الخط المستخدم
      const computedStyle = window.getComputedStyle(document.body);
      const fontFamily = computedStyle.fontFamily;
      const isInterFont = fontFamily.includes('Inter');
      results.push({
        id: 'font-family',
        name: 'خط لوحة الإدارة',
        status: isInterFont ? 'pass' : 'warning',
        message: isInterFont ? 'خط Inter مطبق ✓' : `الخط الحالي: ${fontFamily}`
      });

      setChecks(results);
    };

    // تشغيل الفحص بعد تحميل الصفحة
    setTimeout(performChecks, 1000);

    // إظهار النتائج في وضع التطوير فقط
    if (process.env.NODE_ENV === 'development') {
      setIsVisible(true);
    }
  }, []);

  if (!isVisible || checks.length === 0) {
    return null;
  }

  const passedChecks = checks.filter(c => c.status === 'pass').length;
  const failedChecks = checks.filter(c => c.status === 'fail').length;
  const warningChecks = checks.filter(c => c.status === 'warning').length;

  return (
    <div className="fixed bottom-4 left-4 z-[10000] max-w-sm">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <h3 className="font-semibold text-sm text-slate-800">فحص فصل لوحة الإدارة</h3>
        </div>

        <div className="space-y-2 mb-3">
          {checks.map((check) => (
            <div key={check.id} className="flex items-start gap-2 text-xs">
              {check.status === 'pass' && <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />}
              {check.status === 'fail' && <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
              {check.status === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />}
              <div>
                <div className="font-medium text-slate-700">{check.name}</div>
                <div className="text-slate-500">{check.message}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="text-green-600">✓ {passedChecks}</span>
            {warningChecks > 0 && <span className="text-yellow-600">⚠ {warningChecks}</span>}
            {failedChecks > 0 && <span className="text-red-600">✗ {failedChecks}</span>}
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            إخفاء
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminIsolationCheck;
