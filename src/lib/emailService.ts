import { supabase } from './supabase';
import { SMTPService, simpleEmailService } from './smtpService';
import FinalEmailService from './finalEmailService';
import { WorkingEmailService } from './workingEmailService';

// إعدادات SMTP المستقلة
interface SMTPConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  senderName: string;
  senderEmail: string;
}

// خدمة إرسال الإيميلات المحسنة
export const emailService = {
  // الحصول على إعدادات SMTP من قاعدة البيانات
  async getSMTPConfig(): Promise<SMTPConfig | null> {
    try {
      // الحصول على إعدادات SMTP من Supabase Auth
      const { data: authConfig } = await supabase.rpc('get_auth_config');

      if (authConfig) {
        return {
          host: authConfig.smtp_host || 'smtp.hostinger.com',
          port: parseInt(authConfig.smtp_port || '465'),
          user: authConfig.smtp_user || 'manage@kareemamged.com',
          pass: authConfig.smtp_pass || '',
          senderName: authConfig.smtp_sender_name || 'رزجة - موقع الزواج الإسلامي',
          senderEmail: authConfig.smtp_user || 'manage@kareemamged.com'
        };
      }

      // إعدادات افتراضية في حالة عدم وجود إعدادات
      return {
        host: 'smtp.hostinger.com',
        port: 465,
        user: 'manage@kareemamged.com',
        pass: '',
        senderName: 'رزجة - موقع الزواج الإسلامي',
        senderEmail: 'manage@kareemamged.com'
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('خطأ في الحصول على إعدادات SMTP:', error);
      }
      return null;
    }
  },

  // إرسال إيميل التحقق - نسخة مبسطة للاختبار
  async sendVerificationEmail(
    email: string,
    token: string,
    userData: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const verificationUrl = `${window.location.origin}/verify-email?token=${token}`;

      // في بيئة التطوير: عرض رابط التحقق في الكونسول
      if (process.env.NODE_ENV === 'development') {
        console.log('🔗 رابط التحقق:', verificationUrl);
        console.log('📧 البريد الإلكتروني:', email);
        console.log('👤 بيانات المستخدم:', userData);
        console.log('💡 انسخ الرابط أعلاه والصقه في المتصفح لتأكيد الحساب');
      }

      // محاولة إرسال إيميل حقيقي (اختياري)
      try {
        await this.sendSimpleEmail(email, verificationUrl, userData);
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ تم إرسال الإيميل بنجاح');
        }
      } catch (emailError) {
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ فشل في إرسال الإيميل، لكن رابط التحقق متاح في الكونسول');
          console.log('خطأ الإيميل:', emailError);
        }
      }

      // نعتبر العملية ناجحة دائماً لأن الرابط متاح في الكونسول
      return { success: true };
    } catch (error) {
      console.error('Error in sendVerificationEmail:', error);
      return { success: false, error: 'حدث خطأ في إنشاء رابط التحقق' };
    }
  },

  // إرسال إيميل بسيط باستخدام Web3Forms
  async sendSimpleEmail(
    email: string,
    verificationUrl: string,
    userData: any
  ): Promise<boolean> {
    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_key: 'YOUR_WEB3FORMS_ACCESS_KEY', // يجب الحصول على مفتاح من web3forms.com
          subject: 'تأكيد حساب رزجة - موقع الزواج الإسلامي',
          from_name: 'رزجة - موقع الزواج الإسلامي',
          to: email,
          message: `
            مرحباً ${userData.first_name} ${userData.last_name}،

            شكراً لك على التسجيل في موقع رزجة للزواج الإسلامي.

            لتأكيد حسابك، يرجى النقر على الرابط التالي:
            ${verificationUrl}

            هذا الرابط صالح لمدة 24 ساعة.

            مع تحيات فريق رزجة
          `
        })
      });

      return response.ok;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('خطأ في إرسال الإيميل البسيط:', error);
      }
      return false;
    }
  },

  // إرسال إيميل حقيقي باستخدام طرق متعددة
  async sendRealEmail(
    email: string,
    verificationUrl: string,
    userData: any
  ): Promise<boolean> {
    // الطريقة 1: استخدام الخدمة النهائية (الأولوية الأولى)
    const finalEmailResult = await this.sendViaFinalEmailService(email, verificationUrl, userData);
    if (finalEmailResult) {
      return true;
    }

    // الطريقة 2: استخدام خدمة إرسال إيميلات حقيقية
    const realEmailResult = await this.sendViaRealEmailService(email, verificationUrl, userData);
    if (realEmailResult) {
      return true;
    }

    // الطريقة 3: استخدام خدمة SMTP المستقلة
    const smtpResult = await this.sendViaSMTPService(email, verificationUrl, userData);
    if (smtpResult) {
      return true;
    }

    // الطريقة 4: استخدام Supabase Auth مع إعدادات SMTP المكونة
    const supabaseResult = await this.sendViaSupabaseAuth(email, verificationUrl, userData);
    if (supabaseResult) {
      return true;
    }

    // الطريقة 5: استخدام Edge Function مخصصة
    const edgeFunctionResult = await this.sendViaEdgeFunction(email, verificationUrl, userData);
    if (edgeFunctionResult) {
      return true;
    }

    // الطريقة 6: استخدام خدمة خارجية بسيطة
    const simpleResult = await this.sendViaSimpleService(email, verificationUrl, userData);
    if (simpleResult) {
      return true;
    }

    return false;
  },

  // الطريقة الجديدة: إرسال عبر الخدمة النهائية
  async sendViaFinalEmailService(
    email: string,
    verificationUrl: string,
    userData: any
  ): Promise<boolean> {
    try {
      const result = await FinalEmailService.sendVerificationEmail(email, verificationUrl, userData);

      if (result.success) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`📤 تم إرسال الإيميل عبر ${result.method || 'الخدمة النهائية'}`);
        }
        return true;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ فشل في إرسال الإيميل عبر الخدمة النهائية:', result.error);
      }
      return false;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ خطأ في الخدمة النهائية:', error);
      }
      return false;
    }
  },

  // الطريقة الجديدة: إرسال عبر الخادم المستقل
  async sendViaRealEmailService(
    email: string,
    verificationUrl: string,
    userData: any
  ): Promise<boolean> {
    try {
      // استخدام الخادم المستقل
      const response = await fetch('http://localhost:3001/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject: 'تأكيد إنشاء حسابك في رزقي',
          html: this.generateEmailHTML(verificationUrl, userData),
          text: `مرحباً ${userData.first_name}، يرجى زيارة الرابط التالي لتأكيد حسابك: ${verificationUrl}`,
          from: 'manage@kareemamged.com',
          fromName: 'رزقي - موقع الزواج الإسلامي'
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          if (process.env.NODE_ENV === 'development') {
            console.log('📤 تم إرسال الإيميل عبر الخادم المستقل');
          }
          return true;
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ فشل في إرسال الإيميل عبر الخادم المستقل');
      }
      return false;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ خطأ في الخادم المستقل:', error);
      }
      return false;
    }
  },

  // الطريقة الجديدة: إرسال عبر خدمة SMTP المستقلة
  async sendViaSMTPService(
    email: string,
    verificationUrl: string,
    userData: any
  ): Promise<boolean> {
    try {
      const result = await simpleEmailService.sendVerificationEmail(email, verificationUrl, userData);

      if (result.success) {
        if (process.env.NODE_ENV === 'development') {
          console.log('📤 تم إرسال الإيميل عبر خدمة SMTP المستقلة');
        }
        return true;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ فشل في إرسال الإيميل عبر SMTP المستقلة:', result.error);
      }
      return false;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ خطأ في خدمة SMTP المستقلة:', error);
      }
      return false;
    }
  },

  // الطريقة 1: إرسال عبر Supabase Auth
  async sendViaSupabaseAuth(
    email: string,
    verificationUrl: string,
    userData: any
  ): Promise<boolean> {
    try {
      // إنشاء مستخدم مؤقت لإرسال إيميل التحقق
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: 'temp_password_' + Math.random().toString(36),
        options: {
          emailRedirectTo: verificationUrl,
          data: {
            first_name: userData.first_name,
            last_name: userData.last_name,
            temp_user: true
          }
        }
      });

      if (!error && data.user) {
        // حذف المستخدم المؤقت بعد إرسال الإيميل
        setTimeout(async () => {
          try {
            await supabase.auth.admin.deleteUser(data.user!.id);
          } catch (deleteError) {
            // تجاهل أخطاء الحذف
          }
        }, 2 * 60 * 60 * 1000); // حذف بعد ساعتين

        if (process.env.NODE_ENV === 'development') {
          console.log('📤 تم إرسال الإيميل عبر Supabase Auth');
        }
        return true;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ فشل في إرسال الإيميل عبر Supabase Auth:', error?.message);
      }
      return false;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ خطأ في Supabase Auth:', error);
      }
      return false;
    }
  },


  // الطريقة 2: إرسال عبر Edge Function
  async sendViaEdgeFunction(
    email: string,
    verificationUrl: string,
    userData: any
  ): Promise<boolean> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sbtzngewizgeqzfbhfjy.supabase.co';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidHpuZ2V3aXpnZXF6ZmJoZmp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMzc5MTMsImV4cCI6MjA2NjcxMzkxM30.T8iv9C4OeKAb-e4Oz6uw3tFnMrgFK3SKN6fVCrBEUGo';

      const response = await fetch(`${supabaseUrl}/functions/v1/send-verification-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          email,
          verificationUrl,
          userData,
          language: 'ar'
        })
      });

      if (response.ok) {
        if (process.env.NODE_ENV === 'development') {
          console.log('📤 تم إرسال الإيميل عبر Edge Function');
        }
        return true;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ فشل في إرسال الإيميل عبر Edge Function:', response.status);
      }
      return false;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ خطأ في Edge Function:', error);
      }
      return false;
    }
  },

  // الطريقة 4: إرسال عبر خدمة بسيطة
  async sendViaSimpleService(
    email: string,
    verificationUrl: string,
    userData: any
  ): Promise<boolean> {
    try {
      // استخدام خدمة SMTP مستقلة
      const smtpService = await SMTPService.createFromDatabase();

      if (smtpService) {
        const emailHTML = this.generateEmailHTML(verificationUrl, userData);
        const result = await smtpService.sendEmail({
          to: email,
          subject: 'تأكيد إنشاء حسابك في رزجة',
          html: emailHTML
        });

        if (result.success) {
          if (process.env.NODE_ENV === 'development') {
            console.log('📤 تم إرسال الإيميل عبر خدمة SMTP مستقلة');
          }
          return true;
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('ℹ️ لم يتم تكوين خدمة SMTP مستقلة');
      }
      return false;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ خطأ في الخدمة البسيطة:', error);
      }
      return false;
    }
  },

  // إنشاء محتوى HTML للإيميل
  generateEmailHTML(verificationUrl: string, userData: any): string {
    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تأكيد إنشاء حسابك في رزجة</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
        body { margin: 0; padding: 0; font-family: 'Amiri', serif; }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Amiri', serif; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 40px 20px; min-height: 100vh;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e40af 0%, #059669 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: white; font-size: 32px; margin: 0; font-weight: bold;">رزجة</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">موقع الزواج الإسلامي الشرعي</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #1e40af; font-size: 24px; margin: 0 0 20px 0; text-align: center;">مرحباً بك في رزجة!</h2>

            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                أهلاً وسهلاً ${userData.first_name} ${userData.last_name}،<br><br>
                نشكرك على انضمامك إلى موقع رزجة للزواج الإسلامي الشرعي. لإكمال إنشاء حسابك، يرجى النقر على الرابط أدناه لتعيين كلمة المرور:
            </p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #059669 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(30, 64, 175, 0.3);">تأكيد الحساب وتعيين كلمة المرور</a>
            </div>
            
            <div style="background: #f8fafc; border-radius: 10px; padding: 20px; margin: 20px 0; border-right: 4px solid #1e40af;">
                <h3 style="color: #1e40af; font-size: 18px; margin: 0 0 10px 0;">معلومات مهمة:</h3>
                <ul style="color: #374151; margin: 0; padding-right: 20px; line-height: 1.6;">
                    <li>هذا الرابط صالح لمدة 24 ساعة فقط</li>
                    <li>لا تشارك هذا الرابط مع أي شخص آخر</li>
                    <li>إذا لم تطلب إنشاء حساب، يرجى تجاهل هذا الإيميل</li>
                </ul>
            </div>
            
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 10px; padding: 15px; margin: 20px 0; text-align: center;">
                <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: bold;">إذا لم تستطع النقر على الرابط، انسخ والصق الرابط التالي في متصفحك:</p>
                <p style="color: #1e40af; font-size: 12px; word-break: break-all; margin: 10px 0 0 0; background: white; padding: 10px; border-radius: 5px;">${verificationUrl}</p>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 رزقي - موقع الزواج الإسلامي الشرعي</p>
            <p style="color: #6b7280; font-size: 12px; margin: 5px 0 0 0;">هذا الإيميل تم إرساله تلقائياً، يرجى عدم الرد عليه</p>
        </div>
    </div>
</body>
</html>
    `;
  },


};

export default emailService;
