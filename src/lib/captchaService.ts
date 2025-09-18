/**
 * خدمة CAPTCHA المخصصة البسيطة
 * نظام CAPTCHA رياضي لا يحتاج لخدمات خارجية
 */

/**
 * نتيجة التحقق من Captcha
 */
export interface CaptchaVerificationResult {
  success: boolean;
  score?: number;
  action?: string;
  message?: string;
  timestamp?: string;
}

/**
 * تحدي CAPTCHA
 */
export interface CaptchaChallenge {
  question: string;
  answer: number;
  id: string;
  timestamp: number;
}

/**
 * نوع العمل المطلوب التحقق منه
 */
export type CaptchaAction =
  | 'login'
  | 'register'
  | 'forgot_password'
  | 'contact'
  | 'password_reset'
  | 'email_change';

/**
 * معلومات المستخدم الموثوق
 */
interface TrustedUser {
  userId?: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  lastVerification: number;
  successfulAttempts: number;
  failedAttempts: number;
  trustScore: number;
  expiresAt: number;
}

/**
 * إعدادات نظام الثقة
 */
interface TrustSettings {
  trustDuration: number; // مدة الثقة بالمللي ثانية
  minSuccessfulAttempts: number; // الحد الأدنى للمحاولات الناجحة
  maxFailedAttempts: number; // الحد الأقصى للمحاولات الفاشلة
  minTrustScore: number; // النقاط المطلوبة للثقة
  skipCaptchaForTrusted: boolean; // تخطي CAPTCHA للمستخدمين الموثوقين
}

/**
 * خدمة CAPTCHA المخصصة الذكية
 * نظام CAPTCHA رياضي مع نظام ثقة متقدم
 */
class CaptchaService {
  private static enabled: boolean = true;
  private static challenges: Map<string, CaptchaChallenge> = new Map();
  private static trustedUsers: Map<string, TrustedUser> = new Map();

  // إعدادات نظام الثقة
  private static trustSettings: TrustSettings = {
    trustDuration: 24 * 60 * 60 * 1000, // 24 ساعة
    minSuccessfulAttempts: 3, // 3 محاولات ناجحة
    maxFailedAttempts: 2, // محاولتان فاشلتان كحد أقصى
    minTrustScore: 0.8, // 80% نقاط ثقة
    skipCaptchaForTrusted: true // تخطي CAPTCHA للموثوقين
  };

  /**
   * فحص ما إذا كان Captcha مفعل
   */
  static isEnabled(): boolean {
    return CaptchaService.enabled;
  }

  /**
   * فحص ما إذا كان المستخدم بحاجة لـ CAPTCHA
   */
  static needsCaptcha(userId?: string, sessionId?: string): boolean {
    if (!CaptchaService.enabled) {
      return false;
    }

    // إذا لم يتم تفعيل تخطي CAPTCHA للموثوقين
    if (!CaptchaService.trustSettings.skipCaptchaForTrusted) {
      return true;
    }

    const userKey = CaptchaService.generateUserKey(userId, sessionId);
    const trustedUser = CaptchaService.trustedUsers.get(userKey);

    if (!trustedUser) {
      return true; // مستخدم جديد يحتاج CAPTCHA
    }

    // فحص انتهاء صلاحية الثقة
    if (Date.now() > trustedUser.expiresAt) {
      CaptchaService.trustedUsers.delete(userKey);
      return true;
    }

    // فحص نقاط الثقة
    return trustedUser.trustScore < CaptchaService.trustSettings.minTrustScore;
  }

  /**
   * تفعيل أو إلغاء تفعيل CAPTCHA
   */
  static setEnabled(enabled: boolean): void {
    CaptchaService.enabled = enabled;
  }

