/**
 * فحص حالة النطاق في Resend
 */

export async function checkResendDomain() {
  console.log('🌐 فحص حالة النطاق في Resend...');
  
  const apiKey = 're_Eeyyz27p_A9UUaYMYoj5Q2xKqRygMJCQU';
  
  try {
    const response = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ تم الاتصال بـ Resend بنجاح!');
      console.log('📊 النطاقات المتاحة:', result.data?.length || 0);
      
      if (result.data && result.data.length > 0) {
        result.data.forEach((domain: any, index: number) => {
          console.log(`${index + 1}. النطاق: ${domain.name}`);
          console.log(`   الحالة: ${domain.status}`);
          console.log(`   تاريخ الإنشاء: ${domain.created_at}`);
          console.log('   ---');
        });
        
        const verifiedDomains = result.data.filter((d: any) => d.status === 'verified');
        if (verifiedDomains.length > 0) {
          console.log(`✅ النطاقات المحققة: ${verifiedDomains.length}`);
          return { success: true, hasVerifiedDomains: true, domains: result.data };
        } else {
          console.log('⚠️ لا توجد نطاقات محققة. سيتم استخدام النطاق الافتراضي.');
          return { success: true, hasVerifiedDomains: false, domains: result.data };
        }
      } else {
        console.log('ℹ️ لا توجد نطاقات مخصصة. سيتم استخدام النطاق الافتراضي لـ Resend.');
        return { success: true, hasVerifiedDomains: false, domains: [] };
      }
    } else {
      const errorText = await response.text();
      console.error('❌ خطأ في فحص النطاقات:', errorText);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error('💥 خطأ في الشبكة:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * اختبار إرسال مع النطاق الافتراضي
 */
export async function testWithDefaultDomain(email: string = 'kemoamego@gmail.com') {
  console.log('📧 اختبار الإرسال مع النطاق الافتراضي...');
  
  const apiKey = 're_SzpNMQkj_BRNeW5iRuLTnHQbLv6UoP2uq';
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'رزقي <onboarding@resend.dev>', // استخدام النطاق الافتراضي
        to: [email],
        subject: 'اختبار من رزقي - النطاق الافتراضي',
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>🕌 مرحباً من رزقي!</h2>
            <p>هذا اختبار باستخدام النطاق الافتراضي لـ Resend.</p>
            <p>إذا وصلك هذا الإيميل، فهذا يعني أن مفتاح API يعمل بشكل صحيح! ✅</p>
            <p><strong>الوقت:</strong> ${new Date().toLocaleString('ar-SA')}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              تم الإرسال من: onboarding@resend.dev (النطاق الافتراضي)
            </p>
          </div>
        `,
        text: `
مرحباً من رزقي!

هذا اختبار باستخدام النطاق الافتراضي لـ Resend.

إذا وصلك هذا الإيميل، فهذا يعني أن مفتاح API يعمل بشكل صحيح!

الوقت: ${new Date().toLocaleString('ar-SA')}

تم الإرسال من: onboarding@resend.dev (النطاق الافتراضي)
        `
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('🎉 نجح الإرسال مع النطاق الافتراضي!');
      console.log('📧 معرف الرسالة:', result.id);
      console.log(`📬 تحقق من بريدك الإلكتروني: ${email}`);
      console.log('💡 إذا وصل الإيميل، فالمفتاح يعمل والمشكلة في النطاق المخصص فقط.');
      
      return {
        success: true,
        messageId: result.id,
        from: 'onboarding@resend.dev'
      };
    } else {
      const errorText = await response.text();
      console.error('❌ فشل الإرسال مع النطاق الافتراضي:', errorText);
      return {
        success: false,
        error: errorText
      };
    }
  } catch (error) {
    console.error('💥 خطأ في الاختبار:', error);
    return {
      success: false,
      error: String(error)
    };
  }
}

/**
 * فحص شامل لحالة Resend
 */
export async function fullResendCheck(email: string = 'kemoamego@gmail.com') {
  console.log('🔍 بدء فحص شامل لحالة Resend...');
  console.log('');
  
  // 1. فحص النطاقات
  console.log('1️⃣ فحص النطاقات...');
  const domainCheck = await checkResendDomain();
  console.log('');
  
  // 2. اختبار مع النطاق الافتراضي
  console.log('2️⃣ اختبار مع النطاق الافتراضي...');
  const defaultTest = await testWithDefaultDomain(email);
  console.log('');
  
  // 3. اختبار مع النطاق المخصص (إذا كان متاحاً)
  console.log('3️⃣ اختبار مع النطاق المخصص...');
  const customTest = await testCustomDomain(email);
  console.log('');
  
  // النتائج النهائية
  console.log('📊 ملخص النتائج:');
  console.log(`✅ فحص النطاقات: ${domainCheck.success ? 'نجح' : 'فشل'}`);
  console.log(`✅ النطاق الافتراضي: ${defaultTest.success ? 'نجح' : 'فشل'}`);
  console.log(`✅ النطاق المخصص: ${customTest.success ? 'نجح' : 'فشل'}`);
  
  if (defaultTest.success) {
    console.log('🎉 مفتاح API يعمل بشكل صحيح!');
    if (!customTest.success) {
      console.log('💡 المشكلة في النطاق المخصص. استخدم النطاق الافتراضي مؤقتاً.');
    }
  } else {
    console.log('❌ هناك مشكلة في مفتاح API أو الإعدادات.');
  }
  
  return {
    domainCheck,
    defaultTest,
    customTest,
    recommendation: defaultTest.success ? 
      (customTest.success ? 'استخدم النطاق المخصص' : 'استخدم النطاق الافتراضي') :
      'تحقق من مفتاح API'
  };
}

/**
 * اختبار مع النطاق المخصص
 */
async function testCustomDomain(email: string) {
  const apiKey = 're_SzpNMQkj_BRNeW5iRuLTnHQbLv6UoP2uq';
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'رزقي - موقع الزواج الإسلامي <manage@kareemamged.com>',
        to: [email],
        subject: 'اختبار من رزقي - النطاق المخصص',
        html: '<div dir="rtl"><h2>اختبار النطاق المخصص</h2><p>إذا وصل هذا الإيميل، فالنطاق المخصص يعمل! ✅</p></div>',
        text: 'اختبار النطاق المخصص من رزقي'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ نجح الإرسال مع النطاق المخصص!');
      return { success: true, messageId: result.id };
    } else {
      const errorText = await response.text();
      console.log('❌ فشل الإرسال مع النطاق المخصص:', errorText);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.log('❌ خطأ في اختبار النطاق المخصص:', error);
    return { success: false, error: String(error) };
  }
}

// إتاحة الدوال في الكونسول
if (typeof window !== 'undefined') {
  (window as any).resendDomainTests = {
    checkResendDomain,
    testWithDefaultDomain,
    fullResendCheck
  };

  console.log('🌐 أدوات فحص النطاق متاحة:');
  console.log('  • resendDomainTests.fullResendCheck("kemoamego@gmail.com") - فحص شامل');
  console.log('  • resendDomainTests.checkResendDomain() - فحص النطاقات');
  console.log('  • resendDomainTests.testWithDefaultDomain("kemoamego@gmail.com") - اختبار النطاق الافتراضي');
}

export {};
