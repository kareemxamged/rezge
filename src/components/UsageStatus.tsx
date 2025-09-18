import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  MessageCircle, 
  Eye, 
  Search, 
  Heart, 
  Mic, 
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp
} from 'lucide-react';
import { FeatureAccessService, UserLimits, UserUsage } from '../lib/featureAccessService';
import { useAuth } from '../hooks/useAuth';

interface UsageStatusProps {
  className?: string;
  showTitle?: boolean;
}

const UsageStatus: React.FC<UsageStatusProps> = ({ className = '', showTitle = true }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [limits, setLimits] = useState<UserLimits | null>(null);
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    if (user) {
      loadUsageData();
    }
  }, [user]);

  const loadUsageData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [userLimits, userUsage] = await Promise.all([
        FeatureAccessService.getUserLimits(user.id),
        FeatureAccessService.getUserUsage(user.id)
      ]);

      setLimits(userLimits);
      setUsage(userUsage);
    } catch (error) {
      console.error('Error loading usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUsagePercentage = (current: number, limit: number): number => {
    if (limit === -1) return 0; // غير محدود
    if (limit === 0) return 100; // غير متاح
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number): string => {
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 70) return 'text-amber-600 bg-amber-100';
    return 'text-green-600 bg-green-100';
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const formatLimit = (limit: number): string => {
    if (limit === -1) return isRTL ? 'غير محدود' : 'Unlimited';
    if (limit === 0) return isRTL ? 'غير متاح' : 'Not Available';
    return limit.toString();
  };

  const usageItems = [
    {
      key: 'messages_sent_this_month',
      icon: MessageCircle,
      nameAr: 'الرسائل المرسلة',
      nameEn: 'Messages Sent',
      current: usage?.messages_sent_this_month || 0,
      limit: limits?.messages_per_month || 0,
      period: isRTL ? 'هذا الشهر' : 'This Month'
    },
    {
      key: 'profile_views_today',
      icon: Eye,
      nameAr: 'مشاهدة الملفات',
      nameEn: 'Profile Views',
      current: usage?.profile_views_today || 0,
      limit: limits?.profile_views_per_day || 0,
      period: isRTL ? 'اليوم' : 'Today'
    },
    {
      key: 'searches_today',
      icon: Search,
      nameAr: 'عمليات البحث',
      nameEn: 'Searches',
      current: usage?.searches_today || 0,
      limit: limits?.search_results_per_day || 0,
      period: isRTL ? 'اليوم' : 'Today'
    },
    {
      key: 'likes_today',
      icon: Heart,
      nameAr: 'الإعجابات',
      nameEn: 'Likes',
      current: usage?.likes_today || 0,
      limit: limits?.likes_per_day || 0,
      period: isRTL ? 'اليوم' : 'Today'
    },
    {
      key: 'voice_messages_today',
      icon: Mic,
      nameAr: 'الرسائل الصوتية',
      nameEn: 'Voice Messages',
      current: usage?.voice_messages_today || 0,
      limit: limits?.voice_messages_per_day || 0,
      period: isRTL ? 'اليوم' : 'Today'
    },
    {
      key: 'consultation_hours_this_month',
      icon: Clock,
      nameAr: 'ساعات الاستشارة',
      nameEn: 'Consultation Hours',
      current: usage?.consultation_hours_this_month || 0,
      limit: limits?.consultation_hours_per_month || 0,
      period: isRTL ? 'هذا الشهر' : 'This Month'
    }
  ];

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-slate-200 p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-3 bg-slate-200 rounded w-1/2 mb-1"></div>
                  <div className="h-2 bg-slate-200 rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!limits || !usage) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg border border-slate-200 p-4 ${className}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {showTitle && (
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-slate-800">
            {isRTL ? 'حالة الاستخدام' : 'Usage Status'}
          </h3>
        </div>
      )}

      <div className="space-y-4">
        {usageItems.map((item) => {
          const percentage = getUsagePercentage(item.current, item.limit);
          const Icon = item.icon;
          const isOverLimit = item.limit > 0 && item.current >= item.limit;
          const isUnlimited = item.limit === -1;
          const isNotAvailable = item.limit === 0;

          return (
            <div key={item.key} className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isOverLimit ? 'bg-red-100' : isNotAvailable ? 'bg-slate-100' : 'bg-blue-100'
              }`}>
                <Icon className={`w-5 h-5 ${
                  isOverLimit ? 'text-red-600' : isNotAvailable ? 'text-slate-400' : 'text-blue-600'
                }`} />
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-800">
                    {isRTL ? item.nameAr : item.nameEn}
                  </span>
                  <div className="flex items-center gap-2">
                    {isOverLimit && (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                    {isUnlimited && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full ${getUsageColor(percentage)}`}>
                      {item.current} / {formatLimit(item.limit)}
                    </span>
                  </div>
                </div>

                {!isUnlimited && !isNotAvailable && (
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(percentage)}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-slate-500">{item.period}</span>
                  {isOverLimit && (
                    <span className="text-xs text-red-600 font-medium">
                      {isRTL ? 'تم تجاوز الحد المسموح' : 'Limit Exceeded'}
                    </span>
                  )}
                  {isUnlimited && (
                    <span className="text-xs text-green-600 font-medium">
                      {isRTL ? 'غير محدود' : 'Unlimited'}
                    </span>
                  )}
                  {isNotAvailable && (
                    <span className="text-xs text-slate-400 font-medium">
                      {isRTL ? 'غير متاح في باقتك' : 'Not Available'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200">
        <button
          onClick={loadUsageData}
          className="w-full text-center text-sm text-primary-600 hover:text-primary-700 transition-colors"
        >
          {isRTL ? 'تحديث البيانات' : 'Refresh Data'}
        </button>
      </div>
    </div>
  );
};

export default UsageStatus;
