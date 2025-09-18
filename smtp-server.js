#!/usr/bin/env node

/**
 * خادم SMTP مستقل لإرسال الإيميلات
 * يعمل على البورت 3001 ويستقبل طلبات من التطبيق
 */

import { createServer } from 'http';
import nodemailer from 'nodemailer';

// إعدادات الخادم
const PORT = 3001;
const HOST = 'localhost';

// إنشاء خادم HTTP
const server = createServer(async (req, res) => {
  // إعداد CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // التعامل مع طلبات OPTIONS
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // التعامل مع طلبات POST لإرسال الإيميل
  if (req.method === 'POST' && req.url === '/send-email') {
    try {
      let body = '';
      
      // قراءة البيانات
      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          console.log('📧 استلام طلب إرسال إيميل...');
          
          // إرسال الإيميل
          const result = await sendEmail(data);
          
          // إرسال النتيجة
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
      console.error('❌ خطأ في الخادم:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false, 
        error: 'Server error' 
      }));
    }
  } 
  // صفحة الحالة
  else if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'running',
      service: 'SMTP Server',
      port: PORT,
      timestamp: new Date().toISOString()
    }));
  }
  // صفحة غير موجودة
  else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Not Found',
      availableEndpoints: ['/send-email', '/status']
    }));
  }
});

// دالة إرسال الإيميل
async function sendEmail(data) {
  try {
    console.log('📧 بدء إرسال الإيميل...');
    
    // إعدادات SMTP
    const smtpConfig = data.config || {
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true,
      auth: {
        user: 'manage@kareemamged.com',
        pass: 'Kareem@2024'
      }
    };

    // إنشاء transporter
    const transporter = nodemailer.createTransporter({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.user || smtpConfig.auth.user,
        pass: smtpConfig.pass || smtpConfig.auth.pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // تحضير بيانات الإيميل
    const emailData = data.emailData || parseEmailMessage(data.message);
    
    const mailOptions = {
      from: `${smtpConfig.fromName || 'رزقي'} <${smtpConfig.from || smtpConfig.user || smtpConfig.auth.user}>`,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html
    };

    console.log(`📬 إرسال إلى: ${mailOptions.to}`);
    console.log(`📝 الموضوع: ${mailOptions.subject}`);

    // إرسال الإيميل
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ تم إرسال الإيميل بنجاح');
    console.log(`📧 Message ID: ${info.messageId}`);
    
    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
  } catch (error) {
    console.error('❌ فشل إرسال الإيميل:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// تحليل رسالة SMTP
function parseEmailMessage(message) {
  const lines = message.split('\r\n');
  let to = '';
  let subject = '';
  let text = '';
  let html = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('To: ')) {
      to = line.substring(4);
    } else if (line.startsWith('Subject: ')) {
      subject = line.substring(9);
      // فك تشفير UTF-8
      if (subject.includes('=?UTF-8?B?')) {
        const encoded = subject.match(/=\?UTF-8\?B\?([^?]+)\?=/);
        if (encoded) {
          subject = Buffer.from(encoded[1], 'base64').toString('utf-8');
        }
      }
    }
  }
  
  return { to, subject, text, html };
}

// بدء الخادم
server.listen(PORT, HOST, () => {
  console.log('🚀 خادم SMTP المستقل يعمل الآن!');
  console.log(`📡 العنوان: http://${HOST}:${PORT}`);
  console.log(`📧 جاهز لاستقبال طلبات الإرسال`);
  console.log(`⏰ الوقت: ${new Date().toLocaleString('ar-SA')}`);
  console.log('');
  console.log('📋 نقاط النهاية المتاحة:');
  console.log(`   POST /send-email - إرسال إيميل`);
  console.log(`   GET  /status     - حالة الخادم`);
  console.log('');
  console.log('💡 لإيقاف الخادم: اضغط Ctrl+C');
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

// التعامل مع الأخطاء غير المتوقعة
process.on('uncaughtException', (error) => {
  console.error('❌ خطأ غير متوقع:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ رفض غير معالج:', reason);
  process.exit(1);
});
