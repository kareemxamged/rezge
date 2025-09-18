/**
 * اختبارات نظام قيود إرسال روابط التحقق
 * 
 * هذا الملف يحتوي على اختبارات شاملة للتأكد من عمل النظام بشكل صحيح
 * يمكن تشغيله في بيئة الاختبار للتحقق من جميع السيناريوهات
 */

import { emailVerificationService } from '../lib/emailVerification';
import { supabase } from '../lib/supabase';

// دالة مساعدة لتنظيف البيانات قبل الاختبار
async function cleanupTestData(email: string) {
  await supabase
    .from('verification_attempts')
    .delete()
    .eq('email', email);
    
  await supabase
    .from('email_verifications')
    .delete()
    .eq('email', email);
}

// دالة مساعدة لإنشاء محاولات وهمية
async function createTestAttempts(email: string, attempts: Array<{success: boolean, hoursAgo: number}>) {
  for (const attempt of attempts) {
    const createdAt = new Date();
    createdAt.setHours(createdAt.getHours() - attempt.hoursAgo);
    
    await supabase
      .from('verification_attempts')
      .insert({
        email,
        success: attempt.success,
        attempt_type: 'email_verification',
        created_at: createdAt.toISOString()
      });
  }
}

// اختبار القيد المتتالي (4 محاولات)
export async function testConsecutiveLimit() {
  console.log('🧪 اختبار القيد المتتالي (4 محاولات)...');
  
  const testEmail = 'test-consecutive@example.com';
  await cleanupTestData(testEmail);
  
  try {
    // إنشاء 3 محاولات فاشلة متتالية
    await createTestAttempts(testEmail, [
      { success: false, hoursAgo: 0.5 },
      { success: false, hoursAgo: 1 },
      { success: false, hoursAgo: 1.5 }
    ]);
    
    // المحاولة الرابعة يجب أن تكون مسموحة
    let limits = await emailVerificationService.checkVerificationLimits(testEmail);
    console.log('✅ بعد 3 محاولات فاشلة:', limits.canSend ? 'مسموح' : 'ممنوع');
    
    // إضافة المحاولة الرابعة الفاشلة
    await createTestAttempts(testEmail, [
      { success: false, hoursAgo: 0.1 }
    ]);
    
    // الآن يجب أن يكون ممنوع
    limits = await emailVerificationService.checkVerificationLimits(testEmail);
    console.log('✅ بعد 4 محاولات فاشلة:', limits.canSend ? 'مسموح' : 'ممنوع');
    console.log('   السبب:', limits.reason);
    console.log('   وقت الانتظار:', limits.waitTime, 'دقيقة');
    
    return !limits.canSend && limits.waitTime && limits.waitTime > 0;
    
  } catch (error) {
    console.error('❌ خطأ في اختبار القيد المتتالي:', error);
    return false;
  } finally {
    await cleanupTestData(testEmail);
  }
}

// اختبار القيد اليومي (12 محاولة)
export async function testDailyLimit() {
  console.log('🧪 اختبار القيد اليومي (12 محاولة)...');
  
  const testEmail = 'test-daily@example.com';
  await cleanupTestData(testEmail);
  
  try {
    // إنشاء 11 محاولة خلال آخر 24 ساعة
    const attempts = [];
    for (let i = 0; i < 11; i++) {
      attempts.push({ success: i % 2 === 0, hoursAgo: i * 2 });
    }
    await createTestAttempts(testEmail, attempts);
    
    // المحاولة الـ12 يجب أن تكون مسموحة
    let limits = await emailVerificationService.checkVerificationLimits(testEmail);
    console.log('✅ بعد 11 محاولة:', limits.canSend ? 'مسموح' : 'ممنوع');
    console.log('   المحاولات اليومية:', limits.dailyAttempts);
    
    // إضافة المحاولة الـ12
    await createTestAttempts(testEmail, [
      { success: false, hoursAgo: 0.1 }
    ]);
    
    // الآن يجب أن يكون ممنوع
    limits = await emailVerificationService.checkVerificationLimits(testEmail);
    console.log('✅ بعد 12 محاولة:', limits.canSend ? 'مسموح' : 'ممنوع');
    console.log('   السبب:', limits.reason);
    
    return !limits.canSend && limits.dailyAttempts >= 12;
    
  } catch (error) {
    console.error('❌ خطأ في اختبار القيد اليومي:', error);
    return false;
  } finally {
    await cleanupTestData(testEmail);
  }
}

