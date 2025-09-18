/**
 * قالب إيميل موحد وبسيط لجميع أنواع الإيميلات
 * يستخدم تصميم رموز التحقق الثنائي كأساس
 */

export interface UnifiedEmailData {
  title: string;
  heading: string;
  greeting?: string;
  description: string;
  mainContent: string; // المحتوى الرئيسي (كود، كلمة مرور، رابط، إلخ)
  mainContentLabel?: string;
  additionalInfo?: string;
  securityNote?: string;
  footer?: string;
}

export interface LoginNotificationData {
  type: string;
  title: string;
  content: string;
  securityNote?: string;
  deviceInfo?: string;
  ipAddress?: string;
  location?: string;
}

/**
 * إنشاء قالب إيميل موحد
 */
export function createUnifiedEmailTemplate(data: UnifiedEmailData): { html: string; text: string; subject: string } {
  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">رزقي</h1>
          <p style="color: #666; margin: 5px 0;">منصة الزواج الإسلامية</p>
        </div>
        
        <h2 style="color: #333; text-align: center; margin-bottom: 20px;">${data.heading}</h2>
        
        ${data.greeting ? `
        <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
          ${data.greeting}
        </p>
        ` : ''}
        
        <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
          ${data.description}
        </p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h1 style="color: #2563eb; font-size: 32px; letter-spacing: 5px; margin: 0; font-family: monospace;">${data.mainContent}</h1>
          ${data.mainContentLabel ? `<p style="color: #6b7280; font-size: 14px; margin: 10px 0 0 0;">${data.mainContentLabel}</p>` : ''}
        </div>
        
        ${data.additionalInfo ? `
        <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
          ${data.additionalInfo}
        </p>
        ` : ''}
        
        ${data.securityNote ? `
        <div style="background-color: #fef3cd; border: 1px solid #fbbf24; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            <strong>تنبيه أمني:</strong> ${data.securityNote}
          </p>
        </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            ${data.footer || '© 2025 رزقي - منصة الزواج الإسلامية'}
          </p>
        </div>
      </div>
    </div>
  `;

  const text = `
${data.heading}

${data.greeting || ''}

${data.description}

${data.mainContentLabel || 'المحتوى'}: ${data.mainContent}

${data.additionalInfo || ''}

${data.securityNote ? `تنبيه أمني: ${data.securityNote}` : ''}

---
${data.footer || '© 2025 رزقي - منصة الزواج الإسلامية'}
https://rezge.com
  `.trim();

  return {
    html,
    text,
    subject: data.title
  };
}

/**
 * قوالب جاهزة للاستخدام
 */
export const EmailTemplates = {
  /**
   * رمز التحقق الثنائي لتسجيل الدخول
   */
  twoFactorLogin: (code: string): UnifiedEmailData => ({
    title: 'كود تسجيل الدخول - رزقي',
    heading: 'كود تسجيل الدخول',
    greeting: 'السلام عليكم ورحمة الله وبركاته،',
    description: 'تم طلب تسجيل دخول لحسابك في منصة رزقي. استخدم الكود التالي لإكمال عملية تسجيل الدخول:',
    mainContent: code,
    additionalInfo: 'هذا الكود صالح لمدة 10 دقائق فقط. إذا لم تطلب هذا الكود، يرجى تجاهل هذه الرسالة.',
    securityNote: 'لا تشارك هذا الكود مع أي شخص آخر. فريق رزقي لن يطلب منك هذا الكود أبداً.'
  }),

  /**
   * كلمة المرور المؤقتة
   */
  temporaryPassword: (password: string, expiresAt: string, recipientName?: string): UnifiedEmailData => {
    const expiryDate = new Date(expiresAt);
    const expiryTime = expiryDate.toLocaleString('ar-EG', {
      timeZone: 'Asia/Riyadh',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return {
      title: 'كلمة المرور المؤقتة - رزقي',
      heading: 'كلمة المرور المؤقتة',
      greeting: `السلام عليكم ورحمة الله وبركاته ${recipientName || 'عزيزي المستخدم'}،`,
      description: 'تم إنشاء كلمة مرور مؤقتة لحسابك في منصة رزقي. استخدم كلمة المرور التالية لتسجيل الدخول:',
      mainContent: password,
      mainContentLabel: 'كلمة المرور المؤقتة',
      additionalInfo: `صالحة حتى: ${expiryTime}`,
      securityNote: 'لا تشارك كلمة المرور هذه مع أي شخص آخر. يرجى تغييرها فور تسجيل الدخول.'
    };
  },

  /**
   * رمز تفعيل المصادقة الثنائية
   */
  enableTwoFactor: (code: string): UnifiedEmailData => ({
    title: 'كود تفعيل المصادقة الثنائية - رزقي',
    heading: 'كود تفعيل المصادقة الثنائية',
    description: 'تم طلب تفعيل المصادقة الثنائية لحسابك. استخدم الكود التالي لإكمال عملية التفعيل:',
    mainContent: code,
    additionalInfo: 'بعد التفعيل، ستحصل على حماية إضافية لحسابك.',
    securityNote: 'لا تشارك هذا الكود مع أي شخص آخر.'
  }),

  /**
   * رمز إلغاء المصادقة الثنائية
   */
  disableTwoFactor: (code: string): UnifiedEmailData => ({
    title: 'كود إلغاء المصادقة الثنائية - رزقي',
    heading: 'كود إلغاء المصادقة الثنائية',
    description: 'تم طلب إلغاء تفعيل المصادقة الثنائية لحسابك. استخدم الكود التالي لإكمال عملية الإلغاء:',
    mainContent: code,
    securityNote: 'لا تشارك هذا الكود مع أي شخص آخر.'
  }),

  /**
   * رمز التحقق للمشرفين
   */
  adminTwoFactor: (code: string, adminUsername: string): UnifiedEmailData => ({
    title: 'كود التحقق - لوحة الإدارة - رزقي',
    heading: 'كود التحقق - لوحة الإدارة',
    greeting: `السلام عليكم ${adminUsername}،`,
    description: 'تم طلب الوصول إلى لوحة إدارة منصة رزقي. استخدم الكود التالي للمتابعة:',
    mainContent: code,
    additionalInfo: 'هذا الكود صالح لمدة 10 دقائق فقط.',
    securityNote: 'هذا كود وصول حساس للوحة الإدارة. لا تشاركه مع أي شخص آخر.'
  }),

  /**
   * إيميل تعيين كلمة المرور للحساب الجديد
   */
  passwordSetup: (verificationUrl: string, firstName: string): UnifiedEmailData => ({
    title: 'مرحباً بك في رزقي - قم بتعيين كلمة المرور',
    heading: 'مرحباً بك في رزقي!',
    greeting: `أهلاً وسهلاً ${firstName}،`,
    description: 'تم إنشاء حسابك بنجاح في منصة رزقي للزواج الإسلامي. لإكمال إعداد حسابك، يرجى تعيين كلمة مرور آمنة.',
    mainContent: `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background: linear-gradient(135deg, #1e40af 0%, #059669 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block; font-size: 16px;">
          🔐 تعيين كلمة المرور
        </a>
      </div>
    `,
    additionalInfo: 'هذا الرابط صالح لمدة 24 ساعة فقط. بعد تعيين كلمة المرور، ستتمكن من تسجيل الدخول والاستفادة من جميع خدمات المنصة.',
    securityNote: 'لأمانك، لا تشارك هذا الرابط مع أي شخص آخر. إذا لم تقم بإنشاء هذا الحساب، يرجى تجاهل هذا الإيميل.'
  }),

  /**
   * إيميل ترحيبي بسيط للمستخدمين الجدد بعد إنشاء الحساب
   */
  welcomeEmail: (firstName: string): UnifiedEmailData => ({
    title: 'أهلاً وسهلاً بك في رزقي',
    heading: 'مرحباً بك في عائلة رزقي!',
    greeting: `السلام عليكم ورحمة الله وبركاته ${firstName}،`,
    description: 'نرحب بك في منصة رزقي للزواج الإسلامي. نحن ممتنون لثقتك بنا ولاختيارك منصتنا لبدء رحلة البحث عن شريك الحياة.',
    mainContent: '🎉 أهلاً وسهلاً',
    mainContentLabel: 'مرحباً بك في رزقي',
    additionalInfo: 'رزقي هي منصة إسلامية متخصصة في الزواج الحلال، حيث نساعدك في العثور على شريك الحياة المناسب وفقاً لتعاليم ديننا الحنيف. نحن ملتزمون بتوفير بيئة آمنة ومحترمة لجميع أعضائنا.',
    securityNote: undefined
  })
};

/**
 * إنشاء قالب إيميل موحد لإشعارات تسجيل الدخول
 */
export function createLoginNotificationTemplate(data: LoginNotificationData): string {
  return `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">رزقي</h1>
          <p style="color: #666; margin: 5px 0;">منصة الزواج الإسلامية</p>
        </div>
        
        <h2 style="color: #333; text-align: center; margin-bottom: 20px;">🔐 ${data.title}</h2>
        
        ${data.content}
        
        ${data.securityNote || ''}
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © 2025 رزقي - منصة الزواج الإسلامية
          </p>
        </div>
      </div>
    </div>
  `;
}
