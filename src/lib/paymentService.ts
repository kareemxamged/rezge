import { supabase } from './supabase';
import { PayTabsService } from './payTabsService';

// أنواع البيانات للدفع
export interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'bank_transfer' | 'mada' | 'apple_pay' | 'stc_pay' | 'urpay';
  name: string;
  name_en: string;
  description?: string;
  description_en?: string;
  is_active: boolean;
  processing_fee?: number;
  min_amount?: number;
  max_amount?: number;
  icon?: string;
}

export interface PaymentRequest {
  user_id: string;
  plan_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  return_url?: string;
  cancel_url?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  payment_id?: string;
  payment_url?: string;
  reference?: string;
  error?: string;
  requires_redirect?: boolean;
}

export interface PaymentStatus {
  id: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  amount: number;
  currency: string;
  payment_method: string;
  reference?: string;
  gateway_response?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export class PaymentService {
  /**
   * الحصول على طرق الدفع المتاحة
   */
  static async getAvailablePaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        console.error('Error fetching payment methods:', error);
        return this.getDefaultPaymentMethods();
      }

      return data || this.getDefaultPaymentMethods();
    } catch (error) {
      console.error('Error in getAvailablePaymentMethods:', error);
      return this.getDefaultPaymentMethods();
    }
  }

  /**
   * طرق الدفع الافتراضية - محسنة مع Stripe
   */
  private static getDefaultPaymentMethods(): PaymentMethod[] {
    return [
      {
        id: 'card',
        type: 'credit_card',
        name: 'بطاقة ائتمانية/مدى',
        name_en: 'Credit/Debit Card',
        description: 'فيزا، ماستركارد، مدى - عبر Stripe',
        description_en: 'Visa, Mastercard, Mada - via Stripe',
        is_active: true,
        processing_fee: 2.9,
        min_amount: 5,
        max_amount: 50000,
        icon: 'credit-card'
      },
      {
        id: 'stc_pay',
        type: 'stc_pay',
        name: 'STC Pay',
        name_en: 'STC Pay',
        description: 'الدفع بواسطة STC Pay - عبر Stripe',
        description_en: 'Pay with STC Pay - via Stripe',
        is_active: true,
        processing_fee: 1.5,
        min_amount: 1,
        max_amount: 10000,
        icon: 'smartphone'
      },
      {
        id: 'bank_transfer',
        type: 'bank_transfer',
        name: 'تحويل بنكي',
        name_en: 'Bank Transfer',
        description: 'تحويل مباشر إلى الحساب البنكي',
        description_en: 'Direct transfer to bank account',
        is_active: true,
        processing_fee: 0,
        min_amount: 10,
        max_amount: 100000,
        icon: 'bank'
      },
      {
        id: 'apple_pay',
        type: 'apple_pay',
        name: 'Apple Pay',
        name_en: 'Apple Pay',
        description: 'الدفع بواسطة Apple Pay - عبر Stripe',
        description_en: 'Pay with Apple Pay - via Stripe',
        is_active: false, // معطل افتراضياً
        processing_fee: 2.9,
        min_amount: 5,
        max_amount: 50000,
        icon: 'smartphone'
      }
    ];
  }

  /**
   * إنشاء طلب دفع جديد - محسن مع Stripe
   */
  static async createPaymentRequest(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // التحقق من صحة البيانات
      if (!request.user_id || !request.plan_id || !request.amount || !request.payment_method) {
        return {
          success: false,
          error: 'بيانات الدفع غير مكتملة'
        };
      }

      // الحصول على بيانات المستخدم
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', request.user_id)
        .single();

      if (userError || !user) {
        return {
          success: false,
          error: 'لم يتم العثور على بيانات المستخدم'
        };
      }

      // استخدام PayTabs للدفع الإلكتروني
      if (['creditcard', 'mada', 'stcpay', 'applepay'].includes(request.payment_method)) {
        const payTabsRequest = {
          user_id: request.user_id,
          plan_id: request.plan_id,
          amount: request.amount,
          currency: request.currency || 'SAR',
          payment_method: request.payment_method,
          customer_email: user.email,
          customer_name: `${user.first_name} ${user.last_name}`,
          return_url: request.return_url,
          cancel_url: request.cancel_url,
          metadata: request.metadata
        };

        const payTabsResult = await PayTabsService.createPaymentRequest(payTabsRequest);

        if (payTabsResult.success) {
          return {
            success: true,
            payment_url: payTabsResult.payment_url,
            requires_redirect: true,
            reference: payTabsResult.transaction_ref
          };
        } else {
          return {
            success: false,
            error: payTabsResult.error || 'فشل في إنشاء طلب الدفع'
          };
        }
      }

      // للطرق التقليدية (تحويل بنكي)
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const reference = `REF_${Date.now()}`;

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          id: paymentId,
          user_id: request.user_id,
          plan_id: request.plan_id,
          amount: request.amount,
          currency: request.currency || 'SAR',
          payment_method: request.payment_method,
          status: 'pending',
          reference: reference,
          metadata: request.metadata || {}
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
        return {
          success: false,
          error: 'فشل في إنشاء طلب الدفع'
        };
      }

      // معالجة الدفع حسب الطريقة المختارة
      return await this.processPayment(payment, request);

    } catch (error) {
      console.error('Error in createPaymentRequest:', error);
      return {
        success: false,
        error: 'حدث خطأ غير متوقع'
      };
    }
  }

  /**
   * معالجة الدفع حسب الطريقة المختارة
   */
  private static async processPayment(payment: any, request: PaymentRequest): Promise<PaymentResponse> {
    switch (request.payment_method) {
      case 'bank_transfer':
        return this.processBankTransfer(payment);

      case 'mada':
        return this.processMadaPayment(payment, request);

      case 'stc_pay':
        return this.processSTCPay(payment, request);

      default:
        return {
          success: false,
          error: 'طريقة الدفع غير مدعومة'
        };
    }
  }

  /**
   * معالجة التحويل البنكي
   */
  private static async processBankTransfer(payment: any): Promise<PaymentResponse> {
    // في التحويل البنكي، نعطي المستخدم تفاصيل الحساب
    return {
      success: true,
      payment_id: payment.id,
      reference: payment.reference,
      requires_redirect: false
    };
  }

  /**
   * معالجة دفع مدى (محاكاة)
   */
  private static async processMadaPayment(payment: any, request: PaymentRequest): Promise<PaymentResponse> {
    // هنا يتم التكامل مع بوابة الدفع الفعلية
    // حالياً سنقوم بمحاكاة العملية

    const paymentUrl = `${window.location.origin}/payment/process/${payment.id}`;

    return {
      success: true,
      payment_id: payment.id,
      payment_url: paymentUrl,
      reference: payment.reference,
      requires_redirect: true
    };
  }

  /**
   * معالجة STC Pay (محاكاة)
   */
  private static async processSTCPay(payment: any, request: PaymentRequest): Promise<PaymentResponse> {
    // هنا يتم التكامل مع STC Pay API
    // حالياً سنقوم بمحاكاة العملية

    const paymentUrl = `${window.location.origin}/payment/stc/${payment.id}`;

    return {
      success: true,
      payment_id: payment.id,
      payment_url: paymentUrl,
      reference: payment.reference,
      requires_redirect: true
    };
  }

  /**
   * التحقق من حالة الدفع
   */
  static async getPaymentStatus(paymentId: string): Promise<PaymentStatus | null> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error) {
        console.error('Error fetching payment status:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getPaymentStatus:', error);
      return null;
    }
  }

  /**
   * تأكيد الدفع (للاستخدام من webhook أو التحقق اليدوي)
   */
  static async confirmPayment(paymentId: string, gatewayResponse?: Record<string, any>): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .update({
          status: 'completed',
          gateway_response: gatewayResponse || {},
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId)
        .select()
        .single();

      if (error) {
        console.error('Error confirming payment:', error);
        return { success: false, error: 'فشل في تأكيد الدفع' };
      }

      // إنشاء الاشتراك بعد تأكيد الدفع
      const { SubscriptionService } = await import('./subscriptionService');
      const subscriptionResult = await SubscriptionService.createSubscription(
        data.user_id,
        data.plan_id,
        {
          method: data.payment_method,
          reference: data.reference,
          amount: data.amount
        }
      );

      if (!subscriptionResult.success) {
        console.error('Failed to create subscription after payment:', subscriptionResult.error);
        // يمكن إضافة منطق للتعامل مع هذه الحالة
      }

      return { success: true };
    } catch (error) {
      console.error('Error in confirmPayment:', error);
      return { success: false, error: 'حدث خطأ غير متوقع' };
    }
  }

  /**
   * إلغاء الدفع
   */
  static async cancelPayment(paymentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) {
        console.error('Error cancelling payment:', error);
        return { success: false, error: 'فشل في إلغاء الدفع' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in cancelPayment:', error);
      return { success: false, error: 'حدث خطأ غير متوقع' };
    }
  }

  /**
   * الحصول على تاريخ المدفوعات للمستخدم
   */
  static async getUserPaymentHistory(userId: string): Promise<PaymentStatus[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payment history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserPaymentHistory:', error);
      return [];
    }
  }
}
