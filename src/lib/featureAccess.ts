import { SubscriptionService } from './subscriptionService';
import type { SubscriptionStatus } from './subscriptionService';

// تعريف المميزات المتاحة
export enum Feature {
  // المميزات الأساسية
  BASIC_PROFILE = 'basic_profile',
  PROFILE_VIEWS = 'profile_views',
  BASIC_SEARCH = 'basic_search',

  // المراسلة
  MESSAGING = 'messaging',
  UNLIMITED_MESSAGING = 'unlimited_messaging',
  LIMITED_MESSAGES = 'limited_messages',

  // البحث المتقدم
  ADVANCED_SEARCH = 'advanced_search',
  LOCATION_FILTER = 'location_filter',
  AGE_FILTER = 'age_filter',
  EDUCATION_FILTER = 'education_filter',

  // المميزات المتقدمة
  WHO_VIEWED_ME = 'who_viewed_me',
  PRIORITY_LISTING = 'priority_listing',
  AD_FREE = 'ad_free',

  // الدعم والاستشارة
  CONSULTATION = 'consultation',
  DEDICATED_SUPPORT = 'dedicated_support',
  PREMIUM_VERIFICATION = 'premium_verification'
}

// تعريف حدود الاستخدام
export enum UsageLimit {
  MESSAGES_PER_MONTH = 'messages_per_month',
  PROFILE_VIEWS_PER_DAY = 'profile_views_per_day',
  SEARCH_RESULTS_PER_DAY = 'search_results_per_day',
  LIKES_PER_DAY = 'likes_per_day'
}

// خريطة المميزات حسب نوع الاشتراك
export const PLAN_FEATURES = {
  // بدون اشتراك (مستخدم جديد بدون فترة تجريبية)
  none: {
    features: [Feature.BASIC_PROFILE],
    limits: {
      [UsageLimit.MESSAGES_PER_MONTH]: 0,
      [UsageLimit.PROFILE_VIEWS_PER_DAY]: 3,
      [UsageLimit.SEARCH_RESULTS_PER_DAY]: 10,
      [UsageLimit.LIKES_PER_DAY]: 0
    }
  },

  // الفترة التجريبية (3 أيام)
  trial: {
    features: [
      Feature.BASIC_PROFILE,
      Feature.PROFILE_VIEWS,
      Feature.BASIC_SEARCH,
      Feature.MESSAGING,
      Feature.LIMITED_MESSAGES
    ],
    limits: {
      [UsageLimit.MESSAGES_PER_MONTH]: 20,
      [UsageLimit.PROFILE_VIEWS_PER_DAY]: 10,
      [UsageLimit.SEARCH_RESULTS_PER_DAY]: 50,
      [UsageLimit.LIKES_PER_DAY]: 5
    }
  },

  // الباقة الأساسية (19 ر.س/شهر)
  basic: {
    features: [
      Feature.BASIC_PROFILE,
      Feature.PROFILE_VIEWS,
      Feature.BASIC_SEARCH,
      Feature.MESSAGING,
      Feature.LIMITED_MESSAGES,
      Feature.LOCATION_FILTER,
      Feature.AGE_FILTER
    ],
    limits: {
      [UsageLimit.MESSAGES_PER_MONTH]: 50,
      [UsageLimit.PROFILE_VIEWS_PER_DAY]: 20,
      [UsageLimit.SEARCH_RESULTS_PER_DAY]: 100,
      [UsageLimit.LIKES_PER_DAY]: 10
    }
  },

  // الباقة المميزة (49 ر.س/شهر)
  premium: {
    features: [
      Feature.BASIC_PROFILE,
      Feature.PROFILE_VIEWS,
      Feature.BASIC_SEARCH,
      Feature.UNLIMITED_MESSAGING,
      Feature.ADVANCED_SEARCH,
      Feature.LOCATION_FILTER,
      Feature.AGE_FILTER,
      Feature.EDUCATION_FILTER,
      Feature.WHO_VIEWED_ME,
      Feature.AD_FREE
    ],
    limits: {
      [UsageLimit.MESSAGES_PER_MONTH]: -1, // غير محدود
      [UsageLimit.PROFILE_VIEWS_PER_DAY]: -1, // غير محدود
      [UsageLimit.SEARCH_RESULTS_PER_DAY]: -1, // غير محدود
      [UsageLimit.LIKES_PER_DAY]: 50
    }
  },

  // باقة VIP (99 ر.س/شهر)
  vip: {
    features: [
      Feature.BASIC_PROFILE,
      Feature.PROFILE_VIEWS,
      Feature.BASIC_SEARCH,
      Feature.UNLIMITED_MESSAGING,
      Feature.ADVANCED_SEARCH,
      Feature.LOCATION_FILTER,
      Feature.AGE_FILTER,
      Feature.EDUCATION_FILTER,
      Feature.WHO_VIEWED_ME,
      Feature.PRIORITY_LISTING,
      Feature.AD_FREE,
      Feature.CONSULTATION,
      Feature.DEDICATED_SUPPORT,
      Feature.PREMIUM_VERIFICATION
    ],
    limits: {
      [UsageLimit.MESSAGES_PER_MONTH]: -1, // غير محدود
      [UsageLimit.PROFILE_VIEWS_PER_DAY]: -1, // غير محدود
      [UsageLimit.SEARCH_RESULTS_PER_DAY]: -1, // غير محدود
      [UsageLimit.LIKES_PER_DAY]: -1 // غير محدود
    }
  }
};

export class FeatureAccessService {
  private static subscriptionStatusCache: Map<string, { status: SubscriptionStatus; timestamp: number }> = new Map();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

