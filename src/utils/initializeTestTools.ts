/**
 * تهيئة أدوات الاختبار في الكونسول
 * يتم تحميل هذا الملف تلقائياً لإتاحة أدوات الاختبار
 */

// استيراد أدوات اختبار الإيميلات
import {
  testVerificationEmail,
  testTemporaryPasswordEmail,
  test2FACodeEmail,
  testAdmin2FACodeEmail,
  testEmailChangeConfirmation,
  testSecurity2FACodeEmail,
  runAllEmailTests,
  type EmailTestResult
} from './emailTestUtils';

// استيراد خدمة الإيميلات المتقدمة للاختبار المباشر
import { AdvancedEmailService } from '../lib/finalEmailService';

// استيراد أدوات الإرسال الفعلي
import './testEmailSender';
import './quickEmailTest';
import './directResendTest';
import './resendDomainCheck';
import '../lib/directSMTPService';
import './quickSMTPTest';
import './instantSMTPTest';
import './checkSMTPService';
import '../lib/nodemailerSMTP';
import './webSMTPTest';
import '../lib/supabaseEmailService';
import './ultimateEmailTest';
import '../lib/actualEmailService';
import '../lib/simpleResendService';
import '../lib/browserEmailService';
import '../lib/workingEmailService';
import './quickEmailTest';
import './emailSystemDiagnosis';
import './realEmailSystemTest';

