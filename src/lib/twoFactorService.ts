/**
 * خدمة المصادقة الثنائية
 * تدير إنشاء وإرسال والتحقق من رموز المصادقة الثنائية عبر البريد الإلكتروني
 */

import { supabase } from './supabase';
import { AdvancedEmailService } from './finalEmailService';

// أنواع البيانات
export interface TwoFactorCode {
  id: string;
  user_id: string;
  email: string;
  code: string;
  code_type: 'login' | 'enable_2fa' | 'disable_2fa';
  is_used: boolean;
  attempts_count: number;
  max_attempts: number;
  expires_at: string;
  created_at: string;
  used_at?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface TwoFactorResult {
  success: boolean;
  message: string;
  code_id?: string;
  expires_at?: string;
  attempts_remaining?: number;
  developmentCode?: string; // رمز المصادقة للتطوير فقط
}

export interface RateLimitResult {
  allowed: boolean;
  message: string;
  nextAllowedAt?: string;
  dailyAttemptsUsed?: number;
  dailyAttemptsLimit?: number;
}

export interface VerificationResult {
  success: boolean;
  message: string;
  code_id?: string;
}

class TwoFactorService {
  // إعدادات نظام الحد الزمني المحدث
  private readonly RATE_LIMIT_CONFIG = {
    DAILY_LIMIT: 6,                    // 6 مرات يومياً للجميع
    MIN_WAIT_SECONDS: 30,              // 30 ثانية انتظار بين كل طلب
    HOUR_WAIT_AFTER_THIRD: 30,        // 30 ثانية انتظار بعد المحاولة الثالثة (محدث)
    DAILY_RESET_HOURS: 24,            // إعادة تعيين الحد اليومي كل 24 ساعة
    DAILY_BAN_HOURS: 24               // حظر 24 ساعة بعد تجاوز الحد اليومي
  };





  /**
   * دالة عامة لحذف جميع محاولات المصادقة الثنائية لمستخدم معين (للاختبار والإدارة)
   */
  async resetUserAttempts(userId: string): Promise<boolean> {
    try {
      console.log('🗑️ Resetting all 2FA attempts for user:', userId);

      const { error } = await supabase
        .from('two_factor_codes')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error resetting user attempts:', error);
        return false;
      }

      console.log('✅ Successfully reset all 2FA attempts for user');
      return true;
    } catch (error) {
      console.error('❌ Exception in resetUserAttempts:', error);
      return false;
    }
  }