  /**
   * الحصول على حالة الاشتراك مع التخزين المؤقت
   */
  private static async getUserSubscriptionStatusCached(userId: string): Promise<SubscriptionStatus> {
    const cached = this.subscriptionStatusCache.get(userId);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      return cached.status;
    }

    const status = await SubscriptionService.getUserSubscriptionStatus(userId);
    this.subscriptionStatusCache.set(userId, { status, timestamp: now });

    return status;
  }

  /**
   * تحديد نوع الخطة الحالية للمستخدم
   */
  private static async getUserPlanType(userId: string): Promise<string> {
    const status = await this.getUserSubscriptionStatusCached(userId);

    if (status.hasActiveTrial) {
      return 'trial';
    }

    if (status.hasActiveSubscription && status.currentSubscription) {
      const planName = status.currentSubscription.plan_name?.toLowerCase() || '';

      if (planName.includes('basic') || planName.includes('أساسية')) {
        return 'basic';
      } else if (planName.includes('premium') || planName.includes('مميزة')) {
        return 'premium';
      } else if (planName.includes('vip')) {
        return 'vip';
      }
    }

    return 'none';
  }

  /**
   * التحقق من إمكانية الوصول لميزة معينة
   */
  static async hasFeatureAccess(userId: string, feature: Feature): Promise<boolean> {
    try {
      const planType = await this.getUserPlanType(userId);
      const planConfig = PLAN_FEATURES[planType as keyof typeof PLAN_FEATURES];

      return planConfig.features.includes(feature);
    } catch (error) {
      console.error('Error checking feature access:', error);
      return false;
    }
  }

  /**
   * الحصول على حد الاستخدام لميزة معينة
   */
  static async getUsageLimit(userId: string, limit: UsageLimit): Promise<number> {
    try {
      const planType = await this.getUserPlanType(userId);
      const planConfig = PLAN_FEATURES[planType as keyof typeof PLAN_FEATURES];

      return planConfig.limits[limit] || 0;
    } catch (error) {
      console.error('Error getting usage limit:', error);
      return 0;
    }
  }

  /**
   * التحقق من تجاوز حد الاستخدام
   */
  static async checkUsageExceeded(userId: string, limit: UsageLimit, currentUsage: number): Promise<boolean> {
    try {
      const maxLimit = await this.getUsageLimit(userId, limit);

      // إذا كان الحد -1 فهذا يعني غير محدود
      if (maxLimit === -1) {
        return false;
      }

      return currentUsage >= maxLimit;
    } catch (error) {
      console.error('Error checking usage exceeded:', error);
      return true; // في حالة الخطأ، نمنع الاستخدام للأمان
    }
  }

  /**
   * الحصول على جميع المميزات المتاحة للمستخدم
   */
  static async getUserFeatures(userId: string): Promise<Feature[]> {
    try {
      const planType = await this.getUserPlanType(userId);
      const planConfig = PLAN_FEATURES[planType as keyof typeof PLAN_FEATURES];

      return planConfig.features;
    } catch (error) {
      console.error('Error getting user features:', error);
      return [Feature.BASIC_PROFILE];
    }
  }

  /**
   * الحصول على جميع حدود الاستخدام للمستخدم
   */
  static async getUserLimits(userId: string): Promise<Record<UsageLimit, number>> {
    try {
      const planType = await this.getUserPlanType(userId);
      const planConfig = PLAN_FEATURES[planType as keyof typeof PLAN_FEATURES];

      return planConfig.limits;
    } catch (error) {
      console.error('Error getting user limits:', error);
      return {
        [UsageLimit.MESSAGES_PER_MONTH]: 0,
        [UsageLimit.PROFILE_VIEWS_PER_DAY]: 3,
        [UsageLimit.SEARCH_RESULTS_PER_DAY]: 10,
        [UsageLimit.LIKES_PER_DAY]: 0
      };
    }
  }

  /**
   * مسح التخزين المؤقت لمستخدم معين
   */
  static clearUserCache(userId: string): void {
    this.subscriptionStatusCache.delete(userId);
  }

  /**
   * مسح جميع التخزين المؤقت
   */
  static clearAllCache(): void {
    this.subscriptionStatusCache.clear();
  }

  /**
   * التحقق من إمكانية بدء الفترة التجريبية
   */
  static async canStartTrial(userId: string): Promise<boolean> {
    try {
      const status = await this.getUserSubscriptionStatusCached(userId);
      return status.canStartTrial;
    } catch (error) {
      console.error('Error checking trial eligibility:', error);
      return false;
    }
  }

  /**
   * الحصول على معلومات الاشتراك الحالي
   */
  static async getCurrentSubscriptionInfo(userId: string): Promise<{
    planType: string;
    planName?: string;
    isActive: boolean;
    isTrial: boolean;
    daysRemaining?: number;
    expiresAt?: string;
  }> {
    try {
      const status = await this.getUserSubscriptionStatusCached(userId);
      const planType = await this.getUserPlanType(userId);

      return {
        planType,
        planName: status.currentSubscription?.plan_name || status.currentTrial?.plan_name,
        isActive: status.hasActiveSubscription || status.hasActiveTrial,
        isTrial: status.hasActiveTrial,
        daysRemaining: status.daysRemaining,
        expiresAt: status.currentSubscription?.expires_at || status.currentTrial?.expires_at
      };
    } catch (error) {
      console.error('Error getting subscription info:', error);
      return {
        planType: 'none',
        isActive: false,
        isTrial: false
      };
    }
  }
}
