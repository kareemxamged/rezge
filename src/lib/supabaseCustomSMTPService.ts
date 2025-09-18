/**
 * خدمة Supabase Custom SMTP المحسنة
 * تستخدم SMTP المخصص المُفعل في Supabase مباشرة
 * مع دعم كامل للنصوص العربية وإدارة الأخطاء
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseCustomSMTPConfig, validateSupabaseCustomSMTPConfig } from '../config/smtpConfig';

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
  type: string;
}

export interface EmailResult {
  success: boolean;
  error?: string;
  method?: string;
  messageId?: string;
}

export class SupabaseCustomSMTPService {
  private static adminClient: any = null;

  /**
   * إنشاء Admin Client مع Service Role Key
   */
  private static getAdminClient() {
    if (this.adminClient) {
      return this.adminClient;
    }

    const config = getSupabaseCustomSMTPConfig();

    if (!validateSupabaseCustomSMTPConfig(config)) {
      console.log('⚠️ إعدادات Supabase Custom SMTP غير مكتملة، استخدام المفاتيح المباشرة...');
    }

    // استخدام المفاتيح المباشرة للتأكد
    const supabaseUrl = 'https://sbtzngewizgeqzfbhfjy.supabase.co';
    const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidHpuZ2V3aXpnZXF6ZmJoZmp5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTEzNzkxMywiZXhwIjoyMDY2NzEzOTEzfQ.HhFFZyYcaYlrsllR5VZ0ppix8lOYGsso5IWCPsjP-3g';

    this.adminClient = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          'Authorization': `Bearer ${serviceKey}`
        }
      }
    });

    return this.adminClient;
  }

  /**
   * دالة آمنة لتشفير النصوص العربية
   */
  private static safeBase64Encode(str: string): string {
    try {
      if (typeof TextEncoder !== 'undefined') {
        const encoder = new TextEncoder();
        const uint8Array = encoder.encode(str);
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        return btoa(binary);
      }
      return btoa(unescape(encodeURIComponent(str)));
    } catch (error) {
      console.warn('فشل في تشفير النص:', error);
      const hex = Array.from(str)
        .map(char => char.charCodeAt(0).toString(16).padStart(4, '0'))
        .join('');
      return btoa(hex);
    }
  }

  /**
   * إرسال إيميل باستخدام Supabase Custom SMTP
   */
  static async sendEmail(emailData: EmailData): Promise<EmailResult> {
    console.log('📧 بدء الإرسال عبر Supabase Custom SMTP...');
    console.log(`📬 إلى: ${emailData.to}`);
    console.log(`📝 الموضوع: ${emailData.subject}`);

    try {
      const config = getSupabaseCustomSMTPConfig();
      
      if (!validateSupabaseCustomSMTPConfig(config)) {
        return {
          success: false,
          error: 'إعدادات Supabase Custom SMTP غير مكتملة'
        };
      }

      // الطريقة 1: استخدام Supabase Auth مع SMTP المخصص
      const authResult = await this.sendViaSupabaseAuth(emailData, config);
      if (authResult.success) {
        return authResult;
      }

      // الطريقة 2: استخدام Edge Function مع SMTP المخصص
      const edgeResult = await this.sendViaEdgeFunction(emailData, config);
      if (edgeResult.success) {
        return edgeResult;
      }

      // الطريقة 3: استخدام Management API مباشرة
      const managementResult = await this.sendViaManagementAPI(emailData, config);
      if (managementResult.success) {
        return managementResult;
      }

      return {
        success: false,
        error: 'فشل في جميع طرق الإرسال عبر Supabase Custom SMTP'
      };

    } catch (error) {
      console.error('❌ خطأ في Supabase Custom SMTP Service:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      };
    }
  }

  /**
   * الطريقة 1: إرسال عبر Supabase Auth مع SMTP المخصص
   */
  private static async sendViaSupabaseAuth(emailData: EmailData, config: any): Promise<EmailResult> {
    try {
      console.log('🔐 محاولة الإرسال عبر Supabase Auth...');
      
      const adminClient = this.getAdminClient();

      // استخدام invite API مع بيانات مخصصة
      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(emailData.to, {
        data: {
          custom_email: true,
          email_subject: emailData.subject,
          email_html: emailData.html,
          email_text: emailData.text,
          email_type: emailData.type
        }
      });

      if (error) {
        console.log('⚠️ فشل Supabase Auth:', error.message);
        return { success: false, error: error.message };
      }

      console.log('✅ تم الإرسال بنجاح عبر Supabase Auth');
      return { 
        success: true, 
        method: 'Supabase Auth',
        messageId: data?.user?.id 
      };

    } catch (error) {
      console.log('⚠️ خطأ في Supabase Auth:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'خطأ في Supabase Auth' 
      };
    }
  }

  /**
   * الطريقة 2: إرسال عبر Edge Function المحدثة (تدعم SMTP + Resend)
   */
  private static async sendViaEdgeFunction(emailData: EmailData, config: any): Promise<EmailResult> {
    try {
      console.log('⚡ محاولة الإرسال عبر Edge Function المحدثة (SMTP + Resend)...');

      // إرسال بيانات مبسطة للـ Edge Function
      const response = await fetch(`${config.supabaseUrl}/functions/v1/send-custom-smtp`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Authorization': `Bearer ${config.supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'apikey': config.supabaseServiceKey
        },
        body: JSON.stringify({
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text || 'نسخة نصية من الإيميل',
          type: emailData.type || 'notification'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ تم الإرسال بنجاح عبر Edge Function');
        return { 
          success: true, 
          method: 'Edge Function',
          messageId: result.messageId 
        };
      } else {
        const errorText = await response.text();
        console.log('⚠️ فشل Edge Function:', errorText);
        return { success: false, error: `Edge Function error: ${response.status}` };
      }

    } catch (error) {
      console.log('⚠️ خطأ في Edge Function:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'خطأ في Edge Function' 
      };
    }
  }

  /**
   * الطريقة 3: إرسال عبر Management API مباشرة
   */
  private static async sendViaManagementAPI(emailData: EmailData, config: any): Promise<EmailResult> {
    try {
      console.log('🔧 محاولة الإرسال عبر Management API...');
      
      // إنشاء رسالة SMTP مع تشفير آمن للنصوص العربية
      const smtpMessage = this.createSMTPMessage(emailData, config);
      
      const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/send_smtp_email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'apikey': config.supabaseServiceKey
        },
        body: JSON.stringify({
          smtp_message: smtpMessage,
          smtp_config: {
            host: config.smtpHost,
            port: config.smtpPort,
            user: config.smtpUser,
            pass: config.smtpPass
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ تم الإرسال بنجاح عبر Management API');
        return { 
          success: true, 
          method: 'Management API',
          messageId: result.messageId 
        };
      } else {
        const errorText = await response.text();
        console.log('⚠️ فشل Management API:', errorText);
        return { success: false, error: `Management API error: ${response.status}` };
      }

    } catch (error) {
      console.log('⚠️ خطأ في Management API:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'خطأ في Management API' 
      };
    }
  }

  /**
   * إنشاء رسالة SMTP مع تشفير آمن للنصوص العربية
   */
  private static createSMTPMessage(emailData: EmailData, config: any): string {
    const boundary = `----=_NextPart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date = new Date().toUTCString();

    let message = '';
    message += `From: ${config.senderName} <${config.senderEmail}>\r\n`;
    message += `To: ${emailData.to}\r\n`;
    message += `Subject: =?UTF-8?B?${this.safeBase64Encode(emailData.subject)}?=\r\n`;
    message += `Date: ${date}\r\n`;
    message += `MIME-Version: 1.0\r\n`;
    message += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n`;
    message += `X-Mailer: Supabase Custom SMTP\r\n`;
    message += `\r\n`;

    // النص العادي
    message += `--${boundary}\r\n`;
    message += `Content-Type: text/plain; charset=UTF-8\r\n`;
    message += `Content-Transfer-Encoding: base64\r\n`;
    message += `\r\n`;
    message += this.safeBase64Encode(emailData.text) + '\r\n';

    // HTML
    message += `--${boundary}\r\n`;
    message += `Content-Type: text/html; charset=UTF-8\r\n`;
    message += `Content-Transfer-Encoding: base64\r\n`;
    message += `\r\n`;
    message += this.safeBase64Encode(emailData.html) + '\r\n';

    message += `--${boundary}--\r\n`;

    return message;
  }

  /**
   * اختبار الاتصال بـ Supabase Custom SMTP
   */
  static async testConnection(): Promise<EmailResult> {
    try {
      console.log('🧪 اختبار الاتصال بـ Supabase Custom SMTP...');
      
      const config = getSupabaseCustomSMTPConfig();
      
      if (!validateSupabaseCustomSMTPConfig(config)) {
        return {
          success: false,
          error: 'إعدادات Supabase Custom SMTP غير مكتملة'
        };
      }

      // اختبار بسيط للاتصال
      const adminClient = this.getAdminClient();
      const { data, error } = await adminClient.auth.admin.listUsers();

      if (error) {
        return {
          success: false,
          error: `فشل الاتصال: ${error.message}`
        };
      }

      console.log('✅ نجح اختبار الاتصال بـ Supabase Custom SMTP');
      return {
        success: true,
        method: 'Connection Test'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ في اختبار الاتصال'
      };
    }
  }
}

export default SupabaseCustomSMTPService;
