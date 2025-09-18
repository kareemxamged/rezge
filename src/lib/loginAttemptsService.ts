/**
 * خدمة إدارة محاولات تسجيل الدخول والأمان
 * تتبع المحاولات الفاشلة وتطبيق قيود الأمان
 */

import { supabase } from './supabase';

// أنواع البيانات
export interface LoginAttempt {
  id: string;
  email: string;
  ip_address?: string;
  user_agent?: string;
  attempt_type: 'login' | 'password_reset' | 'account_unlock';
  success: boolean;
  failure_reason?: string;
  user_id?: string;
  session_id?: string;
  created_at: string;
}

export interface LoginBlock {
  id: string;
  email: string;
  ip_address?: string;
  block_type: 'short_term' | 'daily_limit' | 'manual';
  block_reason?: string;
  blocked_until: string;
  failed_attempts_count: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface LoginAttemptResult {
  canAttempt: boolean;
  reason?: string;
  blockedUntil?: Date;
  attemptsRemaining?: number;
  nextAttemptAllowed?: Date;
}

// إعدادات الأمان
export const SECURITY_CONFIG = {
  // الحد الأقصى للمحاولات قبل المنع قصير المدى
  MAX_ATTEMPTS_SHORT_TERM: 5,
  // مدة المنع قصير المدى (5 ساعات)
  SHORT_TERM_BLOCK_HOURS: 5,
  
  // الحد الأقصى للمحاولات اليومية
  MAX_DAILY_ATTEMPTS: 10,
  // مدة المنع اليومي (24 ساعة)
  DAILY_BLOCK_HOURS: 24,
  
  // فترة حساب المحاولات قصيرة المدى (1 ساعة)
  SHORT_TERM_WINDOW_HOURS: 1,
  
  // فترة حساب المحاولات اليومية (24 ساعة)
  DAILY_WINDOW_HOURS: 24
};

class LoginAttemptsService {
  /**
   * تسجيل محاولة تسجيل دخول
   */
  async logAttempt(
    email: string,
    success: boolean,
    options: {
      ipAddress?: string;
      userAgent?: string;
      failureReason?: string;
      userId?: string;
      sessionId?: string;
      attemptType?: 'login' | 'password_reset' | 'account_unlock';
    } = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('login_attempts')
        .insert({
          email: email.toLowerCase(),
          ip_address: options.ipAddress,
          user_agent: options.userAgent,
          attempt_type: options.attemptType || 'login',
          success,
          failure_reason: options.failureReason,
          user_id: options.userId,
          session_id: options.sessionId
        });

      if (error) {
        console.error('Error logging login attempt:', error);
        return { success: false, error: error.message };
      }

      // إذا فشلت المحاولة، تحقق من الحاجة لتطبيق منع
      if (!success) {
        await this.checkAndApplyBlocks(email, options.ipAddress);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in logAttempt:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * فحص ما إذا كان بإمكان المستخدم محاولة تسجيل الدخول
   */
  async canAttemptLogin(email: string, _ipAddress?: string): Promise<LoginAttemptResult> {
    try {
      const normalizedEmail = email.toLowerCase();

      // فحص المنع النشط
      const activeBlock = await this.getActiveBlock(normalizedEmail);
      if (activeBlock) {
        return {
          canAttempt: false,
          reason: this.getBlockReason(activeBlock),
          blockedUntil: new Date(activeBlock.blocked_until),
          nextAttemptAllowed: new Date(activeBlock.blocked_until)
        };
      }

      // فحص المحاولات الحديثة
      const recentAttempts = await this.getRecentFailedAttempts(normalizedEmail);
      
      // فحص المحاولات قصيرة المدى (آخر ساعة)
      const shortTermAttempts = recentAttempts.filter(attempt => {
        const attemptTime = new Date(attempt.created_at);
        const oneHourAgo = new Date(Date.now() - SECURITY_CONFIG.SHORT_TERM_WINDOW_HOURS * 60 * 60 * 1000);
        return attemptTime > oneHourAgo;
      });

      // فحص المحاولات اليومية (آخر 24 ساعة)
      const dailyAttempts = recentAttempts.filter(attempt => {
        const attemptTime = new Date(attempt.created_at);
        const oneDayAgo = new Date(Date.now() - SECURITY_CONFIG.DAILY_WINDOW_HOURS * 60 * 60 * 1000);
        return attemptTime > oneDayAgo;
      });

      // تحديد الحالة
      if (shortTermAttempts.length >= SECURITY_CONFIG.MAX_ATTEMPTS_SHORT_TERM) {
        return {
          canAttempt: false,
          reason: 'تم تجاوز الحد الأقصى للمحاولات. يرجى المحاولة بعد 5 ساعات.',
          attemptsRemaining: 0
        };
      }

      if (dailyAttempts.length >= SECURITY_CONFIG.MAX_DAILY_ATTEMPTS) {
        return {
          canAttempt: false,
          reason: 'تم تجاوز الحد الأقصى للمحاولات اليومية. يرجى المحاولة غداً.',
          attemptsRemaining: 0
        };
      }

      // حساب المحاولات المتبقية
      const shortTermRemaining = SECURITY_CONFIG.MAX_ATTEMPTS_SHORT_TERM - shortTermAttempts.length;
      const dailyRemaining = SECURITY_CONFIG.MAX_DAILY_ATTEMPTS - dailyAttempts.length;
      const attemptsRemaining = Math.min(shortTermRemaining, dailyRemaining);

      return {
        canAttempt: true,
        attemptsRemaining
      };

    } catch (error: any) {
      console.error('Error in canAttemptLogin:', error);
      return {
        canAttempt: false,
        reason: 'حدث خطأ في فحص صلاحية تسجيل الدخول'
      };
    }
  }

  /**
   * فحص وتطبيق المنع عند الحاجة
   */
  private async checkAndApplyBlocks(email: string, ipAddress?: string): Promise<void> {
    try {
      const normalizedEmail = email.toLowerCase();
      const recentAttempts = await this.getRecentFailedAttempts(normalizedEmail);

      // فحص المحاولات قصيرة المدى
      const shortTermAttempts = recentAttempts.filter(attempt => {
        const attemptTime = new Date(attempt.created_at);
        const oneHourAgo = new Date(Date.now() - SECURITY_CONFIG.SHORT_TERM_WINDOW_HOURS * 60 * 60 * 1000);
        return attemptTime > oneHourAgo;
      });

      // فحص المحاولات اليومية
      const dailyAttempts = recentAttempts.filter(attempt => {
        const attemptTime = new Date(attempt.created_at);
        const oneDayAgo = new Date(Date.now() - SECURITY_CONFIG.DAILY_WINDOW_HOURS * 60 * 60 * 1000);
        return attemptTime > oneDayAgo;
      });

      // تطبيق المنع قصير المدى
      if (shortTermAttempts.length >= SECURITY_CONFIG.MAX_ATTEMPTS_SHORT_TERM) {
        await this.createBlock(
          normalizedEmail,
          'short_term',
          SECURITY_CONFIG.SHORT_TERM_BLOCK_HOURS,
          shortTermAttempts.length,
          ipAddress
        );
      }
      // تطبيق المنع اليومي
      else if (dailyAttempts.length >= SECURITY_CONFIG.MAX_DAILY_ATTEMPTS) {
        await this.createBlock(
          normalizedEmail,
          'daily_limit',
          SECURITY_CONFIG.DAILY_BLOCK_HOURS,
          dailyAttempts.length,
          ipAddress
        );
      }

    } catch (error) {
      console.error('Error in checkAndApplyBlocks:', error);
    }
  }

  /**
   * إنشاء منع جديد
   */
  private async createBlock(
    email: string,
    blockType: 'short_term' | 'daily_limit' | 'manual',
    blockHours: number,
    failedCount: number,
    ipAddress?: string
  ): Promise<void> {
    try {
      const blockedUntil = new Date(Date.now() + blockHours * 60 * 60 * 1000);
      
      // إلغاء تفعيل أي منع سابق من نفس النوع
      await supabase
        .from('login_blocks')
        .update({ is_active: false })
        .eq('email', email)
        .eq('block_type', blockType)
        .eq('is_active', true);

      // إنشاء منع جديد
      await supabase
        .from('login_blocks')
        .insert({
          email,
          ip_address: ipAddress,
          block_type: blockType,
          block_reason: `تم تجاوز الحد الأقصى للمحاولات (${failedCount} محاولات)`,
          blocked_until: blockedUntil.toISOString(),
          failed_attempts_count: failedCount
        });

    } catch (error) {
      console.error('Error creating block:', error);
    }
  }

  /**
   * الحصول على المنع النشط للمستخدم
   */
  private async getActiveBlock(email: string): Promise<LoginBlock | null> {
    try {
      const { data, error } = await supabase
        .from('login_blocks')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .gt('blocked_until', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error getting active block:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getActiveBlock:', error);
      return null;
    }
  }

  /**
   * الحصول على المحاولات الفاشلة الحديثة
   */
  private async getRecentFailedAttempts(email: string): Promise<LoginAttempt[]> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('email', email)
        .eq('success', false)
        .gte('created_at', oneDayAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting recent failed attempts:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getRecentFailedAttempts:', error);
      return [];
    }
  }

  /**
   * تحويل نوع المنع إلى رسالة مفهومة
   */
  private getBlockReason(block: LoginBlock): string {
    switch (block.block_type) {
      case 'short_term':
        return 'تم منع تسجيل الدخول مؤقتاً بسبب المحاولات الفاشلة المتكررة. يرجى المحاولة بعد 5 ساعات.';
      case 'daily_limit':
        return 'تم تجاوز الحد الأقصى للمحاولات اليومية. يرجى المحاولة غداً.';
      case 'manual':
        return block.block_reason || 'تم منع الحساب يدوياً من قبل الإدارة.';
      default:
        return 'تم منع تسجيل الدخول مؤقتاً.';
    }
  }

  /**
   * إلغاء منع المستخدم (للاستخدام الإداري)
   */
  async unblockUser(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('login_blocks')
        .update({ is_active: false })
        .eq('email', email.toLowerCase())
        .eq('is_active', true);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * الحصول على إحصائيات المحاولات للمستخدم
   */
  async getUserStats(email: string): Promise<{
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    todayAttempts: number;
    isBlocked: boolean;
    blockInfo?: LoginBlock;
  }> {
    try {
      const normalizedEmail = email.toLowerCase();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // الحصول على جميع المحاولات
      const { data: allAttempts } = await supabase
        .from('login_attempts')
        .select('success, created_at')
        .eq('email', normalizedEmail);

      // الحصول على محاولات اليوم
      const { data: todayAttempts } = await supabase
        .from('login_attempts')
        .select('success')
        .eq('email', normalizedEmail)
        .gte('created_at', oneDayAgo.toISOString());

      // فحص المنع النشط
      const activeBlock = await this.getActiveBlock(normalizedEmail);

      const total = allAttempts?.length || 0;
      const successful = allAttempts?.filter(a => a.success).length || 0;
      const failed = total - successful;
      const today = todayAttempts?.length || 0;

      return {
        totalAttempts: total,
        successfulAttempts: successful,
        failedAttempts: failed,
        todayAttempts: today,
        isBlocked: !!activeBlock,
        blockInfo: activeBlock || undefined
      };

    } catch (error) {
      console.error('Error getting user stats:', error);
      return {
        totalAttempts: 0,
        successfulAttempts: 0,
        failedAttempts: 0,
        todayAttempts: 0,
        isBlocked: false
      };
    }
  }
}

export const loginAttemptsService = new LoginAttemptsService();
