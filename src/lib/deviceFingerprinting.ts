/**
 * نظام Device Fingerprinting المتقدم
 * يقوم بإنشاء بصمة فريدة للجهاز لا يمكن تجاوزها بسهولة
 * حتى مع استخدام VPN أو تغيير المتصفح أو وضع التصفح الخفي
 */

export interface DeviceFingerprint {
  // البصمة الأساسية
  fingerprint: string;
  
  // معلومات الجهاز
  screen: {
    width: number;
    height: number;
    colorDepth: number;
    pixelRatio: number;
    availWidth: number;
    availHeight: number;
  };
  
  // معلومات المتصفح
  browser: {
    userAgent: string;
    language: string;
    languages: string[];
    platform: string;
    vendor: string;
    cookieEnabled: boolean;
    doNotTrack: string | null;
    hardwareConcurrency: number;
    maxTouchPoints: number;
  };
  
  // معلومات النظام
  system: {
    timezone: string;
    timezoneOffset: number;
    webgl: string;
    canvas: string;
    audio: string;
    fonts: string[];
  };
  
  // معلومات الشبكة والاتصال
  network: {
    connection?: string;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
  
  // معلومات إضافية للكشف عن التلاعب
  security: {
    webdriver: boolean;
    phantom: boolean;
    selenium: boolean;
    headless: boolean;
    automation: boolean;
  };
  
  // الوقت والتاريخ
  timestamp: number;
}

class DeviceFingerprintingService {
  private static instance: DeviceFingerprintingService;
  
  public static getInstance(): DeviceFingerprintingService {
    if (!DeviceFingerprintingService.instance) {
      DeviceFingerprintingService.instance = new DeviceFingerprintingService();
    }
    return DeviceFingerprintingService.instance;
  }

  /**
   * إنشاء بصمة شاملة للجهاز
   */
  async generateFingerprint(): Promise<DeviceFingerprint> {
    const fingerprint: DeviceFingerprint = {
      fingerprint: '',
      screen: this.getScreenInfo(),
      browser: this.getBrowserInfo(),
      system: await this.getSystemInfo(),
      network: this.getNetworkInfo(),
      security: this.getSecurityInfo(),
      timestamp: Date.now()
    };

    // إنشاء البصمة النهائية
    fingerprint.fingerprint = await this.calculateFingerprint(fingerprint);
    
    return fingerprint;
  }

  /**
   * معلومات الشاشة
   */
  private getScreenInfo() {
    return {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight
    };
  }

