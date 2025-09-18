/**
 * خدمة Resend بسيطة ومباشرة
 * تستخدم مفتاح API حقيقي للإرسال الفعلي
 */

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
  type: string;
}

export class SimpleResendService {
  // مفتاح Resend API الجديد
  private static apiKey = 're_Eeyyz27p_A9UUaYMYoj5Q2xKqRygMJCQU';

  /**
   * إرسال إيميل عبر Resend API
   */
  static async sendViaResend(emailData: EmailData): Promise<{ success: boolean; error?: string; method?: string }> {
    console.log('📧 بدء الإرسال عبر Resend API...');
    console.log(`📮 من: manage@kareemamged.com`);
    console.log(`📬 إلى: ${emailData.to}`);
    console.log(`📝 الموضوع: ${emailData.subject}`);

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'رزقي <manage@kareemamged.com>',
          to: [emailData.to],
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
          reply_to: 'manage@kareemamged.com'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ نجح الإرسال عبر Resend API');
        console.log('📧 معرف الإيميل:', result.id);
        return { success: true, method: 'Resend API' };
      }

      const errorData = await response.json();
      console.log('❌ فشل Resend API:', errorData);
      return { success: false, error: `Resend error: ${errorData.message}` };

    } catch (error) {
      console.log('❌ خطأ في Resend API:', error);
      return { success: false, error: `Resend error: ${error}` };
    }
  }

  /**
   * اختبار خدمة Resend
   */
  static async testResendService(email: string = 'kemooamegoo@gmail.com'): Promise<{ success: boolean; error?: string }> {
    console.log('🧪 بدء اختبار خدمة Resend...');
    console.log(`📧 سيتم الإرسال إلى: ${email}`);
    console.log('');

    const testEmail = {
      to: email,
      subject: '📧 اختبار Resend API - رزقي',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 32px;">📧 Resend API</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">رزقي - موقع الزواج الإسلامي</p>
          </div>
          
          <div style="background: white; padding: 40px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0; text-align: center;">🎉 نجح الإرسال عبر Resend!</h2>
            
            <p style="color: #666; line-height: 1.8; font-size: 16px;">
              مرحباً! هذا إيميل تجريبي تم إرساله عبر Resend API.
            </p>
            
            <div style="background: #e7f3ff; padding: 25px; border-radius: 10px; margin: 25px 0; border-right: 5px solid #007bff;">
              <h3 style="margin: 0 0 15px 0; color: #0056b3;">✨ مزايا Resend API:</h3>
              <ul style="margin: 0; padding-right: 20px; color: #0056b3;">
                <li style="margin-bottom: 8px;">📧 إرسال موثوق وسريع</li>
                <li style="margin-bottom: 8px;">🔧 API بسيط وسهل</li>
                <li style="margin-bottom: 8px;">📊 تتبع حالة الإرسال</li>
                <li style="margin-bottom: 8px;">🌐 دعم HTML و Text</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://rezge.com" style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                🏠 العودة لرزقي
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
              تم الإرسال عبر Resend API في: ${new Date().toLocaleString('ar-SA')}
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>رزقي - موقع الزواج الإسلامي الشرعي</p>
            <p>نظام إشعارات متطور وموثوق 📧</p>
          </div>
        </div>
      `,
      text: `اختبار Resend API - رزقي\n\nمرحباً! هذا إيميل تجريبي تم إرساله عبر Resend API.\n\nمزايا Resend API:\n- إرسال موثوق وسريع\n- API بسيط وسهل\n- تتبع حالة الإرسال\n- دعم HTML و Text\n\nتم الإرسال في: ${new Date().toLocaleString('ar-SA')}\n\nرزقي - موقع الزواج الإسلامي الشرعي`,
      type: 'resend-test'
    };

    const result = await this.sendViaResend(testEmail);

    if (result.success) {
      console.log('🎉 اختبار Resend نجح!');
      console.log(`📧 الطريقة: ${result.method}`);
      console.log(`📬 تحقق من بريدك الإلكتروني: ${email}`);
      console.log('✨ يجب أن تجد إيميل "اختبار Resend API - رزقي"');
    } else {
      console.log('❌ اختبار Resend فشل:', result.error);
    }

    return result;
  }

  /**
   * إرسال إيميل تحقق عبر Resend
   */
  static async sendVerificationEmail(email: string, verificationLink: string): Promise<{ success: boolean; error?: string }> {
    console.log('🔐 إرسال إيميل تحقق عبر Resend...');

    const emailData = {
      to: email,
      subject: '🔐 تحقق من حسابك - رزقي',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 32px;">🔐 تحقق من حسابك</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">رزقي - موقع الزواج الإسلامي</p>
          </div>
          
          <div style="background: white; padding: 40px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">مرحباً بك في رزقي!</h2>
            
            <p style="color: #666; line-height: 1.8; font-size: 16px;">
              شكراً لك على التسجيل في موقع رزقي. لإكمال إنشاء حسابك، يرجى النقر على الرابط أدناه لتحقق من بريدك الإلكتروني.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                🔐 تحقق من حسابك
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px;">
              إذا لم تقم بإنشاء حساب في رزقي، يمكنك تجاهل هذا الإيميل.
            </p>
          </div>
        </div>
      `,
      text: `تحقق من حسابك - رزقي\n\nمرحباً بك في رزقي!\n\nشكراً لك على التسجيل في موقع رزقي. لإكمال إنشاء حسابك، يرجى زيارة الرابط التالي:\n\n${verificationLink}\n\nإذا لم تقم بإنشاء حساب في رزقي، يمكنك تجاهل هذا الإيميل.`,
      type: 'verification'
    };

    return await this.sendViaResend(emailData);
  }

  /**
   * إرسال رمز 2FA عبر Resend
   */
  static async send2FACode(email: string, code: string): Promise<{ success: boolean; error?: string }> {
    console.log('🔢 إرسال رمز 2FA عبر Resend...');

    const emailData = {
      to: email,
      subject: '🔢 رمز التحقق الثنائي - رزقي',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 32px;">🔢 رمز التحقق</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">رزقي - موقع الزواج الإسلامي</p>
          </div>
          
          <div style="background: white; padding: 40px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">رمز التحقق الثنائي</h2>
            
            <p style="color: #666; line-height: 1.8; font-size: 16px;">
              استخدم الرمز التالي لإكمال عملية تسجيل الدخول:
            </p>
            
            <div style="background: #fff3cd; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
              <h1 style="color: #856404; font-size: 36px; margin: 0; letter-spacing: 5px;">${code}</h1>
            </div>
            
            <p style="color: #999; font-size: 14px;">
              هذا الرمز صالح لمدة 15 دقيقة فقط. لا تشاركه مع أحد.
            </p>
          </div>
        </div>
      `,
      text: `رمز التحقق الثنائي - رزقي\n\nاستخدم الرمز التالي لإكمال عملية تسجيل الدخول:\n\n${code}\n\nهذا الرمز صالح لمدة 15 دقيقة فقط. لا تشاركه مع أحد.`,
      type: '2fa'
    };

    return await this.sendViaResend(emailData);
  }
}

// إتاحة الخدمة في الكونسول
if (typeof window !== 'undefined') {
  (window as any).SimpleResendService = SimpleResendService;
  
  console.log('📧 خدمة Resend البسيطة متاحة:');
  console.log('  • SimpleResendService.testResendService("kemooamegoo@gmail.com") - اختبار Resend');
  console.log('  • SimpleResendService.sendVerificationEmail(email, link) - إيميل تحقق');
  console.log('  • SimpleResendService.send2FACode(email, code) - رمز 2FA');
}

export {};
