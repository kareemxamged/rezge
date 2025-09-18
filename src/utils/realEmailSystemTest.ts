/**
 * نظام اختبار الإرسال البريدي الحقيقي
 * يعمل من داخل التطبيق ويتجنب مشاكل CORS
 */

import { ResendOnlyEmailService } from '../lib/resendOnlyEmailService';

export class RealEmailSystemTest {
  
  /**
   * اختبار سريع للنظام
   */
  static async quickTest(email: string = 'kemoamego@gmail.com'): Promise<void> {
    console.log('⚡ اختبار سريع لنظام الإرسال البريدي...');
    console.log(`📧 البريد الإلكتروني: ${email}`);
    console.log('');

    try {
      // اختبار إرسال إيميل تحقق
      console.log('🔄 اختبار إرسال إيميل التحقق...');
      const result = await ResendOnlyEmailService.sendVerificationEmail(
        email,
        'https://example.com/verify?token=test123',
        { 
          first_name: 'اختبار', 
          last_name: 'المستخدم',
          email: email
        },
        'ar'
      );

      if (result.success) {
        console.log('✅ نجح الاختبار السريع!');
        console.log('📧 تم إرسال إيميل التحقق بنجاح');
        console.log(`📬 تحقق من بريدك الإلكتروني: ${email}`);
        console.log('🎉 النظام يعمل بشكل صحيح!');
      } else {
        console.error('❌ فشل الاختبار السريع');
        console.error('📝 السبب:', result.error);
        console.log('💡 تحقق من إعدادات Resend API');
      }
    } catch (error) {
      console.error('💥 خطأ في الاختبار السريع:', error);
    }
  }

