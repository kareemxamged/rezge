import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CreditCard,
  Shield,
  Check,
  ArrowRight,
  ArrowLeft,
  Gift,
  Tag,
  AlertCircle,
  Loader2,
  Smartphone,
  Building2,
  Wallet,
  Apple
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './ToastContainer';
import { SubscriptionService } from '../lib/subscriptionService';

interface SubscriptionPlan {
  id: string;
  name: string;
  name_en: string;
  price: number;
  currency: string;
  billing_period: string;
  features: Record<string, any>;
  limits: Record<string, any>;
  is_active: boolean;
  trial_enabled: boolean;
  trial_days: number;
  discount_percentage?: number;
  discount_expires_at?: string;
}

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number;
  used_count: number;
  expires_at: string;
  is_active: boolean;
}

const EnhancedPaymentPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();
  const isRTL = i18n.language === 'ar';

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'mada' | 'visa_mastercard' | 'stc_pay' | 'apple_pay' | 'bank_transfer'>('mada');

  const planId = searchParams.get('plan');

  // خيارات الدفع المتوافقة مع السعودية
  const paymentMethods = [
    {
      id: 'mada',
      name: 'مدى',
      nameEn: 'mada',
      icon: <CreditCard className="w-5 h-5" />,
      description: 'بطاقة مدى السعودية',
      fees: 0,
      popular: true
    },
    {
      id: 'visa_mastercard',
      name: 'فيزا / ماستركارد',
      nameEn: 'Visa/Mastercard',
      icon: <CreditCard className="w-5 h-5" />,
      description: 'البطاقات الائتمانية الدولية',
      fees: 2.9
    },
    {
      id: 'stc_pay',
      name: 'STC Pay',
      nameEn: 'STC Pay',
      icon: <Smartphone className="w-5 h-5" />,
      description: 'محفظة STC Pay الرقمية',
      fees: 0
    },
    {
      id: 'apple_pay',
      name: 'Apple Pay',
      nameEn: 'Apple Pay',
      icon: <Apple className="w-5 h-5" />,
      description: 'الدفع عبر Apple Pay',
      fees: 0
    },
    {
      id: 'bank_transfer',
      name: 'تحويل بنكي',
      nameEn: 'Bank Transfer',
      icon: <Building2 className="w-5 h-5" />,
      description: 'تحويل مباشر من البنك',
      fees: 0
    }
  ];

  useEffect(() => {
    if (planId) {
      loadPlan();
    } else {
      navigate('/subscription');
    }
  }, [planId]);

  const loadPlan = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      setSelectedPlan(data);
    } catch (error) {
      console.error('Error loading plan:', error);
      navigate('/subscription');
    } finally {
      setLoading(false);
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;

    try {
      setCouponError('');
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        const errorMsg = 'كود الكوبون غير صحيح أو منتهي الصلاحية';
        setCouponError(errorMsg);
        showError('كوبون غير صالح', errorMsg);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        const errorMsg = 'كود الكوبون منتهي الصلاحية';
        setCouponError(errorMsg);
        showError('كوبون منتهي الصلاحية', errorMsg);
        return;
      }

      if (data.used_count >= data.max_uses) {
        const errorMsg = 'تم استنفاد عدد استخدامات هذا الكوبون';
        setCouponError(errorMsg);
        showWarning('كوبون مستنفد', errorMsg);
        return;
      }

      setAppliedCoupon(data);
      setCouponError('');

      // حساب قيمة الخصم
      const discountAmount = data.discount_type === 'percentage'
        ? (selectedPlan!.price * data.discount_value) / 100
        : data.discount_value;

      showSuccess(
        'تم تطبيق الكوبون بنجاح',
        `تم تطبيق خصم ${data.discount_type === 'percentage' ? `${data.discount_value}%` : `${discountAmount} ريال`}`
      );
    } catch (error) {
      console.error('Error applying coupon:', error);
      const errorMsg = 'حدث خطأ في تطبيق الكوبون';
      setCouponError(errorMsg);
      showError('خطأ في النظام', errorMsg);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
    showSuccess('تم إلغاء الكوبون', 'تم إلغاء تطبيق كوبون الخصم');
  };

  const calculateTotal = () => {
    if (!selectedPlan) return 0;

    let total = selectedPlan.price;

    // تطبيق خصم الباقة
    if (selectedPlan.discount_percentage && selectedPlan.discount_expires_at) {
      if (new Date(selectedPlan.discount_expires_at) > new Date()) {
        total = total * (1 - selectedPlan.discount_percentage / 100);
      }
    }

    // تطبيق كوبون الخصم
    if (appliedCoupon) {
      if (appliedCoupon.discount_type === 'percentage') {
        total = total * (1 - appliedCoupon.discount_value / 100);
      } else {
        total = Math.max(0, total - appliedCoupon.discount_value);
      }
    }

    return Math.round(total * 100) / 100;
  };

  const calculateFees = () => {
    const method = paymentMethods.find(m => m.id === paymentMethod);
    if (!method || method.fees === 0) return 0;
    
    const subtotal = calculateTotal();
    return Math.round(subtotal * (method.fees / 100) * 100) / 100;
  };

  const getFinalTotal = () => {
    return calculateTotal() + calculateFees();
  };

  const handlePayment = async () => {
    if (!selectedPlan || !user) return;

    try {
      setProcessing(true);

      const finalAmount = getFinalTotal();
      const fees = calculateFees();

      // إنشاء سجل الدفع
      const paymentData = {
        user_id: user.id,
        plan_id: selectedPlan.id,
        amount: finalAmount,
        original_amount: selectedPlan.price,
        discount_amount: selectedPlan.price - calculateTotal(),
        fees_amount: fees,
        currency: selectedPlan.currency,
        payment_method: paymentMethod,
        status: 'pending',
        coupon_id: appliedCoupon?.id || null
      };

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert(paymentData)
        .select()
        .single();

      if (paymentError) throw paymentError;

      // محاكاة عملية الدفع (في التطبيق الحقيقي، ستتم هنا عملية الدفع الفعلية)
      await processPayment(payment.id, paymentMethod, finalAmount);

      // تحديث حالة الدفع إلى مكتمل
      const { error: updateError } = await supabase
        .from('payments')
        .update({ 
          status: 'completed',
          reference: `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        })
        .eq('id', payment.id);

      if (updateError) throw updateError;

      // إنشاء الاشتراك
      const subscriptionData = {
        user_id: user.id,
        plan_id: selectedPlan.id,
        status: 'active',
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        amount_paid: finalAmount,
        payment_method: paymentMethod,
        is_trial: false
      };

      const { error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .insert(subscriptionData);

      if (subscriptionError) throw subscriptionError;

      // تحديث استخدام الكوبون
      if (appliedCoupon) {
        await supabase
          .from('coupons')
          .update({ used_count: appliedCoupon.used_count + 1 })
          .eq('id', appliedCoupon.id);
      }

      // التوجيه لصفحة النجاح
      navigate('/subscription?success=true');

    } catch (error) {
      console.error('Error processing payment:', error);
      alert('حدث خطأ في معالجة الدفع. يرجى المحاولة مرة أخرى.');
    } finally {
      setProcessing(false);
    }
  };

  const processPayment = async (paymentId: string, method: string, amount: number) => {
    // محاكاة عملية الدفع حسب الطريقة المختارة
    switch (method) {
      case 'mada':
      case 'visa_mastercard':
        // محاكاة دفع بالبطاقة
        await new Promise(resolve => setTimeout(resolve, 3000));
        break;
      case 'stc_pay':
        // محاكاة دفع STC Pay
        await new Promise(resolve => setTimeout(resolve, 2000));
        break;
      case 'apple_pay':
        // محاكاة Apple Pay
        await new Promise(resolve => setTimeout(resolve, 1500));
        break;
      case 'bank_transfer':
        // محاكاة تحويل بنكي
        await new Promise(resolve => setTimeout(resolve, 1000));
        break;
      default:
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!selectedPlan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">باقة غير موجودة</h2>
          <p className="text-slate-600 mb-4">لم يتم العثور على الباقة المطلوبة</p>
          <button
            onClick={() => navigate('/subscription')}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
          >
            العودة للباقات
          </button>
        </div>
      </div>
    );
  }

  const originalPrice = selectedPlan.price;
  const subtotal = calculateTotal();
  const fees = calculateFees();
  const finalTotal = getFinalTotal();
  const totalDiscount = originalPrice - subtotal;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">إتمام الدفع</h1>
          <p className="text-slate-600">أكمل عملية الاشتراك في الباقة المختارة</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Plan Summary */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">ملخص الباقة</h2>
            
            <div className="border-2 border-primary-200 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-primary-600 mb-2">
                {i18n.language === 'ar' ? selectedPlan.name : selectedPlan.name_en}
              </h3>
              <div className="text-3xl font-bold text-slate-800 mb-4">
                {originalPrice} {selectedPlan.currency}
                <span className="text-lg text-slate-600 font-normal">/شهر</span>
              </div>

              {/* Plan Features */}
              <div className="space-y-2">
                {SubscriptionService.extractActiveFeatures(selectedPlan.features || {}).slice(0, 5).map((featureKey) => (
                  <div key={featureKey} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-slate-600 text-sm">
                      {SubscriptionService.getFeatureName(featureKey, 'ar')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Coupon Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-3">كوبون الخصم</h3>
              {!appliedCoupon ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="أدخل كود الكوبون"
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    onClick={applyCoupon}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    تطبيق
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Tag className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">{appliedCoupon.code}</span>
                    <span className="text-green-600">
                      (-{appliedCoupon.discount_type === 'percentage' 
                        ? `${appliedCoupon.discount_value}%` 
                        : `${appliedCoupon.discount_value} ${selectedPlan.currency}`})
                    </span>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    إزالة
                  </button>
                </div>
              )}
              {couponError && (
                <p className="text-red-600 text-sm mt-2">{couponError}</p>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="border-t border-slate-200 pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-600">السعر الأصلي:</span>
                <span className="text-slate-800">{originalPrice} {selectedPlan.currency}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-green-600">إجمالي الخصم:</span>
                  <span className="text-green-600">-{totalDiscount.toFixed(2)} {selectedPlan.currency}</span>
                </div>
              )}
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-600">المجموع الفرعي:</span>
                <span className="text-slate-800">{subtotal.toFixed(2)} {selectedPlan.currency}</span>
              </div>
              {fees > 0 && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-600">رسوم المعالجة:</span>
                  <span className="text-slate-800">{fees.toFixed(2)} {selectedPlan.currency}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xl font-bold border-t border-slate-200 pt-2">
                <span>المجموع النهائي:</span>
                <span className="text-primary-600">{finalTotal.toFixed(2)} {selectedPlan.currency}</span>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">معلومات الدفع</h2>

            {/* Payment Methods */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">اختر طريقة الدفع</h3>
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <label
                    key={method.id}
                    className={`relative flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      paymentMethod === method.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={paymentMethod === method.id}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="sr-only"
                    />

                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === method.id
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-slate-300'
                    }`}>
                      {paymentMethod === method.id && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${
                        paymentMethod === method.id ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {method.icon}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{method.name}</span>
                          {method.popular && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              الأكثر استخداماً
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">{method.description}</p>
                        {method.fees > 0 && (
                          <p className="text-xs text-orange-600 mt-1">
                            رسوم إضافية: {method.fees}%
                          </p>
                        )}
                      </div>
                    </div>

                    {paymentMethod === method.id && (
                      <div className="absolute top-2 left-2">
                        <Check className="w-5 h-5 text-primary-600" />
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Payment Details */}
            {(paymentMethod === 'mada' || paymentMethod === 'visa_mastercard') && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">معلومات البطاقة</h4>
                <p className="text-blue-800 text-sm">
                  سيتم توجيهك لصفحة الدفع الآمنة لإدخال بيانات البطاقة
                </p>
              </div>
            )}

            {paymentMethod === 'stc_pay' && (
              <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="font-semibold text-purple-900 mb-2">STC Pay</h4>
                <p className="text-purple-800 text-sm">
                  سيتم إرسال طلب دفع لتطبيق STC Pay على جهازك
                </p>
              </div>
            )}

            {paymentMethod === 'apple_pay' && (
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Apple Pay</h4>
                <p className="text-gray-800 text-sm">
                  استخدم Touch ID أو Face ID لإتمام الدفع بأمان
                </p>
              </div>
            )}

            {paymentMethod === 'bank_transfer' && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">التحويل البنكي</h4>
                <p className="text-green-800 text-sm">
                  سيتم عرض تفاصيل الحساب البنكي لإتمام التحويل
                </p>
              </div>
            )}

            {/* Security Notice */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-slate-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-800 mb-1">دفع آمن ومحمي</h4>
                  <ul className="text-slate-600 text-sm space-y-1">
                    <li>• جميع المعاملات محمية بتشفير SSL 256-bit</li>
                    <li>• متوافق مع معايير PCI DSS</li>
                    <li>• معتمد من البنك المركزي السعودي</li>
                    <li>• لا نحتفظ ببيانات البطاقات الائتمانية</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 mt-1"
                  required
                />
                <span className="text-sm text-slate-600">
                  أوافق على{' '}
                  <a href="/terms" className="text-primary-600 hover:text-primary-700 underline">
                    الشروط والأحكام
                  </a>{' '}
                  و{' '}
                  <a href="/privacy" className="text-primary-600 hover:text-primary-700 underline">
                    سياسة الخصوصية
                  </a>
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/subscription')}
                className="flex-1 py-3 px-6 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                العودة
              </button>
              <button
                onClick={handlePayment}
                disabled={processing}
                className="flex-1 py-3 px-6 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    دفع {finalTotal.toFixed(2)} {selectedPlan.currency}
                    {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedPaymentPage;
