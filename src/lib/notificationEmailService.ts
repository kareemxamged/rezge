import { supabase } from './supabase';
import { simpleEmailService } from './smtpService';
import { emailService } from './emailService';
import IPLocationService from './ipLocationService';
import DeviceAnalysisService from './deviceAnalysisService';
import { createLoginNotificationTemplate } from './unifiedEmailTemplate';

// تعريف الواجهات محلياً لتجنب مشاكل الاستيراد
interface LocationInfo {
  ip: string;
  location: string;
  country: string;
  city: string;
  region: string;
  timezone: string;
  isp: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
}

interface DeviceInfo {
  browser: string;
  browserVersion: string;
  browserEngine: string;
  os: string;
  osVersion: string;
  architecture: string;
  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  platform: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isBot: boolean;
  screenResolution?: string;
  colorDepth?: number;
  timezone: string;
  language: string;
  fingerprint: string;
}

interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
}

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
  type?: string;
}

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

interface EnhancedLoginData {
  timestamp: string;
  ipAddress?: string;
  location?: string;
  deviceType?: string;
  browser?: string;
  userAgent?: string;
  // معلومات محسنة جديدة
  realIP?: string;
  locationInfo?: LocationInfo;
  deviceInfo?: DeviceInfo;
  securityLevel?: 'low' | 'medium' | 'high';
  loginMethod?: 'normal' | 'trusted_device' | 'two_factor';
}

interface AdminLoginData {
  timestamp: string;
  ipAddress?: string;
  location?: string;
  deviceType?: string;
  browser?: string;
  userAgent?: string;
  loginMethod?: 'normal' | 'trusted_device' | 'two_factor';
  adminRole?: string;
  adminUsername?: string;
}

class NotificationEmailService {
  private readonly fromEmail = 'manage@kareemamged.com';
  private readonly fromName = 'رزقي - منصة الزواج الإسلامي';
  private readonly contactEmail = 'contact@kareemamged.com';

  /**
   * جمع معلومات محسنة عن الجلسة والجهاز
   */
  private async gatherEnhancedLoginData(basicData: any): Promise<EnhancedLoginData> {
    console.log('🔍 بدء جمع المعلومات المحسنة للجلسة...');

    try {
      // الحصول على معلومات IP والموقع
      const locationInfo = await IPLocationService.getCompleteInfo();

      // تحليل معلومات الجهاز
      const deviceInfo = DeviceAnalysisService.analyzeDevice(basicData.userAgent);

      // تحديد مستوى الأمان
      const securityLevel = this.determineSecurityLevel(locationInfo, deviceInfo);

      const enhancedData: EnhancedLoginData = {
        timestamp: basicData.timestamp || new Date().toISOString(),
        ipAddress: locationInfo.ip || basicData.ipAddress || 'غير معروف',
        location: locationInfo.location || basicData.location || 'غير محدد',
        deviceType: deviceInfo.deviceType || basicData.deviceType || 'غير محدد',
        browser: deviceInfo.browser || basicData.browser || 'غير محدد',
        userAgent: basicData.userAgent || '',
        // المعلومات المحسنة
        realIP: locationInfo.ip,
        locationInfo,
        deviceInfo,
        securityLevel,
        loginMethod: basicData.loginMethod || 'normal'
      };

      console.log('✅ تم جمع المعلومات المحسنة:', enhancedData);
      return enhancedData;

    } catch (error) {
      console.error('❌ خطأ في جمع المعلومات المحسنة:', error);

      // إرجاع البيانات الأساسية في حالة الخطأ
      return {
        timestamp: basicData.timestamp || new Date().toISOString(),
        ipAddress: basicData.ipAddress || 'غير معروف',
        location: basicData.location || 'غير محدد',
        deviceType: basicData.deviceType || 'غير معروف',
        browser: basicData.browser || 'غير معروف',
        userAgent: basicData.userAgent || '',
        securityLevel: 'medium',
        loginMethod: basicData.loginMethod || 'normal'
      };
    }
  }

  /**
   * تحديد مستوى الأمان بناءً على المعلومات المتاحة
   */
  private determineSecurityLevel(locationInfo: LocationInfo, deviceInfo: DeviceInfo): 'low' | 'medium' | 'high' {
    let score = 0;

    // عوامل تزيد الأمان
    if (locationInfo.country && locationInfo.country !== 'غير معروف') score += 1;
    if (locationInfo.city && locationInfo.city !== 'غير معروف') score += 1;
    if (deviceInfo.browser && !deviceInfo.isBot) score += 1;
    if (deviceInfo.os && deviceInfo.os !== 'Unknown') score += 1;
    if (deviceInfo.screenResolution) score += 1;

    // عوامل تقلل الأمان
    if (deviceInfo.isBot) score -= 2;
    if (locationInfo.ip === '127.0.0.1' || locationInfo.ip.startsWith('192.168.')) score -= 1;

    if (score >= 4) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }

  /**
   * جمع معلومات محسنة عن جلسة المشرف والجهاز
   */
  private async gatherEnhancedAdminLoginData(basicData: AdminLoginData): Promise<EnhancedLoginData> {
    console.log('🔍 بدء جمع المعلومات المحسنة لجلسة المشرف...');

    try {
      // الحصول على معلومات IP والموقع
      const locationInfo = await IPLocationService.getCompleteInfo();

      // تحليل معلومات الجهاز
      const deviceInfo = DeviceAnalysisService.analyzeDevice(basicData.userAgent);

      // تحديد مستوى الأمان (أعلى للمشرفين)
      const securityLevel = this.determineAdminSecurityLevel(locationInfo, deviceInfo, basicData.adminRole);

      const enhancedData: EnhancedLoginData = {
        timestamp: basicData.timestamp || new Date().toISOString(),
        ipAddress: locationInfo.ip || basicData.ipAddress || 'غير معروف',
        location: locationInfo.location || basicData.location || 'غير محدد',
        deviceType: deviceInfo.deviceType || basicData.deviceType || 'غير محدد',
        browser: deviceInfo.browser || basicData.browser || 'غير محدد',
        userAgent: basicData.userAgent || '',
        // المعلومات المحسنة
        realIP: locationInfo.ip,
        locationInfo,
        deviceInfo,
        securityLevel,
        loginMethod: basicData.loginMethod || 'normal'
      };

      console.log('✅ تم جمع المعلومات المحسنة للمشرف:', enhancedData);
      return enhancedData;

    } catch (error) {
      console.error('❌ خطأ في جمع المعلومات المحسنة للمشرف:', error);

      // إرجاع البيانات الأساسية في حالة الخطأ
      return {
        timestamp: basicData.timestamp || new Date().toISOString(),
        ipAddress: basicData.ipAddress || 'غير معروف',
        location: basicData.location || 'غير محدد',
        deviceType: basicData.deviceType || 'غير معروف',
        browser: basicData.browser || 'غير معروف',
        userAgent: basicData.userAgent || '',
        securityLevel: 'high', // افتراضي عالي للمشرفين
        loginMethod: basicData.loginMethod || 'normal'
      };
    }
  }

