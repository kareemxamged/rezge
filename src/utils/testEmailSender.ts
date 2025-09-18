/**
 * خدمة اختبار إرسال الإيميلات الفعلية
 * تستخدم خدمات مجانية لاختبار الإرسال الفعلي
 */

import { AdvancedEmailService } from '../lib/finalEmailService';

/**
 * إرسال إيميل اختبار باستخدام Formspree (مجاني)
 */
export async function sendTestEmailViaFormspree(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // استخدام Formspree endpoint مجاني للاختبار
    // يجب إنشاء form في formspree.io أولاً
    const formspreeEndpoint = 'https://formspree.io/f/YOUR_FORM_ID'; // استبدل بـ Form ID الخاص بك
    
    const response = await fetch(formspreeEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: to,
        subject: subject,
        message: text,
        html: html,
        _replyto: to,
        _subject: subject
      })
    });

    if (response.ok) {
      console.log('✅ تم إرسال الإيميل عبر Formspree');
      return { success: true };
    } else {
      const errorText = await response.text();
      return { success: false, error: `Formspree error: ${response.status} - ${errorText}` };
    }
  } catch (error) {
    return { success: false, error: `Formspree error: ${error}` };
  }
}

/**
 * إرسال إيميل اختبار باستخدام Web3Forms (مجاني)
 */
export async function sendTestEmailViaWeb3Forms(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // استخدام Web3Forms - خدمة مجانية
    // احصل على access key من web3forms.com
    const accessKey = 'YOUR_WEB3FORMS_ACCESS_KEY'; // استبدل بـ Access Key الخاص بك
    
    if (accessKey === 'YOUR_WEB3FORMS_ACCESS_KEY') {
      console.log('⚠️ Web3Forms غير مكون، يرجى إعداد Access Key');
      return { success: false, error: 'Web3Forms not configured' };
    }

    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_key: accessKey,
        email: to,
        subject: subject,
        message: text,
        from_name: 'رزقي - Rezge',
        to_email: to
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ تم إرسال الإيميل عبر Web3Forms');
      return { success: true };
    } else {
      return { success: false, error: `Web3Forms error: ${result.message}` };
    }
  } catch (error) {
    return { success: false, error: `Web3Forms error: ${error}` };
  }
}

/**
 * إرسال إيميل اختبار مع محاولة عدة خدمات
 */
export async function sendRealTestEmail(
  to: string,
  emailType: 'verification' | 'temporary_password' | '2fa' | 'admin_2fa' | 'email_change' | 'security' = 'verification'
): Promise<{ success: boolean; error?: string; method?: string }> {
  console.log(`🧪 محاولة إرسال إيميل فعلي من نوع ${emailType} إلى ${to}`);

  try {
    // إنشاء محتوى الإيميل حسب النوع
    let template;
    
    switch (emailType) {
      case 'verification':
        template = AdvancedEmailService.generateEmailTemplate('verification', {
          verificationUrl: `${window.location.origin}/verify-email?token=test-token-123`,
          firstName: 'أحمد',
          lastName: 'محمد'
        }, 'ar');
        break;
        
      case '2fa':
        template = AdvancedEmailService.generateEmailTemplate('2fa_code', {
          code: '123456',
          codeType: 'login',
          expiresInMinutes: 15
        }, 'ar');
        break;
        
      case 'temporary_password':
        template = AdvancedEmailService.generateEmailTemplate('temporary_password', {
          temporaryPassword: 'TempPass123!',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          recipientName: 'أحمد محمد'
        }, 'ar');
        break;
        
      default:
        template = AdvancedEmailService.generateEmailTemplate('verification', {
          verificationUrl: `${window.location.origin}/verify-email?token=test-token-123`,
          firstName: 'أحمد',
          lastName: 'محمد'
        }, 'ar');
    }

    // محاولة 1: Formspree
    console.log('📧 محاولة الإرسال عبر Formspree...');
    const formspreeResult = await sendTestEmailViaFormspree(
      to,
      template.subject,
      template.htmlContent,
      template.textContent
    );
    
    if (formspreeResult.success) {
      return { success: true, method: 'Formspree' };
    }

    // محاولة 2: Web3Forms
    console.log('📧 محاولة الإرسال عبر Web3Forms...');
    const web3formsResult = await sendTestEmailViaWeb3Forms(
      to,
      template.subject,
      template.htmlContent,
      template.textContent
    );
    
    if (web3formsResult.success) {
      return { success: true, method: 'Web3Forms' };
    }

    // إذا فشلت جميع الطرق
    const errors = [formspreeResult.error, web3formsResult.error].filter(Boolean).join('; ');
    return { success: false, error: `جميع الطرق فشلت: ${errors}` };

  } catch (error) {
    return { success: false, error: `خطأ عام: ${error}` };
  }
}

/**
 * اختبار سريع لإرسال إيميل فعلي
 */
export async function quickRealEmailTest(email: string = 'test@example.com') {
  console.log('🚀 بدء اختبار الإرسال الفعلي...');
  
  const result = await sendRealTestEmail(email, 'verification');
  
  if (result.success) {
    console.log(`✅ نجح الإرسال الفعلي عبر ${result.method}!`);
    console.log(`📧 تحقق من بريدك الإلكتروني: ${email}`);
  } else {
    console.log(`❌ فشل الإرسال الفعلي: ${result.error}`);
    console.log('💡 تأكد من إعداد خدمات الإرسال في الكود');
  }
  
  return result;
}

// إتاحة الدوال في الكونسول للاختبار
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).realEmailTest = {
    sendRealTestEmail,
    quickRealEmailTest,
    sendTestEmailViaFormspree,
    sendTestEmailViaWeb3Forms
  };

  console.log('🔥 أدوات الإرسال الفعلي متاحة:');
  console.log('  • realEmailTest.quickRealEmailTest("your@email.com") - اختبار سريع');
  console.log('  • realEmailTest.sendRealTestEmail("your@email.com", "verification") - اختبار نوع محدد');
  console.log('');
  console.log('⚠️ ملاحظة: يجب إعداد خدمات الإرسال أولاً:');
  console.log('  1. إنشاء حساب في formspree.io أو web3forms.com');
  console.log('  2. الحصول على Form ID أو Access Key');
  console.log('  3. تحديث الكود بالمفاتيح الصحيحة');
}

export {};
