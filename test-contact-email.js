// اختبار بسيط لدالة إرسال رسالة التواصل
console.log('🧪 بدء اختبار إرسال رسالة التواصل...');

// محاكاة البيانات
const testFormData = {
  name: 'أحمد محمد',
  email: 'ahmed@example.com',
  phone: '+966501234567',
  subject: 'اختبار النظام',
  message: 'هذه رسالة اختبار للتأكد من عمل النظام بشكل صحيح.'
};

// محاكاة دالة الإرسال
async function testContactMessage() {
  try {
    console.log('📧 بيانات الاختبار:', testFormData);
    
    // محاولة الاتصال بالخادم المحلي
    const response = await fetch('http://localhost:3001/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'contact@kareemamged.com',
        subject: `رسالة تواصل جديدة من ${testFormData.name} - ${testFormData.subject}`,
        html: `<h2>رسالة اختبار</h2><p>من: ${testFormData.name}</p><p>الرسالة: ${testFormData.message}</p>`,
        text: `رسالة من ${testFormData.name}: ${testFormData.message}`,
        from: 'manage@kareemamged.com',
        fromName: 'رزقي - منصة الزواج الإسلامي'
      })
    });

    console.log('📡 استجابة الخادم:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ نتيجة الإرسال:', result);
    } else {
      console.error('❌ فشل الإرسال:', response.status, response.statusText);
    }

  } catch (error) {
    console.error('❌ خطأ في الاختبار:', error);
  }
}

// تشغيل الاختبار
testContactMessage();
