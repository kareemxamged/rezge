import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../hooks/useSubscription';
import { Crown, Star, Zap, Gift, Clock, AlertTriangle } from 'lucide-react';

const SubscriptionStatus: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { subscriptionInfo, canStartTrial, startTrial, loading } = useSubscription();

  const isRTL = i18n.language === 'ar';

  if (loading || !subscriptionInfo) {
    return null;
  }

  // عرض المكون فقط للمستخدمين الذين لديهم فترة تجريبية نشطة
  // يختفي المكون نهائياً بعد انتهاء الفترة التجريبية
  if (!subscriptionInfo.isActive || !subscriptionInfo.isTrial) {
    return null;
  }

  // بما أن المكون يظهر فقط للفترة التجريبية النشطة، نبسط الدوال
  const getPlanIcon = () => {
    return Gift; // أيقونة الهدية للفترة التجريبية
  };

  const getPlanColor = () => {
    return 'from-orange-500 to-amber-500'; // لون برتقالي للفترة التجريبية
  };

  // تحديد النص المناسب للعرض - فقط للفترة التجريبية النشطة
  const getDisplayText = () => {
    if (subscriptionInfo.daysRemaining !== undefined) {
      if (subscriptionInfo.daysRemaining <= 1) {
        return t('subscription.trial.lastDay', 'آخر يوم!');
      } else {
        return t('subscription.trial.remaining', 'متبقي {{days}} أيام', { days: subscriptionInfo.daysRemaining });
      }
    }
    return subscriptionInfo.planName || t('subscription.status.trial', 'فترة تجريبية');
  };

  // عرض مؤشر بسيط في الهيدر
  const Icon = getPlanIcon();
  const colorClass = getPlanColor();

  return (
    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row' : 'flex-row'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r ${colorClass} text-white text-sm rounded-full ${isRTL ? 'flex-row' : 'flex-row'}`}>
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className={`hidden sm:inline whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>
          {getDisplayText()}
        </span>
      </div>
    </div>
  );
};

export default SubscriptionStatus;
