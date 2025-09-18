/**
 * خدمة الأمان المتقدمة للأجهزة
 * تدير منع الأجهزة المشبوهة ومكافحة التلاعب والـ VPN
 */

import { supabase } from './supabase';
import { deviceFingerprintingService, type DeviceFingerprint } from './deviceFingerprinting';

export interface DeviceSecurityResult {
  allowed: boolean;
  reason?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  deviceFingerprint: string;
  blockedUntil?: Date;
  suspiciousActivities: string[];
}

export interface SecurityEvent {
  id: string;
  device_fingerprint: string;
  event_type: 'vpn_detected' | 'proxy_detected' | 'automation_detected' | 'fingerprint_mismatch' | 'suspicious_behavior' | 'rate_limit_exceeded';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  event_data: any;
  ip_address?: string;
  user_agent?: string;
  email?: string;
  action_taken?: string;
  created_at: string;
}

// إعدادات الأمان المتقدمة
export const ADVANCED_SECURITY_CONFIG = {
  // حدود المحاولات على مستوى الجهاز
  MAX_DEVICE_ATTEMPTS_HOURLY: 10,
  MAX_DEVICE_ATTEMPTS_DAILY: 25,
  
  // مدد المنع
  DEVICE_BLOCK_HOURS_SHORT: 6,    // 6 ساعات للمنع قصير المدى
  DEVICE_BLOCK_HOURS_LONG: 48,    // 48 ساعة للمنع طويل المدى
  DEVICE_BLOCK_HOURS_CRITICAL: 168, // أسبوع كامل للحالات الحرجة
  
  // عتبات الخطر
  RISK_THRESHOLD_MEDIUM: 3,
  RISK_THRESHOLD_HIGH: 5,
  RISK_THRESHOLD_CRITICAL: 8,
  
  // كشف VPN/Proxy
  VPN_DETECTION_ENABLED: true,
  PROXY_DETECTION_ENABLED: true,
  
  // كشف الأتمتة
  AUTOMATION_DETECTION_ENABLED: true,
  HEADLESS_DETECTION_ENABLED: true
};

class DeviceSecurityService {
  private static instance: DeviceSecurityService;
  
  public static getInstance(): DeviceSecurityService {
    if (!DeviceSecurityService.instance) {
      DeviceSecurityService.instance = new DeviceSecurityService();
    }
    return DeviceSecurityService.instance;
  }