  /**
   * معلومات المتصفح
   */
  private getBrowserInfo() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: Array.from(navigator.languages),
      platform: navigator.platform,
      vendor: navigator.vendor,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      maxTouchPoints: navigator.maxTouchPoints || 0
    };
  }

  /**
   * معلومات النظام المتقدمة
   */
  private async getSystemInfo() {
    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      webgl: this.getWebGLInfo(),
      canvas: this.getCanvasFingerprint(),
      audio: await this.getAudioFingerprint(),
      fonts: await this.getAvailableFonts()
    };
  }

  /**
   * معلومات الشبكة
   */
  private getNetworkInfo() {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      return {
        connection: connection.type,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      };
    }
    
    return {};
  }

  /**
   * فحص الأمان والكشف عن التلاعب
   */
  private getSecurityInfo() {
    return {
      webdriver: !!(navigator as any).webdriver,
      phantom: !!(window as any).phantom || !!(window as any)._phantom || !!(window as any).callPhantom,
      selenium: !!(window as any).selenium || !!(document as any).selenium || !!(window as any)._selenium,
      headless: this.isHeadless(),
      automation: this.isAutomation()
    };
  }

  /**
   * الكشف عن المتصفحات بدون واجهة (Headless)
   */
  private isHeadless(): boolean {
    // فحص عدة مؤشرات للمتصفحات بدون واجهة
    return (
      !window.outerHeight ||
      !window.outerWidth ||
      navigator.webdriver ||
      /HeadlessChrome/.test(navigator.userAgent) ||
      /PhantomJS/.test(navigator.userAgent)
    );
  }

  /**
   * الكشف عن الأتمتة
   */
  private isAutomation(): boolean {
    return !!(
      (window as any).chrome?.runtime?.onConnect ||
      (window as any).chrome?.runtime?.onMessage ||
      (navigator as any).webdriver ||
      (window as any).domAutomation ||
      (window as any).domAutomationController
    );
  }

  /**
   * بصمة WebGL
   */
  private getWebGLInfo(): string {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;

      if (!gl) return 'no-webgl';

      const renderer = gl.getParameter(gl.RENDERER);
      const vendor = gl.getParameter(gl.VENDOR);

      return `${vendor}~${renderer}`;
    } catch (e) {
      return 'webgl-error';
    }
  }

  /**
   * بصمة Canvas
   */
  private getCanvasFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return 'no-canvas';
      
      // رسم نص وأشكال معقدة
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('رزقي للزواج الإسلامي 🕌', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Device Security Test', 4, 45);
      
      // إضافة أشكال هندسية
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgb(255,0,255)';
      ctx.beginPath();
      ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();
      
      return canvas.toDataURL();
    } catch (e) {
      return 'canvas-error';
    }
  }

  /**
   * بصمة الصوت
   */
  private async getAudioFingerprint(): Promise<string> {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
      
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      
      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start(0);
      
      return new Promise((resolve) => {
        scriptProcessor.onaudioprocess = function() {
          const array = new Float32Array(analyser.frequencyBinCount);
          analyser.getFloatFrequencyData(array);
          
          let fingerprint = '';
          for (let i = 0; i < array.length; i++) {
            fingerprint += array[i].toString();
          }
          
          oscillator.stop();
          audioContext.close();
          
          resolve(fingerprint.slice(0, 50)); // أول 50 حرف
        };
      });
    } catch (e) {
      return 'audio-error';
    }
  }

  /**
   * الحصول على قائمة الخطوط المتاحة
   */
  private async getAvailableFonts(): Promise<string[]> {
    const testFonts = [
      'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana',
      'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
      'Trebuchet MS', 'Arial Black', 'Impact', 'Tahoma', 'Geneva',
      'Lucida Console', 'Monaco', 'Consolas', 'Courier', 'monospace',
      'serif', 'sans-serif', 'cursive', 'fantasy', 'system-ui',
      // خطوط عربية
      'Amiri', 'Cairo', 'Noto Sans Arabic', 'Droid Arabic Naskh',
      'Traditional Arabic', 'Simplified Arabic', 'Arabic Typesetting'
    ];
    
    const availableFonts: string[] = [];
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) return [];
    
    // قياس النص بخط افتراضي
    context.font = `${testSize} monospace`;
    const baselineWidth = context.measureText(testString).width;
    
    for (const font of testFonts) {
      context.font = `${testSize} ${font}, monospace`;
      const width = context.measureText(testString).width;
      
      if (width !== baselineWidth) {
        availableFonts.push(font);
      }
    }
    
    return availableFonts;
  }

  /**
   * حساب البصمة النهائية
   */
  private async calculateFingerprint(data: DeviceFingerprint): Promise<string> {
    // تجميع جميع البيانات في نص واحد
    const components = [
      // معلومات الشاشة
      `${data.screen.width}x${data.screen.height}`,
      `${data.screen.colorDepth}`,
      `${data.screen.pixelRatio}`,
      
      // معلومات المتصفح
      data.browser.userAgent,
      data.browser.language,
      data.browser.languages.join(','),
      data.browser.platform,
      data.browser.vendor,
      `${data.browser.hardwareConcurrency}`,
      
      // معلومات النظام
      data.system.timezone,
      `${data.system.timezoneOffset}`,
      data.system.webgl,
      data.system.canvas.slice(0, 100), // أول 100 حرف من canvas
      data.system.audio,
      data.system.fonts.join(','),
      
      // معلومات الشبكة
      data.network.connection || '',
      data.network.effectiveType || '',
      
      // معلومات الأمان
      `${data.security.webdriver}`,
      `${data.security.phantom}`,
      `${data.security.selenium}`,
      `${data.security.headless}`,
      `${data.security.automation}`
    ];
    
    const combinedString = components.join('|');
    
    // إنشاء hash باستخدام crypto API
    const encoder = new TextEncoder();
    const data_buffer = encoder.encode(combinedString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data_buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  }

  /**
   * مقارنة بصمتين للتحقق من التطابق
   */
  compareFingerprints(fp1: DeviceFingerprint, fp2: DeviceFingerprint): {
    match: boolean;
    similarity: number;
    suspiciousChanges: string[];
  } {
    const suspiciousChanges: string[] = [];
    let matchingComponents = 0;
    let totalComponents = 0;

    // مقارنة معلومات الشاشة (يجب أن تكون مطابقة تماماً)
    totalComponents += 4;
    if (fp1.screen.width === fp2.screen.width) matchingComponents++;
    else suspiciousChanges.push('screen_width_changed');
    
    if (fp1.screen.height === fp2.screen.height) matchingComponents++;
    else suspiciousChanges.push('screen_height_changed');
    
    if (fp1.screen.colorDepth === fp2.screen.colorDepth) matchingComponents++;
    else suspiciousChanges.push('color_depth_changed');
    
    if (fp1.screen.pixelRatio === fp2.screen.pixelRatio) matchingComponents++;
    else suspiciousChanges.push('pixel_ratio_changed');

    // مقارنة معلومات النظام (يجب أن تكون مطابقة)
    totalComponents += 5;
    if (fp1.system.timezone === fp2.system.timezone) matchingComponents++;
    else suspiciousChanges.push('timezone_changed');
    
    if (fp1.system.webgl === fp2.system.webgl) matchingComponents++;
    else suspiciousChanges.push('webgl_changed');
    
    if (fp1.system.canvas === fp2.system.canvas) matchingComponents++;
    else suspiciousChanges.push('canvas_changed');
    
    if (fp1.system.audio === fp2.system.audio) matchingComponents++;
    else suspiciousChanges.push('audio_changed');
    
    if (JSON.stringify(fp1.system.fonts) === JSON.stringify(fp2.system.fonts)) matchingComponents++;
    else suspiciousChanges.push('fonts_changed');

    // مقارنة معلومات الأجهزة
    totalComponents += 2;
    if (fp1.browser.hardwareConcurrency === fp2.browser.hardwareConcurrency) matchingComponents++;
    else suspiciousChanges.push('hardware_concurrency_changed');
    
    if (fp1.browser.platform === fp2.browser.platform) matchingComponents++;
    else suspiciousChanges.push('platform_changed');

    const similarity = matchingComponents / totalComponents;
    
    // إذا كان التطابق أكثر من 85% نعتبرها نفس الجهاز
    const match = similarity >= 0.85;

    return {
      match,
      similarity,
      suspiciousChanges
    };
  }

  /**
   * تحديد مستوى الخطر بناءً على التغييرات
   */
  assessRiskLevel(suspiciousChanges: string[]): 'low' | 'medium' | 'high' | 'critical' {
    const criticalChanges = ['canvas_changed', 'webgl_changed', 'audio_changed'];
    const highRiskChanges = ['screen_width_changed', 'screen_height_changed', 'platform_changed'];
    const mediumRiskChanges = ['timezone_changed', 'fonts_changed'];

    const hasCritical = suspiciousChanges.some(change => criticalChanges.includes(change));
    const hasHighRisk = suspiciousChanges.some(change => highRiskChanges.includes(change));
    const hasMediumRisk = suspiciousChanges.some(change => mediumRiskChanges.includes(change));

    if (hasCritical || suspiciousChanges.length >= 5) return 'critical';
    if (hasHighRisk || suspiciousChanges.length >= 3) return 'high';
    if (hasMediumRisk || suspiciousChanges.length >= 1) return 'medium';
    
    return 'low';
  }
}

export const deviceFingerprintingService = DeviceFingerprintingService.getInstance();
