/**
 * نظام معالجة أخطاء JWT المحسن
 * يوفر معالجة شاملة لجميع أنواع أخطاء JWT مع فصل كامل بين أنظمة المصادقة
 */

import { supabase, handleSupabaseError } from '../lib/supabase';

// أنواع أخطاء JWT المختلفة
export enum JWTErrorType {
  EXPIRED = 'expired',
  INVALID = 'invalid',
  MISSING = 'missing',
  REFRESH_FAILED = 'refresh_failed',
  NETWORK_ERROR = 'network_error',
  UNKNOWN = 'unknown'
}

// تفاصيل خطأ JWT
export interface JWTErrorDetails {
  type: JWTErrorType;
  originalError: any;
  context: string;
  timestamp: number;
  userType: 'regular' | 'admin';
  sessionId?: string;
}

// نتيجة معالجة الخطأ
export interface JWTErrorHandlingResult {
  success: boolean;
  action: 'refreshed' | 'signed_out' | 'retry' | 'ignore';
  message: string;
  shouldNotifyUser: boolean;
}

class JWTErrorHandler {
  private errorHistory: JWTErrorDetails[] = [];
  private maxHistorySize = 50;
  private retryAttempts = new Map<string, number>();
  private maxRetries = 3;

  /**
   * معالجة خطأ JWT بناءً على النوع والسياق
   */
  async handleJWTError(
    error: any, 
    context: string, 
    userType: 'regular' | 'admin' = 'regular'
  ): Promise<JWTErrorHandlingResult> {
    
    const errorDetails = this.analyzeError(error, context, userType);
    this.recordError(errorDetails);

    console.log(`🔑 JWT Error Handler: ${errorDetails.type} in ${context} for ${userType}`);

    switch (errorDetails.type) {
      case JWTErrorType.EXPIRED:
        return await this.handleExpiredToken(errorDetails);
      
      case JWTErrorType.INVALID:
        return await this.handleInvalidToken(errorDetails);
      
      case JWTErrorType.MISSING:
        return await this.handleMissingToken(errorDetails);
      
      case JWTErrorType.REFRESH_FAILED:
        return await this.handleRefreshFailed(errorDetails);
      
      case JWTErrorType.NETWORK_ERROR:
        return await this.handleNetworkError(errorDetails);
      
      default:
        return await this.handleUnknownError(errorDetails);
    }
  }

  /**
   * تحليل نوع خطأ JWT
   */
  private analyzeError(error: any, context: string, userType: 'regular' | 'admin'): JWTErrorDetails {
    const errorMessage = error?.message || '';
    const errorCode = error?.code || '';

    let type = JWTErrorType.UNKNOWN;

    if (errorMessage.includes('JWT expired') || errorCode === 'PGRST301') {
      type = JWTErrorType.EXPIRED;
    } else if (errorMessage.includes('Invalid token') || errorMessage.includes('invalid_grant')) {
      type = JWTErrorType.INVALID;
    } else if (errorMessage.includes('refresh_token_not_found')) {
      type = JWTErrorType.REFRESH_FAILED;
    } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
      type = JWTErrorType.NETWORK_ERROR;
    } else if (!errorMessage && !errorCode) {
      type = JWTErrorType.MISSING;
    }

