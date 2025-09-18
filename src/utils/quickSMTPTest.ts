/**
 * اختبار سريع لـ SMTP المباشر
 */

/**
 * اختبار سريع وشامل لـ SMTP
 */
export async function quickSMTPTest(email: string = 'kemoamego@gmail.com', password?: string) {
  console.log('🔥 بدء اختبار SMTP المباشر الشامل...');
  console.log(`📧 سيتم الإرسال إلى: ${email}`);
  console.log('');

  // التحقق من كلمة المرور
  if (!password) {
    password = prompt('🔑 أدخل كلمة مرور SMTP للحساب manage@kareemamged.com:');
    if (!password) {
      console.log('❌ كلمة المرور مطلوبة للمتابعة');
      return { success: false, error: 'Password required' };
    }
  }

  try {
    // 1. حفظ كلمة المرور
    console.log('1️⃣ حفظ كلمة مرور SMTP...');
    if (typeof window !== 'undefined' && (window as any).AdvancedEmailService) {
      (window as any).AdvancedEmailService.setSMTPPassword(password);
      console.log('✅ تم حفظ كلمة المرور');
    }

    // 2. اختبار الاتصال
    console.log('2️⃣ اختبار اتصال SMTP...');
    const connectionTest = await testSMTPConnection(email, password);
    
    if (connectionTest.success) {
      console.log('✅ نجح اختبار الاتصال');
    } else {
      console.log('❌ فشل اختبار الاتصال:', connectionTest.error);
    }

    // 3. اختبار إرسال إيميل تحقق
    console.log('3️⃣ اختبار إرسال إيميل تحقق...');
    const verificationTest = await testSMTPVerificationEmail(email, password);
    
    if (verificationTest.success) {
      console.log('✅ نجح إرسال إيميل التحقق');
    } else {
      console.log('❌ فشل إرسال إيميل التحقق:', verificationTest.error);
    }

    // 4. اختبار إرسال رمز 2FA
    console.log('4️⃣ اختبار إرسال رمز 2FA...');
    const twoFATest = await testSMTP2FAEmail(email, password);
    
    if (twoFATest.success) {
      console.log('✅ نجح إرسال رمز 2FA');
    } else {
      console.log('❌ فشل إرسال رمز 2FA:', twoFATest.error);
    }

    // النتائج النهائية
    console.log('');
    console.log('📊 ملخص اختبار SMTP:');
    console.log(`✅ اختبار الاتصال: ${connectionTest.success ? 'نجح' : 'فشل'}`);
    console.log(`✅ إيميل التحقق: ${verificationTest.success ? 'نجح' : 'فشل'}`);
    console.log(`✅ رمز 2FA: ${twoFATest.success ? 'نجح' : 'فشل'}`);

    const allSuccess = connectionTest.success && verificationTest.success && twoFATest.success;
    
    if (allSuccess) {
      console.log('🎉 جميع اختبارات SMTP نجحت!');
      console.log(`📬 تحقق من بريدك الإلكتروني: ${email}`);
      console.log('✨ يجب أن تجد إيميلات من "رزقي - موقع الزواج الإسلامي"');
    } else {
      console.log('⚠️ بعض الاختبارات فشلت. راجع الأخطاء أعلاه.');
    }

    return {
      success: allSuccess,
      results: {
        connection: connectionTest,
        verification: verificationTest,
        twoFA: twoFATest
      }
    };

  } catch (error) {
    console.error('💥 خطأ في اختبار SMTP:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * اختبار اتصال SMTP
 */
async function testSMTPConnection(email: string, password: string) {
  try {
    const response = await fetch('/api/send-smtp-email.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: 'اختبار اتصال SMTP - رزقي',
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>🔗 اختبار اتصال SMTP</h2>
            <p>مرحباً! هذا اختبار للتأكد من عمل اتصال SMTP المباشر.</p>
            <p><strong>الوقت:</strong> ${new Date().toLocaleString('ar-SA')}</p>
            <p><strong>الخادم:</strong> smtp.hostinger.com:465</p>
            <p><strong>الحالة:</strong> ✅ الاتصال يعمل بنجاح</p>
          </div>
        `,
        text: `اختبار اتصال SMTP - رزقي\n\nمرحباً! هذا اختبار للتأكد من عمل اتصال SMTP المباشر.\n\nالوقت: ${new Date().toLocaleString('ar-SA')}\nالخادم: smtp.hostinger.com:465\nالحالة: الاتصال يعمل بنجاح`,
        smtp_config: {
          host: 'smtp.hostinger.com',
          port: 465,
          secure: true,
          user: 'manage@kareemamged.com',
          pass: password,
          from: 'رزقي - موقع الزواج الإسلامي <manage@kareemamged.com>'
        }
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
 * اختبار إرسال إيميل تحقق
 */
async function testSMTPVerificationEmail(email: string, password: string) {
  try {
    const verificationUrl = 'https://example.com/verify?token=test123';
    
    const response = await fetch('/api/send-smtp-email.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: 'تأكيد إنشاء حسابك في رزقي - اختبار SMTP',
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 28px;">🕌 رزقي</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">موقع الزواج الإسلامي</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-top: 0;">🎉 مرحباً بك في رزقي!</h2>
              
              <p style="color: #666; line-height: 1.6; font-size: 16px;">
                هذا اختبار لإيميل التحقق عبر SMTP المباشر.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                  تأكيد الحساب (اختبار)
                </a>
              </div>
              
              <p style="color: #999; font-size: 14px; margin-top: 30px;">
                تم الإرسال عبر SMTP المباشر في: ${new Date().toLocaleString('ar-SA')}
              </p>
            </div>
          </div>
        `,
        text: `مرحباً بك في رزقي!\n\nهذا اختبار لإيميل التحقق عبر SMTP المباشر.\n\nرابط التحقق (اختبار): ${verificationUrl}\n\nتم الإرسال في: ${new Date().toLocaleString('ar-SA')}`,
        smtp_config: {
          host: 'smtp.hostinger.com',
          port: 465,
          secure: true,
          user: 'manage@kareemamged.com',
          pass: password,
          from: 'رزقي - موقع الزواج الإسلامي <manage@kareemamged.com>'
        }
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
 * اختبار إرسال رمز 2FA
 */
async function testSMTP2FAEmail(email: string, password: string) {
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    const response = await fetch('/api/send-smtp-email.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: 'رمز التحقق الثنائي - رزقي (اختبار SMTP)',
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #667eea; padding: 20px; border-radius: 10px; text-align: center; color: white;">
              <h1 style="margin: 0;">🔐 رمز التحقق الثنائي</h1>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; border: 1px solid #ddd;">
              <p style="font-size: 18px; color: #333;">رمز التحقق الخاص بك:</p>
              
              <div style="background: #f0f8ff; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px;">${code}</span>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                هذا اختبار لرمز التحقق الثنائي عبر SMTP المباشر.
              </p>
              
              <p style="color: #999; font-size: 12px; margin-top: 20px;">
                تم الإرسال في: ${new Date().toLocaleString('ar-SA')}
              </p>
            </div>
          </div>
        `,
        text: `رمز التحقق الثنائي - رزقي\n\nرمز التحقق الخاص بك: ${code}\n\nهذا اختبار لرمز التحقق الثنائي عبر SMTP المباشر.\n\nتم الإرسال في: ${new Date().toLocaleString('ar-SA')}`,
        smtp_config: {
          host: 'smtp.hostinger.com',
          port: 465,
          secure: true,
          user: 'manage@kareemamged.com',
          pass: password,
          from: 'رزقي - موقع الزواج الإسلامي <manage@kareemamged.com>'
        }
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

// إتاحة الدوال في الكونسول
if (typeof window !== 'undefined') {
  (window as any).quickSMTPTest = quickSMTPTest;
  (window as any).smtpTests = {
    quickSMTPTest,
    testSMTPConnection,
    testSMTPVerificationEmail,
    testSMTP2FAEmail
  };

  console.log('🔥 أدوات اختبار SMTP السريع متاحة:');
  console.log('  • quickSMTPTest("kemoamego@gmail.com") - اختبار شامل مع طلب كلمة المرور');
  console.log('  • quickSMTPTest("kemoamego@gmail.com", "password") - اختبار شامل مع كلمة مرور');
  console.log('  • smtpTests.testSMTPConnection("email", "password") - اختبار الاتصال فقط');
}

export {};
