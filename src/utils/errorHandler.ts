/**
 * معالج الأخطاء المركزي لتطبيق رزقي
 * يقوم بترجمة أخطاء Supabase إلى رسائل مفهومة للمستخدم
 * مع دعم نظام الأمان المحسن لتسجيل الدخول
 */

export interface ErrorTranslation {
  ar: string;
  en: string;
}

// رسائل خطأ موحدة لتسجيل الدخول (لأغراض الأمان)
export const UNIFIED_LOGIN_ERROR: ErrorTranslation = {
  ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
  en: 'Invalid email or password'
};

// رسائل خطأ خاصة بالأمان
export const SECURITY_ERRORS: Record<string, ErrorTranslation> = {
  ACCOUNT_NOT_VERIFIED: {
    ar: 'يجب تأكيد البريد الإلكتروني قبل تسجيل الدخول. يرجى فحص بريدك الإلكتروني.',
    en: 'Please verify your email before logging in. Check your email inbox.'
  },
  ACCOUNT_SUSPENDED: {
    ar: 'تم تعليق الحساب. يرجى التواصل مع الدعم الفني.',
    en: 'Account has been suspended. Please contact support.'
  },
  TOO_MANY_ATTEMPTS: {
    ar: 'تم تجاوز الحد الأقصى للمحاولات. يرجى المحاولة لاحقاً.',
    en: 'Too many login attempts. Please try again later.'
  },
  RATE_LIMITED: {
    ar: 'تم منع تسجيل الدخول مؤقتاً بسبب المحاولات المتكررة.',
    en: 'Login temporarily blocked due to repeated attempts.'
  }
};

/**
 * خريطة أخطاء Supabase الشائعة
 */
const SUPABASE_ERROR_MAP: Record<string, ErrorTranslation> = {
  // أخطاء المصادقة
  'Invalid login credentials': {
    ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    en: 'Invalid email or password'
  },
  'Email not confirmed': {
    ar: 'يرجى تأكيد البريد الإلكتروني أولاً',
    en: 'Please confirm your email first'
  },
  'User not found': {
    ar: 'المستخدم غير موجود',
    en: 'User not found'
  },
  'Invalid email': {
    ar: 'البريد الإلكتروني غير صحيح',
    en: 'Invalid email format'
  },
  'Password should be at least 6 characters': {
    ar: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
    en: 'Password should be at least 6 characters'
  },
  'User already registered': {
    ar: 'هذا البريد الإلكتروني مسجل مسبقاً',
    en: 'This email is already registered'
  },
  'Signup disabled': {
    ar: 'التسجيل معطل حالياً',
    en: 'Registration is currently disabled'
  },
  'Too many requests': {
    ar: 'تم تجاوز الحد المسموح من المحاولات، يرجى المحاولة لاحقاً',
    en: 'Too many attempts, please try again later'
  },
  'Too many requests. Please wait before trying again.': {
    ar: 'طلبات كثيرة جداً. يرجى الانتظار قبل المحاولة مرة أخرى.',
    en: 'Too many requests. Please wait before trying again.'
  },
  'Email rate limit exceeded': {
    ar: 'تم تجاوز الحد المسموح لإرسال الإيميلات، يرجى المحاولة لاحقاً',
    en: 'Email rate limit exceeded, please try again later'
  },
  'Network error': {
    ar: 'خطأ في الاتصال، يرجى التحقق من الإنترنت',
    en: 'Network error, please check your internet connection'
  },
  'Database error': {
    ar: 'خطأ في قاعدة البيانات، يرجى المحاولة لاحقاً',
    en: 'Database error, please try again later'
  },
  'Session expired': {
    ar: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى',
    en: 'Session expired, please login again'
  },
  'Access denied': {
    ar: 'ليس لديك صلاحية للوصول',
    en: 'Access denied'
  },
  'Invalid token': {
    ar: 'رمز التحقق غير صحيح أو منتهي الصلاحية',
    en: 'Invalid or expired verification token'
  },
  'Token expired': {
    ar: 'انتهت صلاحية رمز التحقق',
    en: 'Verification token has expired'
  }
};

/**
 * رسائل الخطأ الافتراضية
 */
const DEFAULT_ERRORS: ErrorTranslation = {
  ar: 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى',
  en: 'An unexpected error occurred, please try again'
};

/**
 * ترجمة خطأ Supabase إلى رسالة مفهومة
 */
