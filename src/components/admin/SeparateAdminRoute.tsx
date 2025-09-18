import React, { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, AlertTriangle } from 'lucide-react';
import { separateAdminAuth, type AdminAccount } from '../../lib/separateAdminAuth';

interface SeparateAdminRouteProps {
  children: ReactNode;
  requiredPermissions?: string[];
  requireSuperAdmin?: boolean;
}

const SeparateAdminRoute: React.FC<SeparateAdminRouteProps> = ({
  children,
  requiredPermissions = [],
  requireSuperAdmin = false
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminAccount, setAdminAccount] = useState<AdminAccount | null>(null);
  const [error, setError] = useState<string>('');
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // منع التحقق المتكرر
    if (hasChecked) {
      return;
    }

    const checkAdminAuth = async () => {
      try {
        setIsLoading(true);
        setError('');

        console.log('🔍 Checking admin authentication...');

        // التحقق من صحة الجلسة
        const isValidSession = await separateAdminAuth.validateSession();

        if (!isValidSession) {
          console.log('❌ Invalid session, redirecting to login');
          setIsAuthenticated(false);
          setIsLoading(false);
          setHasChecked(true);
          return;
        }

        console.log('✅ Valid session found');

        // الحصول على بيانات المشرف
        const account = separateAdminAuth.getCurrentAccount();

        if (!account) {
          console.log('❌ No account data found');
          setIsAuthenticated(false);
          setError('لم يتم العثور على بيانات المشرف');
          setIsLoading(false);
          setHasChecked(true);
          return;
        }

        console.log('✅ Account found:', account.username);
        console.log('🔍 Account details:', {
          id: account.id,
          username: account.username,
          email: account.email,
          is_active: account.is_active,
          is_super_admin: account.is_super_admin
        });

        // التحقق من حالة الحساب
        if (!account.is_active) {
          console.log('❌ Account is not active - is_active:', account.is_active);
          setIsAuthenticated(false);
          setError('حسابك غير نشط. يرجى التواصل مع المشرف العام.');
          setIsLoading(false);
          setHasChecked(true);
          return;
        }

        // التحقق من صلاحية السوبر أدمن إذا كانت مطلوبة
        if (requireSuperAdmin && !account.is_super_admin) {
          console.log('❌ Super admin required but user is not super admin');
          setIsAuthenticated(false);
          setError('هذه الصفحة مخصصة للمشرف العام فقط');
          setIsLoading(false);
          setHasChecked(true);
          return;
        }

        // TODO: التحقق من الصلاحيات المحددة (سيتم تطويرها لاحقاً)
        if (requiredPermissions.length > 0) {
          console.log('Required permissions:', requiredPermissions);
        }

        console.log('✅ Authentication successful');
        setAdminAccount(account);
        setIsAuthenticated(true);
        setHasChecked(true);

      } catch (error) {
        console.error('❌ Error checking admin authentication:', error);
        setError('حدث خطأ في التحقق من الصلاحيات');
        setIsAuthenticated(false);
        setHasChecked(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAuth();
  }, [hasChecked, requiredPermissions, requireSuperAdmin]);

  // شاشة التحميل
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            جاري التحقق من الصلاحيات...
          </h2>
          <p className="text-gray-600">
            يرجى الانتظار بينما نتحقق من صلاحياتك الإدارية
          </p>
        </div>
      </div>
    );
  }

  // إذا لم يكن مصادق عليه، توجيه لصفحة تسجيل الدخول الإدارية
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // إذا كان هناك خطأ في الصلاحيات
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            غير مصرح لك
          </h2>
          
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/admin/login'}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              تسجيل الدخول مرة أخرى
            </button>
            
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
            >
              العودة للموقع الرئيسي
            </button>
          </div>
          
          {adminAccount && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                <p>مسجل الدخول كـ: <span className="font-medium">{adminAccount.username}</span></p>
                <p>البريد الإلكتروني: <span className="font-medium">{adminAccount.email}</span></p>
                {adminAccount.is_super_admin && (
                  <p className="text-blue-600 font-medium">مشرف عام</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // إذا كان كل شيء صحيح، عرض المحتوى
  return <>{children}</>;
};

export default SeparateAdminRoute;
