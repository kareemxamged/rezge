import React, { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Shield, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireVerification?: boolean;
  redirectTo?: string;
  fallback?: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requireVerification = false,
  redirectTo = '/login',
  fallback
}) => {
  const { isAuthenticated, isLoading, userProfile } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  // عرض شاشة التحميل أثناء التحقق من المصادقة
  if (isLoading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <Loader2 className="w-16 h-16 text-primary-600 animate-spin" />
              <Shield className="w-8 h-8 text-primary-800 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">{t('loading.verifyingIdentity')}</h2>
          <p className="text-slate-600">{t('loading.pleaseWait')}</p>
        </div>
      </div>
    );
  }

  // إذا كانت الصفحة تتطلب مصادقة والمستخدم غير مصادق
  if (requireAuth && !isAuthenticated) {
    // حفظ الصفحة المطلوبة للعودة إليها بعد تسجيل الدخول
    const returnUrl = location.pathname + location.search;
    const loginUrl = `${redirectTo}?returnUrl=${encodeURIComponent(returnUrl)}`;
    
    return <Navigate to={loginUrl} replace />;
  }

  // تم إزالة رسالة "حسابك قيد المراجعة" - لا نريد إظهارها

  // عرض المحتوى إذا تم استيفاء جميع الشروط
  return <>{children}</>;
};

// مكون خاص للصفحات التي تتطلب عدم تسجيل الدخول (مثل صفحة تسجيل الدخول نفسها)
interface GuestOnlyRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export const GuestOnlyRoute: React.FC<GuestOnlyRouteProps> = ({
  children,
  redirectTo = '/dashboard'
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  console.log('GuestOnlyRoute check:', {
    isAuthenticated,
    isLoading,
    hasUser: !!user,
    currentPath: location.pathname
  });

  // عرض شاشة التحميل أثناء التحقق من المصادقة
  if (isLoading) {
    console.log('GuestOnlyRoute: Still loading, showing loading screen');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-emerald-50">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <Loader2 className="w-16 h-16 text-primary-600 animate-spin" />
              <Shield className="w-8 h-8 text-primary-800 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">{t('loading.verifyingIdentity')}</h2>
          <p className="text-slate-600">{t('loading.pleaseWait')}</p>
        </div>
      </div>
    );
  }

  // إذا كان المستخدم مسجل الدخول، إعادة توجيه للوحة التحكم
  if (isAuthenticated || user) {
    console.log('GuestOnlyRoute: User is authenticated, redirecting from', location.pathname, 'to:', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  // إذا لم يكن مسجل الدخول، عرض المحتوى
  console.log('GuestOnlyRoute: User not authenticated, showing guest content');
  return <>{children}</>;
};



export default ProtectedRoute;
