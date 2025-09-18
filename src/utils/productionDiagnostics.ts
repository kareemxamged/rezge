/**
 * نظام تشخيص مشاكل النشر (Production Diagnostics)
 * يساعد في تحديد وحل مشاكل JWT والاتصال في بيئة الإنتاج
 */

import { supabase } from '../lib/supabase';

export interface DiagnosticResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
  fix?: string;
}

export interface ProductionDiagnostics {
  environment: DiagnosticResult[];
  supabase: DiagnosticResult[];
  jwt: DiagnosticResult[];
  network: DiagnosticResult[];
  storage: DiagnosticResult[];
  overall: 'healthy' | 'issues' | 'critical';
}

class ProductionDiagnosticsService {
  
  /**
   * تشغيل تشخيص شامل للنشر
   */
  async runFullDiagnostics(): Promise<ProductionDiagnostics> {
    console.log('🔍 Running production diagnostics...');
    
    const results: ProductionDiagnostics = {
      environment: await this.checkEnvironment(),
      supabase: await this.checkSupabase(),
      jwt: await this.checkJWT(),
      network: await this.checkNetwork(),
      storage: await this.checkStorage(),
      overall: 'healthy'
    };

    // تحديد الحالة العامة
    const allResults = [
      ...results.environment,
      ...results.supabase,
      ...results.jwt,
      ...results.network,
      ...results.storage
    ];

    const failCount = allResults.filter(r => r.status === 'fail').length;
    const warningCount = allResults.filter(r => r.status === 'warning').length;

    if (failCount > 0) {
      results.overall = 'critical';
    } else if (warningCount > 2) {
      results.overall = 'issues';
    }

    console.log(`🔍 Diagnostics complete: ${results.overall}`);
    return results;
  }

  /**
   * فحص متغيرات البيئة
   */
  private async checkEnvironment(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];

    // فحص متغيرات Supabase
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    results.push({
      test: 'Supabase URL',
      status: supabaseUrl ? 'pass' : 'fail',
      message: supabaseUrl ? 'متوفر' : 'غير متوفر',
      details: supabaseUrl ? { url: supabaseUrl.substring(0, 30) + '...' } : null,
      fix: !supabaseUrl ? 'تأكد من وجود VITE_SUPABASE_URL في متغيرات البيئة' : undefined
    });

    results.push({
      test: 'Supabase Anon Key',
      status: supabaseKey ? 'pass' : 'fail',
      message: supabaseKey ? 'متوفر' : 'غير متوفر',
      details: supabaseKey ? { keyLength: supabaseKey.length } : null,
      fix: !supabaseKey ? 'تأكد من وجود VITE_SUPABASE_ANON_KEY في متغيرات البيئة' : undefined
    });

    // فحص البيئة الحالية
    const isDev = import.meta.env.DEV;
    const isProd = import.meta.env.PROD;

    results.push({
      test: 'Environment Mode',
      status: 'pass',
      message: isDev ? 'Development' : isProd ? 'Production' : 'Unknown',
      details: { 
        DEV: isDev, 
        PROD: isProd,
        MODE: import.meta.env.MODE 
      }
    });

