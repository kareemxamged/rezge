/**
 * اختبار سريع للإرسال الفعلي للإيميلات
 * يستخدم الخدمات الحقيقية المضمونة
 */

import { AdvancedEmailService } from '../lib/finalEmailService';

/**
 * اختبار سريع لإرسال إيميل تحقق فعلي
 */
export async function testRealEmailSending(email: string = 'kemoamego@gmail.com') {
  console.log('🚀 بدء اختبار الإرسال الفعلي...');
  console.log(`📧 سيتم الإرسال إلى: ${email}`);
  
  try {
    // إنشاء بيانات اختبار
    const verificationUrl = `${window.location.origin}/verify-email?token=test-${Date.now()}`;
    const userData = {
      first_name: 'أحمد',
      last_name: 'محمد'
    };

    // إرسال إيميل التحقق
    const result = await AdvancedEmailService.sendVerificationEmail(
      email,
      verificationUrl,
      userData,
      'ar'
    );

    if (result.success) {
      console.log('✅ نجح الإرسال الفعلي!');
      console.log(`📬 تحقق من بريدك الإلكتروني: ${email}`);
      console.log('🎉 يجب أن تجد إيميل "تأكيد إنشاء حسابك في رزقي"');
      
      return {
        success: true,
        message: 'تم إرسال الإيميل بنجاح! تحقق من صندوق الوارد.',
        email: email
      };
    } else {
      console.log('❌ فشل الإرسال:', result.error);
      return {
        success: false,
        error: result.error,
        email: email
      };
    }
  } catch (error) {
    console.error('💥 خطأ في الاختبار:', error);
    return {
      success: false,
      error: String(error),
      email: email
    };
  }
}

/**
 * اختبار إرسال رمز 2FA فعلي
 */
export async function testReal2FAEmail(email: string = 'kemoamego@gmail.com') {
  console.log('🔐 بدء اختبار إرسال رمز 2FA فعلي...');
  
  try {
    const result = await AdvancedEmailService.send2FACodeEmail(
      email,
      '123456',
      'login',
      15,
      'ar'
    );

    if (result.success) {
      console.log('✅ نجح إرسال رمز 2FA!');
      console.log(`📬 تحقق من بريدك الإلكتروني: ${email}`);
      console.log('🔐 يجب أن تجد إيميل "رمز التحقق الثنائي - رزقي"');
      
      return {
        success: true,
        message: 'تم إرسال رمز 2FA بنجاح!',
        email: email
      };
    } else {
      console.log('❌ فشل إرسال رمز 2FA:', result.error);
      return {
        success: false,
        error: result.error,
        email: email
      };
    }
  } catch (error) {
    console.error('💥 خطأ في اختبار 2FA:', error);
    return {
      success: false,
      error: String(error),
      email: email
    };
  }
}

/**
 * اختبار شامل لجميع أنواع الإيميلات
 */
export async function testAllRealEmails(email: string = 'kemoamego@gmail.com') {
  console.log('🧪 بدء اختبار شامل للإرسال الفعلي...');
  console.log(`📧 سيتم الإرسال إلى: ${email}`);
  
  const results = [];
  
  try {
    // 1. اختبار إيميل التحقق
    console.log('\n1️⃣ اختبار إيميل التحقق...');
    const verificationResult = await testRealEmailSending(email);
    results.push({ type: 'verification', ...verificationResult });
    
    // انتظار قصير بين الإرسالات
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 2. اختبار رمز 2FA
    console.log('\n2️⃣ اختبار رمز 2FA...');
    const twoFAResult = await testReal2FAEmail(email);
    results.push({ type: '2fa', ...twoFAResult });
    
    // انتظار قصير
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. اختبار كلمة المرور المؤقتة
    console.log('\n3️⃣ اختبار كلمة المرور المؤقتة...');
    const tempPasswordResult = await AdvancedEmailService.sendTemporaryPasswordEmail(
      email,
      'TempPass123!',
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      'أحمد محمد',
      'ar'
    );
    results.push({ type: 'temporary_password', success: tempPasswordResult.success, error: tempPasswordResult.error });
    
    // عرض النتائج النهائية
    console.log('\n📊 ملخص نتائج الاختبار الشامل:');
    const successful = results.filter(r => r.success).length;
    const total = results.length;
    
    console.log(`✅ نجح: ${successful}/${total}`);
    console.log(`❌ فشل: ${total - successful}/${total}`);
    
    if (successful === total) {
      console.log('🎉 جميع الاختبارات نجحت! تحقق من بريدك الإلكتروني.');
    } else {
      console.log('⚠️ بعض الاختبارات فشلت. راجع التفاصيل أعلاه.');
    }
    
    return {
      success: successful === total,
      results: results,
      summary: `${successful}/${total} نجح`
    };
    
  } catch (error) {
    console.error('💥 خطأ في الاختبار الشامل:', error);
    return {
      success: false,
      error: String(error),
      results: results
    };
  }
}

