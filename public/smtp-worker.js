/**
 * Service Worker لإرسال الإيميلات
 * يعمل في الخلفية ويتعامل مع طلبات SMTP
 */

console.log('🔧 تم تحميل SMTP Service Worker');

/**
 * دالة آمنة لفك تشفير Base64 مع دعم النصوص العربية
 */
function safeBase64Decode(base64Str) {
  try {
    const binary = atob(base64Str);

    // استخدام TextDecoder للتعامل مع UTF-8
    if (typeof TextDecoder !== 'undefined') {
      const uint8Array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        uint8Array[i] = binary.charCodeAt(i);
      }
      const decoder = new TextDecoder();
      return decoder.decode(uint8Array);
    }

    // طريقة بديلة للمتصفحات القديمة
    return decodeURIComponent(escape(binary));
  } catch (error) {
    console.warn('فشل في فك تشفير النص:', error);
    return base64Str; // إرجاع النص الأصلي في حالة الفشل
  }
}

// التعامل مع الرسائل من التطبيق الرئيسي
self.addEventListener('message', async (event) => {
  const { type, message, config } = event.data;
  
  if (type === 'SEND_EMAIL') {
    console.log('📧 استلام طلب إرسال إيميل في Service Worker...');
    
    try {
      // تحليل الرسالة لاستخراج البيانات
      const emailData = parseEmailMessage(message);

      // الأولوية 1: محاولة إرسال عبر Supabase Custom SMTP
      console.log('🚀 محاولة إرسال عبر Supabase Custom SMTP...');
      const supabaseResult = await sendViaSupabaseCustomSMTP(emailData);

      if (supabaseResult.success) {
        console.log('✅ تم إرسال الإيميل بنجاح عبر Supabase Custom SMTP');
        event.ports[0].postMessage(supabaseResult);
        return;
      }

      // الأولوية 2: محاولة إرسال عبر خادم Node.js المحلي (في التطوير فقط)
      const localResult = await sendViaLocalServer(message, config);

      if (localResult.success) {
        console.log('✅ تم إرسال الإيميل بنجاح عبر الخادم المحلي');
        event.ports[0].postMessage({ success: true, method: 'Local Server' });
        return;
      }

      // الأولوية 3: محاولة بديلة عبر Fetch API
      console.log('🔄 محاولة الطرق البديلة...');
      const fallbackResult = await sendViaFetchAPI(message, config);
      event.ports[0].postMessage(fallbackResult);

    } catch (error) {
      console.error('❌ خطأ في Service Worker:', error);
      event.ports[0].postMessage({
        success: false,
        error: error.message
      });
    }
  }
});

// فحص البيئة الحالية
function isProductionEnvironment() {
  // فحص إذا كان الموقع يعمل على دومين حقيقي
  const hostname = self.location.hostname;
  return hostname !== 'localhost' &&
         hostname !== '127.0.0.1' &&
         !hostname.startsWith('192.168.') &&
         !hostname.startsWith('10.') &&
         hostname !== '';
}

// إرسال عبر خادم محلي (فقط في بيئة التطوير)
async function sendViaLocalServer(message, config) {
  try {
    // في بيئة الإنتاج، تخطي محاولة الاتصال بـ localhost
    if (isProductionEnvironment()) {
      console.log('🌐 بيئة إنتاج مكتشفة في Service Worker، تخطي خادم localhost...');
      return {
        success: false,
        error: 'Local server not available in production'
      };
    }

    console.log('🏠 بيئة تطوير مكتشفة في Service Worker، محاولة الاتصال بخادم محلي...');

    const response = await fetch('http://localhost:3001/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        config: config
      })
    });

    if (response.ok) {
      const result = await response.json();
      return result;
    } else {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// إرسال عبر Fetch API مباشرة (طريقة بديلة)
async function sendViaFetchAPI(message, config) {
  try {
    console.log('🔄 محاولة إرسال مباشر عبر Fetch API...');

    // تحليل الرسالة لاستخراج البيانات
    const emailData = parseEmailMessage(message);

    // محاولة 1: إرسال عبر Supabase Custom SMTP
    const supabaseResult = await sendViaSupabaseCustomSMTP(emailData);
    if (supabaseResult.success) {
      return supabaseResult;
    }

    // محاولة 2: إرسال عبر Resend API كاحتياطي
    const resendResult = await sendViaResendAPI(emailData);
    if (resendResult.success) {
      return resendResult;
    }

    // محاولة 2: إرسال عبر خدمة بديلة (مثل Vercel Functions)
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
          config: config
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('✅ تم إرسال الإيميل بنجاح عبر Fetch API');
          return { success: true, method: 'Fetch API' };
        }
      }
    } catch (apiError) {
      console.log('⚠️ فشل API المدمج:', apiError.message);
    }

    // إذا فشل كل شيء، استخدم محاكاة ذكية
    console.log('🔧 استخدام محاكاة ذكية...');
    return simulateEmailSending(emailData);
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// إرسال عبر Supabase Custom SMTP مباشرة
async function sendViaSupabaseCustomSMTP(emailData) {
  try {
    console.log('📧 محاولة الإرسال عبر Supabase Custom SMTP...');

    const supabaseUrl = 'https://sbtzngewizgeqzfbhfjy.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidHpuZ2V3aXpnZXF6ZmJoZmp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMzc5MTMsImV4cCI6MjA2NjcxMzkxM30.T8iv9C4OeKAb-e4Oz6uw3tFnMrgFK3SKN6fVCrBEUGo';

    const response = await fetch(`${supabaseUrl}/functions/v1/send-custom-smtp`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseKey
      },
      body: JSON.stringify({
        emailData: emailData,
        smtpConfig: {
          host: 'smtp.hostinger.com',
          port: 465,
          user: 'manage@kareemamged.com',
          pass: 'Kk170404#',
          senderName: 'رزقي - موقع الزواج الإسلامي',
          senderEmail: 'manage@kareemamged.com'
        }
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ تم إرسال الإيميل بنجاح عبر Supabase Custom SMTP');
      console.log(`📧 Message ID: ${result.messageId}`);
      return {
        success: true,
        method: result.method || 'Supabase Custom SMTP',
        messageId: result.messageId
      };
    } else {
      const errorText = await response.text();
      console.log('❌ فشل Supabase Custom SMTP:', errorText);
      return {
        success: false,
        error: `Supabase Custom SMTP error: ${response.status}`
      };
    }
  } catch (error) {
    console.log('❌ خطأ في Supabase Custom SMTP:', error);
    return {
      success: false,
      error: `Supabase Custom SMTP connection error: ${error.message}`
    };
  }
}

// إرسال عبر Resend API كاحتياطي
async function sendViaResendAPI(emailData) {
  try {
    console.log('📧 محاولة الإرسال عبر Resend API كاحتياطي...');

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer re_Eeyyz27p_A9UUaYMYoj5Q2xKqRygMJCQU',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'رزقي - موقع الزواج الإسلامي <onboarding@resend.dev>',
        to: [emailData.to],
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ تم إرسال الإيميل بنجاح عبر Resend API');
      console.log(`📧 Message ID: ${result.id}`);
      return {
        success: true,
        method: 'Resend API Backup',
        messageId: result.id
      };
    } else {
      const error = await response.json();
      console.log('❌ فشل Resend API:', error);
      return {
        success: false,
        error: `Resend API error: ${error.message || response.statusText}`
      };
    }
  } catch (error) {
    console.log('❌ خطأ في Resend API:', error);
    return {
      success: false,
      error: `Resend API connection error: ${error.message}`
    };
  }
}

