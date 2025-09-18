import { supabase } from './supabase';

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
  type: string;
}

/**
 * خدمة إرسال الإيميلات من جانب العميل
 * تستخدم APIs عادية بدلاً من Admin APIs
 */
export class ClientEmailService {
  private static readonly fromEmail = 'manage@kareemamged.com';
  private static readonly fromName = 'رزقي - موقع الزواج الإسلامي';

  /**
   * إرسال إيميل كلمة مرور مؤقتة
   */
  static async sendTemporaryPasswordEmail(params: {
    to: string;
    temporaryPassword: string;
    expiresAt: string;
    recipientName: string;
    language: 'ar' | 'en';
  }): Promise<{ success: boolean; message: string; error?: string }> {
    console.log('📧 إرسال كلمة المرور المؤقتة...');
    console.log(`📬 إلى: ${params.to}`);

    try {
      // استخدام resetPasswordForEmail بدلاً من Admin APIs
      console.log('🔷 استخدام resetPasswordForEmail...');
      
      const { error } = await supabase.auth.resetPasswordForEmail(params.to, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        console.log('❌ خطأ في إرسال رابط إعادة التعيين:', error.message);
        
        // محاولة بديلة: حفظ في قاعدة البيانات
        console.log('🔄 محاولة بديلة: حفظ في قاعدة البيانات...');
        
        const emailHtml = this.generateTemporaryPasswordTemplate(
          params.temporaryPassword,
          params.expiresAt,
          params.recipientName,
          params.language
        );

        const { error: saveError } = await supabase
          .from('email_queue')
          .insert({
            to_email: params.to,
            subject: params.language === 'ar' ? 'كلمة المرور المؤقتة - رزقي' : 'Temporary Password - Rezge',
            html_content: emailHtml,
            text_content: `كلمة المرور المؤقتة: ${params.temporaryPassword}`,
            from_email: this.fromEmail,
            email_type: 'temporary_password',
            status: 'pending',
            created_at: new Date().toISOString()
          });

        if (saveError) {
          console.log('❌ فشل في حفظ الإيميل:', saveError.message);
          return {
            success: false,
            message: 'فشل في إرسال كلمة المرور المؤقتة',
            error: saveError.message
          };
        }

        console.log('✅ تم حفظ الإيميل في قاعدة البيانات للمعالجة');
        return {
          success: true,
          message: 'تم حفظ طلب إرسال كلمة المرور المؤقتة'
        };
      }

      console.log('✅ تم إرسال رابط إعادة تعيين كلمة المرور بنجاح');
      return {
        success: true,
        message: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني'
      };

    } catch (error: any) {
      console.log('❌ خطأ عام:', error.message);
      return {
        success: false,
        message: 'حدث خطأ في إرسال كلمة المرور المؤقتة',
        error: error.message
      };
    }
  }

