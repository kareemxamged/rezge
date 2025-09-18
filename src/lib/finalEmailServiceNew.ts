// خدمة إرسال الإيميلات المتقدمة - نظام شامل للإشعارات البريدية
// تدعم جميع أنواع الإشعارات مع تيمبليت HTML متقدمة
// تستخدم التيمبليت الكامل من النظام القديم مع الخدمة الحقيقية

import RealEmailService from './realEmailService.ts';
import { createVerificationTemplate, createEmailChangeTemplate, create2FATemplate } from './emailTemplates.ts';

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
}

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
  type: 'verification' | 'temporary_password' | '2fa_code' | 'admin_2fa' | 'email_change_confirmation' | 'security_2fa';
}

// إعادة توجيه للخدمة الحقيقية
export class AdvancedEmailService {
  
  /**
   * إرسال إيميل عام - موجه للخدمة الحقيقية مع تيمبليت كامل
   */
  static async sendEmail(emailData: EmailData, templateData?: any, language?: string): Promise<any> {
    console.log('📧 AdvancedEmailService: إنشاء تيمبليت كامل وإرسال عبر الخدمة الحقيقية...');

    // إنشاء التيمبليت الكامل
    const template = this.generateEmailTemplate(emailData.type, templateData || {}, language as 'ar' | 'en' || 'ar');

    // إرسال الإيميل مع التيمبليت الكامل
    return await RealEmailService.sendRealEmail({
      to: emailData.to,
      subject: template.subject,
      html: template.htmlContent,
      text: template.textContent,
      type: emailData.type
    });
  }

  /**
   * إرسال إيميل تحقق - موجه للخدمة الحقيقية
   */
  static async sendVerificationEmail(email: string, verificationUrl: string, userData?: any, language?: string): Promise<any> {
    console.log('📧 AdvancedEmailService: إرسال إيميل تحقق عبر الخدمة الحقيقية...');
    const firstName = userData?.first_name || userData?.firstName || 'المستخدم';
    return await RealEmailService.sendVerificationEmail(email, firstName);
  }

  /**
   * إرسال كلمة مرور مؤقتة - موجه للخدمة الحقيقية مع تيمبليت كامل
   */
  static async sendTemporaryPasswordEmail(email: string, temporaryPassword: string, expiresAt: string, recipientName?: string, language?: string): Promise<any> {
    console.log('📧 AdvancedEmailService: إرسال كلمة مرور مؤقتة مع تيمبليت كامل...');

    const template = this.generateEmailTemplate('temporary_password', {
      temporaryPassword,
      expiresAt,
      recipientName
    }, language as 'ar' | 'en' || 'ar');

    return await RealEmailService.sendRealEmail({
      to: email,
      subject: template.subject,
      html: template.htmlContent,
      text: template.textContent,
      type: 'temporary_password'
    });
  }

  /**
   * إرسال رمز التحقق الثنائي - موجه للخدمة الحقيقية
   */
  static async send2FACodeEmail(email: string, code: string, userName?: string, language?: string): Promise<any> {
    console.log('📧 AdvancedEmailService: إرسال رمز 2FA مع تيمبليت كامل...');

    const template = this.generateEmailTemplate('2fa_code', {
      code,
      codeType: 'login',
      expiresInMinutes: 15
    }, language as 'ar' | 'en' || 'ar');

    return await RealEmailService.sendRealEmail({
      to: email,
      subject: template.subject,
      html: template.htmlContent,
      text: template.textContent,
      type: '2fa_code'
    });
  }

  /**
   * إرسال رمز التحقق الإداري - موجه للخدمة الحقيقية مع تيمبليت كامل
   */
  static async sendAdmin2FACode(email: string, code: string, adminName?: string, language?: string): Promise<any> {
    console.log('📧 AdvancedEmailService: إرسال رمز إداري مع تيمبليت كامل...');

    const template = this.generateEmailTemplate('admin_2fa', {
      code,
      adminName,
      expiresInMinutes: 10
    }, language as 'ar' | 'en' || 'ar');

    return await RealEmailService.sendRealEmail({
      to: email,
      subject: template.subject,
      html: template.htmlContent,
      text: template.textContent,
      type: 'admin_2fa'
    });
  }