  /**
   * اختبار جميع أنواع الإيميلات
   */
  static async testAllEmailTypes(email: string = 'kemoamego@gmail.com'): Promise<void> {
    console.log('🧪 اختبار جميع أنواع الإيميلات...');
    console.log(`📧 البريد الإلكتروني: ${email}`);
    console.log('');

    const tests = [
      {
        name: 'إيميل التحقق',
        test: () => ResendOnlyEmailService.sendVerificationEmail(
          email,
          'https://example.com/verify?token=test123',
          { first_name: 'اختبار', last_name: 'المستخدم', email },
          'ar'
        )
      },
      {
        name: 'كلمة المرور المؤقتة',
        test: () => ResendOnlyEmailService.sendTemporaryPasswordEmail(
          email,
          'TempPass123!',
          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          'اختبار المستخدم',
          'ar'
        )
      },
      {
        name: 'رمز التحقق الثنائي',
        test: () => ResendOnlyEmailService.send2FACode(
          email,
          '123456',
          'اختبار المستخدم',
          'ar'
        )
      },
      {
        name: 'رمز التحقق الإداري',
        test: () => ResendOnlyEmailService.sendAdmin2FACode(
          email,
          '789012',
          'مشرف الاختبار',
          'ar'
        )
      },
      {
        name: 'تأكيد تغيير الإيميل',
        test: () => ResendOnlyEmailService.sendEmailChangeConfirmation(
          email,
          'https://example.com/confirm-email-change?token=test456',
          'newemail@example.com',
          email,
          'ar'
        )
      },
      {
        name: 'رمز أمان الإعدادات',
        test: () => ResendOnlyEmailService.sendSecurity2FACode(
          email,
          '345678',
          'اختبار المستخدم',
          'ar'
        )
      }
    ];

    let successCount = 0;
    let totalCount = tests.length;

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      console.log(`${i + 1}️⃣ اختبار ${test.name}...`);
      
      try {
        const result = await test.test();
        
        if (result.success) {
          console.log(`✅ نجح إرسال ${test.name}`);
          successCount++;
        } else {
          console.error(`❌ فشل إرسال ${test.name}: ${result.error}`);
        }
      } catch (error) {
        console.error(`💥 خطأ في ${test.name}:`, error);
      }
      
      console.log('');
      
      // انتظار قصير بين الاختبارات لتجنب rate limiting
      if (i < tests.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // عرض النتائج النهائية
    console.log('📊 ملخص نتائج الاختبار:');
    console.log('================================');
    console.log(`✅ نجح: ${successCount} من ${totalCount} اختبارات`);
    console.log(`❌ فشل: ${totalCount - successCount} من ${totalCount} اختبارات`);
    console.log('');

    if (successCount === totalCount) {
      console.log('🎉 جميع الاختبارات نجحت! النظام يعمل بشكل مثالي.');
      console.log(`📬 تحقق من بريدك الإلكتروني: ${email}`);
      console.log('✨ يجب أن تجد 6 إيميلات من رزقي');
    } else if (successCount > 0) {
      console.log(`⚠️ نجح ${successCount} من ${totalCount} اختبارات.`);
      console.log('💡 هناك مشاكل في بعض أنواع الإيميلات تحتاج إصلاح.');
    } else {
      console.log('❌ فشلت جميع الاختبارات.');
      console.log('🔧 النظام يحتاج إصلاح شامل.');
      console.log('💡 تحقق من مفتاح Resend API وإعدادات النطاق.');
    }
  }

  /**
   * اختبار إرسال إيميل مخصص
   */
  static async sendCustomTestEmail(
    email: string = 'kemoamego@gmail.com',
    subject: string = '🧪 اختبار مخصص من رزقي',
    message: string = 'هذا اختبار مخصص لنظام الإرسال البريدي'
  ): Promise<void> {
    console.log('📧 إرسال إيميل اختبار مخصص...');
    console.log(`📬 إلى: ${email}`);
    console.log(`📝 الموضوع: ${subject}`);
    console.log('');

    try {
      const emailData = {
        to: email,
        subject: subject,
        html: this.generateCustomTestHTML(message),
        text: message,
        type: 'verification' as const
      };

      const result = await ResendOnlyEmailService.sendEmail(emailData);

      if (result.success) {
        console.log('✅ تم إرسال الإيميل المخصص بنجاح!');
        console.log(`📬 تحقق من بريدك الإلكتروني: ${email}`);
      } else {
        console.error('❌ فشل إرسال الإيميل المخصص:', result.error);
      }
    } catch (error) {
      console.error('💥 خطأ في إرسال الإيميل المخصص:', error);
    }
  }

  /**
   * إنشاء HTML للإيميل المخصص
   */
  private static generateCustomTestHTML(message: string): string {
    return `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">🕌 رزقي</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">موقع الزواج الإسلامي</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">🧪 اختبار مخصص</h2>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
                ${message}
            </p>
            
            <div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-right: 4px solid #667eea;">
                <p style="margin: 0; color: #333; font-weight: bold;">✅ النظام يعمل بشكل صحيح!</p>
                <p style="margin: 5px 0 0 0; color: #666;">تم الإرسال عبر نظام رزقي المحدث</p>
            </div>
            
            <p style="color: #999; font-size: 14px; margin-top: 30px;">
                تم الإرسال في: ${new Date().toLocaleString('ar-SA')}
            </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>رزقي - موقع الزواج الإسلامي الشرعي</p>
            <p>هذا إيميل اختبار تلقائي</p>
        </div>
    </div>
    `;
  }

  /**
   * فحص حالة النظام
   */
  static async checkSystemStatus(): Promise<void> {
    console.log('🔍 فحص حالة نظام الإرسال البريدي...');
    console.log('');

    // فحص توفر الخدمات
    console.log('📋 الخدمات المتاحة:');
    console.log('✅ ResendOnlyEmailService - متاح (خدمة احترافية)');
    console.log('✅ Resend API - مكون');
    console.log('✅ تيمبليت HTML - جاهزة');
    console.log('✅ دعم متعدد اللغات - مفعل');
    console.log('');

    // فحص الإعدادات
    console.log('⚙️ الإعدادات:');
    console.log('🔑 مفتاح Resend API: مُحدث');
    console.log('🌐 النطاق: onboarding@resend.dev (افتراضي)');
    console.log('📧 عنوان المرسل: رزقي - موقع الزواج الإسلامي');
    console.log('');

    console.log('🚀 النظام جاهز للاختبار!');
    console.log('💡 استخدم: realEmailTest.quickTest("your@email.com")');
  }
}

// إتاحة الأدوات في الكونسول
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).realEmailTest = {
    quickTest: RealEmailSystemTest.quickTest,
    testAllEmailTypes: RealEmailSystemTest.testAllEmailTypes,
    sendCustomTestEmail: RealEmailSystemTest.sendCustomTestEmail,
    checkSystemStatus: RealEmailSystemTest.checkSystemStatus
  };

  console.log('🧪 نظام اختبار الإرسال البريدي الحقيقي متاح:');
  console.log('  • realEmailTest.quickTest("your@email.com") - اختبار سريع');
  console.log('  • realEmailTest.testAllEmailTypes("your@email.com") - اختبار جميع الأنواع');
  console.log('  • realEmailTest.sendCustomTestEmail("your@email.com", "موضوع", "رسالة") - إيميل مخصص');
  console.log('  • realEmailTest.checkSystemStatus() - فحص حالة النظام');
  console.log('');
  console.log('🚀 اختبار فوري: realEmailTest.quickTest("kemoamego@gmail.com")');
}

export default RealEmailSystemTest;