  /**
   * إنشاء تحدي CAPTCHA جديد
   */
  static generateChallenge(): CaptchaChallenge {
    const operations = ['+', '-', '×'];
    const operation = operations[Math.floor(Math.random() * operations.length)];

    let num1: number, num2: number, answer: number, question: string;

    switch (operation) {
      case '+':
        num1 = Math.floor(Math.random() * 20) + 1;
        num2 = Math.floor(Math.random() * 20) + 1;
        answer = num1 + num2;
        question = `${num1} + ${num2} = ?`;
        break;
      case '-':
        num1 = Math.floor(Math.random() * 30) + 10;
        num2 = Math.floor(Math.random() * num1) + 1;
        answer = num1 - num2;
        question = `${num1} - ${num2} = ?`;
        break;
      case '×':
        num1 = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * 10) + 1;
        answer = num1 * num2;
        question = `${num1} × ${num2} = ?`;
        break;
      default:
        num1 = 5;
        num2 = 3;
        answer = 8;
        question = '5 + 3 = ?';
    }

    const challenge: CaptchaChallenge = {
      id: Math.random().toString(36).substring(2, 15),
      question,
      answer,
      timestamp: Date.now()
    };

    // حفظ التحدي مؤقتاً (ينتهي خلال 5 دقائق)
    CaptchaService.challenges.set(challenge.id, challenge);

    // تنظيف التحديات المنتهية الصلاحية
    CaptchaService.cleanupExpiredChallenges();

