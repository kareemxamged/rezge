/**
 * أداة اختبار سريع لنظام قيود التحقق
 * يمكن استخدامها في وحدة التحكم للتحقق من عمل النظام
 */

import { emailVerificationService } from '../lib/emailVerification';

// دالة اختبار سريع
export async function quickTest() {
  console.log('🚀 بدء الاختبار السريع لنظام قيود التحقق...\n');
  
  const testEmail = 'test@example.com';
  
  try {
    // 1. فحص القيود الحالية
    console.log('1️⃣ فحص القيود الحالية...');
    const limits = await emailVerificationService.checkVerificationLimits(testEmail);
    console.log('   يمكن الإرسال:', limits.canSend ? '✅ نعم' : '❌ لا');
    console.log('   المحاولات المتتالية:', limits.consecutiveAttempts);
    console.log('   المحاولات اليومية:', limits.dailyAttempts);
    if (!limits.canSend) {
      console.log('   السبب:', limits.reason);
      console.log('   وقت الانتظار:', limits.waitTime, 'دقيقة');
    }
    console.log('');
    
    // 2. الحصول على الإحصائيات
    console.log('2️⃣ الحصول على الإحصائيات...');
    const stats = await emailVerificationService.getVerificationStats(testEmail);
    console.log('   إجمالي المحاولات:', stats.totalAttempts);
    console.log('   المحاولات الناجحة:', stats.successfulAttempts);
    console.log('   المحاولات الفاشلة:', stats.failedAttempts);
    console.log('   محاولات اليوم:', stats.todayAttempts);
    if (stats.lastAttempt) {
      console.log('   آخر محاولة:', stats.lastAttempt.toLocaleString('ar-SA'));
    }
    console.log('');
    
    // 3. تسجيل محاولة تجريبية
    console.log('3️⃣ تسجيل محاولة تجريبية...');
    await emailVerificationService.logVerificationAttempt(
      testEmail,
      true, // نجحت
      '127.0.0.1'
    );
    console.log('   ✅ تم تسجيل محاولة ناجحة');
    console.log('');
    
    // 4. فحص القيود مرة أخرى
    console.log('4️⃣ فحص القيود بعد التسجيل...');
    const newLimits = await emailVerificationService.checkVerificationLimits(testEmail);
    console.log('   يمكن الإرسال:', newLimits.canSend ? '✅ نعم' : '❌ لا');
    console.log('   المحاولات اليومية:', newLimits.dailyAttempts);
    console.log('');
    
    console.log('✅ انتهى الاختبار السريع بنجاح!');
    return true;
    
  } catch (error) {
    console.error('❌ خطأ في الاختبار السريع:', error);
    return false;
  }
}

// دالة لمحاكاة سيناريو تجاوز الحدود
export async function simulateOverLimit() {
  console.log('🧪 محاكاة تجاوز الحدود...\n');
  
  const testEmail = 'overLimit@example.com';
  
  try {
    // محاكاة 4 محاولات فاشلة متتالية
    console.log('📝 تسجيل 4 محاولات فاشلة متتالية...');
    for (let i = 1; i <= 4; i++) {
      await emailVerificationService.logVerificationAttempt(
        testEmail,
        false,
        '127.0.0.1'
      );
      console.log(`   ${i}. تم تسجيل محاولة فاشلة`);
    }
    console.log('');
    
    // فحص القيود
    console.log('🔍 فحص القيود بعد 4 محاولات فاشلة...');
    const limits = await emailVerificationService.checkVerificationLimits(testEmail);
    console.log('   يمكن الإرسال:', limits.canSend ? '✅ نعم' : '❌ لا');
    if (!limits.canSend) {
      console.log('   السبب:', limits.reason);
      console.log('   وقت الانتظار:', limits.waitTime, 'دقيقة');
    }
    console.log('');
    
    // عرض الإحصائيات
    const stats = await emailVerificationService.getVerificationStats(testEmail);
    console.log('📊 الإحصائيات النهائية:');
    console.log('   إجمالي المحاولات:', stats.totalAttempts);
    console.log('   المحاولات الفاشلة:', stats.failedAttempts);
    console.log('   محاولات اليوم:', stats.todayAttempts);
    
    return !limits.canSend;
    
  } catch (error) {
    console.error('❌ خطأ في محاكاة تجاوز الحدود:', error);
    return false;
  }
}

// دالة لتنظيف بيانات الاختبار
export async function cleanupTestData() {
  console.log('🧹 تنظيف بيانات الاختبار...');
  
  try {
    const testEmails = [
      'test@example.com',
      'overLimit@example.com',
      'test-consecutive@example.com',
      'test-daily@example.com',
      'test-logging@example.com',
      'test-stats@example.com'
    ];
    
    for (const email of testEmails) {
      const result = await emailVerificationService.resetUserAttempts(email);
      if (result.success) {
        console.log(`   ✅ تم تنظيف بيانات ${email}`);
      }
    }
    
    console.log('✅ انتهى التنظيف بنجاح!');
    return true;
    
  } catch (error) {
    console.error('❌ خطأ في التنظيف:', error);
    return false;
  }
}

// دالة لعرض معلومات النظام
export async function showSystemInfo() {
  console.log('ℹ️ معلومات نظام قيود التحقق:\n');
  
  console.log('📋 القيود المطبقة:');
  console.log('   • حد أقصى 4 محاولات متتالية فاشلة');
  console.log('   • حد أقصى 12 محاولة يومياً');
  console.log('   • حد أدنى 5 دقائق بين كل محاولة');
  console.log('');
  
  console.log('🔧 الوظائف المتاحة:');
  console.log('   • تسجيل تلقائي لجميع المحاولات');
  console.log('   • إحصائيات مفصلة لكل مستخدم');
  console.log('   • واجهة إدارية للمراقبة');
  console.log('   • تنظيف تلقائي للبيانات القديمة');
  console.log('');
  
  console.log('📊 جداول قاعدة البيانات:');
  console.log('   • verification_attempts - تسجيل المحاولات');
  console.log('   • email_verifications - طلبات التحقق');
  console.log('');
  
  console.log('🎯 كيفية الاستخدام:');
  console.log('   import { quickTest } from "./utils/testVerificationSystem";');
  console.log('   await quickTest();');
}

// تصدير جميع الوظائف
export default {
  quickTest,
  simulateOverLimit,
  cleanupTestData,
  showSystemInfo
};

// إضافة الوظائف للنافذة العامة للاختبار في المتصفح (للتطوير فقط)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).verificationTest = {
    quickTest,
    simulateOverLimit,
    cleanupTestData,
    showSystemInfo
  };

  console.log('🔧 أدوات اختبار النظام متاحة في: window.verificationTest');
  console.log('   مثال: await window.verificationTest.quickTest()');
}
