import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SubscriptionService } from '../lib/subscriptionService';
import { PaymentService } from '../lib/paymentService';
import { PayTabsService } from '../lib/payTabsService';
import { supabase } from '../lib/supabase';
import type { SubscriptionPlan } from '../lib/subscriptionService';
import type { PaymentMethod } from '../lib/paymentService';
import {
  CreditCard,
  Smartphone,
  Building2,
  Shield,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Copy,
  Check
} from 'lucide-react';

const PaymentPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isRTL = i18n.language === 'ar';

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [bankInfo, setBankInfo] = useState<any>(null);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    loadPaymentData();
  }, []);

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      
      // الحصول على معرف الباقة من URL
      const planId = searchParams.get('plan');
      if (!planId) {
        navigate('/subscription');
        return;
      }

      // تحميل بيانات الباقة
      const plans = await SubscriptionService.getAvailablePlans();
      const plan = plans.find(p => p.id === planId);
      
      if (!plan) {
        setError('الباقة المحددة غير موجودة');
        return;
      }

      setSelectedPlan(plan);

      // تحميل طرق الدفع المتاحة من PayTabs
      const payTabsMethods = PayTabsService.getSupportedPaymentMethods();
      const allMethods = [
        ...payTabsMethods.map(method => ({
          id: method.id,
          type: method.type,
          name: method.name,
          name_en: method.name_en,
          description: method.description,
          description_en: method.description_en,
          is_active: method.is_active,
          processing_fee: method.fees,
          min_amount: method.min_amount,
          max_amount: method.max_amount,
          icon: method.icon
        })),
        // إضافة التحويل البنكي
        {
          id: 'bank_transfer',
          type: 'bank_transfer' as const,
          name: 'تحويل بنكي',
          name_en: 'Bank Transfer',
          description: 'تحويل مباشر إلى الحساب البنكي',
          description_en: 'Direct transfer to bank account',
          is_active: true,
          processing_fee: 0,
          min_amount: 10,
          max_amount: 100000,
          icon: 'bank'
        }
      ];

      setPaymentMethods(allMethods.filter(method => method.is_active));

      // تحديد طريقة الدفع الافتراضية
      const activeMethods = allMethods.filter(method => method.is_active);
      if (activeMethods.length > 0) {
        setSelectedPaymentMethod(activeMethods[0].id);
      }

      // تحميل معلومات البنك للتحويل البنكي
      await loadBankInfo();

    } catch (error) {
      console.error('Error loading payment data:', error);
      setError('حدث خطأ في تحميل بيانات الدفع');
    } finally {
      setLoading(false);
    }
  };

  const loadBankInfo = async () => {
    try {
      // تحميل معلومات البنك من إعدادات النظام
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'bank_account_info')
        .single();

      if (!error && data) {
        setBankInfo(data.setting_value);
      } else {
        // معلومات افتراضية في حالة عدم وجود إعدادات
        setBankInfo({
          bank_name: 'البنك الأهلي السعودي',
          bank_name_en: 'National Commercial Bank',
          account_name: 'شركة رزقي للتقنية',
          account_name_en: 'Rezge Technology Company',
          account_number: 'SA1234567890123456789012',
          iban: 'SA1234567890123456789012',
          swift_code: 'NCBKSARI',
          branch: 'الرياض الرئيسي',
          branch_en: 'Riyadh Main Branch'
        });
      }
    } catch (error) {
      console.error('Error loading bank info:', error);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(''), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handlePayment = async () => {
    if (!user?.id || !selectedPlan || !selectedPaymentMethod) return;

    try {
      setProcessing(true);
      setError('');

      // معالجة التحويل البنكي
      if (selectedPaymentMethod === 'bank_transfer') {
        // إنشاء سجل دفع للتحويل البنكي
        const paymentId = `bank_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            id: paymentId,
            user_id: user.id,
            plan_id: selectedPlan.id,
            amount: selectedPlan.price,
            currency: selectedPlan.currency,
            payment_method: 'bank_transfer',
            status: 'pending_verification',
            reference: `BANK_${Date.now()}`,
            metadata: {
              bank_info: bankInfo,
              instructions: 'في انتظار التحويل البنكي'
            }
          });

        if (paymentError) {
          setError('فشل في إنشاء طلب التحويل البنكي');
          return;
        }

        // عرض تفاصيل التحويل البنكي
        setShowBankDetails(true);
        return;
      }

      // للطرق الإلكترونية الأخرى - استخدام PayTabs
      const paymentRequest = {
        user_id: user.id,
        plan_id: selectedPlan.id,
        amount: selectedPlan.price,
        currency: selectedPlan.currency || 'SAR',
        payment_method: selectedPaymentMethod,
        customer_email: user.email,
        customer_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        return_url: `${window.location.origin}/subscription/success`,
        cancel_url: `${window.location.origin}/subscription/cancel`
      };

      const result = await PayTabsService.createPaymentRequest(paymentRequest);

      if (result.success) {
        if (result.requires_redirect && result.payment_url) {
          // إعادة توجيه لبوابة الدفع PayTabs
          window.location.href = result.payment_url;
        } else {
          // الدفع تم بنجاح مباشرة
          navigate('/subscription/success?payment=' + result.transaction_ref);
        }
      } else {
        setError(result.error || 'فشل في معالجة الدفع');
      }

    } catch (error) {
      console.error('Payment error:', error);
      setError('حدث خطأ في معالجة الدفع');
    } finally {
      setProcessing(false);
    }
  };

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case 'credit_card':
      case 'mada':
        return CreditCard;
      case 'stc_pay':
      case 'urpay':
        return Smartphone;
      case 'bank_transfer':
        return Building2;
      default:
        return CreditCard;
    }
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

  if (error && !selectedPlan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-4">
              {t('payment.title', 'إتمام الدفع')}
            </h1>
            <p className="text-slate-600">
              {t('payment.subtitle', 'اختر طريقة الدفع المناسبة لك')}
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Plan Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                  {t('payment.planSummary', 'ملخص الباقة')}
                </h3>
                
                {selectedPlan && (
                  <div className="space-y-4">
                    <div className="border-b border-slate-200 pb-4">
                      <h4 className="font-semibold text-slate-800">
                        {isRTL ? selectedPlan.name : selectedPlan.name_en}
                      </h4>
                      <p className="text-sm text-slate-600 mt-1">
                        {isRTL ? selectedPlan.description : selectedPlan.description_en}
                      </p>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">{t('payment.price', 'السعر')}</span>
                      <span className="text-xl font-bold text-primary-600">
                        {selectedPlan.price} {selectedPlan.currency}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">{t('payment.billingPeriod', 'فترة الفوترة')}</span>
                      <span className="text-slate-800">
                        {selectedPlan.billing_period === 'monthly' ? 'شهرياً' : selectedPlan.billing_period}
                      </span>
                    </div>

                    <div className="border-t border-slate-200 pt-4">
                      <div className="flex justify-between items-center font-semibold text-lg">
                        <span>{t('payment.total', 'المجموع')}</span>
                        <span className="text-primary-600">
                          {selectedPlan.price} {selectedPlan.currency}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-6">
                  {t('payment.selectMethod', 'اختر طريقة الدفع')}
                </h3>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <p className="text-red-800">{error}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-4 mb-8">
                  {paymentMethods.map((method) => {
                    const Icon = getPaymentMethodIcon(method.type);
                    return (
                      <label
                        key={method.id}
                        className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedPaymentMethod === method.id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.id}
                          checked={selectedPaymentMethod === method.id}
                          onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                          className="sr-only"
                        />
                        <div className="flex items-center gap-4">
                          <Icon className="w-6 h-6 text-slate-600" />
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-800">
                              {isRTL ? method.name : method.name_en}
                            </h4>
                            {method.description && (
                              <p className="text-sm text-slate-600">
                                {isRTL ? method.description : method.description_en}
                              </p>
                            )}
                          </div>
                          {method.processing_fee && method.processing_fee > 0 && (
                            <span className="text-sm text-slate-500">
                              +{method.processing_fee}% رسوم
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Security Notice */}
                <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-600" />
                    <p className="text-green-800 text-sm">
                      {t('payment.securityNotice', 'جميع المدفوعات محمية بتشفير SSL وآمنة بنسبة 100%')}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={() => navigate('/subscription')}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-6 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                    {t('common.back', 'رجوع')}
                  </button>
                  
                  <button
                    onClick={handlePayment}
                    disabled={processing || !selectedPaymentMethod}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t('payment.processing', 'جاري المعالجة...')}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        {t('payment.confirm', 'تأكيد الدفع')}
                      </>
                    )}
                  </button>
                </div>

                {/* Bank Transfer Details Modal */}
                {showBankDetails && selectedPaymentMethod === 'bank_transfer' && bankInfo && (
                  <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-blue-800">
                        تفاصيل التحويل البنكي
                      </h4>
                      <button
                        onClick={() => setShowBankDetails(false)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              اسم البنك
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={bankInfo.bank_name}
                                readOnly
                                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg"
                              />
                              <button
                                onClick={() => copyToClipboard(bankInfo.bank_name, 'bank_name')}
                                className="p-2 text-slate-500 hover:text-slate-700"
                              >
                                {copied === 'bank_name' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              اسم الحساب
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={bankInfo.account_name}
                                readOnly
                                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg"
                              />
                              <button
                                onClick={() => copyToClipboard(bankInfo.account_name, 'account_name')}
                                className="p-2 text-slate-500 hover:text-slate-700"
                              >
                                {copied === 'account_name' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              رقم الحساب / IBAN
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={bankInfo.iban}
                                readOnly
                                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                              />
                              <button
                                onClick={() => copyToClipboard(bankInfo.iban, 'iban')}
                                className="p-2 text-slate-500 hover:text-slate-700"
                              >
                                {copied === 'iban' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              رمز SWIFT
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={bankInfo.swift_code}
                                readOnly
                                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                              />
                              <button
                                onClick={() => copyToClipboard(bankInfo.swift_code, 'swift_code')}
                                className="p-2 text-slate-500 hover:text-slate-700"
                              >
                                {copied === 'swift_code' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              الفرع
                            </label>
                            <input
                              type="text"
                              value={bankInfo.branch}
                              readOnly
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              المبلغ المطلوب
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={`${selectedPlan?.price} ${selectedPlan?.currency}`}
                                readOnly
                                className="flex-1 px-3 py-2 bg-yellow-50 border border-yellow-300 rounded-lg font-bold text-lg"
                              />
                              <button
                                onClick={() => copyToClipboard(`${selectedPlan?.price}`, 'amount')}
                                className="p-2 text-slate-500 hover:text-slate-700"
                              >
                                {copied === 'amount' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h5 className="font-semibold text-yellow-800 mb-2">تعليمات مهمة:</h5>
                        <ul className="text-sm text-yellow-700 space-y-1">
                          <li>• قم بتحويل المبلغ المحدد بالضبط</li>
                          <li>• احتفظ بإيصال التحويل</li>
                          <li>• سيتم تفعيل اشتراكك خلال 24 ساعة من التحويل</li>
                          <li>• في حالة وجود أي استفسار، تواصل معنا</li>
                        </ul>
                      </div>

                      <div className="flex gap-4 mt-6">
                        <button
                          onClick={() => navigate('/subscription/success?bank_transfer=true')}
                          className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          تم التحويل - متابعة
                        </button>
                        <button
                          onClick={() => setShowBankDetails(false)}
                          className="flex-1 bg-slate-100 text-slate-700 py-3 px-6 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