// إتاحة الدوال في الكونسول
if (typeof window !== 'undefined') {
  (window as any).realEmailTests = {
    testRealEmailSending,
    testReal2FAEmail,
    testAllRealEmails
  };

  // إضافة اختبار مضمون لإعادة تعيين كلمة المرور
  (window as any).testGuaranteedPasswordReset = async function(email = 'moxamgad@gmail.com') {
    console.log('🎯 بدء اختبار إعادة تعيين كلمة المرور المضمون...');
    console.log(`📧 سيتم الإرسال إلى: ${email}`);
    console.log('⚠️ هذا اختبار حقيقي - ستصلك إيميل فعلي!');
    console.log('');

    try {
      const { WorkingEmailService } = await import('../lib/workingEmailService');

      const emailData = {
        to: email,
        subject: '🔑 إعادة تعيين كلمة المرور - رزقي',
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #dc3545;">🔑 إعادة تعيين كلمة المرور</h1>
            <p>تم طلب إعادة تعيين كلمة المرور لحسابك في موقع رزقي.</p>
            <div style="background: #f8d7da; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <h2 style="color: #721c24;">كلمة المرور المؤقتة: TEMP123456</h2>
            </div>
            <p>استخدم هذه كلمة المرور للدخول، ثم قم بتغييرها فوراً.</p>
            <a href="https://rezge.com/temporary-password-login" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">تسجيل الدخول</a>
            <p>تم الإرسال في: ${new Date().toLocaleString('ar-SA')}</p>
          </div>
        `,
        text: `إعادة تعيين كلمة المرور - رزقي\n\nتم طلب إعادة تعيين كلمة المرور لحسابك.\n\nكلمة المرور المؤقتة: TEMP123456\n\nاستخدم هذه كلمة المرور للدخول، ثم قم بتغييرها فوراً.\n\nرابط تسجيل الدخول: https://rezge.com/temporary-password-login\n\nتم الإرسال في: ${new Date().toLocaleString('ar-SA')}`,
        type: 'password-reset'
      };

      console.log('🎯 إرسال إيميل إعادة تعيين كلمة المرور...');
      const result = await WorkingEmailService.sendGuaranteedEmail(emailData);

      if (result.success) {
        console.log('🎉 نجح إرسال إيميل إعادة تعيين كلمة المرور!');
        console.log(`📧 الطريقة: ${result.method}`);
        console.log(`📬 تحقق من بريدك الإلكتروني: ${email}`);
        console.log('✨ يجب أن تجد إيميل "إعادة تعيين كلمة المرور - رزقي"');
        console.log('🔑 كلمة المرور المؤقتة: TEMP123456');
      } else {
        console.log('❌ فشل إرسال إيميل إعادة تعيين كلمة المرور:', result.error);
      }

    } catch (error) {
      console.log('❌ خطأ في اختبار إعادة تعيين كلمة المرور:', error);
    }
  };

  console.log('🔥 أدوات الاختبار الفعلي متاحة:');
  console.log('  • testGuaranteedPasswordReset("moxamgad@gmail.com") - اختبار مضمون لإعادة التعيين');
  console.log('  • realEmailTests.testRealEmailSending("kemoamego@gmail.com")');
  console.log('  • realEmailTests.testReal2FAEmail("kemoamego@gmail.com")');
  console.log('  • realEmailTests.testAllRealEmails("kemoamego@gmail.com")');
  console.log('');
  console.log('🚀 اختبار سريع: testGuaranteedPasswordReset("moxamgad@gmail.com")');
}

export {};
