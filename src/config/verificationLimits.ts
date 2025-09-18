/**
 * إعدادات نظام قيود إرسال روابط التحقق
 * 
 * يمكن تعديل هذه القيم لتخصيص سلوك النظام
 * جميع الأوقات بالدقائق ما لم يُذكر غير ذلك
 */

export interface VerificationLimitsConfig {
  // القيود الأساسية
  maxConsecutiveAttempts: number;      // الحد الأقصى للمحاولات المتتالية الفاشلة
  maxDailyAttempts: number;            // الحد الأقصى للمحاولات اليومية
  minTimeBetweenAttempts: number;      // الحد الأدنى بين المحاولات (بالدقائق)
  
  // أوقات الانتظار
  consecutiveFailureWaitTime: number;  // وقت الانتظار بعد المحاولات المتتالية (بالدقائق)
  dailyLimitResetTime: number;         // وقت إعادة تعيين الحد اليومي (بالساعات)
  
  // إعدادات التنظيف
  cleanupOldDataAfterDays: number;     // حذف البيانات الأقدم من X يوم
  
  // إعدادات التحذيرات
  warningThresholdConsecutive: number; // تحذير عند الوصول لهذا العدد من المحاولات المتتالية
  warningThresholdDaily: number;       // تحذير عند الوصول لهذا العدد من المحاولات اليومية
  
  // إعدادات الأمان
  trackIpAddress: boolean;             // تتبع عناوين IP
  trackUserAgent: boolean;             // تتبع معلومات المتصفح
  enableDetailedLogging: boolean;      // تسجيل مفصل للأخطاء
}

// الإعدادات الافتراضية
export const DEFAULT_VERIFICATION_LIMITS: VerificationLimitsConfig = {
  // القيود الأساسية
  maxConsecutiveAttempts: 4,           // 4 محاولات متتالية فاشلة
  maxDailyAttempts: 12,                // 12 محاولة يومياً
  minTimeBetweenAttempts: 5,           // 5 دقائق بين المحاولات
  
  // أوقات الانتظار
  consecutiveFailureWaitTime: 120,     // ساعتين (120 دقيقة)
  dailyLimitResetTime: 24,             // 24 ساعة
  
  // إعدادات التنظيف
  cleanupOldDataAfterDays: 30,         // حذف البيانات بعد 30 يوم
  
  // إعدادات التحذيرات
  warningThresholdConsecutive: 3,      // تحذير بعد 3 محاولات متتالية
  warningThresholdDaily: 10,           // تحذير بعد 10 محاولات يومية
  
  // إعدادات الأمان
  trackIpAddress: true,                // تتبع IP
  trackUserAgent: true,                // تتبع المتصفح
  enableDetailedLogging: true          // تسجيل مفصل
};

// إعدادات بيئة التطوير (أكثر تساهلاً)
export const DEVELOPMENT_VERIFICATION_LIMITS: VerificationLimitsConfig = {
  maxConsecutiveAttempts: 10,          // 10 محاولات متتالية للتطوير
  maxDailyAttempts: 50,                // 50 محاولة يومياً للتطوير
  minTimeBetweenAttempts: 1,           // دقيقة واحدة فقط
  
  consecutiveFailureWaitTime: 10,      // 10 دقائق فقط
  dailyLimitResetTime: 24,
  
  cleanupOldDataAfterDays: 7,          // تنظيف أسرع في التطوير
  
  warningThresholdConsecutive: 8,
  warningThresholdDaily: 40,
  
  trackIpAddress: false,               // لا نتتبع IP في التطوير
  trackUserAgent: true,
  enableDetailedLogging: true
};

// إعدادات بيئة الإنتاج (أكثر صرامة)
export const PRODUCTION_VERIFICATION_LIMITS: VerificationLimitsConfig = {
  maxConsecutiveAttempts: 3,           // 3 محاولات فقط في الإنتاج
  maxDailyAttempts: 8,                 // 8 محاولات يومياً
  minTimeBetweenAttempts: 10,          // 10 دقائق بين المحاولات
  
  consecutiveFailureWaitTime: 180,     // 3 ساعات انتظار
  dailyLimitResetTime: 24,
  
  cleanupOldDataAfterDays: 90,         // الاحتفاظ بالبيانات لفترة أطول
  
  warningThresholdConsecutive: 2,      // تحذير مبكر
  warningThresholdDaily: 6,
  
  trackIpAddress: true,
  trackUserAgent: true,
  enableDetailedLogging: true
};

// دالة للحصول على الإعدادات حسب البيئة
export function getVerificationLimitsConfig(): VerificationLimitsConfig {
  const environment = process.env.NODE_ENV || 'development';
  
  switch (environment) {
    case 'production':
      return PRODUCTION_VERIFICATION_LIMITS;
    case 'development':
      return DEVELOPMENT_VERIFICATION_LIMITS;
    case 'test':
      return {
        ...DEVELOPMENT_VERIFICATION_LIMITS,
        cleanupOldDataAfterDays: 1,    // تنظيف سريع في الاختبارات
        minTimeBetweenAttempts: 0      // لا انتظار في الاختبارات
      };
    default:
      return DEFAULT_VERIFICATION_LIMITS;
  }
}

// دالة لتخصيص الإعدادات
export function createCustomConfig(overrides: Partial<VerificationLimitsConfig>): VerificationLimitsConfig {
  return {
    ...DEFAULT_VERIFICATION_LIMITS,
    ...overrides
  };
}

