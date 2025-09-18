import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SubscriptionService } from '../lib/subscriptionService';
import { supabase } from '../lib/supabase';
import {
  CheckCircle,
  Crown,
  Star,
  Zap,
  ArrowRight,
  Calendar,
  CreditCard,
  Gift,
  Loader2,
  Clock,
  Building2
} from 'lucide-react';

interface SubscriptionDetails {
  id: string;
  planName: string;
  planNameEn: string;
  price: number;
  currency: string;
  startDate: string;
  expiryDate: string;
  paymentReference?: string;
  isTrial: boolean;
}

const PaymentSuccessPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isRTL = i18n.language === 'ar';

  const [loading, setLoading] = useState(true);
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadSubscriptionDetails();
  }, []);

  const loadSubscriptionDetails = async () => {
    try {
      setLoading(true);

      const paymentId = searchParams.get('payment');
      const subscriptionId = searchParams.get('subscription');
      const isBankTransfer = searchParams.get('bank_transfer') === 'true';
      const isTrial = searchParams.get('trial') === 'true';

      if (!user?.id) {
        navigate('/login');
        return;
      }

      // معالجة التحويل البنكي
      if (isBankTransfer) {
        setSubscriptionDetails({
          id: 'bank_transfer_pending',
          planName: 'في انتظار التحويل البنكي',
          planNameEn: 'Pending Bank Transfer',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending_verification',
          paymentMethod: 'تحويل بنكي',
          amount: 0,
          currency: 'SAR',
          isTrial: false
        });
        setLoading(false);
        return;
      }

      // الحصول على تفاصيل الاشتراك الحالي
      const status = await SubscriptionService.getUserSubscriptionStatus(user.id);
      
      if (status.hasActiveSubscription && status.currentSubscription) {
        const sub = status.currentSubscription;
        setSubscriptionDetails({
          id: sub.id,
          planName: sub.plan_name || 'باقة غير محددة',
          planNameEn: sub.plan_name || 'Unknown Plan',
          price: 0, // سيتم تحديثه من بيانات الباقة
          currency: 'SAR',
          startDate: sub.started_at,
          expiryDate: sub.expires_at,
          paymentReference: paymentId || undefined,
          isTrial: sub.is_trial || false
        });
      } else if (status.hasActiveTrial && status.currentTrial) {
        const trial = status.currentTrial;
        setSubscriptionDetails({
          id: trial.trial_id,
          planName: trial.plan_name || 'فترة تجريبية',
          planNameEn: trial.plan_name || 'Trial Period',
          price: 0,
          currency: 'SAR',
          startDate: trial.started_at,
          expiryDate: trial.expires_at,
          isTrial: true
        });
      } else {
        setError('لم يتم العثور على اشتراك نشط');
      }

    } catch (error) {
      console.error('Error loading subscription details:', error);
      setError('حدث خطأ في تحميل تفاصيل الاشتراك');
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-slate-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">حدث خطأ</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/subscription')}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            العودة للباقات
          </button>
        </div>
      </div>
    );
  }

  // معالجة التحويل البنكي
  if (subscriptionDetails?.status === 'pending_verification') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            {/* Bank Transfer Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building2 className="w-10 h-10 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-slate-800 mb-4">
                تم استلام طلب التحويل البنكي
              </h1>
              <p className="text-xl text-slate-600">
                سيتم تفعيل اشتراكك خلال 24 ساعة من استلام التحويل
              </p>
            </div>

            {/* Bank Transfer Status */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 mb-4">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">
                  في انتظار التحويل البنكي
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-200">
                  <span className="text-slate-600">حالة الطلب</span>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                    في انتظار التحويل
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-200">
                  <span className="text-slate-600">طريقة الدفع</span>
                  <span className="text-slate-800 font-medium">تحويل بنكي</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-200">
                  <span className="text-slate-600">وقت التفعيل المتوقع</span>
                  <span className="text-slate-800 font-medium">خلال 24 ساعة</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">الخطوات التالية:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• تأكد من إتمام التحويل البنكي بالمبلغ المحدد</li>
                  <li>• احتفظ بإيصال التحويل</li>
                  <li>• سنقوم بالتحقق من التحويل وتفعيل اشتراكك</li>
                  <li>• ستصلك رسالة تأكيد عند التفعيل</li>
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                الذهاب للوحة التحكم
                {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowRight className="w-5 h-5 rotate-180" />}
              </button>
              <button
                onClick={() => navigate('/subscription')}
                className="flex-1 py-3 px-6 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                عرض الباقات
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-4">
              {subscriptionDetails?.isTrial
                ? t('payment.success.trialTitle', 'تم تفعيل الفترة التجريبية!')
                : t('payment.success.title', 'تم الدفع بنجاح!')
              }
            </h1>
            <p className="text-xl text-slate-600">
              {subscriptionDetails?.isTrial
                ? t('payment.success.trialSubtitle', 'يمكنك الآن الاستمتاع بجميع مميزات الباقة مجاناً')
                : t('payment.success.subtitle', 'تم تفعيل اشتراكك بنجاح ويمكنك الآن الاستمتاع بجميع المميزات')
              }
            </p>
          </div>

          {/* Subscription Details */}
          {subscriptionDetails && (
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <div className="text-center mb-6">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${getPlanColor(subscriptionDetails.planName)} mb-4`}>
                  {React.createElement(getPlanIcon(subscriptionDetails.planName), {
                    className: "w-8 h-8 text-white"
                  })}
                </div>
                <h3 className="text-2xl font-bold text-slate-800">
                  {isRTL ? subscriptionDetails.planName : subscriptionDetails.planNameEn}
                </h3>
                {subscriptionDetails.isTrial && (
                  <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                    {t('subscription.trial', 'فترة تجريبية')}
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-slate-500" />
                    <span className="text-slate-600">{t('subscription.startDate', 'تاريخ البدء')}</span>
                  </div>
                  <span className="font-medium text-slate-800">
                    {new Date(subscriptionDetails.startDate).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-slate-500" />
                    <span className="text-slate-600">
                      {subscriptionDetails.isTrial 
                        ? t('subscription.trialExpiry', 'تنتهي الفترة التجريبية في')
                        : t('subscription.expiryDate', 'تاريخ الانتهاء')
                      }
                    </span>
                  </div>
                  <span className="font-medium text-slate-800">
                    {new Date(subscriptionDetails.expiryDate).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                  </span>
                </div>

                {!subscriptionDetails.isTrial && subscriptionDetails.price > 0 && (
                  <div className="flex items-center justify-between py-3 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-slate-500" />
                      <span className="text-slate-600">{t('payment.amount', 'المبلغ المدفوع')}</span>
                    </div>
                    <span className="font-medium text-slate-800">
                      {subscriptionDetails.price} {subscriptionDetails.currency}
                    </span>
                  </div>
                )}

                {subscriptionDetails.paymentReference && (
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-slate-500" />
                      <span className="text-slate-600">{t('payment.reference', 'مرجع الدفعة')}</span>
                    </div>
                    <span className="font-mono text-sm text-slate-800">
                      {subscriptionDetails.paymentReference}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
            <h4 className="text-lg font-semibold text-blue-900 mb-4">
              {t('payment.success.nextSteps', 'الخطوات التالية')}
            </h4>
            <ul className="space-y-2 text-blue-800">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span>{t('payment.success.step1', 'يمكنك الآن الوصول لجميع مميزات الباقة')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span>{t('payment.success.step2', 'ابدأ في البحث والتواصل مع الأعضاء')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span>{t('payment.success.step3', 'يمكنك إدارة اشتراكك من صفحة الاشتراكات')}</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {t('payment.success.goToDashboard', 'الذهاب للوحة التحكم')}
              <ArrowRight className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => navigate('/subscription')}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-6 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {t('payment.success.manageSubscription', 'إدارة الاشتراك')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
