/**
 * فحص حالة خدمة SMTP
 */

export async function checkSMTPService() {
  console.log('🔍 فحص حالة خدمة SMTP...');
  
  try {
    // فحص خدمة PHP
    const response = await fetch('/test-smtp.php');
    
    if (response.ok) {
      const result = await response.json();
      
      console.log('✅ خدمة PHP تعمل بنجاح!');
      console.log('📊 تفاصيل الخدمة:');
      console.log(`  • إصدار PHP: ${result.php_version}`);
      console.log(`  • PHPMailer متوفر: ${result.phpmailer_available ? 'نعم' : 'لا'}`);
      console.log(`  • دالة mail() متوفرة: ${result.mail_function ? 'نعم' : 'لا'}`);
      console.log(`  • Composer autoload: ${result.composer_autoload.main || result.composer_autoload.alt ? 'نعم' : 'لا'}`);
      console.log('');
      console.log('🌐 إعدادات SMTP:');
      console.log(`  • الخادم: ${result.smtp_config.host}:${result.smtp_config.port}`);
      console.log(`  • الأمان: ${result.smtp_config.secure}`);
      console.log(`  • المستخدم: ${result.smtp_config.user}`);
      console.log('');
      
      if (result.phpmailer_available) {
        console.log('🎉 جميع المتطلبات متوفرة! جاهز للإرسال.');
        return { success: true, details: result };
      } else {
        console.log('⚠️ PHPMailer غير متوفر. سيتم استخدام دالة mail() البسيطة.');
        return { success: true, details: result, warning: 'PHPMailer not available' };
      }
    } else {
      console.log('❌ خدمة PHP غير متاحة');
      console.log(`📊 كود الخطأ: ${response.status}`);
      
      const errorText = await response.text();
      console.log('📝 تفاصيل الخطأ:', errorText);
      
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }
  } catch (error) {
    console.log('💥 خطأ في الاتصال بخدمة PHP:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * اختبار إرسال سريع
 */
export async function quickSMTPSend(email: string = 'kemoamego@gmail.com') {
  console.log('🚀 اختبار إرسال سريع...');
  console.log(`📧 سيتم الإرسال إلى: ${email}`);
  
  try {
    const response = await fetch('/api/send-smtp-email.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: '🚀 اختبار سريع من رزقي',
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; margin: 0 auto;">
            <div style="background: #667eea; color: white; padding: 20px; border-radius: 10px; text-align: center;">
              <h1 style="margin: 0;">🚀 اختبار سريع</h1>
              <p style="margin: 10px 0 0 0;">رزقي - موقع الزواج الإسلامي</p>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 10px; margin-top: 15px; border: 1px solid #ddd;">
              <p style="color: #333; font-size: 16px;">مرحباً!</p>
              <p style="color: #666;">هذا اختبار سريع للتأكد من عمل نظام SMTP المباشر.</p>
              
              <div style="background: #f0f8ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p style="margin: 0; color: #333; font-weight: bold;">✅ النظام يعمل بشكل مثالي!</p>
              </div>
              
              <p style="color: #999; font-size: 12px; margin-top: 20px;">
                تم الإرسال في: ${new Date().toLocaleString('ar-SA')}
              </p>
            </div>
          </div>
        `,
        text: `اختبار سريع من رزقي\n\nمرحباً!\n\nهذا اختبار سريع للتأكد من عمل نظام SMTP المباشر.\n\nالنظام يعمل بشكل مثالي!\n\nتم الإرسال في: ${new Date().toLocaleString('ar-SA')}`,
        smtp_config: {
          host: 'smtp.hostinger.com',
          port: 465,
          secure: true,
          user: 'manage@kareemamged.com',
          pass: 'Kk170404#',
          from: 'رزقي - موقع الزواج الإسلامي <manage@kareemamged.com>'
        }
      })
    });

    if (response.ok) {
      const result = await response.json();
      
      if (result.success) {
        console.log('🎉 نجح الإرسال السريع!');
        console.log(`📧 الطريقة: ${result.method}`);
        console.log(`⏰ الوقت: ${result.timestamp}`);
        console.log(`📬 تحقق من بريدك الإلكتروني: ${email}`);
        console.log('✨ يجب أن تجد إيميل "اختبار سريع من رزقي"');
        
        return { success: true, result };
      } else {
        console.log('❌ فشل الإرسال السريع:', result.error);
        return { success: false, error: result.error };
      }
    } else {
      const errorText = await response.text();
      console.log('❌ خطأ في الخدمة:', errorText);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }
  } catch (error) {
    console.log('💥 خطأ في الاختبار السريع:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * فحص شامل للنظام
 */
export async function fullSMTPCheck(email: string = 'kemoamego@gmail.com') {
  console.log('🔍 بدء فحص شامل لنظام SMTP...');
  console.log('');
  
  // 1. فحص الخدمة
  console.log('1️⃣ فحص خدمة PHP...');
  const serviceCheck = await checkSMTPService();
  console.log('');
  
  // 2. اختبار إرسال سريع
  console.log('2️⃣ اختبار إرسال سريع...');
  const sendTest = await quickSMTPSend(email);
  console.log('');
  
  // النتائج النهائية
  console.log('📊 ملخص الفحص الشامل:');
  console.log(`✅ خدمة PHP: ${serviceCheck.success ? 'تعمل' : 'لا تعمل'}`);
  console.log(`✅ اختبار الإرسال: ${sendTest.success ? 'نجح' : 'فشل'}`);
  
  const allSuccess = serviceCheck.success && sendTest.success;
  
  if (allSuccess) {
    console.log('');
    console.log('🎉 النظام يعمل بشكل مثالي!');
    console.log('✅ جاهز لإرسال جميع أنواع الإيميلات');
    console.log(`📧 من: manage@kareemamged.com`);
    console.log('🌐 عبر: smtp.hostinger.com:465 (SSL)');
  } else {
    console.log('');
    console.log('⚠️ هناك مشاكل في النظام:');
    if (!serviceCheck.success) {
      console.log(`  • خدمة PHP: ${serviceCheck.error}`);
    }
    if (!sendTest.success) {
      console.log(`  • اختبار الإرسال: ${sendTest.error}`);
    }
  }
  
  return {
    success: allSuccess,
    serviceCheck,
    sendTest,
    recommendation: allSuccess ? 'النظام جاهز للاستخدام' : 'يحتاج إصلاح'
  };
}

// إتاحة الدوال في الكونسول
if (typeof window !== 'undefined') {
  (window as any).smtpServiceCheck = {
    checkSMTPService,
    quickSMTPSend,
    fullSMTPCheck
  };

  console.log('🔍 أدوات فحص خدمة SMTP متاحة:');
  console.log('  • smtpServiceCheck.fullSMTPCheck("kemoamego@gmail.com") - فحص شامل');
  console.log('  • smtpServiceCheck.checkSMTPService() - فحص الخدمة فقط');
  console.log('  • smtpServiceCheck.quickSMTPSend("kemoamego@gmail.com") - اختبار إرسال سريع');
}

export {};
