import { supabase } from './supabase';

interface TrustedDeviceResult {
  success: boolean;
  isTrusted?: boolean;
  error?: string;
}

class AdminTrustedDeviceService {
  private readonly TRUST_DURATION_HOURS = 2; // ساعتين

  // توليد بصمة الجهاز
  private generateDeviceFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx!.textBaseline = 'top';
    ctx!.font = '14px Arial';
    ctx!.fillText('Device fingerprint', 2, 2);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
      navigator.platform,
      navigator.cookieEnabled,
      localStorage.getItem('device_id') || this.generateDeviceId()
    ].join('|');

    // تشفير وتقصير أكثر لتجنب مشاكل URL
    const encoded = btoa(fingerprint);
    return encoded.substring(0, 32); // تقصير إلى 32 حرف
  }

  // توليد معرف فريد للجهاز
  private generateDeviceId(): string {
    const deviceId = 'device_' + Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15) + 
                     Date.now().toString(36);
    localStorage.setItem('device_id', deviceId);
    return deviceId;
  }

  // الحصول على IP العام
  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch (error) {
      console.warn('Could not get client IP:', error);
      return 'unknown';
    }
  }

  // فحص ما إذا كان الجهاز موثوق
  async isDeviceTrusted(adminId: string): Promise<TrustedDeviceResult> {
    try {
      const deviceFingerprint = this.generateDeviceFingerprint();
      const now = new Date().toISOString();

      console.log('🔍 Checking if device is trusted for admin:', adminId);
      console.log('📱 Device fingerprint:', deviceFingerprint.substring(0, 16) + '...');

      // استخدام RPC بدلاً من REST API لتجنب مشاكل URL الطويلة
      const { data, error } = await supabase
        .rpc('check_trusted_device', {
          p_admin_id: adminId,
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
          .from('admin_trusted_devices')
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
  async trustDevice(adminId: string): Promise<TrustedDeviceResult> {
    try {
      const deviceFingerprint = this.generateDeviceFingerprint();
      const ipAddress = await this.getClientIP();
      const userAgent = navigator.userAgent;
      const trustedUntil = new Date(Date.now() + this.TRUST_DURATION_HOURS * 60 * 60 * 1000).toISOString();

      console.log('🔐 Trusting device for admin:', adminId);
      console.log('⏰ Trusted until:', trustedUntil);

      // استخدام RPC لإضافة الجهاز الموثوق
      const { data, error } = await supabase
        .rpc('add_trusted_device', {
          p_admin_id: adminId,
          p_device_fingerprint: deviceFingerprint,
          p_ip_address: ipAddress,
          p_user_agent: userAgent,
          p_trusted_until: trustedUntil
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
  async untrustDevice(adminId: string): Promise<TrustedDeviceResult> {
    try {
      const deviceFingerprint = this.generateDeviceFingerprint();

      console.log('🚫 Untrusting device for admin:', adminId);

      const { data, error } = await supabase
        .rpc('remove_trusted_device', {
          p_admin_id: adminId,
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

  // تنظيف الأجهزة المنتهية الصلاحية
  async cleanupExpiredDevices(): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('admin_trusted_devices')
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

  // الحصول على قائمة الأجهزة الموثوقة للمشرف
  async getTrustedDevices(adminId: string) {
    try {
      const { data, error } = await supabase
        .from('admin_trusted_devices')
        .select('*')
        .eq('admin_id', adminId)
        .gt('trusted_until', new Date().toISOString())
        .order('last_used_at', { ascending: false });

      if (error) {
        console.error('❌ Error getting trusted devices:', error);
        return { success: false, error: 'فشل في جلب الأجهزة الموثوقة' };
      }

      return { success: true, devices: data };
    } catch (error) {
      console.error('❌ Error in get trusted devices:', error);
      return { success: false, error: 'خطأ غير متوقع' };
    }
  }
}

export const adminTrustedDeviceService = new AdminTrustedDeviceService();
