import { supabase } from './supabase';
import { userTrustedDeviceService } from './userTrustedDeviceService';
import { simpleEmailService } from './smtpService';
import { emailService } from './emailService';

interface TwoFactorResult {
  success: boolean;
  error?: string;
  requiresVerification?: boolean;
  verificationSent?: boolean;
}

class UserTwoFactorService {
  
  // إرسال كود التحقق الثنائي للمستخدم
  async sendVerificationCode(userId: string, email: string, type: 'login' | 'device_trust' | 'password_reset' = 'login'): Promise<TwoFactorResult> {
    try {
      console.log('📧 Sending 2FA code to user:', userId, 'email:', email);

      // إنشاء كود التحقق
      const codeResult = await userTrustedDeviceService.createVerificationCode(userId, type);
      
      if (!codeResult.success || !codeResult.code) {
        console.error('❌ Failed to create verification code:', codeResult.error);
        return { 
          success: false, 
          error: codeResult.error || 'فشل في إنشاء كود التحقق' 
        };
      }

      // إرسال البريد الإلكتروني
      const emailResult = await this.sendVerificationEmail(email, codeResult.code, type);
      
      if (!emailResult.success) {
        console.error('❌ Failed to send verification email:', emailResult.error);
        return { 
          success: false, 
          error: emailResult.error || 'فشل في إرسال البريد الإلكتروني' 
        };
      }

      console.log('✅ Verification code sent successfully');
      return { 
        success: true, 
        requiresVerification: true,
        verificationSent: true
      };

    } catch (error) {
      console.error('❌ Error in send verification code:', error);
      return { 
        success: false, 
        error: 'حدث خطأ غير متوقع أثناء إرسال كود التحقق' 
      };
    }
  }

  // التحقق من كود التحقق الثنائي
  async verifyCode(userId: string, code: string, type: 'login' | 'device_trust' | 'password_reset' = 'login'): Promise<TwoFactorResult> {
    try {
      console.log('🔍 Verifying 2FA code for user:', userId);

      const result = await userTrustedDeviceService.verifyCode(userId, code, type);
      
      if (!result.success) {
        console.error('❌ Code verification failed:', result.error);
        return { 
          success: false, 
          error: result.error || 'فشل في التحقق من الكود' 
        };
      }

      if (!result.isTrusted) {
        console.log('❌ Invalid or expired code');
        return { 
          success: false, 
          error: 'كود التحقق غير صحيح أو منتهي الصلاحية' 
        };
      }

      console.log('✅ 2FA code verified successfully');
      return { success: true };

    } catch (error) {
      console.error('❌ Error in verify code:', error);
      return { 
        success: false, 
        error: 'حدث خطأ غير متوقع أثناء التحقق من الكود' 
      };
    }
  }

