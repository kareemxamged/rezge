/**
 * خدمة PayTabs للدفع - محسنة للسعودية والدول العربية
 * تدعم جميع طرق الدفع الشائعة في المنطقة
 */

import { supabase } from './supabase';

// إعدادات PayTabs
const PAYTABS_SERVER_KEY = import.meta.env.VITE_PAYTABS_SERVER_KEY || 'SGJ9L6926W-JLNB9BBMKL-KMM9KWZTKN';
const PAYTABS_CLIENT_KEY = import.meta.env.VITE_PAYTABS_CLIENT_KEY || 'SGJ9L6926W-JLNB9BBMKL-KMM9KWZTKN';
const PAYTABS_PROFILE_ID = import.meta.env.VITE_PAYTABS_PROFILE_ID || 'CVK2D7-MD7T6B-Q2P22N-6NGTNB';
const PAYTABS_BASE_URL = 'https://secure.paytabs.sa/payment/request';

// أنواع البيانات
export interface PayTabsPaymentMethod {
  id: string;
  type: 'creditcard' | 'mada' | 'stcpay' | 'applepay' | 'bank_transfer';
  name: string;
  name_en: string;
  description: string;
  description_en: string;
  icon: string;
  fees: number;
  min_amount: number;
  max_amount: number;
  currencies: string[];
  countries: string[];
  is_active: boolean;
}

export interface PayTabsPaymentRequest {
  user_id: string;
  plan_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  customer_email: string;
  customer_name: string;
  customer_phone?: string;
  return_url?: string;
  cancel_url?: string;
  metadata?: Record<string, any>;
}

export interface PayTabsPaymentResponse {
  success: boolean;
  payment_url?: string;
  transaction_ref?: string;
  error?: string;
  requires_redirect?: boolean;
}

export class PayTabsService {
  /**
   * طرق الدفع المدعومة في PayTabs للسعودية والدول العربية
   */
  static getSupportedPaymentMethods(): PayTabsPaymentMethod[] {
    return [
      {
        id: 'creditcard',
        type: 'creditcard',
        name: 'البطاقات الائتمانية',
        name_en: 'Credit Cards',
        description: 'فيزا، ماستركارد',
        description_en: 'Visa, Mastercard',
        icon: 'credit-card',
        fees: 2.75,
        min_amount: 5,
        max_amount: 50000,
        currencies: ['SAR', 'USD', 'EUR', 'AED'],
        countries: ['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'EG', 'JO'],
        is_active: true
      },
      {
        id: 'mada',
        type: 'mada',
        name: 'مدى',
        name_en: 'Mada',
        description: 'بطاقة مدى السعودية',
        description_en: 'Saudi Mada Card',
        icon: 'credit-card',
        fees: 2.0,
        min_amount: 1,
        max_amount: 30000,
        currencies: ['SAR'],
        countries: ['SA'],
        is_active: true
      },
      {
        id: 'stcpay',
        type: 'stcpay',
        name: 'STC Pay',
        name_en: 'STC Pay',
        description: 'محفظة STC Pay الرقمية',
        description_en: 'STC Pay Digital Wallet',
        icon: 'smartphone',
        fees: 1.5,
        min_amount: 1,
        max_amount: 10000,
        currencies: ['SAR'],
        countries: ['SA'],
        is_active: true
      },
      {
        id: 'applepay',
        type: 'applepay',
        name: 'Apple Pay',
        name_en: 'Apple Pay',
        description: 'الدفع عبر Apple Pay',
        description_en: 'Pay with Apple Pay',
        icon: 'smartphone',
        fees: 2.75,
        min_amount: 5,
        max_amount: 50000,
        currencies: ['SAR', 'USD', 'AED'],
        countries: ['SA', 'AE', 'KW', 'QA', 'BH', 'OM'],
        is_active: true
      }
    ];
  }

  /**
   * إنشاء طلب دفع في PayTabs
   */
  static async createPaymentRequest(request: PayTabsPaymentRequest): Promise<PayTabsPaymentResponse> {
    try {
      // التحقق من صحة البيانات
      if (!request.user_id || !request.plan_id || !request.amount) {
        return {
          success: false,
          error: 'بيانات الدفع غير مكتملة'
        };
      }

      // إنشاء معرف فريد للمعاملة
      const transactionRef = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // إعداد بيانات الطلب لـ PayTabs
      const paymentData = {
        profile_id: PAYTABS_PROFILE_ID,
        tran_type: 'sale',
        tran_class: 'ecom',
        cart_id: transactionRef,
        cart_description: `اشتراك الباقة - ${request.plan_id}`,
        cart_currency: request.currency,
        cart_amount: request.amount,
        
        // بيانات العميل
        customer_details: {
          name: request.customer_name,
          email: request.customer_email,
          phone: request.customer_phone || '+966500000000',
          street1: 'الرياض',
          city: 'الرياض',
          state: 'الرياض',
          country: 'SA',
          zip: '12345'
        },

        // إعدادات الدفع
        payment_methods: [request.payment_method.toUpperCase()],
        
        // URLs للإرجاع
        return_url: request.return_url || `${window.location.origin}/subscription/success`,
        callback_url: `${window.location.origin}/api/paytabs/callback`,
        
        // بيانات إضافية
        user_defined: {
          user_id: request.user_id,
          plan_id: request.plan_id,
          ...request.metadata
        }
      };

      // إرسال الطلب إلى PayTabs
      const response = await fetch(PAYTABS_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': PAYTABS_SERVER_KEY
        },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        return {
          success: false,
          error: 'فشل في الاتصال بخدمة الدفع'
        };
      }

      const result = await response.json();

      if (result.redirect_url) {
        // حفظ معلومات الدفع في قاعدة البيانات
        await this.savePaymentRecord({
          transaction_ref: transactionRef,
          user_id: request.user_id,
          plan_id: request.plan_id,
          amount: request.amount,
          currency: request.currency,
          payment_method: request.payment_method,
          paytabs_tran_ref: result.tran_ref,
          status: 'pending'
        });

        return {
          success: true,
          payment_url: result.redirect_url,
          transaction_ref: transactionRef,
          requires_redirect: true
        };
      } else {
        return {
          success: false,
          error: result.result || 'فشل في إنشاء طلب الدفع'
        };
      }

    } catch (error) {
      console.error('Error creating PayTabs payment:', error);
      return {
        success: false,
        error: 'حدث خطأ غير متوقع'
      };
    }
  }

