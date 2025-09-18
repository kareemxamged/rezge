import { supabase } from './supabase';

// أنواع البيانات
export interface SubscriptionPlan {
  id: string;
  name: string;
  name_en: string;
  description?: string;
  description_en?: string;
  price: number;
  currency: string;
  billing_period: string;
  features: Record<string, any>;
  limits: Record<string, any>;
  is_active: boolean;
  is_default: boolean;
  is_trial: boolean;
  trial_days: number;
  sort_order: number;
  trial_enabled: boolean;
  trial_days: number;
  created_at: string;
  updated_at: string;
}

// تعريف المميزات المتاحة
export interface FeatureDefinition {
  key: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  category: 'messaging' | 'search' | 'profile' | 'premium' | 'support';
  type: 'boolean' | 'number' | 'unlimited';
  icon: string;
}

// قائمة شاملة بجميع المميزات المتاحة
export const AVAILABLE_FEATURES: FeatureDefinition[] = [
  // مميزات المراسلة
  {
    key: 'messaging',
    name_ar: 'المراسلة الأساسية',
    name_en: 'Basic Messaging',
    description_ar: 'إمكانية إرسال واستقبال الرسائل',
    description_en: 'Ability to send and receive messages',
    category: 'messaging',
    type: 'boolean',
    icon: 'MessageCircle'
  },
  {
    key: 'unlimited_messaging',
    name_ar: 'مراسلة غير محدودة',
    name_en: 'Unlimited Messaging',
    description_ar: 'إرسال عدد غير محدود من الرسائل',
    description_en: 'Send unlimited number of messages',
    category: 'messaging',
    type: 'boolean',
    icon: 'MessageSquare'
  },
  {
    key: 'limited_messages',
    name_ar: 'رسائل محدودة',
    name_en: 'Limited Messages',
    description_ar: 'إرسال عدد محدود من الرسائل شهرياً',
    description_en: 'Send limited number of messages per month',
    category: 'messaging',
    type: 'boolean',
    icon: 'MessageCircle'
  },
  {
    key: 'voice_messages',
    name_ar: 'الرسائل الصوتية',
    name_en: 'Voice Messages',
    description_ar: 'إرسال واستقبال الرسائل الصوتية',
    description_en: 'Send and receive voice messages',
    category: 'messaging',
    type: 'boolean',
    icon: 'Mic'
  },

  // مميزات البحث
  {
    key: 'basic_search',
    name_ar: 'البحث الأساسي',
    name_en: 'Basic Search',
    description_ar: 'البحث الأساسي في الملفات الشخصية',
    description_en: 'Basic search in profiles',
    category: 'search',
    type: 'boolean',
    icon: 'Search'
  },
  {
    key: 'advanced_search',
    name_ar: 'البحث المتقدم',
    name_en: 'Advanced Search',
    description_ar: 'بحث متقدم مع فلاتر متعددة',
    description_en: 'Advanced search with multiple filters',
    category: 'search',
    type: 'boolean',
    icon: 'Filter'
  },
  {
    key: 'location_filter',
    name_ar: 'فلترة الموقع',
    name_en: 'Location Filter',
    description_ar: 'البحث حسب الموقع الجغرافي',
    description_en: 'Search by geographical location',
    category: 'search',
    type: 'boolean',
    icon: 'MapPin'
  },
  {
    key: 'age_filter',
    name_ar: 'فلترة العمر',
    name_en: 'Age Filter',
    description_ar: 'البحث حسب الفئة العمرية',
    description_en: 'Search by age range',
    category: 'search',
    type: 'boolean',
    icon: 'Calendar'
  },

  // مميزات الملف الشخصي
  {
    key: 'basic_profile',
    name_ar: 'الملف الشخصي الأساسي',
    name_en: 'Basic Profile',
    description_ar: 'إنشاء وإدارة الملف الشخصي الأساسي',
    description_en: 'Create and manage basic profile',
    category: 'profile',
    type: 'boolean',
    icon: 'User'
  },
  {
    key: 'profile_views',
    name_ar: 'مشاهدة الملفات',
    name_en: 'Profile Views',
    description_ar: 'مشاهدة الملفات الشخصية للآخرين',
    description_en: 'View other profiles',
    category: 'profile',
    type: 'boolean',
    icon: 'Eye'
  },
  {
    key: 'who_viewed_me',
    name_ar: 'من شاهد ملفي',
    name_en: 'Who Viewed Me',
    description_ar: 'معرفة من شاهد ملفك الشخصي',
    description_en: 'See who viewed your profile',
    category: 'profile',
    type: 'boolean',
    icon: 'Users'
  },
  {
    key: 'profile_boost',
    name_ar: 'تعزيز الملف الشخصي',
    name_en: 'Profile Boost',
    description_ar: 'إبراز ملفك الشخصي في نتائج البحث',
    description_en: 'Highlight your profile in search results',
    category: 'profile',
    type: 'boolean',
    icon: 'TrendingUp'
  },

  // المميزات المتقدمة
  {
    key: 'ad_free',
    name_ar: 'بدون إعلانات',
    name_en: 'Ad Free',
    description_ar: 'تجربة خالية من الإعلانات',
    description_en: 'Ad-free experience',
    category: 'premium',
    type: 'boolean',
    icon: 'Shield'
  },
  {
    key: 'priority_listing',
    name_ar: 'أولوية في النتائج',
    name_en: 'Priority Listing',
    description_ar: 'ظهور أولوي في نتائج البحث',
    description_en: 'Priority appearance in search results',
    category: 'premium',
    type: 'boolean',
    icon: 'Star'
  },
  {
    key: 'premium_verification',
    name_ar: 'توثيق مميز',
    name_en: 'Premium Verification',
    description_ar: 'علامة توثيق مميزة للملف الشخصي',
    description_en: 'Premium verification badge for profile',
    category: 'premium',
    type: 'boolean',
    icon: 'BadgeCheck'
  },
  {
    key: 'exclusive_features',
    name_ar: 'مميزات حصرية',
    name_en: 'Exclusive Features',
    description_ar: 'الوصول للمميزات الحصرية للمشتركين المميزين',
    description_en: 'Access to exclusive features for premium subscribers',
    category: 'premium',
    type: 'boolean',
    icon: 'Star'
  },
  {
    key: 'trial_available',
    name_ar: 'فترة تجريبية متاحة',
    name_en: 'Trial Available',
    description_ar: 'إمكانية الحصول على فترة تجريبية مجانية',
    description_en: 'Ability to get free trial period',
    category: 'premium',
    type: 'boolean',
    icon: 'Gift'
  },

  // مميزات الدعم
  {
    key: 'priority_support',
    name_ar: 'دعم أولوية',
    name_en: 'Priority Support',
    description_ar: 'دعم فني بأولوية عالية',
    description_en: 'High priority technical support',
    category: 'support',
    type: 'boolean',
    icon: 'Headphones'
  },
  {
    key: 'dedicated_support',
    name_ar: 'دعم مخصص',
    name_en: 'Dedicated Support',
    description_ar: 'مستشار دعم مخصص',
    description_en: 'Dedicated support consultant',
    category: 'support',
    type: 'boolean',
    icon: 'UserCheck'
  },
  {
    key: 'consultation',
    name_ar: 'استشارة زواج',
    name_en: 'Marriage Consultation',
    description_ar: 'جلسات استشارة زواج مع خبراء',
    description_en: 'Marriage consultation sessions with experts',
    category: 'support',
    type: 'boolean',
    icon: 'Heart'
  }
];

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'expired' | 'cancelled' | 'suspended';
  started_at: string;
  expires_at: string;
  cancelled_at?: string;
  payment_method?: string;
  payment_reference?: string;
  amount_paid?: number;
  is_trial: boolean;
  trial_started_at?: string;
  trial_expires_at?: string;
  trial_used: boolean;
  auto_renew: boolean;
  next_billing_date?: string;
  metadata: Record<string, any>;
  notes?: string;
  created_at: string;
  updated_at: string;
  plan?: SubscriptionPlan;
}