    return results;
  }

  /**
   * فحص اتصال Supabase
   */
  private async checkSupabase(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];

    try {
      // فحص الاتصال الأساسي
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      const responseTime = Date.now() - startTime;

      if (error) {
        results.push({
          test: 'Supabase Connection',
          status: 'fail',
          message: 'فشل الاتصال',
          details: { error: error.message, code: error.code },
          fix: 'تحقق من إعدادات Supabase وحالة الخدمة'
        });
      } else {
        results.push({
          test: 'Supabase Connection',
          status: responseTime > 5000 ? 'warning' : 'pass',
          message: `متصل (${responseTime}ms)`,
          details: { responseTime, hasData: !!data }
        });
      }

      // فحص RLS policies
      const { error: rlsError } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      results.push({
        test: 'RLS Policies',
        status: rlsError ? 'warning' : 'pass',
        message: rlsError ? 'مشكلة في السياسات' : 'تعمل بشكل صحيح',
        details: rlsError ? { error: rlsError.message } : null,
        fix: rlsError ? 'تحقق من إعدادات RLS في Supabase Dashboard' : undefined
      });

    } catch (error) {
      results.push({
        test: 'Supabase Connection',
        status: 'fail',
        message: 'خطأ في الاتصال',
        details: { error: error.message },
        fix: 'تحقق من إعدادات الشبكة و CORS'
      });
    }

    return results;
  }

  /**
   * فحص JWT والمصادقة
   */
  private async checkJWT(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];

    try {
      // فحص الجلسة الحالية
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        results.push({
          test: 'JWT Session Check',
          status: 'fail',
          message: 'خطأ في فحص الجلسة',
          details: { error: error.message },
          fix: 'مسح localStorage وإعادة تسجيل الدخول'
        });
      } else if (session) {
        // فحص انتهاء الصلاحية
        const expiresAt = session.expires_at;
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiresAt ? expiresAt - now : 0;

        results.push({
          test: 'JWT Session Status',
          status: timeUntilExpiry > 300 ? 'pass' : 'warning',
          message: session ? `نشط (${Math.floor(timeUntilExpiry / 60)} دقيقة متبقية)` : 'غير نشط',
          details: { 
            expiresAt: new Date(expiresAt * 1000).toISOString(),
            timeUntilExpiry,
            userId: session.user?.id 
          }
        });

        // فحص refresh token
        results.push({
          test: 'Refresh Token',
          status: session.refresh_token ? 'pass' : 'fail',
          message: session.refresh_token ? 'متوفر' : 'غير متوفر',
          details: { hasRefreshToken: !!session.refresh_token },
          fix: !session.refresh_token ? 'إعادة تسجيل الدخول مطلوبة' : undefined
        });
      } else {
        results.push({
          test: 'JWT Session Status',
          status: 'warning',
          message: 'لا توجد جلسة نشطة',
          details: { session: null }
        });
      }

      // فحص localStorage للرموز
      const storedToken = localStorage.getItem('supabase.auth.token');
      results.push({
        test: 'Local Storage Token',
        status: storedToken ? 'pass' : 'warning',
        message: storedToken ? 'موجود' : 'غير موجود',
        details: { hasStoredToken: !!storedToken }
      });

    } catch (error) {
      results.push({
        test: 'JWT System',
        status: 'fail',
        message: 'خطأ في نظام JWT',
        details: { error: error.message },
        fix: 'مسح جميع بيانات المتصفح وإعادة تسجيل الدخول'
      });
    }

    return results;
  }

  /**
   * فحص الشبكة والاتصال
   */
  private async checkNetwork(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];

    try {
      // فحص الاتصال بالإنترنت
      const onlineStatus = navigator.onLine;
      results.push({
        test: 'Internet Connection',
        status: onlineStatus ? 'pass' : 'fail',
        message: onlineStatus ? 'متصل' : 'غير متصل',
        details: { online: onlineStatus }
      });

      // فحص CORS
      const corsTest = await fetch(import.meta.env.VITE_SUPABASE_URL + '/rest/v1/', {
        method: 'HEAD',
        mode: 'cors'
      });

      results.push({
        test: 'CORS Configuration',
        status: corsTest.ok ? 'pass' : 'warning',
        message: corsTest.ok ? 'يعمل بشكل صحيح' : 'مشكلة محتملة',
        details: { status: corsTest.status, statusText: corsTest.statusText }
      });

    } catch (error) {
      results.push({
        test: 'Network Connectivity',
        status: 'fail',
        message: 'مشكلة في الاتصال',
        details: { error: error.message },
        fix: 'تحقق من اتصال الإنترنت وإعدادات الشبكة'
      });
    }

    return results;
  }

  /**
   * فحص التخزين المحلي
   */
  private async checkStorage(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];

    try {
      // فحص localStorage
      const testKey = 'diagnostic_test';
      const testValue = 'test_value';
      
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);

      results.push({
        test: 'Local Storage',
        status: retrieved === testValue ? 'pass' : 'fail',
        message: retrieved === testValue ? 'يعمل بشكل صحيح' : 'لا يعمل',
        details: { canWrite: true, canRead: retrieved === testValue }
      });

      // فحص حجم البيانات المخزنة
      let totalSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length;
        }
      }

      results.push({
        test: 'Storage Usage',
        status: totalSize > 5000000 ? 'warning' : 'pass', // 5MB
        message: `${Math.round(totalSize / 1024)} KB مستخدم`,
        details: { totalSize, itemCount: localStorage.length },
        fix: totalSize > 5000000 ? 'مسح البيانات غير المهمة من localStorage' : undefined
      });

      // فحص البيانات المهمة
      const importantKeys = [
        'supabase.auth.token',
        'admin_session_token',
        'admin_account'
      ];

      importantKeys.forEach(key => {
        const exists = localStorage.getItem(key) !== null;
        results.push({
          test: `Storage Key: ${key}`,
          status: 'pass', // مجرد معلومات
          message: exists ? 'موجود' : 'غير موجود',
          details: { key, exists }
        });
      });

    } catch (error) {
      results.push({
        test: 'Storage System',
        status: 'fail',
        message: 'خطأ في نظام التخزين',
        details: { error: error.message },
        fix: 'تحقق من إعدادات المتصفح للتخزين المحلي'
      });
    }

    return results;
  }

  /**
   * إصلاح تلقائي للمشاكل الشائعة
   */
  async autoFix(): Promise<{ fixed: string[], failed: string[] }> {
    const fixed: string[] = [];
    const failed: string[] = [];

    try {
      // مسح البيانات التالفة
      const corruptedKeys = [];
      for (let key in localStorage) {
        if (key.includes('supabase') || key.includes('admin')) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              // تجاهل مفاتيح المشرفين التي لا تحتاج لتحليل JSON
              if (key === 'admin_session_token' || key === 'device_id') {
                continue; // لا تختبر هذه المفاتيح
              }
              JSON.parse(value); // اختبار صحة JSON
            }
          } catch {
            // لا تحذف مفاتيح المشرفين حتى لو فشل تحليل JSON
            if (key !== 'admin_session_token' && key !== 'device_id') {
              corruptedKeys.push(key);
            }
          }
        }
      }

      corruptedKeys.forEach(key => {
        localStorage.removeItem(key);
        fixed.push(`Removed corrupted key: ${key}`);
      });

      // تجديد الجلسة إذا كانت قريبة من الانتهاء
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.expires_at) {
        const timeUntilExpiry = session.expires_at - Math.floor(Date.now() / 1000);
        if (timeUntilExpiry < 600) { // أقل من 10 دقائق
          const { error } = await supabase.auth.refreshSession();
          if (!error) {
            fixed.push('Session refreshed successfully');
          } else {
            failed.push('Failed to refresh session');
          }
        }
      }

      console.log('🔧 Auto-fix completed:', { fixed, failed });
      
    } catch (error) {
      failed.push(`Auto-fix error: ${error.message}`);
    }

    return { fixed, failed };
  }
}

// إنشاء مثيل للاستخدام
export const productionDiagnostics = new ProductionDiagnosticsService();

// دالة سريعة للتشخيص
export const runQuickDiagnostics = async (): Promise<void> => {
  const results = await productionDiagnostics.runFullDiagnostics();
  
  console.group('🔍 Production Diagnostics Results');
  console.log('Overall Status:', results.overall);
  
  Object.entries(results).forEach(([category, tests]) => {
    if (Array.isArray(tests)) {
      console.group(`📋 ${category.toUpperCase()}`);
      tests.forEach(test => {
        const icon = test.status === 'pass' ? '✅' : test.status === 'warning' ? '⚠️' : '❌';
        console.log(`${icon} ${test.test}: ${test.message}`);
        if (test.fix) {
          console.log(`   💡 Fix: ${test.fix}`);
        }
      });
      console.groupEnd();
    }
  });
  
  console.groupEnd();
  
  // تشغيل الإصلاح التلقائي إذا كانت هناك مشاكل
  if (results.overall !== 'healthy') {
    console.log('🔧 Running auto-fix...');
    const fixResults = await productionDiagnostics.autoFix();
    console.log('🔧 Auto-fix results:', fixResults);
  }
};
