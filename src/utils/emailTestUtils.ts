/**
 * أدوات اختبار نظام الإشعارات البريدية
 * تستخدم لاختبار جميع أنواع الإيميلات في بيئة التطوير
 */

import { AdvancedEmailService } from '../lib/finalEmailService';

export interface EmailTestResult {
  type: string;
  success: boolean;
  error?: string;
  method?: string;
  timestamp: string;
}

/**
 * اختبار إرسال إيميل التحقق
 */
export async function testVerificationEmail(
  email: string = 'test@example.com',
  language: 'ar' | 'en' = 'ar'
): Promise<EmailTestResult> {
  const timestamp = new Date().toISOString();
  
  try {
    const verificationUrl = `${window.location.origin}/verify-email?token=test-token-123`;
    
    const result = await AdvancedEmailService.sendVerificationEmail(
      email,
      verificationUrl,
      { first_name: 'أحمد', last_name: 'محمد' },
      language
    );

    return {
      type: 'verification',
      success: result.success,
      error: result.error,
      method: result.method,
      timestamp
    };
  } catch (error) {
    return {
      type: 'verification',
      success: false,
      error: String(error),
      timestamp
    };
  }
}

/**
 * اختبار إرسال كلمة المرور المؤقتة
 */
export async function testTemporaryPasswordEmail(
  email: string = 'test@example.com',
  language: 'ar' | 'en' = 'ar'
): Promise<EmailTestResult> {
  const timestamp = new Date().toISOString();
  
  try {
    const temporaryPassword = 'TempPass123!';
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    const result = await AdvancedEmailService.sendTemporaryPasswordEmail(
      email,
      temporaryPassword,
      expiresAt,
      'أحمد محمد',
      language
    );

    return {
      type: 'temporary_password',
      success: result.success,
      error: result.error,
      method: result.method,
      timestamp
    };
  } catch (error) {
    return {
      type: 'temporary_password',
      success: false,
      error: String(error),
      timestamp
    };
  }
}

/**
 * اختبار إرسال رمز التحقق الثنائي
 */
export async function test2FACodeEmail(
  email: string = 'test@example.com',
  language: 'ar' | 'en' = 'ar'
): Promise<EmailTestResult> {
  const timestamp = new Date().toISOString();
  
  try {
    const code = '123456';
    
    const result = await AdvancedEmailService.send2FACodeEmail(
      email,
      code,
      'login',
      15,
      language
    );

    return {
      type: '2fa_code',
      success: result.success,
      error: result.error,
      method: result.method,
      timestamp
    };
  } catch (error) {
    return {
      type: '2fa_code',
      success: false,
      error: String(error),
      timestamp
    };
  }
}

/**
 * اختبار إرسال رمز التحقق الإداري
 */
export async function testAdmin2FACodeEmail(
  email: string = 'admin@example.com',
  language: 'ar' | 'en' = 'ar'
): Promise<EmailTestResult> {
  const timestamp = new Date().toISOString();
  
  try {
    const code = '789012';
    
    const result = await AdvancedEmailService.sendAdmin2FACodeEmail(
      email,
      code,
      email,
      10,
      language
    );

    return {
      type: 'admin_2fa',
      success: result.success,
      error: result.error,
      method: result.method,
      timestamp
    };
  } catch (error) {
    return {
      type: 'admin_2fa',
      success: false,
      error: String(error),
      timestamp
    };
  }
}

/**
 * اختبار إرسال تأكيد تغيير الإيميل
 */
export async function testEmailChangeConfirmation(
  email: string = 'test@example.com',
  language: 'ar' | 'en' = 'ar'
): Promise<EmailTestResult> {
  const timestamp = new Date().toISOString();
  
  try {
    const confirmationUrl = `${window.location.origin}/verify-email-change?token=change-token-123`;
    const newEmail = 'newemail@example.com';
    
    const result = await AdvancedEmailService.sendEmailChangeConfirmation(
      email,
      confirmationUrl,
      newEmail,
      email,
      language
    );

    return {
      type: 'email_change_confirmation',
      success: result.success,
      error: result.error,
      method: result.method,
      timestamp
    };
  } catch (error) {
    return {
      type: 'email_change_confirmation',
      success: false,
      error: String(error),
      timestamp
    };
  }
}

/**
 * اختبار إرسال رمز التحقق للأمان
 */
export async function testSecurity2FACodeEmail(
  email: string = 'test@example.com',
  language: 'ar' | 'en' = 'ar'
): Promise<EmailTestResult> {
  const timestamp = new Date().toISOString();
  
  try {
    const code = '456789';
    const action = 'تغيير إعدادات الأمان';
    
    const result = await AdvancedEmailService.sendSecurity2FACodeEmail(
      email,
      code,
      action,
      15,
      language
    );

    return {
      type: 'security_2fa',
      success: result.success,
      error: result.error,
      method: result.method,
      timestamp
    };
  } catch (error) {
    return {
      type: 'security_2fa',
      success: false,
      error: String(error),
      timestamp
    };
  }
}

/**
 * تشغيل جميع الاختبارات
 */
export async function runAllEmailTests(
  email: string = 'test@example.com',
  language: 'ar' | 'en' = 'ar'
): Promise<EmailTestResult[]> {
  console.log('🧪 بدء اختبار جميع أنواع الإيميلات...');
  
  const tests = [
    testVerificationEmail,
    testTemporaryPasswordEmail,
    test2FACodeEmail,
    testAdmin2FACodeEmail,
    testEmailChangeConfirmation,
    testSecurity2FACodeEmail
  ];

  const results: EmailTestResult[] = [];

  for (const test of tests) {
    try {
      const result = await test(email, language);
      results.push(result);
      
      if (result.success) {
        console.log(`✅ ${result.type}: نجح الإرسال عبر ${result.method}`);
      } else {
        console.log(`❌ ${result.type}: فشل - ${result.error}`);
      }
      
      // انتظار قصير بين الاختبارات
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ خطأ في اختبار ${test.name}:`, error);
      results.push({
        type: test.name,
        success: false,
        error: String(error),
        timestamp: new Date().toISOString()
      });
    }
  }

  // عرض ملخص النتائج
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`\n📊 ملخص الاختبارات:`);
  console.log(`✅ نجح: ${successCount}/${totalCount}`);
  console.log(`❌ فشل: ${totalCount - successCount}/${totalCount}`);
  
  if (successCount === totalCount) {
    console.log('🎉 جميع الاختبارات نجحت!');
  } else {
    console.log('⚠️ بعض الاختبارات فشلت، يرجى مراجعة الأخطاء أعلاه');
  }

  return results;
}

// إتاحة الدوال في الكونسول للاختبار اليدوي
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).emailTests = {
    testVerificationEmail,
    testTemporaryPasswordEmail,
    test2FACodeEmail,
    testAdmin2FACodeEmail,
    testEmailChangeConfirmation,
    testSecurity2FACodeEmail,
    runAllEmailTests
  };

  console.log('🧪 أدوات اختبار الإيميلات متاحة في الكونسول:');
  console.log('💡 emailTests.runAllEmailTests("your@email.com", "ar") - تشغيل جميع الاختبارات');
  console.log('💡 emailTests.testVerificationEmail("your@email.com") - اختبار إيميل التحقق');
  console.log('💡 emailTests.test2FACodeEmail("your@email.com") - اختبار رمز التحقق الثنائي');
}
