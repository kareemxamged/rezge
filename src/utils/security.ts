// Security utilities for the Islamic marriage website

/**
 * Password strength validation
 */
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} => {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('يجب أن تحتوي على حرف كبير واحد على الأقل');
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('يجب أن تحتوي على حرف صغير واحد على الأقل');
  }

  // Number check
  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('يجب أن تحتوي على رقم واحد على الأقل');
  }

  // Special character check
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  } else {
    feedback.push('يجب أن تحتوي على رمز خاص واحد على الأقل');
  }

  return {
    isValid: score >= 4,
    score,
    feedback
  };
};

/**
 * Content moderation for messages
 */
export const moderateContent = (content: string): {
  isApproved: boolean;
  flaggedWords: string[];
  severity: 'low' | 'medium' | 'high';
  reason?: string;
} => {
  // List of inappropriate words/phrases (in Arabic and English)
  const flaggedWords = [
    // Add inappropriate words here
    'كلمة_غير_مناسبة',
    'inappropriate_word',
    // This would be expanded with actual moderation rules
  ];

  // Islamic guidelines violations
  const islamicViolations = [
    'موعد',
    'لقاء منفرد',
    'خروج بدون محرم',
    'date',
    'meet alone'
  ];

  const foundFlaggedWords: string[] = [];
  const foundViolations: string[] = [];

  // Check for flagged words
  flaggedWords.forEach(word => {
    if (content.toLowerCase().includes(word.toLowerCase())) {
      foundFlaggedWords.push(word);
    }
  });

  // Check for Islamic guideline violations
  islamicViolations.forEach(violation => {
    if (content.toLowerCase().includes(violation.toLowerCase())) {
      foundViolations.push(violation);
    }
  });

  let severity: 'low' | 'medium' | 'high' = 'low';
  let reason: string | undefined;

  if (foundViolations.length > 0) {
    severity = 'high';
    reason = 'مخالفة للضوابط الشرعية';
  } else if (foundFlaggedWords.length > 0) {
    severity = 'medium';
    reason = 'محتوى غير مناسب';
  }

  return {
    isApproved: foundFlaggedWords.length === 0 && foundViolations.length === 0,
    flaggedWords: [...foundFlaggedWords, ...foundViolations],
    severity,
    reason
  };
};

/**
 * Email validation
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Phone number validation (Saudi format)
 */
export const validateSaudiPhone = (phone: string): boolean => {
  // Saudi phone number format: 05xxxxxxxx
  const phoneRegex = /^05\d{8}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
};

/**
 * Data sanitization
 */
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
};

/**
 * Generate secure random token
 */
export const generateSecureToken = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();

  isAllowed(identifier: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
    const now = Date.now();
    const userAttempts = this.attempts.get(identifier);

    if (!userAttempts || now > userAttempts.resetTime) {
      this.attempts.set(identifier, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (userAttempts.count >= maxAttempts) {
      return false;
    }

    userAttempts.count++;
    return true;
  }

  getRemainingTime(identifier: string): number {
    const userAttempts = this.attempts.get(identifier);
    if (!userAttempts) return 0;
    
    const remaining = userAttempts.resetTime - Date.now();
    return Math.max(0, remaining);
  }
}

/**
 * Privacy settings validation
 */
export const validatePrivacySettings = (settings: {
  showPhone: boolean;
  showEmail: boolean;
  allowMessages: boolean;
  familyCanView: boolean;
}): boolean => {
  // Ensure at least one contact method is available
  return settings.showPhone || settings.showEmail || settings.allowMessages;
};

/**
 * Age verification
 */
export const verifyAge = (birthDate: string): { isValid: boolean; age: number } => {
  const birth = new Date(birthDate);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate()) 
    ? age - 1 
    : age;

  return {
    isValid: actualAge >= 18 && actualAge <= 80,
    age: actualAge
  };
};

/**
 * Islamic content guidelines checker
 */
export const checkIslamicGuidelines = (content: string): {
  isCompliant: boolean;
  violations: string[];
  suggestions: string[];
} => {
  const violations: string[] = [];
  const suggestions: string[] = [];

  // Check for inappropriate meeting suggestions
  const inappropriateMeetings = [
    'لقاء منفرد',
    'موعد رومانسي',
    'خروج بدون محرم',
    'meet alone',
    'romantic date'
  ];

  inappropriateMeetings.forEach(phrase => {
    if (content.toLowerCase().includes(phrase.toLowerCase())) {
      violations.push('اقتراح لقاء غير شرعي');
      suggestions.push('يُفضل اقتراح لقاء بحضور الأهل أو في مكان عام');
    }
  });

  // Check for inappropriate language
  const inappropriateLanguage = [
    'حبيبي',
    'حبيبتي',
    'عشقي',
    'my love',
    'darling'
  ];

  inappropriateLanguage.forEach(word => {
    if (content.toLowerCase().includes(word.toLowerCase())) {
      violations.push('استخدام ألفاظ غير مناسبة للتعارف الشرعي');
      suggestions.push('استخدم ألفاظاً محترمة ومناسبة للتعارف الشرعي');
    }
  });

  return {
    isCompliant: violations.length === 0,
    violations,
    suggestions
  };
};

/**
 * دالة آمنة لتشفير النصوص إلى Base64
 */
const safeBase64Encode = (str: string): string => {
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
    // طريقة احتياطية - تحويل النص إلى hex ثم base64
    const hex = Array.from(str)
      .map(char => char.charCodeAt(0).toString(16).padStart(4, '0'))
      .join('');
    return btoa(hex);
  }
};

/**
 * Encryption helpers (for demonstration - in production use proper crypto libraries)
 */
export const encryptSensitiveData = (data: string, key: string): string => {
  // This is a simple demonstration - use proper encryption in production
  let encrypted = '';
  for (let i = 0; i < data.length; i++) {
    const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    encrypted += String.fromCharCode(charCode);
  }
  // استخدام الدالة الآمنة بدلاً من btoa مباشرة
  return safeBase64Encode(encrypted);
};

export const decryptSensitiveData = (encryptedData: string, key: string): string => {
  // This is a simple demonstration - use proper decryption in production
  const encrypted = atob(encryptedData);
  let decrypted = '';
  for (let i = 0; i < encrypted.length; i++) {
    const charCode = encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    decrypted += String.fromCharCode(charCode);
  }
  return decrypted;
};

/**
 * Session management
 */
export const generateSessionToken = (): string => {
  return generateSecureToken(64);
};

export const isSessionValid = (sessionToken: string, expiryTime: number): boolean => {
  return Date.now() < expiryTime && sessionToken.length === 64;
};

/**
 * Input validation for forms
 */
export const validateFormInput = (input: string, type: 'name' | 'text' | 'number'): boolean => {
  switch (type) {
    case 'name':
      // Arabic and English names only
      return /^[\u0600-\u06FFa-zA-Z\s]+$/.test(input) && input.length >= 2 && input.length <= 50;
    case 'text':
      // General text with basic validation
      return input.length >= 1 && input.length <= 500;
    case 'number':
      // Numbers only
      return /^\d+$/.test(input);
    default:
      return false;
  }
};

export default {
  validatePasswordStrength,
  moderateContent,
  validateEmail,
  validateSaudiPhone,
  sanitizeInput,
  generateSecureToken,
  RateLimiter,
  validatePrivacySettings,
  verifyAge,
  checkIslamicGuidelines,
  encryptSensitiveData,
  decryptSensitiveData,
  generateSessionToken,
  isSessionValid,
  validateFormInput
};
