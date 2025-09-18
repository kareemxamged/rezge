import { supabase } from './supabase';
import { adminTwoFactorService } from './adminTwoFactorService';
import { adminTrustedDeviceService } from './adminTrustedDeviceService';
import { notificationEmailService } from './notificationEmailService';

// أنواع البيانات للنظام الإداري المنفصل
export interface AdminAccount {
  id: string;
  user_id?: string; // معرف المستخدم في جدول users
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role_id?: string;
  is_active: boolean;
  is_super_admin: boolean;
  last_login_at?: string;
  failed_login_attempts: number;
  locked_until?: string;
  profile_image_url?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminSession {
  id: string;
  admin_account_id: string;
  session_token: string;
  ip_address?: string;
  user_agent?: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

export interface AdminLoginResult {
  success: boolean;
  account?: AdminAccount;
  session_token?: string;
  error?: string;
  locked_until?: string;
  requiresTwoFactor?: boolean;
  message?: string;
}

class SeparateAdminAuthService {
  private currentSession: AdminSession | null = null;
  private currentAccount: AdminAccount | null = null;
  private lastValidationTime: number = 0;
  private validationCacheDuration: number = 10000; // 10 ثواني لضمان البيانات الحديثة

  // تسجيل الدخول للإدارة مع فصل كامل عن نظام المستخدمين
  async login(username: string, password: string): Promise<AdminLoginResult> {
    try {
      console.log('🔐 Admin login attempt for:', username);

      // التأكد من عدم وجود جلسة مستخدم عادي نشطة
      const { data: { session: userSession } } = await supabase.auth.getSession();
      if (userSession) {
        console.log('⚠️ User session detected, this should not interfere with admin login');
        // لا نقوم بتسجيل خروج المستخدم العادي - الأنظمة منفصلة
      }

      // استدعاء دالة التحقق من كلمة المرور مع معالجة محسنة للأخطاء
      const { data, error } = await supabase
        .rpc('verify_admin_password', {
          username_input: username,
          password_input: password
        });

      if (error) {
        console.error('❌ Database error during admin login:', error);

        // استخدام معالج الأخطاء المحسن للإداريين
        try {
          const { handleJWTError } = await import('../utils/jwtErrorHandler');
          const result = await handleJWTError(error, 'admin_login', 'admin');

          if (result.shouldNotifyUser) {
            return {
              success: false,
              error: result.message
            };
          }
        } catch (handlerError) {
          console.error('❌ Error in admin JWT handler:', handlerError);
        }

        // معالجة تقليدية كـ fallback
        if (error.message?.includes('JWT expired') || error.code === 'PGRST301') {
          console.log('🔑 JWT expired during admin login, this is expected for admin operations');
          return {
            success: false,
            error: 'انتهت جلسة الإدارة. يرجى تسجيل الدخول مرة أخرى.'
          };
        }

        return {
          success: false,
          error: 'حدث خطأ في النظام. يرجى المحاولة لاحقاً.'
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          error: 'اسم المستخدم أو كلمة المرور غير صحيحة'
        };
      }

      const result = data[0];

      if (!result.is_valid) {
        // التحقق من حالة القفل
        const { data: accountData } = await supabase
          .from('admin_accounts')
          .select('locked_until, failed_login_attempts')
          .eq('username', username)
          .single();

        if (accountData?.locked_until && new Date(accountData.locked_until) > new Date()) {
          return {
            success: false,
            error: 'الحساب مقفل مؤقتاً بسبب المحاولات الفاشلة المتكررة',
            locked_until: accountData.locked_until
          };
        }

        // إرسال إشعار محاولة تسجيل دخول فاشلة للمشرف
        try {
          // الحصول على بيانات المشرف للإشعار
          const { data: adminData } = await supabase
            .from('admin_accounts')
            .select('email, first_name, last_name')
            .eq('username', username)
            .single();

          if (adminData) {
            const ipAddress = await this.getClientIP();
            const userAgent = navigator.userAgent;

            await notificationEmailService.sendAdminFailedLoginNotification(
              adminData.email,
              `${adminData.first_name} ${adminData.last_name}`,
              username,
              {
                timestamp: new Date().toISOString(),
                ipAddress,
                userAgent,
                loginMethod: 'normal',
                adminUsername: username
              }
            );
            console.log('✅ تم إرسال إشعار محاولة تسجيل الدخول الفاشلة للمشرف');
          }
        } catch (emailError) {
          console.error('⚠️ فشل في إرسال إشعار محاولة تسجيل الدخول الفاشلة للمشرف:', emailError);
          // لا نؤثر على نتيجة تسجيل الدخول
        }

        return {
          success: false,
          error: `اسم المستخدم أو كلمة المرور غير صحيحة. المحاولات المتبقية: ${Math.max(0, 5 - (accountData?.failed_login_attempts || 0))}`
        };
      }

      // الحصول على بيانات الحساب
      const account = result.account_data as AdminAccount;

      // تنظيف الأجهزة المنتهية الصلاحية
      adminTrustedDeviceService.cleanupExpiredDevices();

      // فحص ما إذا كان الجهاز موثوق
      console.log('🔍 Checking if device is trusted for admin:', account.username);
      const deviceTrustResult = await adminTrustedDeviceService.isDeviceTrusted(account.id);

      if (deviceTrustResult.success && deviceTrustResult.isTrusted) {
        console.log('✅ Device is trusted, skipping 2FA');

        // إنشاء جلسة مباشرة للجهاز الموثوق
        const sessionToken = this.generateSessionToken();
        const ipAddress = await this.getClientIP();
        const userAgent = navigator.userAgent;

        const { data: sessionData, error: sessionError } = await supabase
          .rpc('create_admin_session', {
            admin_id: account.id,
            session_token: sessionToken,
            ip_addr: ipAddress,
            user_agent_str: userAgent
          });

        if (sessionError) {
          console.error('❌ Error creating admin session:', sessionError);
          return {
            success: false,
            error: 'حدث خطأ في إنشاء الجلسة'
          };
        }

        // حفظ الجلسة محلياً
        this.currentAccount = account;

        // حفظ في localStorage
        localStorage.setItem('admin_session_token', sessionToken);
        localStorage.setItem('admin_account', JSON.stringify(account));

        // تسجيل النشاط
        await this.logActivity(account.id, 'login_trusted_device', 'تسجيل دخول من جهاز موثوق');

        // إرسال إشعار تسجيل الدخول الناجح للمشرف (جهاز موثوق)
        try {
          await notificationEmailService.sendAdminSuccessfulLoginNotification(
            account.email,
            `${account.first_name} ${account.last_name}`,
            account.username,
            {
              timestamp: new Date().toISOString(),
              ipAddress,
              userAgent,
              loginMethod: 'trusted_device',
              adminRole: account.is_super_admin ? 'super_admin' : 'admin',
              adminUsername: account.username
            }
          );
          console.log('✅ تم إرسال إشعار تسجيل الدخول الناجح للمشرف (جهاز موثوق)');
        } catch (emailError) {
          console.error('⚠️ فشل في إرسال إشعار تسجيل الدخول الناجح للمشرف:', emailError);
          // لا نفشل تسجيل الدخول إذا فشل إرسال الإشعار
        }

        console.log('✅ Admin login successful for trusted device:', account.username);

        return {
          success: true,
          account,
          session_token: sessionToken
        };
      }

      // الجهاز غير موثوق، إرسال كود التحقق الإضافي
      console.log('📧 Device not trusted, sending 2FA code for admin:', account.username);
      const twoFactorResult = await adminTwoFactorService.sendVerificationCode(account.id, account.email);

      if (!twoFactorResult.success) {
        console.error('❌ Failed to send 2FA code:', twoFactorResult.error);
        return {
          success: false,
          error: twoFactorResult.error || 'فشل في إرسال كود التحقق'
        };
      }

      console.log('✅ 2FA code sent successfully');

      // إرجاع نجاح مؤقت مع الحاجة للتحقق الإضافي
      return {
        success: true,
        requiresTwoFactor: true,
        account,
        message: 'تم إرسال كود التحقق إلى بريدك الإلكتروني'
      };

    } catch (error) {
      console.error('💥 Unexpected error during admin login:', error);
      return {
        success: false,
        error: 'حدث خطأ غير متوقع'
      };
    }
  }

  // إكمال تسجيل الدخول بعد التحقق الإضافي
  async completeTwoFactorLogin(adminId: string): Promise<AdminLoginResult> {
    try {
      console.log('🔐 Completing 2FA login for admin:', adminId);

      // الحصول على بيانات الحساب
      const { data: accountData, error: accountError } = await supabase
        .from('admin_accounts')
        .select('*')
        .eq('id', adminId)
        .single();

      if (accountError || !accountData) {
        console.error('❌ Error fetching admin account:', accountError);
        return {
          success: false,
          error: 'حدث خطأ في الحصول على بيانات الحساب'
        };
      }

      // إنشاء جلسة جديدة
      const sessionToken = this.generateSessionToken();
      const ipAddress = await this.getClientIP();
      const userAgent = navigator.userAgent;

      const { data: sessionData, error: sessionError } = await supabase
        .rpc('create_admin_session', {
          admin_id: adminId,
          session_token: sessionToken,
          ip_addr: ipAddress,
          user_agent_str: userAgent
        });

      if (sessionError) {
        console.error('❌ Error creating admin session:', sessionError);
        return {
          success: false,
          error: 'حدث خطأ في إنشاء الجلسة'
        };
      }

      // حفظ الجلسة محلياً
      const account = accountData as AdminAccount;
      this.currentAccount = account;

      // حفظ في localStorage
      localStorage.setItem('admin_session_token', sessionToken);
      localStorage.setItem('admin_account', JSON.stringify(account));

      // حفظ الجهاز كموثوق لمدة ساعتين
      const trustResult = await adminTrustedDeviceService.trustDevice(account.id);
      if (trustResult.success) {
        console.log('✅ Device marked as trusted for 2 hours');
      } else {
        console.warn('⚠️ Failed to mark device as trusted:', trustResult.error);
      }

      // تسجيل النشاط
      await this.logActivity(account.id, 'login_2fa_complete', 'تسجيل دخول مكتمل مع التحقق الإضافي');

      // إرسال إشعار تسجيل الدخول الناجح للمشرف (بعد المصادقة الثنائية)
      try {
        await notificationEmailService.sendAdminSuccessfulLoginNotification(
          account.email,
          `${account.first_name} ${account.last_name}`,
          account.username,
          {
            timestamp: new Date().toISOString(),
            ipAddress,
            userAgent,
            loginMethod: 'two_factor',
            adminRole: account.is_super_admin ? 'super_admin' : 'admin',
            adminUsername: account.username
          }
        );
        console.log('✅ تم إرسال إشعار تسجيل الدخول الناجح للمشرف (بعد المصادقة الثنائية)');
      } catch (emailError) {
        console.error('⚠️ فشل في إرسال إشعار تسجيل الدخول الناجح للمشرف:', emailError);
        // لا نفشل تسجيل الدخول إذا فشل إرسال الإشعار
      }

      console.log('✅ Admin 2FA login completed for:', account.username);

      return {
        success: true,
        account,
        session_token: sessionToken
      };

    } catch (error) {
      console.error('💥 Unexpected error during 2FA completion:', error);
      return {
        success: false,
        error: 'حدث خطأ غير متوقع'
      };
    }
  }

  // إزالة الثقة من الجهاز يدوياً (للحالات الخاصة)
  async forgetDevice(): Promise<void> {
    if (this.currentAccount) {
      const untrustResult = await adminTrustedDeviceService.untrustDevice(this.currentAccount.id);
      if (untrustResult.success) {
        console.log('✅ Device trust removed manually');
      } else {
        console.warn('⚠️ Failed to remove device trust:', untrustResult.error);
      }
    }
  }

  // تسجيل الخروج
  async logout(): Promise<void> {
    try {
      const sessionToken = localStorage.getItem('admin_session_token');
      
      if (sessionToken && this.currentAccount) {
        // إلغاء تفعيل الجلسة في قاعدة البيانات
        await supabase
          .from('admin_sessions')
          .update({ is_active: false })
          .eq('session_token', sessionToken);

        // لا نزيل الثقة من الجهاز عند تسجيل الخروج العادي
        // الثقة تبقى لمدة ساعتين حتى لو سجل المشرف خروج ودخول
        console.log('ℹ️ Device trust maintained after logout (expires in 2 hours)');

        // تسجيل النشاط
        await this.logActivity(this.currentAccount.id, 'logout', 'تسجيل خروج');
      }

      // مسح البيانات المحلية
      localStorage.removeItem('admin_session_token');
      localStorage.removeItem('admin_account');
      this.currentSession = null;
      this.currentAccount = null;

      console.log('✅ Admin logout successful');
    } catch (error) {
      console.error('❌ Error during admin logout:', error);
    }
  }

  // التحقق من صحة الجلسة
  async validateSession(): Promise<boolean> {
    try {
      const now = Date.now();

      // استخدام cache إذا كان التحقق حديث
      if (this.currentAccount && this.currentSession &&
          (now - this.lastValidationTime) < this.validationCacheDuration) {
        console.log('✅ Using cached session validation');
        return true;
      }

      const sessionToken = localStorage.getItem('admin_session_token');
      const storedAccountData = localStorage.getItem('admin_account');

      if (!sessionToken || !storedAccountData) {
        console.log('🔍 No session token or account data found');
        return false;
      }

      // التحقق من صحة رمز الجلسة (يجب أن يكون نص وليس JSON)
      if (!this.isValidSessionToken(sessionToken)) {
        console.log('❌ Invalid session token format');
        this.clearSession();
        return false;
      }

      console.log('🔍 Validating session token:', sessionToken);

      // التحقق من صحة بيانات الحساب المحفوظة
      let accountData;
      try {
        accountData = JSON.parse(storedAccountData);
        if (!this.isValidAccountData(accountData)) {
          console.log('❌ Invalid account data structure');
          this.clearSession();
          return false;
        }
      } catch (parseError) {
        console.log('❌ Failed to parse account data');
        this.clearSession();
        return false;
      }

      // التحقق من الجلسة في قاعدة البيانات مع فصل كامل عن نظام المستخدمين
      const { data: sessionData, error: sessionError } = await supabase
        .from('admin_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (sessionError) {
        console.error('❌ Admin session validation error:', sessionError);

        // معالجة خاصة لأخطاء JWT في نظام الإدارة المنفصل
        if (sessionError.message?.includes('JWT expired') || sessionError.code === 'PGRST301') {
          console.log('🔑 Admin JWT expired during session validation');
          this.clearSession();
          return false;
        }

        this.clearSession();
        return false;
      }

      if (!sessionData) {
        console.log('⚠️ No valid session found');
        this.clearSession();
        return false;
      }

      console.log('✅ Session found:', sessionData.id);

      // الحصول على بيانات الحساب الحديثة من قاعدة البيانات للتأكد من الحالة
      const { data: freshAccountData, error: accountError } = await supabase
        .from('admin_accounts')
        .select('*')
        .eq('id', sessionData.admin_account_id)
        .single();

      if (accountError || !freshAccountData) {
        console.error('❌ Error fetching fresh account data:', accountError);
        this.clearSession();
        return false;
      }

      // تحديث البيانات المحلية بالبيانات الحديثة
      this.currentAccount = freshAccountData;
      this.currentSession = sessionData;
      this.lastValidationTime = now;

      // حفظ البيانات المحدثة في localStorage
      localStorage.setItem('admin_account', JSON.stringify(freshAccountData));

      console.log('✅ Session validation successful for:', freshAccountData.username);
      console.log('✅ Account status - Active:', freshAccountData.is_active, 'Super Admin:', freshAccountData.is_super_admin);

      return true;

    } catch (error) {
      console.error('❌ Error validating admin session:', error);
      this.clearSession();
      return false;
    }
  }

  // الحصول على الحساب الحالي
  getCurrentAccount(): AdminAccount | null {
    if (this.currentAccount) {
      return this.currentAccount;
    }

    const accountData = localStorage.getItem('admin_account');
    if (accountData) {
      try {
        this.currentAccount = JSON.parse(accountData);
        return this.currentAccount;
      } catch (error) {
        console.error('❌ Error parsing stored admin account:', error);
        this.clearSession();
      }
    }

    return null;
  }

  // إعادة تحميل بيانات الحساب من قاعدة البيانات
  async refreshAccountData(): Promise<boolean> {
    try {
      const currentAccount = this.getCurrentAccount();
      if (!currentAccount) {
        return false;
      }

      const { data: freshAccountData, error } = await supabase
        .from('admin_accounts')
        .select('*')
        .eq('id', currentAccount.id)
        .single();

      if (error || !freshAccountData) {
        console.error('❌ Error refreshing account data:', error);
        return false;
      }

      // تحديث البيانات
      this.currentAccount = freshAccountData;
      localStorage.setItem('admin_account', JSON.stringify(freshAccountData));

      console.log('✅ Account data refreshed for:', freshAccountData.username);
      return true;
    } catch (error) {
      console.error('❌ Error in refreshAccountData:', error);
      return false;
    }
  }

  // تسجيل النشاط
  async logActivity(
    adminId: string,
    actionType: string,
    description: string,
    targetType?: string,
    targetId?: string,
    details?: any
  ): Promise<void> {
    try {
      const ipAddress = await this.getClientIP();
      
      await supabase
        .from('admin_activity_log')
        .insert({
          admin_account_id: adminId,
          action_type: actionType,
          action_description: description,
          target_type: targetType,
          target_id: targetId,
          ip_address: ipAddress,
          user_agent: navigator.userAgent,
          details: details
        });
    } catch (error) {
      console.error('❌ Error logging admin activity:', error);
    }
  }

  // مسح الجلسة مع حماية إضافية
  private clearSession(): void {
    try {
      // التأكد من أن هذا مسح مقصود وليس خطأ
      console.log('🧹 Clearing admin session...');

      localStorage.removeItem('admin_session_token');
      localStorage.removeItem('admin_account');
      this.currentSession = null;
      this.currentAccount = null;
      this.lastValidationTime = 0; // مسح cache

      console.log('✅ Admin session cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing admin session:', error);
    }
  }

  // دالة للتحقق من صحة رمز الجلسة
  private isValidSessionToken(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // رمز الجلسة يجب أن يحتوي على UUID وtimestamp
    const parts = token.split('_');
    if (parts.length < 3) {
      return false;
    }

    // التحقق من أن الجزء الأول UUID صالح
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(parts[0])) {
      return false;
    }

    // التحقق من أن الجزء الثاني timestamp صالح
    const timestamp = parseInt(parts[1]);
    if (isNaN(timestamp) || timestamp <= 0) {
      return false;
    }

    return true;
  }

  // دالة للتحقق من صحة بيانات الحساب
  private isValidAccountData(accountData: any): boolean {
    if (!accountData || typeof accountData !== 'object') {
      return false;
    }

    // التحقق من وجود الحقول المطلوبة
    const requiredFields = ['id', 'username', 'email', 'is_active'];
    for (const field of requiredFields) {
      if (!accountData.hasOwnProperty(field)) {
        return false;
      }
    }

    // التحقق من صحة UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(accountData.id)) {
      return false;
    }

    // التحقق من أن الحساب نشط
    if (!accountData.is_active) {
      return false;
    }

    return true;
  }

