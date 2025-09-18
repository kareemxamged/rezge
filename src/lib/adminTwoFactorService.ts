import { supabase } from './supabase';
import { AdvancedEmailService } from './finalEmailService';

interface VerificationCode {
  id: string;
  admin_id: string;
  code: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

interface SendCodeResult {
  success: boolean;
  error?: string;
  canRetry?: boolean;
  retryAfter?: number; // بالثواني
  waitTimeText?: string; // نص وقت الانتظار المنسق
  developmentCode?: string; // رمز التحقق للتطوير فقط
}

interface VerifyCodeResult {
  success: boolean;
  error?: string;
}

class AdminTwoFactorService {
  private readonly CODE_LENGTH = 6;
  private readonly CODE_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS_PER_HOUR = 5;
  private readonly RETRY_DELAY_SECONDS = 60; // دقيقة واحدة بين المحاولات
  private readonly MAX_FAILED_VERIFICATIONS = 3; // عدد محاولات التحقق الخاطئة قبل الحظر

  // توليد كود تحقق عشوائي
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // تنسيق وقت الانتظار بشكل مناسب
  private formatWaitTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} ثانية`;
    } else if (seconds < 3600) {
      const minutes = Math.ceil(seconds / 60);
      return `${minutes} دقيقة`;
    } else if (seconds < 86400) {
      const hours = Math.ceil(seconds / 3600);
      return `${hours} ساعة`;
    } else {
      const days = Math.ceil(seconds / 86400);
      return `${days} يوم`;
    }
  }

  // إنشاء الجدول إذا لم يكن موجوداً
  private async createTableIfNotExists(): Promise<void> {
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS admin_verification_codes (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            admin_id UUID NOT NULL,
            code VARCHAR(6) NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );

          CREATE INDEX IF NOT EXISTS idx_admin_verification_codes_admin_id ON admin_verification_codes(admin_id);
          CREATE INDEX IF NOT EXISTS idx_admin_verification_codes_code ON admin_verification_codes(code);
          CREATE INDEX IF NOT EXISTS idx_admin_verification_codes_expires_at ON admin_verification_codes(expires_at);
        `
      });

      if (error) {
        console.error('❌ Failed to create table:', error);
      } else {
        console.log('✅ Table admin_verification_codes created successfully');
      }
    } catch (error) {
      console.error('❌ Error creating table:', error);
    }
  }

  // فحص عدد المحاولات في الساعة الماضية
  private async checkRateLimit(adminId: string): Promise<{ allowed: boolean; retryAfter?: number; waitTimeText?: string }> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('admin_verification_codes')
        .select('created_at')
        .eq('admin_id', adminId)
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error checking rate limit:', error);
        return { allowed: false };
      }

      if (data.length >= this.MAX_ATTEMPTS_PER_HOUR) {
        // حساب الوقت المتبقي حتى انتهاء الحد
        const oldestAttempt = new Date(data[data.length - 1].created_at);
        const retryAfter = Math.ceil((oldestAttempt.getTime() + 60 * 60 * 1000 - Date.now()) / 1000);
        const waitTime = Math.max(retryAfter, 0);
        return {
          allowed: false,
          retryAfter: waitTime,
          waitTimeText: this.formatWaitTime(waitTime)
        };
      }

      // فحص آخر محاولة للتأكد من مرور الوقت المطلوب
      if (data.length > 0) {
        const lastAttempt = new Date(data[0].created_at);
        const timeSinceLastAttempt = (Date.now() - lastAttempt.getTime()) / 1000;
        
        if (timeSinceLastAttempt < this.RETRY_DELAY_SECONDS) {
          const retryAfter = Math.ceil(this.RETRY_DELAY_SECONDS - timeSinceLastAttempt);
          return {
            allowed: false,
            retryAfter,
            waitTimeText: this.formatWaitTime(retryAfter)
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error in rate limit check:', error);
      return { allowed: false };
    }
  }

  // تنظيف الأكواد المنتهية الصلاحية
  private async cleanupExpiredCodes(): Promise<void> {
    try {
      const now = new Date().toISOString();
      await supabase
        .from('admin_verification_codes')
        .delete()
        .lt('expires_at', now);
    } catch (error) {
      console.error('Error cleaning up expired codes:', error);
    }
  }

  // إرسال كود التحقق
  async sendVerificationCode(adminId: string, email: string): Promise<SendCodeResult> {
    try {
      // تنظيف الأكواد المنتهية الصلاحية
      await this.cleanupExpiredCodes();

      // فحص الحدود
      const rateLimit = await this.checkRateLimit(adminId);
      if (!rateLimit.allowed) {
        return {
          success: false,
          error: rateLimit.waitTimeText
            ? `يرجى الانتظار ${rateLimit.waitTimeText} قبل طلب كود جديد`
            : 'تم تجاوز الحد المسموح من المحاولات. يرجى المحاولة لاحقاً',
          canRetry: false,
          retryAfter: rateLimit.retryAfter,
          waitTimeText: rateLimit.waitTimeText
        };
      }

      // توليد كود جديد
      const code = this.generateCode();
      const expiresAt = new Date(Date.now() + this.CODE_EXPIRY_MINUTES * 60 * 1000).toISOString();

      // إلغاء الأكواد السابقة غير المستخدمة
      await supabase
        .from('admin_verification_codes')
        .update({ used: true })
        .eq('admin_id', adminId)
        .eq('used', false);

      // حفظ الكود في قاعدة البيانات
      const { error: insertError } = await supabase
        .from('admin_verification_codes')
        .insert({
          admin_id: adminId,
          code,
          expires_at: expiresAt,
          used: false
        });

      if (insertError) {
        console.error('❌ Error saving verification code:', insertError);
        return {
          success: false,
          error: 'فشل في حفظ كود التحقق'
        };
      }

      // إرسال الكود عبر البريد الإلكتروني
      const emailSent = await this.sendCodeByEmail(email, code);
      
      if (!emailSent) {
        return {
          success: false,
          error: 'فشل في إرسال كود التحقق عبر البريد الإلكتروني'
        };
      }

      return {
        success: true,
        canRetry: true,
        retryAfter: this.RETRY_DELAY_SECONDS,
        developmentCode: code // إضافة الرمز للتطوير فقط
      };

    } catch (error) {
      console.error('Error sending verification code:', error);
      return {
        success: false,
        error: 'حدث خطأ غير متوقع'
      };
    }
  }

  // إرسال الكود عبر البريد الإلكتروني
  private async sendCodeByEmail(email: string, code: string): Promise<boolean> {
    try {
      // استخدام القالب الموحد
      const { createUnifiedEmailTemplate, EmailTemplates } = await import('./unifiedEmailTemplate');
      
      const adminUsername = email.split('@')[0]; // استخراج اسم المستخدم من الإيميل
      const templateData = EmailTemplates.adminTwoFactor(code, adminUsername);
      const { html: message, text: textMessage, subject } = createUnifiedEmailTemplate(templateData);

      // إرسال عبر الخادم المستقل
      const response = await fetch('http://localhost:3001/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject: subject,
          html: message,
          text: textMessage,
          from: 'manage@kareemamged.com',
          fromName: 'رزقي - موقع الزواج الإسلامي'
        })
      });

      if (response.ok) {
        const result = await response.json();
        return result.success;
      }

      return false;
    } catch (error) {
      console.error('Error in email sending:', error);
      return false;
    }
  }

  // التحقق من الكود
  async verifyCode(adminId: string, inputCode: string): Promise<VerifyCodeResult> {
    try {
      // البحث عن كود صالح
      const { data, error } = await supabase
        .from('admin_verification_codes')
        .select('*')
        .eq('admin_id', adminId)
        .eq('code', inputCode)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error verifying code:', error);
        return {
          success: false,
          error: 'حدث خطأ في التحقق من الكود'
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          error: 'كود التحقق غير صحيح أو منتهي الصلاحية'
        };
      }

      // تحديد الكود كمستخدم
      const { error: updateError } = await supabase
        .from('admin_verification_codes')
        .update({ used: true })
        .eq('id', data[0].id);

      if (updateError) {
        console.error('Error marking code as used:', updateError);
        return {
          success: false,
          error: 'حدث خطأ في تحديث حالة الكود'
        };
      }

      return { success: true };

    } catch (error) {
      console.error('Error in code verification:', error);
      return {
        success: false,
        error: 'حدث خطأ غير متوقع'
      };
    }
  }
}

export const adminTwoFactorService = new AdminTwoFactorService();