  // إرسال البريد الإلكتروني للتحقق
  private async sendVerificationEmail(email: string, code: string, type: string): Promise<{ success: boolean; error?: string }> {
    try {
      // تحديد نوع الرسالة بناءً على النوع
      let subject = '';
      let message = '';

      switch (type) {
        case 'login':
          subject = 'كود تسجيل الدخول - رزقي';
          message = `
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
              <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #2563eb; margin: 0;">رزقي</h1>
                  <p style="color: #666; margin: 5px 0;">منصة الزواج الإسلامية</p>
                </div>
                
                <h2 style="color: #333; text-align: center; margin-bottom: 20px;">كود تسجيل الدخول</h2>
                
                <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                  السلام عليكم ورحمة الله وبركاته،
                </p>
                
                <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                  تم طلب تسجيل دخول لحسابك في منصة رزقي. استخدم الكود التالي لإكمال عملية تسجيل الدخول:
                </p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                  <h1 style="color: #2563eb; font-size: 32px; letter-spacing: 5px; margin: 0; font-family: monospace;">${code}</h1>
                </div>
                
                <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                  هذا الكود صالح لمدة 10 دقائق فقط. إذا لم تطلب هذا الكود، يرجى تجاهل هذه الرسالة.
                </p>
                
                <div style="background-color: #fef3cd; border: 1px solid #fbbf24; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="color: #92400e; margin: 0; font-size: 14px;">
                    <strong>تنبيه أمني:</strong> لا تشارك هذا الكود مع أي شخص آخر. فريق رزقي لن يطلب منك هذا الكود أبداً.
                  </p>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    © 2025 رزقي - منصة الزواج الإسلامية
                  </p>
                </div>
              </div>
            </div>
          `;
          break;

        case 'device_trust':
          subject = 'كود التحقق من الجهاز - رزقي';
          message = `
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
              <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #2563eb; margin: 0;">رزقي</h1>
                  <p style="color: #666; margin: 5px 0;">منصة الزواج الإسلامية</p>
                </div>
                
                <h2 style="color: #333; text-align: center; margin-bottom: 20px;">كود التحقق من الجهاز</h2>
                
                <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                  تم اكتشاف تسجيل دخول من جهاز جديد. استخدم الكود التالي للتحقق من هوية الجهاز:
                </p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                  <h1 style="color: #2563eb; font-size: 32px; letter-spacing: 5px; margin: 0; font-family: monospace;">${code}</h1>
                </div>
                
                <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                  بعد التحقق، سيتم حفظ هذا الجهاز كجهاز موثوق لمدة 24 ساعة.
                </p>
              </div>
            </div>
          `;
          break;

        case 'password_reset':
          subject = 'كود إعادة تعيين كلمة المرور - رزقي';
          message = `
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
              <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #2563eb; margin: 0;">رزقي</h1>
                  <p style="color: #666; margin: 5px 0;">منصة الزواج الإسلامية</p>
                </div>
                
                <h2 style="color: #333; text-align: center; margin-bottom: 20px;">كود إعادة تعيين كلمة المرور</h2>
                
                <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                  تم طلب إعادة تعيين كلمة المرور لحسابك. استخدم الكود التالي:
                </p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                  <h1 style="color: #2563eb; font-size: 32px; letter-spacing: 5px; margin: 0; font-family: monospace;">${code}</h1>
                </div>
              </div>
            </div>
          `;
          break;
      }

      // استخدام الخادم المستقل (localhost:3001)
      console.log('📧 إرسال كود التحقق عبر الخادم المستقل...');

      try {
        const response = await fetch('http://localhost:3001/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: email,
            subject: subject,
            html: message,
            text: `كود التحقق الخاص بك: ${code}`,
            from: 'manage@kareemamged.com',
            fromName: 'رزقي - موقع الزواج الإسلامي'
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            console.log('✅ تم إرسال الكود عبر الخادم المستقل');
            return { success: true };
          }
        }
      } catch (error) {
        console.warn('⚠️ فشل الاتصال بالخادم المستقل:', error);
      }

      console.warn('⚠️ فشل الخادم المستقل، محاولة بديلة...');
      return await this.sendEmailFallback(email, subject, message);

    } catch (error) {
      console.error('❌ Error in send verification email:', error);
      
      // محاولة بديلة
      return await this.sendEmailFallback(email, subject, message);
    }
  }


  // طريقة بديلة لإرسال البريد الإلكتروني
  private async sendEmailFallback(email: string, subject: string, message: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📧 Attempting fallback email sending method');
      
      // يمكن هنا استخدام خدمة بريد إلكتروني أخرى مثل SendGrid أو Mailgun
      // للآن سنعتبر أن الإرسال نجح (في بيئة التطوير)
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Development mode - Email would be sent to:', email);
        console.log('📧 Subject:', subject);
        console.log('📧 Code would be sent via email');
        return { success: true };
      }

      // في بيئة الإنتاج، يجب تنفيذ خدمة بريد إلكتروني حقيقية
      return { 
        success: false, 
        error: 'خدمة البريد الإلكتروني غير متاحة حالياً' 
      };

    } catch (error) {
      console.error('❌ Error in email fallback:', error);
      return { 
        success: false, 
        error: 'فشل في إرسال البريد الإلكتروني' 
      };
    }
  }

  // فحص ما إذا كان المستخدم بحاجة للتحقق الثنائي
  async needsTwoFactorVerification(userId: string): Promise<{ needsVerification: boolean; reason?: string }> {
    try {
      // فحص ما إذا كان الجهاز موثوق
      const deviceResult = await userTrustedDeviceService.isDeviceTrusted(userId);
      
      if (!deviceResult.success) {
        console.error('❌ Error checking device trust:', deviceResult.error);
        // في حالة الخطأ، نطلب التحقق للأمان
        return { needsVerification: true, reason: 'error_checking_device' };
      }

      if (deviceResult.isTrusted) {
        console.log('✅ Device is trusted, skipping 2FA');
        return { needsVerification: false };
      }

      console.log('⚠️ Device is not trusted, 2FA required');
      return { needsVerification: true, reason: 'untrusted_device' };

    } catch (error) {
      console.error('❌ Error in needs two factor verification:', error);
      // في حالة الخطأ، نطلب التحقق للأمان
      return { needsVerification: true, reason: 'error' };
    }
  }

  // تنظيف أكواد التحقق المنتهية الصلاحية
  async cleanupExpiredCodes(): Promise<void> {
    try {
      const { data, error } = await supabase
        .rpc('cleanup_expired_user_verification_codes');

      if (error) {
        console.error('❌ Error cleaning up expired codes:', error);
      } else {
        console.log('🧹 Cleaned up', data, 'expired verification codes');
      }
    } catch (error) {
      console.error('❌ Error in cleanup expired codes:', error);
    }
  }
}

export const userTwoFactorService = new UserTwoFactorService();
export type { TwoFactorResult };
