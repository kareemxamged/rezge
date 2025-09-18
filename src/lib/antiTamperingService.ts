/**
 * خدمة مكافحة التلاعب والكشف عن VPN/Proxy
 * نظام متقدم للكشف عن محاولات تجاوز الأمان
 */

export interface TamperingDetectionResult {
  isTampering: boolean;
  detectedMethods: string[];
  riskScore: number;
  recommendations: string[];
}

export interface VPNDetectionResult {
  isVPN: boolean;
  isProxy: boolean;
  confidence: number;
  provider?: string;
  country?: string;
  detectionMethods: string[];
}

class AntiTamperingService {
  private static instance: AntiTamperingService;
  
  public static getInstance(): AntiTamperingService {
    if (!AntiTamperingService.instance) {
      AntiTamperingService.instance = new AntiTamperingService();
    }
    return AntiTamperingService.instance;
  }

  /**
   * فحص شامل للتلاعب
   */
  async detectTampering(): Promise<TamperingDetectionResult> {
    const detectedMethods: string[] = [];
    let riskScore = 0;

    // فحص أدوات التطوير
    if (this.isDevToolsOpen()) {
      detectedMethods.push('dev_tools_open');
      riskScore += 3;
    }

    // فحص التلاعب بـ JavaScript
    if (this.isJavaScriptTampered()) {
      detectedMethods.push('javascript_tampered');
      riskScore += 4;
    }

    // فحص المتصفحات الآلية
    if (this.isAutomatedBrowser()) {
      detectedMethods.push('automated_browser');
      riskScore += 5;
    }

    // فحص التلاعب بـ DOM
    if (this.isDOMTampered()) {
      detectedMethods.push('dom_tampered');
      riskScore += 3;
    }

    // فحص الإضافات المشبوهة
    if (await this.hasSuspiciousExtensions()) {
      detectedMethods.push('suspicious_extensions');
      riskScore += 2;
    }

    // فحص التلاعب بالوقت
    if (this.isTimeTampered()) {
      detectedMethods.push('time_tampered');
      riskScore += 2;
    }

    // فحص Virtual Machine
    if (this.isVirtualMachine()) {
      detectedMethods.push('virtual_machine');
      riskScore += 3;
    }

    // فحص Emulation
    if (this.isEmulated()) {
      detectedMethods.push('emulated_environment');
      riskScore += 4;
    }

    const recommendations = this.generateRecommendations(detectedMethods);

    return {
      isTampering: riskScore >= 5,
      detectedMethods,
      riskScore,
      recommendations
    };
  }

  /**
   * كشف VPN/Proxy متقدم
   */
  async detectVPN(ipAddress: string): Promise<VPNDetectionResult> {
    const detectionMethods: string[] = [];
    let confidence = 0;
    let isVPN = false;
    let isProxy = false;

    // فحص DNS Leak
    const dnsLeak = await this.checkDNSLeak();
    if (dnsLeak.detected) {
      detectionMethods.push('dns_leak');
      confidence += 30;
      isVPN = true;
    }

    // فحص WebRTC Leak
    const webrtcLeak = await this.checkWebRTCLeak();
    if (webrtcLeak.detected) {
      detectionMethods.push('webrtc_leak');
      confidence += 25;
      isVPN = true;
    }

    // فحص Timezone Mismatch
    const timezoneMismatch = this.checkTimezoneMismatch(ipAddress);
    if (timezoneMismatch) {
      detectionMethods.push('timezone_mismatch');
      confidence += 20;
      isVPN = true;
    }

    // فحص HTTP Headers
    const suspiciousHeaders = this.checkSuspiciousHeaders();
    if (suspiciousHeaders.length > 0) {
      detectionMethods.push('suspicious_headers');
      confidence += 15;
      isProxy = true;
    }

    // فحص Network Latency
    const latencyCheck = await this.checkNetworkLatency();
    if (latencyCheck.suspicious) {
      detectionMethods.push('suspicious_latency');
      confidence += 10;
      isVPN = true;
    }

    // فحص IP Reputation
    const ipReputation = await this.checkIPReputation(ipAddress);
    if (ipReputation.suspicious) {
      detectionMethods.push('ip_reputation');
      confidence += ipReputation.score;
      isVPN = ipReputation.isVPN;
      isProxy = ipReputation.isProxy;
    }

    return {
      isVPN: isVPN || confidence >= 50,
      isProxy: isProxy || confidence >= 40,
      confidence: Math.min(confidence, 100),
      detectionMethods
    };
  }

  /**
   * فحص فتح أدوات التطوير
   */
  private isDevToolsOpen(): boolean {
    const threshold = 160;
    
    // فحص الفرق بين الحجم الخارجي والداخلي
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    
    // فحص console.log timing
    let devtools = false;
    const before = performance.now();
    console.log('%c', 'color: transparent');
    const after = performance.now();
    
    if (after - before > 100) {
      devtools = true;
    }

    return widthThreshold || heightThreshold || devtools;
  }