  /**
   * إرسال إيميل ترحيبي للمستخدمين الجدد بعد إنشاء الحساب
   */
  static async sendWelcomeEmail(params: {
    to: string;
    firstName: string;
  }): Promise<{ success: boolean; error?: string; method?: string }> {
    console.log('🎉 إرسال إيميل ترحيبي...');
    
    try {
      // استخدام القالب الموحد الجديد
      const unifiedTemplateModule = await import('./unifiedEmailTemplate');
      const templateData = unifiedTemplateModule.EmailTemplates.welcomeEmail(params.firstName);
      const { html: emailHtml, text: emailText, subject } = unifiedTemplateModule.createUnifiedEmailTemplate(templateData);

      // إرسال مباشر عبر الخادم المستقل (نفس طريقة رموز التحقق)
      console.log('🚀 إرسال مباشر عبر SMTP Server...');
      const response = await fetch('http://localhost:3001/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: params.to,
          subject: subject,
          html: emailHtml,
          text: emailText
        })
      });

      if (response.ok) {
        console.log('✅ تم إرسال الإيميل الترحيبي بنجاح عبر SMTP');
        return { 
          success: true, 
          method: 'direct_smtp'
        };
      } else {
        console.log('⚠️ فشل الإرسال المباشر، محاولة الحفظ في قاعدة البيانات...');
        throw new Error('SMTP server failed');
      }
    } catch (smtpError) {
      console.log('📝 حفظ الإيميل الترحيبي في قاعدة البيانات كبديل...');
      
      try {
        // استخدام القالب الموحد للحفظ في قاعدة البيانات
        const unifiedTemplateModule = await import('./unifiedEmailTemplate');
        const templateData = unifiedTemplateModule.EmailTemplates.welcomeEmail(params.firstName);
        const { html: emailHtml, text: emailText, subject } = unifiedTemplateModule.createUnifiedEmailTemplate(templateData);

        const { supabase } = await import('../lib/supabase');
        
        const { error } = await supabase
          .from('email_queue')
          .insert({
            recipient_email: params.to,
            subject: subject,
            html_content: emailHtml,
            text_content: emailText,
            email_type: 'welcome',
            status: 'pending',
            created_at: new Date().toISOString()
          });

        if (error) {
          console.error('❌ خطأ في حفظ الإيميل الترحيبي:', error);
          return { success: false, error: 'فشل في حفظ الإيميل الترحيبي' };
        }

        console.log('✅ تم حفظ الإيميل الترحيبي في قاعدة البيانات');
        return { 
          success: true, 
          method: 'database_queue'
        };
      } catch (dbError) {
        console.error('❌ خطأ في حفظ الإيميل الترحيبي في قاعدة البيانات:', dbError);
        return { success: false, error: 'فشل في إرسال وحفظ الإيميل الترحيبي' };
      }
    }
  }

  /**
   * إرسال إيميل تعيين كلمة المرور للحساب الجديد
   */
  static async sendPasswordSetupEmail(params: {
    to: string;
    verificationUrl: string;
    firstName: string;
    language: 'ar' | 'en';
  }): Promise<{ success: boolean; message: string; error?: string }> {
    console.log('📧 إرسال إيميل تعيين كلمة المرور...');
    
    try {
      // استخدام القالب الموحد الجديد
      const unifiedTemplateModule = await import('./unifiedEmailTemplate');
      const templateData = unifiedTemplateModule.EmailTemplates.passwordSetup(params.verificationUrl, params.firstName);
      const { html: emailHtml, text: emailText, subject } = unifiedTemplateModule.createUnifiedEmailTemplate(templateData);

      // إرسال مباشر عبر الخادم المستقل (نفس طريقة كلمة المرور المؤقتة)
      console.log('🚀 إرسال مباشر عبر SMTP Server...');
      const response = await fetch('http://localhost:3001/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: params.to,
          subject: subject,
          html: emailHtml,
          text: emailText,
          from: this.fromEmail,
          fromName: this.fromName
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('✅ تم إرسال إيميل تعيين كلمة المرور بنجاح');
          return {
            success: true,
            message: 'تم إرسال إيميل التحقق إلى بريدك الإلكتروني'
          };
        } else {
          console.log('❌ فشل في إرسال الإيميل عبر SMTP:', result.error);
          // محاولة بديلة: حفظ في قاعدة البيانات
          console.log('🔄 محاولة بديلة: حفظ في قاعدة البيانات...');
        }
      } else {
        console.log('❌ خطأ في الاتصال بخادم SMTP:', response.status);
        console.log('🔄 محاولة بديلة: حفظ في قاعدة البيانات...');
      }

      // محاولة بديلة: حفظ في قاعدة البيانات للمعالجة لاحقاً
      const { error } = await supabase
        .from('email_queue')
        .insert({
          to_email: params.to,
          subject: subject,
          html_content: emailHtml,
          text_content: emailText,
          from_email: this.fromEmail,
          email_type: 'password_setup',
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (error) {
        console.log('❌ فشل في حفظ إيميل تعيين كلمة المرور:', error.message);
        return {
          success: false,
          message: 'فشل في إرسال إيميل تعيين كلمة المرور',
          error: error.message
        };
      }

      console.log('✅ تم حفظ إيميل تعيين كلمة المرور للمعالجة');
      return {
        success: true,
        message: 'تم إرسال إيميل التحقق إلى بريدك الإلكتروني'
      };

    } catch (error: any) {
      console.log('❌ خطأ عام:', error.message);
      return {
        success: false,
        message: 'حدث خطأ في إرسال إيميل التحقق',
        error: error.message
      };
    }
  }

  /**
   * إنشاء تيمبليت كلمة المرور المؤقتة
   */
  private static generateTemporaryPasswordTemplate(
    temporaryPassword: string,
    expiresAt: string,
    recipientName: string,
    language: 'ar' | 'en'
  ): string {
    const expiryDate = new Date(expiresAt);
    const formattedExpiry = expiryDate.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US');

    return `
<!DOCTYPE html>
<html dir="${language === 'ar' ? 'rtl' : 'ltr'}" lang="${language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${language === 'ar' ? 'كلمة المرور المؤقتة - رزقي' : 'Temporary Password - Rezge'}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
        body { margin: 0; padding: 0; font-family: 'Amiri', serif; }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Amiri', serif; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 40px 20px; min-height: 100vh;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e40af 0%, #059669 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: white; font-size: 32px; margin: 0; font-weight: bold;">رزقي</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">موقع الزواج الإسلامي الشرعي</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #1e40af; font-size: 24px; margin: 0 0 20px 0; text-align: center;">
                ${language === 'ar' ? 'كلمة المرور المؤقتة' : 'Temporary Password'}
            </h2>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                ${language === 'ar' ? `مرحباً ${recipientName}،` : `Hello ${recipientName},`}
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                ${language === 'ar' ? 'إليك كلمة المرور المؤقتة الخاصة بك:' : 'Here is your temporary password:'}
            </p>
            
            <div style="background: #f0f9ff; border: 2px solid #1e40af; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
                <h3 style="color: #1e40af; font-size: 24px; margin: 0; font-weight: bold; letter-spacing: 2px;">${temporaryPassword}</h3>
            </div>
            
            <div style="background: #fef3c7; border-radius: 10px; padding: 20px; margin: 20px 0; border-right: 4px solid #f59e0b;">
                <h3 style="color: #92400e; font-size: 18px; margin: 0 0 10px 0;">
                    ${language === 'ar' ? '⚠️ تنبيه مهم:' : '⚠️ Important Notice:'}
                </h3>
                <ul style="color: #92400e; margin: 0; padding-right: 20px; line-height: 1.6;">
                    <li>${language === 'ar' ? `تنتهي صلاحية هذه الكلمة في: ${formattedExpiry}` : `This password expires on: ${formattedExpiry}`}</li>
                    <li>${language === 'ar' ? 'استخدمها لتسجيل الدخول ثم قم بتغييرها فوراً' : 'Use it to login then change it immediately'}</li>
                    <li>${language === 'ar' ? 'لا تشارك هذه الكلمة مع أي شخص آخر' : 'Do not share this password with anyone'}</li>
                </ul>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 رزقي - موقع الزواج الإسلامي الشرعي</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * إنشاء تيمبليت التحقق
   */
  private static generateVerificationTemplate(
    verificationUrl: string,
    firstName: string,
    language: 'ar' | 'en'
  ): string {
    return `
<!DOCTYPE html>
<html dir="${language === 'ar' ? 'rtl' : 'ltr'}" lang="${language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${language === 'ar' ? 'تأكيد إنشاء حسابك في رزقي' : 'Confirm Your Account - Rezge'}</title>
</head>
<body style="font-family: Arial, sans-serif; background: #f0f9ff; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #059669 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">رزقي</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">موقع الزواج الإسلامي الشرعي</p>
        </div>
        
        <div style="padding: 30px;">
            <h2 style="color: #1e40af; text-align: center;">
                ${language === 'ar' ? 'مرحباً بك في رزقي!' : 'Welcome to Rezge!'}
            </h2>
            
            <p>${language === 'ar' ? `مرحباً ${firstName}،` : `Hello ${firstName},`}</p>
            
            <p>${language === 'ar' ? 'لإكمال إنشاء حسابك، يرجى النقر على الرابط أدناه:' : 'To complete your account setup, please click the link below:'}</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" style="background: linear-gradient(135deg, #1e40af 0%, #059669 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: bold;">
                    ${language === 'ar' ? 'تأكيد الحساب' : 'Confirm Account'}
                </a>
            </div>
        </div>
    </div>
</body>
</html>`;
  }
}

// إتاحة الخدمة في الكونسول
if (typeof window !== 'undefined') {
  (window as any).ClientEmailService = ClientEmailService;
  console.log('📧 خدمة إرسال الإيميلات من جانب العميل متاحة');
}
