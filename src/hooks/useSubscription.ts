import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SubscriptionService } from '../lib/subscriptionService';
import type { SubscriptionStatus } from '../lib/subscriptionService';
import { FeatureAccessService } from '../lib/featureAccess';
import type { Feature, UsageLimit } from '../lib/featureAccess';

export interface UseSubscriptionReturn {
  // حالة التحميل
  loading: boolean;

  // معلومات الاشتراك
  subscriptionStatus: SubscriptionStatus | null;
  subscriptionInfo: {
    planType: string;
    planName?: string;
    isActive: boolean;
    isTrial: boolean;
    daysRemaining?: number;
    expiresAt?: string;
    userType: 'new' | 'trial_expired' | 'subscription_expired' | 'active';
    hasUsedTrial: boolean;
    hasHadPaidSubscription: boolean;
    lastSubscriptionEndDate?: string;
  } | null;

  // المميزات والحدود
  features: Feature[];
  limits: Record<UsageLimit, number>;

  // إمكانيات
  canStartTrial: boolean;

  // دوال
  startTrial: () => Promise<{ success: boolean; error?: string }>;
  checkFeatureAccess: (feature: Feature) => boolean;
  checkUsageLimit: (limit: UsageLimit) => number;
  refreshSubscription: () => Promise<void>;
}

export const useSubscription = (): UseSubscriptionReturn => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [limits, setLimits] = useState<Record<UsageLimit, number>>({} as Record<UsageLimit, number>);
  const [canStartTrial, setCanStartTrial] = useState(false);

  const loadSubscriptionData = useCallback(async () => {
    if (!user?.id) {
      // مسح جميع البيانات عند عدم وجود مستخدم (تسجيل الخروج)
      setSubscriptionStatus(null);
      setSubscriptionInfo(null);
      setFeatures([]);
      setLimits({} as Record<UsageLimit, number>);
      setCanStartTrial(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // تحميل حالة الاشتراك
      const status = await SubscriptionService.getUserSubscriptionStatus(user.id);
      setSubscriptionStatus(status);

      // تحديد معلومات الاشتراك من الحالة
      let info = null;
      if (status.hasActiveTrial && status.currentTrial) {
        info = {
          planType: 'trial',
          planName: status.currentTrial.plan?.name || 'فترة تجريبية',
          isActive: true,
          isTrial: true,
          daysRemaining: status.daysRemaining,
          expiresAt: status.currentTrial.expires_at,
          userType: status.userType,
          hasUsedTrial: status.hasUsedTrial,
          hasHadPaidSubscription: status.hasHadPaidSubscription,
          lastSubscriptionEndDate: status.lastSubscriptionEndDate
        };
      } else if (status.hasActiveSubscription && status.currentSubscription) {
        info = {
          planType: status.currentSubscription.plan?.name?.includes('VIP') ? 'vip' :
                   status.currentSubscription.plan?.name?.includes('مميزة') ? 'premium' : 'basic',
          planName: status.currentSubscription.plan?.name,
          isActive: true,
          isTrial: false,
          expiresAt: status.currentSubscription.expires_at,
          userType: status.userType,
          hasUsedTrial: status.hasUsedTrial,
          hasHadPaidSubscription: status.hasHadPaidSubscription,
          lastSubscriptionEndDate: status.lastSubscriptionEndDate
        };
      } else {
        info = {
          planType: 'none',
          planName: null,
          isActive: false,
          isTrial: false,
          userType: status.userType,
          hasUsedTrial: status.hasUsedTrial,
          hasHadPaidSubscription: status.hasHadPaidSubscription,
          lastSubscriptionEndDate: status.lastSubscriptionEndDate
        };
      }
      setSubscriptionInfo(info);

      // تحميل المميزات والحدود من الحالة
      setFeatures(Object.keys(status.features));
      setLimits(status.limits);

      // التحقق من إمكانية بدء الفترة التجريبية
      setCanStartTrial(status.canStartTrial);

    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSubscriptionData();
  }, [loadSubscriptionData]);

  const startTrial = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) {
      return { success: false, error: 'المستخدم غير مسجل الدخول' };
    }

    try {
      const result = await SubscriptionService.startTrialPeriod(user.id);

      if (result.success) {
        // إعادة تحميل البيانات
        await loadSubscriptionData();
        // مسح التخزين المؤقت
        FeatureAccessService.clearUserCache(user.id);
      }

      return result;
    } catch (error) {
      console.error('Error starting trial:', error);
      return { success: false, error: 'حدث خطأ غير متوقع' };
    }
  }, [user?.id, loadSubscriptionData]);

  const checkFeatureAccess = useCallback((feature: Feature): boolean => {
    return features.includes(feature);
  }, [features]);

  const checkUsageLimit = useCallback((limit: UsageLimit): number => {
    return limits[limit] || 0;
  }, [limits]);

  const refreshSubscription = useCallback(async (): Promise<void> => {
    if (user?.id) {
      FeatureAccessService.clearUserCache(user.id);
      await loadSubscriptionData();
    }
  }, [user?.id, loadSubscriptionData]);

  return {
    loading,
    subscriptionStatus,
    subscriptionInfo,
    features,
    limits,
    canStartTrial,
    startTrial,
    checkFeatureAccess,
    checkUsageLimit,
    refreshSubscription
  };
};
