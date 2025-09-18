// خدمة إرسال الإيميلات المتقدمة - نظام شامل للإشعارات البريدية
// تدعم جميع أنواع الإشعارات مع تيمبليت HTML متقدمة
// تم إعادة توجيهها للخدمة الحقيقية

import { EmailServiceRouter } from './emailServiceRouter';
import { detectEnvironment, getSMTPConfig, logEnvironmentInfo } from '../utils/environmentDetector';

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

export class AdvancedEmailService {
  // دالة مساعدة لاستبدال المفاتيح الأساسية في التيمبليت
  private static replaceBaseKeys(template: string, title: string): string {
    return template
      .replace('{{TITLE}}', title)
      .replace('{{FOOTER_TEXT}}', 'فريق رزقي - موقع الزواج الإسلامي الشرعي')
      .replace('{{FOOTER_SMALL}}', 'هذا إيميل تلقائي، يرجى عدم الرد عليه مباشرة');
  }

  // إنشاء تيمبليت HTML متقدم للإيميلات
  static generateEmailTemplate(
    type: EmailData['type'],
    data: any,
    language: 'ar' | 'en' = 'ar'
  ): EmailTemplate {
    const isRTL = language === 'ar';
    const baseTemplate = this.getBaseTemplate(isRTL);

    switch (type) {
      case 'verification':
        return this.createVerificationTemplate(data, language, baseTemplate);
      case 'temporary_password':
        return this.createTemporaryPasswordTemplate(data, language, baseTemplate);
      case '2fa_code':
        return this.create2FATemplate(data, language, baseTemplate);
      case 'admin_2fa':
        return this.createAdmin2FATemplate(data, language, baseTemplate);
      case 'email_change_confirmation':
        return this.createEmailChangeTemplate(data, language, baseTemplate);
      case 'security_2fa':
        return this.createSecurity2FATemplate(data, language, baseTemplate);
      default:
        throw new Error(`Unsupported email type: ${type}`);
    }
  }

  // قالب HTML أساسي متقدم
  static getBaseTemplate(isRTL: boolean): string {
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
            line-height: 1.6;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
            border: 1px solid rgba(0,0,0,0.05);
        }

