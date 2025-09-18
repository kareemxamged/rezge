// خادم SMTP محلي بسيط للتطوير
// يستقبل طلبات الإيميل ويطبعها في الكونسول

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

// إعداد CORS للسماح بالطلبات من localhost:5173
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// معالج لطلبات إرسال الإيميل
app.post('/send-email', (req, res) => {
  console.log('\n🌟 ═══════════════════════════════════════════════════════════');
  console.log('📧 طلب إرسال إيميل جديد - خادم SMTP محلي');
  console.log('🕐 الوقت:', new Date().toLocaleString('ar-EG'));
  console.log('═══════════════════════════════════════════════════════════');
  
  const { to, subject, html, text, type } = req.body;
  
  console.log('📬 إلى:', to);
  console.log('📝 الموضوع:', subject);
  console.log('🏷️ النوع:', type || 'غير محدد');
  console.log('📄 النص:', text ? text.substring(0, 100) + '...' : 'غير متوفر');
  console.log('🌐 HTML:', html ? 'متوفر (' + html.length + ' حرف)' : 'غير متوفر');
  
  console.log('\n📧 محتوى الإيميل:');
  console.log('─'.repeat(50));
  if (text) {
    console.log(text);
  } else if (html) {
    // استخراج النص من HTML بشكل بسيط
    const textContent = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    console.log(textContent.substring(0, 500) + (textContent.length > 500 ? '...' : ''));
  }
  console.log('─'.repeat(50));
  
  // محاكاة نجاح الإرسال
  const messageId = 'local-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  
  console.log('✅ تم "إرسال" الإيميل بنجاح (محاكاة)');
  console.log('🆔 معرف الرسالة:', messageId);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // إرسال استجابة نجاح
  res.json({
    success: true,
    message: 'تم إرسال الإيميل بنجاح عبر الخادم المحلي',
    messageId: messageId,
    timestamp: new Date().toISOString(),
    method: 'Local SMTP Server'
  });
});

// معالج للصفحة الرئيسية
app.get('/', (req, res) => {
  res.json({
    message: 'خادم SMTP محلي يعمل بنجاح',
    status: 'active',
    port: PORT,
    endpoints: {
      sendEmail: 'POST /send-email'
    }
  });
});

// معالج للأخطاء
app.use((err, req, res, next) => {
  console.error('❌ خطأ في الخادم المحلي:', err);
  res.status(500).json({
    success: false,
    error: 'خطأ داخلي في الخادم المحلي',
    details: err.message
  });
});

// بدء الخادم
app.listen(PORT, () => {
  console.log('\n🚀 ═══════════════════════════════════════════════════════════');
  console.log('📧 خادم SMTP المحلي يعمل بنجاح!');
  console.log('🌐 العنوان: http://localhost:' + PORT);
  console.log('📬 نقطة الإرسال: http://localhost:' + PORT + '/send-email');
  console.log('🔧 للتطوير المحلي فقط - جميع الإيميلات ستظهر في الكونسول');
  console.log('═══════════════════════════════════════════════════════════\n');
});

// معالجة إغلاق الخادم بشكل نظيف
process.on('SIGINT', () => {
  console.log('\n📧 إيقاف خادم SMTP المحلي...');
  console.log('✅ تم إيقاف الخادم بنجاح');
  process.exit(0);
});

module.exports = app;
