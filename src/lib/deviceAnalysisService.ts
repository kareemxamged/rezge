/**
 * خدمة تحليل معلومات الجهاز والمتصفح المحسنة
 * تحليل دقيق لـ User Agent لاستخراج معلومات مفصلة
 */

export interface DeviceInfo {
  // معلومات المتصفح
  browser: string;
  browserVersion: string;
  browserEngine: string;
  
  // معلومات نظام التشغيل
  os: string;
  osVersion: string;
  architecture: string;
  
  // معلومات الجهاز
  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  
  // معلومات إضافية
  platform: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isBot: boolean;
  
  // معلومات تقنية
  screenResolution?: string;
  colorDepth?: number;
  timezone: string;
  language: string;
  
  // بصمة الجهاز
  fingerprint: string;
}

export class DeviceAnalysisService {
  
  /**
   * تحليل شامل لمعلومات الجهاز
   */
  static analyzeDevice(userAgent?: string): DeviceInfo {
    const ua = userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : '');
    
    console.log('🔍 بدء تحليل معلومات الجهاز...');
    console.log('📱 User Agent:', ua);
    
    const browserInfo = this.analyzeBrowser(ua);
    const osInfo = this.analyzeOS(ua);
    const deviceInfo = this.analyzeDeviceType(ua);
    const additionalInfo = this.getAdditionalInfo();
    
    const result: DeviceInfo = {
      ...browserInfo,
      ...osInfo,
      ...deviceInfo,
      ...additionalInfo,
      fingerprint: this.generateFingerprint(ua)
    };
    
