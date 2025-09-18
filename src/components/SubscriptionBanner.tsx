import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../contexts/AuthContext';
import { SubscriptionService } from '../lib/subscriptionService';
import {
  AlertTriangle,
  Gift,
  Clock,
  Star,
  Crown,
  Zap,
  X,
  CreditCard
} from 'lucide-react';

const SubscriptionBanner: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { subscriptionInfo, canStartTrial, startTrial, loading } = useSubscription();
  const [dismissed, setDismissed] = React.useState(false);
  const [trialPlans, setTrialPlans] = React.useState<any[]>([]);

  const isRTL = i18n.language === 'ar';

  // إعادة تعيين حالة الإخفاء عند تغيير معلومات الاشتراك
  React.useEffect(() => {
    if (!subscriptionInfo) {
      setDismissed(false);
    }
  }, [subscriptionInfo]);

  // تحميل الباقات التي تدعم الفترة التجريبية
  React.useEffect(() => {
    const loadTrialPlans = async () => {
      const plans = await SubscriptionService.getTrialEnabledPlans();
      setTrialPlans(plans);
    };
    loadTrialPlans();
  }, []);

  // لا نعرض البانر إذا لم يكن المستخدم مسجل دخول
  if (!isAuthenticated || loading || !subscriptionInfo || dismissed) {
    return null;
  }

  const handleStartTrial = async () => {
    const result = await startTrial();
    if (result.success) {
      console.log('Trial started successfully');
    } else {
      console.error('Failed to start trial:', result.error);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  // إذا لم يكن لديه اشتراك نشط ويمكنه بدء فترة تجريبية
  if (!subscriptionInfo.isActive && canStartTrial) {
    return (
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex items-center justify-between py-3 ${isRTL ? 'flex-row' : 'flex-row'}`}>
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row' : 'flex-row'}`}>
              <Gift className="w-5 h-5 flex-shrink-0" />
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="font-medium">
                  {t('subscription.banner.trial.title', 'ابدأ فترتك التجريبية المجانية الآن!')}
                </p>
                <p className="text-sm opacity-90">
                  {trialPlans.length > 0
                    ? `${trialPlans[0].trial_days} أيام مجانية بجميع مميزات ${trialPlans[0].name}`
                    : t('subscription.banner.trial.description', '3 أيام مجانية بجميع مميزات الباقة الأساسية')
                  }
                </p>
              </div>
            </div>
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row' : 'flex-row-reverse'}`}>
              <button
                onClick={handleStartTrial}
                disabled={loading}
                className="bg-white text-green-600 px-4 py-2 rounded-lg font-medium hover:bg-green-50 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {loading ? t('subscription.trial.starting', 'جاري البدء...') : t('subscription.trial.start', 'ابدأ الآن')}
              </button>
              <button
                onClick={handleDismiss}
                className="text-white/80 hover:text-white transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // إذا كان في فترة تجريبية
  if (subscriptionInfo.isActive && subscriptionInfo.isTrial && subscriptionInfo.daysRemaining !== undefined) {
    const isLastDay = subscriptionInfo.daysRemaining <= 1;

    return (
      <div className={`${isLastDay ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-orange-500 to-amber-500'} text-white`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex items-center justify-between py-3 ${isRTL ? 'flex-row' : 'flex-row'}`}>
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row' : 'flex-row'}`}>
              <Clock className="w-5 h-5 flex-shrink-0" />
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="font-medium">
                  {isLastDay
                    ? t('subscription.banner.trial.lastDay', 'آخر يوم في فترتك التجريبية!')
                    : t('subscription.banner.trial.remaining', 'متبقي {{days}} أيام في فترتك التجريبية', { days: subscriptionInfo.daysRemaining })
                  }
                </p>
                <p className="text-sm opacity-90">
                  {t('subscription.banner.trial.upgrade', 'اشترك الآن للاستمرار في الاستفادة من جميع المميزات')}
                </p>
              </div>
            </div>
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row' : 'flex-row-reverse'}`}>
              <Link
                to="/subscription"
                className="bg-white text-orange-600 px-4 py-2 rounded-lg font-medium hover:bg-orange-50 transition-colors whitespace-nowrap"
              >
                {t('subscription.upgrade', 'اشترك الآن')}
              </Link>
              <button
                onClick={handleDismiss}
                className="text-white/80 hover:text-white transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // إذا لم يكن لديه اشتراك نشط ولا يمكنه بدء فترة تجريبية
  if (!subscriptionInfo.isActive) {
    // تحديد نوع الرسالة بناءً على نوع المستخدم
    const userType = subscriptionInfo.userType;

    if (userType === 'subscription_expired') {
      // مستخدم كان لديه اشتراك مدفوع وانتهى
      return (
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`flex items-center justify-between py-3 ${isRTL ? 'flex-row' : 'flex-row'}`}>
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row' : 'flex-row'}`}>
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="font-medium">
                    {t('subscription.banner.subscriptionExpired.title', 'انتهى اشتراكك المدفوع')}
                  </p>
                  <p className="text-sm opacity-90">
                    {t('subscription.banner.subscriptionExpired.description', 'جدد اشتراكك الآن للعودة إلى جميع المميزات المتقدمة')}
                  </p>
                </div>
              </div>
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row' : 'flex-row-reverse'}`}>
                <Link
                  to="/subscription"
                  className="bg-white text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-50 transition-colors whitespace-nowrap"
                >
                  {t('subscription.renewNow', 'جدد الآن')}
                </Link>
                <button
                  onClick={handleDismiss}
                  className="text-white/80 hover:text-white transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    } else if (userType === 'trial_expired') {
      // مستخدم استهلك فترته التجريبية
      return (
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`flex items-center justify-between py-3 ${isRTL ? 'flex-row' : 'flex-row'}`}>
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row' : 'flex-row'}`}>
                <Clock className="w-5 h-5 flex-shrink-0" />
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="font-medium">
                    {t('subscription.banner.trialExpired.title', 'انتهت فترتك التجريبية')}
                  </p>
                  <p className="text-sm opacity-90">
                    {t('subscription.banner.trialExpired.description', 'اشترك الآن للاستمرار في الاستفادة من جميع المميزات')}
                  </p>
                </div>
              </div>
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row' : 'flex-row-reverse'}`}>
                <Link
                  to="/subscription"
                  className="bg-white text-orange-600 px-4 py-2 rounded-lg font-medium hover:bg-orange-50 transition-colors whitespace-nowrap"
                >
                  {t('subscription.subscribeNow', 'اشترك الآن')}
                </Link>
                <button
                  onClick={handleDismiss}
                  className="text-white/80 hover:text-white transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      // مستخدم جديد أو حالة افتراضية
      return (
        <div className="bg-gradient-to-r from-slate-600 to-slate-700 text-white" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`flex items-center justify-between py-3 ${isRTL ? 'flex-row' : 'flex-row'}`}>
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row' : 'flex-row'}`}>
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="font-medium">
                    {t('subscription.banner.noSubscription.title', 'لا يوجد اشتراك نشط')}
                  </p>
                  <p className="text-sm opacity-90">
                    {t('subscription.banner.noSubscription.description', 'اشترك في إحدى الباقات للاستفادة من جميع المميزات')}
                  </p>
                </div>
              </div>
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row' : 'flex-row-reverse'}`}>
                <Link
                  to="/subscription"
                  className="bg-white text-slate-600 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  {t('subscription.viewPlans', 'عرض الباقات')}
                </Link>
                <button
                  onClick={handleDismiss}
                  className="text-white/80 hover:text-white transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // إذا كان لديه اشتراك نشط - لا نعرض شيئاً
  return null;
};

export default SubscriptionBanner;