export interface TrialPeriod {
  id: string;
  user_id: string;
  plan_id: string;
  started_at: string;
  expires_at: string;
  status: 'active' | 'expired' | 'converted' | 'cancelled';
  converted_to_subscription_id?: string;
  converted_at?: string;
  features_used: Record<string, any>;
  usage_stats: Record<string, any>;
  created_at: string;
  updated_at: string;
  plan?: SubscriptionPlan;
}

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  hasActiveTrial: boolean;
  currentSubscription?: UserSubscription;
  currentTrial?: TrialPeriod;
  canStartTrial: boolean;
  daysRemaining?: number;
  features: Record<string, any>;
  limits: Record<string, any>;
  // إضافة معلومات جديدة للتمييز بين المستخدمين
  userType: 'new' | 'trial_expired' | 'subscription_expired' | 'active';
  hasUsedTrial: boolean;
  hasHadPaidSubscription: boolean;
  lastSubscriptionEndDate?: string;
}

export class SubscriptionService {
  /**
   * الحصول على جميع المميزات المتاحة
   */
  static getAvailableFeatures(): FeatureDefinition[] {
    return AVAILABLE_FEATURES;
  }

  /**
   * الحصول على المميزات حسب الفئة
   */
  static getFeaturesByCategory(category: string): FeatureDefinition[] {
    return AVAILABLE_FEATURES.filter(feature => feature.category === category);
  }