  /**
   * إرسال تأكيد تغيير الإيميل - موجه للخدمة الحقيقية مع تيمبليت كامل
   */
  static async sendEmailChangeConfirmation(email: string, confirmationUrl: string, templateData?: any, language?: string): Promise<any> {
    console.log('📧 AdvancedEmailService: إرسال تأكيد تغيير الإيميل مع تيمبليت كامل...');

    const template = this.generateEmailTemplate('email_change_confirmation', {
      confirmationUrl,
      ...templateData
    }, language as 'ar' | 'en' || 'ar');

    return await RealEmailService.sendRealEmail({
      to: email,
      subject: template.subject,
      html: template.htmlContent,
      text: template.textContent,
      type: 'email_change_confirmation'
    });
  }

  /**
   * إرسال رمز أمان الإعدادات - موجه للخدمة الحقيقية مع تيمبليت كامل
   */
  static async sendSecurity2FACode(email: string, code: string, userName?: string, language?: string): Promise<any> {
    console.log('📧 AdvancedEmailService: إرسال رمز أمان الإعدادات مع تيمبليت كامل...');

    const template = this.generateEmailTemplate('security_2fa', {
      code,
      action: 'تعديل إعدادات الأمان',
      expiresInMinutes: 15
    }, language as 'ar' | 'en' || 'ar');

    return await RealEmailService.sendRealEmail({
      to: email,
      subject: template.subject,
      html: template.htmlContent,
      text: template.textContent,
      type: 'security_2fa'
    });
  }

  /**
   * اختبار النظام - موجه للخدمة الحقيقية
   */
  static async testSystem(email: string = 'kemooamegoo@gmail.com'): Promise<any> {
    console.log('📧 AdvancedEmailService: اختبار النظام عبر الخدمة الحقيقية...');
    return await RealEmailService.testRealEmailSystem(email);
  }

  /**
   * إنشاء تيمبليت HTML متقدم للإيميلات
   */
  static generateEmailTemplate(
    type: EmailData['type'],
    data: any,
    language: 'ar' | 'en' = 'ar'
  ): EmailTemplate {
    const baseTemplate = this.getBaseTemplate(language === 'ar');

    switch (type) {
      case 'verification':
        return createVerificationTemplate(data, language, baseTemplate);
      case 'temporary_password':
        return this.createTemporaryPasswordTemplate(data, language, baseTemplate);
      case '2fa_code':
        return create2FATemplate(data, language, baseTemplate);
      case 'admin_2fa':
        return this.createAdmin2FATemplate(data, language, baseTemplate);
      case 'email_change_confirmation':
        return createEmailChangeTemplate(data, language, baseTemplate);
      case 'security_2fa':
        return this.createSecurity2FATemplate(data, language, baseTemplate);
      default:
        throw new Error(`Unsupported email type: ${type}`);
    }
  }