    return {
      type,
      originalError: error,
      context,
      timestamp: Date.now(),
      userType,
      sessionId: this.generateSessionId()
    };
  }

  /**
   * معالجة انتهاء صلاحية الرمز
   */
  private async handleExpiredToken(details: JWTErrorDetails): Promise<JWTErrorHandlingResult> {
    try {
      console.log(`🔄 Attempting to refresh expired JWT for ${details.userType}`);

      if (details.userType === 'admin') {
        // للإداريين: تسجيل خروج فوري (نظام منفصل)
        return {
          success: false,
          action: 'signed_out',
          message: 'انتهت جلسة الإدارة. يرجى تسجيل الدخول مرة أخرى.',
          shouldNotifyUser: true
        };
      }

      // للمستخدمين العاديين: محاولة التجديد
      const { data, error } = await supabase.auth.refreshSession();

      if (error || !data.session) {
        console.error('❌ Failed to refresh session:', error);
        
        // تسجيل خروج آمن
        await supabase.auth.signOut({ scope: 'local' });
        
        return {
          success: false,
          action: 'signed_out',
          message: 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.',
          shouldNotifyUser: true
        };
      }

      console.log('✅ JWT refreshed successfully');
      return {
        success: true,
        action: 'refreshed',
        message: 'تم تجديد الجلسة بنجاح',
        shouldNotifyUser: false
      };

    } catch (refreshError) {
      console.error('❌ Error during JWT refresh:', refreshError);
      return {
        success: false,
        action: 'signed_out',
        message: 'فشل في تجديد الجلسة',
        shouldNotifyUser: true
      };
    }
  }

  /**
   * معالجة الرمز غير الصالح
   */
  private async handleInvalidToken(details: JWTErrorDetails): Promise<JWTErrorHandlingResult> {
    console.log(`🚫 Invalid JWT detected for ${details.userType}`);

    // تنظيف البيانات المحلية
    if (details.userType === 'admin') {
      localStorage.removeItem('admin_session_token');
      localStorage.removeItem('admin_account');
    } else {
      localStorage.removeItem('supabase.auth.token');
      await supabase.auth.signOut({ scope: 'local' });
    }

    return {
      success: false,
      action: 'signed_out',
      message: 'رمز المصادقة غير صالح. يرجى تسجيل الدخول مرة أخرى.',
      shouldNotifyUser: true
    };
  }

  /**
   * معالجة الرمز المفقود
   */
  private async handleMissingToken(details: JWTErrorDetails): Promise<JWTErrorHandlingResult> {
    console.log(`❓ Missing JWT for ${details.userType}`);

    return {
      success: false,
      action: 'signed_out',
      message: 'لم يتم العثور على رمز المصادقة. يرجى تسجيل الدخول.',
      shouldNotifyUser: false // لا نزعج المستخدم إذا لم يكن مسجل دخول أصلاً
    };
  }

  /**
   * معالجة فشل تجديد الرمز
   */
  private async handleRefreshFailed(details: JWTErrorDetails): Promise<JWTErrorHandlingResult> {
    console.log(`🔄❌ Refresh failed for ${details.userType}`);

    // تنظيف شامل
    if (details.userType === 'admin') {
      localStorage.removeItem('admin_session_token');
      localStorage.removeItem('admin_account');
    } else {
      await supabase.auth.signOut({ scope: 'local' });
    }

    return {
      success: false,
      action: 'signed_out',
      message: 'فشل في تجديد الجلسة. يرجى تسجيل الدخول مرة أخرى.',
      shouldNotifyUser: true
    };
  }

  /**
   * معالجة أخطاء الشبكة
   */
  private async handleNetworkError(details: JWTErrorDetails): Promise<JWTErrorHandlingResult> {
    const retryKey = `${details.context}_${details.userType}`;
    const currentRetries = this.retryAttempts.get(retryKey) || 0;

    if (currentRetries < this.maxRetries) {
      this.retryAttempts.set(retryKey, currentRetries + 1);
      
      console.log(`🌐 Network error, retry ${currentRetries + 1}/${this.maxRetries}`);
      
      return {
        success: false,
        action: 'retry',
        message: 'مشكلة في الاتصال. جاري إعادة المحاولة...',
        shouldNotifyUser: false
      };
    } else {
      // تنظيف عدد المحاولات
      this.retryAttempts.delete(retryKey);
      
      return {
        success: false,
        action: 'ignore',
        message: 'مشكلة في الاتصال. يرجى المحاولة لاحقاً.',
        shouldNotifyUser: true
      };
    }
  }

  /**
   * معالجة الأخطاء غير المعروفة
   */
  private async handleUnknownError(details: JWTErrorDetails): Promise<JWTErrorHandlingResult> {
    console.warn(`❓ Unknown JWT error for ${details.userType}:`, details.originalError);

    return {
      success: false,
      action: 'ignore',
      message: 'حدث خطأ غير متوقع',
      shouldNotifyUser: false
    };
  }

  /**
   * تسجيل الخطأ في التاريخ
   */
  private recordError(details: JWTErrorDetails): void {
    this.errorHistory.push(details);
    
    // الحفاظ على حجم التاريخ
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
  }

  /**
   * توليد معرف جلسة فريد
   */
  private generateSessionId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * الحصول على إحصائيات الأخطاء
   */
  getErrorStats(): { [key in JWTErrorType]: number } {
    const stats = Object.values(JWTErrorType).reduce((acc, type) => {
      acc[type] = 0;
      return acc;
    }, {} as { [key in JWTErrorType]: number });

    this.errorHistory.forEach(error => {
      stats[error.type]++;
    });

    return stats;
  }

  /**
   * مسح تاريخ الأخطاء
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
    this.retryAttempts.clear();
  }
}

// إنشاء مثيل واحد للاستخدام العام
export const jwtErrorHandler = new JWTErrorHandler();

// دالة مساعدة للاستخدام السريع
export const handleJWTError = async (
  error: any, 
  context: string, 
  userType: 'regular' | 'admin' = 'regular'
): Promise<JWTErrorHandlingResult> => {
  return await jwtErrorHandler.handleJWTError(error, context, userType);
};