  /**
   * توليد رمز تحقق مكون من 6 أرقام
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * فحص نظام الحد الزمني المحدث للمصادقة الثنائية
   * النظام الجديد:
   * - 6 مرات يومياً
   * - 30 ثانية انتظار بين كل طلب
   * - 30 ثانية انتظار بعد المحاولة الثالثة (محدث)
   * - 24 ساعة حظر بعد تجاوز الحد اليومي
   * - إعادة تعيين المحاولات عند النجاح
   */
  private async checkRateLimit(userId: string, codeType: string): Promise<RateLimitResult> {
    try {
      console.log('🔍 Checking enhanced 2FA rate limit:', { userId, codeType });

      const now = new Date();

      // حساب بداية اليوم الحالي (UTC)
      const startOfDay = new Date(now);
      startOfDay.setUTCHours(0, 0, 0, 0);

      // فحص آخر رمز تم إنشاؤه
      const { data: lastCode, error: lastCodeError } = await supabase
        .from('two_factor_codes')
        .select('created_at')
        .eq('user_id', userId)
        .eq('code_type', codeType)
        .order('created_at', { ascending: false })
        .limit(1);

      if (lastCodeError) {
        console.error('❌ Error checking last code:', lastCodeError);
        return { allowed: true, message: '' };
      }

      // فحص المحاولات اليومية
      const { data: dailyAttempts, error: dailyError } = await supabase
        .from('two_factor_codes')
        .select('id, created_at')
        .eq('user_id', userId)
        .eq('code_type', codeType)
        .gte('created_at', startOfDay.toISOString())
        .order('created_at', { ascending: false });

      if (dailyError) {
        console.error('❌ Error checking daily attempts:', dailyError);
        return { allowed: true, message: '' };
      }

      const dailyCount = dailyAttempts ? dailyAttempts.length : 0;

      // فحص تجاوز الحد اليومي (6 مرات)
      if (dailyCount >= this.RATE_LIMIT_CONFIG.DAILY_LIMIT) {
        const nextReset = new Date(startOfDay);
        nextReset.setUTCDate(nextReset.getUTCDate() + 1);

        return {
          allowed: false,
          message: 'تم تجاوز الحد اليومي لطلب رموز التحقق. حاول مرة أخرى غداً',
          nextAllowedAt: nextReset.toISOString(),
          dailyAttemptsUsed: dailyCount,
          dailyAttemptsLimit: this.RATE_LIMIT_CONFIG.DAILY_LIMIT
        };
      }

      // فحص الحد الأدنى للوقت (30 ثانية) بين الطلبات
      if (lastCode && lastCode.length > 0) {
        const lastCodeTime = new Date(lastCode[0].created_at);
        const timeDiff = (now.getTime() - lastCodeTime.getTime()) / 1000; // بالثواني

        if (timeDiff < this.RATE_LIMIT_CONFIG.MIN_WAIT_SECONDS) {
          const waitTime = Math.ceil(this.RATE_LIMIT_CONFIG.MIN_WAIT_SECONDS - timeDiff);
          return {
            allowed: false,
            message: `يرجى الانتظار ${waitTime} ثانية قبل طلب رمز جديد`,
            nextAllowedAt: new Date(lastCodeTime.getTime() + (this.RATE_LIMIT_CONFIG.MIN_WAIT_SECONDS * 1000)).toISOString()
          };
        }
      }

      // فحص خاص: 30 ثانية انتظار بعد المحاولة الثالثة (محدث)
      if (dailyCount === 3 && dailyAttempts && dailyAttempts.length > 0) {
        const thirdAttemptTime = new Date(dailyAttempts[0].created_at);
        const timeSinceThird = (now.getTime() - thirdAttemptTime.getTime()) / 1000; // بالثواني

        if (timeSinceThird < this.RATE_LIMIT_CONFIG.HOUR_WAIT_AFTER_THIRD) {
          const waitTime = Math.ceil(this.RATE_LIMIT_CONFIG.HOUR_WAIT_AFTER_THIRD - timeSinceThird);
          const hours = Math.floor(waitTime / 3600);
          const minutes = Math.floor((waitTime % 3600) / 60);
          const seconds = waitTime % 60;

          let waitMessage = 'يجب الانتظار ';
          if (hours > 0) waitMessage += `${hours} ساعة `;
          if (minutes > 0) waitMessage += `${minutes} دقيقة `;
          if (seconds > 0) waitMessage += `${seconds} ثانية `;
          waitMessage += 'بعد المحاولة الثالثة';

          return {
            allowed: false,
            message: waitMessage,
            nextAllowedAt: new Date(thirdAttemptTime.getTime() + (this.RATE_LIMIT_CONFIG.HOUR_WAIT_AFTER_THIRD * 1000)).toISOString()
          };
        }
      }

      console.log('✅ Enhanced rate limit check passed:', {
        dailyAttemptsUsed: dailyCount,
        dailyAttemptsLimit: this.RATE_LIMIT_CONFIG.DAILY_LIMIT,
        isAfterThirdAttempt: dailyCount >= 3
      });

      return {
        allowed: true,
        message: '',
        dailyAttemptsUsed: dailyCount,
        dailyAttemptsLimit: this.RATE_LIMIT_CONFIG.DAILY_LIMIT
      };

    } catch (error) {
      console.error('❌ Exception in enhanced checkRateLimit:', error);
      return { allowed: true, message: '' };
    }
  }

  /**
   * إعادة تعيين محاولات المصادقة الثنائية عند النجاح
   */
  private async resetDailyAttempts(userId: string, codeType: string): Promise<void> {
    try {
      console.log('🔄 Resetting 2FA attempts for successful verification:', { userId, codeType });

      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setUTCHours(0, 0, 0, 0);

      // حذف جميع المحاولات اليومية السابقة لإعادة تعيين العداد
      const { error } = await supabase
        .from('two_factor_codes')
        .delete()
        .eq('user_id', userId)
        .eq('code_type', codeType)
        .gte('created_at', startOfDay.toISOString())
        .neq('is_used', true); // الاحتفاظ بالرموز المستخدمة للسجلات

      if (error) {
        console.error('❌ Error resetting user attempts:', error);
      } else {
        console.log('✅ Successfully reset user attempts - user gets fresh 6 daily attempts');
      }
    } catch (error) {
      console.error('❌ Exception in resetUserAttempts:', error);
    }
  }

