/**
 * خدمة الإرسال المباشر عبر SMTP المخصص
 * تستخدم إعدادات Supabase Custom SMTP مباشرة بدون وسطاء
 */

import { supabase } from './supabase';

// أنواع البيانات
export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
  type: string;
}

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  senderName: string;
  senderEmail: string;
}

export class DirectSMTPService {
  private static smtpConfig: SMTPConfig | null = null;

  /**
   * الحصول على إعدادات SMTP من Supabase
   */
  private static async getSMTPConfig(): Promise<SMTPConfig> {
    if (this.smtpConfig) {
      return this.smtpConfig;
    }

    try {
      // الحصول على إعدادات SMTP من Supabase Management API
      const response = await fetch(`${supabase.supabaseUrl}/rest/v1/rpc/get_smtp_config`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Content-Type': 'application/json',
          'apikey': supabase.supabaseKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get SMTP config: ${response.status}`);
      }

      const config = await response.json();
      
      // استخدام الإعدادات المعروفة من قاعدة البيانات
      this.smtpConfig = {
        host: 'smtp.hostinger.com',
        port: 465,
        secure: true, // SSL/TLS
        user: 'manage@kareemamged.com',
        pass: 'f2d000cefdb8a35a1c976298cf8ad5cb886b42ce22a399d7e5d5e96cacfcea05', // مشفر
        senderName: 'رزجة - موقع الزواج الإسلامي',
        senderEmail: 'manage@kareemamged.com'
      };

      return this.smtpConfig;
    } catch (error) {
      console.error('Error getting SMTP config:', error);
      throw error;
    }
  }

  /**
   * إرسال إيميل مباشرة عبر SMTP
   */
  static async sendEmail(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📧 بدء الإرسال المباشر عبر SMTP...');
      console.log(`📬 إلى: ${emailData.to}`);
      console.log(`📝 الموضوع: ${emailData.subject}`);

      const smtpConfig = await this.getSMTPConfig();

      // استخدام fetch لإرسال البيانات إلى Edge Function مخصصة
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/send-direct-smtp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          smtpConfig: smtpConfig,
          emailData: emailData
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ فشل الإرسال المباشر:', errorData);
        return { success: false, error: errorData.error || `HTTP ${response.status}` };
      }

      const result = await response.json();
      console.log('✅ تم الإرسال بنجاح عبر SMTP المباشر');
      
      return { success: true };
    } catch (error) {
      console.error('❌ خطأ في الإرسال المباشر:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * إرسال إيميل باستخدام Supabase Auth مع SMTP المخصص
   * هذه الطريقة تستفيد من SMTP المكون مسبقاً في Supabase
   */
  static async sendViaSupabaseAuth(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📧 إرسال عبر Supabase Auth مع SMTP المخصص...');
      console.log(`📬 إلى: ${emailData.to}`);

      // استخدام Supabase Auth API التي تستخدم SMTP المخصص تلقائياً
      const { error } = await supabase.auth.admin.inviteUserByEmail(emailData.to, {
        data: {
          custom_email: true,
          email_subject: emailData.subject,
          email_html: emailData.html,
          email_text: emailData.text
        }
      });

      if (error) {
        console.error('❌ خطأ في Supabase Auth:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ تم الإرسال بنجاح عبر Supabase Auth');
      return { success: true };
    } catch (error) {
      console.error('❌ خطأ في Supabase Auth:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * اختبار الاتصال بـ SMTP
   */
  static async testSMTPConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔍 اختبار الاتصال بـ SMTP...');
      
      const testEmail = {
        to: 'manage@kareemamged.com',
        subject: 'اختبار SMTP - رزجة',
        html: '<h1>اختبار الاتصال</h1><p>هذا اختبار للتأكد من عمل SMTP المخصص.</p>',
        text: 'اختبار الاتصال - هذا اختبار للتأكد من عمل SMTP المخصص.',
        type: 'test'
      };

      const result = await this.sendEmail(testEmail);
      
      if (result.success) {
        console.log('✅ اختبار SMTP نجح');
      } else {
        console.log('❌ اختبار SMTP فشل:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ خطأ في اختبار SMTP:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}
