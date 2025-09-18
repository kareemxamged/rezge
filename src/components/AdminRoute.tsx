import React, { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Shield, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { adminAuthService } from '../lib/adminAuthService';
import type { AdminUser } from '../lib/adminAuthService';

interface AdminRouteProps {
  children: ReactNode;
  requiredPermission?: string;
  redirectTo?: string;
}

interface AdminRouteState {
  isLoading: boolean;
  isAdmin: boolean;
  hasPermission: boolean;
  adminUser: AdminUser | null;
  error: string | null;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({
  children,
  requiredPermission,
  redirectTo = '/'
}) => {
  const { isAuthenticated, isLoading: authLoading, userProfile } = useAuth();
  const [state, setState] = useState<AdminRouteState>({
    isLoading: true,
    isAdmin: false,
    hasPermission: false,
    adminUser: null,
    error: null
  });

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (authLoading) return;

      if (!isAuthenticated) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        // التحقق من كون المستخدم مشرف
        const isAdmin = await adminAuthService.isAdminUser();
        
        if (!isAdmin) {
          setState(prev => ({ 
            ...prev, 
            isLoading: false, 
            isAdmin: false,
            error: 'ليس لديك صلاحيات إدارية'
          }));
          return;
        }

        // الحصول على بيانات المشرف
        const adminUser = await adminAuthService.getCurrentAdminUser();
        
        if (!adminUser) {
          setState(prev => ({ 
            ...prev, 
            isLoading: false, 
            isAdmin: false,
            error: 'فشل في تحميل بيانات المشرف'
          }));
          return;
        }

        // التحقق من الصلاحية المطلوبة إن وجدت
        let hasPermission = true;
        if (requiredPermission) {
          hasPermission = await adminAuthService.hasPermission(requiredPermission);
        }

        // التحقق من صحة الجلسة الإدارية
        const hasValidSession = await adminAuthService.validateAdminSession();
        
        if (!hasValidSession) {
          // إنشاء جلسة جديدة
          await adminAuthService.createAdminSession(adminUser.id);
          await adminAuthService.updateLastLogin(adminUser.id);
        }

        setState({
          isLoading: false,
          isAdmin: true,
          hasPermission,
          adminUser,
          error: null
        });

      } catch (error) {
        console.error('Error checking admin access:', error);
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: 'حدث خطأ في التحقق من الصلاحيات'
        }));
      }
    };

    checkAdminAccess();
  }, [isAuthenticated, authLoading, userProfile, requiredPermission]);

  // عرض مؤشر التحميل
  if (authLoading || state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 text-lg">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  // إعادة توجيه للتسجيل إذا لم يكن مسجل دخول
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // عرض رسالة خطأ إذا لم يكن مشرف
  if (!state.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
        <div className="max-w-md mx-auto text-center p-8 bg-white rounded-2xl shadow-lg border border-red-200">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">غير مصرح لك</h2>
          <p className="text-slate-600 mb-6">
            {state.error || 'ليس لديك صلاحية للوصول إلى لوحة التحكم الإدارية.'}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = redirectTo}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              العودة للرئيسية
            </button>
            <button
              onClick={() => window.history.back()}
              className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
            >
              العودة للخلف
            </button>
          </div>
        </div>
      </div>
    );
  }

  // عرض رسالة عدم وجود صلاحية محددة
  if (!state.hasPermission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="max-w-md mx-auto text-center p-8 bg-white rounded-2xl shadow-lg border border-amber-200">
          <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">صلاحية غير كافية</h2>
          <p className="text-slate-600 mb-6">
            ليس لديك الصلاحية المطلوبة للوصول إلى هذه الصفحة.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800">
              <strong>الصلاحية المطلوبة:</strong> {requiredPermission}
            </p>
            <p className="text-sm text-amber-700 mt-1">
              <strong>دورك الحالي:</strong> {state.adminUser?.role?.display_name}
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/admin'}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              العودة للوحة التحكم
            </button>
            <button
              onClick={() => window.history.back()}
              className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
            >
              العودة للخلف
            </button>
          </div>
        </div>
      </div>
    );
  }

  // عرض المحتوى إذا كانت جميع الشروط مستوفاة
  return <>{children}</>;
};

export default AdminRoute;