  /**
   * القالب الأساسي الموحد للإيميلات - محسن مع دعم كامل للعربية والإنجليزية
   */
  private static getBaseTemplate(isRTL: boolean = true): string {
    const direction = isRTL ? 'rtl' : 'ltr';
    const textAlign = isRTL ? 'right' : 'left';
    const fontFamily = isRTL ? 'Tahoma, Arial, sans-serif' : 'Arial, Helvetica, sans-serif';

    return `
      <!DOCTYPE html>
      <html dir="${direction}" lang="${isRTL ? 'ar' : 'en'}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{{TITLE}}</title>
        <style>
          body {
            font-family: ${fontFamily};
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
            direction: ${direction};
            text-align: ${textAlign};
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
          }
          .content {
            padding: 40px 30px;
          }
          .greeting {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 20px;
            color: #667eea;
          }
          .main-content {
            background: #f8f9ff;
            padding: 25px;
            border-radius: 8px;
            margin: 25px 0;
            border-${isRTL ? 'right' : 'left'}: 4px solid #667eea;
          }
          .code-display {
            background: #667eea;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            margin: 15px 0;
            font-family: monospace;
            letter-spacing: 3px;
          }
          .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            color: #6c757d;
            border-top: 1px solid #dee2e6;
          }
          .footer-small {
            font-size: 12px;
            margin-top: 15px;
          }
          ul {
            padding-${isRTL ? 'right' : 'left'}: 20px;
          }
          li {
            margin-bottom: 8px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>{{TITLE}}</h1>
          </div>
          <div class="content">
            {{CONTENT}}
          </div>
          <div class="footer">
            <p>{{FOOTER_TEXT}}</p>
            <div class="footer-small">{{FOOTER_SMALL}}</div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // دالة مساعدة لاستبدال المفاتيح الأساسية في التيمبليت - محسنة مع دعم اللغتين
  private static replaceBaseKeys(template: string, title: string, language: 'ar' | 'en' = 'ar'): string {
    const footerText = language === 'ar' ? 'فريق رزقي - موقع الزواج الإسلامي الشرعي' : 'Rezge Team - Islamic Marriage Platform';
    const footerSmall = language === 'ar' ? 'هذا إيميل تلقائي، يرجى عدم الرد عليه مباشرة' : 'This is an automated email, please do not reply directly';
    
    return template
      .replace('{{TITLE}}', title)
      .replace('{{FOOTER_TEXT}}', footerText)
      .replace('{{CURRENT_YEAR}}', new Date().getFullYear().toString())
      .replace('{{SITE_NAME}}', language === 'ar' ? 'رزقي' : 'Rezge')
      .replace('{{SITE_URL}}', 'https://rezgee.vercel.app')
      .replace('{{FOOTER_SMALL}}', footerSmall);
  }

  /**
   * تيمبليت كلمة المرور المؤقتة - محسن
   */
  static createTemporaryPasswordTemplate(
    data: { temporaryPassword: string; expiresAt: string; recipientName?: string },
    language: 'ar' | 'en',
    baseTemplate: string
  ): EmailTemplate {
    const isRTL = language === 'ar';
    const expiryDate = new Date(data.expiresAt);
    const expiryTime = expiryDate.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', {
      timeZone: 'Asia/Riyadh',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      calendar: language === 'ar' ? 'gregory' : undefined
    });

    const content = {
      ar: {
        title: 'كلمة المرور المؤقتة - رزقي',
        heading: 'كلمة المرور المؤقتة',
        greeting: `السلام عليكم ${data.recipientName || 'عزيزي المستخدم'}،`,
        description: 'تم إنشاء كلمة مرور مؤقتة لحسابك في موقع رزقي للزواج الإسلامي. استخدم كلمة المرور أدناه لتسجيل الدخول وتعيين كلمة مرور جديدة:',
        passwordLabel: 'كلمة المرور المؤقتة',
        instructions: 'تعليمات الاستخدام:',
        step1: '1. اذهب إلى صفحة تسجيل الدخول في موقع رزقي',
        step2: '2. أدخل بريدك الإلكتروني وكلمة المرور المؤقتة أعلاه',
        step3: '3. ستتم مطالبتك بتعيين كلمة مرور جديدة وآمنة',
        validUntil: `صالحة حتى: ${expiryTime}`,
        securityNote: 'ملاحظة أمنية: لا تشارك كلمة المرور هذه مع أي شخص. إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا الإيميل.',
        footer: 'فريق رزقي - موقع الزواج الإسلامي الشرعي'
      },
      en: {
        title: 'Temporary Password - Rezge',
        heading: 'Temporary Password',
        greeting: `Hello ${data.recipientName || 'Dear User'},`,
        description: 'A temporary password has been created for your Rezge Islamic marriage account. Use the password below to log in and set a new password:',
        passwordLabel: 'Temporary Password',
        instructions: 'Usage Instructions:',
        step1: '1. Go to the Rezge login page',
        step2: '2. Enter your email and the temporary password above',
        step3: '3. You will be prompted to set a new secure password',
        validUntil: `Valid until: ${expiryTime}`,
        securityNote: 'Security Note: Do not share this password with anyone. If you didn\'t request a password reset, please ignore this email.',
        footer: 'Rezge Team - Islamic Marriage Platform'
      }
    };

    const t = content[language];

    const htmlContent = `
      <div class="greeting">${t.greeting}</div>
      <p>${t.description}</p>
      <div class="main-content">
        <h3 style="color: #667eea; margin-bottom: 15px;">${t.passwordLabel}</h3>
        <div class="code-display">${data.temporaryPassword}</div>
        <div class="warning">
          <strong>${t.validUntil}</strong>
        </div>
      </div>
      <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h4 style="color: #1e40af; margin-top: 0;">${t.instructions}</h4>
        <ul style="margin: 10px 0;">
          <li>${t.step1}</li>
          <li>${t.step2}</li>
          <li>${t.step3}</li>
        </ul>
      </div>
      <div class="warning">
        <strong>⚠️ ${t.securityNote}</strong>
      </div>
    `;

    const textContent = language === 'ar' ?
      `${t.greeting}\n\n${t.description}\n\n${t.passwordLabel}: ${data.temporaryPassword}\n\n${t.validUntil}\n\n${t.instructions}\n${t.step1}\n${t.step2}\n${t.step3}\n\n${t.securityNote}\n\n${t.footer}` :
      `${t.greeting}\n\n${t.description}\n\n${t.passwordLabel}: ${data.temporaryPassword}\n\n${t.validUntil}\n\n${t.instructions}\n${t.step1}\n${t.step2}\n${t.step3}\n\n${t.securityNote}\n\n${t.footer}`;

    const finalHtml = this.replaceBaseKeys(baseTemplate, t.title, language)
      .replace('{{CONTENT}}', htmlContent);

    return {
      subject: t.title,
      htmlContent: finalHtml,
      textContent
    };
  }

  /**
   * تيمبليت رمز التحقق الإداري
   */
  static createAdmin2FATemplate(
    data: { code: string; adminName?: string; expiresInMinutes?: number },
    language: 'ar' | 'en',
    baseTemplate: string
  ): EmailTemplate {
    const expiresIn = data.expiresInMinutes || 10;

    const content = {
      ar: {
        title: 'رمز التحقق الإداري - رزقي',
        heading: 'رمز التحقق الإداري',
        greeting: `مرحباً ${data.adminName || 'المدير'}،`,
        description: 'تم طلب رمز تحقق إداري لحسابك. هذا رمز حساس للعمليات الإدارية:',
        codeLabel: 'رمز التحقق الإداري',
        validityNote: `هذا الرمز صالح لمدة ${expiresIn} دقائق فقط`,
        securityNote: 'هذا رمز إداري حساس. لا تشاركه مع أي شخص آخر.',
        footer: 'فريق رزقي - موقع الزواج الإسلامي الشرعي'
      },
      en: {
        title: 'Admin Verification Code - Rezge',
        heading: 'Admin Verification Code',
        greeting: `Hello ${data.adminName || 'Admin'},`,
        description: 'An admin verification code has been requested for your account. This is a sensitive code for administrative operations:',
        codeLabel: 'Admin Verification Code',
        validityNote: `This code is valid for ${expiresIn} minutes only`,
        securityNote: 'This is a sensitive admin code. Do not share it with anyone.',
        footer: 'Rezge Team - Islamic Marriage Platform'
      }
    };

    const t = content[language];

    const htmlContent = `
      <div class="greeting">${t.greeting}</div>
      <p>${t.description}</p>
      <div class="main-content">
        <h3 style="color: #dc2626; margin-bottom: 15px;">${t.codeLabel}</h3>
        <div class="code-display" style="background: #dc2626;">${data.code}</div>
        <div class="warning" style="background: #fee2e2; border-color: #fecaca; color: #991b1b;">
          <strong>⏰ ${t.validityNote}</strong>
        </div>
      </div>
      <div class="warning" style="background: #fee2e2; border-color: #fecaca; color: #991b1b;">
        <strong>🔒 ${t.securityNote}</strong>
      </div>
    `;

    const textContent = language === 'ar' ?
      `${t.greeting}\n\n${t.description}\n\n${t.codeLabel}: ${data.code}\n\n${t.validityNote}\n\n${t.securityNote}\n\n${t.footer}` :
      `${t.greeting}\n\n${t.description}\n\n${t.codeLabel}: ${data.code}\n\n${t.validityNote}\n\n${t.securityNote}\n\n${t.footer}`;

    const finalHtml = this.replaceBaseKeys(baseTemplate, t.title, language)
      .replace('{{CONTENT}}', htmlContent);

    return {
      subject: t.title,
      htmlContent: finalHtml,
      textContent
    };
  }

  /**
   * تيمبليت رمز أمان الإعدادات
   */
  static createSecurity2FATemplate(
    data: { code: string; action?: string; expiresInMinutes?: number },
    language: 'ar' | 'en',
    baseTemplate: string
  ): EmailTemplate {
    const expiresIn = data.expiresInMinutes || 15;

    const content = {
      ar: {
        title: 'رمز تحقق إعدادات الأمان - رزقي',
        heading: 'رمز تحقق إعدادات الأمان',
        greeting: 'مرحباً بك،',
        description: 'تم طلب رمز تحقق لتعديل إعدادات الأمان في حسابك. استخدم الرمز التالي لإكمال العملية:',
        codeLabel: 'رمز أمان الإعدادات',
        validityNote: `هذا الرمز صالح لمدة ${expiresIn} دقيقة فقط`,
        securityNote: 'لا تشارك هذا الرمز مع أي شخص آخر. إذا لم تطلب هذا التعديل، يرجى تجاهل هذا الإيميل.',
        footer: 'فريق رزقي - موقع الزواج الإسلامي الشرعي'
      },
      en: {
        title: 'Security Settings Verification Code - Rezge',
        heading: 'Security Settings Verification Code',
        greeting: 'Hello,',
        description: 'A verification code has been requested to modify security settings in your account. Use the following code to complete the process:',
        codeLabel: 'Security Settings Code',
        validityNote: `This code is valid for ${expiresIn} minutes only`,
        securityNote: 'Do not share this code with anyone. If you didn\'t request this modification, please ignore this email.',
        footer: 'Rezge Team - Islamic Marriage Platform'
      }
    };

    const t = content[language];

    const htmlContent = `
      <div class="greeting">${t.greeting}</div>
      <p>${t.description}</p>
      <div class="main-content">
        <h3 style="color: #f59e0b; margin-bottom: 15px;">${t.codeLabel}</h3>
        <div class="code-display" style="background: #f59e0b;">${data.code}</div>
        <div class="warning" style="background: #fef3c7; border-color: #fde68a; color: #92400e;">
          <strong>⏰ ${t.validityNote}</strong>
        </div>
      </div>
      <div class="warning" style="background: #fef3c7; border-color: #fde68a; color: #92400e;">
        <strong>🔒 ${t.securityNote}</strong>
      </div>
    `;

  const textContent = language === 'ar' ?
    `${t.greeting}\n\n${t.description}\n\n${t.codeLabel}: ${data.code}\n\n${t.validityNote}\n\n${t.securityNote}\n\n${t.footer}` :
    `${t.greeting}\n\n${t.description}\n\n${t.codeLabel}: ${data.code}\n\n${t.validityNote}\n\n${t.securityNote}\n\n${t.footer}`;

  const finalHtml = this.replaceBaseKeys(baseTemplate, t.title, language)
    .replace('{{CONTENT}}', htmlContent);

  return {
    subject: t.title,
    htmlContent: finalHtml,
    textContent
  };
}

// دوال أخرى للتوافق مع الكود القديم
static async sendEmailWithTemplate(emailData: EmailData, templateData?: any, language?: string): Promise<any> {
  return await this.sendEmail(emailData, templateData, language);
}
}

export default AdvancedEmailService;
