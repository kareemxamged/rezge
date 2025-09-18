/**
 * أداة ذكية لتحديد البيئة والإعدادات تلقائياً
 * تعمل مع أي دومين بدون تخصيص مسبق
 */

export interface EnvironmentConfig {
  isDevelopment: boolean;
  isProduction: boolean;
  isLocalhost: boolean;
  isVercel: boolean;
  currentDomain: string;
  currentUrl: string;
  smtpServerUrl: string;
  apiBaseUrl: string;
}

/**
 * تحديد البيئة الحالية تلقائياً
 */
export function detectEnvironment(): EnvironmentConfig {
  // الحصول على معلومات النطاق الحالي
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  const port = typeof window !== 'undefined' ? window.location.port : '';
  
  // تحديد نوع البيئة
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isVercel = hostname.includes('.vercel.app');
  const isDevelopment = isLocalhost || process.env.NODE_ENV === 'development';
  const isProduction = !isDevelopment;
  
  // بناء URL الحالي
  const currentUrl = typeof window !== 'undefined' 
    ? `${protocol}//${hostname}${port ? `:${port}` : ''}`
    : 'http://localhost:5173';
  
  // تحديد URL خادم SMTP
  let smtpServerUrl: string;
  if (isLocalhost) {
    // في التطوير المحلي: استخدم خادم SMTP المحلي
    smtpServerUrl = 'http://localhost:3001';
  } else {
    // في الإنتاج: استخدم Supabase Edge Function المحدثة
    smtpServerUrl = 'https://sbtzngewizgeqzfbhfjy.supabase.co/functions/v1/send-custom-smtp';
  }
  
  return {
    isDevelopment,
    isProduction,
    isLocalhost,
    isVercel,
    currentDomain: hostname,
    currentUrl,
    smtpServerUrl,
    apiBaseUrl: currentUrl
  };
}

/**
 * الحصول على إعدادات SMTP المناسبة للبيئة الحالية
 */
export function getSMTPConfig() {
  const env = detectEnvironment();
  
  if (env.isLocalhost) {
    // في التطوير: استخدم خادم SMTP المحلي
    return {
      type: 'local',
      url: 'http://localhost:3001/send-email',
      fallback: 'supabase'
    };
  } else {
    // في الإنتاج: استخدم Supabase Custom SMTP أولاً ثم Resend
    return {
      type: 'supabase',
      url: 'https://sbtzngewizgeqzfbhfjy.supabase.co/functions/v1/send-custom-smtp',
      fallback: 'resend'
    };
  }
}

/**
 * الحصول على إعدادات Supabase المناسبة
 */
export function getSupabaseConfig() {
  const env = detectEnvironment();
  
  return {
    url: import.meta.env.VITE_SUPABASE_URL || 'https://sbtzngewizgeqzfbhfjy.supabase.co',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    serviceRoleKey: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
    // إضافة النطاق الحالي لقائمة المسموح بها
    allowedOrigins: [
      env.currentUrl,
      'http://localhost:*',
      'https://localhost:*',
      'https://*.vercel.app',
      'https://*.netlify.app',
      'https://*.herokuapp.com'
    ]
  };
}

/**
 * تسجيل معلومات البيئة للتشخيص
 */
export function logEnvironmentInfo() {
  const env = detectEnvironment();
  const smtp = getSMTPConfig();
  
  console.log('🌍 معلومات البيئة الحالية:');
  console.log('━'.repeat(50));
  console.log(`📍 النطاق: ${env.currentDomain}`);
  console.log(`🔗 URL الكامل: ${env.currentUrl}`);
  console.log(`🏠 محلي: ${env.isLocalhost ? 'نعم' : 'لا'}`);
  console.log(`☁️ Vercel: ${env.isVercel ? 'نعم' : 'لا'}`);
  console.log(`🔧 التطوير: ${env.isDevelopment ? 'نعم' : 'لا'}`);
  console.log(`🚀 الإنتاج: ${env.isProduction ? 'نعم' : 'لا'}`);
  console.log('━'.repeat(50));
  console.log(`📧 نوع SMTP: ${smtp.type}`);
  console.log(`🔗 URL SMTP: ${smtp.url}`);
  console.log(`🔄 الاحتياطي: ${smtp.fallback}`);
  console.log('━'.repeat(50));
}

/**
 * فحص توافق البيئة مع المتطلبات
 */
export function checkEnvironmentCompatibility(): {
  isCompatible: boolean;
  issues: string[];
  recommendations: string[];
} {
  const env = detectEnvironment();
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // فحص متغيرات البيئة المطلوبة
  if (!import.meta.env.VITE_SUPABASE_URL) {
    issues.push('VITE_SUPABASE_URL غير محدد');
  }
  
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
    issues.push('VITE_SUPABASE_ANON_KEY غير محدد');
  }
  
  if (env.isProduction && !import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
    issues.push('VITE_SUPABASE_SERVICE_ROLE_KEY مطلوب في الإنتاج');
    recommendations.push('أضف VITE_SUPABASE_SERVICE_ROLE_KEY في إعدادات النشر');
  }
  
  // فحص HTTPS في الإنتاج
  if (env.isProduction && !env.currentUrl.startsWith('https://')) {
    issues.push('HTTPS مطلوب في الإنتاج');
    recommendations.push('تأكد من تفعيل HTTPS على الدومين');
  }
  
  // توصيات عامة
  if (env.isLocalhost) {
    recommendations.push('تأكد من تشغيل خادم SMTP المحلي على البورت 3001');
  } else {
    recommendations.push('تأكد من تكوين Supabase Custom SMTP بشكل صحيح');
  }
  
  return {
    isCompatible: issues.length === 0,
    issues,
    recommendations
  };
}

export default {
  detectEnvironment,
  getSMTPConfig,
  getSupabaseConfig,
  logEnvironmentInfo,
  checkEnvironmentCompatibility
};
