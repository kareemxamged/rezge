/**
 * نظام التحقق الشامل من عمل الإشعارات البريدية
 * يتحقق من جميع أنواع الإيميلات والطرق المختلفة للإرسال
 */

import { AdvancedEmailService } from '../lib/finalEmailServiceNew';
import RealEmailService from '../lib/realEmailService';
import { supabase } from '../lib/supabase';

export interface EmailTestResult {
  testName: string;
  success: boolean;
  method?: string;
  messageId?: string;
  error?: string;
  timestamp: string;
  details?: any;
}

export class EmailSystemVerification {
  
  /**
   * تشغيل جميع اختبارات النظام البريدي
   */
  static async runCompleteVerification(testEmail: string = 'kemooamegoo@gmail.com'): Promise<EmailTestResult[]> {
    console.log('🔍 بدء التحقق الشامل من نظام الإشعارات البريدية...');
    
    const results: EmailTestResult[] = [];
    
    // 1. اختبار دالة قاعدة البيانات
    results.push(await this.testDatabaseFunction(testEmail));
    
    // 2. اختبار الخدمة الحقيقية
    results.push(await this.testRealEmailService(testEmail));
    
    // 3. اختبار الخدمة المتقدمة - إيميل تحقق
    results.push(await this.testAdvancedVerificationEmail(testEmail));
    
    // 4. اختبار كلمة المرور المؤقتة
    results.push(await this.testTemporaryPasswordEmail(testEmail));
    
    // 5. اختبار رمز 2FA
    results.push(await this.test2FACodeEmail(testEmail));
    
    // 6. اختبار رمز إداري
    results.push(await this.testAdmin2FAEmail(testEmail));
    
    // 7. فحص سجل الإيميلات
    results.push(await this.testEmailLogsRetrieval());
    
    // 8. اختبار API endpoint (إن وجد)
    results.push(await this.testAPIEndpoint(testEmail));
    
    console.log('✅ انتهى التحقق الشامل من نظام الإشعارات البريدية');
    this.printVerificationSummary(results);
    
    return results;
  }
  