  /**
   * الحصول على تعريف مميزة معينة
   */
  static getFeatureDefinition(key: string): FeatureDefinition | undefined {
    return AVAILABLE_FEATURES.find(feature => feature.key === key);
  }

  /**
   * تنسيق المميزات للحفظ في قاعدة البيانات
   */
  static formatFeaturesForDatabase(selectedFeatures: string[]): Record<string, boolean> {
    const features: Record<string, boolean> = {};
    selectedFeatures.forEach(key => {
      features[key] = true;
    });
    return features;
  }

  /**
   * استخراج المميزات المفعلة من قاعدة البيانات
   */
  static extractActiveFeatures(features: Record<string, any>): string[] {
    return Object.entries(features)
      .filter(([key, value]) => value === true)
      .map(([key]) => key);
  }

  /**
   * الحصول على جميع خطط الاشتراك المتاحة
   */
  static async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .neq('is_trial', true) // استبعاد خطة الفترة التجريبية
        .order('sort_order');

      if (error) {
        console.error('Error fetching subscription plans:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAvailablePlans:', error);
      return [];
    }
  }

  /**
   * الحصول على حالة الاشتراك الحالية للمستخدم
   */
  static async getUserSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    try {
      // التحقق من الاشتراك النشط
      const { data: activeSubscription } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      // التحقق من الفترة التجريبية النشطة
      const { data: activeTrial } = await supabase
        .from('trial_periods')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      // التحقق من تاريخ الفترات التجريبية (جميع الحالات)
      const { data: trialHistory } = await supabase
        .from('trial_periods')
        .select('id, status, expires_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // التحقق من تاريخ الاشتراكات المدفوعة (جميع الحالات)
      const { data: subscriptionHistory } = await supabase
        .from('user_subscriptions')
        .select('id, status, expires_at, is_trial')
        .eq('user_id', userId)
        .eq('is_trial', false) // فقط الاشتراكات المدفوعة
        .order('created_at', { ascending: false });

      const canStartTrial = !trialHistory || trialHistory.length === 0;

      // تحديد نوع المستخدم وتاريخه
      const hasUsedTrial = trialHistory && trialHistory.length > 0;
      const hasHadPaidSubscription = subscriptionHistory && subscriptionHistory.length > 0;

      let userType: 'new' | 'trial_expired' | 'subscription_expired' | 'active' = 'new';
      let lastSubscriptionEndDate: string | undefined;

      if (activeSubscription && activeSubscription.length > 0) {
        userType = 'active';
      } else if (activeTrial && activeTrial.length > 0) {
        userType = 'active';
      } else if (hasHadPaidSubscription) {
        userType = 'subscription_expired';
        // الحصول على تاريخ انتهاء آخر اشتراك مدفوع
        lastSubscriptionEndDate = subscriptionHistory[0]?.expires_at;
      } else if (hasUsedTrial) {
        userType = 'trial_expired';
      } else {
        userType = 'new';
      }

      // تحديد المميزات والحدود الحالية
      let features = {};
      let limits = {};
      let daysRemaining: number | undefined;

      if (activeSubscription && activeSubscription.length > 0) {
        const sub = activeSubscription[0];
        features = sub.plan?.features || {};
        limits = sub.plan?.limits || {};
      } else if (activeTrial && activeTrial.length > 0) {
        const trial = activeTrial[0];
        features = trial.plan?.features || { messaging: true, basic_search: true, profile_views: true, limited_messages: true };
        limits = trial.plan?.limits || { messages_per_month: 50, profile_views_per_day: 20 };

        // حساب الأيام المتبقية
        const expiryDate = new Date(trial.expires_at);
        const today = new Date();
        const diffTime = expiryDate.getTime() - today.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      } else {
        // مستخدم بدون اشتراك أو فترة تجريبية - مميزات محدودة جداً
        features = { basic_profile: true };
        limits = { messages_per_month: 0, profile_views_per_day: 3 };
      }

      return {
        hasActiveSubscription: activeSubscription && activeSubscription.length > 0,
        hasActiveTrial: activeTrial && activeTrial.length > 0,
        currentSubscription: activeSubscription?.[0] || undefined,
        currentTrial: activeTrial?.[0] || undefined,
        canStartTrial,
        daysRemaining,
        features,
        limits,
        userType,
        hasUsedTrial,
        hasHadPaidSubscription,
        lastSubscriptionEndDate
      };
    } catch (error) {
      console.error('Error in getUserSubscriptionStatus:', error);
      return {
        hasActiveSubscription: false,
        hasActiveTrial: false,
        canStartTrial: false,
        features: { basic_profile: true },
        limits: { messages_per_month: 0, profile_views_per_day: 3 }
      };
    }
  }

  /**
   * الحصول على الباقات التي تدعم الفترة التجريبية
   */
  static async getTrialEnabledPlans(): Promise<SubscriptionPlan[]> {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .eq('trial_enabled', true)
        .order('sort_order');

      if (error) {
        console.error('Error fetching trial enabled plans:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTrialEnabledPlans:', error);
      return [];
    }
  }

  /**
   * بدء الفترة التجريبية للمستخدم (للباقات التي تدعم الفترة التجريبية)
   */
  static async startTrialPeriod(userId: string, planId?: string): Promise<{ success: boolean; error?: string; trial?: any }> {
    try {
      let selectedPlan: SubscriptionPlan | null = null;

      if (planId) {
        // إذا تم تحديد باقة معينة
        const { data: plan, error: planError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', planId)
          .eq('is_active', true)
          .eq('trial_enabled', true)
          .single();

        if (planError || !plan) {
          return { success: false, error: 'الباقة المحددة غير متوفرة أو لا تدعم الفترة التجريبية' };
        }
        selectedPlan = plan;
      } else {
        // الحصول على أول باقة تدعم الفترة التجريبية (عادة الأساسية)
        const { data: plans, error: planError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .eq('trial_enabled', true)
          .order('sort_order')
          .limit(1);

        if (planError || !plans || plans.length === 0) {
          return { success: false, error: 'لا توجد باقات تدعم الفترة التجريبية' };
        }
        selectedPlan = plans[0];
      }

      if (!selectedPlan) {
        return { success: false, error: 'لم يتم العثور على باقة مناسبة' };
      }

      // التحقق من عدم وجود فترة تجريبية سابقة
      const { data: existingTrial } = await supabase
        .from('trial_periods')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existingTrial) {
        return { success: false, error: 'لقد استخدمت الفترة التجريبية من قبل' };
      }

      // إنشاء فترة تجريبية جديدة
      const startDate = new Date();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + selectedPlan.trial_days); // استخدام مدة الفترة التجريبية من الباقة

      const { data: trial, error: trialError } = await supabase
        .from('trial_periods')
        .insert({
          user_id: userId,
          plan_id: selectedPlan.id,
          started_at: startDate.toISOString(),
          expires_at: expiryDate.toISOString(),
          status: 'active'
        })
        .select()
        .single();

      if (trialError) {
        console.error('Error creating trial:', trialError);
        return { success: false, error: 'فشل في بدء الفترة التجريبية' };
      }

      return { success: true, trial };
    } catch (error) {
      console.error('Error in startTrialPeriod:', error);
      return { success: false, error: 'حدث خطأ غير متوقع' };
    }
  }

  /**
   * التحقق من إمكانية بدء فترة تجريبية للمستخدم
   */
  static async canUserStartTrial(userId: string): Promise<{ canStart: boolean; availablePlans: SubscriptionPlan[] }> {
    try {
      // التحقق من عدم وجود فترة تجريبية سابقة
      const { data: existingTrial } = await supabase
        .from('trial_periods')
        .select('*')
        .eq('user_id', userId)
        .limit(1);

      if (existingTrial && existingTrial.length > 0) {
        return { canStart: false, availablePlans: [] };
      }

      // الحصول على الباقات التي تدعم الفترة التجريبية
      const availablePlans = await this.getTrialEnabledPlans();

      return {
        canStart: availablePlans.length > 0,
        availablePlans
      };
    } catch (error) {
      console.error('Error in canUserStartTrial:', error);
      return { canStart: false, availablePlans: [] };
    }
  }

  /**
   * إنشاء اشتراك جديد
   */
  static async createSubscription(
    userId: string,
    planId: string,
    paymentData?: {
      method: string;
      reference: string;
      amount: number;
    }
  ): Promise<{ success: boolean; error?: string; subscription?: UserSubscription }> {
    try {
      // الحصول على تفاصيل الخطة
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError || !plan) {
        return { success: false, error: 'خطة الاشتراك غير موجودة' };
      }

      // حساب تاريخ انتهاء الاشتراك
      const startDate = new Date();
      const expiryDate = new Date();

      if (plan.billing_period === 'monthly') {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      } else if (plan.billing_period === 'yearly') {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      }

      // إنشاء الاشتراك
      const { data: subscription, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          plan_id: planId,
          started_at: startDate.toISOString(),
          expires_at: expiryDate.toISOString(),
          payment_method: paymentData?.method,
          payment_reference: paymentData?.reference,
          amount_paid: paymentData?.amount || plan.price,
          status: 'active'
        })
        .select()
        .single();

      if (subscriptionError) {
        console.error('Error creating subscription:', subscriptionError);
        return { success: false, error: 'فشل في إنشاء الاشتراك' };
      }

      // تسجيل في تاريخ الاشتراكات
      await supabase
        .from('subscription_history')
        .insert({
          user_id: userId,
          subscription_id: subscription.id,
          plan_id: planId,
          action: 'created',
          status_to: 'active',
          amount: paymentData?.amount || plan.price,
          payment_reference: paymentData?.reference
        });

      return { success: true, subscription };
    } catch (error) {
      console.error('Error in createSubscription:', error);
      return { success: false, error: 'حدث خطأ غير متوقع' };
    }
  }

  /**
   * إلغاء الاشتراك
   */
  static async cancelSubscription(subscriptionId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          auto_renew: false
        })
        .eq('id', subscriptionId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error cancelling subscription:', error);
        return { success: false, error: 'فشل في إلغاء الاشتراك' };
      }

      // تسجيل في تاريخ الاشتراكات
      await supabase
        .from('subscription_history')
        .insert({
          user_id: userId,
          subscription_id: subscriptionId,
          action: 'cancelled',
          status_from: 'active',
          status_to: 'cancelled'
        });

      return { success: true };
    } catch (error) {
      console.error('Error in cancelSubscription:', error);
      return { success: false, error: 'حدث خطأ غير متوقع' };
    }
  }

  /**
   * التحقق من صلاحية المستخدم لميزة معينة
   */
  static async checkFeatureAccess(userId: string, feature: string): Promise<boolean> {
    try {
      const status = await this.getUserSubscriptionStatus(userId);
      return !!status.features[feature];
    } catch (error) {
      console.error('Error checking feature access:', error);
      return false;
    }
  }

  /**
   * التحقق من حد الاستخدام لميزة معينة
   */
  static async checkUsageLimit(userId: string, limitType: string): Promise<{ allowed: boolean; limit: number; used?: number }> {
    try {
      const status = await this.getUserSubscriptionStatus(userId);
      const limit = status.limits[limitType] || 0;

      // إذا كان الحد -1 فهذا يعني غير محدود
      if (limit === -1) {
        return { allowed: true, limit: -1 };
      }

      // هنا يمكن إضافة منطق لحساب الاستخدام الفعلي
      // مثلاً عدد الرسائل المرسلة هذا الشهر

      return { allowed: true, limit };
    } catch (error) {
      console.error('Error checking usage limit:', error);
      return { allowed: false, limit: 0 };
    }
  }

  /**
   * تحويل الفترة التجريبية إلى اشتراك مدفوع
   */
  static async convertTrialToSubscription(
    userId: string,
    planId: string,
    paymentData: {
      method: string;
      reference: string;
      amount: number;
    }
  ): Promise<{ success: boolean; error?: string; subscription?: UserSubscription }> {
    try {
      // إنهاء الفترة التجريبية
      await supabase
        .from('trial_periods')
        .update({
          status: 'converted',
          converted_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'active');

      // إنشاء الاشتراك الجديد
      const result = await this.createSubscription(userId, planId, paymentData);

      if (result.success && result.subscription) {
        // ربط الفترة التجريبية بالاشتراك الجديد
        await supabase
          .from('trial_periods')
          .update({
            converted_to_subscription_id: result.subscription.id
          })
          .eq('user_id', userId)
          .eq('status', 'converted');
      }

      return result;
    } catch (error) {
      console.error('Error in convertTrialToSubscription:', error);
      return { success: false, error: 'حدث خطأ غير متوقع' };
    }
  }
}
