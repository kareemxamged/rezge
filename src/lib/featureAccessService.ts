import { supabase } from './supabase';
import { SubscriptionService } from './subscriptionService';

export interface UserLimits {
  messages_per_month: number;
  profile_views_per_day: number;
  search_results_per_day: number;
  likes_per_day: number;
  voice_messages_per_day: number;
  consultation_hours_per_month: number;
}

export interface UserUsage {
  messages_sent_this_month: number;
  profile_views_today: number;
  searches_today: number;
  likes_today: number;
  voice_messages_today: number;
  consultation_hours_this_month: number;
  last_reset_date: string;
}

export class FeatureAccessService {
  /**
   * التحقق من إمكانية الوصول لمميزة معينة
   */
  static async canAccessFeature(userId: string, featureKey: string): Promise<boolean> {
    try {
      const subscriptionStatus = await SubscriptionService.getUserSubscriptionStatus(userId);
      
      // إذا لم يكن لديه اشتراك نشط، يمكنه الوصول للمميزات الأساسية فقط
      if (!subscriptionStatus.hasActiveSubscription && !subscriptionStatus.hasActiveTrial) {
        const basicFeatures = ['basic_profile', 'basic_search'];
        return basicFeatures.includes(featureKey);
      }

      // التحقق من المميزات المتاحة في الباقة
      return subscriptionStatus.features[featureKey] === true;
    } catch (error) {
      console.error('Error checking feature access:', error);
      return false;
    }
  }

  /**
   * الحصول على حدود المستخدم الحالية
   */
  static async getUserLimits(userId: string): Promise<UserLimits> {
    try {
      const subscriptionStatus = await SubscriptionService.getUserSubscriptionStatus(userId);
      
      // الحدود الافتراضية للمستخدمين بدون اشتراك
      const defaultLimits: UserLimits = {
        messages_per_month: 5,
        profile_views_per_day: 3,
        search_results_per_day: 10,
        likes_per_day: 5,
        voice_messages_per_day: 0,
        consultation_hours_per_month: 0
      };

      if (!subscriptionStatus.hasActiveSubscription && !subscriptionStatus.hasActiveTrial) {
        return defaultLimits;
      }

      // استخراج الحدود من الباقة
      const limits = subscriptionStatus.limits;
      return {
        messages_per_month: limits.messages_per_month || -1, // -1 يعني غير محدود
        profile_views_per_day: limits.profile_views_per_day || -1,
        search_results_per_day: limits.search_results_per_day || 50,
        likes_per_day: limits.likes_per_day || 20,
        voice_messages_per_day: limits.voice_messages_per_day || 10,
        consultation_hours_per_month: limits.consultation_hours_per_month || 0
      };
    } catch (error) {
      console.error('Error getting user limits:', error);
      return {
        messages_per_month: 5,
        profile_views_per_day: 3,
        search_results_per_day: 10,
        likes_per_day: 5,
        voice_messages_per_day: 0,
        consultation_hours_per_month: 0
      };
    }
  }

  /**
   * الحصول على استخدام المستخدم الحالي
   */
  static async getUserUsage(userId: string): Promise<UserUsage> {
    try {
      const { data, error } = await supabase
        .from('user_usage_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (!data) {
        // إنشاء سجل استخدام جديد
        const newUsage: UserUsage = {
          messages_sent_this_month: 0,
          profile_views_today: 0,
          searches_today: 0,
          likes_today: 0,
          voice_messages_today: 0,
          consultation_hours_this_month: 0,
          last_reset_date: new Date().toISOString()
        };

        await supabase
          .from('user_usage_stats')
          .insert({
            user_id: userId,
            ...newUsage
          });

        return newUsage;
      }

      return {
        messages_sent_this_month: data.messages_sent_this_month || 0,
        profile_views_today: data.profile_views_today || 0,
        searches_today: data.searches_today || 0,
        likes_today: data.likes_today || 0,
        voice_messages_today: data.voice_messages_today || 0,
        consultation_hours_this_month: data.consultation_hours_this_month || 0,
        last_reset_date: data.last_reset_date
      };
    } catch (error) {
      console.error('Error getting user usage:', error);
      return {
        messages_sent_this_month: 0,
        profile_views_today: 0,
        searches_today: 0,
        likes_today: 0,
        voice_messages_today: 0,
        consultation_hours_this_month: 0,
        last_reset_date: new Date().toISOString()
      };
    }
  }