  /**
   * اختبار دالة قاعدة البيانات send_real_email
   */
  static async testDatabaseFunction(testEmail: string): Promise<EmailTestResult> {
    console.log('🧪 اختبار دالة قاعدة البيانات send_real_email...');
    
    try {
      const { data, error } = await supabase.rpc('send_real_email', {
        email_to: testEmail,
        email_subject: '🧪 اختبار دالة قاعدة البيانات - رزقي',
        email_html: `
          <div style="font-family: Arial, sans-serif; direction: rtl; padding: 20px;">
            <h2 style="color: #1e40af;">🎉 اختبار ناجح!</h2>
            <p>تم إرسال هذا الإيميل بنجاح عبر دالة قاعدة البيانات.</p>
            <div style="background: #dcfce7; padding: 15px; border-radius: 8px;">
              <strong>✅ دالة send_real_email تعمل بنجاح</strong>
            </div>
          </div>
        `,
        email_text: 'اختبار دالة قاعدة البيانات - تم الإرسال بنجاح'
      });
      
      if (error) {
        return {
          testName: 'Database Function Test',
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
      
      return {
        testName: 'Database Function Test',
        success: data?.success || false,
        method: data?.method,
        messageId: data?.message_id,
        timestamp: new Date().toISOString(),
        details: data
      };
      
    } catch (error: any) {
      return {
        testName: 'Database Function Test',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * اختبار الخدمة الحقيقية RealEmailService
   */
  static async testRealEmailService(testEmail: string): Promise<EmailTestResult> {
    console.log('🧪 اختبار RealEmailService...');
    
    try {
      const result = await RealEmailService.testRealEmailSystem(testEmail);
      
      return {
        testName: 'RealEmailService Test',
        success: result.success,
        method: result.method,
        messageId: result.messageId,
        error: result.error,
        timestamp: new Date().toISOString(),
        details: result
      };
      
    } catch (error: any) {
      return {
        testName: 'RealEmailService Test',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * اختبار إيميل التحقق المتقدم
   */
  static async testAdvancedVerificationEmail(testEmail: string): Promise<EmailTestResult> {
    console.log('🧪 اختبار إيميل التحقق المتقدم...');
    
    try {
      const result = await AdvancedEmailService.sendVerificationEmail(
        testEmail,
        'https://rezgee.vercel.app/verify?token=test123',
        { first_name: 'مستخدم تجريبي' },
        'ar'
      );
      
      return {
        testName: 'Advanced Verification Email Test',
        success: result.success,
        method: result.method,
        messageId: result.messageId,
        error: result.error,
        timestamp: new Date().toISOString(),
        details: result
      };
      
    } catch (error: any) {
      return {
        testName: 'Advanced Verification Email Test',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * اختبار كلمة المرور المؤقتة
   */
  static async testTemporaryPasswordEmail(testEmail: string): Promise<EmailTestResult> {
    console.log('🧪 اختبار كلمة المرور المؤقتة...');
    
    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const result = await AdvancedEmailService.sendTemporaryPasswordEmail(
        testEmail,
        'TempPass123!',
        expiresAt,
        'مستخدم تجريبي',
        'ar'
      );
      
      return {
        testName: 'Temporary Password Email Test',
        success: result.success,
        method: result.method,
        messageId: result.messageId,
        error: result.error,
        timestamp: new Date().toISOString(),
        details: result
      };
      
    } catch (error: any) {
      return {
        testName: 'Temporary Password Email Test',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * اختبار رمز 2FA
   */
  static async test2FACodeEmail(testEmail: string): Promise<EmailTestResult> {
    console.log('🧪 اختبار رمز 2FA...');
    
    try {
      const result = await AdvancedEmailService.send2FACodeEmail(
        testEmail,
        '123456',
        'مستخدم تجريبي',
        'ar'
      );
      
      return {
        testName: '2FA Code Email Test',
        success: result.success,
        method: result.method,
        messageId: result.messageId,
        error: result.error,
        timestamp: new Date().toISOString(),
        details: result
      };
      
    } catch (error: any) {
      return {
        testName: '2FA Code Email Test',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * اختبار رمز إداري
   */
  static async testAdmin2FAEmail(testEmail: string): Promise<EmailTestResult> {
    console.log('🧪 اختبار رمز إداري...');
    
    try {
      const result = await AdvancedEmailService.sendAdmin2FACode(
        testEmail,
        '789012',
        'مدير تجريبي',
        'ar'
      );
      
      return {
        testName: 'Admin 2FA Email Test',
        success: result.success,
        method: result.method,
        messageId: result.messageId,
        error: result.error,
        timestamp: new Date().toISOString(),
        details: result
      };
      
    } catch (error: any) {
      return {
        testName: 'Admin 2FA Email Test',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * اختبار جلب سجل الإيميلات
   */
  static async testEmailLogsRetrieval(): Promise<EmailTestResult> {
    console.log('🧪 اختبار جلب سجل الإيميلات...');
    
    try {
      const logs = await RealEmailService.getEmailLogs(5);
      
      return {
        testName: 'Email Logs Retrieval Test',
        success: Array.isArray(logs),
        timestamp: new Date().toISOString(),
        details: { logsCount: logs.length, logs: logs.slice(0, 3) }
      };
      
    } catch (error: any) {
      return {
        testName: 'Email Logs Retrieval Test',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * اختبار API endpoint
   */
  static async testAPIEndpoint(testEmail: string): Promise<EmailTestResult> {
    console.log('🧪 اختبار API endpoint...');
    
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: testEmail,
          subject: '🧪 اختبار API endpoint - رزقي',
          html: `
            <div style="font-family: Arial, sans-serif; direction: rtl; padding: 20px;">
              <h2 style="color: #1e40af;">🎉 اختبار API endpoint ناجح!</h2>
              <p>تم إرسال هذا الإيميل بنجاح عبر API endpoint.</p>
            </div>
          `,
          text: 'اختبار API endpoint - تم الإرسال بنجاح'
        })
      });
      
      const result = await response.json();
      
      return {
        testName: 'API Endpoint Test',
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        timestamp: new Date().toISOString(),
        details: result
      };
      
    } catch (error: any) {
      return {
        testName: 'API Endpoint Test',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * طباعة ملخص نتائج التحقق
   */
  static printVerificationSummary(results: EmailTestResult[]): void {
    console.log('\n📊 ملخص نتائج التحقق من نظام الإشعارات البريدية:');
    console.log('=' .repeat(60));
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ اختبارات ناجحة: ${successful}`);
    console.log(`❌ اختبارات فاشلة: ${failed}`);
    console.log(`📊 المجموع: ${results.length}`);
    console.log(`📈 معدل النجاح: ${((successful / results.length) * 100).toFixed(1)}%`);
    
    console.log('\n📋 تفاصيل النتائج:');
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.testName}`);
      if (result.method) console.log(`   📧 الطريقة: ${result.method}`);
      if (result.messageId) console.log(`   🆔 معرف الرسالة: ${result.messageId}`);
      if (result.error) console.log(`   ⚠️ الخطأ: ${result.error}`);
    });
    
    console.log('\n' + '='.repeat(60));
  }
  
  /**
   * اختبار سريع للنظام
   */
  static async quickTest(testEmail: string = 'kemooamegoo@gmail.com'): Promise<boolean> {
    console.log('⚡ اختبار سريع للنظام البريدي...');
    
    try {
      const result = await AdvancedEmailService.testSystem(testEmail);
      console.log(`⚡ نتيجة الاختبار السريع: ${result.success ? '✅ نجح' : '❌ فشل'}`);
      return result.success;
    } catch (error) {
      console.error('⚡ فشل الاختبار السريع:', error);
      return false;
    }
  }
}

export default EmailSystemVerification;
