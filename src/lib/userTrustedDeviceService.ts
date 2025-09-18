import { supabase } from './supabase';

interface TrustedDeviceResult {
  success: boolean;
  isTrusted?: boolean;
  error?: string;
}

interface UserVerificationResult {
  success: boolean;
  code?: string;
  expiresAt?: string;
  error?: string;
}

interface DeviceInfo {
  id: string;
  deviceFingerprint: string;
  ipAddress?: string;
  userAgent?: string;
  deviceName?: string;
  trustedUntil: string;
  createdAt: string;
  lastUsedAt: string;
  isCurrent: boolean;
}

class UserTrustedDeviceService {
  private readonly TRUST_DURATION_HOURS = 2; // ساعتين للمستخدمين العاديين (مثل المشرفين)

  /**
   * دالة آمنة لتشفير النصوص إلى Base64
   */
  private safeBase64Encode(str: string): string {
    try {
      // استخدام TextEncoder للتعامل مع UTF-8
      if (typeof TextEncoder !== 'undefined') {
        const encoder = new TextEncoder();
        const uint8Array = encoder.encode(str);
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        return btoa(binary);
      }

      // طريقة بديلة للمتصفحات القديمة
      return btoa(unescape(encodeURIComponent(str)));
    } catch (error) {
      console.warn('فشل في تشفير النص، استخدام طريقة بديلة:', error);
      // طريقة احتياطية - استخدام hash بسيط
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // تحويل إلى 32bit integer
      }
      return Math.abs(hash).toString(36);
    }
  }

  // توليد بصمة الجهاز
  private generateDeviceFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx!.textBaseline = 'top';
    ctx!.font = '14px Arial';
    ctx!.fillText('User device fingerprint', 2, 2);

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
      navigator.platform,
      navigator.cookieEnabled,
      localStorage.getItem('user_device_id') || this.generateDeviceId()
    ].join('|');

    // تشفير آمن وتقصير أكثر لتجنب مشاكل URL
    const encoded = this.safeBase64Encode(fingerprint);
    return encoded.substring(0, 32); // تقصير إلى 32 حرف
  }

  // توليد معرف فريد للجهاز
  private generateDeviceId(): string {
    const deviceId = 'user_device_' + Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
    localStorage.setItem('user_device_id', deviceId);
    return deviceId;
  }

  // الحصول على عنوان IP للعميل
  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch (error) {
      console.warn('Failed to get client IP:', error);
      return 'unknown';
    }
  }

  // فحص ما إذا كان الجهاز موثوق
  async isDeviceTrusted(userId: string): Promise<TrustedDeviceResult> {
    try {
      const deviceFingerprint = this.generateDeviceFingerprint();
      const now = new Date().toISOString();

      console.log('🔍 Checking if device is trusted for user:', userId);
      console.log('📱 Device fingerprint:', deviceFingerprint.substring(0, 16) + '...');

      // استخدام RPC بدلاً من REST API لتجنب مشاكل URL الطويلة
      const { data, error } = await supabase
        .rpc('check_user_trusted_device', {
          p_user_id: userId,
          p_device_fingerprint: deviceFingerprint,
          p_current_time: now
        });

      if (error) {
        console.error('❌ Error checking trusted device:', error);
        return { success: false, error: 'خطأ في فحص الجهاز الموثوق' };
      }

      if (data && data.length > 0) {
        const deviceRecord = data[0];
        console.log('✅ Device is trusted until:', deviceRecord.trusted_until);

        // تحديث آخر استخدام
        await supabase
          .from('user_trusted_devices')
          .update({ last_used_at: now })
          .eq('id', deviceRecord.id);

        return { success: true, isTrusted: true };
      }

      console.log('⚠️ Device is not trusted');
      return { success: true, isTrusted: false };

    } catch (error) {
      console.error('❌ Error in device trust check:', error);
      return { success: false, error: 'خطأ غير متوقع' };
    }
  }

  // إضافة الجهاز كموثوق
  async trustDevice(userId: string, deviceName?: string): Promise<TrustedDeviceResult> {
    try {
      const deviceFingerprint = this.generateDeviceFingerprint();
      const ipAddress = await this.getClientIP();
      const userAgent = navigator.userAgent;
      const trustedUntil = new Date(Date.now() + this.TRUST_DURATION_HOURS * 60 * 60 * 1000).toISOString();

      console.log('🔐 Trusting device for user:', userId);
      console.log('⏰ Trusted until:', trustedUntil);

      // استخدام RPC لإضافة الجهاز الموثوق
      const { data, error } = await supabase
        .rpc('add_user_trusted_device', {
          p_user_id: userId,
          p_device_fingerprint: deviceFingerprint,
          p_ip_address: ipAddress,
          p_user_agent: userAgent,
          p_trusted_until: trustedUntil,
          p_device_name: deviceName || this.getDeviceName()
        });

      if (error || !data) {
        console.error('❌ Error trusting device:', error);
        return { success: false, error: 'فشل في حفظ الجهاز الموثوق' };
      }

      console.log('✅ Device trusted successfully');
      return { success: true };

    } catch (error) {
      console.error('❌ Error in device trust:', error);
      return { success: false, error: 'خطأ غير متوقع' };
    }
  }

  // إزالة الثقة من الجهاز (عند تسجيل الخروج الصريح)
  async untrustDevice(userId: string): Promise<TrustedDeviceResult> {
    try {
      const deviceFingerprint = this.generateDeviceFingerprint();

      console.log('🚫 Untrusting device for user:', userId);

      const { data, error } = await supabase
        .rpc('remove_user_trusted_device', {
          p_user_id: userId,
          p_device_fingerprint: deviceFingerprint
        });

      if (error || !data) {
        console.error('❌ Error untrusting device:', error);
        return { success: false, error: 'فشل في إزالة الثقة من الجهاز' };
      }

      console.log('✅ Device untrusted successfully');
      return { success: true };

    } catch (error) {
      console.error('❌ Error in device untrust:', error);
      return { success: false, error: 'خطأ غير متوقع' };
    }
  }

  // إزالة جهاز محدد من قائمة الأجهزة الموثقة
  async removeSpecificDevice(userId: string, deviceId: string): Promise<TrustedDeviceResult> {
    try {
      console.log('🗑️ Removing specific device:', deviceId);

      const { error } = await supabase
        .from('user_trusted_devices')
        .delete()
        .eq('id', deviceId)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error removing device:', error);
        return { success: false, error: 'فشل في إزالة الجهاز' };
      }

      console.log('✅ Device removed successfully');
      return { success: true };

    } catch (error) {
      console.error('❌ Error in device removal:', error);
      return { success: false, error: 'خطأ غير متوقع' };
    }
  }

  // تنظيف الأجهزة المنتهية الصلاحية
  async cleanupExpiredDevices(): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('user_trusted_devices')
        .delete()
        .lt('trusted_until', now);

      if (error) {
        console.error('❌ Error cleaning up expired devices:', error);
      } else {
        console.log('🧹 Cleaned up expired trusted devices');
      }
    } catch (error) {
      console.error('❌ Error in cleanup:', error);
    }
  }

  // الحصول على قائمة الأجهزة الموثوقة للمستخدم
  async getTrustedDevices(userId: string): Promise<{ success: boolean; devices?: DeviceInfo[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_trusted_devices_list', {
          p_user_id: userId
        });

      if (error) {
        console.error('❌ Error getting trusted devices:', error);
        return { success: false, error: 'فشل في جلب الأجهزة الموثوقة' };
      }

      const devices: DeviceInfo[] = data?.map((device: any) => ({
        id: device.id,
        deviceFingerprint: device.device_fingerprint,
        ipAddress: device.ip_address,
        userAgent: device.user_agent,
        deviceName: device.device_name || this.parseDeviceName(device.user_agent),
        trustedUntil: device.trusted_until,
        createdAt: device.created_at,
        lastUsedAt: device.last_used_at,
        isCurrent: device.is_current
      })) || [];

      return { success: true, devices };
    } catch (error) {
      console.error('❌ Error in get trusted devices:', error);
      return { success: false, error: 'خطأ غير متوقع' };
    }
  }

  // إنشاء كود تحقق للمستخدم
  async createVerificationCode(userId: string, type: 'login' | 'device_trust' | 'password_reset' = 'login'): Promise<UserVerificationResult> {
    try {
      console.log('📧 Creating verification code for user:', userId, 'type:', type);

      const { data, error } = await supabase
        .rpc('create_user_verification_code', {
          p_user_id: userId,
          p_verification_type: type
        });

      if (error || !data || data.length === 0) {
        console.error('❌ Error creating verification code:', error);
        return { success: false, error: 'فشل في إنشاء كود التحقق' };
      }

      const result = data[0];
      console.log('✅ Verification code created successfully');

      return {
        success: true,
        code: result.code,
        expiresAt: result.expires_at
      };

    } catch (error) {
      console.error('❌ Error in create verification code:', error);
      return { success: false, error: 'خطأ غير متوقع' };
    }
  }

  // التحقق من كود التحقق
  async verifyCode(userId: string, code: string, type: 'login' | 'device_trust' | 'password_reset' = 'login'): Promise<TrustedDeviceResult> {
    try {
      console.log('🔍 Verifying code for user:', userId, 'type:', type);

      const { data, error } = await supabase
        .rpc('verify_user_code', {
          p_user_id: userId,
          p_code: code,
          p_verification_type: type
        });

      if (error) {
        console.error('❌ Error verifying code:', error);
        return { success: false, error: 'خطأ في التحقق من الكود' };
      }

      const isValid = data === true;
      console.log(isValid ? '✅ Code verified successfully' : '❌ Invalid or expired code');

      return { success: true, isTrusted: isValid };

    } catch (error) {
      console.error('❌ Error in code verification:', error);
      return { success: false, error: 'خطأ غير متوقع' };
    }
  }

  // الحصول على اسم الجهاز من User Agent
  private parseDeviceName(userAgent: string): string {
    if (!userAgent) return 'جهاز غير معروف';

    // تحديد نوع الجهاز
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      if (/iPhone/.test(userAgent)) return 'iPhone';
      if (/iPad/.test(userAgent)) return 'iPad';
      if (/Android/.test(userAgent)) return 'جهاز Android';
      return 'جهاز محمول';
    }

    // تحديد المتصفح
    if (/Chrome/.test(userAgent)) return 'متصفح Chrome';
    if (/Firefox/.test(userAgent)) return 'متصفح Firefox';
    if (/Safari/.test(userAgent)) return 'متصفح Safari';
    if (/Edge/.test(userAgent)) return 'متصفح Edge';

    return 'جهاز كمبيوتر';
  }

  // الحصول على اسم الجهاز الحالي
  private getDeviceName(): string {
    return this.parseDeviceName(navigator.userAgent);
  }

  // إحصائيات الأجهزة الموثقة للمستخدم
  async getDeviceStats(userId: string): Promise<{ success: boolean; stats?: any; error?: string }> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_trusted_devices_stats', {
          p_user_id: userId
        });

      if (error) {
        console.error('❌ Error getting device stats:', error);
        return { success: false, error: 'فشل في جلب إحصائيات الأجهزة' };
      }

      return { success: true, stats: data?.[0] || {} };
    } catch (error) {
      console.error('❌ Error in get device stats:', error);
      return { success: false, error: 'خطأ غير متوقع' };
    }
  }
}

export const userTrustedDeviceService = new UserTrustedDeviceService();
export type { TrustedDeviceResult, UserVerificationResult, DeviceInfo };