    return challenge;
  }

  /**
   * التحقق من صحة إجابة CAPTCHA مع تحديث نظام الثقة
   */
  static verifyChallenge(
    challengeId: string,
    userAnswer: string,
    action: CaptchaAction,
    userId?: string,
    sessionId?: string
  ): CaptchaVerificationResult {
    const challenge = CaptchaService.challenges.get(challengeId);

    if (!challenge) {
      return {
        success: false,
        message: 'التحدي غير موجود أو منتهي الصلاحية',
        timestamp: new Date().toISOString()
      };
    }

    // فحص انتهاء الصلاحية (5 دقائق)
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    if (now - challenge.timestamp > fiveMinutes) {
      CaptchaService.challenges.delete(challengeId);
      return {
        success: false,
        message: 'انتهت صلاحية التحدي، يرجى المحاولة مرة أخرى',
        timestamp: new Date().toISOString()
      };
    }

    const answer = parseInt(userAnswer.trim());
    const isCorrect = answer === challenge.answer;

    // تحديث نظام الثقة
    if (userId || sessionId) {
      CaptchaService.updateUserTrust(userId, sessionId, isCorrect);
    }

    // حذف التحدي بعد الاستخدام
    CaptchaService.challenges.delete(challengeId);

    return {
      success: isCorrect,
      score: isCorrect ? 1.0 : 0.0,
      action,
      message: isCorrect ? 'تم التحقق بنجاح' : 'الإجابة غير صحيحة، يرجى المحاولة مرة أخرى',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * تنظيف التحديات المنتهية الصلاحية
   */
  private static cleanupExpiredChallenges(): void {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    for (const [id, challenge] of CaptchaService.challenges.entries()) {
      if (now - challenge.timestamp > fiveMinutes) {
        CaptchaService.challenges.delete(id);
      }
    }
  }

  /**
   * إنشاء مفتاح فريد للمستخدم
   */
  private static generateUserKey(userId?: string, sessionId?: string): string {
    const userInfo = CaptchaService.getUserInfo();
    return `${userId || 'anonymous'}_${sessionId || userInfo.sessionId}_${userInfo.ipHash}`;
  }

  /**
   * دالة آمنة لتشفير النصوص إلى Base64
   */
  private static safeBase64Encode(str: string): string {
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

  /**
   * الحصول على معلومات المستخدم الحالي
   */
  private static getUserInfo(): { sessionId: string; ipHash: string; userAgent: string } {
    // إنشاء session ID فريد إذا لم يكن موجود
    let sessionId = localStorage.getItem('captcha_session_id');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('captcha_session_id', sessionId);
    }

    // تشفير آمن لـ IP (محاكاة)
    const ipData = navigator.userAgent + window.screen.width + window.screen.height;
    const ipHash = this.safeBase64Encode(ipData).substring(0, 16);

    return {
      sessionId,
      ipHash,
      userAgent: navigator.userAgent
    };
  }

  /**
   * تحديث نظام ثقة المستخدم
   */
  private static updateUserTrust(userId?: string, sessionId?: string, success: boolean = true): void {
    const userKey = CaptchaService.generateUserKey(userId, sessionId);
    const userInfo = CaptchaService.getUserInfo();
    const now = Date.now();

    let trustedUser = CaptchaService.trustedUsers.get(userKey);

    if (!trustedUser) {
      trustedUser = {
        userId,
        sessionId: sessionId || userInfo.sessionId,
        ipAddress: userInfo.ipHash,
        userAgent: userInfo.userAgent,
        lastVerification: now,
        successfulAttempts: 0,
        failedAttempts: 0,
        trustScore: 0,
        expiresAt: now + CaptchaService.trustSettings.trustDuration
      };
    }

    // تحديث الإحصائيات
    if (success) {
      trustedUser.successfulAttempts++;
    } else {
      trustedUser.failedAttempts++;
    }

    trustedUser.lastVerification = now;
    trustedUser.expiresAt = now + CaptchaService.trustSettings.trustDuration;

    // حساب نقاط الثقة
    trustedUser.trustScore = CaptchaService.calculateTrustScore(trustedUser);

    CaptchaService.trustedUsers.set(userKey, trustedUser);

    // تنظيف المستخدمين المنتهيي الصلاحية
    CaptchaService.cleanupExpiredTrustedUsers();
  }

  /**
   * حساب نقاط ثقة المستخدم
   */
  private static calculateTrustScore(user: TrustedUser): number {
    const totalAttempts = user.successfulAttempts + user.failedAttempts;

    if (totalAttempts === 0) {
      return 0;
    }

    // النسبة الأساسية للنجاح
    const successRate = user.successfulAttempts / totalAttempts;

    // مكافأة للمستخدمين ذوي المحاولات الناجحة الكثيرة
    const attemptBonus = Math.min(user.successfulAttempts / CaptchaService.trustSettings.minSuccessfulAttempts, 1);

    // عقوبة للمحاولات الفاشلة الكثيرة
    const failurePenalty = user.failedAttempts > CaptchaService.trustSettings.maxFailedAttempts ? 0.5 : 1;

    // عامل الوقت (المستخدمين الجدد يحصلون على نقاط أقل)
    const timeFactor = Math.min((Date.now() - (user.expiresAt - CaptchaService.trustSettings.trustDuration)) / (60 * 60 * 1000), 1); // ساعة واحدة للوصول للحد الأقصى

    return Math.min(successRate * attemptBonus * failurePenalty * timeFactor, 1);
  }

  /**
   * تنظيف المستخدمين المنتهيي الصلاحية
   */
  private static cleanupExpiredTrustedUsers(): void {
    const now = Date.now();

    for (const [key, user] of CaptchaService.trustedUsers.entries()) {
      if (now > user.expiresAt) {
        CaptchaService.trustedUsers.delete(key);
      }
    }
  }

  /**
   * الحصول على إحصائيات المستخدم
   */
  static getUserTrustInfo(userId?: string, sessionId?: string): TrustedUser | null {
    const userKey = CaptchaService.generateUserKey(userId, sessionId);
    return CaptchaService.trustedUsers.get(userKey) || null;
  }

  /**
   * إعادة تعيين ثقة المستخدم
   */
  static resetUserTrust(userId?: string, sessionId?: string): void {
    const userKey = CaptchaService.generateUserKey(userId, sessionId);
    CaptchaService.trustedUsers.delete(userKey);
  }

  /**
   * تحديث إعدادات نظام الثقة
   */
  static updateTrustSettings(settings: Partial<TrustSettings>): void {
    CaptchaService.trustSettings = { ...CaptchaService.trustSettings, ...settings };
  }

  /**
   * الحصول على إعدادات نظام الثقة
   */
  static getTrustSettings(): TrustSettings {
    return { ...CaptchaService.trustSettings };
  }
}

// تصدير الفئة مباشرة
export default CaptchaService;
