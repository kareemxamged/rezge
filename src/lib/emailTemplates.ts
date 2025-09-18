/**
 * تيمبليت الإيميلات المتقدمة - جميع القوالب المخصصة
 */

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
}

/**
 * تيمبليت إيميل التحقق
 */
export function createVerificationTemplate(
  data: { firstName?: string; lastName?: string; verificationUrl: string },
  language: 'ar' | 'en',
  baseTemplate: string
): EmailTemplate {
  const content = {
    ar: {
      title: 'تأكيد إنشاء حسابك - رزقي',
      heading: 'مرحباً بك في رزقي!',
      greeting: `مرحباً ${data.firstName || 'عزيزي المستخدم'} ${data.lastName || ''}،`,
      description: 'شكراً لك على التسجيل في موقع رزقي للزواج الإسلامي الشرعي. اضغط على الزر أدناه لتأكيد حسابك وتعيين كلمة المرور:',
      confirmButton: 'تأكيد الحساب',
      validFor24h: 'صالح لمدة 24 ساعة فقط',
      securityNote: 'لا تشارك هذا الرابط مع أحد. إذا لم تطلب إنشاء حساب، يرجى تجاهل هذا الإيميل.',
      footer: 'فريق رزقي - موقع الزواج الإسلامي الشرعي'
    },
    en: {
      title: 'Confirm Your Account - Rezge',
      heading: 'Welcome to Rezge!',
      greeting: `Hello ${data.firstName || 'Dear User'} ${data.lastName || ''},`,
      description: 'Thank you for joining Rezge Islamic Marriage Platform. Click the button below to confirm your account and set your password:',
      confirmButton: 'Confirm Account',
      validFor24h: 'Valid for 24 hours only',
      securityNote: 'Do not share this link with anyone. If you didn\'t request account creation, please ignore this email.',
      footer: 'Rezge Team - Islamic Marriage Platform'
    }
  };

  const t = content[language];

  const htmlContent = `
    <div class="greeting">${t.greeting}</div>
    <p>${t.description}</p>
    <div class="main-content">
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.verificationUrl}" class="button">${t.confirmButton}</a>
      </div>
      <div class="warning">
        <strong>⏰ ${t.validFor24h}</strong>
      </div>
    </div>
    <div class="warning">
      <strong>🔒 ${t.securityNote}</strong>
    </div>
  `;

  const textContent = language === 'ar' ?
    `${t.greeting}\n\n${t.description}\n\nرابط التأكيد: ${data.verificationUrl}\n\n${t.validFor24h}\n\n${t.securityNote}\n\n${t.footer}` :
    `${t.greeting}\n\n${t.description}\n\nConfirmation link: ${data.verificationUrl}\n\n${t.validFor24h}\n\n${t.securityNote}\n\n${t.footer}`;

  const finalHtml = replaceBaseKeys(baseTemplate, t.title, language)
    .replace('{{CONTENT}}', htmlContent);

  return {
    subject: t.title,
    htmlContent: finalHtml,
    textContent
  };
}

/**
 * تيمبليت تأكيد تغيير بيانات التواصل
 */