// اختبار تسجيل المحاولات
export async function testLogging() {
  console.log('🧪 اختبار تسجيل المحاولات...');
  
  const testEmail = 'test-logging@example.com';
  await cleanupTestData(testEmail);
  
  try {
    // تسجيل محاولة ناجحة
    await emailVerificationService.logVerificationAttempt(
      testEmail,
      true,
      '192.168.1.1'
    );
    
    // تسجيل محاولة فاشلة
    await emailVerificationService.logVerificationAttempt(
      testEmail,
      false,
      '192.168.1.1'
    );
    
    // التحقق من التسجيل
    const { data, error } = await supabase
      .from('verification_attempts')
      .select('*')
      .eq('email', testEmail)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    console.log('✅ عدد المحاولات المسجلة:', data?.length || 0);
    console.log('✅ المحاولة الأخيرة:', data?.[0]?.success ? 'فاشلة' : 'ناجحة');
    
    return data && data.length === 2;
    
  } catch (error) {
    console.error('❌ خطأ في اختبار التسجيل:', error);
    return false;
  } finally {
    await cleanupTestData(testEmail);
  }
}

// اختبار الإحصائيات
export async function testStats() {
  console.log('🧪 اختبار الإحصائيات...');
  
  const testEmail = 'test-stats@example.com';
  await cleanupTestData(testEmail);
  
  try {
    // إنشاء محاولات متنوعة
    await createTestAttempts(testEmail, [
      { success: true, hoursAgo: 1 },
      { success: false, hoursAgo: 2 },
      { success: true, hoursAgo: 3 },
      { success: false, hoursAgo: 25 }, // خارج نطاق اليوم
    ]);
    
    // الحصول على الإحصائيات
    const stats = await emailVerificationService.getVerificationStats(testEmail);
    
    console.log('✅ إجمالي المحاولات:', stats.totalAttempts);
    console.log('✅ المحاولات الناجحة:', stats.successfulAttempts);
    console.log('✅ المحاولات الفاشلة:', stats.failedAttempts);
    console.log('✅ محاولات اليوم:', stats.todayAttempts);
    
    return stats.totalAttempts === 4 && 
           stats.successfulAttempts === 2 && 
           stats.failedAttempts === 2 && 
           stats.todayAttempts === 3;
    
  } catch (error) {
    console.error('❌ خطأ في اختبار الإحصائيات:', error);
    return false;
  } finally {
    await cleanupTestData(testEmail);
  }
}

// تشغيل جميع الاختبارات
export async function runAllTests() {
  console.log('🚀 بدء تشغيل اختبارات نظام قيود التحقق...\n');
  
  const tests = [
    { name: 'القيد المتتالي', test: testConsecutiveLimit },
    { name: 'القيد اليومي', test: testDailyLimit },
    { name: 'تسجيل المحاولات', test: testLogging },
    { name: 'الإحصائيات', test: testStats }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const { name, test } of tests) {
    try {
      const result = await test();
      if (result) {
        console.log(`✅ ${name}: نجح\n`);
        passed++;
      } else {
        console.log(`❌ ${name}: فشل\n`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${name}: خطأ - ${error}\n`);
      failed++;
    }
  }
  
  console.log('📊 نتائج الاختبارات:');
  console.log(`✅ نجح: ${passed}`);
  console.log(`❌ فشل: ${failed}`);
  console.log(`📈 معدل النجاح: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  return { passed, failed, total: passed + failed };
}

// تصدير الاختبارات للاستخدام
export default {
  testConsecutiveLimit,
  testDailyLimit,
  testLogging,
  testStats,
  runAllTests
};
