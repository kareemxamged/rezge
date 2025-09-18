import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { SubscriptionService } from '../lib/subscriptionService';
import type { SubscriptionPlan } from '../lib/subscriptionService';
import { supabase } from '../lib/supabase';
import { FeatureAccessService } from '../lib/featureAccess';
import type { Feature, UsageLimit } from '../lib/featureAccess';
import {
  Crown,
  Star,
  Zap,
  Check,
  Clock,
  Calendar,
  CreditCard,
  Gift,
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface SubscriptionInfo {
  planType: string;
  planName?: string;
  isActive: boolean;
  isTrial: boolean;
  daysRemaining?: number;
  expiresAt?: string;
}

const SubscriptionPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [userFeatures, setUserFeatures] = useState<Feature[]>([]);
  const [userLimits, setUserLimits] = useState<Record<UsageLimit, number>>({} as Record<UsageLimit, number>);
  const [canStartTrial, setCanStartTrial] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showTransactions, setShowTransactions] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadSubscriptionData();
      loadTransactions();
    }
  }, [user?.id]);

  const loadSubscriptionData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // تحميل معلومات الاشتراك الحالي
      const info = await FeatureAccessService.getCurrentSubscriptionInfo(user.id);
      setSubscriptionInfo(info);

      // تحميل الخطط المتاحة
      const plans = await SubscriptionService.getAvailablePlans();
      setAvailablePlans(plans);

      // تحميل المميزات والحدود الحالية
      const features = await FeatureAccessService.getUserFeatures(user.id);
      setUserFeatures(features);

      const limits = await FeatureAccessService.getUserLimits(user.id);
      setUserLimits(limits);

      // التحقق من إمكانية بدء الفترة التجريبية
      const canTrial = await FeatureAccessService.canStartTrial(user.id);
      setCanStartTrial(canTrial);

    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          plan:subscription_plans(name, name_en)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const handleStartTrial = async () => {
    if (!user?.id || startingTrial) return;

    try {
      setStartingTrial(true);
      const result = await SubscriptionService.startTrialPeriod(user.id);

      if (result.success) {
        // إعادة تحميل البيانات
        await loadSubscriptionData();
        alert(t('subscription.trial.started'));
      } else {
        alert(result.error || t('subscription.trial.error'));
      }
    } catch (error) {
      console.error('Error starting trial:', error);
      alert(t('subscription.trial.error'));
    } finally {
      setStartingTrial(false);
    }
  };

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (!user?.id) {
      navigate('/login');
      return;
    }

    try {
      // إذا كانت الباقة تدعم الفترة التجريبية ولم يستخدمها المستخدم من قبل
      if (plan.trial_enabled && canStartTrial) {
        setStartingTrial(true);
        const result = await SubscriptionService.startTrialPeriod(user.id, plan.id);

        if (result.success) {
          navigate('/subscription/success?trial=true');
        } else {
          alert(result.error || 'فشل في بدء الفترة التجريبية');
        }
        setStartingTrial(false);
      } else {
        // توجيه لصفحة الدفع
        navigate(`/payment?plan=${plan.id}`);
      }
    } catch (error) {
      console.error('Error selecting plan:', error);
      alert('حدث خطأ في اختيار الباقة');
      setStartingTrial(false);
    }
  };

  const getPlanIcon = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes('vip')) return Crown;
    if (name.includes('premium') || name.includes('مميزة')) return Star;
    if (name.includes('basic') || name.includes('أساسية')) return Zap;
    return Gift;
  };

  const getPlanColor = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes('vip')) return 'from-purple-600 to-pink-600';
    if (name.includes('premium') || name.includes('مميزة')) return 'from-blue-600 to-indigo-600';
    if (name.includes('basic') || name.includes('أساسية')) return 'from-green-600 to-emerald-600';
    return 'from-gray-600 to-slate-600';
  };

  const formatFeatureName = (feature: string): string => {
    const featureDefinition = SubscriptionService.getFeatureDefinition(feature);
    if (featureDefinition) {
      return i18n.language === 'ar' ? featureDefinition.name_ar : featureDefinition.name_en;
    }
    return feature;
  };

  const getPaymentMethodName = (method: string): string => {
    const methods: Record<string, string> = {
      'mada': 'مدى',
      'visa_mastercard': 'فيزا/ماستركارد',
      'stc_pay': 'STC Pay',
      'apple_pay': 'Apple Pay',
      'bank_transfer': 'تحويل بنكي',
      'credit_card': 'بطاقة ائتمانية'
    };
    return methods[method] || method;
  };

  const getStatusName = (status: string): string => {
    const statuses: Record<string, string> = {
      'completed': 'مكتمل',
      'pending': 'معلق',
      'failed': 'فاشل',
      'refunded': 'مسترد',
      'cancelled': 'ملغي'
    };
    return statuses[status] || status;
  };

  const formatLimitName = (limit: string): string => {
    const limitNames: Record<string, { ar: string; en: string }> = {
      'messages_per_month': { ar: 'رسائل شهرياً', en: 'Messages per month' },
      'profile_views_per_day': { ar: 'مشاهدات يومياً', en: 'Profile views per day' },
      'search_results_per_day': { ar: 'نتائج بحث يومياً', en: 'Search results per day' },
      'likes_per_day': { ar: 'إعجابات يومياً', en: 'Likes per day' }
    };

    return i18n.language === 'ar' ? limitNames[limit]?.ar || limit : limitNames[limit]?.en || limit;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-slate-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">
            {t('subscription.title', 'إدارة الاشتراك')}
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            {t('subscription.subtitle', 'اختر الباقة المناسبة لك واستمتع بجميع المميزات')}
          </p>
        </div>

        {/* Current Subscription Status */}
        {subscriptionInfo && (
          <div className="max-w-4xl mx-auto mb-12">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800">
                  {t('subscription.current.title', 'اشتراكك الحالي')}
                </h2>
                {subscriptionInfo.isActive && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full">
                    <Check className="w-4 h-4" />
                    <span className="font-medium">
                      {subscriptionInfo.isTrial ? t('subscription.status.trial', 'فترة تجريبية') : t('subscription.status.active', 'نشط')}
                    </span>
                  </div>
                )}
              </div>

              {subscriptionInfo.isActive ? (
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Plan Info */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      {subscriptionInfo.planName && (
                        <>
                          {React.createElement(getPlanIcon(subscriptionInfo.planName), {
                            className: "w-8 h-8 text-primary-600"
                          })}
                          <div>
                            <h3 className="text-xl font-bold text-slate-800">
                              {subscriptionInfo.planName}
                            </h3>
                            {subscriptionInfo.isTrial && subscriptionInfo.daysRemaining !== undefined && (
                              <p className="text-sm text-orange-600 flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {t('subscription.trial.remaining', 'متبقي {{days}} أيام', { days: subscriptionInfo.daysRemaining })}
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Features */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-slate-700 mb-3">
                        {t('subscription.features.title', 'المميزات المتاحة')}
                      </h4>
                      <div className="space-y-2">
                        {userFeatures.slice(0, 5).map((feature) => (
                          <div key={feature} className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-slate-600">
                              {formatFeatureName(feature)}
                            </span>
                          </div>
                        ))}
                        {userFeatures.length > 5 && (
                          <p className="text-sm text-slate-500">
                            {t('subscription.features.more', 'و {{count}} مميزات أخرى', { count: userFeatures.length - 5 })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Usage Limits */}
                  <div>
                    <h4 className="font-semibold text-slate-700 mb-3">
                      {t('subscription.limits.title', 'حدود الاستخدام')}
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(userLimits).map(([limit, value]) => (
                        <div key={limit} className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">
                            {formatLimitName(limit as UsageLimit)}
                          </span>
                          <span className="font-medium text-slate-800">
                            {value === -1 ? t('subscription.unlimited', 'غير محدود') : value}
                          </span>
                        </div>
                      ))}
                    </div>

                    {subscriptionInfo.expiresAt && !subscriptionInfo.isTrial && (
                      <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm">
                            {t('subscription.expires', 'ينتهي في')} {new Date(subscriptionInfo.expiresAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">
                    {t('subscription.noActive.title', 'لا يوجد اشتراك نشط')}
                  </h3>
                  <p className="text-slate-600 mb-6">
                    {t('subscription.noActive.description', 'اختر إحدى الباقات أدناه للاستمتاع بجميع المميزات')}
                  </p>

                  {canStartTrial && (
                    <button
                      onClick={handleStartTrial}
                      disabled={startingTrial}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50"
                    >
                      {startingTrial ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          {t('subscription.trial.starting', 'جاري البدء...')}
                        </>
                      ) : (
                        <>
                          <Gift className="w-5 h-5" />
                          {t('subscription.trial.start', 'ابدأ الفترة التجريبية المجانية')}
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Available Plans */}
        <div className="max-w-6xl mx-auto mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">
              {t('subscription.plans.title', 'الباقات المتاحة')}
            </h2>
            <p className="text-slate-600">
              {t('subscription.plans.subtitle', 'اختر الباقة التي تناسب احتياجاتك')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {availablePlans.map((plan) => {
              const Icon = getPlanIcon(plan.name);
              const isCurrentPlan = subscriptionInfo?.planName === plan.name;

              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-2xl shadow-xl p-8 border-2 transition-all duration-300 hover:shadow-2xl flex flex-col h-full ${
                    isCurrentPlan ? 'border-primary-500 ring-4 ring-primary-100' : 'border-slate-200 hover:border-primary-300'
                  }`}
                >
                  {/* Popular Badge */}
                  {plan.name.includes('مميزة') || plan.name.includes('Premium') && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-white px-6 py-2 rounded-full text-sm font-bold">
                        {t('subscription.popular', 'الأكثر شعبية')}
                      </div>
                    </div>
                  )}

                  <div className="flex-grow flex flex-col">
                    {/* Plan Header */}
                    <div className="text-center mb-8">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${getPlanColor(plan.name)} mb-4`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-800 mb-2">
                        {i18n.language === 'ar' ? plan.name : plan.name_en}
                      </h3>
                      <div className="text-4xl font-bold text-primary-600 mb-2">
                        {plan.price} {plan.currency}
                        <span className="text-lg text-slate-600 font-normal">
                          /{t('subscription.period.monthly', 'شهر')}
                        </span>
                      </div>
                      <p className="text-slate-600">
                        {i18n.language === 'ar' ? plan.description : plan.description_en}
                      </p>
                    </div>

                    {/* Plan Features */}
                    <div className="mb-8 flex-grow">
                      <ul className="space-y-3">
                        {SubscriptionService.extractActiveFeatures(plan.features || {}).map((featureKey) => (
                          <li key={featureKey} className="flex items-center gap-3">
                            <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <span className="text-slate-600">
                              {formatFeatureName(featureKey)}
                            </span>
                          </li>
                        ))}
                        {SubscriptionService.extractActiveFeatures(plan.features || {}).length === 0 && (
                          <li className="flex items-center gap-3 text-slate-400">
                            <Check className="w-5 h-5 flex-shrink-0" />
                            <span>لا توجد مميزات محددة</span>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full py-4 rounded-xl font-bold transition-all duration-300 ${
                      isCurrentPlan
                        ? 'bg-slate-100 text-slate-600 cursor-default'
                        : `bg-gradient-to-r ${getPlanColor(plan.name)} text-white hover:shadow-lg transform hover:-translate-y-1`
                    }`}
                    disabled={isCurrentPlan}
                  >
                    {isCurrentPlan ? (
                      <span className="flex items-center justify-center gap-2">
                        <Check className="w-5 h-5" />
                        {t('subscription.current.badge', 'باقتك الحالية')}
                      </span>
                    ) : plan.trial_enabled && canStartTrial ? (
                      <span className="flex items-center justify-center gap-2">
                        <Gift className="w-5 h-5" />
                        {i18n.language === 'ar'
                          ? `فترة تجريبية ${plan.trial_days} أيام مجاناً`
                          : `${plan.trial_days} Days Free Trial`
                        }
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        {t('subscription.choose', 'اختر هذه الباقة')}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transaction History Section */}
        {subscriptionInfo && (
          <div className="w-full max-w-none">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="px-6 py-6 border-b border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold text-slate-800">
                    {t('subscription.transactions.title', 'سجل المعاملات')}
                  </h2>
                  <button
                    onClick={() => setShowTransactions(!showTransactions)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors w-full sm:w-auto"
                  >
                    <CreditCard className="w-4 h-4" />
                    {showTransactions ? 'إخفاء السجل' : 'عرض السجل'}
                  </button>
                </div>
              </div>

            {showTransactions && (
              <div className="w-full">
                {transactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full divide-y divide-slate-200" style={{minWidth: '800px'}}>
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                            التاريخ
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                            الباقة
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                            المبلغ
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                            طريقة الدفع
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                            الحالة
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                            المرجع
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {transactions.map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                              <div className="font-medium">
                                {new Date(transaction.created_at).toLocaleDateString('en-GB')}
                              </div>
                              <div className="text-xs text-slate-500 sm:hidden">
                                {new Date(transaction.created_at).toLocaleTimeString('en-GB', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                              <div className="font-medium">
                                {i18n.language === 'ar' ? transaction.plan?.name : transaction.plan?.name_en}
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                              <div className="text-primary-600">
                                {transaction.amount} {transaction.currency}
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                              <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-slate-400" />
                                {getPaymentMethodName(transaction.payment_method)}
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${
                                transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                                transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                transaction.status === 'failed' ? 'bg-red-100 text-red-800' :
                                'bg-slate-100 text-slate-800'
                              }`}>
                                {getStatusName(transaction.status)}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                              <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">
                                {transaction.reference || '-'}
                              </code>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 px-6">
                    <div className="max-w-sm mx-auto">
                      <CreditCard className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                      <h3 className="text-lg font-medium text-slate-900 mb-2">
                        لا توجد معاملات
                      </h3>
                      <p className="text-slate-500">
                        {t('subscription.transactions.empty', 'لم تقم بأي معاملات دفع حتى الآن')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="max-w-4xl mx-auto mt-16 text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
            <Sparkles className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-slate-800 mb-4">
              {t('subscription.help.title', 'تحتاج مساعدة؟')}
            </h3>
            <p className="text-slate-600 mb-6">
              {t('subscription.help.description', 'فريق الدعم متاح لمساعدتك في اختيار الباقة المناسبة')}
            </p>
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-semibold hover:from-primary-700 hover:to-primary-800 transition-all duration-300">
              {t('subscription.help.contact', 'تواصل مع الدعم')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;