    console.log('✅ تم تحليل معلومات الجهاز:', result);
    return result;
  }
  
  /**
   * تحليل معلومات المتصفح
   */
  private static analyzeBrowser(ua: string) {
    let browser = 'Unknown';
    let browserVersion = '';
    let browserEngine = '';
    
    // Chrome
    if (ua.includes('Chrome') && !ua.includes('Edg')) {
      browser = 'Chrome';
      const match = ua.match(/Chrome\/([0-9.]+)/);
      browserVersion = match ? match[1] : '';
      browserEngine = 'Blink';
    }
    // Edge
    else if (ua.includes('Edg')) {
      browser = 'Microsoft Edge';
      const match = ua.match(/Edg\/([0-9.]+)/);
      browserVersion = match ? match[1] : '';
      browserEngine = 'Blink';
    }
    // Firefox
    else if (ua.includes('Firefox')) {
      browser = 'Firefox';
      const match = ua.match(/Firefox\/([0-9.]+)/);
      browserVersion = match ? match[1] : '';
      browserEngine = 'Gecko';
    }
    // Safari
    else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      browser = 'Safari';
      const match = ua.match(/Version\/([0-9.]+)/);
      browserVersion = match ? match[1] : '';
      browserEngine = 'WebKit';
    }
    // Opera
    else if (ua.includes('Opera') || ua.includes('OPR')) {
      browser = 'Opera';
      const match = ua.match(/(?:Opera|OPR)\/([0-9.]+)/);
      browserVersion = match ? match[1] : '';
      browserEngine = 'Blink';
    }
    // Internet Explorer
    else if (ua.includes('Trident') || ua.includes('MSIE')) {
      browser = 'Internet Explorer';
      const match = ua.match(/(?:MSIE |rv:)([0-9.]+)/);
      browserVersion = match ? match[1] : '';
      browserEngine = 'Trident';
    }
    
    return { browser, browserVersion, browserEngine };
  }
  
  /**
   * تحليل معلومات نظام التشغيل
   */
  private static analyzeOS(ua: string) {
    let os = 'Unknown';
    let osVersion = '';
    let architecture = '';
    
    // Windows
    if (ua.includes('Windows')) {
      os = 'Windows';
      if (ua.includes('Windows NT 10.0')) {
        osVersion = '10/11';
      } else if (ua.includes('Windows NT 6.3')) {
        osVersion = '8.1';
      } else if (ua.includes('Windows NT 6.2')) {
        osVersion = '8';
      } else if (ua.includes('Windows NT 6.1')) {
        osVersion = '7';
      }
      
      if (ua.includes('WOW64') || ua.includes('Win64')) {
        architecture = '64-bit';
      } else {
        architecture = '32-bit';
      }
    }
    // macOS
    else if (ua.includes('Mac OS X')) {
      os = 'macOS';
      const match = ua.match(/Mac OS X ([0-9_]+)/);
      if (match) {
        osVersion = match[1].replace(/_/g, '.');
      }
      architecture = ua.includes('Intel') ? 'Intel' : 'Apple Silicon';
    }
    // iOS
    else if (ua.includes('iPhone') || ua.includes('iPad')) {
      os = ua.includes('iPhone') ? 'iOS' : 'iPadOS';
      const match = ua.match(/OS ([0-9_]+)/);
      if (match) {
        osVersion = match[1].replace(/_/g, '.');
      }
    }
    // Android
    else if (ua.includes('Android')) {
      os = 'Android';
      const match = ua.match(/Android ([0-9.]+)/);
      osVersion = match ? match[1] : '';
    }
    // Linux
    else if (ua.includes('Linux')) {
      os = 'Linux';
      if (ua.includes('Ubuntu')) {
        osVersion = 'Ubuntu';
      } else if (ua.includes('CentOS')) {
        osVersion = 'CentOS';
      }
      architecture = ua.includes('x86_64') ? '64-bit' : '32-bit';
    }
    
    return { os, osVersion, architecture };
  }
  
  /**
   * تحليل نوع الجهاز
   */
  private static analyzeDeviceType(ua: string) {
    let deviceType = 'Desktop';
    let deviceBrand = '';
    let deviceModel = '';
    let platform = '';
    
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua);
    const isDesktop = !isMobile && !isTablet;
    const isBot = /bot|crawler|spider|crawling/i.test(ua);
    
    if (isBot) {
      deviceType = 'Bot/Crawler';
    } else if (isTablet) {
      deviceType = 'Tablet';
    } else if (isMobile) {
      deviceType = 'Mobile';
    } else {
      deviceType = 'Desktop';
    }
    
    // تحديد العلامة التجارية والموديل
    if (ua.includes('iPhone')) {
      deviceBrand = 'Apple';
      const match = ua.match(/iPhone OS ([0-9_]+)/);
      deviceModel = match ? `iPhone (iOS ${match[1].replace(/_/g, '.')})` : 'iPhone';
      platform = 'iOS';
    } else if (ua.includes('iPad')) {
      deviceBrand = 'Apple';
      deviceModel = 'iPad';
      platform = 'iPadOS';
    } else if (ua.includes('Samsung')) {
      deviceBrand = 'Samsung';
      const match = ua.match(/SM-([A-Z0-9]+)/);
      deviceModel = match ? match[1] : 'Samsung Device';
      platform = 'Android';
    } else if (ua.includes('Huawei')) {
      deviceBrand = 'Huawei';
      platform = 'Android';
    } else if (ua.includes('Xiaomi')) {
      deviceBrand = 'Xiaomi';
      platform = 'Android';
    } else if (ua.includes('OnePlus')) {
      deviceBrand = 'OnePlus';
      platform = 'Android';
    } else if (ua.includes('Windows')) {
      platform = 'Windows';
    } else if (ua.includes('Mac')) {
      deviceBrand = 'Apple';
      platform = 'macOS';
    } else if (ua.includes('Linux')) {
      platform = 'Linux';
    }
    
    return {
      deviceType,
      deviceBrand,
      deviceModel,
      platform,
      isMobile,
      isTablet,
      isDesktop,
      isBot
    };
  }
  
  /**
   * الحصول على معلومات إضافية من المتصفح
   */
  private static getAdditionalInfo() {
    let screenResolution = '';
    let colorDepth = 0;
    let timezone = '';
    let language = '';
    
    if (typeof window !== 'undefined') {
      // دقة الشاشة
      if (window.screen) {
        screenResolution = `${window.screen.width}x${window.screen.height}`;
        colorDepth = window.screen.colorDepth || 0;
      }
      
      // المنطقة الزمنية
      try {
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      } catch (e) {
        timezone = 'غير معروف';
      }
      
      // اللغة
      language = navigator.language || navigator.languages?.[0] || 'غير معروف';
    }
    
    return {
      screenResolution,
      colorDepth,
      timezone,
      language
    };
  }
  
  /**
   * إنشاء بصمة فريدة للجهاز
   */
  private static generateFingerprint(ua: string): string {
    const components = [
      ua,
      typeof window !== 'undefined' ? window.screen?.width : '',
      typeof window !== 'undefined' ? window.screen?.height : '',
      typeof window !== 'undefined' ? window.screen?.colorDepth : '',
      typeof window !== 'undefined' ? navigator.language : '',
      typeof window !== 'undefined' ? navigator.platform : '',
      typeof window !== 'undefined' ? navigator.cookieEnabled : '',
      typeof window !== 'undefined' ? navigator.doNotTrack : ''
    ].join('|');
    
    // إنشاء hash بسيط
    let hash = 0;
    for (let i = 0; i < components.length; i++) {
      const char = components.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // تحويل إلى 32bit integer
    }
    
    return Math.abs(hash).toString(16);
  }
  
  /**
   * تنسيق معلومات الجهاز للعرض
   */
  static formatDeviceInfo(deviceInfo: DeviceInfo): string {
    const parts = [];
    
    if (deviceInfo.deviceBrand) {
      parts.push(deviceInfo.deviceBrand);
    }
    
    if (deviceInfo.deviceModel && deviceInfo.deviceModel !== deviceInfo.deviceBrand) {
      parts.push(deviceInfo.deviceModel);
    }
    
    if (deviceInfo.os) {
      let osInfo = deviceInfo.os;
      if (deviceInfo.osVersion) {
        osInfo += ` ${deviceInfo.osVersion}`;
      }
      parts.push(osInfo);
    }
    
    if (deviceInfo.browser) {
      let browserInfo = deviceInfo.browser;
      if (deviceInfo.browserVersion) {
        browserInfo += ` ${deviceInfo.browserVersion}`;
      }
      parts.push(browserInfo);
    }
    
    return parts.length > 0 ? parts.join(' - ') : 'غير معروف';
  }
  
  /**
   * الحصول على وصف مبسط للجهاز
   */
  static getSimpleDeviceDescription(deviceInfo: DeviceInfo): string {
    if (deviceInfo.isBot) {
      return 'بوت/زاحف';
    }
    
    if (deviceInfo.isMobile) {
      return `هاتف ${deviceInfo.deviceBrand || 'ذكي'}`;
    }
    
    if (deviceInfo.isTablet) {
      return `تابلت ${deviceInfo.deviceBrand || ''}`.trim();
    }
    
    return `كمبيوتر ${deviceInfo.os || 'مكتبي'}`;
  }
}

export default DeviceAnalysisService;
export { DeviceInfo };
