// Vercel API Route لإرسال البريد الإلكتروني
// المسار: /api/send-email

import nodemailer from 'nodemailer';

// إعدادات SMTP
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: true, // SSL
  auth: {
    user: process.env.SMTP_USER || 'manage@kareemamged.com',
    pass: process.env.SMTP_PASS || 'Kareem@2024'
  }
};

export default async function handler(req, res) {
  // السماح فقط بـ POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    console.log('📧 Vercel API: طلب إرسال بريد إلكتروني جديد...');
    
    const { to, subject, html, text, from } = req.body;

    // التحقق من البيانات المطلوبة
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, and content'
      });
    }

    // إنشاء transporter
    const transporter = nodemailer.createTransporter(SMTP_CONFIG);

    // التحقق من الاتصال (اختياري في Vercel)
    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified');
    } catch (verifyError) {
      console.warn('⚠️ SMTP verification failed, but continuing:', verifyError.message);
    }

    // إعداد البريد الإلكتروني
    const mailOptions = {
      from: from || `"رزقي - موقع الزواج الإسلامي" <${SMTP_CONFIG.auth.user}>`,
      to: to,
      subject: subject,
      html: html,
      text: text || 'رسالة من موقع رزقي'
    };

    console.log('📬 Vercel API: إرسال إلى:', to);
    console.log('📝 Vercel API: الموضوع:', subject);

    // إرسال البريد الإلكتروني
    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Vercel API: تم إرسال البريد بنجاح:', info.messageId);

    // إرسال النتيجة
    res.status(200).json({
      success: true,
      messageId: info.messageId,
      message: 'تم إرسال البريد الإلكتروني بنجاح',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Vercel API: خطأ في إرسال البريد:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString()
    });
  }
}