  /**
   * فحص أمان الجهاز قبل السماح بالعملية
   */
  async checkDeviceSecurity(email: string, ipAddress?: string): Promise<DeviceSecurityResult> {
    try {
      // إنشاء بصمة الجهاز
      const fingerprint = await deviceFingerprintingService.generateFingerprint();
      
      // فحص الجهاز في قاعدة البيانات
      const deviceRecord = await this.getOrCreateDeviceRecord(fingerprint);
      
      // فحص حالة المنع
      const blockCheck = await this.checkDeviceBlocks(fingerprint.fingerprint);
      if (!blockCheck.allowed) {
        return blockCheck;
      }
      
      // فحص الأنشطة المشبوهة
      const suspiciousActivities = await this.detectSuspiciousActivities(fingerprint, ipAddress);
      
      // حساب مستوى الخطر
      const riskLevel = this.calculateRiskLevel(fingerprint, suspiciousActivities, deviceRecord);
      
      // فحص حدود المحاولات
      const rateLimitCheck = await this.checkRateLimits(fingerprint.fingerprint, email);
      
      // تسجيل الحدث الأمني إذا لزم الأمر
      if (suspiciousActivities.length > 0 || riskLevel !== 'low') {
        await this.logSecurityEvent({
          device_fingerprint: fingerprint.fingerprint,
          event_type: 'suspicious_behavior',
          severity: riskLevel,
          description: `Suspicious activities detected: ${suspiciousActivities.join(', ')}`,
          event_data: { suspiciousActivities, riskLevel },
          ip_address: ipAddress,
          user_agent: fingerprint.browser.userAgent,
          email
        });
      }
      
      // تحديد ما إذا كان يجب السماح بالعملية
      const shouldBlock = this.shouldBlockDevice(riskLevel, suspiciousActivities, rateLimitCheck);
      
      if (shouldBlock.block) {
        await this.blockDevice(fingerprint.fingerprint, shouldBlock.reason, shouldBlock.duration, email);
        
        return {
          allowed: false,
          reason: shouldBlock.reason,
          riskLevel,
          deviceFingerprint: fingerprint.fingerprint,
          blockedUntil: new Date(Date.now() + shouldBlock.duration * 60 * 60 * 1000),
          suspiciousActivities
        };
      }
      
      // تحديث سجل الجهاز
      await this.updateDeviceRecord(fingerprint.fingerprint, email);
      
      return {
        allowed: true,
        riskLevel,
        deviceFingerprint: fingerprint.fingerprint,
        suspiciousActivities
      };
      
    } catch (error) {
      console.error('Error in device security check:', error);
      
      // في حالة الخطأ، نسمح بالعملية لكن نسجل الحدث
      await this.logSecurityEvent({
        device_fingerprint: 'unknown',
        event_type: 'suspicious_behavior',
        severity: 'medium',
        description: `Security check failed: ${error}`,
        event_data: { error: (error as any)?.toString() || 'Unknown error' },
        ip_address: ipAddress,
        email
      });
      
      return {
        allowed: true,
        riskLevel: 'medium',
        deviceFingerprint: 'unknown',
        suspiciousActivities: ['security_check_failed']
      };
    }
  }

