#!/usr/bin/env node

/**
 * اختبار خادم SMTP المحلي
 * يتحقق من عمل الخادم وإرسال البريد الإلكتروني
 */

const SMTP_SERVER_URL = 'http://localhost:3001';

async function testSMTPServer() {
  console.log('🧪 بدء اختبار خادم SMTP...');
  console.log('=' .repeat(50));

  try {
    // 1. اختبار حالة الخادم
    console.log('1️⃣ اختبار حالة الخادم...');
    const statusResponse = await fetch(`${SMTP_SERVER_URL}/status`);
    
    if (!statusResponse.ok) {
      throw new Error(`خادم SMTP غير متاح: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();
    console.log('✅ خادم SMTP يعمل بشكل صحيح');
    console.log(`📊 الحالة: ${statusData.status}`);
    console.log(`⏰ الوقت: ${statusData.timestamp}`);
    console.log();

    // 2. اختبار إرسال بريد إلكتروني
    console.log('2️⃣ اختبار إرسال بريد إلكتروني...');
    
    const testEmail = {
      to: 'test@example.com', // غير هذا إلى بريدك الإلكتروني للاختبار الحقيقي
      subject: '🧪 اختبار خادم SMTP - رزقي',
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: center; padding: 20px; background: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #007bff;">🧪 اختبار خادم SMTP</h1>
            <p style="font-size: 18px; color: #333;">مرحباً من موقع رزقي!</p>
            <p style="color: #666;">هذه رسالة اختبار للتأكد من عمل خادم SMTP المحلي.</p>
            
            <div style="background: #e7f3ff; border: 2px dashed #007bff; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #0056b3; margin: 0;">✅ الخادم يعمل بشكل صحيح!</h3>
            </div>
            
            <p style="font-size: 14px; color: #888;">
              الوقت: ${new Date().toLocaleString('ar-SA')}
            </p>
            
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #999;">
              فريق رزقي - موقع الزواج الإسلامي الشرعي
            </p>
          </div>
        </div>
      `,
      text: `
اختبار خادم SMTP - رزقي

مرحباً من موقع رزقي!

هذه رسالة اختبار للتأكد من عمل خادم SMTP المحلي.

✅ الخادم يعمل بشكل صحيح!

الوقت: ${new Date().toLocaleString('ar-SA')}

فريق رزقي - موقع الزواج الإسلامي الشرعي
      `.trim()
    };

    console.log(`📬 إرسال إلى: ${testEmail.to}`);
    console.log(`📝 الموضوع: ${testEmail.subject}`);

    const emailResponse = await fetch(`${SMTP_SERVER_URL}/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testEmail)
    });

    if (!emailResponse.ok) {
      throw new Error(`فشل إرسال البريد: ${emailResponse.status}`);
    }

    const emailResult = await emailResponse.json();
    
    if (emailResult.success) {
      console.log('✅ تم إرسال البريد الإلكتروني بنجاح!');
      console.log(`📧 Message ID: ${emailResult.messageId}`);
    } else {
      console.log('❌ فشل إرسال البريد الإلكتروني');
      console.log(`🔍 السبب: ${emailResult.error}`);
    }

    console.log();
    console.log('=' .repeat(50));
    console.log('🎉 انتهى الاختبار بنجاح!');
    
    // 3. معلومات إضافية
    console.log();
    console.log('📋 معلومات مفيدة:');
    console.log(`🔗 رابط الخادم: ${SMTP_SERVER_URL}`);
    console.log(`📊 حالة الخادم: ${SMTP_SERVER_URL}/status`);
    console.log(`📧 إرسال بريد: ${SMTP_SERVER_URL}/send-email`);
    console.log();
    console.log('💡 نصائح:');
    console.log('   - غير البريد الإلكتروني في الكود لاختبار حقيقي');
    console.log('   - تأكد من تشغيل الخادم قبل الاختبار');
    console.log('   - راجع سجلات الخادم للمزيد من التفاصيل');

  } catch (error) {
    console.error('❌ فشل الاختبار:', error.message);
    console.log();
    console.log('🔧 حلول مقترحة:');
    console.log('   1. تأكد من تشغيل خادم SMTP على البورت 3001');
    console.log('   2. شغل الخادم باستخدام: node smtp-server.js');
    console.log('   3. تحقق من إعدادات SMTP في الخادم');
    console.log('   4. تأكد من اتصال الإنترنت');
    
    process.exit(1);
  }
}

// تشغيل الاختبار
testSMTPServer();