  /**
   * التحقق من حالة الدفع
   */
  static async verifyPayment(transactionRef: string): Promise<PayTabsPaymentResponse> {
    try {
      const verifyData = {
        profile_id: PAYTABS_PROFILE_ID,
        tran_ref: transactionRef
      };

      const response = await fetch('https://secure.paytabs.sa/payment/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': PAYTABS_SERVER_KEY
        },
        body: JSON.stringify(verifyData)
      });

      if (!response.ok) {
        return {
          success: false,
          error: 'فشل في التحقق من حالة الدفع'
        };
      }

      const result = await response.json();

      // تحديث حالة الدفع في قاعدة البيانات
      await this.updatePaymentStatus(transactionRef, result.payment_result?.response_status);

      return {
        success: result.payment_result?.response_status === 'A',
        transaction_ref: transactionRef
      };

    } catch (error) {
      console.error('Error verifying PayTabs payment:', error);
      return {
        success: false,
        error: 'حدث خطأ في التحقق من الدفع'
      };
    }
  }

  /**
   * حفظ سجل الدفع في قاعدة البيانات
   */
  private static async savePaymentRecord(paymentData: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('payments')
        .insert({
          id: paymentData.transaction_ref,
          user_id: paymentData.user_id,
          plan_id: paymentData.plan_id,
          amount: paymentData.amount,
          currency: paymentData.currency,
          payment_method: paymentData.payment_method,
          status: paymentData.status,
          reference: paymentData.paytabs_tran_ref,
          metadata: {
            paytabs_tran_ref: paymentData.paytabs_tran_ref,
            gateway: 'paytabs'
          }
        });

      if (error) {
        console.error('Error saving payment record:', error);
      }
    } catch (error) {
      console.error('Error in savePaymentRecord:', error);
    }
  }

  /**
   * تحديث حالة الدفع
   */
  private static async updatePaymentStatus(transactionRef: string, status: string): Promise<void> {
    try {
      const paymentStatus = status === 'A' ? 'completed' : 'failed';
      
      const { error } = await supabase
        .from('payments')
        .update({ 
          status: paymentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionRef);

      if (error) {
        console.error('Error updating payment status:', error);
      }

      // إنشاء الاشتراك إذا تم الدفع بنجاح
      if (paymentStatus === 'completed') {
        await this.createSubscriptionAfterPayment(transactionRef);
      }
    } catch (error) {
      console.error('Error in updatePaymentStatus:', error);
    }
  }

  /**
   * إنشاء الاشتراك بعد نجاح الدفع
   */
  private static async createSubscriptionAfterPayment(transactionRef: string): Promise<void> {
    try {
      // الحصول على بيانات الدفع
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', transactionRef)
        .single();

      if (paymentError || !payment) {
        console.error('Error fetching payment data:', paymentError);
        return;
      }

      // الحصول على بيانات الباقة
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', payment.plan_id)
        .single();

      if (planError || !plan) {
        console.error('Error fetching plan data:', planError);
        return;
      }

      // حساب تاريخ انتهاء الاشتراك
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.duration_days);

      // إنشاء الاشتراك
      const { error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: payment.user_id,
          plan_id: payment.plan_id,
          status: 'active',
          started_at: startDate.toISOString(),
          expires_at: endDate.toISOString(),
          amount_paid: payment.amount,
          payment_method: payment.payment_method,
          is_trial: false,
          auto_renew: true
        });

      if (subscriptionError) {
        console.error('Error creating subscription:', subscriptionError);
      }

    } catch (error) {
      console.error('Error in createSubscriptionAfterPayment:', error);
    }
  }

  /**
   * التحقق من دعم طريقة الدفع للدولة
   */
  static isPaymentMethodSupported(methodId: string, countryCode: string): boolean {
    const method = this.getSupportedPaymentMethods().find(m => m.id === methodId);
    return method ? method.countries.includes(countryCode) : false;
  }

  /**
   * الحصول على طرق الدفع المتاحة للدولة
   */
  static getAvailableMethodsForCountry(countryCode: string): PayTabsPaymentMethod[] {
    return this.getSupportedPaymentMethods().filter(method => 
      method.is_active && method.countries.includes(countryCode)
    );
  }
}

export default PayTabsService;
