// مساعد تشخيص مشاكل الإدارة
import { separateAdminAuth } from '../lib/separateAdminAuth';

export const adminDebugHelper = {
  // طباعة معلومات الجلسة الحالية
  printSessionInfo: () => {
    console.log('🔍 Admin Debug Info:');
    console.log('Session Token:', localStorage.getItem('admin_session_token'));
    console.log('Stored Account:', localStorage.getItem('admin_account'));
    
    const account = separateAdminAuth.getCurrentAccount();
    if (account) {
      console.log('Current Account:', {
        id: account.id,
        username: account.username,
        email: account.email,
        is_active: account.is_active,
        is_super_admin: account.is_super_admin
      });
    } else {
      console.log('No current account found');
    }
  },

  // مسح البيانات المحلية
  clearLocalData: () => {
    console.log('🧹 Clearing local admin data...');
    localStorage.removeItem('admin_session_token');
    localStorage.removeItem('admin_account');
    console.log('✅ Local data cleared');
  },

  // إعادة تحميل بيانات الحساب
  refreshAccount: async () => {
    console.log('🔄 Refreshing account data...');
    const success = await separateAdminAuth.refreshAccountData();
    if (success) {
      console.log('✅ Account data refreshed successfully');
      adminDebugHelper.printSessionInfo();
    } else {
      console.log('❌ Failed to refresh account data');
    }
    return success;
  },

  // اختبار التحقق من الجلسة
  testValidation: async () => {
    console.log('🧪 Testing session validation...');
    const isValid = await separateAdminAuth.validateSession();
    console.log('Validation result:', isValid);
    
    if (isValid) {
      adminDebugHelper.printSessionInfo();
    }
    
    return isValid;
  },

  // إعادة تعيين كامل
  fullReset: async () => {
    console.log('🔄 Performing full admin reset...');
    
    // مسح البيانات المحلية
    adminDebugHelper.clearLocalData();
    
    // تسجيل الخروج
    await separateAdminAuth.logout();
    
    console.log('✅ Full reset completed. Please login again.');
    
    // توجيه لصفحة تسجيل الدخول
    window.location.href = '/admin/login';
  }
};

// إتاحة الدوال في console للتشخيص
if (typeof window !== 'undefined') {
  (window as any).adminDebug = adminDebugHelper;
  console.log('🛠️ Admin debug helper available as window.adminDebug');
  console.log('Available methods:');
  console.log('- adminDebug.printSessionInfo()');
  console.log('- adminDebug.clearLocalData()');
  console.log('- adminDebug.refreshAccount()');
  console.log('- adminDebug.testValidation()');
  console.log('- adminDebug.fullReset()');
}