  /**
   * إنشاء وإرسال رمز تحقق جديد
   */
  async sendVerificationCode(
    userId: string,
    email: string,
    codeType: 'login' | 'enable_2fa' | 'disable_2fa' = 'login',
    ipAddress?: string,
    userAgent?: string
  ): Promise<TwoFactorResult> {
    try {
      // فحص نظام الحد الزمني الجديد
      const rateLimitCheck = await this.checkRateLimit(userId, codeType);
      if (!rateLimitCheck.allowed) {
        // عرض الرمز الحالي في الكونسول للتطوير حتى عند الرفض
        await this.showCurrentCodeInConsole(userId, email, codeType);

        return {
          success: false,
          message: rateLimitCheck.message,
          expires_at: rateLimitCheck.nextAllowedAt
        };
      }

      // إلغاء الرموز السابقة غير المستخدمة (بعد إنشاء الرمز الجديد)
      // سيتم تنفيذ هذا بعد إنشاء الرمز الجديد لتجنب إلغاء الرمز الجديد

      // توليد رمز جديد
      const code = this.generateCode();
      // استخدام UTC لضمان التوافق مع قاعدة البيانات
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (15 * 60 * 1000)); // 15 دقيقة

      // تم إنشاء رمز جديد للمصادقة الثنائية

      // تنظيف وتحضير البيانات للحفظ مع ضمان التوقيت الصحيح
      const insertData: any = {
        user_id: userId,
        email: email,
        code: code,
        code_type: codeType,
        expires_at: expiresAt.toISOString(),
        created_at: now.toISOString() // إضافة وقت الإنشاء صراحة
      };

      // إضافة IP address فقط إذا كان صحيحاً
      if (ipAddress &&
          typeof ipAddress === 'string' &&
          ipAddress !== 'unknown' &&
          ipAddress !== 'undefined' &&
          ipAddress !== 'null' &&
          ipAddress.trim() !== '' &&
          ipAddress.toLowerCase() !== 'unknown' &&
          ipAddress.toLowerCase() !== 'undefined') {

        // التحقق من صحة عنوان IP (IPv4 أو IPv6 محسن)
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;

        const trimmedIP = ipAddress.trim();

        if (ipv4Regex.test(trimmedIP) || ipv6Regex.test(trimmedIP)) {
          insertData.ip_address = trimmedIP;
          console.log('Valid IP address added:', trimmedIP);
        } else {
          console.log('Invalid IP address ignored:', ipAddress);
        }
      } else {
        console.log('IP address not provided or invalid:', ipAddress);
      }

      // إضافة User Agent فقط إذا كان متوفراً وصحيحاً
      if (userAgent &&
          typeof userAgent === 'string' &&
          userAgent !== 'unknown' &&
          userAgent !== 'undefined' &&
          userAgent !== 'null' &&
          userAgent.trim() !== '' &&
          userAgent.toLowerCase() !== 'unknown' &&
          userAgent.toLowerCase() !== 'undefined') {

        const trimmedUserAgent = userAgent.trim();
        if (trimmedUserAgent.length > 0 && trimmedUserAgent.length <= 1000) { // حد أقصى معقول
          insertData.user_agent = trimmedUserAgent;
          console.log('User agent added successfully');
        } else {
          console.log('User agent too long or empty, ignored');
        }
      } else {
        console.log('User agent not provided or invalid:', userAgent);
      }

      // حفظ الرمز في قاعدة البيانات
      console.log('Inserting 2FA code into database...');
      const { data: newCode, error: insertError } = await supabase
        .from('two_factor_codes')
        .insert(insertData)
        .select('id, created_at, expires_at')
        .single();

      if (!insertError && newCode) {
        console.log('2FA code created successfully:', newCode.id);
      }

      if (insertError) {
        console.error('Error saving 2FA code:', insertError);
        console.error('Insert data was:', JSON.stringify(insertData, null, 2));

        // معالجة أخطاء محددة
        if (insertError.message && insertError.message.includes('invalid input syntax for type inet')) {
          console.error('IP address validation failed. IP was:', ipAddress);
          return {
            success: false,
            message: 'خطأ في معالجة عنوان IP. يرجى المحاولة مرة أخرى.'
          };
        }

        return {
          success: false,
          message: 'حدث خطأ في إنشاء رمز التحقق'
        };
      }

      // الآن نقوم بإلغاء الرموز السابقة بعد إنشاء الرمز الجديد بنجاح
      try {
        console.log('Invalidating previous unused codes after creating new code...');
        const { error: updateError } = await supabase
          .from('two_factor_codes')
          .update({ is_used: true, used_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('code_type', codeType)
          .eq('is_used', false)
          .neq('id', newCode.id); // تجنب إلغاء الرمز الجديد

        if (updateError) {
          console.error('Error invalidating previous codes:', updateError);
          // نتابع العملية حتى لو فشل إلغاء الرموز السابقة
        } else {
          console.log('Previous codes invalidated successfully (excluding new code)');
        }
      } catch (error) {
        console.error('Exception invalidating previous codes:', error);
      }

      // إرسال الرمز عبر البريد الإلكتروني
      const emailSent = await this.sendCodeByEmail(email, code, codeType);
      
      if (!emailSent) {
        // حذف الرمز إذا فشل الإرسال
        await supabase
          .from('two_factor_codes')
          .delete()
          .eq('id', newCode.id);

        return {
          success: false,
          message: 'فشل في إرسال رمز التحقق عبر البريد الإلكتروني'
        };
      }

      return {
        success: true,
        message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني',
        code_id: newCode.id,
        expires_at: expiresAt.toISOString(),
        developmentCode: code // إضافة الرمز للتطوير فقط
      };

    } catch (error) {
      console.error('Error in sendVerificationCode:', error);
      return {
        success: false,
        message: 'حدث خطأ غير متوقع'
      };
    }
  }

  /**
   * التحقق اليدوي من رمز التحقق (للاستخدام عند فشل الدالة المخزنة)
   */
  private async manualVerifyCode(
    userId: string,
    code: string,
    codeType: 'login' | 'enable_2fa' | 'disable_2fa' = 'login'
  ): Promise<VerificationResult> {
    try {
      const now = new Date();
      console.log('🔧 التحقق اليدوي المحسن - الوقت الحالي:', now.toISOString());
      console.log('🔧 البحث عن رمز للمستخدم:', { userId, codeType });

      // البحث عن الرمز مع فحص شامل ومرونة في الشروط
      const { data: codes, error } = await supabase
        .from('two_factor_codes')
        .select('*')
        .eq('user_id', userId)
        .eq('code', code)
        .eq('code_type', codeType)
        .order('created_at', { ascending: false });

      // إذا لم نجد رمز مطابق، نبحث عن أي رمز للمستخدم للتشخيص
      if (!codes || codes.length === 0) {
        const { data: allUserCodes } = await supabase
          .from('two_factor_codes')
          .select('*')
          .eq('user_id', userId)
          .eq('code_type', codeType)
          .order('created_at', { ascending: false })
          .limit(3);

        console.log('🔧 لم يتم العثور على رمز مطابق. آخر 3 رموز للمستخدم:',
          allUserCodes?.map(c => ({
            id: c.id,
            code: c.code,
            created_at: c.created_at,
            expires_at: c.expires_at,
            is_used: c.is_used,
            matches_entered: c.code === code
          }))
        );
      }

      if (error) {
        console.error('❌ خطأ في البحث عن الرمز:', error);
        return {
          success: false,
          message: 'حدث خطأ في التحقق من الرمز'
        };
      }

      if (!codes || codes.length === 0) {
        console.log('❌ لم يتم العثور على رمز مطابق');
        return {
          success: false,
          message: 'رمز التحقق غير صحيح أو منتهي الصلاحية'
        };
      }

      // فحص جميع الرموز المطابقة واختيار الأنسب
      let bestCode = null;
      for (const codeRecord of codes) {
        const expiresAt = new Date(codeRecord.expires_at);
        const timeDifference = expiresAt.getTime() - now.getTime();

        console.log('🔧 فحص رمز:', {
          id: codeRecord.id,
          code: codeRecord.code,
          created_at: codeRecord.created_at,
          expires_at: codeRecord.expires_at,
          is_used: codeRecord.is_used,
          attempts_count: codeRecord.attempts_count,
          timeDifferenceMinutes: Math.round(timeDifference / 60000),
          isValid: !codeRecord.is_used && codeRecord.attempts_count < codeRecord.max_attempts
        });

        // اختيار أفضل رمز (غير مستخدم، لم يتجاوز المحاولات، والأحدث)
        if (!codeRecord.is_used &&
            codeRecord.attempts_count < codeRecord.max_attempts &&
            timeDifference > -300000) { // تسامح 5 دقائق للرموز المنتهية

          if (!bestCode || new Date(codeRecord.created_at) > new Date(bestCode.created_at)) {
            bestCode = codeRecord;
          }
        }
      }

      if (!bestCode) {
        console.log('❌ لم يتم العثور على رمز صالح');
        return {
          success: false,
          message: 'رمز التحقق غير صحيح أو منتهي الصلاحية'
        };
      }

      console.log('✅ تم العثور على رمز صالح:', {
        id: bestCode.id,
        code: bestCode.code,
        created_at: bestCode.created_at,
        expires_at: bestCode.expires_at
      });

      // تحديث الرمز كمستخدم
      const { error: updateError } = await supabase
        .from('two_factor_codes')
        .update({
          is_used: true,
          used_at: now.toISOString()
        })
        .eq('id', bestCode.id);

      if (updateError) {
        console.error('❌ خطأ في تحديث الرمز:', updateError);
        return {
          success: false,
          message: 'حدث خطأ في التحقق من الرمز'
        };
      }

      console.log('✅ تم التحقق من الرمز بنجاح (يدوياً محسن)');

      // إعادة تعيين محاولات المستخدم عند النجاح
      await this.resetDailyAttempts(userId, codeType);

      return {
        success: true,
        message: 'تم التحقق بنجاح',
        code_id: bestCode.id
      };

    } catch (error) {
      console.error('❌ خطأ في التحقق اليدوي:', error);
      return {
        success: false,
        message: 'حدث خطأ غير متوقع'
      };
    }
  }

  /**
   * التحقق من صحة رمز التحقق (محدث مع تشخيص أفضل)
   */
  async verifyCode(
    userId: string,
    code: string,
    codeType: 'login' | 'enable_2fa' | 'disable_2fa' = 'login'
  ): Promise<VerificationResult> {
    try {
      // التحقق من رمز المصادقة الثنائية

      // أولاً: فحص الرموز المتاحة للمستخدم للتشخيص
      const { data: allCodes, error: debugError } = await supabase
        .from('two_factor_codes')
        .select('*')
        .eq('user_id', userId)
        .eq('code_type', codeType)
        .order('created_at', { ascending: false })
        .limit(5);

      // فحص الرموز المتاحة للمستخدم

      // استخدام التحقق اليدوي مباشرة لضمان الموثوقية
      console.log('🔄 استخدام التحقق اليدوي المحسن...');
      return await this.manualVerifyCode(userId, code, codeType);

    } catch (error) {
      console.error('❌ Exception in verifyCode:', error);
      return {
        success: false,
        message: 'حدث خطأ غير متوقع'
      };
    }
  }

  /**
   * عرض الرمز الحالي في الكونسول للتطوير (عند طلب رمز جديد قبل انتهاء الوقت)
   */
  private async showCurrentCodeInConsole(
    userId: string,
    email: string,
    codeType: 'login' | 'enable_2fa' | 'disable_2fa'
  ): Promise<void> {
    try {
      // البحث عن آخر رمز صالح للمستخدم
      const { data: currentCodes, error } = await supabase
        .from('two_factor_codes')
        .select('code, created_at, expires_at')
        .eq('user_id', userId)
        .eq('code_type', codeType)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('خطأ في البحث عن الرمز الحالي:', error);
        return;
      }

      if (currentCodes && currentCodes.length > 0) {
        const currentCode = currentCodes[0];
        const expiresAt = new Date(currentCode.expires_at);
        const now = new Date();
        const minutesLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60));

        // يوجد رمز صالح حالياً
      } else {
        console.log(`❌ لا يوجد رمز صالح حالياً لـ ${email}`);
      }
    } catch (error) {
      console.error('خطأ في عرض الرمز الحالي:', error);
    }
  }

  /**
   * إرسال رمز التحقق عبر البريد الإلكتروني
   */
  private async sendCodeByEmail(
    email: string,
    code: string,
    codeType: 'login' | 'enable_2fa' | 'disable_2fa'
  ): Promise<boolean> {
    try {
      // تحديد نوع الرسالة حسب نوع الرمز
      let subject = '';
      let message = '';

      // استخدام القالب الموحد
      const { createUnifiedEmailTemplate, EmailTemplates } = await import('./unifiedEmailTemplate');
      
      switch (codeType) {
        case 'login':
          const loginTemplate = EmailTemplates.twoFactorLogin(code);
          const loginResult = createUnifiedEmailTemplate(loginTemplate);
          subject = loginResult.subject;
          message = loginResult.html;
          break;

        case 'enable_2fa':
          const enableTemplate = EmailTemplates.enableTwoFactor(code);
          const enableResult = createUnifiedEmailTemplate(enableTemplate);
          subject = enableResult.subject;
          message = enableResult.html;
          break;

        case 'disable_2fa':
          const disableTemplate = EmailTemplates.disableTwoFactor(code);
          const disableResult = createUnifiedEmailTemplate(disableTemplate);
          subject = disableResult.subject;
          message = disableResult.html;
          break;
      }

      console.log(`📧 إعداد إرسال رمز ${codeType} للمستخدم: ${email}`);

      // استخدام الخادم المستقل (localhost:3001) مثل userTwoFactorService
      console.log('📧 إرسال كود التحقق عبر الخادم المستقل...');

      try {
        const response = await fetch('http://localhost:3001/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: email,
            subject: subject,
            html: message,
            text: `كود التحقق الخاص بك: ${code}`,
            from: 'manage@kareemamged.com',
            fromName: 'رزقي - موقع الزواج الإسلامي'
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            console.log('✅ تم إرسال الكود عبر الخادم المستقل');
            return true;
          }
        }
      } catch (error) {
        console.warn('⚠️ فشل الاتصال بالخادم المستقل:', error);
      }

      console.warn('⚠️ فشل الخادم المستقل، محاولة بديلة...');
      return false;

    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  /**
   * الحصول على معلومات الرمز النشط
   */
  async getActiveCode(
    userId: string,
    codeType: 'login' | 'enable_2fa' | 'disable_2fa' = 'login'
  ): Promise<TwoFactorCode | null> {
    try {
      const { data, error } = await supabase
        .from('two_factor_codes')
        .select('*')
        .eq('user_id', userId)
        .eq('code_type', codeType)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting active code:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getActiveCode:', error);
      return null;
    }
  }

  /**
   * تنظيف الرموز المنتهية الصلاحية
   */
  async cleanupExpiredCodes(): Promise<void> {
    try {
      await supabase.rpc('cleanup_expired_two_factor_codes');
    } catch (error) {
      console.error('Error cleaning up expired codes:', error);
    }
  }
}

