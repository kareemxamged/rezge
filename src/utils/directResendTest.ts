/**
 * اختبار مباشر لـ Resend API
 * للتأكد من عمل المفتاح والإعدادات
 */

/**
 * اختبار مباشر لـ Resend API
 */
export async function testResendDirectly(email: string = 'kemoamego@gmail.com') {
  console.log('🔥 اختبار مباشر لـ Resend API...');
  console.log(`📧 سيتم الإرسال إلى: ${email}`);
  
  const apiKey = 're_Eeyyz27p_A9UUaYMYoj5Q2xKqRygMJCQU';
  
  try {
    console.log('🚀 إرسال طلب إلى Resend API...');
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'رزقي - موقع الزواج الإسلامي <manage@kareemamged.com>',
        to: [email],
        subject: 'اختبار مباشر من رزقي',
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 28px;">🕌 رزقي</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">موقع الزواج الإسلامي</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-top: 0;">🎉 اختبار ناجح!</h2>
              
              <p style="color: #666; line-height: 1.6; font-size: 16px;">
                مرحباً بك! هذا اختبار مباشر لنظام الإشعارات البريدية في موقع رزقي.
              </p>
              
              <p style="color: #666; line-height: 1.6; font-size: 16px;">
                إذا وصلك هذا الإيميل، فهذا يعني أن النظام يعمل بشكل مثالي! 🎊
              </p>
              
              <div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-right: 4px solid #667eea;">
                <p style="margin: 0; color: #333; font-weight: bold;">✅ تم الإرسال بنجاح عبر:</p>
                <p style="margin: 5px 0 0 0; color: #666;">Resend API مع إعدادات SMTP المخصصة</p>
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
        `,
        text: `
مرحباً من رزقي!

هذا اختبار مباشر لنظام الإشعارات البريدية.

إذا وصلك هذا الإيميل، فهذا يعني أن النظام يعمل بشكل مثالي!

✅ تم الإرسال بنجاح عبر Resend API

تم الإرسال في: ${new Date().toLocaleString('ar-SA')}

رزقي - موقع الزواج الإسلامي الشرعي
        `
      })
    });

    console.log(`📊 حالة الاستجابة: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('🎉 نجح الإرسال المباشر!');
      console.log('📧 معرف الرسالة:', result.id);
      console.log(`📬 تحقق من بريدك الإلكتروني: ${email}`);
      console.log('✨ يجب أن تجد إيميل "اختبار مباشر من رزقي"');
      
      return {
        success: true,
        messageId: result.id,
        email: email,
        message: 'تم الإرسال بنجاح! تحقق من صندوق الوارد.'
      };
    } else {
      const errorText = await response.text();
      console.error('❌ فشل الإرسال المباشر:');
      console.error(`📊 كود الخطأ: ${response.status}`);
      console.error('📝 تفاصيل الخطأ:', errorText);
      
      // تحليل الأخطاء الشائعة
      if (response.status === 422) {
        console.log('💡 نصيحة: تحقق من صحة عنوان البريد الإلكتروني');
      } else if (response.status === 401) {
        console.log('💡 نصيحة: تحقق من صحة مفتاح API');
      } else if (response.status === 403) {
        console.log('💡 نصيحة: تحقق من تحقق النطاق في Resend');
      }
      
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
        email: email
      };
    }
  } catch (error) {
    console.error('💥 خطأ في الشبكة:', error);
    return {
      success: false,
      error: `Network error: ${error}`,
      email: email
    };
  }
}

/**
 * اختبار حالة مفتاح API
 */
export async function testResendAPIKey() {
  console.log('🔑 اختبار حالة مفتاح Resend API...');
  
  const apiKey = 're_Eeyyz27p_A9UUaYMYoj5Q2xKqRygMJCQU';
  
  try {
    // اختبار بسيط للتحقق من صحة المفتاح
    const response = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      }
    });

    console.log(`📊 حالة الاستجابة: ${response.status}`);
    
    if (response.ok) {
      const domains = await response.json();
      console.log('✅ مفتاح API صحيح!');
      console.log('🌐 النطاقات المتاحة:', domains.data?.length || 0);
      
      if (domains.data && domains.data.length > 0) {
        domains.data.forEach((domain: any, index: number) => {
          console.log(`${index + 1}. ${domain.name} - ${domain.status}`);
        });
      } else {
        console.log('⚠️ لا توجد نطاقات محققة. قد تحتاج لإضافة نطاق.');
      }
      
      return { success: true, domains: domains.data };
    } else {
      const errorText = await response.text();
      console.error('❌ مفتاح API غير صحيح أو منتهي الصلاحية');
      console.error('📝 تفاصيل الخطأ:', errorText);
      
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error('💥 خطأ في فحص المفتاح:', error);
    return { success: false, error: String(error) };
  }
}

// إتاحة الدوال في الكونسول
if (typeof window !== 'undefined') {
  (window as any).resendTests = {
    testResendDirectly,
    testResendAPIKey
  };

  console.log('🔥 أدوات اختبار Resend متاحة:');
  console.log('  • resendTests.testResendDirectly("kemoamego@gmail.com") - اختبار إرسال مباشر');
  console.log('  • resendTests.testResendAPIKey() - فحص حالة مفتاح API');
  console.log('');
  console.log('🚀 اختبار فوري: resendTests.testResendDirectly("kemoamego@gmail.com")');
}

export {};