  // توليد رمز الجلسة
  private generateSessionToken(): string {
    return crypto.randomUUID() + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // الحصول على IP العميل
  private async getClientIP(): Promise<string | null> {
    try {
      // في بيئة الإنتاج، يمكن استخدام خدمة للحصول على IP
      return null; // سيتم تحديثه لاحقاً
    } catch (error) {
      return null;
    }
  }

  // تغيير كلمة المرور
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const account = this.getCurrentAccount();
      if (!account) {
        return { success: false, error: 'لم يتم العثور على الحساب' };
      }

      // التحقق من كلمة المرور الحالية
      const { data } = await supabase
        .rpc('verify_admin_password', {
          username_input: account.username,
          password_input: currentPassword
        });

      if (!data || data.length === 0 || !data[0].is_valid) {
        return { success: false, error: 'كلمة المرور الحالية غير صحيحة' };
      }

      // تشفير كلمة المرور الجديدة
      const { data: hashedPassword } = await supabase
        .rpc('hash_admin_password', { password: newPassword });

      // تحديث كلمة المرور
      const { error } = await supabase
        .from('admin_accounts')
        .update({
          password_hash: hashedPassword,
          password_changed_at: new Date().toISOString(),
          must_change_password: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', account.id);

      if (error) {
        return { success: false, error: 'حدث خطأ في تحديث كلمة المرور' };
      }

      // تسجيل النشاط
      await this.logActivity(account.id, 'password_change', 'تغيير كلمة المرور');

      return { success: true };
    } catch (error) {
      console.error('❌ Error changing admin password:', error);
      return { success: false, error: 'حدث خطأ غير متوقع' };
    }
  }

  // الحصول على قائمة المشرفين (للسوبر أدمن فقط)
  async getAdminAccounts(): Promise<AdminAccount[]> {
    try {
      const currentAccount = this.getCurrentAccount();
      if (!currentAccount?.is_super_admin) {
        throw new Error('غير مصرح لك بعرض قائمة المشرفين');
      }

      const { data, error } = await supabase
        .from('admin_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error fetching admin accounts:', error);
      return [];
    }
  }
}

export const separateAdminAuth = new SeparateAdminAuthService();