  /**
   * تحديد مستوى الأمان للمشرفين (معايير أكثر صرامة)
   */
  private determineAdminSecurityLevel(locationInfo: LocationInfo, deviceInfo: DeviceInfo, adminRole?: string): 'low' | 'medium' | 'high' {
    let score = 2; // نقطة بداية أعلى للمشرفين

    // عوامل تزيد الأمان
    if (locationInfo.country && locationInfo.country !== 'غير معروف') score += 1;
    if (locationInfo.city && locationInfo.city !== 'غير معروف') score += 1;
    if (deviceInfo.browser && !deviceInfo.isBot) score += 1;
    if (deviceInfo.os && deviceInfo.os !== 'Unknown') score += 1;
    if (deviceInfo.screenResolution) score += 1;
    if (adminRole === 'super_admin') score += 2; // نقاط إضافية للسوبر أدمن

    // عوامل تقلل الأمان (أكثر صرامة للمشرفين)
    if (deviceInfo.isBot) score -= 3;
    if (locationInfo.ip === '127.0.0.1' || locationInfo.ip.startsWith('192.168.')) score -= 2;

    if (score >= 6) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  /**
   * الحصول على نص نوع تسجيل الدخول
   */
  private getLoginMethodText(method?: string): string {
    switch (method) {
      case 'trusted_device':
        return 'تسجيل دخول من جهاز موثوق';
      case 'two_factor':
        return 'تسجيل دخول بعد التحقق الثنائي';
      case 'normal':
      default:
        return 'تسجيل دخول ناجح';
    }
  }

  /**
   * الحصول على نص نوع تسجيل الدخول للمشرفين
   */
  private getAdminLoginMethodText(method?: string): string {
    switch (method) {
      case 'trusted_device':
        return 'تسجيل دخول إداري من جهاز موثوق';
      case 'two_factor':
        return 'تسجيل دخول إداري بعد التحقق الثنائي';
      case 'normal':
      default:
        return 'تسجيل دخول إداري ناجح';
    }
  }

  /**
   * الحصول على أيقونة مستوى الأمان
   */
  private getSecurityIcon(level?: string): string {
    switch (level) {
      case 'high':
        return '🛡️';
      case 'medium':
        return '⚠️';
      case 'low':
        return '🚨';
      default:
        return '🔒';
    }
  }

  /**
   * الحصول على نص مستوى الأمان
   */
  private getSecurityText(level?: string): string {
    switch (level) {
      case 'high':
        return 'عالي';
      case 'medium':
        return 'متوسط';
      case 'low':
        return 'منخفض';
      default:
        return 'غير محدد';
    }
  }

  /**
   * تحديد مستوى الخطر لمحاولة تسجيل الدخول الفاشلة
   */
  private determineRiskLevel(attemptsCount?: number, securityLevel?: string): 'low' | 'medium' | 'high' | 'critical' {
    let score = 0;

    // عدد المحاولات
    if (attemptsCount) {
      if (attemptsCount >= 10) score += 4;
      else if (attemptsCount >= 5) score += 3;
      else if (attemptsCount >= 3) score += 2;
      else score += 1;
    }

    // مستوى الأمان
    if (securityLevel === 'low') score += 2;
    else if (securityLevel === 'medium') score += 1;

    if (score >= 6) return 'critical';
    if (score >= 4) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }

  /**
   * تحديد مستوى الخطر للمشرفين (معايير أكثر صرامة)
   */
  private determineAdminRiskLevel(data: EnhancedLoginData): 'low' | 'medium' | 'high' | 'critical' {
    let score = 1; // نقطة بداية أعلى للمشرفين

    // عوامل تزيد الخطر (أكثر صرامة للمشرفين)
    if (data.deviceInfo?.isBot) score += 4; // خطر عالي جداً للبوتات
    if (data.realIP === '127.0.0.1' || data.realIP?.startsWith('192.168.')) score += 2;
    if (!data.locationInfo?.country || data.locationInfo.country === 'غير معروف') score += 2;
    if (!data.deviceInfo?.browser || data.deviceInfo.browser === 'Unknown') score += 2;
    if (data.securityLevel === 'low') score += 3; // خطر عالي جداً للمشرفين
    else if (data.securityLevel === 'medium') score += 1;

    // عوامل تقلل الخطر
    if (data.locationInfo?.country && data.locationInfo.country !== 'غير معروف') score -= 1;
    if (data.deviceInfo?.browser && !data.deviceInfo.isBot) score -= 1;
    if (data.securityLevel === 'high') score -= 2;

    if (score >= 8) return 'critical';
    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  /**
   * الحصول على أيقونة مستوى الخطر
   */
  private getRiskIcon(level: string): string {
    switch (level) {
      case 'critical':
        return '🔴';
      case 'high':
        return '🚨';
      case 'medium':
        return '⚠️';
      case 'low':
        return '🟡';
      default:
        return '⚠️';
    }
  }

  /**
   * الحصول على نص مستوى الخطر
   */
  private getRiskText(level: string): string {
    switch (level) {
      case 'critical':
        return 'خطر حرج';
      case 'high':
        return 'خطر عالي';
      case 'medium':
        return 'خطر متوسط';
      case 'low':
        return 'خطر منخفض';
      default:
        return 'غير محدد';
    }
  }

  // إرسال إيميل عام باستخدام الخادم المستقل
  private async sendEmail(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📧 بدء sendEmail...', {
        to: emailData.to,
        subject: emailData.subject,
        type: emailData.type,
        fromEmail: this.fromEmail,
        fromName: this.fromName
      });

      // محاولة 1: استخدام الخادم المستقل (localhost:3001)
      console.log('🔄 محاولة الإرسال عبر الخادم المستقل...');

      const requestBody = {
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        from: this.fromEmail,
        fromName: this.fromName
      };

      console.log('📤 بيانات الطلب:', {
        to: requestBody.to,
        subject: requestBody.subject,
        from: requestBody.from,
        fromName: requestBody.fromName,
        htmlLength: requestBody.html.length,
        textLength: requestBody.text.length
      });

      const response = await fetch('http://localhost:3001/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 استجابة الخادم:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (response.ok) {
        const result = await response.json();
        console.log('📋 محتوى الاستجابة:', result);

        if (result.success) {
          console.log('✅ تم إرسال الإيميل بنجاح عبر الخادم المستقل');
          return { success: true };
        } else {
          console.error('❌ فشل الإرسال:', result.error || 'خطأ غير محدد');
        }
      } else {
        console.error('❌ خطأ في الاستجابة:', response.status, response.statusText);
      }

      console.warn('⚠️ فشل الخادم المستقل، محاولة بديلة...');

      // محاولة 2: استخدام خدمة بريدية بديلة
      console.log('🔄 التحويل للطريقة البديلة...');
      const fallbackResult = await this.sendEmailFallback(emailData);
      return fallbackResult;

    } catch (error) {
      console.error('❌ خطأ في إرسال الإيميل:', error);
      console.error('❌ تفاصيل الخطأ:', {
        message: error instanceof Error ? error.message : 'خطأ غير معروف',
        stack: error instanceof Error ? error.stack : undefined
      });

      // محاولة بديلة في حالة عدم توفر الخادم المستقل
      console.log('🔄 التحويل للطريقة البديلة...');
      const fallbackResult = await this.sendEmailFallback(emailData);
      return fallbackResult;
    }
  }

  // طريقة بديلة لإرسال الإيميل
  private async sendEmailFallback(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    console.log('🔄 بدء الطريقة البديلة لإرسال الإيميل...');

    try {
      console.log('🌐 محاولة الإرسال عبر Web3Forms...');

      // استخدام Web3Forms كخدمة بديلة
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_key: 'YOUR_WEB3FORMS_KEY', // يجب الحصول عليه من web3forms.com
          from_name: this.fromName,
          from_email: this.fromEmail,
          to_email: emailData.to,
          subject: emailData.subject,
          message: emailData.text,
          html: emailData.html
        })
      });

      console.log('📡 استجابة Web3Forms:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (response.ok) {
        console.log('✅ تم إرسال الإيميل عبر Web3Forms');
        return { success: true };
      }

      console.warn('⚠️ فشل Web3Forms، التحقق من وضع التطوير...');

      // في بيئة التطوير، نعتبر الإرسال ناجح
      if (process.env.NODE_ENV === 'development') {
        console.log('🛠️ وضع التطوير مفعل - محاكاة إرسال ناجح');
        console.log('📧 الإيميل سيتم إرساله إلى:', emailData.to);
        console.log('📧 الموضوع:', emailData.subject);
        console.log('📧 المحتوى (أول 100 حرف):', emailData.text.substring(0, 100) + '...');
        return { success: true };
      }

      console.error('❌ فشل في إرسال الإيميل عبر الخدمة البديلة');
      return { success: false, error: 'فشل في إرسال الإيميل عبر الخدمة البديلة' };

    } catch (error) {
      console.error('❌ خطأ في الخدمة البديلة:', error);
      console.error('❌ تفاصيل الخطأ:', {
        message: error instanceof Error ? error.message : 'خطأ غير معروف',
        stack: error instanceof Error ? error.stack : undefined
      });

      // في بيئة التطوير، نعتبر الإرسال ناجح
      if (process.env.NODE_ENV === 'development') {
        console.log('🛠️ وضع التطوير مفعل - محاكاة إرسال ناجح رغم الخطأ');
        console.log('📧 الإيميل سيتم إرساله إلى:', emailData.to);
        console.log('📧 الموضوع:', emailData.subject);
        return { success: true };
      }

      return { success: false, error: 'فشل في جميع طرق الإرسال' };
    }
  }

  // دالة لتحليل User Agent واستخراج معلومات الجهاز
  private parseUserAgent(userAgent: string): {
    browser: string;
    browserVersion: string;
    os: string;
    deviceType: string;
    platform: string;
  } {
    const ua = userAgent.toLowerCase();

    // تحديد المتصفح
    let browser = 'غير معروف';
    let browserVersion = '';

    if (ua.includes('chrome') && !ua.includes('edg')) {
      browser = 'Chrome';
      const match = ua.match(/chrome\/([0-9.]+)/);
      browserVersion = match ? match[1] : '';
    } else if (ua.includes('firefox')) {
      browser = 'Firefox';
      const match = ua.match(/firefox\/([0-9.]+)/);
      browserVersion = match ? match[1] : '';
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      browser = 'Safari';
      const match = ua.match(/version\/([0-9.]+)/);
      browserVersion = match ? match[1] : '';
    } else if (ua.includes('edg')) {
      browser = 'Microsoft Edge';
      const match = ua.match(/edg\/([0-9.]+)/);
      browserVersion = match ? match[1] : '';
    } else if (ua.includes('opera') || ua.includes('opr')) {
      browser = 'Opera';
      const match = ua.match(/(?:opera|opr)\/([0-9.]+)/);
      browserVersion = match ? match[1] : '';
    }

    // تحديد نظام التشغيل
    let os = 'غير معروف';
    if (ua.includes('windows nt 10')) {
      os = 'Windows 10/11';
    } else if (ua.includes('windows nt 6.3')) {
      os = 'Windows 8.1';
    } else if (ua.includes('windows nt 6.2')) {
      os = 'Windows 8';
    } else if (ua.includes('windows nt 6.1')) {
      os = 'Windows 7';
    } else if (ua.includes('windows')) {
      os = 'Windows';
    } else if (ua.includes('mac os x')) {
      const match = ua.match(/mac os x ([0-9_]+)/);
      os = match ? `macOS ${match[1].replace(/_/g, '.')}` : 'macOS';
    } else if (ua.includes('linux')) {
      os = 'Linux';
    } else if (ua.includes('android')) {
      const match = ua.match(/android ([0-9.]+)/);
      os = match ? `Android ${match[1]}` : 'Android';
    } else if (ua.includes('iphone') || ua.includes('ipad')) {
      const match = ua.match(/os ([0-9_]+)/);
      os = match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS';
    }

    // تحديد نوع الجهاز
    let deviceType = 'سطح المكتب';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      deviceType = 'هاتف ذكي';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      deviceType = 'جهاز لوحي';
    }

    // تحديد المنصة
    let platform = '';
    if (ua.includes('x86_64') || ua.includes('wow64')) {
      platform = '64-bit';
    } else if (ua.includes('x86')) {
      platform = '32-bit';
    } else if (ua.includes('arm')) {
      platform = 'ARM';
    }

    return {
      browser,
      browserVersion,
      os,
      deviceType,
      platform
    };
  }

  // إنشاء قالب HTML أساسي مع دعم RTL محسن
  private createBaseTemplate(content: string, title: string): string {
    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          * {
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', 'Tahoma', 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
            direction: rtl;
            text-align: right;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            direction: rtl;
          }

          .content {
            padding: 30px;
            text-align: right;
            direction: rtl;
          }
          .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e9ecef;
            direction: rtl;
          }
          .footer p {
            margin: 0;
            color: #6c757d;
            font-size: 14px;
          }
          h1, h2, h3, h4, h5, h6 {
            text-align: right;
            direction: rtl;
          }
          p, div, span {
            text-align: right;
            direction: rtl;
          }
          ul, ol {
            text-align: right;
            direction: rtl;
            padding-right: 20px;
            padding-left: 0;
          }
          li {
            text-align: right;
            direction: rtl;
            margin-bottom: 5px;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #2563eb, #10b981);
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 0;
          }
          .alert {
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
          }
          .alert-success {
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
          }
          .alert-warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
          }
          .alert-danger {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
          }
          .alert-info {
            background-color: #d1ecf1;
            border: 1px solid #bee5eb;
            color: #0c5460;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>© 2025 رزقي - منصة الزواج الإسلامي الشرعي</p>
            <p>هذه رسالة تلقائية، يرجى عدم الرد عليها</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // 1. إرسال رسالة التواصل للإدارة
  async sendContactMessage(formData: ContactFormData, language: string = 'ar'): Promise<{ success: boolean; error?: string }> {
    console.log('📧 بدء sendContactMessage...', { formData, language });

    try {
      // تحديد المحتوى حسب اللغة
      const isArabic = language === 'ar';
      console.log('🌐 اللغة المحددة:', isArabic ? 'العربية' : 'الإنجليزية');

      const subject = isArabic
        ? `رسالة تواصل جديدة من ${formData.name} - ${formData.subject}`
        : `New Contact Message from ${formData.name} - ${formData.subject}`;

      const htmlContent = this.createBaseTemplate(`
        <h2>${isArabic ? '📬 رسالة تواصل جديدة' : '📬 New Contact Message'}</h2>

        <div class="alert alert-info">
          <strong>${isArabic ? 'تم استلام رسالة تواصل جديدة من موقع رزقي' : 'New contact message received from Rezge website'}</strong>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>${isArabic ? '📋 تفاصيل المرسل:' : '📋 Sender Details:'}</h3>
          <ul>
            <li><strong>${isArabic ? 'الاسم:' : 'Name:'}</strong> ${formData.name}</li>
            <li><strong>${isArabic ? 'البريد الإلكتروني:' : 'Email:'}</strong> ${formData.email}</li>
            <li><strong>${isArabic ? 'رقم الهاتف:' : 'Phone:'}</strong> ${formData.phone}</li>
            <li><strong>${isArabic ? 'الموضوع:' : 'Subject:'}</strong> ${formData.subject}</li>
          </ul>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>${isArabic ? '💬 الرسالة:' : '💬 Message:'}</h3>
          <div style="background-color: #ffffff; padding: 15px; border-radius: 6px; border-right: 4px solid #2563eb; margin-top: 10px;">
            ${formData.message.replace(/\n/g, '<br>')}
          </div>
        </div>

        <div style="margin-top: 30px; padding: 20px; background-color: #e3f2fd; border-radius: 6px;">
          <p><strong>${isArabic ? '📅 تاريخ الإرسال (ميلادي):' : '📅 Sent Date (Gregorian):'}</strong> ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</p>
          <p><strong>${isArabic ? '📧 للرد:' : '📧 Reply To:'}</strong> ${isArabic ? `يمكنك الرد مباشرة على ${formData.email}` : `You can reply directly to ${formData.email}`}</p>
          <p><strong>${isArabic ? '🌐 المصدر:' : '🌐 Source:'}</strong> ${isArabic ? 'موقع رزقي - نموذج اتصل بنا' : 'Rezge Website - Contact Form'}</p>
        </div>
      `, isArabic ? 'رسالة تواصل جديدة' : 'New Contact Message');

      const currentDate = new Date();
      const gregorianDate = currentDate.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const gregorianTime = currentDate.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      const textContent = isArabic ? `
رسالة تواصل جديدة من موقع رزقي

الاسم: ${formData.name}
البريد الإلكتروني: ${formData.email}
رقم الهاتف: ${formData.phone}
الموضوع: ${formData.subject}

الرسالة:
${formData.message}

تاريخ الإرسال (ميلادي): ${gregorianDate} ${gregorianTime}
المصدر: موقع رزقي - نموذج اتصل بنا
للرد: يمكنك الرد مباشرة على ${formData.email}
      ` : `
New Contact Message from Rezge Website

Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone}
Subject: ${formData.subject}

Message:
${formData.message}

Sent Date (Gregorian): ${gregorianDate} ${gregorianTime}
Source: Rezge Website - Contact Form
Reply To: You can reply directly to ${formData.email}
      `;

      console.log('📤 إرسال الإيميل إلى:', this.contactEmail);
      console.log('📝 عنوان الإيميل:', subject);

      const emailResult = await this.sendEmail({
        to: this.contactEmail,
        subject,
        html: htmlContent,
        text: textContent,
        type: 'contact'
      });

      console.log('📬 نتيجة إرسال الإيميل:', emailResult);
      return emailResult;

    } catch (error) {
      console.error('❌ خطأ في إرسال رسالة التواصل:', error);
      console.error('❌ تفاصيل الخطأ:', {
        message: error instanceof Error ? error.message : 'خطأ غير معروف',
        stack: error instanceof Error ? error.stack : undefined
      });
      return { success: false, error: 'فشل في إرسال رسالة التواصل' };
    }
  }

  // 2. إشعار ترحيبي للمستخدمين الجدد
  async sendWelcomeNotification(userEmail: string, userName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const subject = 'مرحباً بك في رزقي - منصة التعارف الإسلامية';

      const htmlContent = this.createBaseTemplate(`
        <h2>🌟 مرحباً بك في رزقي</h2>

        <p>مرحباً <strong>${userName}</strong>،</p>

        <div class="alert alert-success">
          <strong>تم إنشاء حسابك بنجاح في منصة رزقي!</strong>
        </div>

        <p>نرحب بك في منصة رزقي، المنصة الإسلامية الرائدة للتعارف والزواج الحلال المتوافق مع الشريعة الإسلامية.</p>

        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3>🎯 الخطوات التالية لإكمال ملفك:</h3>
          <ul>
            <li>✅ إكمال البيانات الشخصية والدينية</li>
            <li>📸 إضافة صورة شخصية محتشمة</li>
            <li>💍 تحديد مواصفات شريك الحياة المطلوب</li>
            <li>🔍 البدء في البحث والتصفح</li>
            <li>📝 كتابة نبذة تعريفية جذابة</li>
          </ul>
        </div>

        <div style="background-color: #fff3cd; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3>🕌 قيمنا الإسلامية:</h3>
          <ul>
            <li>الالتزام بالآداب الإسلامية في التعامل</li>
            <li>الهدف من التعارف هو الزواج الحلال</li>
            <li>احترام الخصوصية والحدود الشرعية</li>
            <li>التواصل المحترم والهادف</li>
          </ul>
        </div>

        <div class="alert alert-info">
          <h3>🔒 نصائح الأمان والخصوصية:</h3>
          <ul>
            <li>🔐 فعّل المصادقة الثنائية لحماية إضافية</li>
            <li>🔑 استخدم كلمة مرور قوية ومعقدة</li>
            <li>🚫 لا تشارك معلوماتك الشخصية في البداية</li>
            <li>⚠️ أبلغ عن أي سلوك مشبوه أو غير لائق</li>
            <li>📞 تأكد من صحة المعلومات قبل اللقاء</li>
          </ul>
        </div>

        <div style="background-color: #d1ecf1; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #17a2b8;">
          <h3>📞 الدعم والمساعدة:</h3>
          <p>فريق الدعم متاح لمساعدتك في أي وقت:</p>
          <ul>
            <li>📧 البريد الإلكتروني: ${this.contactEmail}</li>
            <li>💬 الدردشة المباشرة عبر الموقع</li>
            <li>📚 مركز المساعدة والأسئلة الشائعة</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <p style="font-size: 18px; color: #28a745; font-weight: bold;">
            🤲 بارك الله لك وبارك عليك، ونتمنى لك التوفيق في العثور على شريك حياتك
          </p>
        </div>
      `, 'مرحباً بك في رزقي');

      const textContent = `
مرحباً بك في رزقي - منصة التعارف الإسلامية

مرحباً ${userName}،

تم إنشاء حسابك بنجاح في منصة رزقي!

نرحب بك في منصة رزقي، المنصة الإسلامية الرائدة للتعارف والزواج الحلال المتوافق مع الشريعة الإسلامية.

الخطوات التالية لإكمال ملفك:
- إكمال البيانات الشخصية والدينية
- إضافة صورة شخصية محتشمة
- تحديد مواصفات شريك الحياة المطلوب
- البدء في البحث والتصفح
- كتابة نبذة تعريفية جذابة

قيمنا الإسلامية:
- الالتزام بالآداب الإسلامية في التعامل
- الهدف من التعارف هو الزواج الحلال
- احترام الخصوصية والحدود الشرعية
- التواصل المحترم والهادف

نصائح الأمان والخصوصية:
- فعّل المصادقة الثنائية لحماية إضافية
- استخدم كلمة مرور قوية ومعقدة
- لا تشارك معلوماتك الشخصية في البداية
- أبلغ عن أي سلوك مشبوه أو غير لائق
- تأكد من صحة المعلومات قبل اللقاء

الدعم والمساعدة:
فريق الدعم متاح لمساعدتك في أي وقت على ${this.contactEmail}

بارك الله لك وبارك عليك، ونتمنى لك التوفيق في العثور على شريك حياتك

مع تحيات فريق رزقي
      `;

      return await this.sendEmail({
        to: userEmail,
        subject,
        html: htmlContent,
        text: textContent,
        type: 'welcome'
      });

    } catch (error) {
      console.error('❌ خطأ في إرسال الإشعار الترحيبي:', error);
      return { success: false, error: 'فشل في إرسال الإشعار الترحيبي' };
    }
  }

  // 4. إشعار تغيير كلمة المرور
  async sendPasswordChangeNotification(
    userEmail: string,
    userName: string,
    changeType: 'security' | 'reset',
    changeData?: {
      timestamp?: string;
      ipAddress?: string;
      location?: string;
      deviceType?: string;
      browser?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const subject = 'تم تغيير كلمة المرور - رزقي';

      const changeTypeText = changeType === 'security' ? 'من صفحة الأمان والخصوصية' : 'عبر إعادة تعيين كلمة المرور';
      
      const htmlContent = this.createBaseTemplate(`
        <h2>🔐 تم تغيير كلمة المرور</h2>
        
        <p>مرحباً <strong>${userName}</strong>،</p>
        
        <div class="alert alert-success">
          <strong>تم تغيير كلمة المرور بنجاح</strong>
        </div>

        <p>نود إعلامك بأنه تم تغيير كلمة المرور لحسابك ${changeTypeText}.</p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>📋 تفاصيل العملية:</h3>
          <ul>
            <li><strong>📅 التاريخ والوقت (ميلادي):</strong> ${changeData?.timestamp ? new Date(changeData.timestamp).toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }) + ' ' + new Date(changeData.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }) + ' ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</li>
            <li><strong>📧 البريد الإلكتروني:</strong> ${userEmail}</li>
            ${changeData?.ipAddress ? `<li><strong>IP:</strong> ${changeData.ipAddress}</li>` : ''}
            ${changeData?.location ? `<li><strong>📍 الموقع:</strong> ${changeData.location}</li>` : ''}
            ${changeData?.deviceType ? `<li><strong>📱 نوع الجهاز:</strong> ${changeData.deviceType}</li>` : ''}
            ${changeData?.browser ? `<li><strong>🌐 المتصفح:</strong> ${changeData.browser}</li>` : ''}
          </ul>
        </div>

        <div class="alert alert-warning">
          <h3>⚠️ تنبيه أمني مهم:</h3>
          <p>إذا لم تقم بهذا التغيير، يرجى التواصل معنا فوراً على ${this.contactEmail}</p>
        </div>

        <div style="margin-top: 30px;">
          <p>نصائح للحفاظ على أمان حسابك:</p>
          <ul>
            <li>استخدم كلمة مرور قوية ومعقدة</li>
            <li>لا تشارك كلمة المرور مع أي شخص</li>
            <li>فعّل المصادقة الثنائية لحماية إضافية</li>
            <li>سجل خروج من الأجهزة غير المستخدمة</li>
          </ul>
        </div>
      `, 'تم تغيير كلمة المرور');

      const textContent = `
تم تغيير كلمة المرور - رزقي

مرحباً ${userName}،

تم تغيير كلمة المرور لحسابك ${changeTypeText}.

تفاصيل العملية:
- التاريخ والوقت (ميلادي): ${changeData?.timestamp ? new Date(changeData.timestamp).toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }) + ' ' + new Date(changeData.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }) + ' ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
- البريد الإلكتروني: ${userEmail}
${changeData?.ipAddress ? `- IP: ${changeData.ipAddress}` : ''}
${changeData?.location ? `- الموقع: ${changeData.location}` : ''}
${changeData?.deviceType ? `- نوع الجهاز: ${changeData.deviceType}` : ''}
${changeData?.browser ? `- المتصفح: ${changeData.browser}` : ''}

تنبيه أمني: إذا لم تقم بهذا التغيير، يرجى التواصل معنا فوراً على ${this.contactEmail}

مع تحيات فريق رزقي
      `;

      return await this.sendEmail({
        to: userEmail,
        subject,
        html: htmlContent,
        text: textContent,
        type: 'password_change'
      });

    } catch (error) {
      console.error('❌ خطأ في إرسال إشعار تغيير كلمة المرور:', error);
      return { success: false, error: 'فشل في إرسال إشعار تغيير كلمة المرور' };
    }
  }

  // 5. إشعار تغيير بيانات التواصل (بعد التأكيد)
  async sendContactInfoChangeNotification(userEmail: string, userName: string, changedFields: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      const subject = 'تم تحديث بيانات التواصل - رزقي';
      
      const fieldsText = changedFields.join('، ');
      
      const htmlContent = this.createBaseTemplate(`
        <h2>📝 تم تحديث بيانات التواصل</h2>
        
        <p>مرحباً <strong>${userName}</strong>،</p>
        
        <div class="alert alert-success">
          <strong>تم تحديث بيانات التواصل بنجاح</strong>
        </div>

        <p>نود إعلامك بأنه تم تحديث بيانات التواصل الخاصة بك بعد تأكيد طلب التعديل.</p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>📋 البيانات المحدثة:</h3>
          <ul>
            <li><strong>📅 التاريخ والوقت (ميلادي):</strong> ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</li>
            <li><strong>🔧 البيانات المحدثة:</strong> ${fieldsText}</li>
            <li><strong>📧 البريد الإلكتروني:</strong> ${userEmail}</li>
          </ul>
        </div>

        <div class="alert alert-info">
          <h3>ℹ️ معلومة مهمة:</h3>
          <p>تم تطبيق التغييرات بعد تأكيد طلب التعديل عبر الرابط المرسل إليك مسبقاً</p>
        </div>

        <div style="margin-top: 30px;">
          <p>إذا لم تقم بهذا التحديث، يرجى التواصل معنا فوراً على ${this.contactEmail}</p>
        </div>
      `, 'تم تحديث بيانات التواصل');

      const textContent = `
تم تحديث بيانات التواصل - رزقي

مرحباً ${userName}،

تم تحديث بيانات التواصل الخاصة بك بعد تأكيد طلب التعديل.

تفاصيل التحديث:
- التاريخ والوقت (ميلادي): ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
- البيانات المحدثة: ${fieldsText}
- البريد الإلكتروني: ${userEmail}

إذا لم تقم بهذا التحديث، يرجى التواصل معنا فوراً على ${this.contactEmail}

مع تحيات فريق رزقي
      `;

      return await this.sendEmail({
        to: userEmail,
        subject,
        html: htmlContent,
        text: textContent,
        type: 'contact_info_change'
      });

    } catch (error) {
      console.error('❌ خطأ في إرسال إشعار تغيير بيانات التواصل:', error);
      return { success: false, error: 'فشل في إرسال إشعار تغيير بيانات التواصل' };
    }
  }

  // 6. إشعار تفعيل المصادقة الثنائية
  async sendTwoFactorEnabledNotification(userEmail: string, userName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const subject = 'تم تفعيل المصادقة الثنائية - رزقي';

      const htmlContent = this.createBaseTemplate(`
        <h2>🔐 تم تفعيل المصادقة الثنائية</h2>

        <p>مرحباً <strong>${userName}</strong>،</p>

        <div class="alert alert-success">
          <strong>تم تفعيل المصادقة الثنائية بنجاح</strong>
        </div>

        <p>نود إعلامك بأنه تم تفعيل المصادقة الثنائية لحسابك لحماية إضافية.</p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>📋 تفاصيل التفعيل:</h3>
          <ul>
            <li><strong>📅 التاريخ والوقت (ميلادي):</strong> ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</li>
            <li><strong>📧 البريد الإلكتروني:</strong> ${userEmail}</li>
            <li><strong>🛡️ مستوى الحماية:</strong> عالي</li>
          </ul>
        </div>

        <div class="alert alert-info">
          <h3>ℹ️ ما يعني هذا:</h3>
          <ul>
            <li>ستحتاج لكود تحقق عند تسجيل الدخول من أجهزة جديدة</li>
            <li>حسابك الآن محمي بطبقة أمان إضافية</li>
            <li>يمكنك إلغاء تفعيل المصادقة الثنائية من صفحة الأمان</li>
          </ul>
        </div>

        <div style="margin-top: 30px;">
          <p>إذا لم تقم بتفعيل المصادقة الثنائية، يرجى التواصل معنا فوراً على ${this.contactEmail}</p>
        </div>
      `, 'تم تفعيل المصادقة الثنائية');

      const textContent = `
تم تفعيل المصادقة الثنائية - رزقي

مرحباً ${userName}،

تم تفعيل المصادقة الثنائية لحسابك لحماية إضافية.

تفاصيل التفعيل:
- التاريخ والوقت (ميلادي): ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
- البريد الإلكتروني: ${userEmail}
- مستوى الحماية: عالي

ما يعني هذا:
- ستحتاج لكود تحقق عند تسجيل الدخول من أجهزة جديدة
- حسابك الآن محمي بطبقة أمان إضافية
- يمكنك إلغاء تفعيل المصادقة الثنائية من صفحة الأمان

إذا لم تقم بتفعيل المصادقة الثنائية، يرجى التواصل معنا فوراً على ${this.contactEmail}

مع تحيات فريق رزقي
      `;

      return await this.sendEmail({
        to: userEmail,
        subject,
        html: htmlContent,
        text: textContent,
        type: 'two_factor_enabled'
      });

    } catch (error) {
      console.error('❌ خطأ في إرسال إشعار تفعيل المصادقة الثنائية:', error);
      return { success: false, error: 'فشل في إرسال إشعار تفعيل المصادقة الثنائية' };
    }
  }

  // 7. إشعار توثيق الحساب
  async sendAccountVerificationNotification(userEmail: string, userName: string, status: 'approved' | 'rejected', reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const isApproved = status === 'approved';
      const subject = isApproved ? 'تم قبول طلب توثيق الحساب - رزقي' : 'تم رفض طلب توثيق الحساب - رزقي';

      const statusText = isApproved ? 'قبول' : 'رفض';
      const statusIcon = isApproved ? '✅' : '❌';
      const alertClass = isApproved ? 'alert-success' : 'alert-danger';

      const htmlContent = this.createBaseTemplate(`
        <h2>${statusIcon} تم ${statusText} طلب توثيق الحساب</h2>

        <p>مرحباً <strong>${userName}</strong>،</p>

        <div class="alert ${alertClass}">
          <strong>تم ${statusText} طلب توثيق حسابك</strong>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>📋 تفاصيل الطلب:</h3>
          <ul>
            <li><strong>📅 التاريخ والوقت (ميلادي):</strong> ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</li>
            <li><strong>📧 البريد الإلكتروني:</strong> ${userEmail}</li>
            <li><strong>📊 الحالة:</strong> ${statusText}</li>
            ${reason ? `<li><strong>📝 السبب:</strong> ${reason}</li>` : ''}
          </ul>
        </div>

        ${isApproved ? `
          <div class="alert alert-info">
            <h3>🎉 مبروك! حسابك موثق الآن</h3>
            <ul>
              <li>ستظهر علامة التوثيق على ملفك الشخصي</li>
              <li>ستحصل على أولوية في نتائج البحث</li>
              <li>سيثق المستخدمون الآخرون في ملفك الشخصي أكثر</li>
            </ul>
          </div>
        ` : `
          <div class="alert alert-warning">
            <h3>📝 يمكنك إعادة تقديم الطلب</h3>
            <p>يمكنك مراجعة متطلبات التوثيق وإعادة تقديم الطلب من صفحة الملف الشخصي</p>
          </div>
        `}

        <div style="margin-top: 30px;">
          <p>إذا كان لديك أي استفسار، يرجى التواصل معنا على ${this.contactEmail}</p>
        </div>
      `, `تم ${statusText} طلب توثيق الحساب`);

      const textContent = `
تم ${statusText} طلب توثيق الحساب - رزقي

مرحباً ${userName}،

تم ${statusText} طلب توثيق حسابك.

تفاصيل الطلب:
- التاريخ والوقت (ميلادي): ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
- البريد الإلكتروني: ${userEmail}
- الحالة: ${statusText}
${reason ? `- السبب: ${reason}` : ''}

${isApproved ? `
مبروك! حسابك موثق الآن:
- ستظهر علامة التوثيق على ملفك الشخصي
- ستحصل على أولوية في نتائج البحث
- سيثق المستخدمون الآخرون في ملفك الشخصي أكثر
` : `
يمكنك إعادة تقديم الطلب:
يمكنك مراجعة متطلبات التوثيق وإعادة تقديم الطلب من صفحة الملف الشخصي
`}

إذا كان لديك أي استفسار، يرجى التواصل معنا على ${this.contactEmail}

مع تحيات فريق رزقي
      `;

      return await this.sendEmail({
        to: userEmail,
        subject,
        html: htmlContent,
        text: textContent,
        type: 'account_verification'
      });

    } catch (error) {
      console.error('❌ خطأ في إرسال إشعار توثيق الحساب:', error);
      return { success: false, error: 'فشل في إرسال إشعار توثيق الحساب' };
    }
  }

  // 8. إشعارات البلاغات
  async sendReportNotification(
    reporterEmail: string,
    reporterName: string,
    reportedEmail: string,
    reportedName: string,
    status: 'received' | 'under_review' | 'approved' | 'rejected',
    reportType: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const statusTexts = {
        'received': 'تم استلام البلاغ',
        'under_review': 'جاري مراجعة البلاغ',
        'approved': 'تم قبول البلاغ',
        'rejected': 'تم رفض البلاغ'
      };

      const statusText = statusTexts[status];
      const statusIcon = status === 'approved' ? '✅' : status === 'rejected' ? '❌' : '📋';

      // إشعار للمبلغ
      const reporterSubject = `${statusText} - رزقي`;
      const reporterHtml = this.createBaseTemplate(`
        <h2>${statusIcon} ${statusText}</h2>

        <p>مرحباً <strong>${reporterName}</strong>،</p>

        <div class="alert alert-info">
          <strong>${statusText} الذي قدمته ضد ${reportedName}</strong>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>📋 تفاصيل البلاغ:</h3>
          <ul>
            <li><strong>📅 التاريخ (ميلادي):</strong> ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</li>
            <li><strong>📊 الحالة:</strong> ${statusText}</li>
            <li><strong>🏷️ نوع البلاغ:</strong> ${reportType}</li>
            ${reason ? `<li><strong>📝 السبب:</strong> ${reason}</li>` : ''}
          </ul>
        </div>

        <p>شكراً لك على مساعدتنا في الحفاظ على أمان المجتمع.</p>
      `, statusText);

      await this.sendEmail({
        to: reporterEmail,
        subject: reporterSubject,
        html: reporterHtml,
        text: `${statusText} الذي قدمته ضد ${reportedName}. التاريخ (ميلادي): ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}`,
        type: 'report_notification'
      });

      // إشعار للمبلغ عنه (فقط عند الإبلاغ الأولي)
      if (status === 'received') {
        const reportedSubject = 'تم الإبلاغ عن حسابك - رزقي';
        const reportedHtml = this.createBaseTemplate(`
          <h2>⚠️ تم الإبلاغ عن حسابك</h2>

          <p>مرحباً <strong>${reportedName}</strong>،</p>

          <div class="alert alert-warning">
            <strong>تم تقديم بلاغ ضد حسابك</strong>
          </div>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3>📋 تفاصيل البلاغ:</h3>
            <ul>
              <li><strong>📅 التاريخ (ميلادي):</strong> ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</li>
              <li><strong>🏷️ نوع البلاغ:</strong> ${reportType}</li>
              <li><strong>📊 الحالة:</strong> قيد المراجعة</li>
            </ul>
          </div>

          <div class="alert alert-info">
            <h3>📝 ما يجب فعله:</h3>
            <ul>
              <li>راجع سلوكك على المنصة</li>
              <li>تأكد من الالتزام بقواعد المجتمع</li>
              <li>يمكنك التواصل معنا إذا كان لديك استفسار</li>
            </ul>
          </div>
        `, 'تم الإبلاغ عن حسابك');

        await this.sendEmail({
          to: reportedEmail,
          subject: reportedSubject,
          html: reportedHtml,
          text: `تم تقديم بلاغ ضد حسابك. نوع البلاغ: ${reportType}. يرجى مراجعة سلوكك على المنصة.`,
          type: 'report_notification'
        });
      }

      return { success: true };

    } catch (error) {
      console.error('❌ خطأ في إرسال إشعار البلاغ:', error);
      return { success: false, error: 'فشل في إرسال إشعار البلاغ' };
    }
  }



  // 10. إشعارات الإجراءات الإدارية
  async sendAdminActionNotification(
    userEmail: string,
    userName: string,
    action: 'ban' | 'unban' | 'warning' | 'notification',
    reason: string,
    duration?: string,
    adminNotes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const actionTexts = {
        'ban': 'تم حظر حسابك',
        'unban': 'تم إلغاء حظر حسابك',
        'warning': 'تحذير من الإدارة',
        'notification': 'إشعار من الإدارة'
      };

      const actionIcons = {
        'ban': '🚫',
        'unban': '✅',
        'warning': '⚠️',
        'notification': '📢'
      };

      const actionText = actionTexts[action];
      const actionIcon = actionIcons[action];
      const alertClass = action === 'ban' ? 'alert-danger' : action === 'unban' ? 'alert-success' : action === 'warning' ? 'alert-warning' : 'alert-info';

      const subject = `${actionText} - رزقي`;

      const htmlContent = this.createBaseTemplate(`
        <h2>${actionIcon} ${actionText}</h2>

        <p>مرحباً <strong>${userName}</strong>،</p>

        <div class="alert ${alertClass}">
          <strong>${actionText}</strong>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>📋 تفاصيل الإجراء:</h3>
          <ul>
            <li><strong>📅 التاريخ (ميلادي):</strong> ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</li>
            <li><strong>🔧 نوع الإجراء:</strong> ${actionText}</li>
            ${duration ? `<li><strong>⏰ المدة:</strong> ${duration}</li>` : ''}
            <li><strong>📝 السبب:</strong> ${reason}</li>
          </ul>
        </div>

        ${action === 'ban' ? `
          <div class="alert alert-danger">
            <h3>🚫 تم حظر حسابك</h3>
            <p>لن تتمكن من الوصول إلى المنصة ${duration ? `لمدة ${duration}` : 'بشكل دائم'}</p>
          </div>
        ` : action === 'unban' ? `
          <div class="alert alert-success">
            <h3>✅ تم إلغاء الحظر</h3>
            <p>يمكنك الآن الوصول إلى المنصة بشكل طبيعي</p>
          </div>
        ` : action === 'warning' ? `
          <div class="alert alert-warning">
            <h3>⚠️ تحذير مهم</h3>
            <p>يرجى الالتزام بقواعد المجتمع لتجنب إجراءات أخرى</p>
          </div>
        ` : `
          <div class="alert alert-info">
            <h3>📢 إشعار من الإدارة</h3>
            <p>يرجى قراءة الرسالة بعناية</p>
          </div>
        `}

        <div style="margin-top: 30px;">
          <p>إذا كان لديك أي استفسار، يمكنك التواصل معنا على ${this.contactEmail}</p>
        </div>
      `, actionText);

      const textContent = `
${actionText} - رزقي

مرحباً ${userName}،

${actionText}

تفاصيل الإجراء:
- التاريخ (ميلادي): ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
- نوع الإجراء: ${actionText}
${duration ? `- المدة: ${duration}` : ''}
- السبب: ${reason}

إذا كان لديك أي استفسار، يمكنك التواصل معنا على ${this.contactEmail}

مع تحيات فريق رزقي
      `;

      return await this.sendEmail({
        to: userEmail,
        subject,
        html: htmlContent,
        text: textContent,
        type: 'admin_action'
      });

    } catch (error) {
      console.error('❌ خطأ في إرسال إشعار الإجراء الإداري:', error);
      return { success: false, error: 'فشل في إرسال إشعار الإجراء الإداري' };
    }
  }

  // 11. إشعار تسجيل الدخول الناجح (محسن)
  async sendSuccessfulLoginNotification(
    userEmail: string,
    userName: string,
    loginData: {
      timestamp: string;
      ipAddress?: string;
      location?: string;
      deviceType?: string;
      browser?: string;
      userAgent?: string;
      loginMethod?: 'normal' | 'trusted_device' | 'two_factor';
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📧 بدء إرسال إشعار تسجيل الدخول الناجح المحسن...');

      // جمع المعلومات المحسنة
      const enhancedData = await this.gatherEnhancedLoginData(loginData);

      // تحديد نوع تسجيل الدخول للموضوع
      const loginMethodText = this.getLoginMethodText(enhancedData.loginMethod);
      const subject = `🔐 تسجيل دخول ناجح - رزقي`;

      // تحويل التاريخ للميلادي مع تفاصيل أكثر
      const loginDate = new Date(enhancedData.timestamp);
      const gregorianDate = loginDate.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const gregorianTime = loginDate.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const dayName = loginDate.toLocaleDateString('ar-SA', { weekday: 'long' });

      // الحصول على معلومات الأمان
      const securityIcon = this.getSecurityIcon(enhancedData.securityLevel);
      const securityText = this.getSecurityText(enhancedData.securityLevel);

      const htmlContent = createLoginNotificationTemplate({
        type: 'login_success',
        title: loginMethodText,
        content: `
          <p>مرحباً <strong>${userName}</strong>،</p>

          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>✅ تم تسجيل الدخول إلى حسابك بنجاح</strong>
            ${enhancedData.loginMethod === 'trusted_device' ? '<br><small>🔒 تم تسجيل الدخول من جهاز موثوق</small>' : ''}
            ${enhancedData.loginMethod === 'two_factor' ? '<br><small>🛡️ تم التحقق بالمصادقة الثنائية</small>' : ''}
          </div>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3>📋 تفاصيل تسجيل الدخول:</h3>
            <ul>
              <li><strong>📅 التاريخ:</strong> ${dayName} ${gregorianDate}</li>
              <li><strong>🕐 الوقت:</strong> ${gregorianTime}</li>
              <li><strong>IP:</strong> ${enhancedData.realIP || enhancedData.ipAddress || 'غير معروف'}</li>
              <li><strong>📍 الموقع الجغرافي:</strong> ${enhancedData.locationInfo?.location || enhancedData.location || 'غير محدد'}</li>
              ${enhancedData.locationInfo?.country ? `<li><strong>🏳️ الدولة:</strong> ${enhancedData.locationInfo.country}</li>` : ''}
              ${enhancedData.locationInfo?.city ? `<li><strong>🏙️ المدينة:</strong> ${enhancedData.locationInfo.city}</li>` : ''}
              ${enhancedData.locationInfo?.isp ? `<li><strong>🌐 مزود الخدمة:</strong> ${enhancedData.locationInfo.isp}</li>` : ''}
            </ul>
          </div>

          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3>📱 معلومات الجهاز:</h3>
            <ul>
              ${enhancedData.deviceInfo ? `
                <li><strong>💻 نوع الجهاز:</strong> ${DeviceAnalysisService.getSimpleDeviceDescription(enhancedData.deviceInfo)}</li>
                <li><strong>🖥️ نظام التشغيل:</strong> ${enhancedData.deviceInfo.os} ${enhancedData.deviceInfo.osVersion || ''}</li>
                <li><strong>🌐 المتصفح:</strong> ${enhancedData.deviceInfo.browser} ${enhancedData.deviceInfo.browserVersion || ''}</li>
                ${enhancedData.deviceInfo.deviceBrand ? `<li><strong>🏷️ العلامة التجارية:</strong> ${enhancedData.deviceInfo.deviceBrand}</li>` : ''}
                ${enhancedData.deviceInfo.screenResolution ? `<li><strong>📺 دقة الشاشة:</strong> ${enhancedData.deviceInfo.screenResolution}</li>` : ''}
                ${enhancedData.deviceInfo.language ? `<li><strong>🗣️ اللغة:</strong> ${enhancedData.deviceInfo.language}</li>` : ''}
              ` : `
                <li><strong>💻 نوع الجهاز:</strong> ${enhancedData.deviceType || 'غير معروف'}</li>
                <li><strong>🌐 المتصفح:</strong> ${enhancedData.browser || 'غير معروف'}</li>
              `}
            </ul>
          </div>

          <div style="background-color: ${enhancedData.securityLevel === 'high' ? '#d4edda' : enhancedData.securityLevel === 'medium' ? '#fff3cd' : '#f8d7da'}; border: 1px solid ${enhancedData.securityLevel === 'high' ? '#c3e6cb' : enhancedData.securityLevel === 'medium' ? '#fbbf24' : '#f5c6cb'}; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>${securityIcon} مستوى الأمان: ${securityText}</h3>
            <p>تم تقييم مستوى أمان هذه الجلسة بناءً على المعلومات المتاحة.</p>
            ${enhancedData.securityLevel === 'low' ? '<p><strong>⚠️ تحذير:</strong> مستوى أمان منخفض - يُنصح بمراجعة الإعدادات الأمنية.</p>' : ''}
          </div>
        `,
        securityNote: `
          <div style="background-color: #fff3cd; border: 1px solid #fbbf24; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>🔒 أمان حسابك</h3>
            <p>إذا لم تقم بتسجيل الدخول هذا، يرجى:</p>
            <ul>
              <li>تغيير كلمة المرور فوراً</li>
              <li>تفعيل المصادقة الثنائية إذا لم تكن مفعلة</li>
              <li>مراجعة الأجهزة الموثقة</li>
              <li>التواصل معنا على ${this.contactEmail}</li>
            </ul>
          </div>
        `,
        deviceInfo: enhancedData.deviceInfo ? `IP: ${enhancedData.realIP || enhancedData.ipAddress || 'غير معروف'} | الموقع: ${enhancedData.locationInfo?.location || enhancedData.location || 'غير محدد'} | الجهاز: ${DeviceAnalysisService.getSimpleDeviceDescription(enhancedData.deviceInfo)}` : `IP: ${enhancedData.realIP || enhancedData.ipAddress || 'غير معروف'} | الموقع: ${enhancedData.locationInfo?.location || enhancedData.location || 'غير محدد'} | الجهاز: ${enhancedData.deviceType || 'غير معروف'}`,
        ipAddress: enhancedData.realIP || enhancedData.ipAddress,
        location: enhancedData.locationInfo?.location || enhancedData.location
      });

      const textContent = `
${loginMethodText} - رزقي

مرحباً ${userName}،

تم تسجيل الدخول إلى حسابك بنجاح
${enhancedData.loginMethod === 'trusted_device' ? 'تم تسجيل الدخول من جهاز موثوق' : ''}
${enhancedData.loginMethod === 'two_factor' ? 'تم التحقق بالمصادقة الثنائية' : ''}

تفاصيل تسجيل الدخول:
- التاريخ (ميلادي): ${dayName} ${gregorianDate}
- الوقت: ${gregorianTime}
- IP: ${enhancedData.realIP || enhancedData.ipAddress || 'غير معروف'}
- الموقع الجغرافي: ${enhancedData.locationInfo?.location || enhancedData.location || 'غير محدد'}
${enhancedData.locationInfo?.country ? `- الدولة: ${enhancedData.locationInfo.country}` : ''}
${enhancedData.locationInfo?.city ? `- المدينة: ${enhancedData.locationInfo.city}` : ''}
${enhancedData.locationInfo?.isp ? `- مزود الخدمة: ${enhancedData.locationInfo.isp}` : ''}

معلومات الجهاز:
${enhancedData.deviceInfo ? `
- نوع الجهاز: ${DeviceAnalysisService.getSimpleDeviceDescription(enhancedData.deviceInfo)}
- نظام التشغيل: ${enhancedData.deviceInfo.os} ${enhancedData.deviceInfo.osVersion || ''}
- المتصفح: ${enhancedData.deviceInfo.browser} ${enhancedData.deviceInfo.browserVersion || ''}
${enhancedData.deviceInfo.deviceBrand ? `- العلامة التجارية: ${enhancedData.deviceInfo.deviceBrand}` : ''}
${enhancedData.deviceInfo.screenResolution ? `- دقة الشاشة: ${enhancedData.deviceInfo.screenResolution}` : ''}
` : `
- نوع الجهاز: ${enhancedData.deviceType || 'غير معروف'}
- المتصفح: ${enhancedData.browser || 'غير معروف'}
`}

مستوى الأمان: ${this.getSecurityText(enhancedData.securityLevel)}
${enhancedData.securityLevel === 'low' ? 'تحذير: مستوى أمان منخفض - يُنصح بمراجعة الإعدادات الأمنية.' : ''}

أمان حسابك:
إذا لم تقم بتسجيل الدخول هذا، يرجى:
- تغيير كلمة المرور فوراً
- تفعيل المصادقة الثنائية إذا لم تكن مفعلة
- مراجعة الأجهزة الموثقة
- التواصل معنا على ${this.contactEmail}

مع تحيات فريق رزقي
      `;

      return await this.sendEmail({
        to: userEmail,
        subject,
        html: htmlContent,
        text: textContent,
        type: 'login_success'
      });

    } catch (error) {
      console.error('❌ خطأ في إرسال إشعار تسجيل الدخول الناجح:', error);
      return { success: false, error: 'فشل في إرسال إشعار تسجيل الدخول الناجح' };
    }
  }

  // 11.5. إشعار تسجيل الدخول الناجح للمشرفين (محسن)
  async sendAdminSuccessfulLoginNotification(
    adminEmail: string,
    adminName: string,
    adminUsername: string,
    loginData: AdminLoginData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📧 بدء إرسال إشعار تسجيل الدخول الناجح للمشرف...');

      // جمع المعلومات المحسنة
      const enhancedData = await this.gatherEnhancedAdminLoginData(loginData);

      // تحديد نوع تسجيل الدخول للموضوع
      const loginMethodText = this.getAdminLoginMethodText(enhancedData.loginMethod);
      const subject = `🛡️ ${loginMethodText} - لوحة إدارة رزقي`;

      // تحويل التاريخ للميلادي مع تفاصيل أكثر
      const loginDate = new Date(enhancedData.timestamp);
      const gregorianDate = loginDate.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const gregorianTime = loginDate.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const dayName = loginDate.toLocaleDateString('ar-SA', { weekday: 'long' });

      // الحصول على معلومات الأمان
      const securityIcon = this.getSecurityIcon(enhancedData.securityLevel);
      const securityText = this.getSecurityText(enhancedData.securityLevel);

      const htmlContent = this.createBaseTemplate(`
        <h2>🛡️ ${loginMethodText}</h2>

        <p>مرحباً <strong>${adminName}</strong> (<code>${adminUsername}</code>)،</p>

        <div class="alert alert-success">
          <strong>✅ تم تسجيل الدخول إلى لوحة الإدارة بنجاح</strong>
          ${enhancedData.loginMethod === 'trusted_device' ? '<br><small>🔒 تم تسجيل الدخول من جهاز موثوق</small>' : ''}
          ${enhancedData.loginMethod === 'two_factor' ? '<br><small>🛡️ تم التحقق بالمصادقة الثنائية</small>' : ''}
        </div>

        <div style="background-color: #fff3cd; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3>⚠️ تنبيه أمني مهم</h3>
          <p><strong>هذا إشعار أمني لتسجيل دخول إلى لوحة إدارة المنصة.</strong></p>
          <p>إذا لم تقم بتسجيل الدخول هذا، يرجى اتخاذ إجراءات فورية لحماية النظام.</p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>📋 تفاصيل تسجيل الدخول:</h3>
          <ul>
            <li><strong>📅 التاريخ:</strong> ${dayName} ${gregorianDate}</li>
            <li><strong>🕐 الوقت:</strong> ${gregorianTime}</li>
            <li><strong>👤 اسم المستخدم:</strong> ${adminUsername}</li>
            <li><strong>IP:</strong> ${enhancedData.realIP || enhancedData.ipAddress || 'غير معروف'}</li>
            <li><strong>📍 الموقع الجغرافي:</strong> ${enhancedData.locationInfo?.location || enhancedData.location || 'غير محدد'}</li>
            ${enhancedData.locationInfo?.country ? `<li><strong>🏳️ الدولة:</strong> ${enhancedData.locationInfo.country}</li>` : ''}
            ${enhancedData.locationInfo?.city ? `<li><strong>🏙️ المدينة:</strong> ${enhancedData.locationInfo.city}</li>` : ''}
            ${enhancedData.locationInfo?.isp ? `<li><strong>🌐 مزود الخدمة:</strong> ${enhancedData.locationInfo.isp}</li>` : ''}
          </ul>
        </div>

        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>📱 معلومات الجهاز:</h3>
          <ul>
            ${enhancedData.deviceInfo ? `
              <li><strong>💻 نوع الجهاز:</strong> ${DeviceAnalysisService.getSimpleDeviceDescription(enhancedData.deviceInfo)}</li>
              <li><strong>🖥️ نظام التشغيل:</strong> ${enhancedData.deviceInfo.os} ${enhancedData.deviceInfo.osVersion || ''}</li>
              <li><strong>🌐 المتصفح:</strong> ${enhancedData.deviceInfo.browser} ${enhancedData.deviceInfo.browserVersion || ''}</li>
              ${enhancedData.deviceInfo.deviceBrand ? `<li><strong>🏷️ العلامة التجارية:</strong> ${enhancedData.deviceInfo.deviceBrand}</li>` : ''}
              ${enhancedData.deviceInfo.screenResolution ? `<li><strong>📺 دقة الشاشة:</strong> ${enhancedData.deviceInfo.screenResolution}</li>` : ''}
              ${enhancedData.deviceInfo.language ? `<li><strong>🗣️ اللغة:</strong> ${enhancedData.deviceInfo.language}</li>` : ''}
            ` : `
              <li><strong>💻 نوع الجهاز:</strong> ${enhancedData.deviceType || 'غير معروف'}</li>
              <li><strong>🌐 المتصفح:</strong> ${enhancedData.browser || 'غير معروف'}</li>
            `}
          </ul>
        </div>

        <div class="alert ${enhancedData.securityLevel === 'high' ? 'alert-success' : enhancedData.securityLevel === 'medium' ? 'alert-warning' : 'alert-danger'}">
          <h3>${securityIcon} مستوى الأمان: ${securityText}</h3>
          <p>تم تقييم مستوى أمان هذه الجلسة الإدارية بناءً على المعلومات المتاحة.</p>
          ${enhancedData.securityLevel === 'low' ? '<p><strong>🚨 تحذير حرج:</strong> مستوى أمان منخفض لجلسة إدارية - يُنصح بمراجعة فورية!</p>' : ''}
        </div>

        <div class="alert alert-danger">
          <h3>🔒 أمان لوحة الإدارة</h3>
          <p><strong>إذا لم تقم بتسجيل الدخول هذا، يرجى اتخاذ الإجراءات التالية فوراً:</strong></p>
          <ul>
            <li>تغيير كلمة المرور الإدارية فوراً</li>
            <li>تفعيل المصادقة الثنائية إذا لم تكن مفعلة</li>
            <li>مراجعة الأجهزة الموثقة للمشرفين</li>
            <li>التواصل مع فريق الأمان على ${this.contactEmail}</li>
            <li>مراجعة سجلات النشاط الإداري</li>
          </ul>
        </div>
      `, loginMethodText);

      const textContent = `
${loginMethodText} - لوحة إدارة رزقي

مرحباً ${adminName} (${adminUsername})،

تم تسجيل الدخول إلى لوحة الإدارة بنجاح
${enhancedData.loginMethod === 'trusted_device' ? 'تم تسجيل الدخول من جهاز موثوق' : ''}
${enhancedData.loginMethod === 'two_factor' ? 'تم التحقق بالمصادقة الثنائية' : ''}

⚠️ تنبيه أمني مهم:
هذا إشعار أمني لتسجيل دخول إلى لوحة إدارة المنصة.
إذا لم تقم بتسجيل الدخول هذا، يرجى اتخاذ إجراءات فورية لحماية النظام.

تفاصيل تسجيل الدخول:
- التاريخ (ميلادي): ${dayName} ${gregorianDate}
- الوقت: ${gregorianTime}
- اسم المستخدم: ${adminUsername}
- IP: ${enhancedData.realIP || enhancedData.ipAddress || 'غير معروف'}
- الموقع الجغرافي: ${enhancedData.locationInfo?.location || enhancedData.location || 'غير محدد'}
${enhancedData.locationInfo?.country ? `- الدولة: ${enhancedData.locationInfo.country}` : ''}
${enhancedData.locationInfo?.city ? `- المدينة: ${enhancedData.locationInfo.city}` : ''}
${enhancedData.locationInfo?.isp ? `- مزود الخدمة: ${enhancedData.locationInfo.isp}` : ''}

معلومات الجهاز:
${enhancedData.deviceInfo ? `
- نوع الجهاز: ${DeviceAnalysisService.getSimpleDeviceDescription(enhancedData.deviceInfo)}
- نظام التشغيل: ${enhancedData.deviceInfo.os} ${enhancedData.deviceInfo.osVersion || ''}
- المتصفح: ${enhancedData.deviceInfo.browser} ${enhancedData.deviceInfo.browserVersion || ''}
${enhancedData.deviceInfo.deviceBrand ? `- العلامة التجارية: ${enhancedData.deviceInfo.deviceBrand}` : ''}
` : `
- نوع الجهاز: ${enhancedData.deviceType || 'غير معروف'}
- المتصفح: ${enhancedData.browser || 'غير معروف'}
`}

مستوى الأمان: ${this.getSecurityText(enhancedData.securityLevel)}
${enhancedData.securityLevel === 'low' ? 'تحذير حرج: مستوى أمان منخفض لجلسة إدارية - يُنصح بمراجعة فورية!' : ''}

أمان لوحة الإدارة:
إذا لم تقم بتسجيل الدخول هذا، يرجى اتخاذ الإجراءات التالية فوراً:
- تغيير كلمة المرور الإدارية فوراً
- تفعيل المصادقة الثنائية إذا لم تكن مفعلة
- مراجعة الأجهزة الموثقة للمشرفين
- التواصل مع فريق الأمان على ${this.contactEmail}
- مراجعة سجلات النشاط الإداري

مع تحيات فريق الأمان - رزقي
      `;

      return await this.sendEmail({
        to: adminEmail,
        subject,
        html: htmlContent,
        text: textContent,
        type: 'admin_login_success'
      });

    } catch (error) {
      console.error('❌ خطأ في إرسال إشعار تسجيل الدخول الناجح للمشرف:', error);
      return { success: false, error: 'فشل في إرسال إشعار تسجيل الدخول الناجح للمشرف' };
    }
  }

  // 12. إشعار محاولة تسجيل دخول فاشلة (محسن)
  async sendFailedLoginNotification(
    userEmail: string,
    userName: string,
    failureData: {
      timestamp: string;
      ipAddress?: string;
      location?: string;
      deviceType?: string;
      browser?: string;
      failureReason: string;
      attemptsCount?: number;
      userAgent?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🚨 بدء إرسال إشعار محاولة تسجيل الدخول الفاشلة المحسن...');

      // جمع المعلومات المحسنة
      const enhancedData = await this.gatherEnhancedLoginData({
        ...failureData,
        loginMethod: 'failed'
      });

      const subject = '🚨 محاولة تسجيل دخول فاشلة - رزقي';

      // تحويل التاريخ
      const failureDate = new Date(enhancedData.timestamp);
      const gregorianDate = failureDate.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const gregorianTime = failureDate.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const dayName = failureDate.toLocaleDateString('ar-SA', { weekday: 'long' });

      // تحديد مستوى الخطر
      const riskLevel = this.determineRiskLevel(failureData.attemptsCount, enhancedData.securityLevel);
      const riskIcon = this.getRiskIcon(riskLevel);
      const riskText = this.getRiskText(riskLevel);

      const htmlContent = this.createBaseTemplate(`
        <h2>🚨 محاولة تسجيل دخول فاشلة</h2>

        <p>مرحباً <strong>${userName}</strong>،</p>

        <div class="alert alert-danger">
          <strong>⚠️ تم رصد محاولة تسجيل دخول فاشلة إلى حسابك</strong>
          <br><small>سبب الفشل: ${failureData.failureReason}</small>
        </div>

        <div class="alert ${riskLevel === 'critical' ? 'alert-danger' : riskLevel === 'high' ? 'alert-warning' : 'alert-info'}">
          <h3>${riskIcon} مستوى الخطر: ${riskText}</h3>
          ${riskLevel === 'critical' ? '<p><strong>🔴 تحذير حرج:</strong> محاولات متكررة من نفس المصدر!</p>' : ''}
          ${riskLevel === 'high' ? '<p><strong>🚨 تحذير عالي:</strong> عدد محاولات مشبوه!</p>' : ''}
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>📋 تفاصيل المحاولة:</h3>
          <ul>
            <li><strong>📅 التاريخ:</strong> ${dayName} ${gregorianDate}</li>
            <li><strong>🕐 الوقت:</strong> ${gregorianTime}</li>
            <li><strong>❌ سبب الفشل:</strong> ${failureData.failureReason}</li>
            <li><strong>IP:</strong> ${enhancedData.realIP || enhancedData.ipAddress || 'غير معروف'}</li>
            <li><strong>📍 الموقع الجغرافي:</strong> ${enhancedData.locationInfo?.location || enhancedData.location || 'غير محدد'}</li>
            ${enhancedData.locationInfo?.country ? `<li><strong>🏳️ الدولة:</strong> ${enhancedData.locationInfo.country}</li>` : ''}
            ${enhancedData.locationInfo?.city ? `<li><strong>🏙️ المدينة:</strong> ${enhancedData.locationInfo.city}</li>` : ''}
            ${enhancedData.locationInfo?.isp ? `<li><strong>🌐 مزود الخدمة:</strong> ${enhancedData.locationInfo.isp}</li>` : ''}
            ${failureData.attemptsCount ? `<li><strong>🔢 عدد المحاولات:</strong> ${failureData.attemptsCount}</li>` : ''}
          </ul>
        </div>

        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>📱 معلومات الجهاز المشبوه:</h3>
          <ul>
            ${enhancedData.deviceInfo ? `
              <li><strong>💻 نوع الجهاز:</strong> ${DeviceAnalysisService.getSimpleDeviceDescription(enhancedData.deviceInfo)}</li>
              <li><strong>🖥️ نظام التشغيل:</strong> ${enhancedData.deviceInfo.os} ${enhancedData.deviceInfo.osVersion || ''}</li>
              <li><strong>🌐 المتصفح:</strong> ${enhancedData.deviceInfo.browser} ${enhancedData.deviceInfo.browserVersion || ''}</li>
              ${enhancedData.deviceInfo.deviceBrand ? `<li><strong>🏷️ العلامة التجارية:</strong> ${enhancedData.deviceInfo.deviceBrand}</li>` : ''}
              ${enhancedData.deviceInfo.screenResolution ? `<li><strong>📺 دقة الشاشة:</strong> ${enhancedData.deviceInfo.screenResolution}</li>` : ''}
              ${enhancedData.deviceInfo.isBot ? '<li><strong>🤖 تحذير:</strong> قد يكون بوت أو برنامج آلي</li>' : ''}
            ` : `
              <li><strong>💻 نوع الجهاز:</strong> ${enhancedData.deviceType || 'غير معروف'}</li>
              <li><strong>🌐 المتصفح:</strong> ${enhancedData.browser || 'غير معروف'}</li>
            `}
          </ul>
        </div>

        <div class="alert alert-danger">
          <h3>🔒 إجراءات الأمان المطلوبة</h3>
          <p>إذا لم تكن أنت من حاول تسجيل الدخول:</p>
          <ul>
            <li>تغيير كلمة المرور فوراً</li>
            <li>تفعيل المصادقة الثنائية</li>
            <li>مراجعة الأجهزة الموثقة</li>
            <li>التواصل معنا على ${this.contactEmail}</li>
          </ul>
        </div>
      `, 'محاولة تسجيل دخول فاشلة');

      const textContent = `
محاولة تسجيل دخول فاشلة - رزقي

مرحباً ${userName}،

تم رصد محاولة تسجيل دخول فاشلة إلى حسابك
سبب الفشل: ${failureData.failureReason}

مستوى الخطر: ${riskText}
${riskLevel === 'critical' ? 'تحذير حرج: محاولات متكررة من نفس المصدر!' : ''}
${riskLevel === 'high' ? 'تحذير عالي: عدد محاولات مشبوه!' : ''}

تفاصيل المحاولة:
- التاريخ (ميلادي): ${dayName} ${gregorianDate}
- الوقت: ${gregorianTime}
- سبب الفشل: ${failureData.failureReason}
- IP: ${enhancedData.realIP || enhancedData.ipAddress || 'غير معروف'}
- الموقع الجغرافي: ${enhancedData.locationInfo?.location || enhancedData.location || 'غير محدد'}
${enhancedData.locationInfo?.country ? `- الدولة: ${enhancedData.locationInfo.country}` : ''}
${enhancedData.locationInfo?.city ? `- المدينة: ${enhancedData.locationInfo.city}` : ''}
${enhancedData.locationInfo?.isp ? `- مزود الخدمة: ${enhancedData.locationInfo.isp}` : ''}
${failureData.attemptsCount ? `- عدد المحاولات: ${failureData.attemptsCount}` : ''}

معلومات الجهاز المشبوه:
${enhancedData.deviceInfo ? `
- نوع الجهاز: ${DeviceAnalysisService.getSimpleDeviceDescription(enhancedData.deviceInfo)}
- نظام التشغيل: ${enhancedData.deviceInfo.os} ${enhancedData.deviceInfo.osVersion || ''}
- المتصفح: ${enhancedData.deviceInfo.browser} ${enhancedData.deviceInfo.browserVersion || ''}
${enhancedData.deviceInfo.deviceBrand ? `- العلامة التجارية: ${enhancedData.deviceInfo.deviceBrand}` : ''}
${enhancedData.deviceInfo.isBot ? '- تحذير: قد يكون بوت أو برنامج آلي' : ''}
` : `
- نوع الجهاز: ${enhancedData.deviceType || 'غير معروف'}
- المتصفح: ${enhancedData.browser || 'غير معروف'}
`}

إجراءات الأمان المطلوبة:
إذا لم تكن أنت من حاول تسجيل الدخول، يرجى:
- تغيير كلمة المرور فوراً
- تفعيل المصادقة الثنائية إذا لم تكن مفعلة
- مراجعة الأجهزة الموثقة
- التواصل معنا على ${this.contactEmail}

مع تحيات فريق رزقي
      `;

      return await this.sendEmail({
        to: userEmail,
        subject,
        html: htmlContent,
        text: textContent,
        type: 'login_failure'
      });

    } catch (error) {
      console.error('❌ خطأ في إرسال إشعار محاولة تسجيل الدخول الفاشلة:', error);
      return { success: false, error: 'فشل في إرسال إشعار محاولة تسجيل الدخول الفاشلة' };
    }
  }

  // 12.5. إشعار محاولة تسجيل دخول فاشلة للمشرفين (محسن)
  async sendAdminFailedLoginNotification(
    adminEmail: string,
    adminName: string,
    adminUsername: string,
    failureData: AdminLoginData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📧 بدء إرسال إشعار محاولة تسجيل الدخول الفاشلة للمشرف...');

      // جمع المعلومات المحسنة
      const enhancedData = await this.gatherEnhancedAdminLoginData(failureData);

      // تحديد مستوى الخطر (أعلى للمشرفين)
      const riskLevel = this.determineAdminRiskLevel(enhancedData);
      const riskIcon = this.getRiskIcon(riskLevel);
      const riskText = this.getRiskText(riskLevel);

      const subject = `🚨 محاولة دخول مشبوهة للوحة الإدارة - ${riskText}`;

      // تحويل التاريخ للميلادي
      const attemptDate = new Date(enhancedData.timestamp);
      const gregorianDate = attemptDate.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const gregorianTime = attemptDate.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const dayName = attemptDate.toLocaleDateString('ar-SA', { weekday: 'long' });

      const htmlContent = this.createBaseTemplate(`
        <h2>🚨 محاولة دخول مشبوهة للوحة الإدارة</h2>

        <p>مرحباً <strong>${adminName}</strong> (<code>${adminUsername}</code>)،</p>

        <div class="alert alert-danger">
          <strong>⚠️ تم رصد محاولة دخول فاشلة للوحة الإدارة</strong>
          <br><small>هذا تنبيه أمني حرج لحماية النظام الإداري</small>
        </div>

        <div class="alert ${riskLevel === 'critical' ? 'alert-danger' : riskLevel === 'high' ? 'alert-warning' : 'alert-info'}">
          <h3>${riskIcon} مستوى الخطر: ${riskText}</h3>
          <p>تم تقييم مستوى خطر هذه المحاولة بناءً على عوامل متعددة.</p>
          ${riskLevel === 'critical' ? '<p><strong>🚨 تحذير حرج:</strong> محاولة عالية الخطورة - يُنصح بإجراءات فورية!</p>' : ''}
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>📋 تفاصيل المحاولة:</h3>
          <ul>
            <li><strong>📅 التاريخ:</strong> ${dayName} ${gregorianDate}</li>
            <li><strong>🕐 الوقت:</strong> ${gregorianTime}</li>
            <li><strong>👤 اسم المستخدم المستهدف:</strong> ${adminUsername}</li>
            <li><strong>IP:</strong> ${enhancedData.realIP || enhancedData.ipAddress || 'غير معروف'}</li>
            <li><strong>📍 الموقع الجغرافي:</strong> ${enhancedData.locationInfo?.location || enhancedData.location || 'غير محدد'}</li>
            ${enhancedData.locationInfo?.country ? `<li><strong>🏳️ الدولة:</strong> ${enhancedData.locationInfo.country}</li>` : ''}
            ${enhancedData.locationInfo?.city ? `<li><strong>🏙️ المدينة:</strong> ${enhancedData.locationInfo.city}</li>` : ''}
            ${enhancedData.locationInfo?.isp ? `<li><strong>🌐 مزود الخدمة:</strong> ${enhancedData.locationInfo.isp}</li>` : ''}
          </ul>
        </div>

        <div style="background-color: #fff3cd; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>📱 معلومات الجهاز المشبوه:</h3>
          <ul>
            ${enhancedData.deviceInfo ? `
              <li><strong>💻 نوع الجهاز:</strong> ${DeviceAnalysisService.getSimpleDeviceDescription(enhancedData.deviceInfo)}</li>
              <li><strong>🖥️ نظام التشغيل:</strong> ${enhancedData.deviceInfo.os} ${enhancedData.deviceInfo.osVersion || ''}</li>
              <li><strong>🌐 المتصفح:</strong> ${enhancedData.deviceInfo.browser} ${enhancedData.deviceInfo.browserVersion || ''}</li>
              ${enhancedData.deviceInfo.isBot ? '<li><strong>🤖 تحذير:</strong> تم اكتشاف أن هذا الجهاز قد يكون بوت!</li>' : ''}
              ${enhancedData.deviceInfo.deviceBrand ? `<li><strong>🏷️ العلامة التجارية:</strong> ${enhancedData.deviceInfo.deviceBrand}</li>` : ''}
              ${enhancedData.deviceInfo.screenResolution ? `<li><strong>📺 دقة الشاشة:</strong> ${enhancedData.deviceInfo.screenResolution}</li>` : ''}
            ` : `
              <li><strong>💻 نوع الجهاز:</strong> ${enhancedData.deviceType || 'غير معروف'}</li>
              <li><strong>🌐 المتصفح:</strong> ${enhancedData.browser || 'غير معروف'}</li>
            `}
          </ul>
        </div>

        <div class="alert alert-danger">
          <h3>🔒 إجراءات الحماية الموصى بها</h3>
          <p><strong>يُنصح بشدة باتخاذ الإجراءات التالية فوراً:</strong></p>
          <ul>
            <li><strong>تغيير كلمة المرور الإدارية</strong> إذا كانت هناك شكوك في تسريبها</li>
            <li><strong>تفعيل المصادقة الثنائية</strong> إذا لم تكن مفعلة</li>
            <li><strong>مراجعة الأجهزة الموثقة</strong> وإزالة أي جهاز مشبوه</li>
            <li><strong>مراقبة سجلات النشاط</strong> للتأكد من عدم وجود أنشطة مشبوهة</li>
            <li><strong>التواصل مع فريق الأمان</strong> على ${this.contactEmail}</li>
            ${riskLevel === 'critical' ? '<li><strong>إبلاغ السلطات المختصة</strong> في حالة الاشتباه في هجوم منظم</li>' : ''}
          </ul>
        </div>

        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>ℹ️ معلومات إضافية</h3>
          <p>هذا الإشعار تلقائي لحماية أمان لوحة الإدارة. إذا كانت هذه المحاولة من قبلك، يمكنك تجاهل هذا الإشعار.</p>
          <p>للمزيد من المساعدة، تواصل معنا على: ${this.contactEmail}</p>
        </div>
      `, 'محاولة دخول مشبوهة للوحة الإدارة');

      const textContent = `
محاولة دخول مشبوهة للوحة الإدارة - ${riskText}

مرحباً ${adminName} (${adminUsername})،

تم رصد محاولة دخول فاشلة للوحة الإدارة
هذا تنبيه أمني حرج لحماية النظام الإداري

مستوى الخطر: ${riskText}
${riskLevel === 'critical' ? 'تحذير حرج: محاولة عالية الخطورة - يُنصح بإجراءات فورية!' : ''}

تفاصيل المحاولة:
- التاريخ (ميلادي): ${dayName} ${gregorianDate}
- الوقت: ${gregorianTime}
- اسم المستخدم المستهدف: ${adminUsername}
- IP: ${enhancedData.realIP || enhancedData.ipAddress || 'غير معروف'}
- الموقع الجغرافي: ${enhancedData.locationInfo?.location || enhancedData.location || 'غير محدد'}
${enhancedData.locationInfo?.country ? `- الدولة: ${enhancedData.locationInfo.country}` : ''}
${enhancedData.locationInfo?.city ? `- المدينة: ${enhancedData.locationInfo.city}` : ''}
${enhancedData.locationInfo?.isp ? `- مزود الخدمة: ${enhancedData.locationInfo.isp}` : ''}

معلومات الجهاز المشبوه:
${enhancedData.deviceInfo ? `
- نوع الجهاز: ${DeviceAnalysisService.getSimpleDeviceDescription(enhancedData.deviceInfo)}
- نظام التشغيل: ${enhancedData.deviceInfo.os} ${enhancedData.deviceInfo.osVersion || ''}
- المتصفح: ${enhancedData.deviceInfo.browser} ${enhancedData.deviceInfo.browserVersion || ''}
${enhancedData.deviceInfo.isBot ? '- تحذير: تم اكتشاف أن هذا الجهاز قد يكون بوت!' : ''}
` : `
- نوع الجهاز: ${enhancedData.deviceType || 'غير معروف'}
- المتصفح: ${enhancedData.browser || 'غير معروف'}
`}

إجراءات الحماية الموصى بها:
- تغيير كلمة المرور الإدارية إذا كانت هناك شكوك في تسريبها
- تفعيل المصادقة الثنائية إذا لم تكن مفعلة
- مراجعة الأجهزة الموثقة وإزالة أي جهاز مشبوه
- مراقبة سجلات النشاط للتأكد من عدم وجود أنشطة مشبوهة
- التواصل مع فريق الأمان على ${this.contactEmail}
${riskLevel === 'critical' ? '- إبلاغ السلطات المختصة في حالة الاشتباه في هجوم منظم' : ''}

هذا الإشعار تلقائي لحماية أمان لوحة الإدارة. إذا كانت هذه المحاولة من قبلك، يمكنك تجاهل هذا الإشعار.

مع تحيات فريق الأمان - رزقي
      `;

      return await this.sendEmail({
        to: adminEmail,
        subject,
        html: htmlContent,
        text: textContent,
        type: 'admin_login_failure'
      });

    } catch (error) {
      console.error('❌ خطأ في إرسال إشعار محاولة تسجيل الدخول الفاشلة للمشرف:', error);
      return { success: false, error: 'فشل في إرسال إشعار محاولة تسجيل الدخول الفاشلة للمشرف' };
    }
  }

  // 13. إشعار فشل التحقق الثنائي
  async sendTwoFactorFailureNotification(
    userEmail: string,
    userName: string,
    failureData: {
      timestamp: string;
      ipAddress?: string;
      location?: string;
      deviceType?: string;
      browser?: string;
      attemptsCount?: number;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const subject = 'فشل في التحقق الثنائي - رزقي';

      const htmlContent = this.createBaseTemplate(`
        <h2>🔐 فشل في التحقق الثنائي</h2>

        <p>مرحباً <strong>${userName}</strong>،</p>

        <div class="alert alert-warning">
          <strong>تم رصد محاولة فاشلة للتحقق الثنائي في حسابك</strong>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>📋 تفاصيل المحاولة:</h3>
          <ul>
            <li><strong>📅 التاريخ (ميلادي):</strong> ${new Date(failureData.timestamp).toLocaleDateString('en-GB')} ${new Date(failureData.timestamp).toLocaleDateString('ar-SA', { weekday: 'long' })}</li>
            <li><strong>🕐 الوقت:</strong> ${new Date(failureData.timestamp).toLocaleTimeString('en-GB', { hour12: false })}</li>
            ${failureData.ipAddress ? `<li><strong>IP:</strong> ${failureData.ipAddress}</li>` : ''}
            ${failureData.location ? `<li><strong>📍 الموقع:</strong> ${failureData.location}</li>` : ''}
            ${failureData.deviceType ? `<li><strong>📱 نوع الجهاز:</strong> ${failureData.deviceType}</li>` : ''}
            ${failureData.browser ? `<li><strong>🌐 المتصفح:</strong> ${failureData.browser}</li>` : ''}
            ${failureData.attemptsCount ? `<li><strong>🔢 عدد المحاولات:</strong> ${failureData.attemptsCount}</li>` : ''}
          </ul>
        </div>

        <div class="alert alert-danger">
          <h3>🔒 إجراءات الأمان المطلوبة</h3>
          <p>إذا لم تكن أنت من حاول الوصول للحساب:</p>
          <ul>
            <li>تغيير كلمة المرور فوراً</li>
            <li>مراجعة إعدادات المصادقة الثنائية</li>
            <li>إزالة الأجهزة غير الموثقة</li>
            <li>التواصل معنا على ${this.contactEmail}</li>
          </ul>
        </div>

        <div class="alert alert-info">
          <h3>💡 نصائح أمان</h3>
          <ul>
            <li>تأكد من صحة رمز التحقق الثنائي</li>
            <li>تحقق من توقيت الجهاز</li>
            <li>استخدم تطبيق مصادقة موثوق</li>
          </ul>
        </div>
      `, 'فشل في التحقق الثنائي');

      const textContent = `
فشل في التحقق الثنائي - رزقي

مرحباً ${userName}،

تم رصد محاولة فاشلة للتحقق الثنائي في حسابك

تفاصيل المحاولة:
- التاريخ والوقت (ميلادي): ${new Date(failureData.timestamp).toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${new Date(failureData.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
${failureData.ipAddress ? `- IP: ${failureData.ipAddress}` : ''}
${failureData.location ? `- الموقع: ${failureData.location}` : ''}
${failureData.deviceType ? `- نوع الجهاز: ${failureData.deviceType}` : ''}
${failureData.browser ? `- المتصفح: ${failureData.browser}` : ''}
${failureData.attemptsCount ? `- عدد المحاولات: ${failureData.attemptsCount}` : ''}

إجراءات الأمان المطلوبة:
إذا لم تكن أنت من حاول الوصول للحساب، يرجى تغيير كلمة المرور فوراً والتواصل معنا على ${this.contactEmail}

مع تحيات فريق رزقي
      `;

      return await this.sendEmail({
        to: userEmail,
        subject,
        html: htmlContent,
        text: textContent,
        type: '2fa_failure'
      });

    } catch (error) {
      console.error('❌ خطأ في إرسال إشعار فشل التحقق الثنائي:', error);
      return { success: false, error: 'فشل في إرسال إشعار فشل التحقق الثنائي' };
    }
  }

  // 14. إشعار تعطيل المصادقة الثنائية
  async sendTwoFactorDisabledNotification(
    userEmail: string,
    userName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const subject = 'تم تعطيل المصادقة الثنائية - رزقي';

      const htmlContent = this.createBaseTemplate(`
        <h2>🔓 تم تعطيل المصادقة الثنائية</h2>

        <p>مرحباً <strong>${userName}</strong>،</p>

        <div class="alert alert-warning">
          <strong>تم تعطيل المصادقة الثنائية لحسابك</strong>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>📋 تفاصيل التعطيل:</h3>
          <ul>
            <li><strong>📅 التاريخ والوقت (ميلادي):</strong> ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</li>
            <li><strong>📧 البريد الإلكتروني:</strong> ${userEmail}</li>
            <li><strong>🔒 مستوى الحماية:</strong> عادي (تم تقليله)</li>
          </ul>
        </div>

        <div class="alert alert-warning">
          <h3>⚠️ تحذير أمني</h3>
          <p>تعطيل المصادقة الثنائية يقلل من مستوى أمان حسابك:</p>
          <ul>
            <li>لن تحتاج لكود تحقق عند تسجيل الدخول</li>
            <li>حسابك أصبح أقل حماية من الاختراق</li>
            <li>ننصح بإعادة تفعيل المصادقة الثنائية</li>
          </ul>
        </div>

        <div class="alert alert-danger">
          <h3>🚨 إذا لم تقم بهذا الإجراء</h3>
          <p>إذا لم تقم بتعطيل المصادقة الثنائية، يرجى:</p>
          <ul>
            <li>تغيير كلمة المرور فوراً</li>
            <li>إعادة تفعيل المصادقة الثنائية</li>
            <li>التواصل معنا على ${this.contactEmail}</li>
          </ul>
        </div>
      `, 'تم تعطيل المصادقة الثنائية');

      const textContent = `
تم تعطيل المصادقة الثنائية - رزقي

مرحباً ${userName}،

تم تعطيل المصادقة الثنائية لحسابك

تفاصيل التعطيل:
- التاريخ والوقت (ميلادي): ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
- البريد الإلكتروني: ${userEmail}
- مستوى الحماية: عادي (تم تقليله)

تحذير أمني:
تعطيل المصادقة الثنائية يقلل من مستوى أمان حسابك. ننصح بإعادة تفعيلها.

إذا لم تقم بهذا الإجراء، يرجى تغيير كلمة المرور فوراً والتواصل معنا على ${this.contactEmail}

مع تحيات فريق رزقي
      `;

      return await this.sendEmail({
        to: userEmail,
        subject,
        html: htmlContent,
        text: textContent,
        type: 'two_factor_disabled'
      });

    } catch (error) {
      console.error('❌ خطأ في إرسال إشعار تعطيل المصادقة الثنائية:', error);
      return { success: false, error: 'فشل في إرسال إشعار تعطيل المصادقة الثنائية' };
    }
  }

  /**
   * إرسال إشعار بريدي لمشاهدة الملف الشخصي
   */
  async sendProfileViewNotification(userEmail: string, userName: string, viewerName: string, viewerCity?: string, viewerAge?: number): Promise<boolean> {
    try {
      const subject = `${viewerName} شاهد ملفك الشخصي - رزقي`;

      const htmlContent = this.createBaseTemplate(`
        <h2>👁️ مشاهدة جديدة لملفك الشخصي</h2>

        <p>مرحباً <strong>${userName}</strong>،</p>

        <div class="alert alert-info">
          <strong>شاهد ${viewerName} ملفك الشخصي</strong>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>👤 معلومات الزائر:</h3>
          <ul>
            <li><strong>📝 الاسم:</strong> ${viewerName}</li>
            ${viewerCity ? `<li><strong>📍 المدينة:</strong> ${viewerCity}</li>` : ''}
            ${viewerAge ? `<li><strong>🎂 العمر:</strong> ${viewerAge} سنة</li>` : ''}
            <li><strong>📅 وقت المشاهدة (ميلادي):</strong> ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${this.baseUrl}/dashboard"
             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px;
                    font-weight: bold; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
            🔍 عرض الملفات الشخصية
          </a>
        </div>

        <div style="margin-top: 30px; padding: 15px; background-color: #e3f2fd; border-radius: 6px;">
          <p><strong>💡 نصيحة:</strong> قم بزيارة لوحة التحكم للتعرف على المزيد من الملفات الشخصية وإرسال إعجاب إذا كان مناسباً لك.</p>
        </div>
      `, 'مشاهدة جديدة لملفك الشخصي');

      const textContent = `
مشاهدة جديدة لملفك الشخصي - رزقي

مرحباً ${userName}،

شاهد ${viewerName} ملفك الشخصي.

معلومات الزائر:
- الاسم: ${viewerName}
${viewerCity ? `- المدينة: ${viewerCity}` : ''}
${viewerAge ? `- العمر: ${viewerAge} سنة` : ''}
- وقت المشاهدة (ميلادي): ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}

عرض الملفات الشخصية: ${this.baseUrl}/dashboard

مع تحيات فريق رزقي
      `;

      return await this.sendEmail({
        to: userEmail,
        subject,
        html: htmlContent,
        text: textContent
      });
    } catch (error) {
      console.error('Error sending profile view notification:', error);
      return false;
    }
  }

  /**
   * إرسال إشعار بريدي للإعجاب
   */
  async sendLikeNotification(userEmail: string, userName: string, likerName: string, likerCity?: string, likerAge?: number, likeMessage?: string): Promise<boolean> {
    try {
      const subject = `${likerName} أعجب بملفك الشخصي - رزقي`;

      const htmlContent = this.createBaseTemplate(`
        <h2>❤️ إعجاب جديد بملفك الشخصي</h2>

        <p>مرحباً <strong>${userName}</strong>،</p>

        <div class="alert alert-success">
          <strong>أعجب ${likerName} بملفك الشخصي</strong>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>💝 معلومات المعجب:</h3>
          <ul>
            <li><strong>📝 الاسم:</strong> ${likerName}</li>
            ${likerCity ? `<li><strong>📍 المدينة:</strong> ${likerCity}</li>` : ''}
            ${likerAge ? `<li><strong>🎂 العمر:</strong> ${likerAge} سنة</li>` : ''}
            <li><strong>📅 وقت الإعجاب (ميلادي):</strong> ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</li>
          </ul>
          ${likeMessage ? `
          <div style="margin-top: 15px; padding: 15px; background-color: #fff3cd; border-radius: 6px; border-left: 4px solid #ffc107;">
            <h4>💌 رسالة مرفقة:</h4>
            <p style="font-style: italic; margin: 0;">"${likeMessage}"</p>
          </div>
          ` : ''}
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${this.baseUrl}/likes"
             style="display: inline-block; background: linear-gradient(135deg, #10ac84 0%, #00d2d3 100%);
                    color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px;
                    font-weight: bold; box-shadow: 0 4px 15px rgba(16, 172, 132, 0.4);">
            💖 الرد على الإعجاب
          </a>
        </div>

        <div style="margin-top: 30px; padding: 15px; background-color: #ffe6e6; border-radius: 6px;">
          <p><strong>💡 نصيحة:</strong> قم بمراجعة ملفه الشخصي وإذا كان مناسباً لك، يمكنك الرد بإعجاب متبادل لبدء محادثة.</p>
        </div>
      `, 'إعجاب جديد بملفك الشخصي');

      const textContent = `
إعجاب جديد بملفك الشخصي - رزقي

مرحباً ${userName}،

أعجب ${likerName} بملفك الشخصي.

معلومات المعجب:
- الاسم: ${likerName}
${likerCity ? `- المدينة: ${likerCity}` : ''}
${likerAge ? `- العمر: ${likerAge} سنة` : ''}
- وقت الإعجاب (ميلادي): ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}

${likeMessage ? `رسالة مرفقة: "${likeMessage}"` : ''}

الرد على الإعجاب: ${this.baseUrl}/likes

مع تحيات فريق رزقي
      `;

      return await this.sendEmail({
        to: userEmail,
        subject,
        html: htmlContent,
        text: textContent
      });
    } catch (error) {
      console.error('Error sending like notification:', error);
      return false;
    }
  }

  /**
   * إرسال إشعار بريدي للرسائل الجديدة
   */
  async sendNewMessageNotification(userEmail: string, userName: string, senderName: string, senderCity?: string, senderAge?: number, messagePreview?: string): Promise<boolean> {
    try {
      const subject = `رسالة جديدة من ${senderName} - رزقي`;

      const htmlContent = this.createBaseTemplate(`
        <h2>💬 رسالة جديدة</h2>

        <p>مرحباً <strong>${userName}</strong>،</p>

        <div class="alert alert-info">
          <strong>وصلتك رسالة جديدة من ${senderName}</strong>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>📨 معلومات المرسل:</h3>
          <ul>
            <li><strong>📝 الاسم:</strong> ${senderName}</li>
            ${senderCity ? `<li><strong>📍 المدينة:</strong> ${senderCity}</li>` : ''}
            ${senderAge ? `<li><strong>🎂 العمر:</strong> ${senderAge} سنة</li>` : ''}
            <li><strong>📅 وقت الإرسال (ميلادي):</strong> ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</li>
          </ul>
          ${messagePreview ? `
          <div style="margin-top: 15px; padding: 15px; background-color: #e3f2fd; border-radius: 6px; border-left: 4px solid #2196f3;">
            <h4>📝 معاينة الرسالة:</h4>
            <p style="font-style: italic; margin: 0;">"${messagePreview.length > 100 ? messagePreview.substring(0, 100) + '...' : messagePreview}"</p>
          </div>
          ` : ''}
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${this.baseUrl}/messages"
             style="display: inline-block; background: linear-gradient(135deg, #2196f3 0%, #21cbf3 100%);
                    color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px;
                    font-weight: bold; box-shadow: 0 4px 15px rgba(33, 150, 243, 0.4);">
            💬 قراءة الرسالة والرد
          </a>
        </div>

        <div style="margin-top: 30px; padding: 15px; background-color: #e8f5e8; border-radius: 6px;">
          <p><strong>💡 نصيحة:</strong> الرد السريع على الرسائل يزيد من فرص التواصل الناجح وبناء علاقة طيبة.</p>
        </div>
      `, 'رسالة جديدة');

      const textContent = `
رسالة جديدة - رزقي

مرحباً ${userName}،

وصلتك رسالة جديدة من ${senderName}.

معلومات المرسل:
- الاسم: ${senderName}
${senderCity ? `- المدينة: ${senderCity}` : ''}
${senderAge ? `- العمر: ${senderAge} سنة` : ''}
- وقت الإرسال (ميلادي): ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}

${messagePreview ? `معاينة الرسالة: "${messagePreview.length > 100 ? messagePreview.substring(0, 100) + '...' : messagePreview}"` : ''}

قراءة الرسالة والرد: ${this.baseUrl}/messages

مع تحيات فريق رزقي
      `;

      return await this.sendEmail({
        to: userEmail,
        subject,
        html: htmlContent,
        text: textContent
      });
    } catch (error) {
      console.error('Error sending new message notification:', error);
      return false;
    }
  }

  /**
   * إرسال إشعار بريدي للمطابقة الجديدة
   */
  async sendMatchNotification(userEmail: string, userName: string, matchName: string, matchCity?: string, matchAge?: number): Promise<boolean> {
    try {
      const subject = `🎉 مطابقة جديدة مع ${matchName} - رزقي`;

      const htmlContent = this.createBaseTemplate(`
        <h2>🎉 مبروك! مطابقة جديدة</h2>

        <p>مرحباً <strong>${userName}</strong>،</p>

        <div class="alert alert-success">
          <strong>🎊 تهانينا! لديك مطابقة جديدة مع ${matchName}</strong>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>💕 معلومات المطابقة:</h3>
          <ul>
            <li><strong>📝 الاسم:</strong> ${matchName}</li>
            ${matchCity ? `<li><strong>📍 المدينة:</strong> ${matchCity}</li>` : ''}
            ${matchAge ? `<li><strong>🎂 العمر:</strong> ${matchAge} سنة</li>` : ''}
            <li><strong>📅 وقت المطابقة (ميلادي):</strong> ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${this.baseUrl}/messages"
             style="display: inline-block; background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);
                    color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px;
                    font-weight: bold; box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4); margin-right: 10px;">
            💬 بدء المحادثة
          </a>
          <a href="${this.baseUrl}/dashboard"
             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px;
                    font-weight: bold; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
            👤 مشاهدة الملفات الشخصية
          </a>
        </div>

        <div style="margin-top: 30px; padding: 15px; background-color: #fff3cd; border-radius: 6px;">
          <p><strong>💡 نصيحة:</strong> ابدأ المحادثة بتحية لطيفة وسؤال مناسب للتعرف أكثر. تذكر أن الاحترام والأدب هما أساس التواصل الناجح.</p>
        </div>

        <div style="margin-top: 20px; padding: 15px; background-color: #e8f5e8; border-radius: 6px;">
          <p><strong>🤲 دعاء:</strong> "اللهم بارك لهما وبارك عليهما واجمع بينهما في خير"</p>
        </div>
      `, 'مطابقة جديدة');

      const textContent = `
مطابقة جديدة - رزقي

مرحباً ${userName}،

🎉 مبروك! لديك مطابقة جديدة مع ${matchName}

معلومات المطابقة:
- الاسم: ${matchName}
${matchCity ? `- المدينة: ${matchCity}` : ''}
${matchAge ? `- العمر: ${matchAge} سنة` : ''}
- وقت المطابقة (ميلادي): ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}

بدء المحادثة: ${this.baseUrl}/messages
مشاهدة الملفات الشخصية: ${this.baseUrl}/dashboard

نصيحة: ابدأ المحادثة بتحية لطيفة وسؤال مناسب للتعرف أكثر.

دعاء: "اللهم بارك لهما وبارك عليهما واجمع بينهما في خير"

مع تحيات فريق رزقي
      `;

      return await this.sendEmail({
        to: userEmail,
        subject,
        html: htmlContent,
        text: textContent
      });
    } catch (error) {
      console.error('Error sending match notification:', error);
      return false;
    }
  }

  /**
   * إرسال إشعار بريدي للإشعارات النظامية
   */
  async sendSystemNotification(userEmail: string, userName: string, notificationTitle: string, notificationMessage: string, actionUrl?: string): Promise<boolean> {
    try {
      const subject = `${notificationTitle} - رزقي`;

      const htmlContent = this.createBaseTemplate(`
        <h2>🔔 إشعار من النظام</h2>

        <p>مرحباً <strong>${userName}</strong>،</p>

        <div class="alert alert-info">
          <strong>${notificationTitle}</strong>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>📋 تفاصيل الإشعار:</h3>
          <p>${notificationMessage}</p>
          <ul>
            <li><strong>📅 التاريخ والوقت (ميلادي):</strong> ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</li>
          </ul>
        </div>

        ${actionUrl ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${actionUrl}"
             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px;
                    font-weight: bold; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
            🔗 عرض التفاصيل
          </a>
        </div>
        ` : ''}

        <div style="margin-top: 30px; padding: 15px; background-color: #e3f2fd; border-radius: 6px;">
          <p><strong>💡 ملاحظة:</strong> هذا إشعار تلقائي من نظام رزقي لإبقائك على اطلاع بآخر التحديثات.</p>
        </div>
      `, notificationTitle);

      const textContent = `
إشعار من النظام - رزقي

مرحباً ${userName}،

${notificationTitle}

تفاصيل الإشعار:
${notificationMessage}

التاريخ والوقت (ميلادي): ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}

${actionUrl ? `عرض التفاصيل: ${actionUrl}` : ''}

مع تحيات فريق رزقي
      `;

      return await this.sendEmail({
        to: userEmail,
        subject,
        html: htmlContent,
        text: textContent
      });
    } catch (error) {
      console.error('Error sending system notification:', error);
      return false;
    }
  }

  /**
   * إرسال إشعار بريدي للتنبيهات العامة
   */
  async sendAlertNotification(userEmail: string, userName: string, alertTitle: string, alertContent: string, alertType: 'info' | 'warning' | 'error' | 'success' | 'announcement' = 'info', actionUrl?: string): Promise<boolean> {
    try {
      const typeEmojis = {
        info: '💡',
        warning: '⚠️',
        error: '❌',
        success: '✅',
        announcement: '📢'
      };

      const typeColors = {
        info: '#2196f3',
        warning: '#ff9800',
        error: '#f44336',
        success: '#4caf50',
        announcement: '#9c27b0'
      };

      const subject = `${typeEmojis[alertType]} ${alertTitle} - رزقي`;

      const htmlContent = this.createBaseTemplate(`
        <h2>${typeEmojis[alertType]} تنبيه من النظام</h2>

        <p>مرحباً <strong>${userName}</strong>،</p>

        <div class="alert alert-${alertType}" style="border-left: 4px solid ${typeColors[alertType]};">
          <strong>${alertTitle}</strong>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3>📋 محتوى التنبيه:</h3>
          <p>${alertContent}</p>
          <ul>
            <li><strong>📅 التاريخ والوقت (ميلادي):</strong> ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</li>
            <li><strong>🏷️ نوع التنبيه:</strong> ${alertType}</li>
          </ul>
        </div>

        ${actionUrl ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${actionUrl}"
             style="display: inline-block; background: linear-gradient(135deg, ${typeColors[alertType]} 0%, ${typeColors[alertType]}cc 100%);
                    color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px;
                    font-weight: bold; box-shadow: 0 4px 15px ${typeColors[alertType]}40;">
            🔗 اتخاذ الإجراء المطلوب
          </a>
        </div>
        ` : ''}

        <div style="margin-top: 30px; padding: 15px; background-color: #fff3cd; border-radius: 6px;">
          <p><strong>💡 ملاحظة:</strong> هذا تنبيه مهم من نظام رزقي. يرجى قراءته بعناية واتخاذ الإجراء المناسب إذا لزم الأمر.</p>
        </div>
      `, alertTitle);

      const textContent = `
تنبيه من النظام - رزقي

مرحباً ${userName}،

${typeEmojis[alertType]} ${alertTitle}

محتوى التنبيه:
${alertContent}

التاريخ والوقت (ميلادي): ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
نوع التنبيه: ${alertType}

${actionUrl ? `اتخاذ الإجراء المطلوب: ${actionUrl}` : ''}

مع تحيات فريق رزقي
      `;

      return await this.sendEmail({
        to: userEmail,
        subject,
        html: htmlContent,
        text: textContent
      });
    } catch (error) {
      console.error('Error sending alert notification:', error);
      return false;
    }
  }
}

export const notificationEmailService = new NotificationEmailService();
export type { ContactFormData, AdminLoginData };