export function translateSupabaseError(error: any, language: 'ar' | 'en' = 'ar'): string {
  if (!error) {
    return DEFAULT_ERRORS[language];
  }

  // استخراج رسالة الخطأ
  const errorMessage = error.message || error.error_description || error.error || '';
  
  // البحث عن ترجمة مطابقة
  const translation = SUPABASE_ERROR_MAP[errorMessage];
  if (translation) {
    return translation[language];
  }

  // البحث عن ترجمة جزئية
  for (const [key, value] of Object.entries(SUPABASE_ERROR_MAP)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return value[language];
    }
  }

  // معالجة أخطاء خاصة بناءً على الكود
  if (error.status === 400) {
    return language === 'ar' 
      ? 'البيانات المدخلة غير صحيحة' 
      : 'Invalid input data';
  }

  if (error.status === 401) {
    return language === 'ar' 
      ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' 
      : 'Invalid email or password';
  }

  if (error.status === 403) {
    return language === 'ar' 
      ? 'ليس لديك صلاحية للوصول' 
      : 'Access denied';
  }

  if (error.status === 422) {
    return language === 'ar' 
      ? 'البيانات المدخلة غير مكتملة أو غير صحيحة' 
      : 'Invalid or incomplete data';
  }

  if (error.status === 429) {
    return language === 'ar' 
      ? 'تم تجاوز الحد المسموح من المحاولات، يرجى المحاولة لاحقاً' 
      : 'Too many attempts, please try again later';
  }

  if (error.status >= 500) {
    return language === 'ar' 
      ? 'خطأ في الخادم، يرجى المحاولة لاحقاً' 
      : 'Server error, please try again later';
  }

  // إذا لم نجد ترجمة محددة، نعيد الرسالة الافتراضية
  return DEFAULT_ERRORS[language];
}

/**
 * معالج شامل للأخطاء مع تسجيل مفصل
 */
export function handleError(error: any, context: string = '', language: 'ar' | 'en' = 'ar'): string {
  // تسجيل الخطأ للمطورين
  if (process.env.NODE_ENV === 'development') {
    console.group(`🚨 Error in ${context}`);
    console.error('Original error:', error);
    console.error('Error message:', error?.message);
    console.error('Error code:', error?.code);
    console.error('Error status:', error?.status);
    console.error('Error details:', error?.details);
    console.groupEnd();
  }

  // ترجمة الخطأ للمستخدم
  return translateSupabaseError(error, language);
}

/**
 * معالج خاص لأخطاء تسجيل الدخول مع نظام الأمان المحسن
 */
export function handleLoginError(error: any, language: 'ar' | 'en' = 'ar', securityContext?: {
  isBlocked?: boolean;
  blockReason?: string;
  accountNotVerified?: boolean;
  accountSuspended?: boolean;
}): string {
  // التحقق من السياق الأمني أولاً
  if (securityContext) {
    if (securityContext.isBlocked && securityContext.blockReason) {
      return securityContext.blockReason;
    }

    if (securityContext.accountNotVerified) {
      return SECURITY_ERRORS.ACCOUNT_NOT_VERIFIED[language];
    }

    if (securityContext.accountSuspended) {
      return SECURITY_ERRORS.ACCOUNT_SUSPENDED[language];
    }
  }

  // للأخطاء العادية، استخدم رسالة موحدة لأغراض الأمان
  if (error) {
    const errorMessage = error.message || error.error_description || error.error || '';

    // أخطاء تسجيل الدخول الشائعة - نعرض رسالة موحدة
    if (
      errorMessage.includes('Invalid login credentials') ||
      errorMessage.includes('Email not confirmed') ||
      errorMessage.includes('Invalid email or password') ||
      errorMessage.includes('User not found') ||
      errorMessage.includes('Wrong password') ||
      errorMessage.includes('Authentication failed')
    ) {
      return UNIFIED_LOGIN_ERROR[language];
    }

    // أخطاء الشبكة أو الخادم
    if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
      return language === 'ar'
        ? 'مشكلة في الاتصال. يرجى المحاولة مرة أخرى.'
        : 'Connection problem. Please try again.';
    }
  }

  // في حالة عدم وجود خطأ محدد، استخدم الرسالة الموحدة
  return UNIFIED_LOGIN_ERROR[language];
}

/**
 * معالج خاص لأخطاء التسجيل
 */
export function handleSignupError(error: any, language: 'ar' | 'en' = 'ar'): string {
  return handleError(error, 'Signup', language);
}

/**
 * معالج خاص لأخطاء إعادة تعيين كلمة المرور
 */
export function handlePasswordResetError(error: any, language: 'ar' | 'en' = 'ar'): string {
  return handleError(error, 'Password Reset', language);
}

/**
 * التحقق من نوع الخطأ
 */
export function isNetworkError(error: any): boolean {
  return error?.message?.includes('fetch') || 
         error?.message?.includes('network') ||
         error?.code === 'NETWORK_ERROR';
}

export function isAuthError(error: any): boolean {
  return error?.status === 401 || 
         error?.message?.includes('Invalid login credentials') ||
         error?.message?.includes('User not found');
}

export function isValidationError(error: any): boolean {
  return error?.status === 400 || 
         error?.status === 422 ||
         error?.message?.includes('Invalid email');
}
