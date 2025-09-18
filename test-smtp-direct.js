#!/usr/bin/env node

/**
 * اختبار مباشر لإعدادات SMTP
 */

import nodemailer from 'nodemailer';

console.log('🧪 اختبار إعدادات SMTP مباشرة...');
console.log('');

async function testSMTP() {
  try {
    // إعدادات SMTP
    const smtpConfig = {
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true,
      auth: {
        user: 'manage@kareemamged.com',
        pass: 'Kk170404#'
      }
    };

    console.log('📧 إعدادات SMTP:');
    console.log(`   Host: ${smtpConfig.host}`);
    console.log(`   Port: ${smtpConfig.port}`);
    console.log(`   Secure: ${smtpConfig.secure}`);
    console.log(`   User: ${smtpConfig.auth.user}`);
    console.log(`   Pass: ${smtpConfig.auth.pass.substring(0, 3)}***`);
    console.log('');

    // إنشاء transporter
    console.log('🔧 إنشاء SMTP transporter...');
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.auth.user,
        pass: smtpConfig.auth.pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // اختبار الاتصال
    console.log('🔍 اختبار الاتصال...');
    await transporter.verify();
    console.log('✅ تم التحقق من الاتصال بنجاح!');
    console.log('');

    // إرسال إيميل اختبار
    console.log('📤 إرسال إيميل اختبار...');
    const testEmail = {
      from: `رزقي - اختبار <${smtpConfig.auth.user}>`,
      to: 'kemoamego@gmail.com',
      subject: 'اختبار SMTP - رزقي',
      text: `
السلام عليكم،

هذا إيميل اختبار من نظام SMTP الجديد لموقع رزقي.

إذا وصلك هذا الإيميل، فهذا يعني أن النظام يعمل بشكل صحيح.

الوقت: ${new Date().toLocaleString('ar-SA')}

تحياتي،
فريق رزقي
      `,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #2c5aa0; text-align: center; margin-bottom: 30px;">
              🌟 اختبار SMTP - رزقي 🌟
            </h2>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              السلام عليكم،
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              هذا إيميل اختبار من نظام SMTP الجديد لموقع رزقي.
            </p>
            
            <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-right: 4px solid #2c5aa0;">
              <p style="margin: 0; font-weight: bold; color: #2c5aa0;">
                ✅ إذا وصلك هذا الإيميل، فهذا يعني أن النظام يعمل بشكل صحيح!
              </p>
            </div>
            
            <p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">
              الوقت: ${new Date().toLocaleString('ar-SA')}
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333; text-align: center; margin-top: 20px;">
              تحياتي،<br>
              <strong>فريق رزقي</strong>
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(testEmail);
    
    console.log('🎉 تم إرسال الإيميل بنجاح!');
    console.log(`📧 Message ID: ${info.messageId}`);
    console.log(`📡 Response: ${info.response}`);
    console.log('');
    console.log('📬 تحقق من صندوق الوارد في: kemoamego@gmail.com');
    console.log('📁 تحقق أيضاً من مجلد الرسائل غير المرغوب فيها (Spam)');
    
  } catch (error) {
    console.error('❌ فشل الاختبار:', error);
    console.log('');
    console.log('🔍 أسباب محتملة للفشل:');
    console.log('   • كلمة المرور خاطئة');
    console.log('   • إعدادات SMTP خاطئة');
    console.log('   • مشاكل في الشبكة');
    console.log('   • حظر من مزود الخدمة');
  }
}

// تشغيل الاختبار
testSMTP();
