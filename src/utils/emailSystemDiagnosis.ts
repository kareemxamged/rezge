/**
 * أداة تشخيص شاملة لنظام الإرسال البريدي
 * تختبر جميع خدمات الإرسال وتحدد المشاكل
 */

// استيراد الخدمات المطلوبة
import { AdvancedEmailService } from '../lib/finalEmailService';

interface DiagnosisResult {
  service: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export class EmailSystemDiagnosis {
  private static readonly RESEND_API_KEY = 're_Eeyyz27p_A9UUaYMYoj5Q2xKqRygMJCQU';
  private static readonly RESEND_API_URL = 'https://api.resend.com';

  /**
   * اختبار مفتاح Resend API
   */
  static async testResendAPIKey(): Promise<DiagnosisResult> {
    console.log('🔑 اختبار مفتاح Resend API...');
    
    try {
      const response = await fetch(`${this.RESEND_API_URL}/domains`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        const domains = data.data || [];
        
        console.log('✅ مفتاح API صحيح!');
        console.log(`📊 عدد النطاقات: ${domains.length}`);
        
        if (domains.length > 0) {
          console.log('النطاقات المتاحة:');
          domains.forEach((domain: any, index: number) => {
            console.log(`${index + 1}. ${domain.name} - ${domain.status}`);
          });
        }

        return {
          service: 'Resend API Key',
          status: 'success',
          message: `مفتاح API صحيح. النطاقات المتاحة: ${domains.length}`,
          details: domains
        };
      } else {
        const errorText = await response.text();
        console.error('❌ خطأ في مفتاح API:', errorText);
        
        return {
          service: 'Resend API Key',
          status: 'error',
          message: `خطأ ${response.status}: ${errorText}`,
          details: { status: response.status, error: errorText }
        };
      }
    } catch (error) {
      console.error('💥 خطأ في فحص مفتاح API:', error);
      
      return {
        service: 'Resend API Key',
        status: 'error',
        message: `خطأ في الشبكة: ${error}`,
        details: error
      };
    }
  }

  /**
   * اختبار الإرسال المباشر عبر Resend
   */
  static async testDirectSending(email: string = 'kemoamego@gmail.com'): Promise<DiagnosisResult> {
    console.log(`📧 اختبار الإرسال المباشر إلى ${email}...`);
    
    try {
      const testEmailData = {
        from: 'رزقي - موقع الزواج الإسلامي <onboarding@resend.dev>',
        to: [email],
        subject: '🧪 اختبار نظام الإرسال البريدي - رزقي',
        html: this.generateTestEmailHTML(),
        text: 'هذا اختبار لنظام الإرسال البريدي في موقع رزقي. إذا وصلك هذا الإيميل، فالنظام يعمل بشكل صحيح!'
      };

      const response = await fetch(`${this.RESEND_API_URL}/emails`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testEmailData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ تم الإرسال بنجاح!');
        console.log('📧 معرف الرسالة:', result.id);
        console.log(`📬 تحقق من بريدك الإلكتروني: ${email}`);
        
        return {
          service: 'Direct Resend Sending',
          status: 'success',
          message: `تم الإرسال بنجاح إلى ${email}`,
          details: { messageId: result.id, email }
        };
      } else {
        const errorText = await response.text();
        console.error('❌ فشل الإرسال:', errorText);
        
        return {
          service: 'Direct Resend Sending',
          status: 'error',
          message: `فشل الإرسال: ${response.status} - ${errorText}`,
          details: { status: response.status, error: errorText }
        };
      }
    } catch (error) {
      console.error('💥 خطأ في الإرسال:', error);
      
      return {
        service: 'Direct Resend Sending',
        status: 'error',
        message: `خطأ في الإرسال: ${error}`,
        details: error
      };
    }
  }

  /**
   * اختبار خدمة AdvancedEmailService
   */
  static async testAdvancedEmailService(email: string = 'kemoamego@gmail.com'): Promise<DiagnosisResult> {
    console.log(`🎨 اختبار AdvancedEmailService إلى ${email}...`);
    
    try {
      const result = await AdvancedEmailService.sendVerificationEmail(
        email,
        'https://example.com/verify',
        { first_name: 'اختبار', last_name: 'المستخدم' },
        'ar'
      );

      if (result.success) {
        console.log('✅ نجح إرسال إيميل التحقق عبر AdvancedEmailService');
        
        return {
          service: 'AdvancedEmailService',
          status: 'success',
          message: `نجح إرسال إيميل التحقق إلى ${email}`,
          details: result
        };
      } else {
        console.error('❌ فشل AdvancedEmailService:', result.error);
        
        return {
          service: 'AdvancedEmailService',
          status: 'error',
          message: `فشل الإرسال: ${result.error}`,
          details: result
        };
      }
    } catch (error) {
      console.error('💥 خطأ في AdvancedEmailService:', error);
      
      return {
        service: 'AdvancedEmailService',
        status: 'error',
        message: `خطأ في الخدمة: ${error}`,
        details: error
      };
    }
  }

  /**
   * تشخيص شامل للنظام
   */
  static async runFullDiagnosis(email: string = 'kemoamego@gmail.com'): Promise<DiagnosisResult[]> {
    console.log('🚀 بدء التشخيص الشامل لنظام الإرسال البريدي...');
    console.log(`📧 البريد الإلكتروني للاختبار: ${email}`);
    console.log('');

    const results: DiagnosisResult[] = [];

    // 1. اختبار مفتاح Resend API
    console.log('1️⃣ فحص مفتاح Resend API...');
    const apiKeyResult = await this.testResendAPIKey();
    results.push(apiKeyResult);
    console.log('');

    // 2. اختبار الإرسال المباشر
    console.log('2️⃣ اختبار الإرسال المباشر...');
    const directSendResult = await this.testDirectSending(email);
    results.push(directSendResult);
    console.log('');

    // 3. اختبار AdvancedEmailService
    console.log('3️⃣ اختبار AdvancedEmailService...');
    const advancedServiceResult = await this.testAdvancedEmailService(email);
    results.push(advancedServiceResult);
    console.log('');

    // عرض ملخص النتائج
    console.log('📊 ملخص نتائج التشخيص:');
    console.log('================================');
    results.forEach((result, index) => {
      const statusIcon = result.status === 'success' ? '✅' : result.status === 'error' ? '❌' : '⚠️';
      console.log(`${index + 1}. ${result.service}: ${statusIcon} ${result.message}`);
    });
    console.log('');

    const successCount = results.filter(r => r.status === 'success').length;
    const totalCount = results.length;
    
    if (successCount === totalCount) {
      console.log('🎉 جميع الاختبارات نجحت! النظام يعمل بشكل مثالي.');
    } else if (successCount > 0) {
      console.log(`⚠️ نجح ${successCount} من ${totalCount} اختبارات. هناك مشاكل تحتاج إصلاح.`);
    } else {
      console.log('❌ فشلت جميع الاختبارات. النظام يحتاج إصلاح شامل.');
    }

    return results;
  }

  /**
   * إنشاء HTML للإيميل التجريبي
   */
  private static generateTestEmailHTML(): string {
    return `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">🕌 رزقي</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">موقع الزواج الإسلامي</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">🧪 اختبار نظام الإرسال البريدي</h2>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
                مرحباً! هذا اختبار لنظام الإشعارات البريدية في موقع رزقي.
            </p>
            
            <div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-right: 4px solid #667eea;">
                <p style="margin: 0; color: #333; font-weight: bold;">✅ النظام يعمل بشكل صحيح!</p>
                <p style="margin: 5px 0 0 0; color: #666;">تم الإرسال عبر Resend API</p>
            </div>
            
            <p style="color: #999; font-size: 14px; margin-top: 30px;">
                تم الإرسال في: ${new Date().toLocaleString('ar-SA')}
            </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>رزقي - موقع الزواج الإسلامي الشرعي</p>
            <p>هذا إيميل اختبار تلقائي</p>
        </div>
    </div>
    `;
  }

  /**
   * اختبار سريع للنظام
   */
  static async quickTest(email: string = 'kemoamego@gmail.com'): Promise<void> {
    console.log('⚡ اختبار سريع لنظام الإرسال البريدي...');
    
    const result = await this.testDirectSending(email);
    
    if (result.status === 'success') {
      console.log('🎉 الاختبار السريع نجح! النظام يعمل.');
    } else {
      console.log('❌ الاختبار السريع فشل. تحقق من الإعدادات.');
    }
  }
}

// إتاحة الأدوات في الكونسول
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).emailDiagnosis = {
    testResendAPIKey: EmailSystemDiagnosis.testResendAPIKey,
    testDirectSending: EmailSystemDiagnosis.testDirectSending,
    testAdvancedEmailService: EmailSystemDiagnosis.testAdvancedEmailService,
    runFullDiagnosis: EmailSystemDiagnosis.runFullDiagnosis,
    quickTest: EmailSystemDiagnosis.quickTest
  };

  console.log('🔧 أدوات تشخيص نظام الإرسال البريدي متاحة:');
  console.log('  • emailDiagnosis.quickTest("your@email.com") - اختبار سريع');
  console.log('  • emailDiagnosis.runFullDiagnosis("your@email.com") - تشخيص شامل');
  console.log('  • emailDiagnosis.testResendAPIKey() - فحص مفتاح API');
  console.log('  • emailDiagnosis.testDirectSending("your@email.com") - اختبار إرسال مباشر');
  console.log('');
  console.log('🚀 اختبار فوري: emailDiagnosis.quickTest("kemoamego@gmail.com")');
}

export default EmailSystemDiagnosis;
