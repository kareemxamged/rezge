/**
 * موجه خدمات الإيميل - يوجه جميع الطلبات للخدمة الحقيقية
 * يحل محل جميع الخدمات القديمة المعقدة
 */

import RealEmailService from './realEmailService';

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
  type?: string;
}

export interface EmailResult {
  success: boolean;
  method?: string;
  messageId?: string;
  error?: string;
  note?: string;
}

/**
 * موجه خدمات الإيميل الموحد
 * يستبدل جميع الخدمات القديمة ويوجه كل شيء للخدمة الحقيقية
 */
export class EmailServiceRouter {
  
  /**
   * إرسال إيميل عام (يوجه للخدمة الحقيقية)
   */
  static async sendEmail(emailData: EmailData, templateData?: any, language?: string): Promise<EmailResult> {
    console.log('📧 EmailServiceRouter: توجيه الطلب للخدمة الحقيقية...');
    return await RealEmailService.sendRealEmail(emailData);
  }

  /**
   * إرسال إيميل تحقق
   */
  static async sendVerificationEmail(
    email: string, 
    verificationUrl: string, 
    userData?: any, 
    language?: string
  ): Promise<EmailResult> {
    const firstName = userData?.first_name || userData?.firstName || 'المستخدم';
    return await RealEmailService.sendVerificationEmail(email, firstName);
  }

  /**
   * إرسال كلمة مرور مؤقتة
   */
  static async sendTemporaryPasswordEmail(
    email: string,
    temporaryPassword: string,
    expiresAt: string,
    recipientName?: string,
    language?: string
  ): Promise<EmailResult> {
    return await RealEmailService.sendTemporaryPassword(
      email, 
      temporaryPassword, 
      recipientName || 'المستخدم'
    );
  }

  /**
   * إرسال رمز التحقق الثنائي
   */
  static async send2FACodeEmail(
    email: string,
    code: string,
    userName?: string,
    language?: string
  ): Promise<EmailResult> {
    return await RealEmailService.sendRealEmail({
      to: email,
      subject: 'رمز التحقق الثنائي - رزقي',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl;">
          <h1 style="color: #1e40af; text-align: center;">🛡️ رمز التحقق الثنائي</h1>
          <p>مرحباً ${userName || 'المستخدم'}،</p>
          <p>رمز التحقق الثنائي الخاص بك هو:</p>
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h2 style="color: #1e40af; font-size: 32px; margin: 0; font-family: monospace;">${code}</h2>
          </div>
          <p style="color: #dc2626;">⚠️ هذا الرمز صالح لمدة 10 دقائق فقط.</p>
        </div>
      `,
      text: `رمز التحقق الثنائي: ${code}. صالح لمدة 10 دقائق.`,
      type: '2fa_code'
    });
  }

  /**
   * إرسال رمز التحقق الإداري
   */
  static async sendAdmin2FACode(
    email: string,
    code: string,
    adminName?: string,
    language?: string
  ): Promise<EmailResult> {
    return await RealEmailService.sendRealEmail({
      to: email,
      subject: 'رمز التحقق الإداري - رزقي',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl;">
          <h1 style="color: #dc2626; text-align: center;">🔐 رمز التحقق الإداري</h1>
          <p>مرحباً ${adminName || 'المدير'}،</p>
          <p>رمز التحقق الإداري الخاص بك هو:</p>
          <div style="background: #fee2e2; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h2 style="color: #dc2626; font-size: 32px; margin: 0; font-family: monospace;">${code}</h2>
          </div>
          <p style="color: #dc2626;">⚠️ هذا رمز إداري حساس. لا تشاركه مع أحد.</p>
        </div>
      `,
      text: `رمز التحقق الإداري: ${code}. لا تشاركه مع أحد.`,
      type: 'admin_2fa'
    });
  }

  /**
   * إرسال تأكيد تغيير الإيميل
   */
  static async sendEmailChangeConfirmation(
    email: string,
    confirmationUrl: string,
    templateData?: any,
    language?: string
  ): Promise<EmailResult> {
    return await RealEmailService.sendRealEmail({
      to: email,
      subject: 'تأكيد تغيير البريد الإلكتروني - رزقي',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl;">
          <h1 style="color: #1e40af; text-align: center;">📧 تأكيد تغيير البريد الإلكتروني</h1>
          <p>تم طلب تغيير البريد الإلكتروني لحسابك في موقع رزقي.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmationUrl}" style="background: #1e40af; color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px;">تأكيد التغيير</a>
          </div>
          <p style="color: #dc2626;">⚠️ إذا لم تطلب هذا التغيير، يرجى تجاهل هذا الإيميل.</p>
        </div>
      `,
      text: `تأكيد تغيير البريد الإلكتروني. رابط التأكيد: ${confirmationUrl}`,
      type: 'email_change_confirmation'
    });
  }

  /**
   * إرسال رمز أمان الإعدادات
   */
  static async sendSecurity2FACode(
    email: string,
    code: string,
    userName?: string,
    language?: string
  ): Promise<EmailResult> {
    return await RealEmailService.sendRealEmail({
      to: email,
      subject: 'رمز أمان الإعدادات - رزقي',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl;">
          <h1 style="color: #f59e0b; text-align: center;">🔒 رمز أمان الإعدادات</h1>
          <p>مرحباً ${userName || 'المستخدم'}،</p>
          <p>رمز الأمان لتعديل الإعدادات هو:</p>
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h2 style="color: #f59e0b; font-size: 32px; margin: 0; font-family: monospace;">${code}</h2>
          </div>
          <p style="color: #dc2626;">⚠️ هذا الرمز صالح لمدة 5 دقائق فقط.</p>
        </div>
      `,
      text: `رمز أمان الإعدادات: ${code}. صالح لمدة 5 دقائق.`,
      type: 'security_2fa'
    });
  }

  /**
   * اختبار النظام
   */
  static async testSystem(email: string = 'kemooamegoo@gmail.com'): Promise<EmailResult> {
    return await RealEmailService.testRealEmailSystem(email);
  }
}

// تصدير كـ AdvancedEmailService للتوافق مع الكود القديم
export const AdvancedEmailService = EmailServiceRouter;

export default EmailServiceRouter;