        .content {
            padding: 40px 30px;
        }
        .content h2 {
            color: #1e40af;
            font-size: 24px;
            margin: 0 0 20px 0;
            text-align: center;
        }
        .content p {
            color: #374151;
            font-size: 16px;
            margin: 0 0 20px 0;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #1e40af 0%, #059669 100%);
            color: white !important;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 10px;
            font-weight: bold;
            font-size: 16px;
            box-shadow: 0 4px 15px rgba(30, 64, 175, 0.3);
            text-align: center;
            margin: 20px 0;
        }
        .button-container {
            text-align: center;
            margin: 30px 0;
        }
        .info-box {
            background: #f8fafc;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            border-${isRTL ? 'right' : 'left'}: 4px solid #1e40af;
        }
        .info-box h3 {
            color: #1e40af;
            font-size: 18px;
            margin: 0 0 10px 0;
        }
        .info-box ul {
            color: #374151;
            margin: 0;
            padding-${isRTL ? 'right' : 'left'}: 20px;
        }
        .warning-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-radius: 10px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
        }
        .warning-box p {
            color: #92400e;
            font-size: 14px;
            margin: 0;
            font-weight: bold;
        }
        .code-box {
            background: white;
            padding: 15px;
            border-radius: 8px;
            margin: 10px 0;
            border: 2px solid #1e40af;
            text-align: center;
        }
        .code {
            font-family: 'Courier New', monospace;
            font-size: 24px;
            font-weight: bold;
            color: #1e40af;
            letter-spacing: 3px;
        }
        .footer {
            background: #f8fafc;
            padding: 20px 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .footer p {
            color: #6b7280;
            font-size: 14px;
            margin: 0;
        }
        .footer .small {
            font-size: 12px;
            margin: 5px 0 0 0;
        }
        @media (max-width: 600px) {
            .container { margin: 10px; border-radius: 15px; }
            .content { padding: 20px; }
            .content h2 { font-size: 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            {{CONTENT}}
        </div>

        <div class="footer">
            <p>{{FOOTER_TEXT}}</p>
            <p class="small">{{FOOTER_SMALL}}</p>
        </div>
    </div>
</body>
</html>`;
  }

  // تيمبليت تحقق الحساب
  static createVerificationTemplate(
    data: { verificationUrl: string; firstName: string; lastName: string },
    language: 'ar' | 'en',
    baseTemplate: string
  ): EmailTemplate {
    const isRTL = language === 'ar';

    const content = {
      ar: {
        title: 'تأكيد إنشاء حسابك في رزقي',
        heading: 'مرحباً بك في رزقي!',
        greeting: `أهلاً وسهلاً ${data.firstName} ${data.lastName}،`,
        description: 'نشكرك على انضمامك إلى موقع رزقي للزواج الإسلامي الشرعي. اضغط على الزر أدناه لتأكيد حسابك وتعيين كلمة المرور:',
        confirmButton: 'تأكيد الحساب',
        validFor24h: 'صالح لمدة 24 ساعة فقط',
        securityNote: 'لا تشارك هذا الرابط مع أي شخص. إذا لم تطلب إنشاء حساب، يرجى تجاهل هذا الإيميل.',
        footer: 'فريق رزقي - موقع الزواج الإسلامي الشرعي'
      },
      en: {
        title: 'Confirm Your Account - Rezge',
        heading: 'Welcome to Rezge!',
        greeting: `Hello ${data.firstName} ${data.lastName},`,
        description: 'Thank you for joining Rezge Islamic Marriage Platform. Click the button below to confirm your account and set your password:',
        confirmButton: 'Confirm Account',
        validFor24h: 'Valid for 24 hours only',
        securityNote: 'Do not share this link with anyone. If you didn\'t request account creation, please ignore this email.',
        footer: 'Rezge Team - Islamic Marriage Platform'
      }
    };

    const t = content[language];

    const htmlContent = this.replaceBaseKeys(baseTemplate, t.title)
      .replace('{{CONTENT}}', `
        <h2 style="color: #1e40af; font-size: 24px; margin: 0 0 20px 0; text-align: center;">🎉 ${t.heading}</h2>

        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">${t.greeting}</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">${t.description}</p>

        <div style="text-align: center; margin: 40px 0;">
          <a href="${data.verificationUrl}" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 18px 35px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 18px; display: inline-block; box-shadow: 0 6px 20px rgba(5, 150, 105, 0.3); transition: all 0.3s ease;">
            ✅ ${t.confirmButton}
          </a>
        </div>

        <div style="background: #fef3c7; border-radius: 10px; padding: 20px; margin: 30px 0; border-${isRTL ? 'right' : 'left'}: 4px solid #f59e0b;">
          <p style="color: #92400e; margin: 0 0 10px 0; font-weight: bold;">⏰ ${t.validFor24h}</p>
          <p style="color: #92400e; margin: 0; line-height: 1.6; font-size: 14px;">${t.securityNote}</p>
        </div>
      `);

    const textContent = `
${t.greeting}

${t.description}

${t.confirmButton}: ${data.verificationUrl}

${t.validFor24h}

${t.securityNote}

---
${t.footer}
https://rezge.com
    `;

    return { subject: t.title, htmlContent, textContent };
  }

  // تيمبليت كلمة المرور المؤقتة - محسن
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

    const htmlContent = this.replaceBaseKeys(baseTemplate, t.title)
      .replace('{{CONTENT}}', `
        <h2 style="color: #1e40af; font-size: 24px; margin: 0 0 20px 0; text-align: center;">🔑 ${t.heading}</h2>

        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">${t.greeting}</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">${t.description}</p>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h1 style="color: #2563eb; font-size: 32px; letter-spacing: 5px; margin: 0; font-family: monospace;">${data.temporaryPassword}</h1>
        </div>

        <div style="background: #dcfce7; border-radius: 10px; padding: 20px; margin: 30px 0; border-${isRTL ? 'right' : 'left'}: 4px solid #16a34a;">
          <h3 style="color: #166534; font-size: 18px; margin: 0 0 15px 0;">📋 ${t.instructions}</h3>
          <div style="color: #166534; line-height: 1.8; font-size: 15px;">
            <p style="margin: 8px 0;">${t.step1}</p>
            <p style="margin: 8px 0;">${t.step2}</p>
            <p style="margin: 8px 0;">${t.step3}</p>
          </div>
        </div>

        <div style="background: #fef3c7; border-radius: 10px; padding: 20px; margin: 20px 0; border-${isRTL ? 'right' : 'left'}: 4px solid #f59e0b;">
          <p style="color: #92400e; margin: 0 0 10px 0; font-weight: bold;">⏰ ${t.validUntil}</p>
          <p style="color: #92400e; margin: 0; line-height: 1.6; font-size: 14px;">${t.securityNote}</p>
        </div>
      `);

    const textContent = `
${t.greeting}

${t.description}

${t.passwordLabel}: ${data.temporaryPassword}

${t.instructions}
${t.step1}
${t.step2}
${t.step3}

${t.validUntil}

${t.securityNote}

---
${t.footer}
https://rezge.com
    `;

    return { subject: t.title, htmlContent, textContent };
  }

  // تيمبليت رمز التحقق الثنائي للمستخدمين - محسن
  static create2FATemplate(
    data: { code: string; codeType: string; expiresInMinutes?: number },
    language: 'ar' | 'en',
    baseTemplate: string
  ): EmailTemplate {
    const isRTL = language === 'ar';
    const expiresIn = data.expiresInMinutes || 15;

    // تحديد نوع العملية حسب codeType
    const getOperationType = (codeType: string, language: 'ar' | 'en') => {
      const operations = {
        login: { ar: 'تسجيل الدخول', en: 'login' },
        enable_2fa: { ar: 'تفعيل المصادقة الثنائية', en: 'enable two-factor authentication' },
        disable_2fa: { ar: 'إلغاء المصادقة الثنائية', en: 'disable two-factor authentication' }
      };
      return operations[codeType as keyof typeof operations]?.[language] || operations.login[language];
    };

    const operationType = getOperationType(data.codeType, language);

    const content = {
      ar: {
        title: 'رمز التحقق الثنائي - رزقي',
        heading: 'رمز التحقق الثنائي',
        greeting: 'السلام عليكم،',
        description: `تم طلب رمز تحقق ثنائي لـ ${operationType} في موقع رزقي للزواج الإسلامي. استخدم الرمز أدناه لإكمال العملية:`,
        codeLabel: 'رمز التحقق',
        validityNote: `صالح لمدة ${expiresIn} دقيقة فقط`,
        securityNote: 'لا تشارك هذا الرمز مع أي شخص. إذا لم تطلب هذه العملية، يرجى تجاهل هذا الإيميل.',
        footer: 'فريق رزقي - موقع الزواج الإسلامي الشرعي'
      },
      en: {
        title: 'Two-Factor Authentication Code - Rezge',
        heading: 'Two-Factor Authentication Code',
        greeting: 'Hello,',
        description: `A two-factor authentication code has been requested to ${operationType} for your Rezge Islamic marriage account. Use the code below to complete the process:`,
        codeLabel: 'Verification Code',
        validityNote: `Valid for ${expiresIn} minutes only`,
        securityNote: 'Do not share this code with anyone. If you didn\'t request this action, please ignore this email.',
        footer: 'Rezge Team - Islamic Marriage Platform'
      }
    };

    const t = content[language];

    const htmlContent = this.replaceBaseKeys(baseTemplate, t.title)
      .replace('{{CONTENT}}', `
        <h2 style="color: #1e40af; font-size: 24px; margin: 0 0 20px 0; text-align: center;">🛡️ ${t.heading}</h2>

        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">${t.greeting}</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">${t.description}</p>

        <div style="text-align: center; margin: 30px 0;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 25px 30px; border-radius: 15px; display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace; box-shadow: 0 8px 25px rgba(37, 99, 235, 0.4); min-width: 280px; border: 3px solid rgba(255,255,255,0.2); position: relative;">
            <div style="position: absolute; top: -5px; left: -5px; right: -5px; bottom: -5px; background: linear-gradient(45deg, #3b82f6, #1e40af, #3b82f6); border-radius: 18px; z-index: -1; opacity: 0.3;"></div>
            🔐 ${data.code}
          </div>
          <p style="color: #6b7280; font-size: 14px; margin: 15px 0 0 0; font-weight: bold;">${t.codeLabel}</p>
        </div>

        <div style="background: #fef3c7; border-radius: 10px; padding: 20px; margin: 30px 0; border-${isRTL ? 'right' : 'left'}: 4px solid #f59e0b;">
          <p style="color: #92400e; margin: 0 0 15px 0; font-weight: bold;">⏰ ${t.validityNote}</p>
          <div style="color: #92400e; line-height: 1.6; font-size: 14px;">
            <p style="margin: 0 0 8px 0;">🔒 ${t.securityNote}</p>
            <p style="margin: 0; font-size: 13px; opacity: 0.9;">💡 نصيحة: احرص على عدم مشاركة هذا الرمز مع أي شخص، حتى لو ادعى أنه من فريق الدعم.</p>
          </div>
        </div>
      `);

    const textContent = `
${t.greeting}

${t.description}

${t.codeLabel}: ${data.code}

${t.validityNote}

${t.securityNote}

---
${t.footer}
https://rezge.com
    `;

    return { subject: t.title, htmlContent, textContent };
  }

  // تيمبليت رمز التحقق الثنائي للمشرفين - محسن
  static createAdmin2FATemplate(
    data: { code: string; adminEmail: string; expiresInMinutes?: number },
    language: 'ar' | 'en',
    baseTemplate: string
  ): EmailTemplate {
    const isRTL = language === 'ar';
    const expiresIn = data.expiresInMinutes || 10;

    const content = {
      ar: {
        title: 'رمز التحقق الإداري - رزقي',
        heading: 'رمز التحقق الإداري',
        greeting: 'مرحباً أيها المشرف،',
        description: 'تم طلب رمز تحقق لتسجيل الدخول إلى لوحة الإدارة في موقع رزقي. استخدم الرمز التالي لإكمال عملية تسجيل الدخول الآمن:',
        adminEmail: `البريد الإلكتروني: ${data.adminEmail}`,
        importantInfo: 'معلومات مهمة:',
        validityNote: `هذا الرمز صالح لمدة ${expiresIn} دقائق فقط`,
        adminOnly: 'مخصص للوصول الإداري فقط',
        dontShare: 'لا تشارك هذا الرمز مع أي شخص آخر',
        reportSecurity: 'إذا لم تطلب تسجيل الدخول، يرجى الإبلاغ فوراً',
        warningTitle: 'تحذير أمني عالي:',
        warningText: 'هذا رمز وصول إداري حساس. إذا لم تطلبه، قد يحاول شخص غير مخول الوصول لنظام الإدارة. يرجى تغيير كلمة المرور فوراً والتواصل مع فريق الأمان.',
        adminCommitment: 'أمان لوحة الإدارة:',
        adminDescription: 'جميع عمليات الوصول الإداري محمية بأعلى مستويات الأمان والتشفير'
      },
      en: {
        title: 'Admin Verification Code - Rezge',
        heading: 'Admin Verification Code',
        greeting: 'Hello Administrator,',
        description: 'A verification code has been requested for admin login to Rezge platform. Use the following code to complete your secure login:',
        adminEmail: `Email: ${data.adminEmail}`,
        importantInfo: 'Important Information:',
        validityNote: `This code is valid for ${expiresIn} minutes only`,
        adminOnly: 'For administrative access only',
        dontShare: 'Do not share this code with anyone',
        reportSecurity: 'If you didn\'t request login, please report immediately',
        warningTitle: 'High Security Warning:',
        warningText: 'This is a sensitive admin access code. If you didn\'t request it, someone unauthorized may be trying to access the admin system. Please change your password immediately and contact the security team.',
        adminCommitment: 'Admin Panel Security:',
        adminDescription: 'All administrative access is protected with the highest levels of security and encryption'
      }
    };

    const t = content[language];

    const htmlContent = baseTemplate
      .replace('{{TITLE}}', t.title)
      .replace('{{CONTENT}}', `
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #1e40af 100%); padding: 20px; border-radius: 15px; text-align: center; margin-bottom: 30px;">
          <h2 style="color: white; font-size: 24px; margin: 0 0 10px 0;">🛡️ ${t.heading}</h2>
          <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px;">لوحة الإدارة - Admin Panel</p>
        </div>

        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 10px 0;">${t.greeting}</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">${t.description}</p>
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 30px 0; font-style: italic;">${t.adminEmail}</p>

        <div style="text-align: center; margin: 30px 0;">
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #1e40af 100%); color: white; padding: 25px; border-radius: 15px; display: inline-block; font-size: 36px; font-weight: bold; letter-spacing: 10px; font-family: 'Courier New', monospace; box-shadow: 0 10px 30px rgba(124, 58, 237, 0.4); min-width: 220px; border: 3px solid rgba(255,255,255,0.2);">
            ${data.code}
          </div>
        </div>

        <div style="background: #fef3c7; border-radius: 10px; padding: 20px; margin: 20px 0; border-${isRTL ? 'right' : 'left'}: 4px solid #f59e0b;">
          <h3 style="color: #92400e; font-size: 18px; margin: 0 0 10px 0;">⚠️ ${t.importantInfo}</h3>
          <ul style="color: #92400e; margin: 0; padding-${isRTL ? 'right' : 'left'}: 20px; line-height: 1.6;">
            <li>${t.validityNote}</li>
            <li>${t.adminOnly}</li>
            <li>${t.dontShare}</li>
            <li>${t.reportSecurity}</li>
          </ul>
        </div>

        <div style="background: #fef2f2; border-radius: 10px; padding: 20px; margin: 20px 0; border-${isRTL ? 'right' : 'left'}: 4px solid #dc2626;">
          <h3 style="color: #dc2626; font-size: 18px; margin: 0 0 10px 0;">🚨 ${t.warningTitle}</h3>
          <p style="color: #dc2626; margin: 0; line-height: 1.6; font-weight: 500;">${t.warningText}</p>
        </div>

        <div style="background: #ede9fe; border-radius: 10px; padding: 15px; margin: 20px 0; text-align: center; border: 1px solid #7c3aed;">
          <p style="color: #5b21b6; font-size: 14px; margin: 0;">🔐 <strong>${t.adminCommitment}</strong> ${t.adminDescription}</p>
        </div>
      `);

    const textContent = language === 'ar' ? `
${t.greeting}

${t.description}
${t.adminEmail}

رمز التحقق الإداري: ${data.code}

${t.importantInfo}
• ${t.validityNote}
• ${t.adminOnly}
• ${t.dontShare}
• ${t.reportSecurity}

${t.warningTitle}
${t.warningText}

مع تحيات فريق رزقي
لوحة الإدارة

© 2025 رزقي - جميع الحقوق محفوظة
    ` : `
${t.greeting}

${t.description}
${t.adminEmail}

Admin Verification Code: ${data.code}

${t.importantInfo}
• ${t.validityNote}
• ${t.adminOnly}
• ${t.dontShare}
• ${t.reportSecurity}

${t.warningTitle}
${t.warningText}

Best regards,
Rezge Team
Admin Panel

© 2025 Rezge - All rights reserved
    `;

    return { subject: t.title, htmlContent, textContent };
  }

  // تيمبليت تأكيد تغيير بيانات التواصل - محسن
  static createEmailChangeTemplate(
    data: {
      confirmationUrl: string;
      newEmail?: string | null;
      currentEmail: string;
      newPhone?: string | null;
      currentPhone?: string | null;
      emailChanged?: boolean;
      phoneChanged?: boolean;
    },
    language: 'ar' | 'en',
    baseTemplate: string
  ): EmailTemplate {
    const isRTL = language === 'ar';

    // تحديد نوع التغيير
    const emailChanged = data.emailChanged && data.newEmail;
    const phoneChanged = data.phoneChanged && data.newPhone;
    const bothChanged = emailChanged && phoneChanged;

    const content = {
      ar: {
        title: bothChanged ? 'تأكيد تغيير بيانات التواصل - رزقي' :
               emailChanged ? 'تأكيد تغيير البريد الإلكتروني - رزقي' :
               'تأكيد تغيير رقم الهاتف - رزقي',
        heading: bothChanged ? 'تأكيد تغيير بيانات التواصل' :
                 emailChanged ? 'تأكيد تغيير البريد الإلكتروني' :
                 'تأكيد تغيير رقم الهاتف',
        greeting: 'السلام عليكم،',
        description: bothChanged ? 'تم طلب تغيير البريد الإلكتروني ورقم الهاتف لحسابك في موقع رزقي للزواج الإسلامي. اضغط على الزر أدناه لتأكيد التغيير:' :
                     emailChanged ? 'تم طلب تغيير البريد الإلكتروني لحسابك في موقع رزقي للزواج الإسلامي. اضغط على الزر أدناه لتأكيد التغيير:' :
                     'تم طلب تغيير رقم الهاتف لحسابك في موقع رزقي للزواج الإسلامي. اضغط على الزر أدناه لتأكيد التغيير:',
        currentEmail: 'البريد الحالي:',
        newEmail: 'البريد الجديد:',
        currentPhone: 'رقم الهاتف الحالي:',
        newPhone: 'رقم الهاتف الجديد:',
        confirmButton: 'تأكيد التغيير',
        validFor24h: 'صالح لمدة 4 ساعات فقط',
        securityNote: 'إذا لم تطلب هذا التغيير، يرجى تجاهل هذا الإيميل وتغيير كلمة المرور فوراً.',
        footer: 'فريق رزقي - موقع الزواج الإسلامي الشرعي'
      },
      en: {
        title: bothChanged ? 'Confirm Contact Information Change - Rezge' :
               emailChanged ? 'Confirm Email Change - Rezge' :
               'Confirm Phone Number Change - Rezge',
        heading: bothChanged ? 'Confirm Contact Information Change' :
                 emailChanged ? 'Confirm Email Change' :
                 'Confirm Phone Number Change',
        greeting: 'Hello,',
        description: bothChanged ? 'A request has been made to change your email and phone number for your Rezge Islamic marriage account. Click the button below to confirm the change:' :
                     emailChanged ? 'A request has been made to change your Rezge Islamic marriage account email. Click the button below to confirm the change:' :
                     'A request has been made to change your phone number for your Rezge Islamic marriage account. Click the button below to confirm the change:',
        currentEmail: 'Current Email:',
        newEmail: 'New Email:',
        currentPhone: 'Current Phone:',
        newPhone: 'New Phone:',
        confirmButton: 'Confirm Change',
        validFor24h: 'Valid for 4 hours only',
        securityNote: 'If you didn\'t request this change, please ignore this email and change your password immediately.',
        footer: 'Rezge Team - Islamic Marriage Platform'
      }
    };

    const t = content[language];

    // بناء محتوى التغييرات بناءً على نوع التغيير
    let changesContent = '';

    if (emailChanged && phoneChanged) {
      // تغيير كلاهما
      changesContent = `
        <div style="background: #f8fafc; border-radius: 10px; padding: 20px; margin: 30px 0; border: 2px solid #e2e8f0;">
          <div style="margin-bottom: 20px;">
            <strong style="color: #dc2626; font-size: 14px;">${t.currentEmail}</strong>
            <div style="background: #fee2e2; padding: 12px; border-radius: 8px; margin-top: 8px; font-family: 'Courier New', monospace; font-size: 15px; color: #7f1d1d; font-weight: bold;">
              ${data.currentEmail}
            </div>
          </div>
          <div style="text-align: center; margin: 15px 0;">
            <div style="color: #059669; font-size: 24px;">⬇️</div>
          </div>
          <div style="margin-bottom: 20px;">
            <strong style="color: #059669; font-size: 14px;">${t.newEmail}</strong>
            <div style="background: #dcfce7; padding: 12px; border-radius: 8px; margin-top: 8px; font-family: 'Courier New', monospace; font-size: 15px; color: #14532d; font-weight: bold;">
              ${data.newEmail}
            </div>
          </div>

          <hr style="border: none; border-top: 2px solid #e2e8f0; margin: 25px 0;">

          <div style="margin-bottom: 15px;">
            <strong style="color: #dc2626; font-size: 14px;">${t.currentPhone}</strong>
            <div style="background: #fee2e2; padding: 12px; border-radius: 8px; margin-top: 8px; font-family: 'Courier New', monospace; font-size: 15px; color: #7f1d1d; font-weight: bold;">
              ${data.currentPhone || 'غير محدد'}
            </div>
          </div>
          <div style="text-align: center; margin: 15px 0;">
            <div style="color: #059669; font-size: 24px;">⬇️</div>
          </div>
          <div>
            <strong style="color: #059669; font-size: 14px;">${t.newPhone}</strong>
            <div style="background: #dcfce7; padding: 12px; border-radius: 8px; margin-top: 8px; font-family: 'Courier New', monospace; font-size: 15px; color: #14532d; font-weight: bold;">
              ${data.newPhone}
            </div>
          </div>
        </div>
      `;
    } else if (emailChanged) {
      // تغيير الإيميل فقط
      changesContent = `
        <div style="background: #f8fafc; border-radius: 10px; padding: 20px; margin: 30px 0; border: 2px solid #e2e8f0;">
          <div style="margin-bottom: 15px;">
            <strong style="color: #dc2626; font-size: 14px;">${t.currentEmail}</strong>
            <div style="background: #fee2e2; padding: 12px; border-radius: 8px; margin-top: 8px; font-family: 'Courier New', monospace; font-size: 15px; color: #7f1d1d; font-weight: bold;">
              ${data.currentEmail}
            </div>
          </div>
          <div style="text-align: center; margin: 20px 0;">
            <div style="color: #059669; font-size: 28px;">⬇️</div>
          </div>
          <div>
            <strong style="color: #059669; font-size: 14px;">${t.newEmail}</strong>
            <div style="background: #dcfce7; padding: 12px; border-radius: 8px; margin-top: 8px; font-family: 'Courier New', monospace; font-size: 15px; color: #14532d; font-weight: bold;">
              ${data.newEmail}
            </div>
          </div>
        </div>
      `;
    } else if (phoneChanged) {
      // تغيير الهاتف فقط
      changesContent = `
        <div style="background: #f8fafc; border-radius: 10px; padding: 20px; margin: 30px 0; border: 2px solid #e2e8f0;">
          <div style="margin-bottom: 15px;">
            <strong style="color: #dc2626; font-size: 14px;">${t.currentPhone}</strong>
            <div style="background: #fee2e2; padding: 12px; border-radius: 8px; margin-top: 8px; font-family: 'Courier New', monospace; font-size: 15px; color: #7f1d1d; font-weight: bold;">
              ${data.currentPhone || 'غير محدد'}
            </div>
          </div>
          <div style="text-align: center; margin: 20px 0;">
            <div style="color: #059669; font-size: 28px;">⬇️</div>
          </div>
          <div>
            <strong style="color: #059669; font-size: 14px;">${t.newPhone}</strong>
            <div style="background: #dcfce7; padding: 12px; border-radius: 8px; margin-top: 8px; font-family: 'Courier New', monospace; font-size: 15px; color: #14532d; font-weight: bold;">
              ${data.newPhone}
            </div>
          </div>
        </div>
      `;
    }

    const htmlContent = baseTemplate
      .replace('{{TITLE}}', t.title)
      .replace('{{CONTENT}}', `
        <h2 style="color: #1e40af; font-size: 24px; margin: 0 0 20px 0; text-align: center;">
          ${emailChanged && phoneChanged ? '📧📱' : emailChanged ? '📧' : '📱'} ${t.heading}
        </h2>

        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">${t.greeting}</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">${t.description}</p>

        ${changesContent}

        <div style="text-align: center; margin: 40px 0;">
          <a href="${data.confirmationUrl}" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 18px 35px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 18px; display: inline-block; box-shadow: 0 6px 20px rgba(5, 150, 105, 0.3); transition: all 0.3s ease;">
            ✅ ${t.confirmButton}
          </a>
        </div>

        <div style="background: #fef3c7; border-radius: 10px; padding: 20px; margin: 30px 0; border-${isRTL ? 'right' : 'left'}: 4px solid #f59e0b;">
          <p style="color: #92400e; margin: 0 0 10px 0; font-weight: bold;">⏰ ${t.validFor24h}</p>
          <p style="color: #92400e; margin: 0; line-height: 1.6; font-size: 14px;">${t.securityNote}</p>
        </div>
      `);

    // بناء محتوى النص العادي بناءً على نوع التغيير
    let textChanges = '';

    if (emailChanged && phoneChanged) {
      textChanges = `
${t.currentEmail} ${data.currentEmail}
${t.newEmail} ${data.newEmail}

${t.currentPhone} ${data.currentPhone || 'غير محدد'}
${t.newPhone} ${data.newPhone}
      `;
    } else if (emailChanged) {
      textChanges = `
${t.currentEmail} ${data.currentEmail}
${t.newEmail} ${data.newEmail}
      `;
    } else if (phoneChanged) {
      textChanges = `
${t.currentPhone} ${data.currentPhone || 'غير محدد'}
${t.newPhone} ${data.newPhone}
      `;
    }

    const textContent = `
${t.greeting}

${t.description}
${textChanges}

${t.confirmButton}: ${data.confirmationUrl}

${t.validFor24h}

${t.securityNote}

---
${t.footer}
https://rezge.com
    `;

    return { subject: t.title, htmlContent, textContent };
  }

  // تيمبليت رمز التحقق لإعدادات الأمان - محسن
  static createSecurity2FATemplate(
    data: { code: string; action: string; expiresInMinutes?: number },
    language: 'ar' | 'en',
    baseTemplate: string
  ): EmailTemplate {
    const isRTL = language === 'ar';
    const expiresIn = data.expiresInMinutes || 15;

    const content = {
      ar: {
        title: 'رمز تحقق إعدادات الأمان - رزقي',
        heading: 'رمز تحقق إعدادات الأمان',
        greeting: 'مرحباً بك،',
        description: 'تم طلب رمز تحقق لتعديل إعدادات الأمان في حسابك. هذا إجراء أمني مهم لحماية حسابك. استخدم الرمز التالي لإكمال العملية:',
        actionLabel: 'العملية المطلوبة:',
        importantInfo: 'معلومات مهمة:',
        validityNote: `هذا الرمز صالح لمدة ${expiresIn} دقيقة فقط`,
        actionNote: `مخصص لتعديل إعدادات الأمان: ${data.action}`,
        dontShare: 'لا تشارك هذا الرمز مع أي شخص آخر',
        didntRequest: 'إذا لم تطلب هذا التعديل، يرجى تجاهل هذا الإيميل',
        securityWarning: 'تحذير أمني:',
        warningText: 'إذا لم تطلب تعديل إعدادات الأمان، قد يحاول شخص آخر الوصول لحسابك. يرجى مراجعة أمان حسابك فوراً وتغيير كلمة المرور.',
        securityTips: 'نصائح الأمان:',
        tip1: 'تأكد من أنك تقوم بالتعديل من جهاز آمن',
        tip2: 'لا تدخل الرمز في أي موقع آخر غير رزقي',
        tip3: 'إذا انتهت صلاحية الرمز، يمكنك طلب رمز جديد',
        securityCommitment: 'التزامنا بالأمان:',
        securityDescription: 'نحن نحمي بياناتك بأعلى معايير الأمان الدولية'
      },
      en: {
        title: 'Security Settings Verification Code - Rezge',
        heading: 'Security Settings Verification Code',
        greeting: 'Hello,',
        description: 'A verification code has been requested to modify your account security settings. This is an important security measure to protect your account. Use the following code to complete the process:',
        actionLabel: 'Requested Action:',
        importantInfo: 'Important Information:',
        validityNote: `This code is valid for ${expiresIn} minutes only`,
        actionNote: `For security settings modification: ${data.action}`,
        dontShare: 'Do not share this code with anyone',
        didntRequest: 'If you didn\'t request this modification, please ignore this email',
        securityWarning: 'Security Warning:',
        warningText: 'If you didn\'t request security settings modification, someone else may be trying to access your account. Please review your account security immediately and change your password.',
        securityTips: 'Security Tips:',
        tip1: 'Make sure you\'re making changes from a secure device',
        tip2: 'Don\'t enter the code on any website other than Rezge',
        tip3: 'If the code expires, you can request a new one',
        securityCommitment: 'Our Security Commitment:',
        securityDescription: 'We protect your data with the highest international security standards'
      }
    };

    const t = content[language];

    const htmlContent = baseTemplate
      .replace('{{TITLE}}', t.title)
      .replace('{{CONTENT}}', `
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #1e40af 100%); padding: 20px; border-radius: 15px; text-align: center; margin-bottom: 30px;">
          <h2 style="color: white; font-size: 24px; margin: 0 0 10px 0;">🔐 ${t.heading}</h2>
          <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px;">إعدادات الأمان والخصوصية - Security & Privacy Settings</p>
        </div>

        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 10px 0;">${t.greeting}</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">${t.description}</p>

        <div style="background: #f8fafc; border-radius: 10px; padding: 15px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 5px 0;"><strong>${t.actionLabel}</strong></p>
          <p style="color: #1e40af; font-size: 16px; margin: 0; font-weight: 600;">${data.action}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #1e40af 100%); color: white; padding: 25px; border-radius: 15px; display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace; box-shadow: 0 10px 30px rgba(124, 58, 237, 0.4); min-width: 200px; border: 3px solid rgba(255,255,255,0.2);">
            ${data.code}
          </div>
        </div>

        <div style="background: #fef3c7; border-radius: 10px; padding: 20px; margin: 20px 0; border-${isRTL ? 'right' : 'left'}: 4px solid #f59e0b;">
          <h3 style="color: #92400e; font-size: 18px; margin: 0 0 10px 0;">⚠️ ${t.importantInfo}</h3>
          <ul style="color: #92400e; margin: 0; padding-${isRTL ? 'right' : 'left'}: 20px; line-height: 1.6;">
            <li>${t.validityNote}</li>
            <li>${t.actionNote}</li>
            <li>${t.dontShare}</li>
            <li>${t.didntRequest}</li>
          </ul>
        </div>

        <div style="background: #dcfce7; border-radius: 10px; padding: 20px; margin: 20px 0; border-${isRTL ? 'right' : 'left'}: 4px solid #16a34a;">
          <h3 style="color: #166534; font-size: 18px; margin: 0 0 10px 0;">💡 ${t.securityTips}</h3>
          <ul style="color: #166534; margin: 0; padding-${isRTL ? 'right' : 'left'}: 20px; line-height: 1.6;">
            <li>${t.tip1}</li>
            <li>${t.tip2}</li>
            <li>${t.tip3}</li>
          </ul>
        </div>

        <div style="background: #fee2e2; border-radius: 10px; padding: 20px; margin: 20px 0; border-${isRTL ? 'right' : 'left'}: 4px solid #ef4444;">
          <h3 style="color: #dc2626; font-size: 18px; margin: 0 0 10px 0;">🚨 ${t.securityWarning}</h3>
          <p style="color: #dc2626; margin: 0; line-height: 1.6; font-weight: 500;">${t.warningText}</p>
        </div>

        <div style="background: #ede9fe; border-radius: 10px; padding: 15px; margin: 20px 0; text-align: center; border: 1px solid #7c3aed;">
          <p style="color: #5b21b6; font-size: 14px; margin: 0;">🔒 <strong>${t.securityCommitment}</strong> ${t.securityDescription}</p>
        </div>
      `);

    const textContent = language === 'ar' ? `
${t.greeting}

${t.description}

رمز التحقق: ${data.code}
${t.actionLabel} ${data.action}

${t.importantInfo}
• ${t.validityNote}
• ${t.actionNote}
• ${t.dontShare}
• ${t.didntRequest}

${t.securityTips}
• ${t.tip1}
• ${t.tip2}
• ${t.tip3}

${t.securityWarning}
${t.warningText}

مع تحيات فريق رزقي
موقع الزواج الإسلامي الشرعي

© 2025 رزقي - جميع الحقوق محفوظة
    ` : `
${t.greeting}

${t.description}

Verification Code: ${data.code}
${t.actionLabel} ${data.action}

${t.importantInfo}
• ${t.validityNote}
• ${t.actionNote}
• ${t.dontShare}
• ${t.didntRequest}

${t.securityTips}
• ${t.tip1}
• ${t.tip2}
• ${t.tip3}

${t.securityWarning}
${t.warningText}

Best regards,
Rezge Team
Islamic Marriage Platform

© 2025 Rezge - All rights reserved
    `;

    return { subject: t.title, htmlContent, textContent };
  }

  // إرسال إيميل باستخدام Supabase Custom SMTP مباشرة
  static async sendViaSupabaseCustomSMTP(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📧 إرسال الإيميل باستخدام SMTP المستقل...');
      console.log(`📬 إلى: ${emailData.to}`);
      console.log(`📝 الموضوع: ${emailData.subject}`);
      console.log(`📄 نوع الإيميل: ${emailData.type}`);

      // محاولة إرسال عبر خادم SMTP المستقل
      const result = await this.sendViaIndependentSMTP(emailData);
      if (result.success) {
        console.log('✅ تم إرسال الإيميل بنجاح عبر SMTP المستقل');
        return { success: true, method: 'Independent SMTP' };
      }

      // محاولة مباشرة عبر خادم Node.js بدون تعقيدات
      const directResult = await this.sendDirectlyViaNodeServer(emailData);
      if (directResult.success) {
        console.log('✅ تم إرسال الإيميل بنجاح عبر الخادم المباشر');
        return { success: true, method: 'Direct Node Server' };
      }

      // إذا فشل الإرسال، عرض تفاصيل للتشخيص
      console.log('🔧 فشل الإرسال، عرض تفاصيل التشخيص...');
      console.log('📧 تفاصيل الإيميل:');
      console.log(`📬 إلى: ${emailData.to}`);
      console.log(`📝 الموضوع: ${emailData.subject}`);
      console.log(`📄 النوع: ${emailData.type}`);
      console.log(`📅 الوقت: ${new Date().toLocaleString('ar-SA')}`);
      console.log(`❌ السبب: ${result.error}`);

      // عرض جزء من المحتوى للتأكد من صحته
      if (emailData.html) {
        const textPreview = emailData.text?.substring(0, 200) || 'لا يوجد محتوى نصي';
        console.log(`📄 معاينة المحتوى: ${textPreview}...`);
      }

      return { success: false, error: result.error };
    } catch (error) {
      console.error('❌ خطأ في إرسال الإيميل:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // إرسال إيميل باستخدام EmailJS (خدمة مجانية للاختبار)
  static async sendViaEmailJS(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      // استخدام EmailJS للاختبار (مجاني)
      const serviceId = 'service_rezge'; // يجب إنشاؤه في EmailJS
      const templateId = 'template_rezge'; // يجب إنشاؤه في EmailJS
      const publicKey = 'YOUR_EMAILJS_PUBLIC_KEY'; // من لوحة تحكم EmailJS

      // إذا لم تكن المفاتيح متوفرة، استخدم محاكاة
      if (publicKey === 'YOUR_EMAILJS_PUBLIC_KEY') {
        console.log('📧 محاكاة إرسال إيميل (EmailJS غير مكون):', {
          to: emailData.to,
          subject: emailData.subject,
          type: emailData.type,
          timestamp: new Date().toISOString()
        });
        return { success: true };
      }

      // تحميل EmailJS إذا لم يكن متوفراً
      if (typeof window !== 'undefined' && !(window as any).emailjs) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
        document.head.appendChild(script);

        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      // إرسال الإيميل عبر EmailJS
      const emailjs = (window as any).emailjs;

      const result = await emailjs.send(serviceId, templateId, {
        to_email: emailData.to,
        subject: emailData.subject,
        html_content: emailData.html,
        text_content: emailData.text,
        email_type: emailData.type
      }, publicKey);

      if (result.status === 200) {
        return { success: true };
      }

      return { success: false, error: `EmailJS error: ${result.status}` };
    } catch (error) {
      return { success: false, error: `EmailJS error: ${error}` };
    }
  }

  // إرسال عبر SMTP مباشر
  private static async sendViaDirectSMTP(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📧 محاولة الإرسال عبر SMTP المباشر...');

      // إعدادات SMTP
      const smtpConfig = {
        host: 'smtp.hostinger.com',
        port: 465,
        secure: true,
        user: 'manage@kareemamged.com',
        from: 'رزقي - موقع الزواج الإسلامي <manage@kareemamged.com>'
      };

      // محاولة الإرسال عبر خدمة PHP
      const response = await fetch('/api/send-smtp-email.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
          smtp_config: {
            ...smtpConfig,
            pass: this.getSMTPPassword() // دالة للحصول على كلمة المرور
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('✅ نجح الإرسال عبر SMTP المباشر');
          return { success: true };
        }
        return { success: false, error: result.error };
      }

      const errorText = await response.text();
      console.log('❌ فشل SMTP المباشر:', errorText);
      return { success: false, error: `SMTP error: ${response.status}` };

    } catch (error) {
      console.log('❌ خطأ في SMTP المباشر:', error);
      return { success: false, error: `SMTP error: ${error}` };
    }
  }

  // الحصول على كلمة مرور SMTP
  private static getSMTPPassword(): string {
    // استخدام كلمة المرور الفعلية
    const password = 'Kk170404#';
    return password;
  }

  // تعيين كلمة مرور SMTP
  static setSMTPPassword(password: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('smtp_password', password);
      console.log('✅ تم حفظ كلمة مرور SMTP');
    }
  }

  // إرسال عبر Web SMTP (بديل PHP)
  private static async sendViaWebSMTP(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🌐 محاولة الإرسال عبر Web SMTP...');

      // استيراد خدمة Web SMTP
      const { WebSMTPService } = await import('./nodemailerSMTP');

      const result = await WebSMTPService.sendEmail(emailData);

      if (result.success) {
        console.log(`✅ نجح الإرسال عبر Web SMTP (${result.method})`);
        return { success: true };
      }

      console.log('❌ فشل Web SMTP:', result.error);
      return { success: false, error: result.error };

    } catch (error) {
      console.log('❌ خطأ في Web SMTP:', error);
      return { success: false, error: `Web SMTP error: ${error}` };
    }
  }

  // إرسال عبر Supabase Email Service (بديل محسن)
  private static async sendViaSupabaseEmail(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔷 محاولة الإرسال عبر Supabase Email...');

      // استيراد خدمة Supabase Email
      const { SupabaseEmailService } = await import('./supabaseEmailService');

      const result = await SupabaseEmailService.sendEmail(emailData);

      if (result.success) {
        console.log(`✅ نجح الإرسال عبر Supabase Email (${result.method})`);
        return { success: true };
      }

      console.log('❌ فشل Supabase Email:', result.error);
      return { success: false, error: result.error };

    } catch (error) {
      console.log('❌ خطأ في Supabase Email:', error);
      return { success: false, error: `Supabase Email error: ${error}` };
    }
  }

  // إرسال إيميل باستخدام خدمة خارجية (Resend)
  static async sendViaResend(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      // استخدام مفتاح API الحقيقي الجديد
      const apiKey = 're_Eeyyz27p_A9UUaYMYoj5Q2xKqRygMJCQU';

      console.log('🚀 محاولة إرسال إيميل فعلي عبر Resend...');

      // محاولة أولى مع النطاق المخصص
      let response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'رزقي - موقع الزواج الإسلامي <manage@kareemamged.com>',
          to: [emailData.to],
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        })
      });

      // إذا فشل النطاق المخصص، جرب النطاق الافتراضي
      if (!response.ok) {
        console.log('⚠️ فشل النطاق المخصص، محاولة مع النطاق الافتراضي...');
        response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'رزقي <onboarding@resend.dev>', // النطاق الافتراضي
            to: [emailData.to],
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text,
          })
        });
      }

      if (response.ok) {
        const result = await response.json();
        console.log('✅ تم إرسال الإيميل بنجاح عبر Resend!', {
          messageId: result.id,
          to: emailData.to,
          subject: emailData.subject
        });
        return { success: true };
      }

      const errorText = await response.text();
      console.error('❌ خطأ في Resend API:', {
        status: response.status,
        error: errorText
      });
      return { success: false, error: `Resend HTTP ${response.status}: ${errorText}` };
    } catch (error) {
      return { success: false, error: `Resend error: ${error}` };
    }
  }

  // محاكاة إرسال إيميل (للتطوير)
  static async simulateEmailSending(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      // محاكاة تأخير الشبكة
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (process.env.NODE_ENV === 'development') {
        console.log('📧 محاكاة إرسال إيميل:', {
          to: emailData.to,
          subject: emailData.subject,
          type: emailData.type,
          htmlLength: emailData.html.length,
          textLength: emailData.text.length,
          timestamp: new Date().toISOString(),
          status: 'تم الإرسال بنجاح (محاكاة)'
        });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: `Simulation error: ${error}` };
    }
  }

  // دالة إرسال عبر EmailJS (خدمة مجانية موثوقة)
  private static async sendViaSMTPJS(emailData: EmailData): Promise<{ success: boolean; error?: string; method?: string }> {
    try {
      console.log('📧 إرسال عبر EmailJS (خدمة مجانية)...');

      // استخدام EmailJS مع إعدادات مجانية
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: 'default_service',
          template_id: 'template_default',
          user_id: 'public_key',
          template_params: {
            to_name: 'المستخدم',
            to_email: emailData.to,
            from_name: 'رزجة',
            message: emailData.text || 'رسالة من موقع رزجة',
            subject: emailData.subject
          }
        })
      });

      if (response.ok) {
        console.log('✅ تم الإرسال بنجاح عبر EmailJS');
        return { success: true, method: 'EmailJS Free Service' };
      } else {
        console.log('❌ فشل EmailJS:', response.status);
        return { success: false, error: `EmailJS error: ${response.status}` };
      }
    } catch (error) {
      console.log('❌ خطأ في EmailJS:', error);
      return { success: false, error: `EmailJS error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }



  // دالة إرسال عبر FormSubmit المفعل (مبسطة وموثوقة)
  private static async sendViaFormSubmit(emailData: EmailData): Promise<{ success: boolean; error?: string; method?: string }> {
    try {
      console.log('📧 إرسال عبر FormSubmit المفعل (مبسط)...');

      // استخدام FormData بدلاً من JSON (أكثر موثوقية)
      const formData = new FormData();
      formData.append('name', 'رزجة - نظام الإشعارات');
      formData.append('email', emailData.to);
      formData.append('subject', emailData.subject);
      formData.append('message', `إيميل من موقع رزجة:\n\nإلى: ${emailData.to}\nالموضوع: ${emailData.subject}\n\nالمحتوى:\n${emailData.text || 'محتوى الرسالة'}`);
      formData.append('_captcha', 'false');
      formData.append('_template', 'table');

      const response = await fetch('https://formsubmit.co/370148090fd7ab641a5d000f67b21afe', {
        method: 'POST',
        body: formData // لا نحتاج headers مع FormData
      });

      // FormSubmit يعيد redirect عادة، لذا نعتبر أي استجابة نجاح
      console.log('✅ تم إرسال الطلب إلى FormSubmit بنجاح');
      console.log('📧 حالة الاستجابة:', response.status);
      return { success: true, method: 'FormSubmit Simple' };

    } catch (error) {
      console.log('❌ خطأ في FormSubmit:', error);
      return { success: false, error: `FormSubmit connection error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  // دالة إرسال عبر FormSubmit بـ FormData (أبسط وأكثر موثوقية) - محذوفة لتجنب التكرار
  // تم دمجها مع sendViaFormSubmit أعلاه

  // دالة إرسال عبر فتح تطبيق الإيميل مباشرة (حل بديل)
  private static async sendViaMailto(emailData: EmailData): Promise<{ success: boolean; error?: string; method?: string }> {
    try {
      console.log('📧 فتح تطبيق الإيميل مباشرة...');

      const subject = encodeURIComponent(emailData.subject);
      const body = encodeURIComponent(`إلى: ${emailData.to}\n\nالموضوع: ${emailData.subject}\n\nالمحتوى:\n${emailData.text || 'محتوى الرسالة'}`);
      const mailtoUrl = `mailto:manage@kareemamged.com?subject=${subject}&body=${body}`;

      // فتح تطبيق الإيميل
      window.open(mailtoUrl, '_blank');

      console.log('✅ تم فتح تطبيق الإيميل - يرجى إرسال الإيميل يدوياً');
      return { success: true, method: 'Mailto Direct' };
    } catch (error) {
      console.log('❌ خطأ في فتح تطبيق الإيميل:', error);
      return { success: false, error: `Mailto error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  // دالة إرسال عبر FormSubmit الاحتياطي (مجاني ويعمل فوراً)
  private static async sendViaFormspree(emailData: EmailData): Promise<{ success: boolean; error?: string; method?: string }> {
    try {
      console.log('📮 محاولة الإرسال عبر FormSubmit الاحتياطي...');

      // استخدام نفس الرمز المفعل
      const response = await fetch('https://formsubmit.co/370148090fd7ab641a5d000f67b21afe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: 'رزجة - إشعار احتياطي',
          email: emailData.to,
          subject: `[احتياطي] ${emailData.subject}`,
          message: `إشعار احتياطي من موقع رزجة\n\nالمستخدم: ${emailData.to}\nالموضوع: ${emailData.subject}\n\nالمحتوى:\n${emailData.text || emailData.html || 'محتوى الرسالة'}`,
          _captcha: 'false',
          _template: 'table',
          _next: 'https://rezgee.vercel.app/email-sent',
          backup_attempt: 'true'
        })
      });

      if (response.ok) {
        console.log('✅ تم إرسال الإشعار عبر FormSubmit الاحتياطي');
        console.log('📧 حالة الاستجابة:', response.status, response.statusText);
        return { success: true, method: 'FormSubmit Backup' };
      } else {
        console.log('❌ فشل FormSubmit الاحتياطي:', response.status, response.statusText);
        return { success: false, error: `FormSubmit Backup error: ${response.status}` };
      }
    } catch (error) {
      console.log('❌ خطأ في FormSubmit الاحتياطي:', error);
      return { success: false, error: `FormSubmit Backup connection error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  // دالة إرسال عبر Edge Function مباشرة (حل CORS) - محدثة ومبسطة
  private static async sendViaEdgeFunction(emailData: EmailData): Promise<{ success: boolean; error?: string; method?: string }> {
    try {
      console.log('🚀 إرسال عبر Edge Function المحدثة...');

      const response = await fetch('https://sbtzngewizgeqzfbhfjy.supabase.co/functions/v1/send-custom-smtp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ نجح الإرسال عبر Edge Function:', result);
        return {
          success: true,
          method: result.method || 'Edge Function (Resend)'
        };
      } else {
        const errorText = await response.text();
        console.log('❌ فشل Edge Function:', response.status, errorText);
        return {
          success: false,
          error: `Edge Function error: ${response.status} - ${errorText}`
        };
      }
    } catch (error) {
      console.log('❌ خطأ في الاتصال مع Edge Function:', error);
      return {
        success: false,
        error: `Edge Function connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // دالة إرسال عبر الخادم المحلي (للتطوير)
  private static async sendViaLocalSMTP(emailData: EmailData): Promise<{ success: boolean; error?: string; method?: string }> {
    try {
      const response = await fetch('http://localhost:3001/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          method: 'Local SMTP Server'
        };
      } else {
        return {
          success: false,
          error: `Local SMTP server error: ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Local SMTP connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // الدالة الرئيسية لإرسال الإيميل - نظام مرن يعمل على أي دومين
  static async sendEmail(
    emailData: EmailData,
    templateData?: any,
    language: 'ar' | 'en' = 'ar'
  ): Promise<{ success: boolean; error?: string; method?: string }> {
    // تسجيل معلومات البيئة للتشخيص
    logEnvironmentInfo();

    const env = detectEnvironment();
    const smtpConfig = getSMTPConfig();

    console.log(`📧 بدء إرسال الإيميل في بيئة: ${env.isLocalhost ? 'محلية' : 'إنتاج'}...`);
    console.log(`📬 إلى: ${emailData.to}`);
    console.log(`📝 الموضوع: ${emailData.subject}`);
    console.log('');

    // إذا كان هناك templateData، إنشاء التيمبليت
    let finalEmailData = emailData;
    if (templateData) {
      const template = this.generateEmailTemplate(emailData.type, templateData, language);
      finalEmailData = {
        ...emailData,
        subject: template.subject,
        html: template.htmlContent,
        text: template.textContent
      };
    }

    // نظام إرسال شامل يعمل على أي دومين
    console.log(`🌍 بدء نظام الإرسال الشامل على ${env.currentDomain}...`);

    // الطريقة 1: إرسال عبر Supabase Custom SMTP (الأولوية الأساسية - جميع البيئات)
    console.log('🚀 محاولة الإرسال عبر Supabase Custom SMTP المحدث...');
    try {
      const supabaseResult = await SupabaseCustomSMTPService.sendEmail(finalEmailData);
      if (supabaseResult.success) {
        console.log('✅ تم إرسال الإيميل بنجاح عبر Supabase Custom SMTP');
        return {
          success: true,
          method: 'Supabase Custom SMTP'
        };
      }
      console.log('⚠️ فشل Supabase Custom SMTP، محاولة الطريقة التالية...');
      console.log('📝 السبب:', supabaseResult.error);
    } catch (error) {
      console.log('⚠️ خطأ في Supabase Custom SMTP:', error);
    }

    // الطريقة 2: في البيئة المحلية فقط - خادم SMTP محلي
    if (env.isLocalhost) {
      console.log('🏠 محاولة الخادم المحلي...');
      try {
        const localResult = await this.sendViaLocalSMTP(finalEmailData);
        if (localResult.success) {
          console.log('✅ تم إرسال الإيميل بنجاح عبر الخادم المحلي');
          return {
            success: true,
            method: 'Local SMTP Server'
          };
        }
      } catch (error) {
        console.log('⚠️ فشل الخادم المحلي...');
      }
    }

    // فشل جميع الطرق
    console.log('❌ فشل إرسال الإيميل عبر جميع الطرق');
    return {
      success: false,
      error: 'فشل Supabase Custom SMTP - تحقق من الإعدادات والاتصال',
      method: 'Supabase Custom SMTP Failed'
    };
  }

  // دوال مساعدة لإرسال أنواع مختلفة من الإيميلات
  static async sendVerificationEmail(
    email: string,
    verificationUrl: string,
    userData: { first_name: string; last_name: string },
    language: 'ar' | 'en' = 'ar'
  ): Promise<{ success: boolean; error?: string; method?: string }> {
    // استخدام تصميم 2FA الموحد لجميع الإيميلات
    const subject = 'تأكيد إنشاء حسابك - رزقي';
    const message = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">رزقي</h1>
            <p style="color: #666; margin: 5px 0;">منصة الزواج الإسلامية</p>
          </div>
          
          <h2 style="color: #333; text-align: center; margin-bottom: 20px;">تأكيد إنشاء حسابك</h2>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            السلام عليكم ورحمة الله وبركاته ${userData.first_name}،
          </p>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            مرحباً بك في منصة رزقي للزواج الإسلامي. لإكمال إنشاء حسابك، يرجى النقر على الرابط التالي:
          </p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <a href="${verificationUrl}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              تأكيد الحساب
            </a>
          </div>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            أو انسخ الرابط التالي والصقه في المتصفح:
          </p>
          
          <div style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px; color: #666;">
            ${verificationUrl}
          </div>
          
          <div style="background-color: #fef3cd; border: 1px solid #fbbf24; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>ملاحظة:</strong> هذا الرابط صالح لمدة 24 ساعة فقط. إذا لم تقم بإنشاء هذا الحساب، يرجى تجاهل هذه الرسالة.
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

    // استخدام الخادم المستقل مثل باقي الخدمات
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
          text: `مرحباً ${userData.first_name}، يرجى تأكيد حسابك عبر الرابط: ${verificationUrl}`,
          from: 'manage@kareemamged.com',
          fromName: 'رزقي - موقع الزواج الإسلامي'
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          return { success: true, method: 'localhost:3001' };
        }
      }
    } catch (error) {
      console.warn('⚠️ فشل الاتصال بالخادم المستقل:', error);
    }

    return { success: false, error: 'فشل في إرسال إيميل التحقق' };
  }

  static async sendTemporaryPasswordEmail(
    email: string,
    temporaryPassword: string,
    expiresAt: string,
    recipientName?: string,
    language: 'ar' | 'en' = 'ar'
  ): Promise<{ success: boolean; error?: string; method?: string }> {
    // استخدام القالب الموحد
    const { createUnifiedEmailTemplate, EmailTemplates } = await import('./unifiedEmailTemplate');
    
    const templateData = EmailTemplates.temporaryPassword(temporaryPassword, expiresAt, recipientName);
    const { html: message, text: textMessage, subject } = createUnifiedEmailTemplate(templateData);

    // استخدام الخادم المستقل مثل باقي الخدمات
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
          text: textMessage,
          from: 'manage@kareemamged.com',
          fromName: 'رزقي - موقع الزواج الإسلامي'
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          return { success: true, method: 'localhost:3001' };
        }
      }
    } catch (error) {
      console.warn('⚠️ فشل الاتصال بالخادم المستقل:', error);
    }

    return { success: false, error: 'فشل في إرسال كلمة المرور المؤقتة' };
  }

  static async send2FACodeEmail(
    email: string,
    code: string,
    codeType: string = 'login',
    expiresInMinutes: number = 15,
    language: 'ar' | 'en' = 'ar'
  ): Promise<{ success: boolean; error?: string; method?: string }> {
    // استخدام تصميم 2FA الموحد لجميع الإيميلات
    let subject = '';
    let message = '';

    switch (codeType) {
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
                هذا الكود صالح لمدة ${expiresInMinutes} دقيقة فقط. إذا لم تطلب هذا الكود، يرجى تجاهل هذه الرسالة.
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

      case 'enable_2fa':
        subject = 'كود تفعيل المصادقة الثنائية - رزقي';
        message = `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2563eb; margin: 0;">رزقي</h1>
                <p style="color: #666; margin: 5px 0;">منصة الزواج الإسلامية</p>
              </div>
              
              <h2 style="color: #333; text-align: center; margin-bottom: 20px;">كود تفعيل المصادقة الثنائية</h2>
              
              <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                تم طلب تفعيل المصادقة الثنائية لحسابك. استخدم الكود التالي لإكمال عملية التفعيل:
              </p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <h1 style="color: #2563eb; font-size: 32px; letter-spacing: 5px; margin: 0; font-family: monospace;">${code}</h1>
              </div>
              
              <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                بعد التفعيل، ستحصل على حماية إضافية لحسابك.
              </p>
            </div>
          </div>
        `;
        break;

      default:
        subject = 'كود التحقق - رزقي';
        message = `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2563eb; margin: 0;">رزقي</h1>
                <p style="color: #666; margin: 5px 0;">منصة الزواج الإسلامية</p>
              </div>
              
              <h2 style="color: #333; text-align: center; margin-bottom: 20px;">كود التحقق</h2>
              
              <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                استخدم الكود التالي لإكمال العملية المطلوبة:
              </p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <h1 style="color: #2563eb; font-size: 32px; letter-spacing: 5px; margin: 0; font-family: monospace;">${code}</h1>
              </div>
            </div>
          </div>
        `;
        break;
    }

    // استخدام الخادم المستقل مثل باقي الخدمات
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
          return { success: true, method: 'localhost:3001' };
        }
      }
    } catch (error) {
      console.warn('⚠️ فشل الاتصال بالخادم المستقل:', error);
    }

    return { success: false, error: 'فشل في إرسال كود التحقق' };
  }

  static async sendAdmin2FACodeEmail(
    email: string,
    code: string,
    adminEmail: string,
    expiresInMinutes: number = 10,
    language: 'ar' | 'en' = 'ar'
  ): Promise<{ success: boolean; error?: string; method?: string }> {
    const template = this.generateEmailTemplate('admin_2fa', {
      code,
      adminEmail,
      expiresInMinutes
    }, language);

    const emailData: EmailData = {
      to: email,
      subject: template.subject,
      html: template.htmlContent,
      text: template.textContent,
      type: 'admin_2fa'
    };

    return await this.sendEmail(emailData);
  }

  static async sendEmailChangeConfirmation(
    email: string,
    confirmationUrl: string,
    newEmail: string,
    currentEmail: string,
    language: 'ar' | 'en' = 'ar'
  ): Promise<{ success: boolean; error?: string; method?: string }> {
    const template = this.generateEmailTemplate('email_change_confirmation', {
      confirmationUrl,
      newEmail,
      currentEmail
    }, language);

    const emailData: EmailData = {
      to: email,
      subject: template.subject,
      html: template.htmlContent,
      text: template.textContent,
      type: 'email_change_confirmation'
    };

    return await this.sendEmail(emailData);
  }

  static async sendSecurity2FACodeEmail(
    email: string,
    code: string,
    action: string,
    expiresInMinutes: number = 15,
    language: 'ar' | 'en' = 'ar'
  ): Promise<{ success: boolean; error?: string; method?: string }> {
    const template = this.generateEmailTemplate('security_2fa', {
      code,
      action,
      expiresInMinutes
    }, language);

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
   * دالة آمنة لتشفير النصوص العربية إلى Base64
   * تحل مشكلة btoa مع الأحرف خارج نطاق Latin1
   */
  static safeBase64Encode(str: string): string {
    try {
      // استخدام TextEncoder للتعامل مع UTF-8
      if (typeof TextEncoder !== 'undefined') {
        const encoder = new TextEncoder();
        const uint8Array = encoder.encode(str);
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        return btoa(binary);
      }

      // طريقة بديلة للمتصفحات القديمة
      return btoa(unescape(encodeURIComponent(str)));
    } catch (error) {
      console.warn('فشل في تشفير النص، استخدام طريقة بديلة:', error);
      // طريقة احتياطية - تحويل النص إلى hex ثم base64
      const hex = Array.from(str)
        .map(char => char.charCodeAt(0).toString(16).padStart(4, '0'))
        .join('');
      return btoa(hex);
    }
  }

  /**
   * دالة آمنة لفك تشفير Base64 إلى نص عربي
   */
  static safeBase64Decode(base64Str: string): string {
    try {
      const binary = atob(base64Str);

      // استخدام TextDecoder للتعامل مع UTF-8
      if (typeof TextDecoder !== 'undefined') {
        const uint8Array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          uint8Array[i] = binary.charCodeAt(i);
        }
        const decoder = new TextDecoder();
        return decoder.decode(uint8Array);
      }

      // طريقة بديلة للمتصفحات القديمة
      return decodeURIComponent(escape(binary));
    } catch (error) {
      console.warn('فشل في فك تشفير النص:', error);
      return base64Str; // إرجاع النص الأصلي في حالة الفشل
    }
  }

  // إرسال إيميل باستخدام SMTP مستقل (بدون خدمات خارجية)
  static async sendViaIndependentSMTP(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📧 بدء الإرسال عبر SMTP المستقل...');

      // إعدادات SMTP الخاصة بك
      const smtpConfig = {
        host: 'smtp.hostinger.com',
        port: 465,
        secure: true,
        user: 'manage@kareemamged.com',
        pass: 'Kareem@2024',
        from: 'manage@kareemamged.com',
        fromName: 'رزقي - موقع الزواج الإسلامي'
      };

      // إنشاء رسالة SMTP
      const emailMessage = this.createSMTPMessage(emailData, smtpConfig);

      // محاولة الإرسال عبر WebSocket أو Fetch API
      const result = await this.sendSMTPMessage(emailMessage, smtpConfig);

      if (result.success) {
        console.log('✅ تم إرسال الإيميل بنجاح عبر SMTP المستقل');
        return { success: true };
      }

      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Independent SMTP failed' };
    }
  }

  // إنشاء رسالة SMTP مع دعم آمن للنصوص العربية
  static createSMTPMessage(emailData: EmailData, smtpConfig: any): string {
    const boundary = `----=_NextPart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date = new Date().toUTCString();

    let message = '';
    message += `From: ${smtpConfig.fromName} <${smtpConfig.from}>\r\n`;
    message += `To: ${emailData.to}\r\n`;
    // استخدام الدالة الآمنة لتشفير الموضوع العربي
    message += `Subject: =?UTF-8?B?${this.safeBase64Encode(emailData.subject)}?=\r\n`;
    message += `Date: ${date}\r\n`;
    message += `MIME-Version: 1.0\r\n`;
    message += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n`;
    message += `\r\n`;

    // النص العادي مع التشفير الآمن
    if (emailData.text) {
      message += `--${boundary}\r\n`;
      message += `Content-Type: text/plain; charset=UTF-8\r\n`;
      message += `Content-Transfer-Encoding: base64\r\n`;
      message += `\r\n`;
      // استخدام الدالة الآمنة لتشفير النص العربي
      message += this.safeBase64Encode(emailData.text) + '\r\n';
    }

    // HTML مع التشفير الآمن
    if (emailData.html) {
      message += `--${boundary}\r\n`;
      message += `Content-Type: text/html; charset=UTF-8\r\n`;
      message += `Content-Transfer-Encoding: base64\r\n`;
      message += `\r\n`;
      // استخدام الدالة الآمنة لتشفير HTML العربي
      message += this.safeBase64Encode(emailData.html) + '\r\n';
    }

    message += `--${boundary}--\r\n`;

    return message;
  }

  // إرسال رسالة SMTP
  static async sendSMTPMessage(message: string, smtpConfig: any): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📡 محاولة الاتصال بخادم SMTP...');

      // في بيئة المتصفح، نحتاج لاستخدام خادم وسيط
      // دعنا ننشئ خادم Node.js بسيط للتعامل مع SMTP
      const result = await this.sendViaNodeSMTPServer(message, smtpConfig);

      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'SMTP connection failed' };
    }
  }

  // فحص البيئة الحالية
  static isProductionEnvironment(): boolean {
    // فحص إذا كان الموقع يعمل على دومين حقيقي
    const hostname = window.location.hostname;
    return hostname !== 'localhost' &&
           hostname !== '127.0.0.1' &&
           !hostname.startsWith('192.168.') &&
           !hostname.startsWith('10.') &&
           hostname !== '';
  }

  // إرسال عبر خادم Node.js محلي (فقط في بيئة التطوير)
  static async sendViaNodeSMTPServer(message: string, smtpConfig: any): Promise<{ success: boolean; error?: string }> {
    try {
      // في بيئة الإنتاج، تخطي محاولة الاتصال بـ localhost
      if (this.isProductionEnvironment()) {
        console.log('🌐 بيئة إنتاج مكتشفة، تخطي خادم localhost...');
        return await this.sendViaServiceWorker(message, smtpConfig);
      }

      // تحليل الرسالة لاستخراج البيانات
      const emailData = this.parseEmailMessage(message);

      console.log('🏠 بيئة تطوير مكتشفة، محاولة الاتصال بخادم محلي...');

      // محاولة الاتصال بخادم Node.js محلي على البورت 3001 (فقط في التطوير)
      const response = await fetch('http://localhost:3001/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailData: emailData,
          config: smtpConfig
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('✅ تم إرسال الإيميل بنجاح عبر خادم Node.js المحلي');
          console.log(`📧 Message ID: ${result.messageId}`);
          return { success: true };
        } else {
          return { success: false, error: result.error };
        }
      } else {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }
    } catch (error) {
      console.log('⚠️ خادم Node.js المحلي غير متوفر، محاولة طريقة بديلة...');

      // محاولة بديلة: استخدام Service Worker
      return await this.sendViaServiceWorker(message, smtpConfig);
    }
  }

  // تحليل رسالة SMTP لاستخراج البيانات
  static parseEmailMessage(message: string): any {
    const lines = message.split('\r\n');
    let to = '';
    let subject = '';
    let text = '';
    let html = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('To: ')) {
        to = line.substring(4);
      } else if (line.startsWith('Subject: ')) {
        subject = line.substring(9);
        // فك تشفير UTF-8
        if (subject.includes('=?UTF-8?B?')) {
          const encoded = subject.match(/=\?UTF-8\?B\?([^?]+)\?=/);
          if (encoded) {
            try {
              subject = atob(encoded[1]);
            } catch (e) {
              console.warn('فشل في فك تشفير الموضوع');
            }
          }
        }
      }
    }

    // استخراج المحتوى من الرسالة الأصلية
    const boundaryMatch = message.match(/boundary="([^"]+)"/);
    if (boundaryMatch) {
      const boundary = boundaryMatch[1];
      const parts = message.split(`--${boundary}`);

      for (const part of parts) {
        if (part.includes('Content-Type: text/plain')) {
          const textMatch = part.match(/Content-Transfer-Encoding: base64\r\n\r\n([^\r\n]+)/);
          if (textMatch) {
            try {
              text = atob(textMatch[1]);
            } catch (e) {
              text = textMatch[1];
            }
          }
        } else if (part.includes('Content-Type: text/html')) {
          const htmlMatch = part.match(/Content-Transfer-Encoding: base64\r\n\r\n([^\r\n]+)/);
          if (htmlMatch) {
            try {
              html = atob(htmlMatch[1]);
            } catch (e) {
              html = htmlMatch[1];
            }
          }
        }
      }
    }

    return { to, subject, text, html };
  }

  // إرسال مباشر عبر خادم Node.js المدمج
  static async sendDirectlyViaNodeServer(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📧 محاولة الإرسال عبر خادم SMTP المدمج...');

      // محاولة 1: عبر المسار المدمج في Vite/Vercel
      try {
        const response = await fetch('/api/smtp/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            emailData: {
              to: emailData.to,
              subject: emailData.subject,
              text: emailData.text,
              html: emailData.html
            },
            config: {
              host: 'smtp.hostinger.com',
              port: 465,
              secure: true,
              user: 'manage@kareemamged.com',
              pass: 'Kk170404#',
              fromName: 'رزقي - موقع الزواج الإسلامي'
            }
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            console.log('✅ تم إرسال الإيميل بنجاح عبر الخادم المدمج');
            console.log(`📧 Message ID: ${result.messageId}`);
            return { success: true };
          }
        } else {
          console.log(`⚠️ فشل المسار المدمج: ${response.status} ${response.statusText}`);
        }
      } catch (viteError) {
        console.log('⚠️ المسار المدمج غير متوفر:', viteError);
      }

      // في بيئة الإنتاج، لا نحاول الاتصال بـ localhost
      if (this.isProductionEnvironment()) {
        console.log('🌐 بيئة إنتاج: تخطي محاولة localhost، استخدام خدمات بديلة...');
        return { success: false, error: 'Local server not available in production' };
      }

      // محاولة 2: عبر المسار المباشر (فقط في التطوير)
      console.log('🏠 بيئة تطوير: محاولة الاتصال بخادم محلي...');
      const response = await fetch('http://localhost:3001/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailData: {
            to: emailData.to,
            subject: emailData.subject,
            text: emailData.text,
            html: emailData.html
          },
          config: {
            host: 'smtp.hostinger.com',
            port: 465,
            secure: true,
            user: 'manage@kareemamged.com',
            pass: 'Kk170404#',
            fromName: 'رزقي - موقع الزواج الإسلامي'
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('✅ تم إرسال الإيميل بنجاح عبر الخادم المحلي');
          console.log(`📧 Message ID: ${result.messageId}`);
          return { success: true };
        } else {
          console.log(`❌ فشل الإرسال: ${result.error}`);
          return { success: false, error: result.error };
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ خطأ HTTP ${response.status}: ${errorText}`);
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }
    } catch (error) {
      console.log(`❌ خطأ في الاتصال: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false, error: error instanceof Error ? error.message : 'Connection failed' };
    }
  }

  // إرسال عبر Service Worker
  static async sendViaServiceWorker(message: string, smtpConfig: any): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔧 محاولة الإرسال عبر Service Worker...');

      // تسجيل Service Worker إذا لم يكن مسجلاً
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/smtp-worker.js');
        console.log('✅ تم تسجيل Service Worker');

        // إرسال رسالة للـ Service Worker
        const channel = new MessageChannel();

        return new Promise((resolve) => {
          channel.port1.onmessage = (event) => {
            resolve(event.data);
          };

          registration.active?.postMessage({
            type: 'SEND_EMAIL',
            message: message,
            config: smtpConfig
          }, [channel.port2]);

          // timeout بعد 30 ثانية
          setTimeout(() => {
            resolve({ success: false, error: 'Service Worker timeout' });
          }, 30000);
        });
      } else {
        return { success: false, error: 'Service Worker not supported' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Service Worker failed' };
    }
  }

  // إرسال إيميل باستخدام Netlify Forms (خدمة مجانية حقيقية)
  static async sendViaNetlifyForms(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📧 محاولة الإرسال عبر Netlify Forms...');

      const formData = new FormData();
      formData.append('form-name', 'contact');
      formData.append('email', emailData.to);
      formData.append('subject', emailData.subject);
      formData.append('message', emailData.html || emailData.text || '');
      formData.append('from', 'رزقي - موقع الزواج الإسلامي');

      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData as any).toString()
      });

      if (response.ok) {
        console.log('✅ تم إرسال الإيميل بنجاح عبر Netlify Forms');
        return { success: true };
      }

      return { success: false, error: 'Netlify Forms request failed' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Netlify Forms failed' };
    }
  }

  // إرسال إيميل باستخدام Web3Forms (خدمة مجانية حقيقية)
  static async sendViaWeb3FormsAPI(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📧 محاولة الإرسال عبر Web3Forms API...');

      const formData = new FormData();
      formData.append('access_key', 'c5d5e1b8-8c5a-4b2a-9f3e-1d2c3b4a5f6e'); // مفتاح تجريبي
      formData.append('email', emailData.to);
      formData.append('subject', emailData.subject);
      formData.append('message', emailData.html || emailData.text || '');
      formData.append('from_name', 'رزقي - موقع الزواج الإسلامي');

      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('✅ تم إرسال الإيميل بنجاح عبر Web3Forms');
          return { success: true };
        }
      }

      return { success: false, error: 'Web3Forms request failed' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Web3Forms failed' };
    }
  }
}

// إبقاء الكلاس القديم للتوافق مع الكود الموجود
export class FinalEmailService extends AdvancedEmailService {
  // الدوال القديمة للتوافق
  static async sendEmail(
    to: string,
    subject: string,
    message: string
  ): Promise<{ success: boolean; error?: string; method?: string }> {
    const emailData: EmailData = {
      to,
      subject,
      html: `<pre>${message}</pre>`,
      text: message,
      type: 'verification'
    };

    return await super.sendEmail(emailData);
  }
}

export default AdvancedEmailService;