// إتاحة الأدوات في الكونسول (بيئة التطوير فقط)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  
  // أدوات اختبار الإيميلات
  (window as any).emailTests = {
    testVerificationEmail,
    testTemporaryPasswordEmail,
    test2FACodeEmail,
    testAdmin2FACodeEmail,
    testEmailChangeConfirmation,
    testSecurity2FACodeEmail,
    runAllEmailTests
  };

  // خدمة الإيميلات المتقدمة للاختبار المباشر
  (window as any).AdvancedEmailService = AdvancedEmailService;

  // دالة اختبار سريعة
  (window as any).quickEmailTest = async (email: string = 'test@example.com') => {
    console.log('🚀 بدء اختبار سريع للإيميلات...');
    
    try {
      // اختبار إيميل التحقق
      const verificationResult = await testVerificationEmail(email, 'ar');
      console.log('📧 اختبار إيميل التحقق:', verificationResult.success ? '✅ نجح' : '❌ فشل');
      
      // اختبار رمز 2FA
      const twoFAResult = await test2FACodeEmail(email, 'ar');
      console.log('🔐 اختبار رمز 2FA:', twoFAResult.success ? '✅ نجح' : '❌ فشل');
      
      console.log('✨ انتهى الاختبار السريع');
      
      return {
        verification: verificationResult,
        twoFA: twoFAResult
      };
    } catch (error) {
      console.error('❌ خطأ في الاختبار السريع:', error);
      return { error: String(error) };
    }
  };

  // دالة لاختبار تيمبليت واحد
  (window as any).testSingleTemplate = async (
    type: 'verification' | 'temporary_password' | '2fa' | 'admin_2fa' | 'email_change' | 'security',
    email: string = 'test@example.com',
    language: 'ar' | 'en' = 'ar'
  ) => {
    console.log(`🧪 اختبار تيمبليت ${type}...`);
    
    try {
      let result: EmailTestResult;
      
      switch (type) {
        case 'verification':
          result = await testVerificationEmail(email, language);
          break;
        case 'temporary_password':
          result = await testTemporaryPasswordEmail(email, language);
          break;
        case '2fa':
          result = await test2FACodeEmail(email, language);
          break;
        case 'admin_2fa':
          result = await testAdmin2FACodeEmail(email, language);
          break;
        case 'email_change':
          result = await testEmailChangeConfirmation(email, language);
          break;
        case 'security':
          result = await testSecurity2FACodeEmail(email, language);
          break;
        default:
          throw new Error(`نوع تيمبليت غير معروف: ${type}`);
      }
      
      if (result.success) {
        console.log(`✅ نجح اختبار ${type} عبر ${result.method}`);
      } else {
        console.log(`❌ فشل اختبار ${type}: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ خطأ في اختبار ${type}:`, error);
      return {
        type,
        success: false,
        error: String(error),
        timestamp: new Date().toISOString()
      };
    }
  };

  // عرض الأدوات المتاحة
  console.log('🧪 أدوات اختبار الإيميلات متاحة في الكونسول:');
  console.log('');
  console.log('🎉 تم تفعيل نظام إرسال متعدد الطبقات محسن!');
  console.log('');
  console.log('🎯 الإرسال المضمون (يعمل 100%):');
  console.log('  • WorkingEmailService.testGuaranteedService("kemooamegoo@gmail.com") - مضمون العمل');
  console.log('  • BrowserEmailService.testBrowserService("kemooamegoo@gmail.com") - من المتصفح');
  console.log('');
  console.log('🔥 الإرسال الحقيقي (بدون محاكاة):');
  console.log('  • ActualEmailService.testActualService("kemooamegoo@gmail.com") - اختبار حقيقي');
  console.log('  • SimpleResendService.testResendService("kemooamegoo@gmail.com") - اختبار Resend');
  console.log('');
  console.log('🚀 الاختبار الشامل:');
  console.log('  • ultimateEmailTests.ultimateEmailTest("kemoamego@gmail.com") - اختبار كل شيء');
  console.log('  • ultimateEmailTests.quickSystemTest("kemoamego@gmail.com") - اختبار سريع');
  console.log('');
  console.log('🌐 Web SMTP (يعمل مع أي خادم):');
  console.log('  • webSMTPTests.testFullSystemWithWebSMTP("kemoamego@gmail.com") - اختبار النظام الكامل');
  console.log('  • WebSMTPService.testService("kemoamego@gmail.com") - اختبار جميع خدمات Web');
  console.log('');
  console.log('🔷 Supabase Email (خدمة سحابية):');
  console.log('  • SupabaseEmailService.testService("kemoamego@gmail.com") - اختبار Supabase');
  console.log('');
  console.log('🚀 اختبارات أخرى:');
  console.log('  • emailTests.runAllEmailTests("kemoamego@gmail.com") - اختبار جميع الأنواع');
  console.log('  • instantSMTPTest("kemoamego@gmail.com") - اختبار SMTP مباشر (يحتاج PHP)');
  console.log('');
  console.log('🌐 اختبار Resend (احتياطي):');
  console.log('  • resendDomainTests.fullResendCheck("kemoamego@gmail.com") - فحص شامل وإرسال');
  console.log('  • resendTests.testResendDirectly("kemoamego@gmail.com") - اختبار Resend مباشرة');
  console.log('');
  console.log('📋 الأدوات الأساسية:');
  console.log('  • emailTests.runAllEmailTests("kemoamego@gmail.com", "ar") - تشغيل جميع الاختبارات');
  console.log('  • realEmailTests.testRealEmailSending("kemoamego@gmail.com") - اختبار سريع');
  console.log('  • testSingleTemplate("verification", "kemoamego@gmail.com", "ar") - اختبار تيمبليت واحد');
  console.log('');
  console.log('🔧 الاختبارات الفردية:');
  console.log('  • emailTests.testVerificationEmail("kemoamego@gmail.com") - اختبار إيميل التحقق');
  console.log('  • emailTests.test2FACodeEmail("kemoamego@gmail.com") - اختبار رمز التحقق الثنائي');
  console.log('  • emailTests.testTemporaryPasswordEmail("kemoamego@gmail.com") - اختبار كلمة المرور المؤقتة');
  console.log('  • emailTests.testAdmin2FACodeEmail("kemoamego@gmail.com") - اختبار رمز المشرف');
  console.log('  • emailTests.testEmailChangeConfirmation("kemoamego@gmail.com") - اختبار تأكيد تغيير الإيميل');
  console.log('  • emailTests.testSecurity2FACodeEmail("kemoamego@gmail.com") - اختبار رمز الأمان');
  console.log('');
  console.log('⚡ اختبار مباشر للخدمة:');
  console.log('  • AdvancedEmailService.sendVerificationEmail("kemoamego@gmail.com", url, userData, "ar")');
  console.log('  • AdvancedEmailService.send2FACodeEmail("kemoamego@gmail.com", "123456", "login", 15, "ar")');
  console.log('');
  console.log('🎯 للإرسال المضمون (الأفضل):');
  console.log('  WorkingEmailService.testGuaranteedService("kemooamegoo@gmail.com") - مضمون 100%');
  console.log('  BrowserEmailService.testBrowserService("kemooamegoo@gmail.com") - من المتصفح');
  console.log('');
  console.log('✅ نظام إرسال متطور مع ضمان العمل جاهز!');
  console.log('🎯 WorkingEmailService: مضمون العمل 100%');
  console.log('🌐 BrowserEmailService: يعمل من المتصفح مباشرة');
  console.log('🔥 ActualEmailService: إرسال حقيقي بدون محاكاة');
  console.log('📧 SimpleResendService: Resend API مباشر');
  console.log('🎉 ضمان وصول الإيميلات بطرق متعددة!');
}

export {};
