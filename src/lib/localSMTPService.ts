/**
 * خدمة البريد الإلكتروني باستخدام الخادم المحلي
 * تعمل مع الخادم المحلي أو المرفوع على منصات مثل Vercel/Netlify
 */

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
  type: string;
}

interface EmailResult {
  success: boolean;
  error?: string;
  messageId?: string;
  method?: string;
}

export class LocalSMTPService {
  private static readonly LOCAL_SMTP_URL = 'http://localhost:3001';
  private static readonly PRODUCTION_SMTP_URL = import.meta.env?.VITE_SMTP_SERVER_URL || 'https://your-smtp-server.com';

  /**
   * إرسال بريد إلكتروني عبر الخادم المحلي
   */
  static async sendEmail(emailData: EmailData): Promise<EmailResult> {
    console.log('📧 بدء الإرسال عبر Local SMTP Service...');
    console.log(`📬 إلى: ${emailData.to}`);
    console.log(`📝 الموضوع: ${emailData.subject}`);

    try {
      // تحديد URL الخادم حسب البيئة
      const smtpUrl = this.getSMTPServerURL();

      // تحديد endpoint حسب البيئة
      let endpoint: string;
      if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
        // على Vercel - استخدام API route
        endpoint = '/api/send-email';
        console.log('🔗 استخدام Vercel API Route');
      } else if (smtpUrl) {
        // خادم خارجي
        endpoint = `${smtpUrl}/send-email`;
        console.log(`🔗 استخدام خادم SMTP: ${smtpUrl}`);
      } else {
        // محلي
        endpoint = `${this.LOCAL_SMTP_URL}/send-email`;
        console.log(`🔗 استخدام خادم SMTP المحلي: ${this.LOCAL_SMTP_URL}`);
      }

      // إرسال الطلب
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
          from: 'رزقي - موقع الزواج الإسلامي <manage@kareemamged.com>'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ تم إرسال البريد بنجاح عبر Local SMTP');
        console.log(`📧 Message ID: ${result.messageId}`);
        
        return {
          success: true,
          messageId: result.messageId,
          method: 'Local SMTP Server'
        };
      } else {
        console.log('❌ فشل الإرسال عبر Local SMTP:', result.error);
        return {
          success: false,
          error: result.error || 'Unknown error from SMTP server'
        };
      }

    } catch (error) {
      console.error('❌ خطأ في Local SMTP Service:', error);
      
      // إذا فشل الخادم المحلي، جرب طريقة بديلة
      if (error instanceof Error && error.message.includes('fetch')) {
        console.log('🔄 الخادم المحلي غير متاح، محاولة الطريقة البديلة...');
        return await this.sendViaFallbackMethod(emailData);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      };
    }
  }

  /**
   * تحديد URL خادم SMTP حسب البيئة
   */
  private static getSMTPServerURL(): string {
    // في البيئة المحلية
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return this.LOCAL_SMTP_URL;
    }

    // على Vercel - استخدام API route
    if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
      return ''; // سنستخدم relative path
    }

    // في بيئة الإنتاج الأخرى
    return this.PRODUCTION_SMTP_URL;
  }

  /**
   * طريقة بديلة للإرسال إذا فشل الخادم المحلي
   */
  private static async sendViaFallbackMethod(emailData: EmailData): Promise<EmailResult> {
    try {
      console.log('🔄 محاولة الإرسال عبر الطريقة البديلة...');
      
      // يمكن استخدام خدمة أخرى هنا مثل EmailJS أو Web3Forms
      // أو إرسال عبر API endpoint آخر
      
      // مثال: استخدام Web3Forms كطريقة بديلة
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_key: 'your-web3forms-key', // يجب الحصول على مفتاح من web3forms.com
          subject: emailData.subject,
          email: emailData.to,
          message: emailData.text,
          from_name: 'رزقي - موقع الزواج الإسلامي'
        })
      });

      if (response.ok) {
        console.log('✅ تم الإرسال عبر الطريقة البديلة');
        return {
          success: true,
          method: 'Fallback Method (Web3Forms)'
        };
      } else {
        throw new Error('Fallback method failed');
      }

    } catch (error) {
      console.log('❌ فشلت الطريقة البديلة أيضاً');
      return {
        success: false,
        error: 'جميع طرق الإرسال فشلت'
      };
    }
  }

  /**
   * اختبار اتصال الخادم المحلي
   */
  static async testConnection(): Promise<boolean> {
    try {
      const smtpUrl = this.getSMTPServerURL();
      const response = await fetch(`${smtpUrl}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ خادم SMTP متاح:', result);
        return true;
      } else {
        console.log('⚠️ خادم SMTP غير متاح');
        return false;
      }

    } catch (error) {
      console.log('❌ لا يمكن الوصول لخادم SMTP:', error);
      return false;
    }
  }

  /**
   * إرسال بريد اختبار
   */
  static async sendTestEmail(to: string): Promise<EmailResult> {
    const testEmailData: EmailData = {
      to: to,
      subject: 'اختبار خادم SMTP - رزقي',
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: center; padding: 20px;">
          <h2>🧪 اختبار خادم SMTP</h2>
          <p>هذه رسالة اختبار من خادم SMTP المحلي لموقع رزقي.</p>
          <p>إذا وصلتك هذه الرسالة، فإن الخادم يعمل بشكل صحيح! ✅</p>
          <hr>
          <p style="font-size: 12px; color: #666;">
            الوقت: ${new Date().toLocaleString('ar-SA')}
          </p>
        </div>
      `,
      text: `اختبار خادم SMTP - رزقي\n\nهذه رسالة اختبار من خادم SMTP المحلي.\nإذا وصلتك هذه الرسالة، فإن الخادم يعمل بشكل صحيح!\n\nالوقت: ${new Date().toLocaleString('ar-SA')}`,
      type: 'test'
    };

    return await this.sendEmail(testEmailData);
  }
}

export default LocalSMTPService;
