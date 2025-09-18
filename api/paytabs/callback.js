/**
 * PayTabs Callback Handler
 * يتعامل مع إشعارات PayTabs عند اكتمال أو فشل الدفعات
 */

const { createClient } = require('@supabase/supabase-js');

// إعداد Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PAYTABS_SERVER_KEY = process.env.PAYTABS_SERVER_KEY;

module.exports = async (req, res) => {
  // التحقق من طريقة الطلب
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const callbackData = req.body;
    
    console.log('PayTabs Callback received:', callbackData);

    // التحقق من صحة البيانات الواردة
    if (!callbackData.tran_ref || !callbackData.cart_id) {
      console.error('Missing required callback data');
      return res.status(400).json({ error: 'Missing required data' });
    }

    // التحقق من صحة الطلب (اختياري - للأمان الإضافي)
    const isValidCallback = await verifyCallbackSignature(callbackData);
    if (!isValidCallback) {
      console.error('Invalid callback signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // معالجة نتيجة الدفع
    await processPaymentCallback(callbackData);

    // إرجاع استجابة نجاح لـ PayTabs
    res.status(200).json({ 
      status: 'success',
      message: 'Callback processed successfully' 
    });

  } catch (error) {
    console.error('Error processing PayTabs callback:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Internal server error' 
    });
  }
};

/**
 * معالجة callback من PayTabs
 */
async function processPaymentCallback(callbackData) {
  try {
    const {
      tran_ref,
      cart_id,
      payment_result,
      user_defined
    } = callbackData;

    // تحديد حالة الدفع
    const isSuccessful = payment_result?.response_status === 'A';
    const paymentStatus = isSuccessful ? 'completed' : 'failed';

    // تحديث سجل الدفع في قاعدة البيانات
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: paymentStatus,
        reference: tran_ref,
        updated_at: new Date().toISOString(),
        metadata: {
          ...callbackData,
          gateway: 'paytabs',
          processed_at: new Date().toISOString()
        }
      })
      .eq('id', cart_id);

    if (updateError) {
      console.error('Error updating payment status:', updateError);
      return;
    }

    console.log(`Payment ${cart_id} updated to status: ${paymentStatus}`);

    // إذا كان الدفع ناجحاً، إنشاء الاشتراك
    if (isSuccessful) {
      await createSubscriptionAfterPayment(cart_id, user_defined);
    } else {
      // إرسال إشعار بفشل الدفع
      await notifyPaymentFailure(cart_id, payment_result);
    }

  } catch (error) {
    console.error('Error in processPaymentCallback:', error);
    throw error;
  }
}

/**
 * إنشاء الاشتراك بعد نجاح الدفع
 */
async function createSubscriptionAfterPayment(paymentId, userDefined) {
  try {
    // الحصول على بيانات الدفع
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
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

    // التحقق من وجود اشتراك نشط مسبقاً
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', payment.user_id)
      .eq('status', 'active')
      .single();

    // إنهاء الاشتراك السابق إذا وجد
    if (existingSubscription) {
      await supabase
        .from('user_subscriptions')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSubscription.id);
    }

    // حساب تاريخ انتهاء الاشتراك
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration_days);

    // إنشاء الاشتراك الجديد
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
        auto_renew: true,
        payment_reference: payment.reference
      });

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError);
      return;
    }

    console.log(`Subscription created successfully for user: ${payment.user_id}`);

    // إرسال إشعار بنجاح الاشتراك
    await notifySubscriptionSuccess(payment.user_id, plan);

  } catch (error) {
    console.error('Error in createSubscriptionAfterPayment:', error);
  }
}

/**
 * إرسال إشعار بنجاح الاشتراك
 */
async function notifySubscriptionSuccess(userId, plan) {
  try {
    // إنشاء إشعار في قاعدة البيانات
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'تم تفعيل اشتراكك بنجاح',
        content: `تم تفعيل اشتراكك في باقة ${plan.name} بنجاح. يمكنك الآن الاستفادة من جميع المزايا.`,
        type: 'subscription_activated',
        is_read: false,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error creating notification:', error);
    }

    // يمكن إضافة إرسال بريد إلكتروني هنا
    
  } catch (error) {
    console.error('Error in notifySubscriptionSuccess:', error);
  }
}

/**
 * إرسال إشعار بفشل الدفع
 */
async function notifyPaymentFailure(paymentId, paymentResult) {
  try {
    // الحصول على بيانات الدفع
    const { data: payment } = await supabase
      .from('payments')
      .select('user_id, plan_id')
      .eq('id', paymentId)
      .single();

    if (!payment) return;

    // إنشاء إشعار بفشل الدفع
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: payment.user_id,
        title: 'فشل في عملية الدفع',
        content: `لم تتم عملية الدفع بنجاح. السبب: ${paymentResult?.response_message || 'خطأ غير محدد'}. يرجى المحاولة مرة أخرى.`,
        type: 'payment_failed',
        is_read: false,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error creating failure notification:', error);
    }

  } catch (error) {
    console.error('Error in notifyPaymentFailure:', error);
  }
}

/**
 * التحقق من صحة callback signature (اختياري للأمان)
 */
async function verifyCallbackSignature(callbackData) {
  try {
    // PayTabs لا يرسل signature بشكل افتراضي
    // يمكن إضافة التحقق من IP أو طرق أخرى للأمان
    
    // التحقق من IP المصدر (IPs الخاصة بـ PayTabs)
    const allowedIPs = [
      '185.234.15.0/24',
      '185.234.16.0/24'
      // إضافة المزيد من IPs حسب وثائق PayTabs
    ];

    // في بيئة الإنتاج، يجب التحقق من IP المصدر
    // const clientIP = req.ip || req.connection.remoteAddress;
    
    return true; // مؤقتاً نقبل جميع الطلبات
  } catch (error) {
    console.error('Error verifying callback signature:', error);
    return false;
  }
}