export function createEmailChangeTemplate(
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
  const emailChanged = data.emailChanged && data.newEmail;
  const phoneChanged = data.phoneChanged && data.newPhone;
  const bothChanged = emailChanged && phoneChanged;

  const content = {
    ar: {
      title: 'تأكيد تغيير بيانات التواصل - رزقي',
      heading: 'تأكيد تغيير بيانات التواصل',
      greeting: 'مرحباً بك،',
      description: bothChanged 
        ? 'تم طلب تغيير بيانات التواصل (البريد الإلكتروني ورقم الهاتف) في حسابك.'
        : emailChanged 
        ? 'تم طلب تغيير البريد الإلكتروني في حسابك.'
        : 'تم طلب تغيير رقم الهاتف في حسابك.',
      changesLabel: 'التغييرات المطلوبة:',
      currentEmailLabel: 'البريد الحالي:',
      newEmailLabel: 'البريد الجديد:',
      currentPhoneLabel: 'الهاتف الحالي:',
      newPhoneLabel: 'الهاتف الجديد:',
      confirmButton: 'تأكيد التغيير',
      securityNote: 'إذا لم تطلب هذا التغيير، يرجى تجاهل هذا الإيميل أو التواصل مع الدعم الفني.',
      footer: 'فريق رزقي - موقع الزواج الإسلامي الشرعي'
    },
    en: {
      title: 'Confirm Contact Information Change - Rezge',
      heading: 'Confirm Contact Information Change',
      greeting: 'Hello,',
      description: bothChanged 
        ? 'A request has been made to change your contact information (email and phone number).'
        : emailChanged 
        ? 'A request has been made to change your email address.'
        : 'A request has been made to change your phone number.',
      changesLabel: 'Requested Changes:',
      currentEmailLabel: 'Current Email:',
      newEmailLabel: 'New Email:',
      currentPhoneLabel: 'Current Phone:',
      newPhoneLabel: 'New Phone:',
      confirmButton: 'Confirm Change',
      securityNote: 'If you didn\'t request this change, please ignore this email or contact support.',
      footer: 'Rezge Team - Islamic Marriage Platform'
    }
  };

  const t = content[language];

  let changesHtml = '';
  if (emailChanged) {
    changesHtml += `
      <p><strong>${t.currentEmailLabel}</strong> ${data.currentEmail}</p>
      <p><strong>${t.newEmailLabel}</strong> ${data.newEmail}</p>
    `;
  }
  if (phoneChanged) {
    changesHtml += `
      <p><strong>${t.currentPhoneLabel}</strong> ${data.currentPhone || 'غير محدد'}</p>
      <p><strong>${t.newPhoneLabel}</strong> ${data.newPhone}</p>
    `;
  }

  const htmlContent = `
    <div class="greeting">${t.greeting}</div>
    <p>${t.description}</p>
    <div class="main-content">
      <h3 style="color: #667eea; margin-bottom: 15px;">${t.changesLabel}</h3>
      ${changesHtml}
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.confirmationUrl}" class="button">${t.confirmButton}</a>
      </div>
    </div>
    <div class="warning">
      <strong>🔒 ${t.securityNote}</strong>
    </div>
  `;

  const textContent = language === 'ar' ?
    `${t.greeting}\n\n${t.description}\n\n${t.changesLabel}\n${emailChanged ? `${t.currentEmailLabel} ${data.currentEmail}\n${t.newEmailLabel} ${data.newEmail}\n` : ''}${phoneChanged ? `${t.currentPhoneLabel} ${data.currentPhone || 'غير محدد'}\n${t.newPhoneLabel} ${data.newPhone}\n` : ''}\nرابط التأكيد: ${data.confirmationUrl}\n\n${t.securityNote}\n\n${t.footer}` :
    `${t.greeting}\n\n${t.description}\n\n${t.changesLabel}\n${emailChanged ? `${t.currentEmailLabel} ${data.currentEmail}\n${t.newEmailLabel} ${data.newEmail}\n` : ''}${phoneChanged ? `${t.currentPhoneLabel} ${data.currentPhone || 'Not specified'}\n${t.newPhoneLabel} ${data.newPhone}\n` : ''}\nConfirmation link: ${data.confirmationUrl}\n\n${t.securityNote}\n\n${t.footer}`;

  const finalHtml = replaceBaseKeys(baseTemplate, t.title, language)
    .replace('{{CONTENT}}', htmlContent);

  return {
    subject: t.title,
    htmlContent: finalHtml,
    textContent
  };
}

/**
 * تيمبليت رمز التحقق الثنائي
 */
export function create2FATemplate(
  data: { code: string; codeType: string; expiresInMinutes?: number },
  language: 'ar' | 'en',
  baseTemplate: string
): EmailTemplate {
  const expiresIn = data.expiresInMinutes || 15;

  const content = {
    ar: {
      title: 'رمز التحقق الثنائي - رزقي',
      heading: 'رمز التحقق الثنائي',
      greeting: 'مرحباً بك،',
      description: 'تم طلب رمز تحقق ثنائي لحسابك. استخدم الرمز التالي لإكمال العملية:',
      codeLabel: 'رمز التحقق',
      validityNote: `هذا الرمز صالح لمدة ${expiresIn} دقيقة فقط`,
      securityNote: 'لا تشارك هذا الرمز مع أي شخص آخر. إذا لم تطلب هذا الرمز، يرجى تجاهل هذا الإيميل.',
      footer: 'فريق رزقي - موقع الزواج الإسلامي الشرعي'
    },
    en: {
      title: 'Two-Factor Authentication Code - Rezge',
      heading: 'Two-Factor Authentication Code',
      greeting: 'Hello,',
      description: 'A two-factor authentication code has been requested for your account. Use the following code to complete the process:',
      codeLabel: 'Verification Code',
      validityNote: `This code is valid for ${expiresIn} minutes only`,
      securityNote: 'Do not share this code with anyone. If you didn\'t request this code, please ignore this email.',
      footer: 'Rezge Team - Islamic Marriage Platform'
    }
  };

  const t = content[language];

  const htmlContent = `
    <div class="greeting">${t.greeting}</div>
    <p>${t.description}</p>
    <div class="main-content">
      <h3 style="color: #667eea; margin-bottom: 15px;">${t.codeLabel}</h3>
      <div class="code-display">${data.code}</div>
      <div class="warning">
        <strong>⏰ ${t.validityNote}</strong>
      </div>
    </div>
    <div class="warning">
      <strong>🔒 ${t.securityNote}</strong>
    </div>
  `;

  const textContent = language === 'ar' ?
    `${t.greeting}\n\n${t.description}\n\n${t.codeLabel}: ${data.code}\n\n${t.validityNote}\n\n${t.securityNote}\n\n${t.footer}` :
    `${t.greeting}\n\n${t.description}\n\n${t.codeLabel}: ${data.code}\n\n${t.validityNote}\n\n${t.securityNote}\n\n${t.footer}`;

  const finalHtml = replaceBaseKeys(baseTemplate, t.title, language)
    .replace('{{CONTENT}}', htmlContent);

  return {
    subject: t.title,
    htmlContent: finalHtml,
    textContent
  };
}

// دالة مساعدة لاستبدال المفاتيح الأساسية - محسنة مع دعم اللغتين
function replaceBaseKeys(template: string, title: string, language: 'ar' | 'en' = 'ar'): string {
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
