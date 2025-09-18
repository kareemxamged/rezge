import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { adminAuthService } from '../lib/adminAuthService';
import { separateAdminAuth } from '../lib/separateAdminAuth';
import type { AdminUser, AdminPermission } from '../lib/adminAuthService';
import { useAuth } from './AuthContext';

interface AdminContextType {
  // حالة المشرف
  adminUser: AdminUser | null;
  isAdminLoading: boolean;
  isAdmin: boolean;
  
  // الصلاحيات
  permissions: AdminPermission[];
  hasPermission: (permissionCode: string) => boolean;
  
  // الجلسة
  sessionValid: boolean;
  
  // الأخطاء
  error: string | null;
  
  // الدوال
  refreshAdminData: () => Promise<void>;
  logout: () => Promise<void>;
  logActivity: (action: string, resourceType: string, resourceId?: string, details?: any) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

interface AdminProviderProps {
  children: ReactNode;
}

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [isAdminLoading, setIsAdminLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionValid, setSessionValid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // تحديث بيانات المشرف
  const refreshAdminData = async () => {
    if (!isAuthenticated) {
      setAdminUser(null);
      setPermissions([]);
      setIsAdmin(false);
      setSessionValid(false);
      setIsAdminLoading(false);
      return;
    }

    try {
      setIsAdminLoading(true);
      setError(null);

      // التحقق من كون المستخدم مشرف
      const isAdminUser = await adminAuthService.isAdminUser();
      setIsAdmin(isAdminUser);

      if (!isAdminUser) {
        setAdminUser(null);
        setPermissions([]);
        setSessionValid(false);
        setIsAdminLoading(false);
        return;
      }

      // الحصول على بيانات المشرف
      const currentAdminUser = await adminAuthService.getCurrentAdminUser();
      setAdminUser(currentAdminUser);

      if (currentAdminUser) {
        // الحصول على الصلاحيات
        const userPermissions = await adminAuthService.getAdminPermissions(currentAdminUser.id);
        setPermissions(userPermissions);

        // التحقق من صحة الجلسة
        const isSessionValid = await adminAuthService.validateAdminSession();
        setSessionValid(isSessionValid);

        // إنشاء جلسة جديدة إذا لم تكن موجودة
        if (!isSessionValid) {
          await adminAuthService.createAdminSession(currentAdminUser.id);
          setSessionValid(true);
        }

        // تحديث آخر تسجيل دخول
        await adminAuthService.updateLastLogin(currentAdminUser.id);
      }

    } catch (err) {
      console.error('Error refreshing admin data:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل بيانات المشرف');
      setAdminUser(null);
      setPermissions([]);
      setIsAdmin(false);
      setSessionValid(false);
    } finally {
      setIsAdminLoading(false);
    }
  };

  // التحقق من صلاحية معينة
  const hasPermission = (permissionCode: string): boolean => {
    // التحقق من النظام الجديد أولاً
    const currentAdminAccount = separateAdminAuth.getCurrentAccount();
    if (currentAdminAccount) {
      // إذا كان سوبر أدمن في النظام الجديد، أعطه جميع الصلاحيات
      if (currentAdminAccount.is_super_admin) {
        return true;
      }
      // يمكن إضافة منطق صلاحيات أكثر تفصيلاً هنا لاحقاً
      return true; // مؤقتاً، أعطي جميع الصلاحيات للمشرفين المسجلين
    }

    // النظام القديم كـ fallback
    if (!adminUser) return false;
    if (adminUser.is_super_admin) return true;
    return permissions.some(permission => permission.code === permissionCode);
  };

  // تسجيل الخروج
  const logout = async () => {
    try {
      await adminAuthService.invalidateAdminSession();
      setAdminUser(null);
      setPermissions([]);
      setIsAdmin(false);
      setSessionValid(false);
      setError(null);
    } catch (err) {
      console.error('Error during admin logout:', err);
    }
  };

  // تسجيل نشاط
  const logActivity = async (
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: any
  ) => {
    try {
      await adminAuthService.logActivity(action, resourceType, resourceId, details);
    } catch (err) {
      console.error('Error logging admin activity:', err);
    }
  };

  // تحديث البيانات عند تغيير حالة المصادقة
  useEffect(() => {
    if (!authLoading) {
      refreshAdminData();
    }
  }, [isAuthenticated, authLoading]);

  // التحقق من صحة الجلسة دورياً
  useEffect(() => {
    if (!isAdmin || !adminUser) return;

    const checkSession = async () => {
      try {
        const isValid = await adminAuthService.validateAdminSession();
        setSessionValid(isValid);
        
        if (!isValid) {
          // إعادة إنشاء الجلسة
          await adminAuthService.createAdminSession(adminUser.id);
          setSessionValid(true);
        }
      } catch (err) {
        console.error('Error checking session validity:', err);
        setSessionValid(false);
      }
    };

    // فحص الجلسة كل 5 دقائق
    const interval = setInterval(checkSession, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isAdmin, adminUser]);

  const value: AdminContextType = {
    adminUser,
    isAdminLoading,
    isAdmin,
    permissions,
    hasPermission,
    sessionValid,
    error,
    refreshAdminData,
    logout,
    logActivity
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

// Hook لاستخدام AdminContext
export const useAdmin = (): AdminContextType => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

// Hook للتحقق من صلاحية معينة
export const useAdminPermission = (permissionCode: string): boolean => {
  const { hasPermission } = useAdmin();
  return hasPermission(permissionCode);
};

// Hook للتحقق من كون المستخدم super admin
export const useIsSuperAdmin = (): boolean => {
  const { adminUser } = useAdmin();
  return adminUser?.is_super_admin || false;
};

export default AdminContext;