  /**
   * التحقق من إمكانية تنفيذ إجراء معين (مع مراعاة الحدود)
   */
  static async canPerformAction(userId: string, action: keyof UserUsage): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
    try {
      const [limits, usage] = await Promise.all([
        this.getUserLimits(userId),
        this.getUserUsage(userId)
      ]);

      // تحديد الحد والاستخدام الحالي حسب نوع الإجراء
      let limit: number;
      let currentUsage: number;
      let actionName: string;

      switch (action) {
        case 'messages_sent_this_month':
          limit = limits.messages_per_month;
          currentUsage = usage.messages_sent_this_month;
          actionName = 'إرسال الرسائل';
          break;
        case 'profile_views_today':
          limit = limits.profile_views_per_day;
          currentUsage = usage.profile_views_today;
          actionName = 'مشاهدة الملفات الشخصية';
          break;
        case 'searches_today':
          limit = limits.search_results_per_day;
          currentUsage = usage.searches_today;
          actionName = 'البحث';
          break;
        case 'likes_today':
          limit = limits.likes_per_day;
          currentUsage = usage.likes_today;
          actionName = 'الإعجاب';
          break;
        case 'voice_messages_today':
          limit = limits.voice_messages_per_day;
          currentUsage = usage.voice_messages_today;
          actionName = 'الرسائل الصوتية';
          break;
        default:
          return { allowed: false, reason: 'نوع إجراء غير مدعوم' };
      }

      // إذا كان الحد -1، فهو غير محدود
      if (limit === -1) {
        return { allowed: true, remaining: -1 };
      }

      // التحقق من عدم تجاوز الحد
      if (currentUsage >= limit) {
        return { 
          allowed: false, 
          reason: `لقد تجاوزت الحد المسموح لـ ${actionName}. قم بترقية باقتك للحصول على المزيد.`,
          remaining: 0
        };
      }

      return { 
        allowed: true, 
        remaining: limit - currentUsage 
      };
    } catch (error) {
      console.error('Error checking action permission:', error);
      return { allowed: false, reason: 'حدث خطأ في التحقق من الصلاحيات' };
    }
  }

  /**
   * تسجيل استخدام إجراء معين
   */
  static async recordUsage(userId: string, action: keyof UserUsage, amount: number = 1): Promise<boolean> {
    try {
      // التحقق من إمكانية تنفيذ الإجراء أولاً
      const permission = await this.canPerformAction(userId, action);
      if (!permission.allowed) {
        return false;
      }

      // تحديث الاستخدام
      const { error } = await supabase
        .rpc('increment_user_usage', {
          p_user_id: userId,
          p_action: action,
          p_amount: amount
        });

      if (error) {
        console.error('Error recording usage:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in recordUsage:', error);
      return false;
    }
  }

  /**
   * إعادة تعيين الإحصائيات اليومية/الشهرية
   */
  static async resetUsageStats(userId: string): Promise<void> {
    try {
      const now = new Date();
      const today = now.toDateString();
      const thisMonth = `${now.getFullYear()}-${now.getMonth() + 1}`;

      const usage = await this.getUserUsage(userId);
      const lastReset = new Date(usage.last_reset_date);
      const lastResetDate = lastReset.toDateString();
      const lastResetMonth = `${lastReset.getFullYear()}-${lastReset.getMonth() + 1}`;

      let resetData: any = {};

      // إعادة تعيين الإحصائيات اليومية
      if (today !== lastResetDate) {
        resetData.profile_views_today = 0;
        resetData.searches_today = 0;
        resetData.likes_today = 0;
        resetData.voice_messages_today = 0;
      }

      // إعادة تعيين الإحصائيات الشهرية
      if (thisMonth !== lastResetMonth) {
        resetData.messages_sent_this_month = 0;
        resetData.consultation_hours_this_month = 0;
      }

      if (Object.keys(resetData).length > 0) {
        resetData.last_reset_date = now.toISOString();

        await supabase
          .from('user_usage_stats')
          .upsert({
            user_id: userId,
            ...resetData
          });
      }
    } catch (error) {
      console.error('Error resetting usage stats:', error);
    }
  }

  /**
   * الحصول على ملخص حالة المستخدم
   */
  static async getUserFeatureSummary(userId: string): Promise<{
    subscription: any;
    limits: UserLimits;
    usage: UserUsage;
    availableFeatures: string[];
  }> {
    try {
      const [subscriptionStatus, limits, usage] = await Promise.all([
        SubscriptionService.getUserSubscriptionStatus(userId),
        this.getUserLimits(userId),
        this.getUserUsage(userId)
      ]);

      // إعادة تعيين الإحصائيات إذا لزم الأمر
      await this.resetUsageStats(userId);

      return {
        subscription: subscriptionStatus,
        limits,
        usage,
        availableFeatures: Object.keys(subscriptionStatus.features).filter(key => subscriptionStatus.features[key] === true)
      };
    } catch (error) {
      console.error('Error getting user feature summary:', error);
      throw error;
    }
  }
}