export const twoFactorService = new TwoFactorService();

// إتاحة الخدمة في الكونسول للاختبار (بيئة التطوير فقط)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).twoFactorService = twoFactorService;

  // دالة سريعة لحذف جميع محاولات المصادقة الثنائية
  (window as any).clearAll2FA = async () => {
    try {
      console.log('🗑️ حذف جميع محاولات المصادقة الثنائية...');
      const { error } = await supabase
        .from('two_factor_codes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // حذف جميع السجلات

      if (error) {
        console.error('❌ خطأ في الحذف:', error);
      } else {
        console.log('✅ تم حذف جميع محاولات المصادقة الثنائية');
        console.log('🎉 يمكنك الآن الاختبار بدون قيود');
      }
    } catch (error) {
      console.error('❌ خطأ:', error);
    }
  };

  // دالة لحذف الرموز القديمة فقط
  (window as any).cleanOld2FA = async () => {
    try {
      console.log('🧹 حذف الرموز القديمة (أكثر من ساعة)...');
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from('two_factor_codes')
        .delete()
        .lt('created_at', oneHourAgo);

      if (error) {
        console.error('❌ خطأ في الحذف:', error);
      } else {
        console.log('✅ تم حذف الرموز القديمة');
      }
    } catch (error) {
      console.error('❌ خطأ:', error);
    }
  };

  console.log('🔧 أدوات المصادقة الثنائية متاحة في الكونسول:');
  console.log('💡 clearAll2FA() - حذف جميع محاولات المصادقة الثنائية');
  console.log('💡 cleanOld2FA() - حذف الرموز القديمة فقط (أكثر من ساعة)');
  console.log('💡 twoFactorService.resetUserAttempts("USER_ID") - حذف محاولات مستخدم معين');
  console.log('🚀 تم تحسين نظام التحقق ليكون أكثر مرونة مع المناطق الزمنية');
}