  /**
   * فحص التلاعب بـ JavaScript
   */
  private isJavaScriptTampered(): boolean {
    try {
      // فحص تعديل الدوال الأساسية
      const originalStringify = JSON.stringify.toString();
      const originalParse = JSON.parse.toString();
      const originalFetch = fetch.toString();
      
      // فحص إذا تم تعديل الدوال
      if (originalStringify.includes('native code') === false ||
          originalParse.includes('native code') === false ||
          originalFetch.includes('native code') === false) {
        return true;
      }

      // فحص prototype pollution
      if (Object.prototype.hasOwnProperty('__proto__')) {
        return true;
      }

      // فحص تعديل console
      if (typeof console.log !== 'function' || 
          console.log.toString().includes('native code') === false) {
        return true;
      }

      return false;
    } catch (error) {
      return true; // إذا فشل الفحص، نعتبره تلاعب
    }
  }

  /**
   * فحص المتصفحات الآلية
   */
  private isAutomatedBrowser(): boolean {
    // فحص خصائص webdriver
    if ((navigator as any).webdriver) return true;
    
    // فحص خصائص phantom
    if ((window as any).phantom || (window as any)._phantom) return true;
    
    // فحص selenium
    if ((window as any).selenium || (document as any).selenium) return true;
    
    // فحص puppeteer
    if ((navigator as any).permissions?.query?.toString().includes('notifications')) {
      return false; // متصفح عادي
    }
    
    // فحص headless chrome
    if (navigator.userAgent.includes('HeadlessChrome')) return true;
    
    // فحص خصائص غير طبيعية
    if (navigator.languages.length === 0) return true;
    if (navigator.plugins.length === 0) return true;
    
    return false;
  }

  /**
   * فحص التلاعب بـ DOM
   */
  private isDOMTampered(): boolean {
    try {
      // فحص تعديل الدوال الأساسية للـ DOM
      const originalQuerySelector = document.querySelector.toString();
      const originalGetElementById = document.getElementById.toString();
      
      if (!originalQuerySelector.includes('native code') ||
          !originalGetElementById.includes('native code')) {
        return true;
      }

      // فحص إضافة عناصر مشبوهة
      const suspiciousElements = document.querySelectorAll('[data-automation], [data-testid], [data-selenium]');
      if (suspiciousElements.length > 0) {
        return true;
      }

      return false;
    } catch (error) {
      return true;
    }
  }