// إعدادات خاصة لحالات معينة
export const SPECIAL_CONFIGS = {
  // إعدادات للمستخدمين المميزين (أقل قيود)
  VIP_USERS: createCustomConfig({
    maxConsecutiveAttempts: 8,
    maxDailyAttempts: 20,
    minTimeBetweenAttempts: 2,
    consecutiveFailureWaitTime: 60
  }),
  
  // إعدادات للمستخدمين المشبوهين (قيود أكثر)
  SUSPICIOUS_USERS: createCustomConfig({
    maxConsecutiveAttempts: 2,
    maxDailyAttempts: 3,
    minTimeBetweenAttempts: 30,
    consecutiveFailureWaitTime: 360 // 6 ساعات
  }),
  
  // إعدادات للاختبار السريع
  QUICK_TEST: createCustomConfig({
    maxConsecutiveAttempts: 2,
    maxDailyAttempts: 5,
    minTimeBetweenAttempts: 0,
    consecutiveFailureWaitTime: 1,
    cleanupOldDataAfterDays: 1
  })
};

// رسائل النظام القابلة للتخصيص
export const VERIFICATION_MESSAGES = {
  CONSECUTIVE_LIMIT_REACHED: (attempts: number, waitTime: number) => 
    `تم الوصول للحد الأقصى من المحاولات المتتالية (${attempts} مرات). يرجى الانتظار ${waitTime} دقيقة.`,
  
  DAILY_LIMIT_REACHED: (attempts: number) => 
    `تم الوصول للحد الأقصى اليومي (${attempts} محاولة). يرجى المحاولة غداً.`,
  
  MIN_TIME_NOT_PASSED: (waitTime: number) => 
    `يرجى الانتظار ${waitTime} دقيقة قبل طلب رابط تحقق جديد.`,
  
  WARNING_CONSECUTIVE: (current: number, max: number) => 
    `تحذير: لديك ${current} محاولات فاشلة من أصل ${max} مسموحة.`,
  
  WARNING_DAILY: (current: number, max: number) => 
    `تحذير: لديك ${current} محاولة من أصل ${max} مسموحة اليوم.`,
  
  SUCCESS_WITH_STATS: (dailyAttempts: number, maxDaily: number) => 
    `تم إرسال رابط التحقق بنجاح! (${dailyAttempts}/${maxDaily} محاولة اليوم)`
};

// دالة للتحقق من صحة الإعدادات
export function validateConfig(config: VerificationLimitsConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (config.maxConsecutiveAttempts < 1) {
    errors.push('maxConsecutiveAttempts يجب أن يكون أكبر من 0');
  }
  
  if (config.maxDailyAttempts < 1) {
    errors.push('maxDailyAttempts يجب أن يكون أكبر من 0');
  }
  
  if (config.minTimeBetweenAttempts < 0) {
    errors.push('minTimeBetweenAttempts يجب أن يكون 0 أو أكبر');
  }
  
  if (config.consecutiveFailureWaitTime < 1) {
    errors.push('consecutiveFailureWaitTime يجب أن يكون أكبر من 0');
  }
  
  if (config.warningThresholdConsecutive >= config.maxConsecutiveAttempts) {
    errors.push('warningThresholdConsecutive يجب أن يكون أقل من maxConsecutiveAttempts');
  }
  
  if (config.warningThresholdDaily >= config.maxDailyAttempts) {
    errors.push('warningThresholdDaily يجب أن يكون أقل من maxDailyAttempts');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// تصدير الإعدادات الحالية
export const CURRENT_CONFIG = getVerificationLimitsConfig();

// دالة لطباعة الإعدادات الحالية (للتطوير فقط)
export function printCurrentConfig() {
  if (process.env.NODE_ENV !== 'development') {
    return; // لا تعرض أي معلومات في الإنتاج
  }

  console.log('⚙️ إعدادات نظام قيود التحقق الحالية:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const config = CURRENT_CONFIG;

  console.log(`📊 القيود الأساسية:`);
  console.log(`   • الحد الأقصى للمحاولات المتتالية: ${config.maxConsecutiveAttempts}`);
  console.log(`   • الحد الأقصى للمحاولات اليومية: ${config.maxDailyAttempts}`);
  console.log(`   • الحد الأدنى بين المحاولات: ${config.minTimeBetweenAttempts} دقيقة`);

  console.log(`⏰ أوقات الانتظار:`);
  console.log(`   • انتظار المحاولات المتتالية: ${config.consecutiveFailureWaitTime} دقيقة`);
  console.log(`   • إعادة تعيين الحد اليومي: ${config.dailyLimitResetTime} ساعة`);

  console.log(`🧹 إعدادات التنظيف:`);
  console.log(`   • حذف البيانات القديمة بعد: ${config.cleanupOldDataAfterDays} يوم`);

  console.log(`⚠️ إعدادات التحذيرات:`);
  console.log(`   • تحذير المحاولات المتتالية عند: ${config.warningThresholdConsecutive}`);
  console.log(`   • تحذير المحاولات اليومية عند: ${config.warningThresholdDaily}`);

  console.log(`🔒 إعدادات الأمان:`);
  console.log(`   • تتبع عناوين IP: ${config.trackIpAddress ? '✅' : '❌'}`);
  console.log(`   • تتبع معلومات المتصفح: ${config.trackUserAgent ? '✅' : '❌'}`);
  console.log(`   • التسجيل المفصل: ${config.enableDetailedLogging ? '✅' : '❌'}`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

export default {
  DEFAULT_VERIFICATION_LIMITS,
  DEVELOPMENT_VERIFICATION_LIMITS,
  PRODUCTION_VERIFICATION_LIMITS,
  SPECIAL_CONFIGS,
  VERIFICATION_MESSAGES,
  getVerificationLimitsConfig,
  createCustomConfig,
  validateConfig,
  printCurrentConfig,
  CURRENT_CONFIG
};
