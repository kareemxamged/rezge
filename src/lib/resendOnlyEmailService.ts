/**
 * خدمة الإرسال البريدي المبسطة - Resend فقط
 * تستخدم Resend API كخدمة احترافية وحيدة
 */

import { RESEND_CONFIG } from '../config/smtpConfig';

// أنواع البيانات
export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
  type: 'verification' | 'temporary_password' | '2fa_code' | 'admin_2fa' | 'email_change_confirmation' | 'security_2fa';
}

export class ResendOnlyEmailService {
  
  /**
   * إرسال إيميل باستخدام Resend API فقط
   */
  static async sendEmail(emailData: EmailData): Promise<{ success: boolean; error?: string; method?: string }> {
    console.log('📧 بدء إرسال الإيميل عبر Resend API...');
    console.log(`📬 إلى: ${emailData.to}`);
    console.log(`📝 الموضوع: ${emailData.subject}`);
    console.log('');

    try {
      const config = RESEND_CONFIG;
      
      if (!config.enabled) {
        throw new Error('Resend API غير مفعل');
      }

      if (!config.apiKey) {
        throw new Error('مفتاح Resend API غير موجود');
      }

      console.log('🚀 إرسال عبر Resend API...');

      // محاولة أولى مع النطاق المخصص (إذا كان متاحاً)
      let response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${config.senderName} <${config.customDomain || config.senderEmail}>`,
          to: [emailData.to],
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        })
      });

      // إذا فشل النطاق المخصص، جرب النطاق الافتراضي
      if (!response.ok && config.customDomain) {
        console.log('⚠️ فشل النطاق المخصص، محاولة مع النطاق الافتراضي...');
        response = await fetch(config.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${config.senderName} <${config.senderEmail}>`,
            to: [emailData.to],
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text,
          })
        });
      }

      if (response.ok) {
        const result = await response.json();
        console.log('✅ تم إرسال الإيميل بنجاح عبر Resend API');
        console.log('📧 معرف الإيميل:', result.id);
        return { success: true, method: 'Resend API' };
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP ${response.status}`;
        console.log('❌ فشل الإرسال عبر Resend API:', errorMessage);
        return { success: false, error: errorMessage, method: 'Resend API' };
      }

    } catch (error) {
      console.log('❌ خطأ في الإرسال عبر Resend API:', error);
      return { 
        success: false, 
        error: `خطأ في الاتصال: ${error}`,
        method: 'Resend API'
      };
    }
  }

  /**
   * إرسال إيميل التحقق
   */
  static async sendVerificationEmail(
    email: string,
    verificationUrl: string,
    userData: { first_name: string; last_name: string; email?: string },
    language: 'ar' | 'en' = 'ar'
  ): Promise<{ success: boolean; error?: string }> {
    const template = this.generateEmailTemplate({
      type: 'verification',
      verificationUrl,
      userData,
      language
    });

    const emailData: EmailData = {
      to: email,
      subject: template.subject,
      html: template.htmlContent,
      text: template.textContent,
      type: 'verification'
    };

    return await this.sendEmail(emailData);
  }

  /**
   * إرسال كلمة المرور المؤقتة
   */
  static async sendTemporaryPasswordEmail(
    email: string,
    temporaryPassword: string,
    expiresAt: string,
    recipientName: string,
    language: 'ar' | 'en' = 'ar'
  ): Promise<{ success: boolean; error?: string }> {
    const template = this.generateEmailTemplate({
      type: 'temporary_password',
      temporaryPassword,
      expiresAt,
      recipientName,
      language
    });

    const emailData: EmailData = {
      to: email,
      subject: template.subject,
      html: template.htmlContent,
      text: template.textContent,
      type: 'temporary_password'
    };

    return await this.sendEmail(emailData);
  }

  /**
   * إرسال رمز التحقق الثنائي
   */
  static async send2FACode(
    email: string,
    code: string,
    recipientName: string,
    language: 'ar' | 'en' = 'ar'
  ): Promise<{ success: boolean; error?: string }> {
    const template = this.generateEmailTemplate({
      type: '2fa_code',
      code,
      recipientName,
      language
    });

    const emailData: EmailData = {
      to: email,
      subject: template.subject,
      html: template.htmlContent,
      text: template.textContent,
      type: '2fa_code'
    };

    return await this.sendEmail(emailData);
  }

  /**
   * إرسال رمز التحقق الإداري
   */
  static async sendAdmin2FACode(
    email: string,
    code: string,
    adminName: string,
    language: 'ar' | 'en' = 'ar'
  ): Promise<{ success: boolean; error?: string }> {
    const template = this.generateEmailTemplate({
      type: 'admin_2fa',
      code,
      adminName,
      language
    });

    const emailData: EmailData = {
      to: email,
      subject: template.subject,
      html: template.htmlContent,
      text: template.textContent,
      type: 'admin_2fa'
    };

    return await this.sendEmail(emailData);
  }

  /**
   * إرسال تأكيد تغيير البريد الإلكتروني
   */
  static async sendEmailChangeConfirmation(
    email: string,
    confirmationUrl: string,
    newEmail: string,
    currentEmail: string,
    language: 'ar' | 'en' = 'ar'
  ): Promise<{ success: boolean; error?: string }> {
    const template = this.generateEmailTemplate({
      type: 'email_change_confirmation',
      confirmationUrl,
      newEmail,
      currentEmail,
      language
    });

    const emailData: EmailData = {
      to: email,
      subject: template.subject,
      html: template.htmlContent,
      text: template.textContent,
      type: 'email_change_confirmation'
    };

    return await this.sendEmail(emailData);
  }

  /**
   * إرسال رمز أمان الإعدادات
   */
  static async sendSecurity2FACode(
    email: string,
    code: string,
    recipientName: string,
    language: 'ar' | 'en' = 'ar'
  ): Promise<{ success: boolean; error?: string }> {
    const template = this.generateEmailTemplate({
      type: 'security_2fa',
      code,
      recipientName,
      language
    });

    const emailData: EmailData = {
      to: email,
      subject: template.subject,
      html: template.htmlContent,
      text: template.textContent,
      type: 'security_2fa'
    };

    return await this.sendEmail(emailData);
  }

  /**
   * إنشاء تيمبليت الإيميل
   */
  private static generateEmailTemplate(params: any): { subject: string; htmlContent: string; textContent: string } {
    const isRTL = params.language === 'ar';
    const baseTemplate = this.getBaseTemplate(isRTL);

    switch (params.type) {
      case 'verification':
        return this.createVerificationTemplate(params, params.language, baseTemplate);
      case 'temporary_password':
        return this.createTemporaryPasswordTemplate(params, params.language, baseTemplate);
      case '2fa_code':
        return this.create2FATemplate(params, params.language, baseTemplate);
      case 'admin_2fa':
        return this.createAdmin2FATemplate(params, params.language, baseTemplate);
      case 'email_change_confirmation':
        return this.createEmailChangeTemplate(params, params.language, baseTemplate);
      case 'security_2fa':
        return this.createSecurity2FATemplate(params, params.language, baseTemplate);
      default:
        throw new Error(`Unsupported email type: ${params.type}`);
    }
  }

  /**
   * قالب HTML أساسي متقدم
   */
  private static getBaseTemplate(isRTL: boolean): string {
    const direction = isRTL ? 'rtl' : 'ltr';
    const fontFamily = isRTL ? "'Amiri', serif" : "'Inter', sans-serif";
    const fontUrl = isRTL
      ? 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap'
      : 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap';

    return `
<!DOCTYPE html>
<html dir="${direction}" lang="${isRTL ? 'ar' : 'en'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}}</title>
    <style>
        @import url('${fontUrl}');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            margin: 0;
            padding: 0;
            font-family: ${fontFamily};
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            padding: 40px 20px;
            min-height: 100vh;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
            border: 1px solid #e2e8f0;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/><circle cx="10" cy="50" r="0.5" fill="white" opacity="0.1"/><circle cx="90" cy="30" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
        }
        .logo {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
        }
        .tagline {
            font-size: 1.1em;
            opacity: 0.9;
            position: relative;
            z-index: 1;
        }
        .content {
            padding: 40px 30px;
            line-height: 1.8;
            color: #374151;
        }
        .greeting {
            font-size: 1.3em;
            color: #1f2937;
            margin-bottom: 20px;
            font-weight: 600;
        }
        .main-content {
            background: #f8fafc;
            border-radius: 15px;
            padding: 30px;
            margin: 25px 0;
            border-left: 5px solid #667eea;
        }
        .highlight-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            margin: 20px 0;
            font-size: 1.1em;
            font-weight: 600;
        }
        .code-display {
            background: #1f2937;
            color: #10b981;
            font-family: 'Courier New', monospace;
            font-size: 2em;
            font-weight: bold;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            margin: 20px 0;
            letter-spacing: 8px;
            border: 3px solid #10b981;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 600;
            margin: 20px 0;
            transition: transform 0.2s;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }
        .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        .warning {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            color: #92400e;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
        }
        .footer {
            background: #f8fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            color: #6b7280;
            font-size: 0.9em;
        }
        .footer-links {
            margin: 15px 0;
        }
        .footer-links a {
            color: #667eea;
            text-decoration: none;
            margin: 0 10px;
        }
        .social-links {
            margin: 20px 0;
        }
        .social-links a {
            display: inline-block;
            margin: 0 10px;
            color: #667eea;
            font-size: 1.2em;
        }
        @media (max-width: 600px) {
            .email-container { margin: 10px; border-radius: 15px; }
            .header { padding: 30px 20px; }
            .content { padding: 30px 20px; }
            .logo { font-size: 2em; }
            .code-display { font-size: 1.5em; letter-spacing: 4px; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">{{LOGO}}</div>
            <div class="tagline">{{TAGLINE}}</div>
        </div>
        <div class="content">
            {{CONTENT}}
        </div>
        <div class="footer">
            <div class="footer-links">
                <a href="https://rezge.com">الموقع الرئيسي</a> |
                <a href="https://rezge.com/privacy">سياسة الخصوصية</a> |
                <a href="https://rezge.com/terms">شروط الاستخدام</a>
            </div>
            <div class="social-links">
                <a href="#">📧</a>
                <a href="#">📱</a>
                <a href="#">🌐</a>
            </div>
            <p>هذا إيميل تلقائي، يرجى عدم الرد عليه.</p>
            <p>للاستفسارات: manage@kareemamged.com</p>
            <p style="margin-top: 15px; font-size: 0.8em; color: #9ca3af;">
                © 2025 رزقي - موقع الزواج الإسلامي. جميع الحقوق محفوظة.
            </p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * تيمبليت إيميل التحقق
   */
  private static createVerificationTemplate(data: any, language: string, baseTemplate: string) {
    const isArabic = language === 'ar';

    const content = isArabic ? `
      <div class="greeting">مرحباً ${data.firstName || 'عزيزي المستخدم'}</div>
      <p>شكراً لك على التسجيل في موقع رزقي للزواج الإسلامي!</p>
      <div class="main-content">
        <h3 style="color: #667eea; margin-bottom: 15px;">تأكيد إنشاء حسابك</h3>
        <p>لإكمال عملية التسجيل وتفعيل حسابك، يرجى النقر على الزر أدناه:</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${data.verificationUrl}" class="button">تأكيد الحساب</a>
        </div>
        <div class="warning">
          <strong>مهم:</strong> هذا الرابط صالح لمدة 24 ساعة فقط من وقت إرسال هذا الإيميل.
        </div>
      </div>
      <p>إذا لم تقم بإنشاء هذا الحساب، يرجى تجاهل هذا الإيميل.</p>
    ` : `
      <div class="greeting">Hello ${data.firstName || 'Dear User'}</div>
      <p>Thank you for registering on Rezge Islamic Marriage Site!</p>
      <div class="main-content">
        <h3 style="color: #667eea; margin-bottom: 15px;">Confirm Your Account</h3>
        <p>To complete your registration and activate your account, please click the button below:</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${data.verificationUrl}" class="button">Confirm Account</a>
        </div>
        <div class="warning">
          <strong>Important:</strong> This link is valid for 24 hours only from the time this email was sent.
        </div>
      </div>
      <p>If you did not create this account, please ignore this email.</p>
    `;

    const subject = isArabic ? 'تأكيد إنشاء حسابك في رزقي' : 'Confirm Your Rezge Account';
    const logo = isArabic ? '💍 رزقي' : '💍 Rezge';
    const tagline = isArabic ? 'موقع الزواج الإسلامي' : 'Islamic Marriage Site';

    const htmlContent = baseTemplate
      .replace('{{TITLE}}', subject)
      .replace('{{LOGO}}', logo)
      .replace('{{TAGLINE}}', tagline)
      .replace('{{CONTENT}}', content);

    const textContent = isArabic ?
      `مرحباً ${data.firstName || 'عزيزي المستخدم'}\n\nشكراً لك على التسجيل في موقع رزقي!\n\nلتأكيد حسابك، يرجى زيارة الرابط التالي:\n${data.verificationUrl}\n\nهذا الرابط صالح لمدة 24 ساعة فقط.\n\nفريق رزقي` :
      `Hello ${data.firstName || 'Dear User'}\n\nThank you for registering on Rezge!\n\nTo confirm your account, please visit:\n${data.verificationUrl}\n\nThis link is valid for 24 hours only.\n\nRezge Team`;

    return { subject, htmlContent, textContent };
  }

  /**
   * تيمبليت كلمة المرور المؤقتة
   */
  private static createTemporaryPasswordTemplate(data: any, language: string, baseTemplate: string) {
    const isArabic = language === 'ar';

    const content = isArabic ? `
      <div class="greeting">مرحباً ${data.recipientName || 'عزيزي المستخدم'}</div>
      <p>تم إنشاء كلمة مرور مؤقتة لحسابك في موقع رزقي.</p>
      <div class="main-content">
        <h3 style="color: #667eea; margin-bottom: 15px;">كلمة المرور المؤقتة</h3>
        <div class="code-display">${data.temporaryPassword}</div>
        <div class="warning">
          <strong>مهم:</strong> هذه كلمة مرور مؤقتة تنتهي صلاحيتها في: ${new Date(data.expiresAt).toLocaleString('ar-SA')}
        </div>
        <p><strong>خطوات الاستخدام:</strong></p>
        <ol style="margin: 15px 0; padding-right: 20px;">
          <li>استخدم كلمة المرور المؤقتة أعلاه لتسجيل الدخول</li>
          <li>بعد تسجيل الدخول، قم بتغيير كلمة المرور فوراً</li>
          <li>اختر كلمة مرور قوية وآمنة</li>
        </ol>
      </div>
      <p>إذا لم تطلب هذه كلمة المرور، يرجى تجاهل هذا الإيميل أو التواصل معنا.</p>
    ` : `
      <div class="greeting">Hello ${data.recipientName || 'Dear User'}</div>
      <p>A temporary password has been created for your Rezge account.</p>
      <div class="main-content">
        <h3 style="color: #667eea; margin-bottom: 15px;">Temporary Password</h3>
        <div class="code-display">${data.temporaryPassword}</div>
        <div class="warning">
          <strong>Important:</strong> This temporary password expires on: ${new Date(data.expiresAt).toLocaleString('en-US')}
        </div>
        <p><strong>Usage Steps:</strong></p>
        <ol style="margin: 15px 0; padding-left: 20px;">
          <li>Use the temporary password above to log in</li>
          <li>After logging in, change your password immediately</li>
          <li>Choose a strong and secure password</li>
        </ol>
      </div>
      <p>If you did not request this password, please ignore this email or contact us.</p>
    `;

    const subject = isArabic ? 'كلمة المرور المؤقتة - رزقي' : 'Temporary Password - Rezge';
    const logo = isArabic ? '🔐 رزقي' : '🔐 Rezge';
    const tagline = isArabic ? 'كلمة مرور مؤقتة' : 'Temporary Password';

    const htmlContent = baseTemplate
      .replace('{{TITLE}}', subject)
      .replace('{{LOGO}}', logo)
      .replace('{{TAGLINE}}', tagline)
      .replace('{{CONTENT}}', content);

    const textContent = isArabic ?
      `مرحباً ${data.recipientName || 'عزيزي المستخدم'}\n\nكلمة المرور المؤقتة: ${data.temporaryPassword}\n\nتنتهي صلاحيتها في: ${new Date(data.expiresAt).toLocaleString('ar-SA')}\n\nيرجى تغيير كلمة المرور بعد تسجيل الدخول.\n\nفريق رزقي` :
      `Hello ${data.recipientName || 'Dear User'}\n\nTemporary Password: ${data.temporaryPassword}\n\nExpires: ${new Date(data.expiresAt).toLocaleString('en-US')}\n\nPlease change your password after logging in.\n\nRezge Team`;

    return { subject, htmlContent, textContent };
  }

  /**
   * تيمبليت رمز التحقق الثنائي
   */
  private static create2FATemplate(data: any, language: string, baseTemplate: string) {
    const isArabic = language === 'ar';

    const content = isArabic ? `
      <div class="greeting">مرحباً ${data.recipientName || 'عزيزي المستخدم'}</div>
      <p>تم طلب رمز تحقق ثنائي لحسابك في موقع رزقي.</p>
      <div class="main-content">
        <h3 style="color: #667eea; margin-bottom: 15px;">رمز التحقق الثنائي</h3>
        <div class="code-display">${data.code}</div>
        <div class="warning">
          <strong>مهم:</strong> هذا الرمز صالح لمدة 15 دقيقة فقط.
        </div>
      </div>
      <p>إذا لم تطلب هذا الرمز، يرجى تجاهل هذا الإيميل.</p>
    ` : `
      <div class="greeting">Hello ${data.recipientName || 'Dear User'}</div>
      <p>A two-factor authentication code has been requested for your Rezge account.</p>
      <div class="main-content">
        <h3 style="color: #667eea; margin-bottom: 15px;">Two-Factor Authentication Code</h3>
        <div class="code-display">${data.code}</div>
        <div class="warning">
          <strong>Important:</strong> This code is valid for 15 minutes only.
        </div>
      </div>
      <p>If you did not request this code, please ignore this email.</p>
    `;

    const subject = isArabic ? 'رمز التحقق الثنائي - رزقي' : '2FA Code - Rezge';
    const logo = isArabic ? '🔐 رزقي' : '🔐 Rezge';
    const tagline = isArabic ? 'رمز التحقق الثنائي' : 'Two-Factor Authentication';

    const htmlContent = baseTemplate
      .replace('{{TITLE}}', subject)
      .replace('{{LOGO}}', logo)
      .replace('{{TAGLINE}}', tagline)
      .replace('{{CONTENT}}', content);

    const textContent = isArabic ?
      `رمز التحقق الثنائي: ${data.code}\n\nصالح لمدة 15 دقيقة فقط.\n\nفريق رزقي` :
      `2FA Code: ${data.code}\n\nValid for 15 minutes only.\n\nRezge Team`;

    return { subject, htmlContent, textContent };
  }

  /**
   * تيمبليت رمز التحقق الإداري
   */
  private static createAdmin2FATemplate(data: any, language: string, baseTemplate: string) {
    const isArabic = language === 'ar';

    const content = isArabic ? `
      <div class="greeting">مرحباً ${data.adminName || 'عزيزي المشرف'}</div>
      <p>تم طلب رمز تحقق إداري لحسابك في لوحة تحكم رزقي.</p>
      <div class="main-content">
        <h3 style="color: #667eea; margin-bottom: 15px;">رمز التحقق الإداري</h3>
        <div class="code-display">${data.code}</div>
        <div class="warning">
          <strong>مهم:</strong> هذا الرمز صالح لمدة 10 دقائق فقط.
        </div>
      </div>
      <p>إذا لم تطلب هذا الرمز، يرجى التواصل مع فريق الأمان فوراً.</p>
    ` : `
      <div class="greeting">Hello ${data.adminName || 'Dear Admin'}</div>
      <p>An admin verification code has been requested for your Rezge admin account.</p>
      <div class="main-content">
        <h3 style="color: #667eea; margin-bottom: 15px;">Admin Verification Code</h3>
        <div class="code-display">${data.code}</div>
        <div class="warning">
          <strong>Important:</strong> This code is valid for 10 minutes only.
        </div>
      </div>
      <p>If you did not request this code, please contact the security team immediately.</p>
    `;

    const subject = isArabic ? 'رمز التحقق الإداري - رزقي' : 'Admin Verification Code - Rezge';
    const logo = isArabic ? '👨‍💼 رزقي' : '👨‍💼 Rezge';
    const tagline = isArabic ? 'رمز التحقق الإداري' : 'Admin Verification';

    const htmlContent = baseTemplate
      .replace('{{TITLE}}', subject)
      .replace('{{LOGO}}', logo)
      .replace('{{TAGLINE}}', tagline)
      .replace('{{CONTENT}}', content);

    const textContent = isArabic ?
      `رمز التحقق الإداري: ${data.code}\n\nصالح لمدة 10 دقائق فقط.\n\nفريق رزقي` :
      `Admin Code: ${data.code}\n\nValid for 10 minutes only.\n\nRezge Team`;

    return { subject, htmlContent, textContent };
  }

  /**
   * تيمبليت تأكيد تغيير الإيميل
   */
  private static createEmailChangeTemplate(data: any, language: string, baseTemplate: string) {
    const isArabic = language === 'ar';

    const content = isArabic ? `
      <div class="greeting">مرحباً</div>
      <p>تم طلب تغيير البريد الإلكتروني لحسابك في موقع رزقي.</p>
      <div class="main-content">
        <h3 style="color: #667eea; margin-bottom: 15px;">تأكيد تغيير البريد الإلكتروني</h3>
        <p><strong>من:</strong> ${data.currentEmail}</p>
        <p><strong>إلى:</strong> ${data.newEmail}</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${data.confirmationUrl}" class="button">تأكيد التغيير</a>
        </div>
        <div class="warning">
          <strong>مهم:</strong> هذا الرابط صالح لمدة 24 ساعة فقط.
        </div>
      </div>
      <p>إذا لم تطلب هذا التغيير، يرجى تجاهل هذا الإيميل.</p>
    ` : `
      <div class="greeting">Hello</div>
      <p>An email change has been requested for your Rezge account.</p>
      <div class="main-content">
        <h3 style="color: #667eea; margin-bottom: 15px;">Confirm Email Change</h3>
        <p><strong>From:</strong> ${data.currentEmail}</p>
        <p><strong>To:</strong> ${data.newEmail}</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${data.confirmationUrl}" class="button">Confirm Change</a>
        </div>
        <div class="warning">
          <strong>Important:</strong> This link is valid for 24 hours only.
        </div>
      </div>
      <p>If you did not request this change, please ignore this email.</p>
    `;

    const subject = isArabic ? 'تأكيد تغيير البريد الإلكتروني - رزقي' : 'Confirm Email Change - Rezge';
    const logo = isArabic ? '📧 رزقي' : '📧 Rezge';
    const tagline = isArabic ? 'تأكيد تغيير البريد الإلكتروني' : 'Email Change Confirmation';

    const htmlContent = baseTemplate
      .replace('{{TITLE}}', subject)
      .replace('{{LOGO}}', logo)
      .replace('{{TAGLINE}}', tagline)
      .replace('{{CONTENT}}', content);

    const textContent = isArabic ?
      `تأكيد تغيير البريد الإلكتروني\n\nمن: ${data.currentEmail}\nإلى: ${data.newEmail}\n\nرابط التأكيد: ${data.confirmationUrl}\n\nفريق رزقي` :
      `Email Change Confirmation\n\nFrom: ${data.currentEmail}\nTo: ${data.newEmail}\n\nConfirmation Link: ${data.confirmationUrl}\n\nRezge Team`;

    return { subject, htmlContent, textContent };
  }

  /**
   * تيمبليت رمز أمان الإعدادات
   */
  private static createSecurity2FATemplate(data: any, language: string, baseTemplate: string) {
    const isArabic = language === 'ar';

    const content = isArabic ? `
      <div class="greeting">مرحباً ${data.recipientName || 'عزيزي المستخدم'}</div>
      <p>تم طلب رمز أمان لتأكيد تغيير إعدادات الأمان في حسابك.</p>
      <div class="main-content">
        <h3 style="color: #667eea; margin-bottom: 15px;">رمز أمان الإعدادات</h3>
        <div class="code-display">${data.code}</div>
        <div class="warning">
          <strong>مهم:</strong> هذا الرمز صالح لمدة 15 دقيقة فقط.
        </div>
      </div>
      <p>إذا لم تطلب هذا الرمز، يرجى تجاهل هذا الإيميل.</p>
    ` : `
      <div class="greeting">Hello ${data.recipientName || 'Dear User'}</div>
      <p>A security code has been requested to confirm security settings changes in your account.</p>
      <div class="main-content">
        <h3 style="color: #667eea; margin-bottom: 15px;">Security Settings Code</h3>
        <div class="code-display">${data.code}</div>
        <div class="warning">
          <strong>Important:</strong> This code is valid for 15 minutes only.
        </div>
      </div>
      <p>If you did not request this code, please ignore this email.</p>
    `;

    const subject = isArabic ? 'رمز أمان الإعدادات - رزقي' : 'Security Settings Code - Rezge';
    const logo = isArabic ? '🔒 رزقي' : '🔒 Rezge';
    const tagline = isArabic ? 'رمز أمان الإعدادات' : 'Security Settings';

    const htmlContent = baseTemplate
      .replace('{{TITLE}}', subject)
      .replace('{{LOGO}}', logo)
      .replace('{{TAGLINE}}', tagline)
      .replace('{{CONTENT}}', content);

    const textContent = isArabic ?
      `رمز أمان الإعدادات: ${data.code}\n\nصالح لمدة 15 دقيقة فقط.\n\nفريق رزقي` :
      `Security Code: ${data.code}\n\nValid for 15 minutes only.\n\nRezge Team`;

    return { subject, htmlContent, textContent };
  }
}

export default ResendOnlyEmailService;