  /**
   * فحص الإضافات المشبوهة
   */
  private async hasSuspiciousExtensions(): Promise<boolean> {
    try {
      // قائمة بأسماء الإضافات المشبوهة
      const suspiciousExtensions = [
        'tampermonkey', 'greasemonkey', 'violentmonkey',
        'selenium', 'webdriver', 'automation',
        'proxy', 'vpn', 'anonymizer'
      ];

      // فحص chrome extensions (إذا كان متاحاً)
      if ((window as any).chrome?.runtime) {
        return true; // وجود chrome runtime قد يشير لإضافة
      }

      // فحص تعديلات في window object
      const windowKeys = Object.keys(window);
      for (const key of windowKeys) {
        const lowerKey = key.toLowerCase();
        if (suspiciousExtensions.some(ext => lowerKey.includes(ext))) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * فحص التلاعب بالوقت
   */
  private isTimeTampered(): boolean {
    try {
      const now = Date.now();
      const performanceNow = performance.now();
      
      // فحص إذا كان الوقت غير منطقي
      if (now < 1000000000000) return true; // قبل عام 2001
      if (now > 4000000000000) return true; // بعد عام 2096
      
      // فحص تطابق الأوقات
      const timeDiff = Math.abs(now - (performance.timeOrigin + performanceNow));
      if (timeDiff > 10000) return true; // فرق أكثر من 10 ثوان
      
      return false;
    } catch (error) {
      return true;
    }
  }

  /**
   * فحص Virtual Machine
   */
  private isVirtualMachine(): boolean {
    try {
      // فحص خصائص الأجهزة المشبوهة
      const suspiciousVendors = ['vmware', 'virtualbox', 'parallels', 'qemu', 'xen'];
      const userAgent = navigator.userAgent.toLowerCase();
      
      if (suspiciousVendors.some(vendor => userAgent.includes(vendor))) {
        return true;
      }

      // فحص خصائص الشاشة المشبوهة
      if (screen.width === 1024 && screen.height === 768) return true;
      if (screen.colorDepth < 24) return true;
      
      // فحص عدد المعالجات
      if (navigator.hardwareConcurrency === 1) return true;
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * فحص البيئة المحاكاة
   */
  private isEmulated(): boolean {
    try {
      // فحص خصائص المحاكاة
      if ((window as any).chrome && !(window as any).chrome.runtime) {
        return true; // chrome object موجود لكن runtime غير موجود
      }

      // فحص touch events في بيئة desktop
      if ('ontouchstart' in window && navigator.maxTouchPoints === 0) {
        return true;
      }

      // فحص battery API
      if ('getBattery' in navigator) {
        return false; // جهاز حقيقي
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * فحص DNS Leak
   */
  private async checkDNSLeak(): Promise<{ detected: boolean; servers: string[] }> {
    try {
      // محاولة الحصول على DNS servers (محدود في المتصفحات)
      // هذا فحص بسيط، يمكن تحسينه بخدمات خارجية
      
      const testDomains = ['google.com', 'cloudflare.com', 'quad9.net'];
      const results: string[] = [];
      
      for (const domain of testDomains) {
        try {
          const start = performance.now();
          await fetch(`https://${domain}`, { mode: 'no-cors' });
          const end = performance.now();
          
          if (end - start > 1000) { // استجابة بطيئة قد تشير لـ VPN
            results.push(domain);
          }
        } catch (error) {
          // تجاهل الأخطاء
        }
      }
      
      return {
        detected: results.length >= 2,
        servers: results
      };
    } catch (error) {
      return { detected: false, servers: [] };
    }
  }

  /**
   * فحص WebRTC Leak
   */
  private async checkWebRTCLeak(): Promise<{ detected: boolean; ips: string[] }> {
    return new Promise((resolve) => {
      const ips: string[] = [];
      
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        pc.createDataChannel('');
        
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const candidate = event.candidate.candidate;
            const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
            if (ipMatch && !ips.includes(ipMatch[1])) {
              ips.push(ipMatch[1]);
            }
          }
        };

        pc.createOffer().then(offer => pc.setLocalDescription(offer));
        
        setTimeout(() => {
          pc.close();
          resolve({
            detected: ips.length > 1, // أكثر من IP قد يشير لـ VPN
            ips
          });
        }, 3000);
        
      } catch (error) {
        resolve({ detected: false, ips: [] });
      }
    });
  }

  /**
   * فحص Timezone Mismatch
   */
  private checkTimezoneMismatch(ipAddress: string): boolean {
    try {
      // const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // قائمة بسيطة لربط IP ranges بالمناطق الزمنية
      // في التطبيق الحقيقي، يجب استخدام خدمة GeoIP
      // const commonMismatches = [
      //   'America/New_York', 'Europe/London', 'Asia/Tokyo'
      // ];
      
      // فحص بسيط - يمكن تحسينه
      if (ipAddress.startsWith('10.') || ipAddress.startsWith('192.168.')) {
        return false; // شبكة محلية
      }
      
      return false; // يحتاج خدمة GeoIP حقيقية
    } catch (error) {
      return false;
    }
  }

  /**
   * فحص HTTP Headers المشبوهة
   */
  private checkSuspiciousHeaders(): string[] {
    const suspicious: string[] = [];
    
    // هذا الفحص محدود في المتصفحات
    // يمكن تحسينه في الخادم
    
    try {
      // فحص User-Agent
      const userAgent = navigator.userAgent;
      if (userAgent.includes('proxy') || userAgent.includes('vpn')) {
        suspicious.push('user_agent');
      }
      
      return suspicious;
    } catch (error) {
      return [];
    }
  }

  /**
   * فحص Network Latency
   */
  private async checkNetworkLatency(): Promise<{ suspicious: boolean; latency: number }> {
    try {
      const start = performance.now();
      await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors' });
      const end = performance.now();
      
      const latency = end - start;
      
      return {
        suspicious: latency > 2000, // أكثر من ثانيتين مشبوه
        latency
      };
    } catch (error) {
      return { suspicious: true, latency: -1 };
    }
  }

  /**
   * فحص IP Reputation (بسيط)
   */
  private async checkIPReputation(ipAddress: string): Promise<{
    suspicious: boolean;
    score: number;
    isVPN: boolean;
    isProxy: boolean;
  }> {
    try {
      // فحص بسيط للـ IP ranges المشبوهة
      const suspiciousRanges = [
        '10.', '172.16.', '172.17.', '172.18.', '172.19.',
        '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
        '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
        '172.30.', '172.31.', '192.168.'
      ];

      const isPrivate = suspiciousRanges.some(range => ipAddress.startsWith(range));
      
      // في التطبيق الحقيقي، يجب استخدام خدمات مثل:
      // - AbuseIPDB
      // - VirusTotal
      // - IPQualityScore
      
      return {
        suspicious: isPrivate,
        score: isPrivate ? 30 : 0,
        isVPN: isPrivate,
        isProxy: false
      };
    } catch (error) {
      return {
        suspicious: false,
        score: 0,
        isVPN: false,
        isProxy: false
      };
    }
  }

  /**
   * إنشاء توصيات بناءً على التهديدات المكتشفة
   */
  private generateRecommendations(detectedMethods: string[]): string[] {
    const recommendations: string[] = [];
    
    if (detectedMethods.includes('dev_tools_open')) {
      recommendations.push('إغلاق أدوات التطوير');
    }
    
    if (detectedMethods.includes('automated_browser')) {
      recommendations.push('استخدام متصفح عادي بدلاً من الأدوات الآلية');
    }
    
    if (detectedMethods.includes('vpn_detected')) {
      recommendations.push('إيقاف VPN أو Proxy');
    }
    
    if (detectedMethods.includes('javascript_tampered')) {
      recommendations.push('تحديث المتصفح وإزالة الإضافات المشبوهة');
    }
    
    return recommendations;
  }
}

export const antiTamperingService = AntiTamperingService.getInstance();
