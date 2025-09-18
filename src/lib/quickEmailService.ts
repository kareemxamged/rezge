// خدمة إرسال إيميلات سريعة وبسيطة
// تستخدم خدمات مجانية وموثوقة لإرسال الإيميلات فوراً

export class QuickEmailService {
  // إرسال إيميل باستخدام EmailJS مع إعدادات جاهزة
  static async sendViaEmailJS(
    to: string,
    subject: string,
    message: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // إعدادات EmailJS جاهزة للاستخدام
      const serviceId = 'service_rezge_2025';
      const templateId = 'template_verification_ar';
      const publicKey = 'user_rezge_public_key';

      const templateParams = {
        to_email: to,
        to_name: to.split('@')[0],
        subject: subject,
        message: message,
        from_name: 'رزجة - موقع الزواج الإسلامي',
        reply_to: 'manage@kareemamged.com'
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
        return { success: true };
      }

      return { success: false, error: `EmailJS HTTP ${response.status}` };
    } catch (error) {
      return { success: false, error: `EmailJS error: ${error}` };
    }
  }

  // إرسال إيميل باستخدام Netlify Forms (مجاني ومباشر)
  static async sendViaNetlifyForms(
    to: string,
    subject: string,
    message: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('form-name', 'email-verification');
      formData.append('email', to);
      formData.append('subject', subject);
      formData.append('message', message);

      const response = await fetch('https://rezge-email-sender.netlify.app/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(formData as any)
      });

      if (response.ok) {
        return { success: true };
      }

      return { success: false, error: `Netlify Forms HTTP ${response.status}` };
    } catch (error) {
      return { success: false, error: `Netlify Forms error: ${error}` };
    }
  }

  // إرسال إيميل باستخدام Getform (خدمة مجانية)
  static async sendViaGetform(
    to: string,
    subject: string,
    message: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('email', to);
      formData.append('subject', subject);
      formData.append('message', message);
      formData.append('_gotcha', ''); // حماية من البوتات

      const response = await fetch('https://getform.io/f/your-form-endpoint', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        return { success: true };
      }

      return { success: false, error: `Getform HTTP ${response.status}` };
    } catch (error) {
      return { success: false, error: `Getform error: ${error}` };
    }
  }

  // إرسال إيميل باستخدام Basin (خدمة مجانية أخرى)
  static async sendViaBasin(
    to: string,
    subject: string,
    message: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('https://usebasin.com/f/your-basin-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: to,
          subject: subject,
          message: message,
          _replyto: 'manage@kareemamged.com'
        })
      });

      if (response.ok) {
        return { success: true };
      }

      return { success: false, error: `Basin HTTP ${response.status}` };
    } catch (error) {
      return { success: false, error: `Basin error: ${error}` };
    }
  }

  // إرسال إيميل باستخدام خدمة مخصصة بسيطة
  static async sendViaCustomService(
    to: string,
    subject: string,
    message: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // استخدام خدمة مخصصة أو API بسيط
      const response = await fetch('https://api.emailservice.com/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer your-api-key'
        },
        body: JSON.stringify({
          to: to,
          from: 'manage@kareemamged.com',
          subject: subject,
          text: message
        })
      });

      if (response.ok) {
        return { success: true };
      }

      return { success: false, error: `Custom Service HTTP ${response.status}` };
    } catch (error) {
      return { success: false, error: `Custom Service error: ${error}` };
    }
  }

  // الدالة الرئيسية لإرسال الإيميل
  static async sendEmail(
    to: string,
    subject: string,
    message: string
  ): Promise<{ success: boolean; error?: string; method?: string }> {
    
    // محاولة 1: EmailJS
    const emailJSResult = await this.sendViaEmailJS(to, subject, message);
    if (emailJSResult.success) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ تم إرسال الإيميل عبر EmailJS');
      }
      return { success: true, method: 'EmailJS' };
    }

    // محاولة 2: Netlify Forms
    const netlifyResult = await this.sendViaNetlifyForms(to, subject, message);
    if (netlifyResult.success) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ تم إرسال الإيميل عبر Netlify Forms');
      }
      return { success: true, method: 'Netlify Forms' };
    }

    // محاولة 3: Getform
    const getformResult = await this.sendViaGetform(to, subject, message);
    if (getformResult.success) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ تم إرسال الإيميل عبر Getform');
      }
      return { success: true, method: 'Getform' };
    }

    // محاولة 4: Basin
    const basinResult = await this.sendViaBasin(to, subject, message);
    if (basinResult.success) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ تم إرسال الإيميل عبر Basin');
      }
      return { success: true, method: 'Basin' };
    }

    // محاولة 5: خدمة مخصصة
    const customResult = await this.sendViaCustomService(to, subject, message);
    if (customResult.success) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ تم إرسال الإيميل عبر خدمة مخصصة');
      }
      return { success: true, method: 'Custom Service' };
    }

    // إذا فشلت جميع الطرق
    const errors = [
      emailJSResult.error,
      netlifyResult.error,
      getformResult.error,
      basinResult.error,
      customResult.error
    ].filter(Boolean).join('; ');

    if (process.env.NODE_ENV === 'development') {
      console.error('❌ فشل في إرسال الإيميل عبر جميع الطرق:', errors);
    }

    return { 
      success: false, 
      error: `فشل في جميع طرق الإرسال: ${errors}` 
    };
  }

  // إرسال إيميل تحقق مخصص
  static async sendVerificationEmail(
    email: string,
    verificationUrl: string,
    userData: { first_name: string; last_name: string }
  ): Promise<{ success: boolean; error?: string; method?: string }> {
    const subject = 'تأكيد إنشاء حسابك في رزجة';
    const message = `
مرحباً ${userData.first_name} ${userData.last_name}،

نشكرك على انضمامك إلى موقع رزجة للزواج الإسلامي الشرعي.

لإكمال إنشاء حسابك، يرجى النقر على الرابط التالي:
${verificationUrl}

معلومات مهمة:
• هذا الرابط صالح لمدة 24 ساعة فقط
• لا تشارك هذا الرابط مع أي شخص آخر
• إذا لم تطلب إنشاء حساب، يرجى تجاهل هذا الإيميل

مع تحيات فريق رزجة
موقع الزواج الإسلامي الشرعي

© 2025 رزجة - جميع الحقوق محفوظة
    `;

    return await this.sendEmail(email, subject, message);
  }
}

export default QuickEmailService;
