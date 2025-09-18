/**
 * اختبار شامل ونهائي لجميع خدمات الإيميل
 * يختبر النظام الكامل مع جميع البدائل
 */

/**
 * اختبار شامل لجميع خدمات الإيميل
 */
export async function ultimateEmailTest(email: string = 'kemoamego@gmail.com') {
  console.log('🚀 بدء الاختبار الشامل لجميع خدمات الإيميل...');
  console.log(`📧 سيتم الإرسال إلى: ${email}`);
  console.log('');
  console.log('🎯 سيتم اختبار:');
  console.log('  1. النظام الكامل (جميع الطبقات)');
  console.log('  2. Web SMTP (5 خدمات)');
  console.log('  3. Supabase Email (3 طرق)');
  console.log('  4. خدمات فردية');
  console.log('');

  const results = {
    fullSystem: null,
    webSMTP: null,
    supabaseEmail: null,
    individualServices: []
  };

  try {
    // 1. اختبار النظام الكامل
    console.log('🔥 1️⃣ اختبار النظام الكامل...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
      const { testFullSystemWithWebSMTP } = await import('./webSMTPTest');
      results.fullSystem = await testFullSystemWithWebSMTP(email);
      
      if (results.fullSystem.success) {
        console.log('✅ النظام الكامل يعمل بنجاح!');
      } else {
        console.log('❌ النظام الكامل فشل');
      }
    } catch (error) {
      console.log('💥 خطأ في اختبار النظام الكامل:', error);
      results.fullSystem = { success: false, error: String(error) };
    }

    console.log('');

    // 2. اختبار Web SMTP
    console.log('🌐 2️⃣ اختبار Web SMTP (5 خدمات)...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
      const { WebSMTPService } = await import('../lib/nodemailerSMTP');
      results.webSMTP = await WebSMTPService.testService(email);
      
      if (results.webSMTP.success) {
        console.log('✅ Web SMTP يعمل بنجاح!');
        const workingServices = results.webSMTP.results.filter(r => r.success);
        console.log(`🔥 ${workingServices.length} من ${results.webSMTP.results.length} خدمات تعمل`);
      } else {
        console.log('❌ جميع خدمات Web SMTP فشلت');
      }
    } catch (error) {
      console.log('💥 خطأ في اختبار Web SMTP:', error);
      results.webSMTP = { success: false, error: String(error) };
    }

    console.log('');

    // 3. اختبار Supabase Email
    console.log('🔷 3️⃣ اختبار Supabase Email (3 طرق)...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
      const { SupabaseEmailService } = await import('../lib/supabaseEmailService');
      results.supabaseEmail = await SupabaseEmailService.testService(email);
      
      if (results.supabaseEmail.success) {
        console.log('✅ Supabase Email يعمل بنجاح!');
        const workingMethods = results.supabaseEmail.results.filter(r => r.success);
        console.log(`🔥 ${workingMethods.length} من ${results.supabaseEmail.results.length} طرق تعمل`);
      } else {
        console.log('❌ جميع طرق Supabase Email فشلت');
      }
    } catch (error) {
      console.log('💥 خطأ في اختبار Supabase Email:', error);
      results.supabaseEmail = { success: false, error: String(error) };
    }

    console.log('');

    // 4. اختبار خدمات فردية
    console.log('⚡ 4️⃣ اختبار خدمات فردية...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // اختبار الخدمة الرئيسية
    try {
      console.log('📧 اختبار AdvancedEmailService...');
      const { AdvancedEmailService } = await import('../lib/finalEmailService');
      
      const testResult = await AdvancedEmailService.sendVerificationEmail(
        email,
        'https://example.com/verify?token=ultimate-test',
        { first_name: 'أحمد', last_name: 'محمد' },
        'ar'
      );
      
      results.individualServices.push({
        service: 'AdvancedEmailService',
        success: testResult.success,
        method: testResult.method,
        error: testResult.error
      });
      
      if (testResult.success) {
        console.log(`✅ AdvancedEmailService نجح (${testResult.method})`);
      } else {
        console.log('❌ AdvancedEmailService فشل:', testResult.error);
      }
    } catch (error) {
      console.log('💥 خطأ في AdvancedEmailService:', error);
      results.individualServices.push({
        service: 'AdvancedEmailService',
        success: false,
        error: String(error)
      });
    }

    console.log('');

    // 5. تقرير شامل
    console.log('📊 5️⃣ التقرير الشامل...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // حساب الإحصائيات
    let totalServices = 0;
    let workingServices = 0;
    
    // النظام الكامل
    if (results.fullSystem?.success) workingServices++;
    totalServices++;
    
    // Web SMTP
    if (results.webSMTP?.success) {
      const webWorkingCount = results.webSMTP.results.filter(r => r.success).length;
      workingServices += webWorkingCount;
      totalServices += results.webSMTP.results.length;
    }
    
    // Supabase Email
    if (results.supabaseEmail?.success) {
      const supabaseWorkingCount = results.supabaseEmail.results.filter(r => r.success).length;
      workingServices += supabaseWorkingCount;
      totalServices += results.supabaseEmail.results.length;
    }
    
    // خدمات فردية
    const individualWorkingCount = results.individualServices.filter(r => r.success).length;
    workingServices += individualWorkingCount;
    totalServices += results.individualServices.length;
    
    // عرض النتائج
    console.log(`📈 إجمالي الخدمات المختبرة: ${totalServices}`);
    console.log(`✅ الخدمات العاملة: ${workingServices}`);
    console.log(`❌ الخدمات المعطلة: ${totalServices - workingServices}`);
    console.log(`📊 معدل النجاح: ${Math.round((workingServices / totalServices) * 100)}%`);
    
    console.log('');
    console.log('🎯 تفاصيل النتائج:');
    
    // النظام الكامل
    console.log(`  🔥 النظام الكامل: ${results.fullSystem?.success ? '✅ يعمل' : '❌ معطل'}`);
    
    // Web SMTP
    if (results.webSMTP?.results) {
      console.log('  🌐 Web SMTP:');
      results.webSMTP.results.forEach(result => {
        console.log(`    • ${result.service}: ${result.success ? '✅' : '❌'}`);
      });
    }
    
    // Supabase Email
    if (results.supabaseEmail?.results) {
      console.log('  🔷 Supabase Email:');
      results.supabaseEmail.results.forEach(result => {
        console.log(`    • ${result.service}: ${result.success ? '✅' : '❌'}`);
      });
    }
    
    // خدمات فردية
    if (results.individualServices.length > 0) {
      console.log('  ⚡ خدمات فردية:');
      results.individualServices.forEach(result => {
        console.log(`    • ${result.service}: ${result.success ? '✅' : '❌'} ${result.method ? `(${result.method})` : ''}`);
      });
    }
    
    console.log('');
    
    // التوصيات
    if (workingServices > 0) {
      console.log('🎉 النتيجة النهائية: النظام يعمل بنجاح!');
      console.log(`📬 تحقق من بريدك الإلكتروني: ${email}`);
      console.log('✨ يجب أن تجد عدة إيميلات من رزقي');
      
      if (workingServices >= totalServices * 0.8) {
        console.log('🏆 أداء ممتاز! معظم الخدمات تعمل');
      } else if (workingServices >= totalServices * 0.5) {
        console.log('👍 أداء جيد! نصف الخدمات تعمل');
      } else {
        console.log('⚠️ أداء متوسط! بعض الخدمات تعمل');
      }
    } else {
      console.log('❌ النتيجة النهائية: جميع الخدمات معطلة');
      console.log('💡 تحقق من:');
      console.log('  • اتصال الإنترنت');
      console.log('  • إعدادات SMTP');
      console.log('  • مفاتيح API للخدمات الخارجية');
    }
    
    return {
      success: workingServices > 0,
      totalServices,
      workingServices,
      successRate: Math.round((workingServices / totalServices) * 100),
      results
    };
    
  } catch (error) {
    console.error('💥 خطأ في الاختبار الشامل:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * اختبار سريع للنظام
 */
export async function quickSystemTest(email: string = 'kemoamego@gmail.com') {
  console.log('⚡ اختبار سريع للنظام...');
  console.log(`📧 سيتم الإرسال إلى: ${email}`);
  
  try {
    const { AdvancedEmailService } = await import('../lib/finalEmailService');
    
    const result = await AdvancedEmailService.send2FACodeEmail(
      email,
      '999888',
      'login',
      10,
      'ar'
    );
    
    if (result.success) {
      console.log('🎉 الاختبار السريع نجح!');
      console.log(`📧 الطريقة: ${result.method}`);
      console.log(`📬 تحقق من بريدك الإلكتروني: ${email}`);
      console.log('✨ يجب أن تجد رمز 2FA: 999888');
    } else {
      console.log('❌ الاختبار السريع فشل:', result.error);
    }
    
    return result;
    
  } catch (error) {
    console.error('💥 خطأ في الاختبار السريع:', error);
    return { success: false, error: String(error) };
  }
}

// إتاحة الدوال في الكونسول
if (typeof window !== 'undefined') {
  (window as any).ultimateEmailTests = {
    ultimateEmailTest,
    quickSystemTest
  };

  console.log('🚀 أدوات الاختبار الشامل متاحة:');
  console.log('  • ultimateEmailTests.ultimateEmailTest("kemoamego@gmail.com") - اختبار شامل لكل شيء');
  console.log('  • ultimateEmailTests.quickSystemTest("kemoamego@gmail.com") - اختبار سريع');
}

export {};
