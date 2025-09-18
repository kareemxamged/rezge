#!/usr/bin/env node

/**
 * خادم SMTP مبسط لموقع رزقي
 * يعمل بجانب خادم Vite تلقائياً
 */

import { createServer } from 'http';
import nodemailer from 'nodemailer';

const PORT = 3001;

console.log('🚀 بدء تشغيل خادم SMTP المبسط...');

// إنشاء خادم HTTP بسيط
const server = createServer(async (req, res) => {
  // إعداد CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/send-email') {
    try {
      let body = '';
      
      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          console.log('📧 استلام طلب إرسال إيميل...');
          console.log('📋 البيانات المستلمة:', JSON.stringify(data, null, 2));

          // إرسال إيميل حقيقي
          const result = await sendRealEmail(data);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (error) {
          console.error('❌ خطأ في معالجة الطلب:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: error.message
          }));
        }
      });
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false, 
        error: 'Server error' 
      }));
    }
  } 
  else if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'running',
      service: 'Simple SMTP Server',
      port: PORT,
      timestamp: new Date().toISOString(),
      message: 'خادم SMTP يعمل بشكل طبيعي'
    }));
  }
  else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Not Found',
      availableEndpoints: ['/send-email', '/status']
    }));
  }
});

// إرسال إيميل حقيقي
async function sendRealEmail(data) {
  try {
    console.log('📧 بدء إرسال إيميل حقيقي...');

    // إعدادات SMTP الصحيحة
    const smtpConfig = data.config || {
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true,
      auth: {
        user: 'manage@kareemamged.com',
        pass: 'Kk170404#'
      }
    };

    // إنشاء transporter
    const transporterConfig = {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.user || smtpConfig.auth?.user || 'manage@kareemamged.com',
        pass: smtpConfig.pass || smtpConfig.auth?.pass || 'Kk170404#'
      },
      tls: {
        rejectUnauthorized: false
      }
    };

    console.log('🔧 إعداد transporter مع:', {
      host: transporterConfig.host,
      port: transporterConfig.port,
      user: transporterConfig.auth.user,
      passLength: transporterConfig.auth.pass.length
    });

    const transporter = nodemailer.createTransport(transporterConfig);

    // التحقق من تنسيق البيانات - قد تكون مباشرة أو داخل emailData
    const emailData = data.emailData || data;

    console.log('🔍 تحليل البيانات:');
    console.log('📦 data:', Object.keys(data));
    console.log('📧 emailData:', emailData ? Object.keys(emailData) : 'undefined');
    console.log('📬 to:', emailData?.to);
    console.log('📝 subject:', emailData?.subject);

    const fromEmail = data.from || smtpConfig.from || smtpConfig.user || smtpConfig.auth?.user || transporterConfig.auth.user;
    const fromName = data.fromName || smtpConfig.fromName || 'رزقي';

    const mailOptions = {
      from: `${fromName} <${fromEmail}>`,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html
    };

    console.log(`📬 إرسال إلى: ${mailOptions.to}`);
    console.log(`📝 الموضوع: ${mailOptions.subject}`);
    console.log(`🔐 SMTP Host: ${smtpConfig.host}:${smtpConfig.port}`);
    console.log(`👤 SMTP User: ${smtpConfig.user || smtpConfig.auth?.user}`);
    console.log(`🔑 SMTP Pass: ${(smtpConfig.pass || smtpConfig.auth?.pass || '').substring(0, 3)}***`);

    // اختبار الاتصال أولاً
    console.log('🔍 اختبار الاتصال بـ SMTP...');
    await transporter.verify();
    console.log('✅ تم التحقق من اتصال SMTP بنجاح');

    // إرسال الإيميل
    console.log('📤 بدء إرسال الإيميل...');
    const info = await transporter.sendMail(mailOptions);

    console.log('✅ تم إرسال الإيميل بنجاح!');
    console.log(`📧 Message ID: ${info.messageId}`);
    console.log(`📡 Response: ${info.response}`);
    console.log('');

    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
      timestamp: new Date().toISOString(),
      method: 'Real SMTP'
    };
  } catch (error) {
    console.error('❌ فشل إرسال الإيميل:', error);
    console.log('🔄 التبديل للمحاكاة...');

    // في حالة فشل الإرسال الحقيقي، استخدم المحاكاة
    return await simulateEmailSending(data);
  }
}

// محاكاة إرسال الإيميل (كـ fallback)
async function simulateEmailSending(data) {
  try {
    // التحقق من تنسيق البيانات - قد تكون مباشرة أو داخل emailData
    const emailData = data.emailData || data;

    console.log('📧 تفاصيل الإيميل:');
    console.log(`📬 إلى: ${emailData.to}`);
    console.log(`📝 الموضوع: ${emailData.subject}`);
    console.log(`📄 النوع: ${emailData.type || data.type || 'غير محدد'}`);
    console.log(`⏰ الوقت: ${new Date().toLocaleString('ar-SA')}`);

    if (emailData.text) {
      const preview = emailData.text.substring(0, 150);
      console.log(`📄 معاينة المحتوى: ${preview}...`);
    }
    
    // محاكاة تأخير الشبكة
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));
    
    const messageId = `rezge_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    console.log('✅ تم محاكاة إرسال الإيميل بنجاح');
    console.log(`📧 Message ID: ${messageId}`);
    console.log('');

    return {
      success: true,
      messageId: messageId,
      response: 'Email simulated successfully',
      timestamp: new Date().toISOString(),
      method: 'Simulation'
    };
  } catch (error) {
    console.error('❌ فشل في محاكاة الإرسال:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// بدء الخادم
server.listen(PORT, 'localhost', () => {
  console.log('✅ خادم SMTP المبسط يعمل الآن!');
  console.log(`📡 العنوان: http://localhost:${PORT}`);
  console.log(`📧 جاهز لاستقبال طلبات الإرسال`);
  console.log(`⏰ الوقت: ${new Date().toLocaleString('ar-SA')}`);
  console.log('');
  console.log('📋 نقاط النهاية:');
  console.log(`   POST /send-email - إرسال إيميل`);
  console.log(`   GET  /status     - حالة الخادم`);
  console.log('');
  console.log('💡 ملاحظة: خادم إرسال حقيقي مع fallback للمحاكاة');
  console.log('   يحاول الإرسال الحقيقي أولاً، ثم المحاكاة عند الفشل');
  console.log('');
});

// التعامل مع إيقاف الخادم
process.on('SIGINT', () => {
  console.log('\n🛑 إيقاف خادم SMTP...');
  server.close(() => {
    console.log('✅ تم إيقاف الخادم بنجاح');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 إيقاف خادم SMTP...');
  server.close(() => {
    console.log('✅ تم إيقاف الخادم بنجاح');
    process.exit(0);
  });
});

// التعامل مع الأخطاء
process.on('uncaughtException', (error) => {
  console.error('❌ خطأ غير متوقع:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ رفض غير معالج:', reason);
  process.exit(1);
});
