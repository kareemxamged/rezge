/**
 * اختبار خدمة Web SMTP (بديل PHP)
 */

/**
 * اختبار شامل لخدمة Web SMTP
 */
export async function testWebSMTP(email: string = 'kemoamego@gmail.com') {
  console.log('🌐 بدء اختبار خدمة Web SMTP...');
  console.log(`📧 سيتم الإرسال إلى: ${email}`);
  console.log('');

  try {
    // استيراد خدمة Web SMTP
    const { WebSMTPService } = await import('../lib/nodemailerSMTP');
    
    // اختبار الخدمة
    const result = await WebSMTPService.testService(email);
    
    if (result.success) {
      console.log('');
      console.log('🎉 خدمة Web SMTP تعمل بنجاح!');
      console.log('✅ يمكن استخدامها كبديل لـ PHP');
      console.log(`📬 تحقق من بريدك الإلكتروني: ${email}`);
      
      // عرض الخدمات الناجحة
      const successfulServices = result.results.filter(r => r.success);
      if (successfulServices.length > 0) {
        console.log('');
        console.log('🔥 الخدمات المتاحة:');
        successfulServices.forEach(service => {
          console.log(`  • ${service.service} ✅`);
        });
      }
    } else {
      console.log('');
      console.log('❌ جميع خدمات Web SMTP فشلت');
      console.log('💡 قد تحتاج لإعداد مفاتيح API للخدمات الخارجية');
    }
    
    return result;
    
  } catch (error) {
    console.error('💥 خطأ في اختبار Web SMTP:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * اختبار إرسال إيميل واحد عبر Web SMTP
 */
export async function sendTestEmailViaWeb(email: string = 'kemoamego@gmail.com') {
  console.log('📧 إرسال إيميل تجريبي عبر Web SMTP...');
  
  try {
    const { WebSMTPService } = await import('../lib/nodemailerSMTP');
    
    const testEmail = {
      to: email,
      subject: '🌐 اختبار Web SMTP - رزقي',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 32px;">🌐 Web SMTP</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">رزقي - موقع الزواج الإسلامي</p>
          </div>
          
          <div style="background: white; padding: 40px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0; text-align: center;">🎉 نجح الإرسال عبر Web SMTP!</h2>
            
            <p style="color: #666; line-height: 1.8; font-size: 16px;">
              مرحباً! هذا إيميل تجريبي تم إرساله عبر خدمة Web SMTP كبديل لـ PHP.
            </p>
            
            <div style="background: #d4edda; padding: 25px; border-radius: 10px; margin: 25px 0; border-right: 5px solid #28a745;">
              <h3 style="margin: 0 0 15px 0; color: #155724;">✨ مزايا Web SMTP:</h3>
              <ul style="margin: 0; padding-right: 20px; color: #155724;">
                <li style="margin-bottom: 8px;">🚀 يعمل مع أي خادم ويب</li>
                <li style="margin-bottom: 8px;">🔧 لا يحتاج PHP أو خادم خاص</li>
                <li style="margin-bottom: 8px;">🌐 يستخدم خدمات ويب مجانية</li>
                <li style="margin-bottom: 8px;">⚡ سريع وموثوق</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://rezge.com" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                🏠 العودة لرزقي
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
              تم الإرسال عبر Web SMTP في: ${new Date().toLocaleString('ar-SA')}
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>رزقي - موقع الزواج الإسلامي الشرعي</p>
            <p>نظام إشعارات متطور وموثوق 💚</p>
          </div>
        </div>
      `,
      text: `اختبار Web SMTP - رزقي\n\nمرحباً! هذا إيميل تجريبي تم إرساله عبر خدمة Web SMTP كبديل لـ PHP.\n\nمزايا Web SMTP:\n- يعمل مع أي خادم ويب\n- لا يحتاج PHP أو خادم خاص\n- يستخدم خدمات ويب مجانية\n- سريع وموثوق\n\nتم الإرسال في: ${new Date().toLocaleString('ar-SA')}\n\nرزقي - موقع الزواج الإسلامي الشرعي`,
      type: 'test'
    };
    
    const result = await WebSMTPService.sendEmail(testEmail);
    
    if (result.success) {
      console.log('🎉 نجح إرسال الإيميل التجريبي!');
      console.log(`📧 الطريقة: ${result.method}`);
      console.log(`📬 تحقق من بريدك الإلكتروني: ${email}`);
      console.log('✨ يجب أن تجد إيميل "اختبار Web SMTP - رزقي"');
    } else {
      console.log('❌ فشل إرسال الإيميل التجريبي:', result.error);
    }
    
    return result;
    
  } catch (error) {
    console.error('💥 خطأ في إرسال الإيميل التجريبي:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * اختبار النظام الكامل مع Web SMTP
 */
export async function testFullSystemWithWebSMTP(email: string = 'kemoamego@gmail.com') {
  console.log('🔄 اختبار النظام الكامل مع Web SMTP...');
  console.log(`📧 سيتم الإرسال إلى: ${email}`);
  console.log('');

  try {
    // استيراد خدمة الإيميل الرئيسية
    const { AdvancedEmailService } = await import('../lib/finalEmailService');
    
    // اختبار إرسال إيميل تحقق
    console.log('1️⃣ اختبار إيميل التحقق...');
    const verificationResult = await AdvancedEmailService.sendVerificationEmail(
      email,
      'https://example.com/verify?token=test123',
      { first_name: 'أحمد', last_name: 'محمد' },
      'ar'
    );
    
    if (verificationResult.success) {
      console.log('✅ نجح إرسال إيميل التحقق');
      console.log(`📧 الطريقة: ${verificationResult.method}`);
    } else {
      console.log('❌ فشل إرسال إيميل التحقق:', verificationResult.error);
    }
    
    // اختبار إرسال رمز 2FA
    console.log('');
    console.log('2️⃣ اختبار رمز 2FA...');
    const twoFAResult = await AdvancedEmailService.send2FACodeEmail(
      email,
      '123456',
      'login',
      15,
      'ar'
    );
    
    if (twoFAResult.success) {
      console.log('✅ نجح إرسال رمز 2FA');
      console.log(`📧 الطريقة: ${twoFAResult.method}`);
    } else {
      console.log('❌ فشل إرسال رمز 2FA:', twoFAResult.error);
    }
    
    // النتائج النهائية
    console.log('');
    console.log('📊 ملخص اختبار النظام الكامل:');
    console.log(`✅ إيميل التحقق: ${verificationResult.success ? 'نجح' : 'فشل'}`);
    console.log(`✅ رمز 2FA: ${twoFAResult.success ? 'نجح' : 'فشل'}`);
    
    const allSuccess = verificationResult.success && twoFAResult.success;
    
    if (allSuccess) {
      console.log('');
      console.log('🎉 النظام الكامل يعمل مع Web SMTP!');
      console.log(`📬 تحقق من بريدك الإلكتروني: ${email}`);
      console.log('✨ يجب أن تجد إيميلين من رزقي');
    } else {
      console.log('');
      console.log('⚠️ بعض الاختبارات فشلت');
    }
    
    return {
      success: allSuccess,
      results: {
        verification: verificationResult,
        twoFA: twoFAResult
      }
    };
    
  } catch (error) {
    console.error('💥 خطأ في اختبار النظام الكامل:', error);
    return { success: false, error: String(error) };
  }
}

// إتاحة الدوال في الكونسول
if (typeof window !== 'undefined') {
  (window as any).webSMTPTests = {
    testWebSMTP,
    sendTestEmailViaWeb,
    testFullSystemWithWebSMTP
  };

  console.log('🌐 أدوات اختبار Web SMTP متاحة:');
  console.log('  • webSMTPTests.testWebSMTP("kemoamego@gmail.com") - اختبار شامل للخدمة');
  console.log('  • webSMTPTests.sendTestEmailViaWeb("kemoamego@gmail.com") - إرسال إيميل تجريبي');
  console.log('  • webSMTPTests.testFullSystemWithWebSMTP("kemoamego@gmail.com") - اختبار النظام الكامل');
}

export {};
