/**
 * Vite Plugin لتشغيل خادم SMTP مع التطبيق
 */

import { createServer } from 'http';

let smtpProcess = null;
let smtpServer = null;

export function smtpPlugin() {
  return {
    name: 'smtp-server',
    configureServer(server) {
      console.log('🚀 بدء تشغيل خادم SMTP المدمج...');
      
      // إنشاء خادم SMTP مدمج
      smtpServer = createServer(async (req, res) => {
        // إعداد CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
                
                const result = await sendEmail(data);
                
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
        } else if (req.method === 'GET' && req.url === '/status') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'running',
            service: 'SMTP Server (Integrated)',
            port: 3001,
            timestamp: new Date().toISOString()
          }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Not Found',
            availableEndpoints: ['/send-email', '/status']
          }));
        }
      });

      // تشغيل خادم SMTP على البورت 3001
      smtpServer.listen(3001, 'localhost', () => {
        console.log('✅ خادم SMTP المدمج يعمل على http://localhost:3001');
      });

      // إضافة middleware لـ Vite
      server.middlewares.use('/api/smtp', (req, res, next) => {
        // إعادة توجيه طلبات SMTP
        const proxyReq = require('http').request({
          hostname: 'localhost',
          port: 3001,
          path: req.url.replace('/api/smtp', ''),
          method: req.method,
          headers: req.headers
        }, (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res);
        });

        req.pipe(proxyReq);
      });
    },
    buildStart() {
      console.log('📧 خادم SMTP جاهز للاستخدام');
    },
    buildEnd() {
      if (smtpServer) {
        console.log('🛑 إيقاف خادم SMTP...');
        smtpServer.close();
      }
    }
  };
}

// دالة إرسال الإيميل (محاكاة للاختبار)
async function sendEmail(data) {
  try {
    console.log('📧 بدء إرسال الإيميل (محاكاة)...');

    const emailData = data.emailData;

    console.log(`📬 إلى: ${emailData.to}`);
    console.log(`📝 الموضوع: ${emailData.subject}`);
    console.log(`📄 المحتوى: ${emailData.text?.substring(0, 100)}...`);

    // محاكاة تأخير الشبكة
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const messageId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('✅ تم إرسال الإيميل بنجاح (محاكاة)');
    console.log(`📧 Message ID: ${messageId}`);

    return {
      success: true,
      messageId: messageId,
      response: 'Simulated email sent successfully'
    };
  } catch (error) {
    console.error('❌ فشل إرسال الإيميل:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default smtpPlugin;