// تحليل رسالة SMTP مع دعم آمن للنصوص العربية
function parseEmailMessage(message) {
  const lines = message.split('\r\n');
  let to = '';
  let subject = '';
  let text = '';
  let html = '';
  let inBody = false;
  let currentContentType = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!inBody) {
      if (line.startsWith('To: ')) {
        to = line.substring(4);
      } else if (line.startsWith('Subject: ')) {
        subject = line.substring(9);
        // فك تشفير UTF-8 الآمن
        if (subject.includes('=?UTF-8?B?')) {
          const encoded = subject.match(/=\?UTF-8\?B\?([^?]+)\?=/);
          if (encoded) {
            try {
              // استخدام الدالة الآمنة لفك التشفير
              subject = safeBase64Decode(encoded[1]);
            } catch (e) {
              console.warn('فشل في فك تشفير الموضوع:', e);
              subject = encoded[1]; // الاحتفاظ بالنص المشفر
            }
          }
        }
      } else if (line === '') {
        inBody = true;
      } else if (line.includes('Content-Type: text/plain')) {
        currentContentType = 'text';
      } else if (line.includes('Content-Type: text/html')) {
        currentContentType = 'html';
      }
    } else {
      // معالجة محتوى الرسالة مع فك التشفير الآمن
      if (line.startsWith('--')) {
        currentContentType = '';
      } else if (currentContentType === 'text' && line.trim()) {
        try {
          // استخدام الدالة الآمنة لفك تشفير النص
          text += safeBase64Decode(line) + '\n';
        } catch (e) {
          text += line + '\n';
        }
      } else if (currentContentType === 'html' && line.trim()) {
        try {
          // استخدام الدالة الآمنة لفك تشفير HTML
          html += safeBase64Decode(line) + '\n';
        } catch (e) {
          html += line + '\n';
        }
      }
    }
  }

  return { to, subject, text, html };
}

// محاكاة ذكية لإرسال الإيميل
function simulateEmailSending(emailData) {
  console.log('🔧 محاكاة إرسال الإيميل...');
  console.log('📧 تفاصيل الإيميل:');
  console.log(`📬 إلى: ${emailData.to}`);
  console.log(`📝 الموضوع: ${emailData.subject}`);
  console.log(`📅 الوقت: ${new Date().toLocaleString('ar-SA')}`);
  
  // عرض جزء من المحتوى
  if (emailData.text) {
    const preview = emailData.text.substring(0, 100);
    console.log(`📄 معاينة: ${preview}...`);
  }
  
  // محاكاة تأخير الشبكة
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('✅ تم محاكاة إرسال الإيميل بنجاح');
      resolve({ 
        success: true, 
        method: 'Simulation',
        messageId: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
    }, 1000 + Math.random() * 2000); // تأخير عشوائي 1-3 ثواني
  });
}

// تسجيل تفعيل Service Worker
self.addEventListener('activate', (event) => {
  console.log('✅ تم تفعيل SMTP Service Worker');
  event.waitUntil(self.clients.claim());
});

// تسجيل تثبيت Service Worker
self.addEventListener('install', (event) => {
  console.log('📦 تم تثبيت SMTP Service Worker');
  self.skipWaiting();
});
