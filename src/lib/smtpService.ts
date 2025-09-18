// خدمة SMTP مستقلة لإرسال الإيميلات
// هذه الخدمة تستخدم إعدادات SMTP مخصصة بدلاً من الاعتماد على Supabase

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  senderName: string;
  senderEmail: string;
}

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class SMTPService {
  private config: SMTPConfig;

  constructor(config: SMTPConfig) {
    this.config = config;
  }

  // إرسال إيميل باستخدام Web API
  async sendEmail(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      // استخدام خدمة Web3Forms كبديل لـ Nodemailer في المتصفح
      const response = await this.sendViaWeb3Forms(emailData);
      
      if (response.success) {
        return { success: true };
      }

      // محاولة بديلة باستخدام EmailJS
      const emailJSResponse = await this.sendViaEmailJS(emailData);
      
      if (emailJSResponse.success) {
        return { success: true };
      }

      // محاولة أخيرة باستخدام Formspree
      const formspreeResponse = await this.sendViaFormspree(emailData);
      
      return formspreeResponse;

    } catch (error) {
      console.error('SMTP Service Error:', error);
      return { success: false, error: 'فشل في إرسال الإيميل' };
    }
  }

  // إرسال عبر Web3Forms
  private async sendViaWeb3Forms(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      // يحتاج إلى مفتاح API من Web3Forms
      const WEB3FORMS_ACCESS_KEY = 'your_web3forms_key_here';
      
      if (!WEB3FORMS_ACCESS_KEY || WEB3FORMS_ACCESS_KEY === 'your_web3forms_key_here') {
        return { success: false, error: 'Web3Forms key not configured' };
      }

      const formData = new FormData();
      formData.append('access_key', WEB3FORMS_ACCESS_KEY);
      formData.append('email', emailData.to);
      formData.append('subject', emailData.subject);
      formData.append('message', emailData.html);
      formData.append('from_name', this.config.senderName);
      formData.append('from_email', this.config.senderEmail);

      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ تم إرسال الإيميل عبر Web3Forms');
        }
        return { success: true };
      }

      return { success: false, error: result.message };
    } catch (error) {
      return { success: false, error: 'Web3Forms error' };
    }
  }

  // إرسال عبر EmailJS
  private async sendViaEmailJS(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      // يحتاج إلى إعداد EmailJS
      const EMAILJS_SERVICE_ID = 'your_service_id';
      const EMAILJS_TEMPLATE_ID = 'your_template_id';
      const EMAILJS_USER_ID = 'your_user_id';

      if (!EMAILJS_SERVICE_ID || EMAILJS_SERVICE_ID === 'your_service_id') {
        return { success: false, error: 'EmailJS not configured' };
      }

      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          user_id: EMAILJS_USER_ID,
          template_params: {
            to_email: emailData.to,
            subject: emailData.subject,
            html_content: emailData.html,
            from_name: this.config.senderName,
            from_email: this.config.senderEmail
          }
        })
      });

      if (response.ok) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ تم إرسال الإيميل عبر EmailJS');
        }
        return { success: true };
      }

      return { success: false, error: 'EmailJS send failed' };
    } catch (error) {
      return { success: false, error: 'EmailJS error' };
    }
  }

  // إرسال عبر Formspree
  private async sendViaFormspree(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      // يحتاج إلى form ID من Formspree
      const FORMSPREE_FORM_ID = 'your_formspree_id';

      if (!FORMSPREE_FORM_ID || FORMSPREE_FORM_ID === 'your_formspree_id') {
        return { success: false, error: 'Formspree not configured' };
      }

      const response = await fetch(`https://formspree.io/f/${FORMSPREE_FORM_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailData.to,
          subject: emailData.subject,
          message: emailData.html,
          _replyto: this.config.senderEmail,
          _subject: emailData.subject
        })
      });

      if (response.ok) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ تم إرسال الإيميل عبر Formspree');
        }
        return { success: true };
      }

      return { success: false, error: 'Formspree send failed' };
    } catch (error) {
      return { success: false, error: 'Formspree error' };
    }
  }

  // إنشاء خدمة SMTP من إعدادات قاعدة البيانات
  static async createFromDatabase(): Promise<SMTPService | null> {
    try {
      // هذه الإعدادات يجب أن تأتي من قاعدة البيانات أو متغيرات البيئة
      const config: SMTPConfig = {
        host: 'smtp.hostinger.com',
        port: 465,
        secure: true,
        user: 'manage@kareemamged.com',
        pass: '', // يجب الحصول عليها من قاعدة البيانات
        senderName: 'رزجة - موقع الزواج الإسلامي',
        senderEmail: 'manage@kareemamged.com'
      };

      return new SMTPService(config);
    } catch (error) {
      console.error('Error creating SMTP service:', error);
      return null;
    }
  }
}

// خدمة مبسطة لإرسال إيميلات التحقق
export const simpleEmailService = {
  async sendVerificationEmail(
    email: string,
    verificationUrl: string,
    userData: { first_name: string; last_name: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // محاولة 1: إرسال عبر EmailJS
      const emailJSResult = await this.sendViaEmailJS(email, verificationUrl, userData);
      if (emailJSResult.success) {
        return emailJSResult;
      }

      // محاولة 2: إرسال عبر Web3Forms
      const web3FormsResult = await this.sendViaWeb3Forms(email, verificationUrl, userData);
      if (web3FormsResult.success) {
        return web3FormsResult;
      }

      // محاولة 3: إرسال عبر Formspree
      const formspreeResult = await this.sendViaFormspree(email, verificationUrl, userData);
      if (formspreeResult.success) {
        return formspreeResult;
      }

      // إذا فشلت جميع الطرق، استخدم طريقة بديلة
      return await this.sendViaAlternativeMethod(email, verificationUrl, userData);
    } catch (error) {
      return await this.sendViaAlternativeMethod(email, verificationUrl, userData);
    }
  },

  // إرسال عبر EmailJS (مجاني ومباشر)
  async sendViaEmailJS(
    email: string,
    verificationUrl: string,
    userData: { first_name: string; last_name: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // إعدادات EmailJS - يمكن تخصيصها
      const serviceId = 'service_rezge'; // يجب إنشاؤه في EmailJS
      const templateId = 'template_verification'; // يجب إنشاؤه في EmailJS
      const publicKey = 'your_public_key'; // من EmailJS

      // إذا لم تكن الإعدادات مكونة، تخطي هذه الطريقة
      if (serviceId === 'service_rezge' || publicKey === 'your_public_key') {
        return { success: false, error: 'EmailJS not configured' };
      }

      const templateParams = {
        to_email: email,
        to_name: `${userData.first_name} ${userData.last_name}`,
        verification_url: verificationUrl,
        from_name: 'رزجة - موقع الزواج الإسلامي'
      };

      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: templateParams
        })
      });

      if (response.ok) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ تم إرسال الإيميل عبر EmailJS');
        }
        return { success: true };
      }

      return { success: false, error: 'EmailJS send failed' };
    } catch (error) {
      return { success: false, error: 'EmailJS error' };
    }
  },

  // إرسال عبر Web3Forms (مجاني ومباشر)
  async sendViaWeb3Forms(
    email: string,
    verificationUrl: string,
    userData: { first_name: string; last_name: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // مفتاح Web3Forms - يمكن الحصول عليه مجاناً من web3forms.com
      const accessKey = 'your_web3forms_access_key';

      // إذا لم يكن المفتاح مكوناً، تخطي هذه الطريقة
      if (accessKey === 'your_web3forms_access_key') {
        return { success: false, error: 'Web3Forms not configured' };
      }

      const formData = new FormData();
      formData.append('access_key', accessKey);
      formData.append('email', email);
      formData.append('subject', 'تأكيد إنشاء حسابك في رزجة');
      formData.append('message', this.generateEmailText(verificationUrl, userData));
      formData.append('from_name', 'رزجة - موقع الزواج الإسلامي');

      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ تم إرسال الإيميل عبر Web3Forms');
        }
        return { success: true };
      }

      return { success: false, error: result.message };
    } catch (error) {
      return { success: false, error: 'Web3Forms error' };
    }
  },

  // إرسال عبر Formspree (مجاني ومباشر)
  async sendViaFormspree(
    email: string,
    verificationUrl: string,
    userData: { first_name: string; last_name: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // معرف النموذج من Formspree
      const formId = 'your_formspree_form_id';

      // إذا لم يكن المعرف مكوناً، تخطي هذه الطريقة
      if (formId === 'your_formspree_form_id') {
        return { success: false, error: 'Formspree not configured' };
      }

      const response = await fetch(`https://formspree.io/f/${formId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          subject: 'تأكيد إنشاء حسابك في رزجة',
          message: this.generateEmailText(verificationUrl, userData),
          _replyto: 'manage@kareemamged.com'
        })
      });

      if (response.ok) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ تم إرسال الإيميل عبر Formspree');
        }
        return { success: true };
      }

      return { success: false, error: 'Formspree send failed' };
    } catch (error) {
      return { success: false, error: 'Formspree error' };
    }
  },

  // إنشاء نص الإيميل
  generateEmailText(
    verificationUrl: string,
    userData: { first_name: string; last_name: string }
  ): string {
    return `
مرحباً ${userData.first_name} ${userData.last_name}،

نشكرك على انضمامك إلى موقع رزجة للزواج الإسلامي الشرعي.

لإكمال إنشاء حسابك، يرجى النقر على الرابط التالي لتعيين كلمة المرور:
${verificationUrl}

معلومات مهمة:
• هذا الرابط صالح لمدة 24 ساعة فقط
• لا تشارك هذا الرابط مع أي شخص آخر
• إذا لم تطلب إنشاء حساب، يرجى تجاهل هذا الإيميل

مع تحيات فريق رزجة
موقع الزواج الإسلامي الشرعي

© 2025 رزجة - جميع الحقوق محفوظة
    `;
  },

  async sendViaAlternativeMethod(
    email: string,
    verificationUrl: string,
    userData: { first_name: string; last_name: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // استخدام mailto كحل أخير (للتطوير فقط)
      if (process.env.NODE_ENV === 'development') {
        const subject = encodeURIComponent('تأكيد إنشاء حسابك في رزجة');
        const body = encodeURIComponent(this.generateEmailText(verificationUrl, userData));

        const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;

        console.log('📧 رابط mailto للاختبار:', mailtoUrl);
        console.log('🔗 رابط التحقق:', verificationUrl);

        return { success: true };
      }

      return { success: false, error: 'لا توجد طريقة إرسال متاحة' };
    } catch (error) {
      return { success: false, error: 'فشل في جميع طرق الإرسال' };
    }
  }
};

export default SMTPService;
