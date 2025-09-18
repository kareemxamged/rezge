/**
 * اختبار فوري لـ SMTP مع الإعدادات الصحيحة
 */

// إعدادات SMTP الصحيحة
const SMTP_CONFIG = {
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  user: 'manage@kareemamged.com',
  pass: 'Kk170404#',
  from: 'رزقي - موقع الزواج الإسلامي <manage@kareemamged.com>'
};

/**
 * اختبار فوري مع الإعدادات الصحيحة
 */
export async function instantSMTPTest(email: string = 'kemoamego@gmail.com') {
  console.log('🚀 بدء اختبار SMTP فوري مع الإعدادات الصحيحة...');
  console.log(`📧 سيتم الإرسال إلى: ${email}`);
  console.log(`🌐 الخادم: ${SMTP_CONFIG.host}:${SMTP_CONFIG.port}`);
  console.log(`👤 المرسل: ${SMTP_CONFIG.from}`);
  console.log('');

  try {
    // اختبار 1: إرسال إيميل ترحيب
    console.log('1️⃣ إرسال إيميل ترحيب...');
    const welcomeResult = await sendWelcomeEmail(email);
    
    if (welcomeResult.success) {
      console.log('✅ نجح إرسال إيميل الترحيب');
    } else {
      console.log('❌ فشل إرسال إيميل الترحيب:', welcomeResult.error);
    }

    // اختبار 2: إرسال رمز تحقق
    console.log('2️⃣ إرسال رمز تحقق...');
    const verificationResult = await sendVerificationCode(email);
    
    if (verificationResult.success) {
      console.log('✅ نجح إرسال رمز التحقق');
      console.log(`🔢 الرمز المرسل: ${verificationResult.code}`);
    } else {
      console.log('❌ فشل إرسال رمز التحقق:', verificationResult.error);
    }

    // اختبار 3: إرسال إيميل تأكيد
    console.log('3️⃣ إرسال إيميل تأكيد...');
    const confirmationResult = await sendConfirmationEmail(email);
    
    if (confirmationResult.success) {
      console.log('✅ نجح إرسال إيميل التأكيد');
    } else {
      console.log('❌ فشل إرسال إيميل التأكيد:', confirmationResult.error);
    }

    // النتائج النهائية
    console.log('');
    console.log('📊 ملخص الاختبار الفوري:');
    console.log(`✅ إيميل الترحيب: ${welcomeResult.success ? 'نجح' : 'فشل'}`);
    console.log(`✅ رمز التحقق: ${verificationResult.success ? 'نجح' : 'فشل'}`);
    console.log(`✅ إيميل التأكيد: ${confirmationResult.success ? 'نجح' : 'فشل'}`);

    const allSuccess = welcomeResult.success && verificationResult.success && confirmationResult.success;
    
    if (allSuccess) {
      console.log('');
      console.log('🎉 جميع الاختبارات نجحت!');
      console.log(`📬 تحقق من بريدك الإلكتروني: ${email}`);
      console.log('✨ يجب أن تجد 3 إيميلات من "رزقي - موقع الزواج الإسلامي"');
      console.log('🔥 نظام SMTP يعمل بشكل مثالي!');
    } else {
      console.log('');
      console.log('⚠️ بعض الاختبارات فشلت. تحقق من الأخطاء أعلاه.');
    }

    return {
      success: allSuccess,
      results: {
        welcome: welcomeResult,
        verification: verificationResult,
        confirmation: confirmationResult
      }
    };

  } catch (error) {
    console.error('💥 خطأ في الاختبار الفوري:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * إرسال إيميل ترحيب
 */
async function sendWelcomeEmail(email: string) {
  try {
    const response = await fetch('/api/send-smtp-email.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: '🕌 مرحباً بك في رزقي - موقع الزواج الإسلامي',
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 32px;">🕌 رزقي</h1>
              <p style="margin: 10px 0 0 0; font-size: 18px;">موقع الزواج الإسلامي الشرعي</p>
            </div>
            
            <div style="background: white; padding: 40px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-top: 0; text-align: center;">🎉 مرحباً بك في عائلة رزقي!</h2>
              
              <p style="color: #666; line-height: 1.8; font-size: 16px;">
                السلام عليكم ورحمة الله وبركاته،
              </p>
              
              <p style="color: #666; line-height: 1.8; font-size: 16px;">
                نحن سعداء جداً بانضمامك إلى موقع رزقي، المنصة الإسلامية الموثوقة للزواج الشرعي.
              </p>
              
              <div style="background: #f0f8ff; padding: 25px; border-radius: 10px; margin: 25px 0; border-right: 5px solid #667eea;">
                <h3 style="margin: 0 0 15px 0; color: #333;">✨ ما يميز رزقي:</h3>
                <ul style="margin: 0; padding-right: 20px; color: #666;">
                  <li style="margin-bottom: 8px;">🔒 خصوصية وأمان عاليين</li>
                  <li style="margin-bottom: 8px;">🕌 التزام بالقيم الإسلامية</li>
                  <li style="margin-bottom: 8px;">👥 مجتمع محترم ومتدين</li>
                  <li style="margin-bottom: 8px;">💝 هدفنا مساعدتك في إيجاد شريك الحياة</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://rezge.com" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                  🚀 ابدأ رحلتك الآن
                </a>
              </div>
              
              <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
                تم الإرسال عبر SMTP المباشر في: ${new Date().toLocaleString('ar-SA')}
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>رزقي - موقع الزواج الإسلامي الشرعي</p>
              <p>نحو زواج مبارك وحياة سعيدة 💕</p>
            </div>
          </div>
        `,
        text: `مرحباً بك في رزقي - موقع الزواج الإسلامي\n\nالسلام عليكم ورحمة الله وبركاته،\n\nنحن سعداء جداً بانضمامك إلى موقع رزقي، المنصة الإسلامية الموثوقة للزواج الشرعي.\n\nما يميز رزقي:\n- خصوصية وأمان عاليين\n- التزام بالقيم الإسلامية\n- مجتمع محترم ومتدين\n- هدفنا مساعدتك في إيجاد شريك الحياة\n\nابدأ رحلتك الآن: https://rezge.com\n\nتم الإرسال في: ${new Date().toLocaleString('ar-SA')}\n\nرزقي - موقع الزواج الإسلامي الشرعي`,
        smtp_config: SMTP_CONFIG
      })
    });

    if (response.ok) {
      const result = await response.json();
      return { success: result.success, error: result.error };
    }

    const errorText = await response.text();
    return { success: false, error: `HTTP ${response.status}: ${errorText}` };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * إرسال رمز تحقق
 */
async function sendVerificationCode(email: string) {
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    const response = await fetch('/api/send-smtp-email.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: '🔐 رمز التحقق الخاص بك - رزقي',
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #667eea; padding: 25px; border-radius: 10px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 28px;">🔐 رمز التحقق</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">رزقي - موقع الزواج الإسلامي</p>
            </div>
            
            <div style="background: white; padding: 40px; border-radius: 10px; margin-top: 20px; border: 1px solid #ddd;">
              <p style="font-size: 18px; color: #333; text-align: center;">رمز التحقق الخاص بك:</p>
              
              <div style="background: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%); padding: 30px; border-radius: 15px; text-align: center; margin: 25px 0; border: 2px solid #667eea;">
                <span style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</span>
              </div>
              
              <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-right: 4px solid #ffc107;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  ⚠️ <strong>مهم:</strong> هذا الرمز صالح لمدة 15 دقيقة فقط. لا تشاركه مع أي شخص آخر.
                </p>
              </div>
              
              <p style="color: #666; font-size: 14px; text-align: center;">
                إذا لم تطلب هذا الرمز، يرجى تجاهل هذا الإيميل.
              </p>
              
              <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
                تم الإرسال في: ${new Date().toLocaleString('ar-SA')}
              </p>
            </div>
          </div>
        `,
        text: `رمز التحقق - رزقي\n\nرمز التحقق الخاص بك: ${code}\n\nهذا الرمز صالح لمدة 15 دقيقة فقط. لا تشاركه مع أي شخص آخر.\n\nإذا لم تطلب هذا الرمز، يرجى تجاهل هذا الإيميل.\n\nتم الإرسال في: ${new Date().toLocaleString('ar-SA')}\n\nرزقي - موقع الزواج الإسلامي`,
        smtp_config: SMTP_CONFIG
      })
    });

    if (response.ok) {
      const result = await response.json();
      return { success: result.success, error: result.error, code };
    }

    const errorText = await response.text();
    return { success: false, error: `HTTP ${response.status}: ${errorText}` };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * إرسال إيميل تأكيد
 */
async function sendConfirmationEmail(email: string) {
  try {
    const response = await fetch('/api/send-smtp-email.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: '✅ تم تأكيد حسابك بنجاح - رزقي',
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 32px;">✅ تم التأكيد!</h1>
              <p style="margin: 10px 0 0 0; font-size: 18px;">رزقي - موقع الزواج الإسلامي</p>
            </div>
            
            <div style="background: white; padding: 40px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-top: 0; text-align: center;">🎉 مبارك! تم تأكيد حسابك بنجاح</h2>
              
              <div style="background: #d4edda; padding: 25px; border-radius: 10px; margin: 25px 0; border-right: 5px solid #28a745;">
                <p style="margin: 0; color: #155724; font-size: 16px; text-align: center;">
                  ✨ حسابك الآن مفعل ويمكنك الاستفادة من جميع خدمات رزقي
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <h3 style="color: #333; margin-bottom: 20px;">الخطوات التالية:</h3>
                <div style="text-align: right;">
                  <p style="color: #666; margin: 10px 0;">🔸 أكمل ملفك الشخصي</p>
                  <p style="color: #666; margin: 10px 0;">🔸 أضف صورتك الشخصية</p>
                  <p style="color: #666; margin: 10px 0;">🔸 حدد معايير البحث المناسبة</p>
                  <p style="color: #666; margin: 10px 0;">🔸 ابدأ في تصفح الملفات المتاحة</p>
                </div>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://rezge.com/profile" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                  📝 أكمل ملفك الشخصي
                </a>
              </div>
              
              <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
                تم التأكيد في: ${new Date().toLocaleString('ar-SA')}
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>رزقي - موقع الزواج الإسلامي الشرعي</p>
              <p>نتمنى لك رحلة موفقة في البحث عن شريك الحياة 💕</p>
            </div>
          </div>
        `,
        text: `تم تأكيد حسابك بنجاح - رزقي\n\nمبارك! تم تأكيد حسابك بنجاح\n\nحسابك الآن مفعل ويمكنك الاستفادة من جميع خدمات رزقي\n\nالخطوات التالية:\n- أكمل ملفك الشخصي\n- أضف صورتك الشخصية\n- حدد معايير البحث المناسبة\n- ابدأ في تصفح الملفات المتاحة\n\nأكمل ملفك الشخصي: https://rezge.com/profile\n\nتم التأكيد في: ${new Date().toLocaleString('ar-SA')}\n\nرزقي - موقع الزواج الإسلامي الشرعي`,
        smtp_config: SMTP_CONFIG
      })
    });

    if (response.ok) {
      const result = await response.json();
      return { success: result.success, error: result.error };
    }

    const errorText = await response.text();
    return { success: false, error: `HTTP ${response.status}: ${errorText}` };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// إتاحة الدالة في الكونسول
if (typeof window !== 'undefined') {
  (window as any).instantSMTPTest = instantSMTPTest;
  
  console.log('🚀 اختبار SMTP فوري متاح:');
  console.log('  • instantSMTPTest("kemoamego@gmail.com") - اختبار فوري مع الإعدادات الصحيحة');
  console.log('');
  console.log('✅ جميع إعدادات SMTP جاهزة ومكونة!');
}

export {};