  /**
   * الحصول على سجل الجهاز أو إنشاؤه
   */
  private async getOrCreateDeviceRecord(fingerprint: DeviceFingerprint) {
    const { data: existing, error } = await supabase
      .from('device_fingerprints')
      .select('*')
      .eq('fingerprint_hash', fingerprint.fingerprint)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (existing) {
      return existing;
    }

    // إنشاء سجل جديد
    const { data: newRecord, error: insertError } = await supabase
      .from('device_fingerprints')
      .insert({
        fingerprint_hash: fingerprint.fingerprint,
        device_data: fingerprint,
        total_attempts: 0,
        failed_attempts: 0,
        successful_attempts: 0,
        risk_level: 'low',
        associated_emails: []
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return newRecord;
  }

  /**
   * فحص حالات المنع النشطة
   */
  private async checkDeviceBlocks(deviceFingerprint: string): Promise<DeviceSecurityResult> {
    const { data: activeBlocks, error } = await supabase
      .from('device_blocks')
      .select('*')
      .eq('device_fingerprint', deviceFingerprint)
      .eq('is_active', true)
      .gt('blocked_until', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    if (activeBlocks && activeBlocks.length > 0) {
      const block = activeBlocks[0];
      const blockedUntil = new Date(block.blocked_until);
      const hoursRemaining = Math.ceil((blockedUntil.getTime() - Date.now()) / (1000 * 60 * 60));

      return {
        allowed: false,
        reason: `الجهاز محظور: ${block.block_reason}. يرجى المحاولة بعد ${hoursRemaining} ساعة.`,
        riskLevel: 'critical',
        deviceFingerprint,
        blockedUntil,
        suspiciousActivities: []
      };
    }

    return {
      allowed: true,
      riskLevel: 'low',
      deviceFingerprint,
      suspiciousActivities: []
    };
  }

  /**
   * كشف الأنشطة المشبوهة
   */
  private async detectSuspiciousActivities(fingerprint: DeviceFingerprint, ipAddress?: string): Promise<string[]> {
    const suspiciousActivities: string[] = [];

    // كشف الأتمتة
    if (fingerprint.security.webdriver) suspiciousActivities.push('webdriver_detected');
    if (fingerprint.security.phantom) suspiciousActivities.push('phantom_detected');
    if (fingerprint.security.selenium) suspiciousActivities.push('selenium_detected');
    if (fingerprint.security.headless) suspiciousActivities.push('headless_browser');
    if (fingerprint.security.automation) suspiciousActivities.push('automation_detected');

    // كشف VPN/Proxy (فحص بسيط بناءً على خصائص الشبكة)
    if (ipAddress) {
      const vpnDetected = await this.detectVPN(ipAddress);
      if (vpnDetected) suspiciousActivities.push('vpn_detected');
    }

    // فحص تطابق البصمة مع السجلات السابقة
    const fingerprintMismatch = await this.checkFingerprintConsistency(fingerprint);
    if (fingerprintMismatch.length > 0) {
      suspiciousActivities.push(...fingerprintMismatch);
    }

    // فحص خصائص غير طبيعية
    if (fingerprint.screen.width === 0 || fingerprint.screen.height === 0) {
      suspiciousActivities.push('invalid_screen_dimensions');
    }

    if (fingerprint.system.fonts.length < 5) {
      suspiciousActivities.push('limited_fonts_available');
    }

    if (fingerprint.browser.languages.length === 0) {
      suspiciousActivities.push('no_languages_detected');
    }

    return suspiciousActivities;
  }

  /**
   * كشف VPN بسيط (يمكن تحسينه بخدمات خارجية)
   */
  private async detectVPN(ipAddress: string): Promise<boolean> {
    try {
      // فحص بسيط للـ IP addresses المشبوهة
      const suspiciousRanges = [
        '10.', '172.16.', '172.17.', '172.18.', '172.19.',
        '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
        '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
        '172.30.', '172.31.', '192.168.'
      ];

      // فحص الشبكات الخاصة
      const isPrivateNetwork = suspiciousRanges.some(range => ipAddress.startsWith(range));
      
      // يمكن إضافة فحوصات أكثر تقدماً هنا
      // مثل استخدام خدمات كشف VPN خارجية
      
      return isPrivateNetwork;
    } catch (error) {
      console.error('VPN detection error:', error);
      return false;
    }
  }

  /**
   * فحص تطابق البصمة مع السجلات السابقة
   */
  private async checkFingerprintConsistency(fingerprint: DeviceFingerprint): Promise<string[]> {
    try {
      // البحث عن بصمات مشابهة
      const { data: similarDevices, error } = await supabase
        .from('device_fingerprints')
        .select('*')
        .neq('fingerprint_hash', fingerprint.fingerprint)
        .limit(10);

      if (error || !similarDevices) {
        return [];
      }

      const inconsistencies: string[] = [];

      for (const device of similarDevices) {
        const storedFingerprint = device.device_data as DeviceFingerprint;
        const comparison = deviceFingerprintingService.compareFingerprints(fingerprint, storedFingerprint);

        if (comparison.similarity > 0.7 && comparison.similarity < 0.9) {
          // بصمة مشابهة لكن ليست مطابقة تماماً - مشبوه
          inconsistencies.push('fingerprint_similarity_suspicious');
          inconsistencies.push(...comparison.suspiciousChanges);
        }
      }

      return [...new Set(inconsistencies)]; // إزالة التكرار
    } catch (error) {
      console.error('Fingerprint consistency check error:', error);
      return [];
    }
  }

  /**
   * حساب مستوى الخطر
   */
  private calculateRiskLevel(
    _fingerprint: DeviceFingerprint,
    suspiciousActivities: string[],
    deviceRecord: any
  ): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0;

    // نقاط الخطر بناءً على الأنشطة المشبوهة
    const riskPoints = {
      'webdriver_detected': 3,
      'phantom_detected': 3,
      'selenium_detected': 3,
      'headless_browser': 2,
      'automation_detected': 2,
      'vpn_detected': 2,
      'fingerprint_similarity_suspicious': 2,
      'invalid_screen_dimensions': 1,
      'limited_fonts_available': 1,
      'no_languages_detected': 1
    };

    suspiciousActivities.forEach(activity => {
      riskScore += riskPoints[activity as keyof typeof riskPoints] || 1;
    });

    // نقاط إضافية بناءً على تاريخ الجهاز
    if (deviceRecord.failed_attempts > 10) riskScore += 2;
    if (deviceRecord.risk_level === 'high') riskScore += 1;
    if (deviceRecord.risk_level === 'critical') riskScore += 2;

    // تحديد مستوى الخطر
    if (riskScore >= ADVANCED_SECURITY_CONFIG.RISK_THRESHOLD_CRITICAL) return 'critical';
    if (riskScore >= ADVANCED_SECURITY_CONFIG.RISK_THRESHOLD_HIGH) return 'high';
    if (riskScore >= ADVANCED_SECURITY_CONFIG.RISK_THRESHOLD_MEDIUM) return 'medium';
    
    return 'low';
  }

  /**
   * فحص حدود المعدل
   */
  private async checkRateLimits(deviceFingerprint: string, _email: string): Promise<{
    exceeded: boolean;
    hourlyAttempts: number;
    dailyAttempts: number;
  }> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // فحص المحاولات في الساعة الأخيرة
    const { data: hourlyAttempts } = await supabase
      .from('login_attempts')
      .select('id')
      .eq('device_fingerprint', deviceFingerprint)
      .gte('created_at', oneHourAgo.toISOString());

    // فحص المحاولات في اليوم الأخير
    const { data: dailyAttempts } = await supabase
      .from('login_attempts')
      .select('id')
      .eq('device_fingerprint', deviceFingerprint)
      .gte('created_at', oneDayAgo.toISOString());

    const hourlyCount = hourlyAttempts?.length || 0;
    const dailyCount = dailyAttempts?.length || 0;

    return {
      exceeded: hourlyCount >= ADVANCED_SECURITY_CONFIG.MAX_DEVICE_ATTEMPTS_HOURLY ||
                dailyCount >= ADVANCED_SECURITY_CONFIG.MAX_DEVICE_ATTEMPTS_DAILY,
      hourlyAttempts: hourlyCount,
      dailyAttempts: dailyCount
    };
  }

  /**
   * تحديد ما إذا كان يجب حظر الجهاز
   */
  private shouldBlockDevice(
    riskLevel: string,
    suspiciousActivities: string[],
    rateLimitCheck: any
  ): { block: boolean; reason: string; duration: number } {
    // حظر فوري للحالات الحرجة
    if (riskLevel === 'critical') {
      return {
        block: true,
        reason: 'تم اكتشاف نشاط مشبوه عالي الخطورة',
        duration: ADVANCED_SECURITY_CONFIG.DEVICE_BLOCK_HOURS_CRITICAL
      };
    }

    // حظر للأتمتة المكتشفة
    const automationDetected = suspiciousActivities.some(activity =>
      ['webdriver_detected', 'phantom_detected', 'selenium_detected', 'automation_detected'].includes(activity)
    );

    if (automationDetected) {
      return {
        block: true,
        reason: 'تم اكتشاف استخدام أدوات أتمتة',
        duration: ADVANCED_SECURITY_CONFIG.DEVICE_BLOCK_HOURS_LONG
      };
    }

    // حظر لتجاوز حدود المعدل
    if (rateLimitCheck.exceeded) {
      return {
        block: true,
        reason: `تم تجاوز الحد الأقصى للمحاولات (${rateLimitCheck.dailyAttempts} محاولة)`,
        duration: ADVANCED_SECURITY_CONFIG.DEVICE_BLOCK_HOURS_SHORT
      };
    }

    // حظر للمخاطر العالية
    if (riskLevel === 'high' && suspiciousActivities.length >= 3) {
      return {
        block: true,
        reason: 'تم اكتشاف عدة أنشطة مشبوهة',
        duration: ADVANCED_SECURITY_CONFIG.DEVICE_BLOCK_HOURS_SHORT
      };
    }

    return { block: false, reason: '', duration: 0 };
  }

  /**
   * حظر الجهاز
   */
  private async blockDevice(deviceFingerprint: string, reason: string, durationHours: number, email?: string): Promise<void> {
    const blockedUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    // إنشاء سجل المنع
    await supabase.from('device_blocks').insert({
      device_fingerprint: deviceFingerprint,
      block_type: 'suspicious_activity',
      block_reason: reason,
      blocked_until: blockedUntil.toISOString(),
      is_active: true
    });

    // تحديث سجل الجهاز
    await supabase
      .from('device_fingerprints')
      .update({
        is_blocked: true,
        blocked_until: blockedUntil.toISOString(),
        block_reason: reason,
        risk_level: 'high'
      })
      .eq('fingerprint_hash', deviceFingerprint);

    // تسجيل الحدث الأمني
    await this.logSecurityEvent({
      device_fingerprint: deviceFingerprint,
      event_type: 'rate_limit_exceeded',
      severity: 'high',
      description: `Device blocked: ${reason}`,
      event_data: { durationHours, blockedUntil },
      email,
      action_taken: 'device_blocked'
    });
  }

  /**
   * تحديث سجل الجهاز
   */
  private async updateDeviceRecord(deviceFingerprint: string, email: string): Promise<void> {
    // إضافة البريد الإلكتروني للقائمة إذا لم يكن موجوداً
    const { data: device } = await supabase
      .from('device_fingerprints')
      .select('associated_emails')
      .eq('fingerprint_hash', deviceFingerprint)
      .single();

    if (device) {
      const emails = device.associated_emails || [];
      if (!emails.includes(email)) {
        emails.push(email);
        
        await supabase
          .from('device_fingerprints')
          .update({
            associated_emails: emails,
            last_seen: new Date().toISOString()
          })
          .eq('fingerprint_hash', deviceFingerprint);
      }
    }
  }

  /**
   * تسجيل حدث أمني
   */
  private async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'created_at'>): Promise<void> {
    try {
      await supabase.from('security_events').insert({
        device_fingerprint: event.device_fingerprint,
        event_type: event.event_type,
        severity: event.severity,
        description: event.description,
        event_data: event.event_data,
        ip_address: event.ip_address,
        user_agent: event.user_agent,
        email: event.email,
        action_taken: event.action_taken
      });
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  /**
   * إلغاء حظر الجهاز (للاستخدام الإداري)
   */
  async unblockDevice(deviceFingerprint: string): Promise<{ success: boolean; error?: string }> {
    try {
      // إلغاء تفعيل جميع حالات المنع
      await supabase
        .from('device_blocks')
        .update({ is_active: false })
        .eq('device_fingerprint', deviceFingerprint)
        .eq('is_active', true);

      // تحديث سجل الجهاز
      await supabase
        .from('device_fingerprints')
        .update({
          is_blocked: false,
          blocked_until: null,
          block_reason: null,
          risk_level: 'low'
        })
        .eq('fingerprint_hash', deviceFingerprint);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * الحصول على إحصائيات الجهاز
   */
  async getDeviceStats(deviceFingerprint: string): Promise<any> {
    try {
      const { data: device } = await supabase
        .from('device_fingerprints')
        .select('*')
        .eq('fingerprint_hash', deviceFingerprint)
        .single();

      const { data: securityEvents } = await supabase
        .from('security_events')
        .select('*')
        .eq('device_fingerprint', deviceFingerprint)
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: activeBlocks } = await supabase
        .from('device_blocks')
        .select('*')
        .eq('device_fingerprint', deviceFingerprint)
        .eq('is_active', true);

      return {
        device,
        securityEvents: securityEvents || [],
        activeBlocks: activeBlocks || []
      };
    } catch (error) {
      console.error('Error getting device stats:', error);
      return null;
    }
  }
}

export const deviceSecurityService = DeviceSecurityService.getInstance();
